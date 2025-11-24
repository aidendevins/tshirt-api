# ============================================================
# 🚀 YouTube Merchandise Partnership Scraper (DUAL CSV OUTPUT)
# ============================================================
#
# FEATURES:
# ✅ Reads channels from CSV file with channel IDs
# ✅ Filters OUT channels with <10,000 subscribers
# ✅ Filters OUT channels with NULL/empty channel_id
# ✅ Uses channel IDs directly - NEVER uses expensive search API!
# ✅ @handles: 1 unit (forHandle) | UC... IDs: 1 unit (direct)
# ✅ Total cost: ~3 units per channel (can analyze 3,300+ channels/day!)
# ✅ Collects data for ALL channels (no early filtering)
# ✅ Outputs TWO CSV files:
#    1. ALL_CHANNELS.csv - Raw data for every channel analyzed
#    2. QUALIFIED_CHANNELS.csv - Only channels with >=7 qualifying videos + scores
# ✅ Filters videos by: Date (60 days), Shorts (<60s), Short videos (<4min)
# ✅ Multiple API key support with automatic failover
# ✅ API quota tracking
#
# ============================================================

# Uncomment this line if running in Google Colab:
# !pip install google-api-python-client pandas numpy --quiet

import os
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
import re

# -------------------- CONFIG --------------------
# MULTIPLE API KEYS - Will automatically switch when quota exceeded!
API_KEYS = [
    # hardcode keys here
]

# Current API key index
CURRENT_KEY_INDEX = 0
API_KEY = API_KEYS[CURRENT_KEY_INDEX]
os.environ['YOUTUBE_API_KEY'] = API_KEY

# CSV Input configuration
CSV_INPUT_FILE = 'youtube_channels_with_ids.csv'  # Your input CSV with channel IDs
# For testing with channels that will qualify, use:
# CSV_INPUT_FILE = 'youtube_test_longform_channels.csv'

# Filter configuration
MIN_SUBS_FILTER = 10000           # Filter out channels below this

# Analysis configuration
VIDEOS_PER_CHANNEL = 50           # Fetch up to 50 videos (still only 1 unit cost!)
MIN_VIDEOS_IN_TIMEFRAME = 7       # Require at least 7 qualifying videos FOR SCORING
DAYS_LOOKBACK = 60                # Look back 60 days (2 months)

# Duration filters
MIN_VIDEO_DURATION = 240          # Minimum 240 seconds (4 minutes)
MAX_SHORT_DURATION = 60           # Maximum 60 seconds for Shorts detection

# Optional: Limit number of channels to process (set to None for all)
MAX_CHANNELS_TO_PROCESS = None    # Set to a number like 100 for testing, None for all
# ------------------------------------------------

youtube = build("youtube", "v3", developerKey=API_KEY)

# Global quota tracker
QUOTA_USED = 0
QUOTA_LIMIT = 10000

# ------------------------------------------------
# 🔑 API KEY MANAGEMENT
# ------------------------------------------------

def switch_api_key():
    """Switch to the next available API key when quota is exceeded"""
    global CURRENT_KEY_INDEX, API_KEY, youtube, QUOTA_USED

    CURRENT_KEY_INDEX += 1

    if CURRENT_KEY_INDEX >= len(API_KEYS):
        print("\n" + "="*70)
        print("❌ ALL API KEYS EXHAUSTED!")
        print("="*70)
        print(f"Used all {len(API_KEYS)} API keys.")
        print("Please wait until tomorrow for quota reset or add more API keys.")
        print("="*70)
        return False

    # Switch to new key
    API_KEY = API_KEYS[CURRENT_KEY_INDEX]
    os.environ['YOUTUBE_API_KEY'] = API_KEY

    # Rebuild YouTube client with new key
    youtube = build("youtube", "v3", developerKey=API_KEY)

    # Reset quota counter for new key
    QUOTA_USED = 0

    print("\n" + "="*70)
    print(f"🔄 SWITCHING TO API KEY #{CURRENT_KEY_INDEX + 1}")
    print("="*70)
    print(f"Key: {API_KEY[:20]}...{API_KEY[-4:]}")
    print(f"Quota reset to: 0/{QUOTA_LIMIT:,}")
    print("="*70 + "\n")

    return True

