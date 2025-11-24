# YouTube Services - Independent Railway Deployment

This guide explains how to deploy the YouTube API analyzer and YouTube scraper as **separate, independent services** on Railway.

## Service Overview

### 1. YouTube Scraper Service (`youtube-scraper/`)
- **Purpose**: Continuously scrapes YouTube channels using Selenium
- **Start Command**: `node continuous-scraper.js`
- **Dependencies**: Selenium, Chrome/Chromium, cheerio
- **Database**: Creates `youtube_channels` table

### 2. YouTube API Analyzer Service (`youtube-api/`)
- **Purpose**: Analyzes channels and calculates merchandise partnership scores
- **Start Command**: `node youtubeapi-scheduler.js`
- **Dependencies**: Google APIs, YouTube Data API
- **Database**: Uses `youtube_channels` table, creates analysis tables

## Deployment Steps

### Service 1: YouTube Scraper

1. **Create New Railway Service**
   - Go to Railway dashboard → Your project
   - Click **"New"** → **"GitHub Repo"**
   - Select your repository

2. **Configure Service**
   - **Root Directory**: `jobs/youtube-scraper/`
   - Railway will auto-detect `railway.toml` in that folder
   - Or manually set **Start Command**: `node continuous-scraper.js`

3. **Add Environment Variables**
   ```
   DATABASE_URL=<link from your Neon database>
   NODE_ENV=production
   SELENIUM_GRID_URL=<optional - if using Selenium Grid>
   ```

4. **Deploy**
   - Railway will install dependencies from `youtube-scraper/package.json`
   - Chrome/Chromium will be installed via Nixpacks

### Service 2: YouTube API Analyzer

1. **Create New Railway Service**
   - Go to Railway dashboard → Your project
   - Click **"New"** → **"GitHub Repo"**
   - Select your repository

2. **Configure Service**
   - **Root Directory**: `jobs/youtube-api/`
   - Railway will auto-detect `railway.toml` in that folder
   - Or manually set **Start Command**: `node youtubeapi-scheduler.js`

3. **Add Environment Variables**
   ```
   DATABASE_URL=<link from your Neon database>
   YOUTUBE_API_KEY_1=your_first_key
   YOUTUBE_API_KEY_2=your_second_key
   YOUTUBE_API_KEY_3=your_third_key
   ... (add up to 12 keys)
   NODE_ENV=production
   ```

4. **Deploy**
   - Railway will install dependencies from `youtube-api/package.json`

## File Structure

```
jobs/
├── youtube-scraper/
│   ├── db/
│   │   └── connection.js          # Independent DB connection
│   ├── package.json                # Scraper-only dependencies
│   ├── railway.toml                # Scraper service config
│   ├── continuous-scraper.js       # Main scraper service
│   ├── scraper.js                  # Scraper logic
│   └── queries.js                  # Search queries
│
└── youtube-api/
    ├── db/
    │   └── connection.js          # Independent DB connection
    ├── package.json                # API-only dependencies
    ├── railway.toml                 # API service config
    ├── youtubeapi-scheduler.js     # Main API service
    ├── youtubeapi.js               # API analyzer logic
    └── youtubeapi-test.js          # Test script
```

## Key Changes

### Independent Dependencies
- Each service has its own `package.json` with only required dependencies
- No shared code dependencies between services

### Independent Database Connections
- Each service has its own `db/connection.js`
- Both connect to the same database (via `DATABASE_URL`)
- Scraper creates `youtube_channels` table
- API analyzer creates analysis tables

### Independent Railway Configs
- `youtube-scraper/railway.toml` - Scraper service config
- `youtube-api/railway.toml` - API analyzer service config

## Benefits

✅ **Independent Scaling**: Scale each service separately based on needs
✅ **Independent Deployments**: Deploy updates to one service without affecting the other
✅ **Independent Monitoring**: Monitor each service separately
✅ **Resource Optimization**: Allocate resources based on each service's needs
✅ **Fault Isolation**: If one service fails, the other continues running

## Shared Resources

Both services share:
- **Database**: Same PostgreSQL/Neon database (via `DATABASE_URL`)
- **Repository**: Same GitHub repository (different root directories)

## Environment Variables

### YouTube Scraper Service
- `DATABASE_URL` (required)
- `NODE_ENV` (optional)
- `SELENIUM_GRID_URL` (optional - for Selenium Grid)

### YouTube API Analyzer Service
- `DATABASE_URL` (required)
- `YOUTUBE_API_KEY_1` through `YOUTUBE_API_KEY_12` (at least 1 required)
- `NODE_ENV` (optional)
- `YOUTUBE_LOG_EVERY` (optional - default 25)
- `YOUTUBE_VERBOSE_LOGS` (optional - default false)

## Verification

### Scraper Service
Check logs for:
- `🚀 Starting Continuous YouTube Scraper...`
- `✓ Healthcheck server listening on port [PORT]`
- `✓ Chrome driver initialized`

### API Analyzer Service
Check logs for:
- `🚀 Starting YouTube API Scheduler...`
- `✓ Healthcheck server listening on port [PORT]`
- `✓ YouTube API scraper scheduled - runs daily at 4 AM UTC`

## Troubleshooting

**Service not starting?**
- Verify root directory is set correctly
- Check `package.json` exists in the service folder
- Verify `DATABASE_URL` is set

**Dependencies not installing?**
- Ensure `package.json` is in the service root directory
- Check Railway logs for npm install errors

**Database connection issues?**
- Verify `DATABASE_URL` is linked correctly
- Check database allows connections from Railway IPs

That's it! Both services are now independent and can be deployed separately on Railway.

