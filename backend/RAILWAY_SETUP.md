# Railway Deployment Setup for Python Scripts

This guide explains how to set up the Python sprite extraction script on Railway.

## Overview

The backend uses a Python script (`python/extract_sprite.py`) for background removal and sprite extraction. Railway needs to:
1. Have Python 3 installed
2. Install Python dependencies from `python/requirements.txt`
3. Use the system Python (not a virtual environment)

## Automatic Setup

The `build.sh` script automatically installs both Node.js and Python dependencies. Railway will use this script during the build process if configured correctly.

## Railway Configuration

### Option 1: Using railway.toml (Recommended)

A `railway.toml` file has been created in the `backend/` directory. Railway will automatically use this configuration:
- **Build Command**: Runs `build.sh` which installs both Node.js and Python dependencies
- **Start Command**: Starts the backend server with `npm start`

**Important**: Make sure Railway is configured to deploy from the `backend/` directory, not the root.

### Option 2: Using Railway's Build Command (Manual)

1. In your Railway project settings, go to **Settings** → **Build & Deploy**
2. Set the **Build Command** to:
   ```bash
   cd backend && bash build.sh
   ```
3. Set the **Start Command** to:
   ```bash
   cd backend && npm start
   ```

### Option 3: Using Nixpacks (Automatic Detection)

Railway uses Nixpacks which can detect both Node.js and Python. However, you may need to create a `nixpacks.toml` file in the root:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x", "python3"]

[phases.install]
cmds = [
  "cd backend && npm install",
  "python3 -m pip install --upgrade pip",
  "python3 -m pip install -r backend/python/requirements.txt"
]

[start]
cmd = "cd backend && npm start"
```

### Option 4: Using NPM Script

You can also use the npm script directly:
- Build command: `cd backend && npm install && npm run install-python-deps`
- Start command: `cd backend && npm start`

## Environment Variables

No special environment variables are required. The script will use `python3` by default.

For local development with a virtual environment, you can set:
- `PYTHON_BIN=/path/to/your/venv/bin/python3`

## Verifying Python Installation

After deployment, you can verify Python is working by checking the Railway logs. The script will automatically use `python3` if available.

## Troubleshooting

### "python3: command not found"
- Railway may not have Python installed by default
- Use Option 1 or 2 above to ensure Python is installed during build
- Or use a custom Dockerfile with Python pre-installed

### "Module not found" errors
- Ensure the build command installs Python dependencies
- Check that `python/requirements.txt` is in the correct location
- Verify the build logs show successful pip installation

### "Permission denied" errors
- Python packages may need to be installed with `--user` flag
- Try: `python3 -m pip install --user -r python/requirements.txt`

## Minimal Requirements

The script requires at minimum:
- `Pillow>=10.0.0`
- `numpy>=1.24.0`
- `rembg[new]>=2.0.0` (for background removal)

These are listed in `python/requirements.txt` and will be installed automatically if the build process is configured correctly.

