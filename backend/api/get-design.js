// Vercel Serverless Function for Design Retrieval
// Retrieves designs from Vercel Blob storage
import { head } from '@vercel/blob';

export default async function handler(req, res) {
  // CORS headers (match your generate-sd.js pattern)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing design ID parameter',
        usage: '/api/get-design?id=YOUR_DESIGN_ID'
      });
    }

    console.log(`📥 Design retrieval request: ${id}`);

    // Try to find the design in Vercel Blob
    // We'll try both .jpeg and .jpg extensions
    try {
      const blobUrl = `https://i1bjjylg9gcpwss2.public.blob.vercel-storage.com/designs/${id}.jpeg`;
      
      // Check if blob exists
      const blobInfo = await head(blobUrl);
      
      return res.status(200).json({
        success: true,
        designId: id,
        designUrl: blobInfo.url,
        downloadUrl: blobInfo.downloadUrl,
        size: blobInfo.size,
        uploadedAt: blobInfo.uploadedAt,
        storage: 'vercel-blob',
        message: 'Design retrieved successfully'
      });
    } catch (error) {
      // Blob not found - might be in localStorage
      console.log(`⚠️ Design ${id} not found in Vercel Blob:`, error.message);
      
      return res.status(404).json({
        success: false,
        designId: id,
        error: 'Design not found in cloud storage',
        storage: 'vercel-blob',
        fallback: {
          message: 'Design may be in browser localStorage',
          key: 'tshirt_designs_backup',
          instructions: 'Check customer browser localStorage for legacy designs'
        }
      });
    }

  } catch (error) {
    console.error('❌ Retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve design information',
      message: error.message
    });
  }
}

