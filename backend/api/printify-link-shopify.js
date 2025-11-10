import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Link Printify product to existing Shopify product for auto-fulfillment
router.post('/link-to-shopify', async (req, res) => {
  try {
    const { printifyProductId, shopifyProductId } = req.body;
    
    if (!printifyProductId) {
      return res.status(400).json({
        success: false,
        error: 'Missing printifyProductId'
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

    console.log(`🔗 Linking Printify product ${printifyProductId} to Shopify product ${shopifyProductId}...`);

    // Step 1: Make product visible in Printify (required for publishing)
    console.log('🔄 Step 1: Making product visible...');
    const updateResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${printifyProductId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visible: true
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`❌ Failed to make product visible: ${errorText}`);
      throw new Error(`Failed to update Printify product: ${updateResponse.status}`);
    }

    console.log('✅ Product made visible');

    // Step 2: Publish to Shopify (links them for fulfillment)
    // IMPORTANT: We set all fields to false to preserve the Shopify product we just created
    console.log('🔄 Step 2: Publishing to Shopify (linking only, no data sync)...');
    const publishResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${printifyProductId}/publish.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: false,         // Don't overwrite our Shopify title
          description: false,   // Don't overwrite our Shopify description
          images: false,        // Don't overwrite our Shopify images
          variants: true,       // Sync variants for fulfillment matching
          tags: false,          // Don't overwrite our Shopify tags
          keyFeatures: false,
          shippingTemplate: false
        })
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error(`❌ Failed to publish to Shopify: ${errorText}`);
      
      // Return error but with more context
      return res.status(publishResponse.status).json({
        success: false,
        error: 'Failed to link Printify product to Shopify',
        details: errorText,
        message: 'Product was created in Shopify but Printify linking failed. You may need to manually connect them in Printify dashboard.',
        printifyDashboardUrl: `https://printify.com/app/products/${printifyProductId}`
      });
    }

    const publishResult = await publishResponse.json();
    console.log('✅ Printify product linked to Shopify');
    console.log('📦 Shopify external_id:', publishResult.external_id);

    // Verify the link was successful
    const linkedShopifyId = publishResult.external_id;
    
    if (!linkedShopifyId) {
      console.warn('⚠️ No external_id returned. Link may have failed.');
      return res.json({
        success: false,
        warning: 'Link completed but no Shopify ID returned',
        message: 'Please verify the connection in Printify dashboard',
        printifyDashboardUrl: `https://printify.com/app/products/${printifyProductId}`
      });
    }

    // Success!
    res.json({
      success: true,
      message: 'Printify product successfully linked to Shopify for auto-fulfillment',
      printifyProductId: printifyProductId,
      shopifyProductId: linkedShopifyId,
      note: 'Orders on this Shopify product will now auto-route to Printify for fulfillment'
    });

  } catch (error) {
    console.error('❌ Error linking Printify product:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;

