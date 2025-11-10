import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Get product details with mockups from Printify
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Missing productId parameter'
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

    console.log(`📥 Fetching Printify product: ${productId}`);

    // Fetch product from Printify
    const response = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${productId}.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printify product fetch error: ${response.status} - ${errorText}`);
      
      return res.status(response.status).json({
        success: false,
        error: 'Failed to fetch Printify product',
        status: response.status,
        details: errorText
      });
    }

    const product = await response.json();
    
    console.log(`✅ Product fetched: ${product.title}`);
    console.log(`🖼️ Mockup images count: ${product.images ? product.images.length : 0}`);

    // Extract mockup URLs
    const mockups = product.images ? product.images.map(img => ({
      src: img.src,
      variant_ids: img.variant_ids,
      position: img.position,
      is_default: img.is_default
    })) : [];

    res.json({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        description: product.description,
        tags: product.tags,
        variants: product.variants,
        images: product.images,
        mockups: mockups,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        visible: product.visible,
        isLocked: product.is_locked,
        blueprintId: product.blueprint_id,
        printProviderId: product.print_provider_id,
        printAreas: product.print_areas
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Printify product:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

