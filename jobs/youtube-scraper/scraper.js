// jobs/youtube-scraper/scraper.js
require('dotenv').config();
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const { Capabilities } = require('selenium-webdriver');
const cheerio = require('cheerio');
const { getClient } = require('./db/connection');

/**
 * Setup Selenium WebDriver - supports both Selenium Grid (preferred) and local Chrome
 * Set SELENIUM_GRID_URL environment variable to use Railway's Selenium Grid template
 * Example: SELENIUM_GRID_URL=https://your-grid.up.railway.app/wd/hub
 */
async function setupDriver() {
  // Check if Selenium Grid URL is provided
  const gridUrl = process.env.SELENIUM_GRID_URL;
  
  if (gridUrl) {
    console.log(`  Using Selenium Grid: ${gridUrl}`);
    return await setupGridDriver(gridUrl);
  } else {
    console.log('  Using local Chrome (set SELENIUM_GRID_URL to use Selenium Grid)');
    return await setupLocalDriver();
  }
}

/**
 * Setup driver using Selenium Grid (Railway template)
 */
async function setupGridDriver(gridUrl) {
  try {
    const options = new chrome.Options();
    
    // Chrome options for headless operation
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-setuid-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-software-rasterizer');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Normalize the grid URL
    // Railway public domains automatically route to the service port (8080 in your case)
    // So we don't need to specify the port in the URL
    let hubUrl = gridUrl.trim();
    
    // Remove trailing slashes
    hubUrl = hubUrl.replace(/\/+$/, '');
    
    // Ensure it ends with /wd/hub (Selenium Grid hub endpoint)
    if (!hubUrl.endsWith('/wd/hub')) {
      hubUrl = `${hubUrl}/wd/hub`;
    }
    
    console.log(`  Connecting to Selenium Grid hub: ${hubUrl}`);
    
    // Create capabilities for Chrome
    const capabilities = Capabilities.chrome();
    capabilities.merge(options);
    
    // Build remote driver
    const driver = await new Builder()
      .usingServer(hubUrl)
      .withCapabilities(capabilities)
      .build();
    
    console.log('✓ Selenium Grid driver initialized');
    return driver;
  } catch (error) {
    console.error('Failed to setup Selenium Grid driver:', error.message);
    console.error('  Make sure your Selenium Grid is running and accessible');
    console.error('  Grid URL should be: https://chrome-node-production.up.railway.app/wd/hub');
    throw error;
  }
}

/**
 * Setup driver using local Chrome (fallback)
 */