def is_quota_exceeded_error(error):
    """Check if error is due to quota exceeded"""
    if isinstance(error, HttpError):
        if error.resp.status == 403:
            error_content = str(error.content)
            if 'quotaExceeded' in error_content or 'quota' in error_content.lower():
                return True
    return False

# ------------------------------------------------
# 🛡️ HELPER FUNCTIONS
# ------------------------------------------------

def track_quota(operation, cost):
    """Track API quota usage and warn if approaching limit"""
    global QUOTA_USED
    QUOTA_USED += cost

    percentage = (QUOTA_USED / QUOTA_LIMIT) * 100

    if QUOTA_USED > 9000:  # Warning at 90%
        print(f"⚠️ WARNING: {QUOTA_USED:,}/{QUOTA_LIMIT:,} quota used ({percentage:.1f}%)")
    elif QUOTA_USED > 0 and QUOTA_USED % 1000 < 100:  # Milestone updates
        print(f"📊 Quota: {QUOTA_USED:,}/{QUOTA_LIMIT:,} used ({percentage:.1f}%)")

def safe_divide(numerator, denominator, default=0):
    """Safely divide, returning default if denominator is 0"""
    try:
        return numerator / denominator if denominator != 0 else default
    except (ZeroDivisionError, TypeError):
        return default

def normalize_metric(value, min_val=0, max_val=1):
    """Normalize value to 0-1 range"""
    if max_val == min_val:
        return 0
    normalized = (value - min_val) / (max_val - min_val)
    return max(0, min(1, normalized))

def parse_duration(duration_str):
    """
    Parse ISO 8601 duration format (PT#H#M#S) to seconds.
    Returns None if parsing fails.
    """
    try:
        if not duration_str:
            return None

        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', duration_str)
        if not match:
            return None

        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)

        total_seconds = hours * 3600 + minutes * 60 + seconds
        return total_seconds

    except (AttributeError, ValueError, TypeError) as e:
        return None

# ------------------------------------------------
# 1️⃣ Load channels from CSV
# ------------------------------------------------
def get_channels_from_csv():
    """
    Load channels from CSV file with filters:
    - subscribers >= MIN_SUBS_FILTER
    - channel_id IS NOT NULL/empty
    """
    try:
        print(f"📂 Loading CSV file: {CSV_INPUT_FILE}")

        df = pd.read_csv(CSV_INPUT_FILE)

        # Validate CSV format
        required_columns = ['channel_id', 'channel_name', 'subscribers']
        for col in required_columns:
            if col not in df.columns:
                print(f"  ❌ CSV must have '{col}' column")
                return []

        original_count = len(df)
        print(f"  ✓ Loaded {original_count} channels from CSV")

        # Filter: subscribers >= MIN_SUBS_FILTER
        df_filtered = df[df['subscribers'] >= MIN_SUBS_FILTER].copy()
        removed_subs = original_count - len(df_filtered)

        # Filter: channel_id not null/empty
        df_filtered = df_filtered[df_filtered['channel_id'].notna()].copy()
        df_filtered = df_filtered[df_filtered['channel_id'].str.strip() != ''].copy()
        removed_null = len(df) - removed_subs - len(df_filtered)

        print(f"  ✓ Filtered: {len(df_filtered)} channels (removed {removed_subs} < {MIN_SUBS_FILTER:,} subs, {removed_null} NULL IDs)")

        # Apply limit if set
        if MAX_CHANNELS_TO_PROCESS:
            df_filtered = df_filtered.head(MAX_CHANNELS_TO_PROCESS)
            print(f"  ⚠️ Limited to {MAX_CHANNELS_TO_PROCESS} channels for testing")

        # Sort by subscribers descending
        df_filtered = df_filtered.sort_values('subscribers', ascending=False)

        return df_filtered.to_dict('records')

    except FileNotFoundError:
        print(f"  ❌ File not found: {CSV_INPUT_FILE}")
        print(f"  Please ensure the CSV file is in the same directory as this script")
        return []
    except Exception as e:
        print(f"  ❌ Error loading CSV: {e}")
        return []

