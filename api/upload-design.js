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

    console.log(`📤 Uploading design to Vercel Blob: ${designId} (${sizeKB}KB, ${format})`);

    // Upload to Vercel Blob storage
    const blob = await put(`designs/${designId}.${format}`, buffer, {
      access: 'public',
      contentType: `image/${format}`,
      addRandomSuffix: false // Keep consistent filename
    });

    console.log(`✅ Design uploaded to Vercel Blob: ${blob.url}`);

    return res.status(200).json({
      success: true,
      designId: designId,
      designUrl: blob.url, // Direct CDN URL from Vercel Blob
      sizeKB: sizeKB,
      sizeMB: sizeMB,
      format: format,
      storage: 'vercel-blob',
      message: 'Design uploaded successfully to Vercel Blob',
      downloadUrl: blob.downloadUrl
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process design upload',
      message: error.message
    });
  }
}

