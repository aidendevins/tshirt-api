// ============================================================
// 🚀 YouTube Merchandise Partnership Scraper (DATABASE OUTPUT)
// ============================================================
//
// FEATURES:
// ✅ Reads channels from Neon database (youtube_channels table)
// ✅ Filters OUT channels with <10,000 subscribers
// ✅ Filters OUT channels with NULL/empty channel_id
// ✅ Uses channel IDs directly - NEVER uses expensive search API!
// ✅ @handles: 1 unit (forHandle) | UC... IDs: 1 unit (direct)
// ✅ Total cost: ~3 units per channel (can analyze 3,300+ channels/day!)
// ✅ Collects data for ALL channels (no early filtering)
// ✅ Outputs to TWO database tables:
//    1. youtube_channel_analysis - Raw data for every channel analyzed
//    2. youtube_qualified_channels - Only channels with >=7 qualifying videos + scores
// ✅ Filters videos by: Date (60 days), Shorts (<60s), Short videos (<4min)
// ✅ Multiple API key support with automatic failover
// ✅ API quota tracking
//
// ============================================================

require('dotenv').config();
const { google } = require('googleapis');
const { query, getClient } = require('../db/connection');

// -------------------- CONFIG --------------------
// MULTIPLE API KEYS - Will automatically switch when quota exceeded!
const API_KEYS = [
  process.env.YOUTUBE_API_KEY_1,
  process.env.YOUTUBE_API_KEY_2,
  process.env.YOUTUBE_API_KEY_3,
  process.env.YOUTUBE_API_KEY_4,
  process.env.YOUTUBE_API_KEY_5,
  process.env.YOUTUBE_API_KEY_6,
  process.env.YOUTUBE_API_KEY_7,
  process.env.YOUTUBE_API_KEY_8,
  process.env.YOUTUBE_API_KEY_9,
  process.env.YOUTUBE_API_KEY_10,
  process.env.YOUTUBE_API_KEY_11,
  process.env.YOUTUBE_API_KEY_12
].filter(key => key); // Remove undefined keys

// Current API key index
let CURRENT_KEY_INDEX = 0;
let API_KEY = API_KEYS[CURRENT_KEY_INDEX] || API_KEYS[0];
let youtube = google.youtube({ version: 'v3', auth: API_KEY });

// Filter configuration
const MIN_SUBS_FILTER = 10000;           // Filter out channels below this

// Analysis configuration
const VIDEOS_PER_CHANNEL = 50;           // Fetch up to 50 videos (still only 1 unit cost!)
const MIN_VIDEOS_IN_TIMEFRAME = 7;       // Require at least 7 qualifying videos FOR SCORING
const DAYS_LOOKBACK = 60;                // Look back 60 days (2 months)

// Duration filters
const MIN_VIDEO_DURATION = 240;          // Minimum 240 seconds (4 minutes)
const MAX_SHORT_DURATION = 60;           // Maximum 60 seconds for Shorts detection

// Persistence configuration
const SAVE_BATCH_SIZE = Math.max(1, parseInt(process.env.YOUTUBE_SAVE_BATCH_SIZE || '25', 10) || 25); // Channels per DB batch
const LOG_PROGRESS_EVERY = Math.max(1, parseInt(process.env.YOUTUBE_LOG_EVERY || '25', 10) || 25);
const ENABLE_VERBOSE_LOGS = process.env.YOUTUBE_VERBOSE_LOGS === 'true';

// Optional: Limit number of channels to process (set to null for all)
const MAX_CHANNELS_TO_PROCESS = null;    // Set to a number like 100 for testing, null for all

// Global quota tracker
let QUOTA_USED = 0;
const QUOTA_LIMIT = 10000;
// ------------------------------------------------

// ------------------------------------------------
// 🔑 API KEY MANAGEMENT
// ------------------------------------------------

function switchApiKey() {
  /**Switch to the next available API key when quota is exceeded*/
  CURRENT_KEY_INDEX += 1;

  if (CURRENT_KEY_INDEX >= API_KEYS.length) {
    console.log("\n" + "=".repeat(70));
    console.log("❌ ALL API KEYS EXHAUSTED!");
    console.log("=".repeat(70));
    console.log(`Used all ${API_KEYS.length} API keys.`);
    console.log("Please wait until tomorrow for quota reset or add more API keys.");
    console.log("=".repeat(70));
    return false;
  }

  // Switch to new key
  API_KEY = API_KEYS[CURRENT_KEY_INDEX];
  youtube = google.youtube({ version: 'v3', auth: API_KEY });

  // Reset quota counter for new key
  QUOTA_USED = 0;

  console.log("\n" + "=".repeat(70));
  console.log(`🔄 SWITCHING TO API KEY #${CURRENT_KEY_INDEX + 1}`);
  console.log("=".repeat(70));
  console.log(`Key: ${API_KEY.substring(0, 20)}...${API_KEY.substring(API_KEY.length - 4)}`);
  console.log(`Quota reset to: 0/${QUOTA_LIMIT.toLocaleString()}`);
  console.log("=".repeat(70) + "\n");

  return true;
}

function isQuotaExceededError(error) {
  /**Check if error is due to quota exceeded*/
  if (error.code === 403) {
    const errorMessage = error.message || JSON.stringify(error);
    if (errorMessage.includes('quotaExceeded') || errorMessage.toLowerCase().includes('quota')) {
      return true;
    }
  }
  return false;
}

// ------------------------------------------------
// 🛡️ HELPER FUNCTIONS
// ------------------------------------------------