# ------------------------------------------------
# 2️⃣ Get channel statistics (USING CHANNEL ID DIRECTLY!)
# ------------------------------------------------
def get_channel_stats(channel_id_input, original_name):
    """
    Get channel stats using channel ID directly.

    For @handles: Use forHandle parameter (1 unit) instead of search (100 units!)
    For UC... IDs: Direct query (1 unit)

    NEVER uses the expensive search API!
    """
    max_retries = len(API_KEYS)

    for attempt in range(max_retries):
        try:
            # Check if it's a @handle
            if channel_id_input.startswith('@'):
                # Use forHandle parameter - ONLY 1 UNIT instead of 100!
                handle = channel_id_input[1:]  # Remove @ symbol
                req = youtube.channels().list(
                    part="snippet,statistics,contentDetails",
                    forHandle=handle
                )
                res = req.execute()
                track_quota("channels_forHandle", 1)  # Only 1 unit!

            else:
                # It's already a proper UC... channel ID - direct query (1 unit)
                req = youtube.channels().list(
                    part="snippet,statistics,contentDetails",
                    id=channel_id_input
                )
                res = req.execute()
                track_quota("channels", 1)

            items = res.get("items", [])
            if not items:
                return None

            item = items[0]
            stats = item.get("statistics", {})
            snippet = item.get("snippet", {})
            content = item.get("contentDetails", {})

            return {
                "channel_id": item["id"],
                "title": snippet.get("title", original_name),
                "subs": int(stats.get("subscriberCount", 0)),
                "views_total": int(stats.get("viewCount", 0)),
                "video_count": int(stats.get("videoCount", 0)),
                "uploads_playlist": content.get("relatedPlaylists", {}).get("uploads", ""),
                "created_at": snippet.get("publishedAt", "")
            }

        except HttpError as e:
            if is_quota_exceeded_error(e):
                print(f"    ⚠️ Quota exceeded on API key #{CURRENT_KEY_INDEX + 1}")
                if switch_api_key():
                    print(f"    🔄 Retrying with API key #{CURRENT_KEY_INDEX + 1}...")
                    continue  # Retry with new key
                else:
                    print(f"    ❌ All API keys exhausted")
                    return None
            else:
                print(f"    ⚠️ HTTP error: {e}")
                return None
        except Exception as e:
            print(f"    ⚠️ Error: {e}")
            return None

    return None

# ------------------------------------------------
# 3️⃣ Get recent video IDs from uploads playlist
# ------------------------------------------------
def get_recent_video_ids(playlist_id, max_videos=50):
    """Get recent video IDs from channel's uploads playlist with pagination

    Automatically retries with next API key if quota exceeded.
    """
    if not playlist_id:
        return []

    video_ids = []
    next_page_token = None
    max_retries = len(API_KEYS)

    try:
        while len(video_ids) < max_videos:
            for attempt in range(max_retries):
                try:
                    req = youtube.playlistItems().list(
                        part="contentDetails",
                        playlistId=playlist_id,
                        maxResults=min(50, max_videos - len(video_ids)),
                        pageToken=next_page_token
                    )
                    res = req.execute()
                    track_quota("playlistItems", 1)

                    video_ids.extend([item["contentDetails"]["videoId"]
                                    for item in res.get("items", [])])

                    next_page_token = res.get("nextPageToken")
                    break  # Success, exit retry loop

                except HttpError as e:
                    if is_quota_exceeded_error(e):
                        if switch_api_key():
                            continue  # Retry with new key
                        else:
                            return video_ids  # Return what we got
                    else:
                        return video_ids
                except Exception as e:
                    return video_ids

            if not next_page_token:
                break

        return video_ids[:max_videos]

    except Exception as e:
        return video_ids

