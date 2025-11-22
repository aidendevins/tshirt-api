#!/bin/bash
set -e

echo "🔧 Installing Node.js dependencies..."
npm install

echo "🐍 Installing Python dependencies..."
if command -v python3 &> /dev/null; then
    python3 -m pip install --upgrade pip --quiet || echo "⚠️  pip upgrade failed, continuing..."
    python3 -m pip install -r python/requirements.txt --quiet || {
        echo "⚠️  Warning: Python dependencies installation failed."
        echo "   This may be okay if Python features are not needed."
    }
    echo "✅ Python dependencies installed"
else
    echo "⚠️  Warning: python3 not found. Python features may not work."
    echo "   Install Python 3 or set PYTHON_BIN environment variable."
fi

echo "✅ Build complete!"

