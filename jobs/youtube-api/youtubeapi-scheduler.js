// ============================================================
// ⏰ YouTube API Scheduler - Runs Every 4 Hours
// ============================================================
//
// This scheduler runs the YouTube merchandise partnership scraper
// every 4 hours starting at 12 AM UTC until all API keys are exhausted.
// 
// Schedule: 12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM UTC
// 
// Features:
// - Runs every 4 hours starting at 12 AM UTC
// - Skips channels already analyzed today
// - Continues until all API keys are exhausted
// - Quota resets daily automatically
//
// ============================================================

require('dotenv').config();
const http = require('http');
const cron = require('node-cron');
const { main } = require('./youtubeapi');
const { initializeDatabase, closePool } = require('./db/connection');

// Healthcheck server configuration
const HEALTHCHECK_PORT = process.env.PORT || 3000; // Railway sets PORT automatically
let healthcheckServer = null;
const startTime = Date.now();

// Calculate next run time (every 4 hours: 0, 4, 8, 12, 16, 20 UTC)
function getNextRunTime() {
  const now = new Date();
  const currentHour = now.getUTCHours();
  
  // Find next 4-hour interval (0, 4, 8, 12, 16, 20)
  const intervals = [0, 4, 8, 12, 16, 20];
  let nextHour = intervals.find(h => h > currentHour);
  
  const nextRun = new Date();
  
  if (nextHour !== undefined) {
    // Next interval is today
    nextRun.setUTCHours(nextHour, 0, 0, 0);
  } else {
    // Next interval is tomorrow at midnight
    nextRun.setUTCHours(0, 0, 0, 0);
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }
  
  return nextRun;
}

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
        service: 'youtube-api-scheduler',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        nextRun: getNextRunTime().toISOString(),
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(HEALTHCHECK_PORT, () => {
    console.log(`✓ Healthcheck server listening on port ${HEALTHCHECK_PORT}`);
    console.log(`  Healthcheck URL: http://localhost:${HEALTHCHECK_PORT}/health`);
  });

  return server;
}

// Initialize database and start healthcheck server on startup
(async () => {
  try {
    console.log('🚀 Starting YouTube API Scheduler...\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? '✓ Connected' : '✗ Not configured'}\n`);
    
    await initializeDatabase();
    console.log('✓ Database initialized\n');
    
    // Start healthcheck server for Railway
    healthcheckServer = startHealthcheckServer();
    
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    process.exit(1);
  }
})();

// Schedule the scraper to run every 4 hours starting at 12 AM UTC
// Cron format: minute hour day month weekday
// '0 */4 * * *' = Every 4 hours at minute 0 (12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM UTC)
cron.schedule('0 */4 * * *', async () => {
  const timestamp = new Date().toISOString();
  const currentHour = new Date().getUTCHours();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🕐 [${timestamp}] Starting YouTube API scraper (every 4 hours - current: ${currentHour}:00 UTC)...`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const startTime = Date.now();
    
    // Run the scraper (will continue until all API keys are exhausted)
    // The main() function handles API key switching automatically
    await main(null); // null = process all channels (no limit)
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log(`\n✅ Scraper completed successfully in ${duration} minutes`);
    const nextRun = getNextRunTime();
    console.log(`📊 Next run: ${nextRun.toISOString()} (${nextRun.getUTCHours()}:00 UTC)`);
    
  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // If all API keys are exhausted, that's expected - log it but don't treat as error
    if (error.message && error.message.includes('ALL API KEYS EXHAUSTED')) {
      const nextRun = getNextRunTime();
      console.log(`\n⚠️ All API keys exhausted. Will resume at ${nextRun.toISOString()} (${nextRun.getUTCHours()}:00 UTC).`);
    } else {
      // For other errors, you might want to send alerts
      // TODO: Send alert (email, Slack, Discord, etc.)
    }
  }
  
  console.log(`${'='.repeat(80)}\n`);
}, {
  scheduled: true,
  timezone: "UTC"
});

// Also run immediately on startup if in development (for testing)
if (process.env.NODE_ENV === 'development' && process.env.RUN_ON_STARTUP === 'true') {
  console.log('⚠️ Development mode: Running scraper immediately on startup...\n');
  setTimeout(async () => {
    try {
      await main(null);
    } catch (error) {
      console.error('Error in startup run:', error.message);
    }
  }, 5000);
}

// Calculate next run time
const nextRun = getNextRunTime();
console.log('\n✓ YouTube API scraper scheduled - runs every 4 hours starting at 12 AM UTC');
console.log(`  Schedule: 12 AM, 4 AM, 8 AM, 12 PM, 4 PM, 8 PM UTC`);
console.log(`  Next run: ${nextRun.toISOString()} (${nextRun.getUTCHours()}:00 UTC)`);
console.log(`  Current time: ${new Date().toISOString()}`);
console.log('\n📡 Scheduler is running. Press Ctrl+C to stop.\n');

// Graceful shutdown
let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n\n⚠️  Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close healthcheck server
    if (healthcheckServer) {
      healthcheckServer.close(() => {
        console.log('✓ Healthcheck server closed');
      });
    }
    
    await closePool();
    console.log('✓ Database connections closed');
    console.log('✓ Scheduler stopped');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error during shutdown:', error.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