function trackQuota(operation, cost) {
  /**Track API quota usage and warn if approaching limit*/
  QUOTA_USED += cost;

  const percentage = (QUOTA_USED / QUOTA_LIMIT) * 100;

  if (QUOTA_USED > 9000) {  // Warning at 90%
    console.log(`⚠️ WARNING: ${QUOTA_USED.toLocaleString()}/${QUOTA_LIMIT.toLocaleString()} quota used (${percentage.toFixed(1)}%)`);
  } else if (QUOTA_USED > 0 && QUOTA_USED % 1000 < 100) {  // Milestone updates
    console.log(`📊 Quota: ${QUOTA_USED.toLocaleString()}/${QUOTA_LIMIT.toLocaleString()} used (${percentage.toFixed(1)}%)`);
  }
}

function safeDivide(numerator, denominator, defaultValue = 0) {
  /**Safely divide, returning default if denominator is 0*/
  try {
    return denominator !== 0 ? numerator / denominator : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

function normalizeMetric(value, minVal = 0, maxVal = 1) {
  /**Normalize value to 0-1 range*/
  if (maxVal === minVal) {
    return 0;
  }
  const normalized = (value - minVal) / (maxVal - minVal);
  return Math.max(0, Math.min(1, normalized));
}

function parseDuration(durationStr) {
  /**
   * Parse ISO 8601 duration format (PT#H#M#S) to seconds.
   * Returns null if parsing fails.
   */
  try {
    if (!durationStr) {
      return null;
    }

    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return null;
    }

    const hours = parseInt(match[1] || 0, 10);
    const minutes = parseInt(match[2] || 0, 10);
    const seconds = parseInt(match[3] || 0, 10);

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds;
  } catch (error) {
    return null;
  }
}

// ------------------------------------------------
// 🗄️ DATABASE SETUP
// ------------------------------------------------

async function initializeDatabaseTables() {
  /**Create necessary database tables for storing analysis results*/
  const client = await getClient();
  try {
    console.log('📊 Initializing database tables...');

    // Add channel_id column to youtube_channels if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'youtube_channels' AND column_name = 'channel_id'
        ) THEN
          ALTER TABLE youtube_channels ADD COLUMN channel_id VARCHAR(255);
          CREATE INDEX IF NOT EXISTS idx_youtube_channels_channel_id 
          ON youtube_channels(channel_id);
        END IF;
      END $$;
    `);

    // Create table for ALL channel analysis results
    await client.query(`
      CREATE TABLE IF NOT EXISTS youtube_channel_analysis (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR(255) NOT NULL,
        channel_name VARCHAR(255) NOT NULL,
        csv_subs INTEGER NOT NULL,
        actual_subs INTEGER NOT NULL,
        total_channel_views BIGINT NOT NULL,
        total_channel_videos INTEGER NOT NULL,
        videos_fetched INTEGER NOT NULL DEFAULT 0,
        qualifying_videos_60d INTEGER NOT NULL DEFAULT 0,
        shorts_skipped INTEGER NOT NULL DEFAULT 0,
        short_vids_skipped INTEGER NOT NULL DEFAULT 0,
        old_videos_skipped INTEGER NOT NULL DEFAULT 0,
        avg_views_all NUMERIC(15, 2) NOT NULL DEFAULT 0,
        avg_likes_all NUMERIC(15, 2) NOT NULL DEFAULT 0,
        avg_comments_all NUMERIC(15, 2) NOT NULL DEFAULT 0,
        total_views_all BIGINT NOT NULL DEFAULT 0,
        avg_views_qualified NUMERIC(15, 2) NOT NULL DEFAULT 0,
        avg_likes_qualified NUMERIC(15, 2) NOT NULL DEFAULT 0,
        avg_comments_qualified NUMERIC(15, 2) NOT NULL DEFAULT 0,
        total_views_qualified BIGINT NOT NULL DEFAULT 0,
        search_term VARCHAR(255),
        query_name VARCHAR(100),
        status VARCHAR(255) NOT NULL,
        analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create table for QUALIFIED channels with scores
    await client.query(`
      CREATE TABLE IF NOT EXISTS youtube_qualified_channels (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR(255) NOT NULL,
        channel_name VARCHAR(255) NOT NULL,
        csv_subs INTEGER NOT NULL,
        actual_subs INTEGER NOT NULL,
        qualifying_videos_60d INTEGER NOT NULL,
        avg_views NUMERIC(15, 2) NOT NULL,
        avg_likes NUMERIC(15, 2) NOT NULL,
        avg_comments NUMERIC(15, 2) NOT NULL,
        total_views_qualified BIGINT NOT NULL,
        engagement_rate NUMERIC(10, 3) NOT NULL,
        comment_rate NUMERIC(10, 3) NOT NULL,
        consistent_reach NUMERIC(10, 2) NOT NULL,
        upload_per_month NUMERIC(10, 1) NOT NULL,
        view_velocity NUMERIC(10, 2) NOT NULL,
        like_rate NUMERIC(10, 3) NOT NULL,
        merch_score NUMERIC(10, 4) NOT NULL,
        search_term VARCHAR(255),
        query_name VARCHAR(100),
        analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_channel_analysis_channel_id 
      ON youtube_channel_analysis(channel_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_channel_analysis_analyzed_at 
      ON youtube_channel_analysis(analyzed_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_qualified_channels_merch_score 
      ON youtube_qualified_channels(merch_score DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_qualified_channels_analyzed_at 
      ON youtube_qualified_channels(analyzed_at DESC);
    `);

    console.log('✓ Database tables initialized');
  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ------------------------------------------------
// 1️⃣ Load channels from database
// ------------------------------------------------
async function getChannelsFromDatabase(maxChannels = null, skipAnalyzedToday = true) {
  /**
   * Load channels from database with filters:
   * - subscribers >= MIN_SUBS_FILTER
   * - channel_id IS NOT NULL/empty
   * - Excludes channels already analyzed today (if skipAnalyzedToday is true)
   * @param {number|null} maxChannels - Maximum number of channels to process (null for all)
   * @param {boolean} skipAnalyzedToday - Skip channels that were analyzed today (default: true)
   */
  try {
    console.log('📂 Loading channels from database...');

    let sql = `
      SELECT DISTINCT
        yc.channel_id,
        yc.channel_name,
        yc.subscribers,
        COALESCE(yc.search_term, '') as search_term,
        COALESCE(yc.query_name, '') as query_name
      FROM youtube_channels yc
      WHERE yc.subscribers >= $1
        AND yc.channel_id IS NOT NULL
        AND yc.channel_id != ''
    `;

    const params = [MIN_SUBS_FILTER];
    let paramIndex = 2;

    // Exclude channels already analyzed today
    if (skipAnalyzedToday) {
      sql += `
        AND yc.channel_id NOT IN (
          SELECT DISTINCT channel_id
          FROM youtube_channel_analysis
          WHERE DATE(analyzed_at) = CURRENT_DATE
        )
      `;
    }

    sql += ` ORDER BY yc.subscribers DESC`;

    const limit = maxChannels !== null ? maxChannels : MAX_CHANNELS_TO_PROCESS;
    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(limit);
    }

    const result = await query(sql, params);

    const skipCount = skipAnalyzedToday ? ' (skipping already analyzed today)' : '';
    console.log(`  ✓ Loaded ${result.rows.length} channels from database${skipCount}`);
    return result.rows;
  } catch (error) {
    console.error(`  ❌ Error loading channels: ${error.message}`);
    return [];
  }
}

// ------------------------------------------------
// 2️⃣ Get channel statistics (USING CHANNEL ID DIRECTLY!)
// ------------------------------------------------
async function getChannelStats(channelIdInput, originalName) {
  /**
   * Get channel stats using channel ID directly.
   *
   * For @handles: Use forHandle parameter (1 unit) instead of search (100 units!)
   * For UC... IDs: Direct query (1 unit)
   *
   * NEVER uses the expensive search API!
   */
  const maxRetries = API_KEYS.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      let res;

      // Check if it's a @handle
      if (channelIdInput.startsWith('@')) {
        // Use forHandle parameter - ONLY 1 UNIT instead of 100!
        const handle = channelIdInput.substring(1); // Remove @ symbol
        res = await youtube.channels.list({
          part: ["snippet", "statistics", "contentDetails"],
          forHandle: handle
        });
        trackQuota("channels_forHandle", 1); // Only 1 unit!
      } else {
        // It's already a proper UC... channel ID - direct query (1 unit)
        res = await youtube.channels.list({
          part: ["snippet", "statistics", "contentDetails"],
          id: [channelIdInput]
        });
        trackQuota("channels", 1);
      }

      const items = res.data.items || [];
      if (items.length === 0) {
        return null;
      }

      const item = items[0];
      const stats = item.statistics || {};
      const snippet = item.snippet || {};
      const content = item.contentDetails || {};

      return {
        channel_id: item.id,
        title: snippet.title || originalName,
        subs: parseInt(stats.subscriberCount || 0, 10),
        views_total: parseInt(stats.viewCount || 0, 10),
        video_count: parseInt(stats.videoCount || 0, 10),
        uploads_playlist: content.relatedPlaylists?.uploads || "",
        created_at: snippet.publishedAt || ""
      };
    } catch (error) {
      if (isQuotaExceededError(error)) {
        console.log(`    ⚠️ Quota exceeded on API key #${CURRENT_KEY_INDEX + 1}`);
        if (switchApiKey()) {
          console.log(`    🔄 Retrying with API key #${CURRENT_KEY_INDEX + 1}...`);
          continue; // Retry with new key
        } else {
          console.log(`    ❌ All API keys exhausted`);
          return null;
        }
      } else {
        console.log(`    ⚠️ HTTP error: ${error.message}`);
        return null;
      }
    }
  }

  return null;
}

