import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Position mappings for Printify print areas
const POSITION_MAPPINGS = {
  'front': 'front',
  'back': 'back',
  'leftSleeve': 'left_sleeve',
  'rightSleeve': 'right_sleeve',
  'neckLabel': 'label_inside'
};

// Create a product in Printify
router.post('/create-product', async (req, res) => {
  try {
    const { 
      title, 
      description, 
      uploadedImageIds,  // { front: 'id1', back: 'id2', leftSleeve: 'id3', rightSleeve: 'id4', neckLabel: 'id5' }
      variants,          // Array of variant objects with { id, price, is_enabled }
      blueprintId = 6,   // T-shirt
      printProviderId = 99 // Default provider
    } = req.body;
    
    if (!title || !uploadedImageIds || !variants || variants.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, uploadedImageIds, or variants'
      });
    }

    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const shopId = process.env.PRINTIFY_SHOP_ID;
    
    if (!printifyApiKey || !shopId) {
      console.error('❌ PRINTIFY_API_KEY or PRINTIFY_SHOP_ID not found');
      return res.status(500).json({ 
        success: false,
        error: 'Printify credentials not configured'
      });
    }

    console.log(`🎨 Creating Printify product: ${title}`);
    console.log(`📦 Variants count: ${variants.length}`);
    console.log(`🖼️ Uploaded image IDs:`, uploadedImageIds);

    // Build print areas from uploaded images
    const placeholders = [];
    const variantIds = variants.map(v => v.id);

    // Add each design to its respective position
    for (const [view, imageId] of Object.entries(uploadedImageIds)) {
      if (imageId) {
        const position = POSITION_MAPPINGS[view];
        if (position) {
          placeholders.push({
            position: position,
            images: [{
              id: imageId,
              x: 0.5,
              y: 0.5,
              scale: position.includes('sleeve') ? 0.8 : 1,
              angle: 0
            }]
          });
        }
      }
    }

    if (placeholders.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid designs to apply. Please upload at least one design.'
      });
    }

    console.log(`📍 Print areas: ${placeholders.length} positions`);

    // Create product in Printify
    const productPayload = {
      title: title,
      description: description || 'Custom designed t-shirt',
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variants: variants,
      print_areas: [{
        variant_ids: variantIds,
        placeholders: placeholders
      }]
    };

    console.log('📤 Sending product creation request to Printify...');
    
    const response = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productPayload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printify product creation error: ${response.status} - ${errorText}`);
      
      return res.status(response.status).json({
        success: false,
        error: 'Failed to create Printify product',
        status: response.status,
        details: errorText
      });
    }

    const result = await response.json();
    
    console.log(`✅ Printify product created: ${result.id}`);

    res.json({
      success: true,
      productId: result.id,
      title: result.title,
      description: result.description,
      createdAt: result.created_at,
      blueprintId: result.blueprint_id,
      printProviderId: result.print_provider_id,
      variantsCount: result.variants ? result.variants.length : 0
    });

  } catch (error) {
    console.error('❌ Error creating Printify product:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