# ------------------------------------------------
# 4️⃣ Get video metrics (COLLECT ALL DATA - NO EARLY FILTERING)
# ------------------------------------------------
def get_video_metrics(video_ids):
    """
    Get detailed metrics for videos with filters:
    1. Last 60 days only
    2. Exclude Shorts (<60 seconds)
    3. Exclude short-form content (<4 minutes)

    Returns data for ALL videos AND qualifying videos separately
    """
    if not video_ids:
        return None

    try:
        # Batch video requests (50 max per request)
        all_videos = []
        max_retries = len(API_KEYS)

        for i in range(0, len(video_ids), 50):
            batch_ids = video_ids[i:i+50]

            for attempt in range(max_retries):
                try:
                    req = youtube.videos().list(
                        part="snippet,statistics,contentDetails",
                        id=",".join(batch_ids)
                    )
                    res = req.execute()
                    track_quota("videos", 1)

                    all_videos.extend(res.get("items", []))
                    break  # Success, exit retry loop

                except HttpError as e:
                    if is_quota_exceeded_error(e):
                        if switch_api_key():
                            continue  # Retry with new key
                        else:
                            break  # No more keys, skip this batch
                    else:
                        break  # Other error, skip this batch
                except Exception as e:
                    break  # Error, skip this batch

        if not all_videos:
            return None

        # Initialize counters for ALL videos
        total_videos_fetched = len(all_videos)
        total_likes_all = 0
        total_comments_all = 0
        total_views_all = 0

        # Initialize counters for QUALIFYING videos
        qualifying_likes = 0
        qualifying_comments = 0
        qualifying_views = 0
        qualifying_titles = []
        qualifying_dates = []

        # Filter counters
        shorts_skipped = 0
        old_videos_skipped = 0
        too_short_skipped = 0
        duration_missing = 0

        # Calculate cutoff date (60 days ago)
        cutoff_date = datetime.now() - timedelta(days=DAYS_LOOKBACK)

        # Process each video
        for video in all_videos:
            stats = video.get("statistics", {})
            snippet = video.get("snippet", {})
            content_details = video.get("contentDetails", {})

            # Collect stats for ALL videos (no filters)
            total_likes_all += int(stats.get("likeCount", 0))
            total_comments_all += int(stats.get("commentCount", 0))
            total_views_all += int(stats.get("viewCount", 0))

            # Now apply filters for QUALIFYING videos
            passed_all_filters = True

            # FILTER 1: Date (Last 60 Days)
            try:
                published_date = pd.to_datetime(snippet.get("publishedAt"))
                published_date_naive = published_date.tz_localize(None) if published_date.tzinfo else published_date

                if published_date_naive < cutoff_date:
                    old_videos_skipped += 1
                    passed_all_filters = False
            except Exception:
                old_videos_skipped += 1
                passed_all_filters = False

            if not passed_all_filters:
                continue

            # FILTER 2: Get Duration
            duration_str = content_details.get("duration")
            if not duration_str:
                duration_missing += 1
                continue

            duration_seconds = parse_duration(duration_str)
            if duration_seconds is None:
                duration_missing += 1
                continue

            # FILTER 3: Exclude Shorts (<60 sec)
            if duration_seconds < MAX_SHORT_DURATION:
                shorts_skipped += 1
                continue

            # FILTER 4: Exclude Short Videos (<4 min)
            if duration_seconds < MIN_VIDEO_DURATION:
                too_short_skipped += 1
                continue

            # Video Passed All Filters - Count as QUALIFYING
            qualifying_likes += int(stats.get("likeCount", 0))
            qualifying_comments += int(stats.get("commentCount", 0))
            qualifying_views += int(stats.get("viewCount", 0))
            qualifying_titles.append(snippet.get("title", ""))
            qualifying_dates.append(published_date)

        qualifying_count = len(qualifying_dates)

        return {
            # ALL videos data (no filters)
            "total_videos_fetched": total_videos_fetched,
            "total_likes_all": total_likes_all,
            "total_comments_all": total_comments_all,
            "total_views_all": total_views_all,
            "avg_likes_all": safe_divide(total_likes_all, total_videos_fetched),
            "avg_comments_all": safe_divide(total_comments_all, total_videos_fetched),
            "avg_views_all": safe_divide(total_views_all, total_videos_fetched),

            # QUALIFYING videos data (with filters)
            "qualifying_video_count": qualifying_count,
            "qualifying_likes": qualifying_likes,
            "qualifying_comments": qualifying_comments,
            "qualifying_views": qualifying_views,
            "avg_likes": safe_divide(qualifying_likes, qualifying_count),
            "avg_comments": safe_divide(qualifying_comments, qualifying_count),
            "avg_views": safe_divide(qualifying_views, qualifying_count),
            "total_views": qualifying_views,
            "titles": qualifying_titles,
            "dates": qualifying_dates,

            # Filter statistics
            "shorts_skipped": shorts_skipped,
            "old_videos_skipped": old_videos_skipped,
            "too_short_skipped": too_short_skipped,
            "duration_missing": duration_missing
        }

    except Exception as e:
        return None