// ------------------------------------------------
// 3️⃣ Get recent video IDs from uploads playlist
// ------------------------------------------------
async function getRecentVideoIds(playlistId, maxVideos = 50) {
  /**Get recent video IDs from channel's uploads playlist with pagination

  Automatically retries with next API key if quota exceeded.
  */
  if (!playlistId) {
    return [];
  }

  const videoIds = [];
  let nextPageToken = null;
  const maxRetries = API_KEYS.length;

  try {
    while (videoIds.length < maxVideos) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await youtube.playlistItems.list({
            part: ["contentDetails"],
            playlistId: playlistId,
            maxResults: Math.min(50, maxVideos - videoIds.length),
            pageToken: nextPageToken || undefined
          });
          trackQuota("playlistItems", 1);

          const items = res.data.items || [];
          videoIds.push(...items.map(item => item.contentDetails.videoId));

          nextPageToken = res.data.nextPageToken || null;
          break; // Success, exit retry loop
        } catch (error) {
          if (isQuotaExceededError(error)) {
            if (switchApiKey()) {
              continue; // Retry with new key
            } else {
              return videoIds; // Return what we got
            }
          } else {
            return videoIds;
          }
        }
      }

      if (!nextPageToken) {
        break;
      }
    }

    return videoIds.slice(0, maxVideos);
  } catch (error) {
    return videoIds;
  }
}

