#!/usr/bin/env node
// jobs/run-once.js
// Manual trigger script to test the scraper before deploying the scheduled job

require('dotenv').config();
const { runScraper } = require('./youtube-scraper/scraper');
const { initializeDatabase, closePool } = require('./db/connection');
const queries = require('./youtube-scraper/queries');

async function main() {
  console.log('🚀 YouTube Channel Scraper - Manual Run\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}\n`);
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    console.error('   Please create a .env file with DATABASE_URL or set it in your environment.\n');
    process.exit(1);
  }
  
  try {
    // Initialize database
    console.log('Initializing database...');
    await initializeDatabase();
    console.log('✓ Database initialized\n');
    
    // Validate queries
    if (!queries || queries.length === 0) {
      throw new Error('No queries configured in queries.js');
    }
    
    console.log(`Loaded ${queries.length} query categories:`);
    queries.forEach(q => {
      const termCount = q.terms.split(',').length;
      console.log(`  - ${q.name}: ${termCount} search terms`);
    });
    console.log();
    
    // Run the scraper
    const startTime = Date.now();
    console.log('Starting scraper...\n');
    
    await runScraper(queries);
    
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`\n✅ Scraper completed successfully in ${duration} minutes!\n`);
    
  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Clean up
    try {
      await closePool();
      console.log('✓ Database connections closed');
    } catch (error) {
      console.error('✗ Error closing database:', error.message);
    }
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Interrupted by user. Cleaning up...');
  try {
    await closePool();
    console.log('✓ Cleanup complete');
  } catch (error) {
    console.error('✗ Cleanup error:', error.message);
  }
  process.exit(0);
});

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

