// jobs/youtube-scraper/scraper.js
require('dotenv').config();
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const { getClient } = require('../db/connection');

async function setupDriver() {
  try {
    const options = new chrome.Options();
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
    
    console.log('✓ Chrome driver initialized');
    return driver;
  } catch (error) {
    console.error('Failed to setup Chrome driver:', error.message);
    throw error;
  }
}

function formatNumber(text) {
  if (!text) return 0;
  
  text = text.toUpperCase()
    .replace('SUBSCRIBERS', '')
    .replace('SUBSCRIBER', '')
    .replace(',', '')
    .trim();
  
  const multipliers = { 'K': 1_000, 'M': 1_000_000, 'B': 1_000_000_000 };
  
  for (const [suffix, multiplier] of Object.entries(multipliers)) {
    if (text.includes(suffix)) {
      try {
        const number = parseFloat(text.replace(suffix, '').trim());
        return Math.floor(number * multiplier);
      } catch {
        return 0;
      }
    }
  }
  
  try {
    return parseInt(text.replace(/\D/g, ''));
  } catch {
    return 0;
  }
}

async function scrapeChannels(searchTerm, driver) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}&sp=EgIQAg%253D%253D`;
  
  try {
    console.log(`    Fetching: ${url}`);
    await driver.get(url);
    await driver.sleep(5000);
    
    // Scroll to load more results
    for (let i = 0; i < 10; i++) {
      await driver.executeScript('window.scrollTo(0, document.documentElement.scrollHeight);');
      await driver.sleep(1500);
    }
    
    // Get page source
    const pageSource = await driver.getPageSource();
    
    // Parse channels
    const channels = parseChannels(pageSource, searchTerm);
    console.log(`    Found ${channels.length} channels for "${searchTerm}"`);
    
    return channels;
    
  } catch (error) {
    console.error(`    ✗ Error scraping ${searchTerm}:`, error.message);
    return [];
  }
}

function parseChannels(html, searchTerm) {
  try {
    const $ = cheerio.load(html);
    
    const channels = [];
    const seen = new Set();
    
    // Find channel renderers
    $('ytd-channel-renderer').each((i, elem) => {
      try {
        const fullText = $(elem).text();
        const channelLink = $(elem).find('a#main-link');
        
        if (!channelLink.length) return;
        
        const channelName = channelLink.attr('title') || 
                            channelLink.find('yt-formatted-string#text').text().trim();
        
        if (!channelName || channelName.length < 2 || seen.has(channelName)) {
          return;
        }
        
        seen.add(channelName);
        
        // Extract subscribers
        const subMatch = fullText.match(/([\d.]+[KMB]?)\s*subscriber/i);
        const subscribers = subMatch ? formatNumber(subMatch[1]) : 0;
        
        channels.push({
          channel_name: channelName,
          subscribers: subscribers,
          search_term: searchTerm
        });
        
      } catch (error) {
        // Skip this channel silently
      }
    });
    
    return channels.slice(0, 200); // Limit to 200 per search term
  } catch (error) {
    console.error(`    ✗ Error parsing HTML:`, error.message);
    return [];
  }
}

async function saveToDatabase(channels, queryName) {
  if (!channels || channels.length === 0) {
    console.log('    ℹ No channels to save');
    return;
  }

  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const channel of channels) {
      try {
        const result = await client.query(`
          INSERT INTO youtube_channels 
            (channel_name, subscribers, search_term, query_name, last_updated)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (channel_name) 
          DO UPDATE SET 
            subscribers = EXCLUDED.subscribers,
            search_term = EXCLUDED.search_term,
            query_name = EXCLUDED.query_name,
            last_updated = NOW()
          RETURNING (xmax = 0) AS inserted
        `, [
          channel.channel_name,
          channel.subscribers,
          channel.search_term,
          queryName
        ]);
        
        if (result.rows[0].inserted) {
          savedCount++;
        } else {
          updatedCount++;
        }
      } catch (error) {
        console.error(`    ✗ Failed to save channel "${channel.channel_name}":`, error.message);
      }
    }
    
    await client.query('COMMIT');
    console.log(`    ✓ Database: ${savedCount} new, ${updatedCount} updated (${channels.length} total)`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('    ✗ Database transaction error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function runScraper(queries) {
  let driver;
  
  try {
    driver = await setupDriver();
    
    for (const query of queries) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Processing Query Category: ${query.name}`);
      console.log(`${'='.repeat(60)}`);
      
      const searchTerms = query.terms.split(',').map(t => t.trim());
      const allChannels = [];
      
      for (let i = 0; i < searchTerms.length; i++) {
        const term = searchTerms[i];
        console.log(`\n  [${i + 1}/${searchTerms.length}] Searching: "${term}"`);
        
        try {
          const channels = await scrapeChannels(term, driver);
          allChannels.push(...channels);
          
          // Avoid rate limiting - random delay between 2-4 seconds
          const delay = 2000 + Math.random() * 2000;
          await driver.sleep(delay);
        } catch (error) {
          console.error(`  ✗ Failed to scrape term "${term}":`, error.message);
        }
      }
      
      // Remove duplicates based on channel_name
      const uniqueChannels = Array.from(
        new Map(allChannels.map(ch => [ch.channel_name, ch])).values()
      );
      
      console.log(`\n  📝 Summary: ${uniqueChannels.length} unique channels found (${allChannels.length} total)`);
      
      // Save to database
      try {
        await saveToDatabase(uniqueChannels, query.name);
      } catch (error) {
        console.error(`  ✗ Failed to save to database:`, error.message);
      }
      
      console.log(`${'='.repeat(60)}\n`);
    }
    
    console.log('✅ Scraper completed successfully\n');
    
  } catch (error) {
    console.error('❌ Scraper failed:', error.message);
    throw error;
  } finally {
    if (driver) {
      try {
        await driver.quit();
        console.log('✓ Chrome driver closed');
      } catch (error) {
        console.error('✗ Failed to close driver:', error.message);
      }
    }
  }
}

module.exports = { runScraper };