# ------------------------------------------------
# 5️⃣ Calculate normalized merchandise score (ONLY FOR QUALIFYING CHANNELS)
# ------------------------------------------------
def calculate_merchandise_score(channel_data, video_data):
    """Calculate merchandise partnership score with custom weights"""

    # Calculate Raw Metrics
    engagement_raw = safe_divide(
        video_data["avg_likes"] + video_data["avg_comments"],
        video_data["avg_views"]
    )

    comment_rate_raw = safe_divide(
        video_data["avg_comments"],
        video_data["avg_views"]
    )

    consistent_reach_raw = safe_divide(
        video_data["avg_views"],
        channel_data["subs"]
    )

    if len(video_data["dates"]) > 1:
        span_days = max(7, (max(video_data["dates"]) - min(video_data["dates"])).days)
        upload_consistency_raw = len(video_data["dates"]) / span_days * 30
    else:
        upload_consistency_raw = len(video_data["dates"]) / DAYS_LOOKBACK * 30

    view_velocity_raw = safe_divide(
        video_data["total_views"],
        channel_data["views_total"]
    )

    like_rate_raw = safe_divide(
        video_data["avg_likes"],
        video_data["avg_views"]
    )

    # Normalize to 0-1 Scale
    engagement_norm = normalize_metric(engagement_raw, 0, 0.10)
    comment_rate_norm = normalize_metric(comment_rate_raw, 0, 0.02)
    consistent_reach_norm = normalize_metric(consistent_reach_raw, 0, 0.50)
    upload_consistency_norm = normalize_metric(upload_consistency_raw, 0, 15)
    view_velocity_norm = normalize_metric(view_velocity_raw, 0, 0.10)
    like_rate_norm = normalize_metric(like_rate_raw, 0, 0.06)

    # Apply Custom Weights
    merchandise_score = (
        0.30 * engagement_norm +
        0.20 * consistent_reach_norm +
        0.20 * comment_rate_norm +
        0.10 * upload_consistency_norm +
        0.10 * view_velocity_norm +
        0.10 * like_rate_norm
    )

    return {
        "score": merchandise_score,
        "engagement_norm": engagement_norm,
        "comment_rate_norm": comment_rate_norm,
        "consistent_reach_norm": consistent_reach_norm,
        "upload_consistency_norm": upload_consistency_norm,
        "view_velocity_norm": view_velocity_norm,
        "like_rate_norm": like_rate_norm,
        "engagement_raw": engagement_raw,
        "comment_rate_raw": comment_rate_raw,
        "like_rate_raw": like_rate_raw,  # MISSING - Added!
        "view_velocity_raw": view_velocity_raw,  # MISSING - Added!
        "upload_consistency_raw": upload_consistency_raw
    }

