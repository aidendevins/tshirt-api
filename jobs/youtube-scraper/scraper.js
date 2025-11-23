// jobs/youtube-scraper/scraper.js
require('dotenv').config();
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const cheerio = require('cheerio');
const { getClient } = require('../db/connection');

async function setupDriver() {
  try {
    const options = new chrome.Options();
    
    // Set Chrome binary path for Railway/Linux environments
    // Try common paths where Chromium is installed
    // Note: On Debian/Ubuntu, chromium-browser is often a symlink to chromium
    const fs = require('fs');
    const possibleChromePaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ];
    
    // Also check if chromium-browser is a symlink and resolve it
    const checkSymlink = (path) => {
      try {
        if (fs.existsSync(path)) {
          const stats = fs.lstatSync(path);
          if (stats.isSymbolicLink()) {
            return fs.readlinkSync(path);
          }
          return path;
        }
      } catch (e) {
        // Ignore errors
      }
      return null;
    };
    
    let chromePath = null;
    for (const path of possibleChromePaths) {
      try {
        const resolvedPath = checkSymlink(path);
        if (resolvedPath) {
          chromePath = resolvedPath;
          console.log(`  Found Chrome at: ${path}${resolvedPath !== path ? ` (symlink to ${resolvedPath})` : ''}`);
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    if (chromePath) {
      // Use the resolved path (actual binary, not symlink)
      const finalPath = fs.existsSync(chromePath) && !fs.lstatSync(chromePath).isSymbolicLink() 
        ? chromePath 
        : fs.realpathSync(chromePath);
      options.setChromeBinaryPath(finalPath);
      console.log(`  Using Chrome binary: ${finalPath}`);
    } else {
      console.log('  Using default Chrome binary (may need to be set)');
    }
    
    // Chrome options for Railway/Linux headless environment
    // Critical flags for Railway/server environments
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-setuid-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-software-rasterizer');
    options.addArguments('--disable-extensions');
    options.addArguments('--single-process'); // Important for Railway
    options.addArguments('--disable-background-networking');
    options.addArguments('--disable-background-timer-throttling');
    options.addArguments('--disable-backgrounding-occluded-windows');
    options.addArguments('--disable-breakpad');
    options.addArguments('--disable-client-side-phishing-detection');
    options.addArguments('--disable-default-apps');
    options.addArguments('--disable-features=TranslateUI,VizDisplayCompositor');
    options.addArguments('--disable-hang-monitor');
    options.addArguments('--disable-ipc-flooding-protection');
    options.addArguments('--disable-popup-blocking');
    options.addArguments('--disable-prompt-on-repost');
    options.addArguments('--disable-renderer-backgrounding');
    options.addArguments('--disable-sync');
    options.addArguments('--disable-translate');
    options.addArguments('--metrics-recording-only');
    options.addArguments('--no-first-run');
    options.addArguments('--safebrowsing-disable-auto-update');
    options.addArguments('--enable-automation');
    options.addArguments('--password-store=basic');
    options.addArguments('--use-mock-keychain');
    options.addArguments('--disable-blink-features=AutomationControlled');
    options.addArguments('--remote-debugging-port=9222');
    options.addArguments('--remote-allow-origins=*');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set ChromeDriver path if available
    const possibleDriverPaths = [
      '/usr/bin/chromedriver',
      '/usr/bin/chromium-driver',
      '/usr/lib/chromium-browser/chromedriver',
      '/usr/lib/chromium/chromedriver',
      '/usr/lib/chromium-driver/chromedriver'
    ];
    
    let driverPath = null;
    for (const path of possibleDriverPaths) {
      try {
        if (fs.existsSync(path)) {
          driverPath = path;
          break;
        }
      } catch (e) {
        // Continue searching
      }
    }
    
    let service = null;
    if (driverPath) {
      service = new chrome.ServiceBuilder(driverPath);
      console.log(`  Using ChromeDriver: ${driverPath}`);
    } else {
      console.log('  Using default ChromeDriver (selenium-webdriver will manage)');
      service = new chrome.ServiceBuilder();
    }
    
    // Use 'chrome' browser type (works for both Chrome and Chromium)
    const builder = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options);
    
    if (service) {
      builder.setChromeService(service);
    }
    
    try {
      const driver = await builder.build();
      console.log('✓ Chrome driver initialized');
      return driver;
    } catch (buildError) {
      // If build fails, try with minimal options
      console.log('  Initial build failed, trying with minimal options...');
      const minimalOptions = new chrome.Options();
      if (chromePath) {
        minimalOptions.setChromeBinaryPath(chromePath);
      }
      minimalOptions.addArguments('--headless=new');
      minimalOptions.addArguments('--no-sandbox');
      minimalOptions.addArguments('--disable-dev-shm-usage');
      minimalOptions.addArguments('--disable-gpu');
      minimalOptions.addArguments('--single-process');
      
      const minimalBuilder = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(minimalOptions);
      
      if (service) {
        minimalBuilder.setChromeService(service);
      }
      
      const driver = await minimalBuilder.build();
      console.log('✓ Chrome driver initialized (minimal mode)');
      return driver;
    }
  } catch (error) {
    console.error('Failed to setup Chrome driver:', error.message);
    console.error('Stack trace:', error.stack);
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
    return { saved: 0, updated: 0 };
  }

  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    let savedCount = 0;
    let updatedCount = 0;
    
    for (const channel of channels) {
      try {
        // Use query_name from channel if available, otherwise use parameter
        const finalQueryName = channel.query_name || queryName;
        
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
          finalQueryName
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
    
    return { saved: savedCount, updated: updatedCount };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('    ✗ Database transaction error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Process a single search term and return channels
 * @param {string} term - Search term
 * @param {Object} driver - Selenium driver
 * @param {string} queryName - Query category name
 * @returns {Promise<Array>} Array of channel objects
 */
async function processSearchTerm(term, driver, queryName) {
  try {
    const channels = await scrapeChannels(term, driver);
    return channels.map(ch => ({ ...ch, query_name: queryName }));
  } catch (error) {
    console.error(`  ✗ Failed to scrape term "${term}":`, error.message);
    return [];
  }
}

/**
 * Run scraper with incremental saving (saves every N terms)
 * @param {Array} queries - Array of query objects
 * @param {Object} options - Options object
 * @param {number} options.saveInterval - Save after every N terms (default: 20)
 * @param {Function} options.onProgress - Callback for progress updates
 * @param {Function} options.shouldStop - Function that returns true if should stop
 * @returns {Promise<Object>} Statistics object
 */
async function runScraper(queries, options = {}) {
  const {
    saveInterval = 20,
    onProgress = null,
    shouldStop = () => false,
    driver = null
  } = options;
  
  let localDriver = driver;
  let driverCreated = false;
  let totalProcessed = 0;
  let totalSaved = 0;
  let totalUpdated = 0;
  let currentBatch = [];
  let batchCount = 0;
  
  // Statistics tracking
  const stats = {
    queriesProcessed: 0,
    termsProcessed: 0,
    channelsFound: 0,
    channelsSaved: 0,
    channelsUpdated: 0,
    batchesSaved: 0,
    startTime: Date.now()
  };
  
  try {
    // Setup driver if not provided
    if (!localDriver) {
      localDriver = await setupDriver();
      driverCreated = true;
    }
    
    // Flatten all queries into individual terms with query names
    const allTerms = [];
    for (const query of queries) {
      const searchTerms = query.terms.split(',').map(t => t.trim());
      for (const term of searchTerms) {
        allTerms.push({ term, queryName: query.name });
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Starting scraper with ${allTerms.length} total search terms`);
    console.log(`💾 Saving incrementally every ${saveInterval} terms`);
    console.log(`${'='.repeat(60)}\n`);
    
    for (let i = 0; i < allTerms.length; i++) {
      // Check if should stop
      if (shouldStop()) {
        console.log('\n⚠️  Stop signal received, saving current batch and exiting...');
        break;
      }
      
      const { term, queryName } = allTerms[i];
      const termIndex = i + 1;
      
      console.log(`\n  [${termIndex}/${allTerms.length}] Searching: "${term}" (${queryName})`);
      
      try {
        const channels = await processSearchTerm(term, localDriver, queryName);
        currentBatch.push(...channels);
        stats.termsProcessed++;
        stats.channelsFound += channels.length;
        
        // Avoid rate limiting - random delay between 2-4 seconds
        const delay = 2000 + Math.random() * 2000;
        await localDriver.sleep(delay);
        
        // Save incrementally every saveInterval terms
        if (currentBatch.length > 0 && (termIndex % saveInterval === 0 || i === allTerms.length - 1)) {
          // Remove duplicates based on channel_name
          const uniqueChannels = Array.from(
            new Map(currentBatch.map(ch => [ch.channel_name, ch])).values()
          );
          
          try {
            const { saved, updated } = await saveToDatabase(uniqueChannels, queryName);
            totalSaved += saved;
            totalUpdated += updated;
            stats.channelsSaved += saved;
            stats.channelsUpdated += updated;
            stats.batchesSaved++;
            batchCount++;
            
            console.log(`\n  💾 Batch #${batchCount} saved: ${saved} new, ${updated} updated (${uniqueChannels.length} total)`);
            console.log(`  📊 Running totals: ${totalSaved} new, ${totalUpdated} updated channels`);
          } catch (error) {
            console.error(`  ✗ Failed to save batch:`, error.message);
          }
          
          currentBatch = []; // Clear batch
        }
        
        // Progress callback
        if (onProgress) {
          onProgress({
            termIndex,
            totalTerms: allTerms.length,
            currentBatchSize: currentBatch.length,
            totalSaved,
            totalUpdated
          });
        }
        
      } catch (error) {
        console.error(`  ✗ Error processing term "${term}":`, error.message);
      }
    }
    
    // Save any remaining channels in the batch
    if (currentBatch.length > 0) {
      const uniqueChannels = Array.from(
        new Map(currentBatch.map(ch => [ch.channel_name, ch])).values()
      );
      
      try {
        const { saved, updated } = await saveToDatabase(uniqueChannels, 'final');
        totalSaved += saved;
        totalUpdated += updated;
        stats.channelsSaved += saved;
        stats.channelsUpdated += updated;
        stats.batchesSaved++;
        
        console.log(`\n  💾 Final batch saved: ${saved} new, ${updated} updated`);
      } catch (error) {
        console.error(`  ✗ Failed to save final batch:`, error.message);
      }
    }
    
    stats.queriesProcessed = queries.length;
    stats.duration = Date.now() - stats.startTime;
    
    console.log(`\n✅ Scraper completed successfully`);
    console.log(`   Terms processed: ${stats.termsProcessed}`);
    console.log(`   Channels found: ${stats.channelsFound}`);
    console.log(`   Channels saved: ${stats.channelsSaved} new, ${stats.channelsUpdated} updated`);
    console.log(`   Batches saved: ${stats.batchesSaved}`);
    console.log(`   Duration: ${(stats.duration / 1000 / 60).toFixed(2)} minutes\n`);
    
    return stats;
    
  } catch (error) {
    console.error('❌ Scraper failed:', error.message);
    throw error;
  } finally {
    // Only close driver if we created it
    if (driverCreated && localDriver) {
      try {
        await localDriver.quit();
        console.log('✓ Chrome driver closed');
      } catch (error) {
        console.error('✗ Failed to close driver:', error.message);
      }
    }
  }
}

module.exports = { runScraper, setupDriver, processSearchTerm };