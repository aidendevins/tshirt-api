#!/usr/bin/env node
// jobs/youtube-scraper/continuous-scraper.js
// Continuously runs the YouTube scraper, restarting the driver every 2 hours

require('dotenv').config();
const http = require('http');
const { runScraper, setupDriver } = require('./scraper');
const { initializeDatabase, closePool } = require('./db/connection');
const queries = require('./queries');

// Configuration
const DRIVER_RESTART_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const SAVE_INTERVAL = 20; // Save after every 20 terms
const TERM_DELAY = 3000; // 3 seconds between terms (2-4 seconds random)
const HEALTHCHECK_PORT = process.env.PORT || 3000; // Railway sets PORT automatically

// Global state
let isRunning = true;
let driver = null;
let driverStartTime = null;
let totalStats = {
  termsProcessed: 0,
  termsSkipped: 0,
  channelsFound: 0,
  channelsSaved: 0,
  channelsUpdated: 0,
  batchesSaved: 0,
  driverRestarts: 0,
  startTime: Date.now()
};

/**
 * Start HTTP server for Railway healthchecks
 */
function startHealthcheckServer() {
  const server = http.createServer((req, res) => {
    // Healthcheck endpoint
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'youtube-scraper',
        uptime: Math.floor((Date.now() - totalStats.startTime) / 1000),
        stats: {
          termsProcessed: totalStats.termsProcessed,
          termsSkipped: totalStats.termsSkipped,
          channelsSaved: totalStats.channelsSaved,
          channelsUpdated: totalStats.channelsUpdated,
          driverRestarts: totalStats.driverRestarts
        }
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(HEALTHCHECK_PORT, () => {
    console.log(`✓ Healthcheck server listening on port ${HEALTHCHECK_PORT}`);
    console.log(`  Healthcheck URL: http://localhost:${HEALTHCHECK_PORT}/`);
  });

  // Store globally for shutdown
  global.healthcheckServer = server;
  
  return server;
}

/**
 * Initialize database and validate setup
 */
async function initialize() {
  try {
    console.log('🚀 Starting Continuous YouTube Scraper...\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? '✓ Connected' : '✗ Not configured'}\n`);
    
    await initializeDatabase();
    console.log('✓ Database initialized\n');
    
    // Validate queries
    if (!queries || queries.length === 0) {
      throw new Error('No queries configured in queries.js');
    }
    
    const totalTerms = queries.reduce((sum, q) => sum + q.terms.split(',').length, 0);
    console.log(`✓ Loaded ${queries.length} query categories`);
    console.log(`✓ Total search terms: ${totalTerms}`);
    console.log(`✓ Save interval: Every ${SAVE_INTERVAL} terms`);
    console.log(`✓ Driver restart interval: Every 2 hours\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    throw error;
  }
}

/**
 * Check if driver needs to be restarted (every 2 hours)
 */
function shouldRestartDriver() {
  if (!driver || !driverStartTime) return false;
  const driverAge = Date.now() - driverStartTime;
  return driverAge >= DRIVER_RESTART_INTERVAL;
}

/**
 * Restart the Chrome driver to prevent memory leaks
 */
async function restartDriver() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Restarting Chrome driver (2-hour interval)...');
  console.log('='.repeat(60) + '\n');
  
  if (driver) {
    try {
      await driver.quit();
      console.log('✓ Old driver closed');
    } catch (error) {
      console.error('✗ Error closing old driver:', error.message);
    }
    driver = null;
    driverStartTime = null;
  }
  
  try {
    driver = await setupDriver();
    driverStartTime = Date.now();
    totalStats.driverRestarts++;
    console.log(`✓ New driver initialized (Restart #${totalStats.driverRestarts})`);
    console.log(`  Next restart in: 2 hours\n`);
    return true;
  } catch (error) {
    console.error('✗ Failed to restart driver:', error.message);
    throw error;
  }
}

/**
 * Run scraper continuously in a loop
 */
async function runContinuous() {
  let cycleCount = 0;
  
  while (isRunning) {
    cycleCount++;
    
    try {
      // Check if driver needs restart
      if (shouldRestartDriver()) {
        await restartDriver();
      }
      
      // Initialize driver if needed
      if (!driver) {
        driver = await setupDriver();
        driverStartTime = Date.now();
        console.log('✓ Chrome driver initialized\n');
      }
      
      console.log('\n' + '='.repeat(80));
      console.log(`🔄 CYCLE #${cycleCount} - Starting scraper run`);
      console.log('='.repeat(80));
      console.log(`Start time: ${new Date().toISOString()}`);
      console.log(`Driver age: ${((Date.now() - driverStartTime) / 1000 / 60).toFixed(1)} minutes`);
      console.log(`Total stats: ${totalStats.termsProcessed} processed, ${totalStats.termsSkipped} skipped, ${totalStats.channelsSaved} saved, ${totalStats.channelsUpdated} updated`);
      console.log('='.repeat(80) + '\n');
      
      // Run scraper with current driver
      const stats = await runScraper(queries, {
        saveInterval: SAVE_INTERVAL,
        driver: driver,
        shouldStop: () => !isRunning || shouldRestartDriver(),
        onProgress: (progress) => {
          // Log progress every 50 terms
          if (progress.termIndex % 50 === 0) {
            console.log(`\n  📊 Progress: ${progress.termIndex}/${progress.totalTerms} terms (${((progress.termIndex / progress.totalTerms) * 100).toFixed(1)}%)`);
            console.log(`     Saved: ${progress.totalSaved} new, ${progress.totalUpdated} updated`);
          }
        }
      });
      
      // Update total stats
      totalStats.termsProcessed += stats.termsProcessed || 0;
      totalStats.termsSkipped += stats.termsSkipped || 0;
      totalStats.channelsFound += stats.channelsFound || 0;
      totalStats.channelsSaved += stats.channelsSaved || 0;
      totalStats.channelsUpdated += stats.channelsUpdated || 0;
      totalStats.batchesSaved += stats.batchesSaved || 0;
      
      const totalDuration = (Date.now() - totalStats.startTime) / 1000 / 60;
      
      console.log('\n' + '='.repeat(80));
      console.log(`✅ CYCLE #${cycleCount} COMPLETED`);
      console.log('='.repeat(80));
      console.log(`Cycle stats:`);
      console.log(`  Terms: ${stats.termsProcessed || 0} processed, ${stats.termsSkipped || 0} skipped`);
      console.log(`  Channels: ${stats.channelsSaved || 0} new, ${stats.channelsUpdated || 0} updated`);
      console.log(`  Duration: ${((stats.duration || 0) / 1000 / 60).toFixed(2)} minutes`);
      console.log(`\nTotal stats (since start):`);
      console.log(`  Terms: ${totalStats.termsProcessed} processed, ${totalStats.termsSkipped} skipped`);
      console.log(`  Channels: ${totalStats.channelsSaved} new, ${totalStats.channelsUpdated} updated`);
      console.log(`  Batches: ${totalStats.batchesSaved}`);
      console.log(`  Driver restarts: ${totalStats.driverRestarts}`);
      console.log(`  Total runtime: ${totalDuration.toFixed(2)} minutes (${(totalDuration / 60).toFixed(2)} hours)`);
      console.log('='.repeat(80) + '\n');
      
      // If we completed all queries, restart immediately for next cycle
      // (This means we've gone through all queries once)
      console.log('🔄 Starting next cycle immediately...\n');
      
      // Small delay before next cycle
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error('\n❌ Error in cycle:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Try to restart driver on error
      try {
        if (driver) {
          await driver.quit();
          driver = null;
          driverStartTime = null;
        }
      } catch (e) {
        console.error('Error closing driver after failure:', e.message);
      }
      
      // Wait before retrying
      console.log('⏳ Waiting 30 seconds before retrying...\n');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
  if (!isRunning) return;
  isRunning = false;
  
  console.log(`\n\n⚠️  Received ${signal}, shutting down gracefully...`);
  
  try {
    if (driver) {
      await driver.quit();
      console.log('✓ Chrome driver closed');
    }
    
    // Close healthcheck server
    if (global.healthcheckServer) {
      global.healthcheckServer.close(() => {
        console.log('✓ Healthcheck server closed');
      });
    }
    
    await closePool();
    console.log('✓ Database connections closed');
    
    const totalDuration = (Date.now() - totalStats.startTime) / 1000 / 60;
    console.log('\n📊 Final Statistics:');
    console.log(`  Terms processed: ${totalStats.termsProcessed}`);
    console.log(`  Terms skipped: ${totalStats.termsSkipped} (already in database)`);
    console.log(`  Channels saved: ${totalStats.channelsSaved} new, ${totalStats.channelsUpdated} updated`);
    console.log(`  Batches saved: ${totalStats.batchesSaved}`);
    console.log(`  Driver restarts: ${totalStats.driverRestarts}`);
    console.log(`  Total runtime: ${totalDuration.toFixed(2)} minutes (${(totalDuration / 60).toFixed(2)} hours)`);
    console.log('\n✓ Shutdown complete\n');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Main execution
(async () => {
  let healthcheckServer = null;
  
  try {
    await initialize();
    
    // Start healthcheck server for Railway
    healthcheckServer = startHealthcheckServer();
    
    // Setup signal handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('\n💥 Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
    
    // Start continuous scraping
    console.log('📡 Starting continuous scraper...');
    console.log('   Press Ctrl+C to stop gracefully\n');
    
    await runContinuous();
    
  } catch (error) {
    console.error('Fatal error:', error);
    if (healthcheckServer) {
      healthcheckServer.close();
    }
    await closePool();
    process.exit(1);
  }
})();

