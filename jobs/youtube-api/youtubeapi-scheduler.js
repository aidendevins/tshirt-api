// ============================================================
// ⏰ YouTube API Daily Scheduler - Runs at 4 AM Daily
// ============================================================
//
// This scheduler runs the YouTube merchandise partnership scraper
// every day at 4 AM UTC until all API keys are exhausted.
// 
// Features:
// - Runs daily at 4 AM UTC
// - Skips channels already analyzed today
// - Continues until all API keys are exhausted
// - Quota resets daily automatically
//
// ============================================================

require('dotenv').config();
const cron = require('node-cron');
const { main } = require('./youtubeapi');
const { initializeDatabase, closePool } = require('../db/connection');

// Initialize database on startup
(async () => {
  try {
    console.log('🚀 Starting YouTube API Scheduler...\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? '✓ Connected' : '✗ Not configured'}\n`);
    
    await initializeDatabase();
    console.log('✓ Database initialized\n');
    
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    process.exit(1);
  }
})();

// Schedule the scraper to run daily at 4 AM UTC
// Cron format: minute hour day month weekday
// '0 4 * * *' = 4:00 AM every day
cron.schedule('0 4 * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🕐 [${timestamp}] Starting daily YouTube API scraper at 4 AM UTC...`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const startTime = Date.now();
    
    // Run the scraper (will continue until all API keys are exhausted)
    // The main() function handles API key switching automatically
    await main(null); // null = process all channels (no limit)
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log(`\n✅ Daily scraper completed successfully in ${duration} minutes`);
    console.log(`📊 Next run: Tomorrow at 4 AM UTC`);
    
  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // If all API keys are exhausted, that's expected - log it but don't treat as error
    if (error.message && error.message.includes('ALL API KEYS EXHAUSTED')) {
      console.log('\n⚠️ All API keys exhausted for today. Will resume tomorrow at 4 AM UTC.');
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
const nextRun = cron.schedule('0 4 * * *', () => {}).nextDate();
console.log('\n✓ YouTube API scraper scheduled - runs daily at 4 AM UTC');
console.log(`  Next run: ${nextRun.toISOString()}`);
console.log(`  Current time: ${new Date().toISOString()}`);
console.log('\n📡 Scheduler is running. Press Ctrl+C to stop.\n');

// Graceful shutdown
let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n\n⚠️  Received ${signal}, shutting down gracefully...`);
  
  try {
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

