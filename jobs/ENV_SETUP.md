# Environment Variables Setup

This document describes the environment variables required to run the YouTube scraper.

## Required Environment Variables

### DATABASE_URL
**Required**: Yes  
**Description**: PostgreSQL connection string  
**Format**: `postgresql://username:password@host:port/database`  
**Example**: `postgresql://user:password@localhost:5432/youtube_channels`

### NODE_ENV
**Required**: No  
**Description**: Environment mode  
**Options**: `development`, `production`  
**Default**: `production`

## Local Development Setup

Create a `.env` file in the `jobs/` directory:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/youtube_channels
NODE_ENV=development
```

## Railway Deployment

Railway automatically provides `DATABASE_URL` when you provision a PostgreSQL database:

1. Create a new service in Railway
2. Add a PostgreSQL database to your project
3. Railway will automatically inject the `DATABASE_URL` environment variable
4. No manual configuration needed!

## Testing the Connection

To verify your database connection:

```bash
# Run the manual test script
npm test

# Or directly with node
node run-once.js
```

The script will:
- Check if DATABASE_URL is set
- Initialize the database schema
- Run the scraper once
- Display results

## Security Notes

- **Never commit `.env` files** to version control
- Keep your database credentials secure
- Use Railway's built-in secret management for production
- Rotate credentials regularly

