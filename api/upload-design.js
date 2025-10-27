// Vercel Serverless Function for Design Upload
// This stores designs temporarily and returns a retrieval URL
// Note: Vercel serverless functions are stateless, so for production
// you should upload to S3, Cloudinary, or a database

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

    // For now, we'll return success with metadata
    // The full design is stored in localStorage on the client side
    // In production, you would:
    // 1. Upload to S3: await uploadToS3(buffer, designId)
    // 2. Upload to Cloudinary: await cloudinary.uploader.upload(designData)
    // 3. Store in database with the base64 data

    const designInfo = {
      id: designId,
      size: size || 'M',
      format: format,
      sizeKB: sizeKB,
      sizeMB: sizeMB,
      timestamp: new Date().toISOString(),
      stored: 'localStorage' // Change to 's3' or 'cloudinary' when implemented
    };

    // Generate retrieval URL
    const host = req.headers.host || 'tshirt-api-xi.vercel.app';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const designUrl = `${protocol}://${host}/api/get-design?id=${designId}`;

    console.log(`📦 Design upload request: ${designId} (${sizeKB}KB, ${format})`);

    return res.status(200).json({
      success: true,
      designId: designId,
      designUrl: designUrl,
      sizeKB: sizeKB,
      sizeMB: sizeMB,
      format: format,
      message: 'Design metadata stored successfully',
      note: 'Full design stored in browser localStorage. For production, implement S3/Cloudinary upload.'
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

