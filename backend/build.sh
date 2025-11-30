#!/bin/bash
set -e

echo "🔧 Installing Node.js dependencies..."
npm install

echo "🐍 Installing Python and rembg for background removal..."
if command -v python3 &> /dev/null; then
    python3 -m pip install --upgrade pip --quiet || echo "⚠️  pip upgrade failed, continuing..."
    python3 -m pip install rembg pillow --quiet || {
        echo "⚠️  Warning: rembg installation failed."
        echo "   Background removal features may not work."
        exit 1
    }
    echo "✅ rembg and pillow installed successfully"
    
    echo "📦 Pre-downloading rembg models (this may take a few minutes)..."
    # Download the most commonly used models to cache them
    # This prevents slow first requests in production
    # Note: Models will auto-download on first use if pre-download fails
    python3 -c "from rembg import remove; import io; remove(io.BytesIO(b'fake'))" 2>/dev/null || echo "⚠️  Model pre-download skipped (will download on first use)"
    echo "✅ Build complete - rembg models will download on first use if needed"
else
    echo "⚠️  Warning: python3 not found. Installing Python..."
    # Try to install Python if not available (Railway should have it)
    echo "   Please ensure Python 3 is available in your Railway environment."
fi

echo "✅ Build complete!"