// ------------------------------------------------
// 4️⃣ Get video metrics (COLLECT ALL DATA - NO EARLY FILTERING)
// ------------------------------------------------
async function getVideoMetrics(videoIds) {
  /**
   * Get detailed metrics for videos with filters:
   * 1. Last 60 days only
   * 2. Exclude Shorts (<60 seconds)
   * 3. Exclude short-form content (<4 minutes)
   *
   * Returns data for ALL videos AND qualifying videos separately
   */
  if (!videoIds || videoIds.length === 0) {
    return null;
  }

  try {
    // Batch video requests (50 max per request)
    const allVideos = [];
    const maxRetries = API_KEYS.length;

    for (let i = 0; i < videoIds.length; i += 50) {
      const batchIds = videoIds.slice(i, i + 50);

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await youtube.videos.list({
            part: ["snippet", "statistics", "contentDetails"],
            id: batchIds
          });
          trackQuota("videos", 1);

          allVideos.push(...(res.data.items || []));
          break; // Success, exit retry loop
        } catch (error) {
          if (isQuotaExceededError(error)) {
            if (switchApiKey()) {
              continue; // Retry with new key
            } else {
              break; // No more keys, skip this batch
            }
          } else {
            break; // Other error, skip this batch
          }
        }
      }
    }

    if (allVideos.length === 0) {
      return null;
    }

    // Initialize counters for ALL videos
    let totalVideosFetched = allVideos.length;
    let totalLikesAll = 0;
    let totalCommentsAll = 0;
    let totalViewsAll = 0;

    // Initialize counters for QUALIFYING videos
    let qualifyingLikes = 0;
    let qualifyingComments = 0;
    let qualifyingViews = 0;
    const qualifyingTitles = [];
    const qualifyingDates = [];

    // Filter counters
    let shortsSkipped = 0;
    let oldVideosSkipped = 0;
    let tooShortSkipped = 0;
    let durationMissing = 0;

    // Calculate cutoff date (60 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_LOOKBACK);

    // Process each video
    for (const video of allVideos) {
      const stats = video.statistics || {};
      const snippet = video.snippet || {};
      const contentDetails = video.contentDetails || {};

      // Collect stats for ALL videos (no filters)
      totalLikesAll += parseInt(stats.likeCount || 0, 10);
      totalCommentsAll += parseInt(stats.commentCount || 0, 10);
      totalViewsAll += parseInt(stats.viewCount || 0, 10);

      // Now apply filters for QUALIFYING videos
      let passedAllFilters = true;

      // FILTER 1: Date (Last 60 Days)
      try {
        const publishedDate = new Date(snippet.publishedAt);
        if (publishedDate < cutoffDate) {
          oldVideosSkipped += 1;
          passedAllFilters = false;
        }
      } catch (error) {
        oldVideosSkipped += 1;
        passedAllFilters = false;
      }

      if (!passedAllFilters) {
        continue;
      }

      // FILTER 2: Get Duration
      const durationStr = contentDetails.duration;
      if (!durationStr) {
        durationMissing += 1;
        continue;
      }

      const durationSeconds = parseDuration(durationStr);
      if (durationSeconds === null) {
        durationMissing += 1;
        continue;
      }

      // FILTER 3: Exclude Shorts (<60 sec)
      if (durationSeconds < MAX_SHORT_DURATION) {
        shortsSkipped += 1;
        continue;
      }

      // FILTER 4: Exclude Short Videos (<4 min)
      if (durationSeconds < MIN_VIDEO_DURATION) {
        tooShortSkipped += 1;
        continue;
      }

      // Video Passed All Filters - Count as QUALIFYING
      qualifyingLikes += parseInt(stats.likeCount || 0, 10);
      qualifyingComments += parseInt(stats.commentCount || 0, 10);
      qualifyingViews += parseInt(stats.viewCount || 0, 10);
      qualifyingTitles.push(snippet.title || "");
      qualifyingDates.push(new Date(snippet.publishedAt));
    }

    const qualifyingCount = qualifyingDates.length;

    return {
      // ALL videos data (no filters)
      total_videos_fetched: totalVideosFetched,
      total_likes_all: totalLikesAll,
      total_comments_all: totalCommentsAll,
      total_views_all: totalViewsAll,
      avg_likes_all: safeDivide(totalLikesAll, totalVideosFetched),
      avg_comments_all: safeDivide(totalCommentsAll, totalVideosFetched),
      avg_views_all: safeDivide(totalViewsAll, totalVideosFetched),

      // QUALIFYING videos data (with filters)
      qualifying_video_count: qualifyingCount,
      qualifying_likes: qualifyingLikes,
      qualifying_comments: qualifyingComments,
      qualifying_views: qualifyingViews,
      avg_likes: safeDivide(qualifyingLikes, qualifyingCount),
      avg_comments: safeDivide(qualifyingComments, qualifyingCount),
      avg_views: safeDivide(qualifyingViews, qualifyingCount),
      total_views: qualifyingViews,
      titles: qualifyingTitles,
      dates: qualifyingDates,

      // Filter statistics
      shorts_skipped: shortsSkipped,
      old_videos_skipped: oldVideosSkipped,
      too_short_skipped: tooShortSkipped,
      duration_missing: durationMissing
    };
  } catch (error) {
    console.error(`Error in getVideoMetrics: ${error.message}`);
    return null;
  }
}

