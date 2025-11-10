import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Upload image to Printify
router.post('/upload-image', async (req, res) => {
  try {
    const { imageData, fileName, creatorId } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Missing imageData'
      });
    }

    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    
    if (!printifyApiKey) {
      console.error('❌ PRINTIFY_API_KEY not found');
      return res.status(500).json({ 
        success: false,
        error: 'Printify credentials not configured',
        message: 'Please set PRINTIFY_API_KEY in environment variables'
      });
    }

    // Add creator ID to filename for tracking
    const finalFileName = creatorId 
      ? `creator-${creatorId}-${fileName || 'design.png'}`
      : fileName || 'design.png';

    console.log(`📤 Uploading image to Printify: ${finalFileName}`);

    // Printify expects ONLY the base64 string WITHOUT the data URL prefix
    let base64String = imageData;
    if (base64String.includes(',')) {
      // Remove "data:image/png;base64," prefix if present
      base64String = base64String.split(',')[1];
    }

    // Upload to Printify images endpoint
    const response = await fetch(
      'https://api.printify.com/v1/uploads/images.json',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          file_name: finalFileName,
          contents: base64String
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printify upload error: ${response.status} - ${errorText}`);
      
      return res.status(response.status).json({
        success: false,
        error: 'Failed to upload image to Printify',
        status: response.status,
        details: errorText
      });
    }

    const result = await response.json();
    
    console.log(`✅ Image uploaded to Printify: ${result.id}`);

    res.json({
      success: true,
      imageId: result.id,
      fileName: result.file_name,
      width: result.width,
      height: result.height,
      size: result.size,
      mimeType: result.mime_type,
      previewUrl: result.preview_url
    });

  } catch (error) {
    console.error('❌ Error uploading image to Printify:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

