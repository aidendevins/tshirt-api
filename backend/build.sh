#!/bin/bash
set -e

echo "🔧 Installing Node.js dependencies..."
npm install

echo "🐍 Installing Python and rembg for background removal..."

# Find python3 - try common locations
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null && python --version | grep -q "Python 3"; then
    PYTHON_CMD="python"
elif [ -f /nix/store/*-python3-*/bin/python3 ]; then
    PYTHON_CMD=$(find /nix/store -name "python3" -type f -executable 2>/dev/null | head -1)
elif [ -f /usr/bin/python3 ]; then
    PYTHON_CMD="/usr/bin/python3"
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "❌ Error: python3 not found in PATH or common locations"
    echo "   Available commands:"
    which python3 python python2 2>/dev/null || echo "   No python found"
    exit 1
fi

echo "✅ Found Python at: $PYTHON_CMD"
$PYTHON_CMD --version

$PYTHON_CMD -m pip install --upgrade pip --quiet || echo "⚠️  pip upgrade failed, continuing..."
$PYTHON_CMD -m pip install rembg pillow --quiet || {
    echo "⚠️  Warning: rembg installation failed."
    echo "   Background removal features may not work."
    exit 1
}
echo "✅ rembg and pillow installed successfully"

echo "📦 Pre-downloading rembg models (this may take a few minutes)..."
# Download the most commonly used models to cache them
# This prevents slow first requests in production
# Note: Models will auto-download on first use if pre-download fails
$PYTHON_CMD -c "from rembg import remove; import io; remove(io.BytesIO(b'fake'))" 2>/dev/null || echo "⚠️  Model pre-download skipped (will download on first use)"
echo "✅ Build complete - rembg models will download on first use if needed"

echo "✅ Build complete!"