// ------------------------------------------------
// 5️⃣ Calculate normalized merchandise score (ONLY FOR QUALIFYING CHANNELS)
// ------------------------------------------------
function calculateMerchandiseScore(channelData, videoData) {
  /**Calculate merchandise partnership score with custom weights*/

  // Calculate Raw Metrics
  const engagementRaw = safeDivide(
    videoData.avg_likes + videoData.avg_comments,
    videoData.avg_views
  );

  const commentRateRaw = safeDivide(
    videoData.avg_comments,
    videoData.avg_views
  );

  const consistentReachRaw = safeDivide(
    videoData.avg_views,
    channelData.subs
  );

  let uploadConsistencyRaw;
  if (videoData.dates.length > 1) {
    const dates = videoData.dates.map(d => new Date(d));
    const maxDate = new Date(Math.max(...dates));
    const minDate = new Date(Math.min(...dates));
    const spanDays = Math.max(7, (maxDate - minDate) / (1000 * 60 * 60 * 24));
    uploadConsistencyRaw = videoData.dates.length / spanDays * 30;
  } else {
    uploadConsistencyRaw = videoData.dates.length / DAYS_LOOKBACK * 30;
  }

  const viewVelocityRaw = safeDivide(
    videoData.total_views,
    channelData.views_total
  );

  const likeRateRaw = safeDivide(
    videoData.avg_likes,
    videoData.avg_views
  );

  // Normalize to 0-1 Scale
  const engagementNorm = normalizeMetric(engagementRaw, 0, 0.10);
  const commentRateNorm = normalizeMetric(commentRateRaw, 0, 0.02);
  const consistentReachNorm = normalizeMetric(consistentReachRaw, 0, 0.50);
  const uploadConsistencyNorm = normalizeMetric(uploadConsistencyRaw, 0, 15);
  const viewVelocityNorm = normalizeMetric(viewVelocityRaw, 0, 0.10);
  const likeRateNorm = normalizeMetric(likeRateRaw, 0, 0.06);

  // Apply Custom Weights
  const merchandiseScore = (
    0.30 * engagementNorm +
    0.20 * consistentReachNorm +
    0.20 * commentRateNorm +
    0.10 * uploadConsistencyNorm +
    0.10 * viewVelocityNorm +
    0.10 * likeRateNorm
  );

  return {
    score: merchandiseScore,
    engagement_norm: engagementNorm,
    comment_rate_norm: commentRateNorm,
    consistent_reach_norm: consistentReachNorm,
    upload_consistency_norm: uploadConsistencyNorm,
    view_velocity_norm: viewVelocityNorm,
    like_rate_norm: likeRateNorm,
    engagement_raw: engagementRaw,
    comment_rate_raw: commentRateRaw,
    like_rate_raw: likeRateRaw,
    view_velocity_raw: viewVelocityRaw,
    upload_consistency_raw: uploadConsistencyRaw
  };
}

function categorizeScore(score) {
  if (score >= 0.70) {
    return 'excellent';
  }
  if (score >= 0.50) {
    return 'good';
  }
  if (score >= 0.30) {
    return 'moderate';
  }
  return 'poor';
}