# ------------------------------------------------
# 6️⃣ Process single channel (COLLECT ALL DATA)
# ------------------------------------------------
def process_channel(csv_channel):
    """Process a single channel from CSV - collect ALL data regardless of qualification"""

    channel_id = csv_channel['channel_id']
    channel_name = csv_channel['channel_name']
    csv_subs = csv_channel['subscribers']

    # Step 1: Get channel statistics using ID
    channel_data = get_channel_stats(channel_id, channel_name)
    if not channel_data:
        print(f"  ❌ Could not retrieve channel data")
        return None

    # Step 2: Get recent videos
    video_ids = get_recent_video_ids(channel_data["uploads_playlist"], VIDEOS_PER_CHANNEL)
    if not video_ids:
        print(f"  ❌ No videos found")
        return {
            "Channel_Name": channel_name,
            "Channel_ID": channel_id,
            "CSV_Subs": csv_subs,
            "Actual_Subs": channel_data["subs"],
            "Total_Channel_Views": channel_data["views_total"],
            "Total_Channel_Videos": channel_data["video_count"],
            "Videos_Fetched": 0,
            "Qualifying_Videos_60d": 0,
            "Status": "No videos found",
            "Search_Term": csv_channel.get('search_term', ''),
            "Query_Name": csv_channel.get('query_name', ''),
        }

    # Step 3: Get video metrics (ALL data + qualifying data)
    video_data = get_video_metrics(video_ids)
    if not video_data:
        print(f"  ❌ Could not analyze videos")
        return {
            "Channel_Name": channel_name,
            "Channel_ID": channel_id,
            "CSV_Subs": csv_subs,
            "Actual_Subs": channel_data["subs"],
            "Total_Channel_Views": channel_data["views_total"],
            "Total_Channel_Videos": channel_data["video_count"],
            "Videos_Fetched": 0,
            "Qualifying_Videos_60d": 0,
            "Status": "Video analysis failed",
            "Search_Term": csv_channel.get('search_term', ''),
            "Query_Name": csv_channel.get('query_name', ''),
        }

    # Build result with ALL data (no filtering at this stage)
    qualifying_count = video_data["qualifying_video_count"]

    status = "Analyzed"
    if qualifying_count < MIN_VIDEOS_IN_TIMEFRAME:
        status = f"Not enough qualifying videos ({qualifying_count} < {MIN_VIDEOS_IN_TIMEFRAME})"

    result = {
        # Basic info
        "Channel_Name": channel_name,
        "Channel_ID": channel_id,
        "CSV_Subs": csv_subs,
        "Actual_Subs": channel_data["subs"],
        "Total_Channel_Views": channel_data["views_total"],
        "Total_Channel_Videos": channel_data["video_count"],

        # Video fetch stats
        "Videos_Fetched": video_data["total_videos_fetched"],
        "Qualifying_Videos_60d": qualifying_count,
        "Shorts_Skipped": video_data.get("shorts_skipped", 0),
        "Short_Vids_Skipped": video_data.get("too_short_skipped", 0),
        "Old_Videos_Skipped": video_data.get("old_videos_skipped", 0),

        # ALL videos metrics (no filters)
        "Avg_Views_All": round(video_data["avg_views_all"]),
        "Avg_Likes_All": round(video_data["avg_likes_all"]),
        "Avg_Comments_All": round(video_data["avg_comments_all"]),
        "Total_Views_All": video_data["total_views_all"],

        # QUALIFYING videos metrics (with filters)
        "Avg_Views_Qualified": round(video_data["avg_views"]) if qualifying_count > 0 else 0,
        "Avg_Likes_Qualified": round(video_data["avg_likes"]) if qualifying_count > 0 else 0,
        "Avg_Comments_Qualified": round(video_data["avg_comments"]) if qualifying_count > 0 else 0,
        "Total_Views_Qualified": video_data["total_views"],

        # Metadata
        "Search_Term": csv_channel.get('search_term', ''),
        "Query_Name": csv_channel.get('query_name', ''),
        "Status": status,

        # Store video_data and channel_data for scoring later
        "_video_data": video_data,
        "_channel_data": channel_data
    }

    # Print progress
    print(f"  ✅ {channel_name[:40]:40} | Fetched: {video_data['total_videos_fetched']:2d} | Qualified: {qualifying_count:2d} | Status: {status[:30]}")

    return result

