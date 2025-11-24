#!/usr/bin/env node
// jobs/run-all.js
// Runs both the scraper and analyzer in sequence

require('dotenv').config();
const { runScraper } = require('./youtube-scraper/scraper');
const { initializeDatabase, closePool } = require('./db/connection');
const queries = require('./youtube-scraper/queries');

async function runScraperStep() {
  console.log('\n' + '='.repeat(70));
  console.log('📡 STEP 1: SCRAPING YOUTUBE CHANNELS');
  console.log('='.repeat(70) + '\n');
  
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
    return true;
    
  } catch (error) {
    console.error('\n❌ Scraper failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    return false;
  }
}

async function runAnalyzerStep() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 STEP 2: ANALYZING CHANNELS');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Import and run the analyzer
    const { main: runAnalyzer } = require('./youtube-api/youtubeapi');
    await runAnalyzer();
    return true;
  } catch (error) {
    console.error('\n❌ Analyzer failed:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 YOUTUBE CHANNEL SCRAPER & ANALYZER - FULL PIPELINE');
  console.log('='.repeat(70));
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? '✓ Set' : '✗ Not set'}\n`);
  
  const overallStartTime = Date.now();
  
  // Step 1: Run scraper
  const scraperSuccess = await runScraperStep();
  
  if (!scraperSuccess) {
    console.error('\n❌ Pipeline stopped: Scraper failed');
    await closePool();
    process.exit(1);
  }
  
  // Small delay between steps
  console.log('\n⏳ Waiting 5 seconds before starting analysis...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 2: Run analyzer
  const analyzerSuccess = await runAnalyzerStep();
  
  // Clean up
  try {
    await closePool();
    console.log('✓ Database connections closed');
  } catch (error) {
    console.error('✗ Error closing database:', error.message);
  }
  
  // Final summary
  const totalDuration = ((Date.now() - overallStartTime) / 1000 / 60).toFixed(2);
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 PIPELINE SUMMARY');
  console.log('='.repeat(70));
  console.log(`Scraper: ${scraperSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Analyzer: ${analyzerSuccess ? '✅ Success' : '❌ Failed'}`);
  console.log(`Total Duration: ${totalDuration} minutes`);
  console.log('='.repeat(70) + '\n');
  
  if (scraperSuccess && analyzerSuccess) {
    console.log('🎉 Full pipeline completed successfully!\n');
    process.exit(0);
  } else {
    console.log('⚠️ Pipeline completed with errors\n');
    process.exit(1);
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