// ------------------------------------------------
// 6️⃣ Process single channel (COLLECT ALL DATA)
// ------------------------------------------------
async function processChannel(csvChannel) {
  /**Process a single channel from database - collect ALL data regardless of qualification*/

  const channelId = csvChannel.channel_id;
  const channelName = csvChannel.channel_name;
  const csvSubs = csvChannel.subscribers;

  // Step 1: Get channel statistics using ID
  const channelData = await getChannelStats(channelId, channelName);
  if (!channelData) {
    console.log(`  ❌ Could not retrieve channel data`);
    return null;
  }

  // Step 2: Get recent videos
  const videoIds = await getRecentVideoIds(channelData.uploads_playlist, VIDEOS_PER_CHANNEL);
  if (!videoIds || videoIds.length === 0) {
    console.log(`  ❌ No videos found`);
    return {
      analysis: {
        Channel_Name: channelName,
        Channel_ID: channelId,
        CSV_Subs: csvSubs,
        Actual_Subs: channelData.subs,
        Total_Channel_Views: channelData.views_total,
        Total_Channel_Videos: channelData.video_count,
        Videos_Fetched: 0,
        Qualifying_Videos_60d: 0,
        Shorts_Skipped: 0,
        Short_Vids_Skipped: 0,
        Old_Videos_Skipped: 0,
        Avg_Views_All: 0,
        Avg_Likes_All: 0,
        Avg_Comments_All: 0,
        Total_Views_All: 0,
        Avg_Views_Qualified: 0,
        Avg_Likes_Qualified: 0,
        Avg_Comments_Qualified: 0,
        Total_Views_Qualified: 0,
        Search_Term: csvChannel.search_term || '',
        Query_Name: csvChannel.query_name || '',
        Status: "No videos found"
      },
      qualified: null
    };
  }

  // Step 3: Get video metrics (ALL data + qualifying data)
  const videoData = await getVideoMetrics(videoIds);
  if (!videoData) {
    console.log(`  ❌ Could not analyze videos`);
    return {
      analysis: {
        Channel_Name: channelName,
        Channel_ID: channelId,
        CSV_Subs: csvSubs,
        Actual_Subs: channelData.subs,
        Total_Channel_Views: channelData.views_total,
        Total_Channel_Videos: channelData.video_count,
        Videos_Fetched: 0,
        Qualifying_Videos_60d: 0,
        Shorts_Skipped: 0,
        Short_Vids_Skipped: 0,
        Old_Videos_Skipped: 0,
        Avg_Views_All: 0,
        Avg_Likes_All: 0,
        Avg_Comments_All: 0,
        Total_Views_All: 0,
        Avg_Views_Qualified: 0,
        Avg_Likes_Qualified: 0,
        Avg_Comments_Qualified: 0,
        Total_Views_Qualified: 0,
        Search_Term: csvChannel.search_term || '',
        Query_Name: csvChannel.query_name || '',
        Status: "Video analysis failed"
      },
      qualified: null
    };
  }

  // Build result with ALL data (no filtering at this stage)
  const qualifyingCount = videoData.qualifying_video_count;

  let status = "Analyzed";
  if (qualifyingCount < MIN_VIDEOS_IN_TIMEFRAME) {
    status = `Not enough qualifying videos (${qualifyingCount} < ${MIN_VIDEOS_IN_TIMEFRAME})`;
  }

  const analysisResult = {
    // Basic info
    Channel_Name: channelName,
    Channel_ID: channelId,
    CSV_Subs: csvSubs,
    Actual_Subs: channelData.subs,
    Total_Channel_Views: channelData.views_total,
    Total_Channel_Videos: channelData.video_count,

    // Video fetch stats
    Videos_Fetched: videoData.total_videos_fetched,
    Qualifying_Videos_60d: qualifyingCount,
    Shorts_Skipped: videoData.shorts_skipped || 0,
    Short_Vids_Skipped: videoData.too_short_skipped || 0,
    Old_Videos_Skipped: videoData.old_videos_skipped || 0,

    // ALL videos metrics (no filters)
    Avg_Views_All: Math.round(videoData.avg_views_all),
    Avg_Likes_All: Math.round(videoData.avg_likes_all),
    Avg_Comments_All: Math.round(videoData.avg_comments_all),
    Total_Views_All: videoData.total_views_all,

    // QUALIFYING videos metrics (with filters)
    Avg_Views_Qualified: qualifyingCount > 0 ? Math.round(videoData.avg_views) : 0,
    Avg_Likes_Qualified: qualifyingCount > 0 ? Math.round(videoData.avg_likes) : 0,
    Avg_Comments_Qualified: qualifyingCount > 0 ? Math.round(videoData.avg_comments) : 0,
    Total_Views_Qualified: videoData.total_views,

    // Metadata
    Search_Term: csvChannel.search_term || '',
    Query_Name: csvChannel.query_name || '',
    Status: status
  };

  let qualifyingResult = null;
  if (qualifyingCount >= MIN_VIDEOS_IN_TIMEFRAME &&
      videoData.avg_views > 0 &&
      Array.isArray(videoData.dates) &&
      videoData.dates.length > 0) {
    try {
      const scoreData = calculateMerchandiseScore(channelData, videoData);
      qualifyingResult = {
        Channel_Name: analysisResult.Channel_Name,
        Channel_ID: analysisResult.Channel_ID,
        CSV_Subs: analysisResult.CSV_Subs,
        Actual_Subs: analysisResult.Actual_Subs,
        Qualifying_Videos_60d: analysisResult.Qualifying_Videos_60d,
        Avg_Views: analysisResult.Avg_Views_Qualified,
        Avg_Likes: analysisResult.Avg_Likes_Qualified,
        Avg_Comments: analysisResult.Avg_Comments_Qualified,
        Total_Views_Qualified: analysisResult.Total_Views_Qualified,
        Engagement_Rate: Number((scoreData.engagement_raw * 100).toFixed(3)),
        Comment_Rate: Number((scoreData.comment_rate_raw * 100).toFixed(3)),
        Consistent_Reach: Number(scoreData.consistent_reach_norm.toFixed(2)),
        Upload_Per_Month: Number(scoreData.upload_consistency_raw.toFixed(1)),
        View_Velocity: Number(scoreData.view_velocity_norm.toFixed(2)),
        Like_Rate: Number((scoreData.like_rate_raw * 100).toFixed(3)),
        Merch_Score: Number(scoreData.score.toFixed(4)),
        Search_Term: analysisResult.Search_Term,
        Query_Name: analysisResult.Query_Name
      };
    } catch (error) {
      console.log(`  ⚠️ Error scoring ${channelName}: ${error.message}`);
    }
  }

  if (ENABLE_VERBOSE_LOGS) {
    const nameDisplay = channelName.substring(0, 40).padEnd(40);
    console.log(`  ✅ ${nameDisplay} | Fetched: ${videoData.total_videos_fetched.toString().padStart(2)} | Qualified: ${qualifyingCount.toString().padStart(2)} | Status: ${status.substring(0, 30)}`);
  }

  return {
    analysis: analysisResult,
    qualified: qualifyingResult
  };
}

