#!/bin/bash
set -e

echo "🔧 Installing Node.js dependencies..."
npm install

echo "🐍 Installing Python and rembg for background removal..."
if command -v python3 &> /dev/null; then
    python3 -m pip install --upgrade pip --quiet || echo "⚠️  pip upgrade failed, continuing..."
    python3 -m pip install rembg --quiet || {
        echo "⚠️  Warning: rembg installation failed."
        echo "   Background removal features may not work."
        exit 1
    }
    echo "✅ rembg installed successfully"
    
    echo "📦 Pre-downloading rembg models (this may take a few minutes)..."
    # Download the most commonly used models to cache them
    # This prevents slow first requests in production
    python3 -m rembg d u2net || echo "⚠️  Failed to download u2net model (will download on first use)"
    python3 -m rembg d u2net_human_seg || echo "⚠️  Failed to download u2net_human_seg model (will download on first use)"
    python3 -m rembg d u2net_cloth_seg || echo "⚠️  Failed to download u2net_cloth_seg model (will download on first use)"
    echo "✅ Models pre-downloaded (or will download on first use)"
else
    echo "⚠️  Warning: python3 not found. Installing Python..."
    # Try to install Python if not available (Railway should have it)
    echo "   Please ensure Python 3 is available in your Railway environment."
fi

echo "✅ Build complete!"

