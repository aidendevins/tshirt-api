// ============================================================
// 🧪 YouTube API Test Script - Processes 5 Channels Only
// ============================================================
//
// This test script runs the YouTube merchandise partnership scraper
// on only 5 channels to verify functionality and persist results to database.
//
// ============================================================

require('dotenv').config();
const { main } = require('./youtubeapi');

async function runTest() {
  console.log('\n🧪 TEST MODE: Processing 5 channels only\n');
  
  try {
    await main(5);
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
runTest();

