export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageData, elementDescription } = req.body || {};

    if (!imageData || !/^data:image\/\w+;base64,/.test(imageData)) {
      return res.status(400).json({ error: 'imageData (base64 data URL) is required' });
    }
    if (!elementDescription || elementDescription.trim().length < 3) {
      return res.status(400).json({ error: 'elementDescription is required' });
    }

    // Invoke Python extractor (GroundingDINO+SAM+RemBG-ready; current impl uses rembg + tight crop)
    const { spawn } = await import('child_process');
    const { fileURLToPath } = await import('url');
    const { dirname, join } = await import('path');
    const fs = await import('fs/promises');
    const os = await import('os');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const scriptPath = join(__dirname, '../python/extract_sprite.py');

    // Write payload to temp file to avoid large stdin / EPIPE issues
    const tmpDir = os.tmpdir();
    const tmpPath = join(tmpDir, `extract_sprite_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
    const inputPayload = JSON.stringify({ imageData, elementDescription });
    await fs.writeFile(tmpPath, inputPayload, 'utf-8');

    // Resolve python interpreter: env var PYTHON_BIN or 'python3' (system Python)
    // For local dev with venv, set PYTHON_BIN env var (e.g., ~/myenv/bin/python3.13)
    // For Railway/production, use system python3
    // Default to system Python on macOS (arm64 compatible), fallback to python3
    const pythonBin = process.env.PYTHON_BIN && process.env.PYTHON_BIN.trim()
      ? process.env.PYTHON_BIN.trim()
      : process.platform === 'darwin' ? '/usr/bin/python3' : 'python3';

    const py = spawn(pythonBin, [scriptPath, tmpPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let errOut = '';
    py.stdout.on('data', (d) => (out += d.toString()));
    py.stderr.on('data', (d) => (errOut += d.toString()));
    py.on('error', (err) => {
      console.error('extract-sprite spawn error:', err);
    });

    py.on('close', (code) => {
      // Clean up temp input file
      fs.unlink(tmpPath).catch(() => {});
      if (code !== 0) {
        console.error('extract-sprite python error:', errOut);
        return res.status(500).json({ error: 'Sprite extraction failed' });
      }
      try {
        const parsed = JSON.parse(out || '{}');
        if (!parsed?.spriteImageUrl) {
          return res.status(500).json({ error: 'Invalid extractor output' });
        }
        return res.status(200).json({
          success: true,
          spriteImageUrl: parsed.spriteImageUrl,
          description: elementDescription
        });
      } catch (e) {
        console.error('extract-sprite parse error:', e, out);
        return res.status(500).json({ error: 'Failed to parse extractor output' });
      }
    });
  } catch (err) {
    console.error('extract-sprite error:', err);
    return res.status(500).json({ error: 'Failed to extract sprite' });
  }
}