async function setupLocalDriver() {
  try {
    const options = new chrome.Options();
    const { execSync } = require('child_process');
    const fs = require('fs');
    
    // Set Chrome binary path for Railway/Linux environments
    // Try common paths where Chromium is installed
    // IMPORTANT: chromium-browser may be a snap wrapper, so try /usr/bin/chromium first
    // Also check /usr/lib/chromium/chromium which is the actual binary location
    const possibleChromePaths = [
      '/usr/bin/chromium',  // Direct binary (preferred)
      '/usr/lib/chromium/chromium',  // Actual binary location on some systems
      '/usr/lib/chromium-browser/chromium-browser',  // Alternative location
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser'  // Last resort (may be snap wrapper)
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
        if (!fs.existsSync(path)) {
          continue;
        }
        
        // Check if it's a snap wrapper (contains "snap" in readlink or is a script)
        try {
          const stats = fs.lstatSync(path);
          if (stats.isSymbolicLink()) {
            const linkTarget = fs.readlinkSync(path);
            if (linkTarget.includes('snap')) {
              console.log(`  Skipping ${path} (snap wrapper)`);
              continue;
            }
          } else if (stats.isFile()) {
            // Check if it's a script that mentions snap
            const content = fs.readFileSync(path, 'utf8').substring(0, 200);
            if (content.includes('snap') && content.includes('chromium')) {
              console.log(`  Skipping ${path} (snap wrapper script)`);
              continue;
            }
          }
        } catch (e) {
          // Continue checking
        }
        
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
      let finalPath;
      try {
        if (fs.existsSync(chromePath) && !fs.lstatSync(chromePath).isSymbolicLink()) {
          finalPath = chromePath;
        } else {
          finalPath = fs.realpathSync(chromePath);
        }
      } catch (e) {
        finalPath = chromePath;
      }
      
      options.setChromeBinaryPath(finalPath);
      console.log(`  Using Chrome binary: ${finalPath}`);
      
      // Test if Chromium can run (check version)
      try {
        const versionOutput = execSync(`"${finalPath}" --version`, { 
          timeout: 5000,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe']
        });
        console.log(`  Chrome version check: ${versionOutput.trim()}`);
      } catch (e) {
        console.log(`  Warning: Could not verify Chrome version: ${e.message}`);
      }
    } else {
      console.log('  Using default Chrome binary (may need to be set)');
    }
    
    // Chrome options for Railway/Linux headless environment
    // Start with minimal critical flags - add more only if needed
    options.addArguments('--headless=new');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-setuid-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-gpu');
    options.addArguments('--disable-software-rasterizer');
    options.addArguments('--disable-extensions');
    // Note: --single-process can cause issues, try without it first
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
    // Use a random port for remote debugging to avoid conflicts
    const debugPort = 9000 + Math.floor(Math.random() * 1000);
    options.addArguments(`--remote-debugging-port=${debugPort}`);
    options.addArguments('--remote-allow-origins=*');
    options.addArguments('--window-size=1920,1080');
    options.addArguments('--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Let selenium-webdriver manage ChromeDriver completely
    // Don't try to use system ChromeDriver as it may not match Chromium version
    console.log('  Using selenium-webdriver managed ChromeDriver (auto-downloads matching version)');
    const service = new chrome.ServiceBuilder();
    
    // Use 'chrome' browser type (works for both Chrome and Chromium)
    const builder = new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options);
    
    if (service) {
      builder.setChromeService(service);
    }
    
    try {
      console.log('  Attempting to build Chrome driver...');
      const driver = await builder.build();
      console.log('✓ Chrome driver initialized');
      return driver;
    } catch (buildError) {
      console.error(`  Build error: ${buildError.message}`);
      
      // Try with even more minimal options and test Chromium directly
      console.log('  Trying with ultra-minimal options...');
      
      // First, test if Chromium can run at all
      if (chromePath) {
        let finalPath;
        try {
          if (fs.existsSync(chromePath) && !fs.lstatSync(chromePath).isSymbolicLink()) {
            finalPath = chromePath;
          } else {
            finalPath = fs.realpathSync(chromePath);
          }
          
          console.log(`  Testing Chromium directly: ${finalPath}`);
          try {
            const { execSync } = require('child_process');
            // Test with minimal flags to see if Chromium can start
            const testResult = execSync(`"${finalPath}" --headless --disable-gpu --no-sandbox --disable-dev-shm-usage --dump-dom about:blank 2>&1`, {
              timeout: 10000,
              encoding: 'utf8',
              stdio: ['ignore', 'pipe', 'pipe']
            });
            console.log('  ✓ Chromium can run directly (test successful)');
          } catch (testError) {
            console.error(`  ✗ Chromium test failed`);
            console.error(`  Error message: ${testError.message}`);
            if (testError.stderr) {
              console.error(`  stderr: ${testError.stderr.toString().substring(0, 500)}`);
            }
            if (testError.stdout) {
              console.error(`  stdout: ${testError.stdout.toString().substring(0, 500)}`);
            }
            console.error(`  This suggests Chromium may be missing dependencies or misconfigured`);
            console.error(`  Common issues: missing libnss3, libgbm1, or other shared libraries`);
          }
        } catch (e) {
          finalPath = chromePath;
        }
      }
      
      const minimalOptions = new chrome.Options();
      if (chromePath) {
        let finalPath;
        try {
          if (fs.existsSync(chromePath) && !fs.lstatSync(chromePath).isSymbolicLink()) {
            finalPath = chromePath;
          } else {
            finalPath = fs.realpathSync(chromePath);
          }
          minimalOptions.setChromeBinaryPath(finalPath);
        } catch (e) {
          minimalOptions.setChromeBinaryPath(chromePath);
        }
      }
      
      // Absolute minimum flags needed - try without headless first
      minimalOptions.addArguments('--headless=new');
      minimalOptions.addArguments('--no-sandbox');
      minimalOptions.addArguments('--disable-setuid-sandbox');
      minimalOptions.addArguments('--disable-dev-shm-usage');
      minimalOptions.addArguments('--disable-gpu');
      minimalOptions.addArguments('--disable-software-rasterizer');
      minimalOptions.addArguments('--disable-extensions');
      
      const minimalService = new chrome.ServiceBuilder();
      
      const minimalBuilder = new Builder()
        .forBrowser('chrome')
        .setChromeOptions(minimalOptions)
        .setChromeService(minimalService);
      
      try {
        const driver = await minimalBuilder.build();
        console.log('✓ Chrome driver initialized (ultra-minimal mode)');
        return driver;
      } catch (minimalError) {
        console.error(`  Minimal build also failed: ${minimalError.message}`);
        console.error(`  Full error details:`, minimalError);
        
        // Last resort: try with chromium directly without selenium
        throw new Error(`Chrome driver setup failed. Original: ${buildError.message}. Minimal: ${minimalError.message}. Chromium may need additional dependencies or configuration.`);
      }
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
        
        // Extract channel ID from the link href
        let channelId = null;
        const href = channelLink.attr('href') || '';
        
        // Extract channel ID from different URL formats:
        // /channel/UC... (channel ID)
        // /c/ChannelName (custom URL - need to resolve)
        // /@handle (handle - need to resolve)
        if (href.includes('/channel/')) {
          // Direct channel ID: /channel/UCxxxxxxxxxxxxx
          const match = href.match(/\/channel\/([a-zA-Z0-9_-]+)/);
          if (match) {
            channelId = match[1];
          }
        } else if (href.includes('/c/')) {
          // Custom URL: /c/ChannelName - store as-is, will need to resolve later
          const match = href.match(/\/c\/([a-zA-Z0-9_-]+)/);
          if (match) {
            channelId = `/c/${match[1]}`;
          }
        } else if (href.includes('/@')) {
          // Handle: /@handle - store as @handle
          const match = href.match(/\/@([a-zA-Z0-9_-]+)/);
          if (match) {
            channelId = `@${match[1]}`;
          }
        } else if (href.includes('youtube.com/')) {
          // Try to extract from full URL
          const urlMatch = href.match(/youtube\.com\/(channel|c|@)([a-zA-Z0-9_-]+)/);
          if (urlMatch) {
            const type = urlMatch[1];
            const id = urlMatch[2];
            if (type === 'channel') {
              channelId = id;
            } else if (type === 'c') {
              channelId = `/c/${id}`;
            } else if (type === '@') {
              channelId = `@${id}`;
            }
          }
        }
        
        // Extract subscribers
        const subMatch = fullText.match(/([\d.]+[KMB]?)\s*subscriber/i);
        const subscribers = subMatch ? formatNumber(subMatch[1]) : 0;
        
        channels.push({
          channel_name: channelName,
          channel_id: channelId, // Now includes channel_id
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

/**
 * Check if a search term has already been processed
 * @param {string} searchTerm - The search term to check
 * @returns {Promise<boolean>} True if the search term exists in the database
 */
async function searchTermExists(searchTerm) {
  const client = await getClient();
  
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM youtube_channels
      WHERE search_term = $1
      LIMIT 1
    `, [searchTerm]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error(`    ⚠️  Error checking if search term exists: ${error.message}`);
    // If check fails, assume it doesn't exist (safer to process than skip)
    return false;
  } finally {
    client.release();
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
            (channel_name, channel_id, subscribers, search_term, query_name, last_updated)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (channel_name) 
          DO UPDATE SET 
            channel_id = COALESCE(EXCLUDED.channel_id, youtube_channels.channel_id),
            subscribers = EXCLUDED.subscribers,
            search_term = EXCLUDED.search_term,
            query_name = EXCLUDED.query_name,
            last_updated = NOW()
          RETURNING (xmax = 0) AS inserted
        `, [
          channel.channel_name,
          channel.channel_id || null,
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
    termsSkipped: 0,
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
      
      // Check if this search term has already been processed
      const alreadyExists = await searchTermExists(term);
      if (alreadyExists) {
        console.log(`    ⏭️  Skipping "${term}" - already exists in database`);
        stats.termsSkipped++;
        
        // Progress callback even for skipped terms
        if (onProgress) {
          onProgress({
            termIndex,
            totalTerms: allTerms.length,
            currentBatchSize: currentBatch.length,
            totalSaved,
            totalUpdated,
            skipped: true
          });
        }
        
        continue; // Skip to next term
      }
      
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
    console.log(`   Terms skipped: ${stats.termsSkipped} (already in database)`);
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