// ------------------------------------------------
// 7️⃣ Save results to database
// ------------------------------------------------
async function saveResultsToDatabase(allResults, qualifyingResults) {
  /**Save analysis results to database tables*/
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Save ALL channels analysis
    for (const result of allResults) {
      await client.query(`
        INSERT INTO youtube_channel_analysis (
          channel_id, channel_name, csv_subs, actual_subs,
          total_channel_views, total_channel_videos,
          videos_fetched, qualifying_videos_60d,
          shorts_skipped, short_vids_skipped, old_videos_skipped,
          avg_views_all, avg_likes_all, avg_comments_all, total_views_all,
          avg_views_qualified, avg_likes_qualified, avg_comments_qualified, total_views_qualified,
          search_term, query_name, status, analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW())
      `, [
        result.Channel_ID,
        result.Channel_Name,
        result.CSV_Subs,
        result.Actual_Subs,
        result.Total_Channel_Views,
        result.Total_Channel_Videos,
        result.Videos_Fetched,
        result.Qualifying_Videos_60d,
        result.Shorts_Skipped,
        result.Short_Vids_Skipped,
        result.Old_Videos_Skipped,
        result.Avg_Views_All,
        result.Avg_Likes_All,
        result.Avg_Comments_All,
        result.Total_Views_All,
        result.Avg_Views_Qualified,
        result.Avg_Likes_Qualified,
        result.Avg_Comments_Qualified,
        result.Total_Views_Qualified,
        result.Search_Term,
        result.Query_Name,
        result.Status
      ]);
    }

    // Save QUALIFIED channels with scores
    for (const result of qualifyingResults) {
      await client.query(`
        INSERT INTO youtube_qualified_channels (
          channel_id, channel_name, csv_subs, actual_subs,
          qualifying_videos_60d, avg_views, avg_likes, avg_comments,
          total_views_qualified, engagement_rate, comment_rate,
          consistent_reach, upload_per_month, view_velocity, like_rate,
          merch_score, search_term, query_name, analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      `, [
        result.Channel_ID,
        result.Channel_Name,
        result.CSV_Subs,
        result.Actual_Subs,
        result.Qualifying_Videos_60d,
        result.Avg_Views,
        result.Avg_Likes,
        result.Avg_Comments,
        result.Total_Views_Qualified,
        result.Engagement_Rate,
        result.Comment_Rate,
        result.Consistent_Reach,
        result.Upload_Per_Month,
        result.View_Velocity,
        result.Like_Rate,
        result.Merch_Score,
        result.Search_Term,
        result.Query_Name
      ]);
    }

    await client.query('COMMIT');
    console.log(`\n💾 Saved ${allResults.length} channel analyses and ${qualifyingResults.length} qualified channels to database`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`\n⚠️ Error saving to database: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// ------------------------------------------------
// 8️⃣ Main execution
// ------------------------------------------------
async function main(maxChannels = null) {
  /**
   * Run the scraper for all channels in database
   * @param {number|null} maxChannels - Maximum number of channels to process (null for all)
   */
  QUOTA_USED = 0;

  console.log("\n" + "=".repeat(70));
  console.log("🚀 YOUTUBE MERCHANDISE PARTNERSHIP SCRAPER (DATABASE OUTPUT)");
  console.log("=".repeat(70));
  console.log(`API Keys Available: ${API_KEYS.length}`);
  console.log(`Currently Using: Key #${CURRENT_KEY_INDEX + 1} (${API_KEY.substring(0, 20)}...${API_KEY.substring(API_KEY.length - 4)})`);
  console.log(`Minimum Subscribers Filter: ${MIN_SUBS_FILTER.toLocaleString()}`);
  console.log(`Videos to Fetch per Channel: ${VIDEOS_PER_CHANNEL}`);
  console.log(`Time Window: Last ${DAYS_LOOKBACK} days`);
  console.log(`Duration Filter: ≥${Math.floor(MIN_VIDEO_DURATION / 60)} minutes (${MIN_VIDEO_DURATION}s)`);
  console.log(`Shorts Filter: <${MAX_SHORT_DURATION}s excluded`);
  console.log(`Min Videos for Qualification: ${MIN_VIDEOS_IN_TIMEFRAME} qualifying videos`);
  console.log(`Daily Quota Limit per Key: ${QUOTA_LIMIT.toLocaleString()} units`);
  console.log(`Total Available Quota: ${(QUOTA_LIMIT * API_KEYS.length).toLocaleString()} units`);
  const limit = maxChannels !== null ? maxChannels : MAX_CHANNELS_TO_PROCESS;
  if (limit) {
    console.log(`⚠️ TESTING MODE: Limited to ${limit} channels`);
  }
  console.log("=".repeat(70));

  // Initialize database tables
  await initializeDatabaseTables();

  // STEP 1: Load channels from database (skip already analyzed today)
  const channels = await getChannelsFromDatabase(maxChannels, true);

  if (!channels || channels.length === 0) {
    console.log("\n❌ No channels found in database matching criteria");
    return;
  }

  console.log(`\n${"=".repeat(70)}`);
  console.log(`📊 ANALYZING ${channels.length} CHANNELS`);
  console.log(`${"=".repeat(70)}\n`);

  // STEP 2: Process channels in batches and save incrementally
  const analysisBatch = [];
  const qualifiedBatch = [];
  let totalBatchesSaved = 0;

  const stats = {
    analyzed: 0,
    qualified: 0,
    notQualified: 0,
    buckets: {
      excellent: 0,
      good: 0,
      moderate: 0,
      poor: 0
    }
  };

  const topQualified = [];
  const updateTopQualified = (record) => {
    topQualified.push(record);
    topQualified.sort((a, b) => b.Merch_Score - a.Merch_Score);
    if (topQualified.length > 20) {
      topQualified.pop();
    }
  };

  async function flushBatch(label) {
    if (!analysisBatch.length && !qualifiedBatch.length) {
      return;
    }
    const analysisToSave = analysisBatch.splice(0, analysisBatch.length);
    const qualifiedToSave = qualifiedBatch.splice(0, qualifiedBatch.length);
    console.log(`\n💾 Saving batch (${label}) -> ${analysisToSave.length} analyses, ${qualifiedToSave.length} qualified`);
    await saveResultsToDatabase(analysisToSave, qualifiedToSave);
    totalBatchesSaved += 1;
  }

  for (let idx = 0; idx < channels.length; idx++) {
    const channel = channels[idx];
    const channelName = channel.channel_name;
    const channelId = channel.channel_id;
    const csvSubs = channel.subscribers;

    if (ENABLE_VERBOSE_LOGS) {
      console.log(`[${idx + 1}/${channels.length}] ${channelName} (ID: ${channelId.substring(0, 20)}..., ${csvSubs.toLocaleString()} subs)`);
    } else if ((idx + 1) % LOG_PROGRESS_EVERY === 1) {
      console.log(`📡 Processing channels ${idx + 1}-${Math.min(idx + LOG_PROGRESS_EVERY, channels.length)} / ${channels.length}`);
    }

    try {
      const result = await processChannel(channel);

      if (result && result.analysis) {
        analysisBatch.push(result.analysis);
        stats.analyzed += 1;

        if (result.qualified) {
          qualifiedBatch.push(result.qualified);
          stats.qualified += 1;
          const bucket = categorizeScore(result.qualified.Merch_Score);
          stats.buckets[bucket] += 1;
          updateTopQualified(result.qualified);
        } else {
          stats.notQualified += 1;
        }
      }

      if (!ENABLE_VERBOSE_LOGS &&
          ((idx + 1) % LOG_PROGRESS_EVERY === 0 || idx === channels.length - 1)) {
        console.log(`🔹 Progress: ${idx + 1}/${channels.length} processed | analyzed: ${stats.analyzed} | qualified: ${stats.qualified} | batches saved: ${totalBatchesSaved}`);
      }

      if (analysisBatch.length >= SAVE_BATCH_SIZE || qualifiedBatch.length >= SAVE_BATCH_SIZE) {
        await flushBatch(`#${idx + 1}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      continue;
    }
  }

  await flushBatch('final');

  if (stats.analyzed === 0) {
    console.log("\n❌ No channels successfully analyzed");
    console.log(`\n📊 Final Quota Usage: ${QUOTA_USED.toLocaleString()}/${QUOTA_LIMIT.toLocaleString()} units (${((QUOTA_USED / QUOTA_LIMIT) * 100).toFixed(1)}%)`);
    return;
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 ANALYSIS COMPLETE");
  console.log("=".repeat(70));
  console.log(`Total channels analyzed: ${stats.analyzed}`);
  console.log(`Channels with qualifying videos (≥${MIN_VIDEOS_IN_TIMEFRAME}): ${stats.qualified}`);
  console.log(`Channels without enough qualifying videos: ${stats.notQualified}`);
  console.log(`Total batches saved: ${totalBatchesSaved} (batch size: ${SAVE_BATCH_SIZE})`);

  if (stats.qualified > 0 && topQualified.length > 0) {
    console.log("\n" + "=".repeat(70));
    console.log("🏆 TOP MERCHANDISE PARTNERSHIP CANDIDATES");
    console.log("=".repeat(70));

    console.table(topQualified.map(r => ({
      Channel: r.Channel_Name.substring(0, 30),
      Subs: r.CSV_Subs.toLocaleString(),
      Videos: r.Qualifying_Videos_60d,
      AvgViews: r.Avg_Views.toLocaleString(),
      Engagement: `${r.Engagement_Rate.toFixed(3)}%`,
      Score: r.Merch_Score.toFixed(4)
    })));

    console.log("\n" + "=".repeat(70));
    console.log("📊 SCORE DISTRIBUTION (QUALIFIED CHANNELS)");
    console.log("=".repeat(70));
    console.log(`🟢 Excellent (0.70+):    ${stats.buckets.excellent.toString().padStart(3)} channels`);
    console.log(`🟡 Good (0.50-0.69):     ${stats.buckets.good.toString().padStart(3)} channels`);
    console.log(`🟠 Moderate (0.30-0.49): ${stats.buckets.moderate.toString().padStart(3)} channels`);
    console.log(`🔴 Poor (<0.30):         ${stats.buckets.poor.toString().padStart(3)} channels`);
  } else {
    console.log("\n⚠️  No qualifying channels met the minimum requirements in this run.");
  }

  console.log(`\n⏱️  Time window: Last ${DAYS_LOOKBACK} days (videos ≥${Math.floor(MIN_VIDEO_DURATION / 60)}min only)`);
  console.log(`📊 Final Quota Usage:`);
  console.log(`   API Key #${CURRENT_KEY_INDEX + 1}: ${QUOTA_USED.toLocaleString()}/${QUOTA_LIMIT.toLocaleString()} units (${((QUOTA_USED / QUOTA_LIMIT) * 100).toFixed(1)}%)`);
  if (CURRENT_KEY_INDEX > 0) {
    console.log(`   🔄 Switched through ${CURRENT_KEY_INDEX + 1} API key(s) during execution`);
  }

  // Calculate efficiency
  const avgQuota = stats.analyzed > 0 ? QUOTA_USED / stats.analyzed : 0;
  const estimatedDailyCapacity = avgQuota > 0 ? Math.floor(QUOTA_LIMIT / avgQuota) : 0;
  const totalCapacity = avgQuota > 0 ? Math.floor((QUOTA_LIMIT * API_KEYS.length) / avgQuota) : 0;
  console.log(`⚡ Average quota per channel: ${avgQuota.toFixed(1)} units`);
  console.log(`🚀 Estimated capacity per API key: ~${estimatedDailyCapacity.toLocaleString()} channels`);
  console.log(`🎯 Total estimated capacity (${API_KEYS.length} keys): ~${totalCapacity.toLocaleString()} channels`);
  console.log("=".repeat(70));
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { main, processChannel, getChannelsFromDatabase };

