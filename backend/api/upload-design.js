// Vercel Serverless Function for Design Upload
// Uses Vercel Blob for persistent cloud storage
import { put } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS headers (match your generate-sd.js pattern)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { designData, designId, size } = req.body;

    // Validation
    if (!designData || !designId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing designData or designId' 
      });
    }

    // Validate base64 data format
    if (!designData.startsWith('data:image/')) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid image data format. Expected data:image/...' 
      });
    }

    // Extract base64 string and calculate size
    const base64Data = designData.split(',')[1];
    if (!base64Data) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid base64 data' 
      });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const sizeKB = Math.round(buffer.length / 1024);
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);

    // Extract format from data URL
    const formatMatch = designData.match(/data:image\/(\w+);/);
    const format = formatMatch ? formatMatch[1] : 'jpeg';

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `designs/${designId}-${timestamp}.${format}`;

    console.log(`📦 Uploading design to Vercel Blob: ${filename} (${sizeKB}KB)`);

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: false // Keep consistent filenames
    });

    console.log(`✅ Design uploaded successfully: ${blob.url}`);

    return res.status(200).json({
      success: true,
      designId: designId,
      designUrl: blob.url,
      filename: filename,
      sizeKB: sizeKB,
      sizeMB: sizeMB,
      format: format,
      timestamp: new Date().toISOString(),
      message: 'Design uploaded to Vercel Blob successfully'
    });

  } catch (error) {
    console.error('❌ Vercel Blob upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to upload design to Vercel Blob',
      message: error.message
    });
  }
}

