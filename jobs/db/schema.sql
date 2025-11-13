-- YouTube Channels Database Schema
-- Run this migration to create the necessary tables and indexes

CREATE TABLE IF NOT EXISTS youtube_channels (
  id SERIAL PRIMARY KEY,
  channel_name VARCHAR(255) NOT NULL UNIQUE,
  subscribers INTEGER NOT NULL DEFAULT 0,
  search_term VARCHAR(255) NOT NULL,
  query_name VARCHAR(100) NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_youtube_channels_query_name ON youtube_channels(query_name);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_subscribers ON youtube_channels(subscribers DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_last_updated ON youtube_channels(last_updated DESC);

-- Optional: Add comment for documentation
COMMENT ON TABLE youtube_channels IS 'Stores YouTube channel data from automated scraping';
COMMENT ON COLUMN youtube_channels.channel_name IS 'Unique channel name/handle';
COMMENT ON COLUMN youtube_channels.subscribers IS 'Current subscriber count';
COMMENT ON COLUMN youtube_channels.search_term IS 'The specific search term used to find this channel';
COMMENT ON COLUMN youtube_channels.query_name IS 'The query category (Gaming, Golf, Cooking, etc.)';

