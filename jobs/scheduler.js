// jobs/scheduler.js
require('dotenv').config();
const cron = require('node-cron');
const { runScraper } = require('./youtube-scraper/scraper');
const { initializeDatabase, closePool } = require('./db/connection');
const queries = require('./youtube-scraper/queries');

// Initialize database on startup
(async () => {
  try {
    console.log('🚀 Starting YouTube Scraper Scheduler...\n');
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? '✓ Connected' : '✗ Not configured'}\n`);
    
    await initializeDatabase();
    console.log('✓ Database initialized\n');
    
    // Validate queries
    if (!queries || queries.length === 0) {
      throw new Error('No queries configured in queries.js');
    }
    console.log(`✓ Loaded ${queries.length} query categories`);
    queries.forEach(q => console.log(`  - ${q.name}: ${q.terms.split(',').length} search terms`));
    
  } catch (error) {
    console.error('❌ Failed to initialize:', error.message);
    process.exit(1);
  }
})();

// Schedule the scraper to run daily at 2 AM UTC
cron.schedule('0 2 * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🕐 [${timestamp}] Starting scheduled YouTube scraper...`);
  console.log(`${'='.repeat(80)}\n`);
  
  try {
    const startTime = Date.now();
    await runScraper(queries);
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    
    console.log(`\n✅ Scraper completed successfully in ${duration} minutes`);
  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error('Stack trace:', error.stack);
    // TODO: Send alert (email, Slack, Discord, etc.)
  }
  
  console.log(`${'='.repeat(80)}\n`);
}, {
  scheduled: true,
  timezone: "UTC"
});

// Calculate next run time (2 AM UTC)
function getNextRunTime() {
  const now = new Date();
  const nextRun = new Date();
  nextRun.setUTCHours(2, 0, 0, 0);
  
  // If it's already past 2 AM today, schedule for tomorrow
  if (now.getUTCHours() >= 2) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }
  
  return nextRun;
}

console.log('\n✓ YouTube scraper scheduled - runs daily at 2 AM UTC');
console.log('  Next run:', getNextRunTime().toISOString());
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