# ------------------------------------------------
# 7️⃣ Main execution
# ------------------------------------------------
def main():
    """Run the scraper for all channels in CSV"""
    global QUOTA_USED
    QUOTA_USED = 0

    print("\n" + "="*70)
    print("🚀 YOUTUBE MERCHANDISE PARTNERSHIP SCRAPER (DUAL CSV OUTPUT)")
    print("="*70)
    print(f"Input CSV: {CSV_INPUT_FILE}")
    print(f"API Keys Available: {len(API_KEYS)}")
    print(f"Currently Using: Key #{CURRENT_KEY_INDEX + 1} ({API_KEY[:20]}...{API_KEY[-4:]})")
    print(f"Minimum Subscribers Filter: {MIN_SUBS_FILTER:,}")
    print(f"Videos to Fetch per Channel: {VIDEOS_PER_CHANNEL}")
    print(f"Time Window: Last {DAYS_LOOKBACK} days")
    print(f"Duration Filter: ≥{MIN_VIDEO_DURATION//60} minutes ({MIN_VIDEO_DURATION}s)")
    print(f"Shorts Filter: <{MAX_SHORT_DURATION}s excluded")
    print(f"Min Videos for Qualification: {MIN_VIDEOS_IN_TIMEFRAME} qualifying videos")
    print(f"Daily Quota Limit per Key: {QUOTA_LIMIT:,} units")
    print(f"Total Available Quota: {QUOTA_LIMIT * len(API_KEYS):,} units")
    if MAX_CHANNELS_TO_PROCESS:
        print(f"⚠️ TESTING MODE: Limited to {MAX_CHANNELS_TO_PROCESS} channels")
    print("="*70)

    # STEP 1: Load channels from CSV
    channels = get_channels_from_csv()

    if not channels:
        print("\n❌ No channels found in CSV matching criteria")
        return

    print(f"\n{'='*70}")
    print(f"📊 ANALYZING {len(channels)} CHANNELS")
    print(f"{'='*70}\n")

    # STEP 2: Process each channel (collect ALL data)
    all_results = []

    for idx, channel in enumerate(channels, 1):
        channel_name = channel['channel_name']
        channel_id = channel['channel_id']
        csv_subs = channel['subscribers']

        print(f"[{idx}/{len(channels)}] {channel_name} (ID: {channel_id[:20]}..., {csv_subs:,} subs)")

        try:
            result = process_channel(channel)

            if result:
                all_results.append(result)

            # Rate limiting
            time.sleep(0.3)

        except Exception as e:
            print(f"  ❌ Error: {e}")
            continue

    if not all_results:
        print("\n❌ No channels successfully analyzed")
        print(f"\n📊 Final Quota Usage: {QUOTA_USED:,}/{QUOTA_LIMIT:,} units ({(QUOTA_USED/QUOTA_LIMIT)*100:.1f}%)")
        return

    # STEP 3: Create DataFrame for ALL channels
    df_all = pd.DataFrame(all_results)

    # Remove internal data columns before saving
    df_all_clean = df_all.drop(columns=['_video_data', '_channel_data'], errors='ignore')

    # STEP 4: Filter for QUALIFYING channels and calculate scores
    qualifying_results = []

    for result in all_results:
        # Check if channel qualifies and has valid data
        if (result['Qualifying_Videos_60d'] >= MIN_VIDEOS_IN_TIMEFRAME and
            '_video_data' in result and '_channel_data' in result and
            result['_video_data'] is not None and result['_channel_data'] is not None):

            try:
                video_data = result['_video_data']
                channel_data = result['_channel_data']

                # Verify we have the required data for scoring
                if (video_data.get("avg_views", 0) == 0 or
                    not video_data.get("dates") or
                    len(video_data.get("dates", [])) == 0):
                    print(f"  ⚠️ Skipping {result['Channel_Name']}: insufficient video data for scoring")
                    continue

                # Calculate merchandise score
                score_data = calculate_merchandise_score(channel_data, video_data)

                # Add scoring data
                qualifying_result = {
                    "Channel_Name": result["Channel_Name"],
                    "Channel_ID": result["Channel_ID"],
                    "CSV_Subs": result["CSV_Subs"],
                    "Actual_Subs": result["Actual_Subs"],
                    "Qualifying_Videos_60d": result["Qualifying_Videos_60d"],
                    "Avg_Views": result["Avg_Views_Qualified"],
                    "Avg_Likes": result["Avg_Likes_Qualified"],
                    "Avg_Comments": result["Avg_Comments_Qualified"],
                    "Total_Views_Qualified": result["Total_Views_Qualified"],
                    "Engagement_Rate": round(score_data['engagement_raw'] * 100, 3),
                    "Comment_Rate": round(score_data['comment_rate_raw'] * 100, 3),
                    "Consistent_Reach": round(score_data['consistent_reach_norm'], 2),
                    "Upload_Per_Month": round(score_data['upload_consistency_raw'], 1),
                    "View_Velocity": round(score_data['view_velocity_norm'], 2),
                    "Like_Rate": round(score_data['like_rate_raw'] * 100, 3),
                    "Merch_Score": round(score_data["score"], 4),
                    "Search_Term": result["Search_Term"],
                    "Query_Name": result["Query_Name"],
                    "_score_sort": score_data["score"]
                }
                qualifying_results.append(qualifying_result)

            except Exception as e:
                print(f"  ⚠️ Error scoring {result.get('Channel_Name', 'Unknown')}: {e}")
                continue

    # Create DataFrame for QUALIFYING channels
    if qualifying_results:
        df_qualified = pd.DataFrame(qualifying_results)
        df_qualified = df_qualified.sort_values("_score_sort", ascending=False)
        df_qualified = df_qualified.drop("_score_sort", axis=1)
    else:
        df_qualified = pd.DataFrame()

    # STEP 5: Display results
    print("\n" + "="*70)
    print("📊 ANALYSIS COMPLETE")
    print("="*70)
    print(f"Total channels analyzed: {len(all_results)}")
    print(f"Channels with qualifying videos (≥{MIN_VIDEOS_IN_TIMEFRAME}): {len(qualifying_results)}")
    print(f"Channels without enough qualifying videos: {len(all_results) - len(qualifying_results)}")

    # Display top qualifying channels
    if not df_qualified.empty:
        print("\n" + "="*70)
        print("🏆 TOP MERCHANDISE PARTNERSHIP CANDIDATES")
        print("="*70)

        display_df = df_qualified[[
            "Channel_Name", "CSV_Subs", "Actual_Subs", "Qualifying_Videos_60d",
            "Avg_Views", "Engagement_Rate", "Comment_Rate", "Merch_Score"
        ]].head(20).copy()

        print(display_df.to_string(index=False))

        # Score distribution
        print("\n" + "="*70)
        print("📊 SCORE DISTRIBUTION (QUALIFIED CHANNELS)")
        print("="*70)
        excellent = len(df_qualified[df_qualified["Merch_Score"] >= 0.70])
        good = len(df_qualified[(df_qualified["Merch_Score"] >= 0.50) & (df_qualified["Merch_Score"] < 0.70)])
        moderate = len(df_qualified[(df_qualified["Merch_Score"] >= 0.30) & (df_qualified["Merch_Score"] < 0.50)])
        poor = len(df_qualified[df_qualified["Merch_Score"] < 0.30])

        print(f"🟢 Excellent (0.70+):    {excellent:3d} channels")
        print(f"🟡 Good (0.50-0.69):     {good:3d} channels")
        print(f"🟠 Moderate (0.30-0.49): {moderate:3d} channels")
        print(f"🔴 Poor (<0.30):         {poor:3d} channels")

    # STEP 6: Export to TWO CSV files
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    try:
        # CSV 1: ALL CHANNELS
        filename_all = f"youtube_ALL_CHANNELS_{timestamp}.csv"
        df_all_clean.to_csv(filename_all, index=False)
        print("\n" + "="*70)
        print(f"💾 CSV 1 (ALL CHANNELS) saved to: {filename_all}")
        print(f"   Contains: {len(df_all_clean)} channels with raw data")

        # CSV 2: QUALIFIED CHANNELS ONLY
        if not df_qualified.empty:
            filename_qualified = f"youtube_QUALIFIED_CHANNELS_{timestamp}.csv"
            df_qualified.to_csv(filename_qualified, index=False)
            print(f"💾 CSV 2 (QUALIFIED ONLY) saved to: {filename_qualified}")
            print(f"   Contains: {len(df_qualified)} channels with ≥{MIN_VIDEOS_IN_TIMEFRAME} videos + scores")
        else:
            print(f"⚠️  CSV 2 (QUALIFIED ONLY) not created - no qualifying channels")

    except Exception as e:
        print(f"\n⚠️ Error saving CSV: {e}")

    print(f"\n⏱️  Time window: Last {DAYS_LOOKBACK} days (videos ≥{MIN_VIDEO_DURATION//60}min only)")
    print(f"📊 Final Quota Usage:")
    print(f"   API Key #{CURRENT_KEY_INDEX + 1}: {QUOTA_USED:,}/{QUOTA_LIMIT:,} units ({(QUOTA_USED/QUOTA_LIMIT)*100:.1f}%)")
    if CURRENT_KEY_INDEX > 0:
        print(f"   🔄 Switched through {CURRENT_KEY_INDEX + 1} API key(s) during execution")

    # Calculate efficiency
    avg_quota = QUOTA_USED / len(channels) if len(channels) > 0 else 0
    estimated_daily_capacity = QUOTA_LIMIT / avg_quota if avg_quota > 0 else 0
    total_capacity = (QUOTA_LIMIT * len(API_KEYS)) / avg_quota if avg_quota > 0 else 0
    print(f"⚡ Average quota per channel: {avg_quota:.1f} units")
    print(f"🚀 Estimated capacity per API key: ~{int(estimated_daily_capacity):,} channels")
    print(f"🎯 Total estimated capacity ({len(API_KEYS)} keys): ~{int(total_capacity):,} channels")
    print("="*70)

if __name__ == "__main__":
    main()