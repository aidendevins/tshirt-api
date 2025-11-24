// jobs/youtube-api/db/connection.js
const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Required for Railway/Heroku PostgreSQL
  } : false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✓ Database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Query helper with automatic client management
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // Reduced logging - only log slow queries or errors
    if (duration > 1000) {
      console.log('Slow query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  const client = await pool.connect();
  return client;
}

/**
 * Initialize database schema (minimal - only what's needed for API service)
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema...');
    
    // Only create tables needed for API service
    // youtube_channels table should already exist from scraper service
    
    console.log('✓ Database schema initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all database connections
 */
async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}

module.exports = {
  query,
  getClient,
  pool,
  initializeDatabase,
  closePool
};

