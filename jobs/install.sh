#!/bin/bash
# jobs/install.sh
# Quick setup script for local development

set -e

echo "🚀 YouTube Scraper - Installation Script"
echo "=========================================="
echo ""

# Check Node.js version
echo "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required (found version: $NODE_VERSION)"
    exit 1
fi
echo "✓ Node.js version: $(node -v)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Check for .env file
if [ ! -f .env ]; then
    echo "⚠️  No .env file found"
    echo ""
    echo "Creating .env template..."
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/youtube_channels

# Environment
NODE_ENV=development
EOF
    echo "✓ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and set your DATABASE_URL"
    echo ""
else
    echo "✓ .env file exists"
    echo ""
fi

# Check database connection
echo "Testing database connection..."
if node -e "
require('dotenv').config();
if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not set in .env');
    process.exit(1);
}
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
pool.query('SELECT 1')
    .then(() => {
        console.log('✓ Database connection successful');
        pool.end();
    })
    .catch(err => {
        console.log('❌ Database connection failed:', err.message);
        console.log('');
        console.log('Make sure:');
        console.log('1. PostgreSQL is running');
        console.log('2. DATABASE_URL in .env is correct');
        console.log('3. Database exists and is accessible');
        pool.end();
        process.exit(1);
    });
" 2>/dev/null; then
    echo ""
else
    echo ""
fi

echo "=========================================="
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your DATABASE_URL"
echo "2. Run 'npm test' to test the scraper"
echo "3. Run 'npm start' to start the scheduler"
echo ""
echo "For Railway deployment, see RAILWAY_DEPLOYMENT.md"
echo "=========================================="

