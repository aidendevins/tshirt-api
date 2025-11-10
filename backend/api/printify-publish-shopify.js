import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Publish Printify product to Shopify
router.post('/publish-to-shopify', async (req, res) => {
  try {
    const { 
      printifyProductId,
      title,
      description,
      tags = [],
      creatorId,
      editorImages = []  // The 5 editor images to add alongside Printify mockups
    } = req.body;
    
    if (!printifyProductId) {
      return res.status(400).json({
        success: false,
        error: 'Missing printifyProductId'
      });
    }

    const printifyApiKey = process.env.PRINTIFY_API_KEY;
    const shopId = process.env.PRINTIFY_SHOP_ID;
    const shopifyAdminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    
    if (!printifyApiKey || !shopId) {
      console.error('❌ PRINTIFY_API_KEY or PRINTIFY_SHOP_ID not found');
      return res.status(500).json({ 
        success: false,
        error: 'Printify credentials not configured'
      });
    }

    if (!shopifyAdminToken || !shopifyStoreUrl) {
      console.error('❌ Shopify credentials not found');
      return res.status(500).json({ 
        success: false,
        error: 'Shopify credentials not configured'
      });
    }

    console.log(`📤 Publishing Printify product ${printifyProductId} to Shopify...`);

    // Step 1: Make the product visible/published in Printify
    console.log('🔄 Step 1: Making product visible in Printify...');
    const updateResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${printifyProductId}.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          description: description,
          tags: tags.concat(['custom-design', 'creator-original']),
          visible: true
        })
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`❌ Failed to update product: ${errorText}`);
      throw new Error(`Failed to update Printify product: ${updateResponse.status}`);
    }

    console.log('✅ Product updated in Printify');

    // Step 1.5: Check if product has mockups (may need to wait)
    console.log('🔄 Step 1.5: Checking product status...');
    const productCheckResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${printifyProductId}.json`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (productCheckResponse.ok) {
      const productData = await productCheckResponse.json();
      console.log(`✅ Product status: ${productData.is_locked ? 'Locked' : 'Ready'}`);
      console.log(`✅ Product visible: ${productData.visible}`);
      console.log(`✅ Mockups count: ${productData.images?.length || 0}`);
      
      if (productData.is_locked) {
        console.warn('⚠️ Product is locked (mockups might still be generating)');
      }
    }

    // Step 2: Publish to Shopify via Printify API
    console.log('🔄 Step 2: Publishing to Shopify...');
    const publishResponse = await fetch(
      `https://api.printify.com/v1/shops/${shopId}/products/${printifyProductId}/publish.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${printifyApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: true,
          description: true,
          images: true,
          variants: true,
          tags: true,
          keyFeatures: false,
          shippingTemplate: false
        })
      }
    );

    if (!publishResponse.ok) {
      const errorText = await publishResponse.text();
      console.error(`❌ Failed to publish to Shopify: ${errorText}`);
      throw new Error(`Failed to publish to Shopify: ${publishResponse.status}`);
    }

    const publishResult = await publishResponse.json();
    console.log('✅ Product publish response:', JSON.stringify(publishResult, null, 2));
    console.log('📦 Shopify product ID:', publishResult.external_id);

    // Step 3: Get the Shopify product ID and add to creator's collection
    const shopifyProductId = publishResult.external_id;
    
    // If external_id is missing, the product might not be ready or Shopify connection issue
    if (!shopifyProductId) {
      console.error('⚠️ No external_id in publish response. Product may not be ready or Shopify not connected.');
      console.error('Full response:', publishResult);
      
      // Return partial success - product created in Printify but not published to Shopify
      return res.json({
        success: false,
        error: 'Product created in Printify but failed to publish to Shopify',
        message: 'Please check your Printify-Shopify connection and try publishing manually from Printify dashboard',
        printifyProductId: printifyProductId,
        printifyDashboardUrl: `https://printify.com/app/products/${printifyProductId}`,
        details: publishResult
      });
    }

    if (creatorId && shopifyProductId) {
      try {
        console.log('🔄 Step 3: Adding to creator collection...');
        
        // Find creator's collection
        const collectionsUrl = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections.json?limit=250`;
        const collectionsResponse = await fetch(collectionsUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': shopifyAdminToken,
            'Content-Type': 'application/json',
          }
        });

        if (collectionsResponse.ok) {
          const collectionsData = await collectionsResponse.json();
          let creatorCollection = null;

          // Find the creator's collection
          for (const collection of collectionsData.custom_collections || []) {
            const metafieldsUrl = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections/${collection.id}/metafields.json`;
            const metafieldsResponse = await fetch(metafieldsUrl, {
              method: 'GET',
              headers: {
                'X-Shopify-Access-Token': shopifyAdminToken,
                'Content-Type': 'application/json',
              }
            });

            if (metafieldsResponse.ok) {
              const metafieldsData = await metafieldsResponse.json();
              const metafields = metafieldsData.metafields || [];
              
              const hasCreatorId = metafields.some(m => 
                m.namespace === 'creator' && 
                m.key === 'creator_id' && 
                m.value === creatorId
              );
              
              const isCreatorCollection = metafields.some(m => 
                m.namespace === 'creator' && 
                m.key === 'collection_type' && 
                m.value === 'creator'
              );

              if (hasCreatorId && isCreatorCollection) {
                creatorCollection = collection;
                break;
              }
            }
          }

          if (creatorCollection) {
            // Add product to collection
            const addToCollectionUrl = `${shopifyStoreUrl}/admin/api/2025-04/collects.json`;
            const addToCollectionResponse = await fetch(addToCollectionUrl, {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': shopifyAdminToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                collect: {
                  product_id: shopifyProductId,
                  collection_id: creatorCollection.id
                }
              })
            });

            if (addToCollectionResponse.ok) {
              console.log('✅ Product added to creator collection');
            } else {
              console.log('⚠️ Failed to add product to collection, but product was published');
            }
          }
        }

        // Step 4: Add editor images as additional product images
        if (editorImages && editorImages.length > 0) {
          console.log(`🔄 Step 4: Adding ${editorImages.length} editor images to Shopify product...`);
          
          for (const editorImage of editorImages) {
            if (!editorImage.data) continue;
            
            try {
              const imagePayload = {
                image: {
                  attachment: editorImage.data.split(',')[1], // Base64 without prefix
                  alt: `${title} - ${editorImage.view || 'design view'}`
                }
              };

              const addImageResponse = await fetch(
                `${shopifyStoreUrl}/admin/api/2025-04/products/${shopifyProductId}/images.json`,
                {
                  method: 'POST',
                  headers: {
                    'X-Shopify-Access-Token': shopifyAdminToken,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(imagePayload)
                }
              );

              if (addImageResponse.ok) {
                console.log(`✅ Added editor image: ${editorImage.view}`);
              } else {
                console.log(`⚠️ Failed to add editor image: ${editorImage.view}`);
              }
            } catch (imgError) {
              console.error(`Error adding editor image ${editorImage.view}:`, imgError);
            }
          }
        }

        // Step 5: Add metafields for tracking
        console.log('🔄 Step 5: Adding product metafields...');
        
        const metafieldsPayload = {
          metafield: {
            namespace: 'printify',
            key: 'product_id',
            value: printifyProductId,
            type: 'single_line_text_field'
          }
        };

        await fetch(
          `${shopifyStoreUrl}/admin/api/2025-04/products/${shopifyProductId}/metafields.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': shopifyAdminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metafieldsPayload)
          }
        );

        if (creatorId) {
          const creatorMetafield = {
            metafield: {
              namespace: 'custom',
              key: 'creator_id',
              value: creatorId,
              type: 'single_line_text_field'
            }
          };

          await fetch(
            `${shopifyStoreUrl}/admin/api/2025-04/products/${shopifyProductId}/metafields.json`,
            {
              method: 'POST',
              headers: {
                'X-Shopify-Access-Token': shopifyAdminToken,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(creatorMetafield)
            }
          );
        }

        console.log('✅ Metafields added');

      } catch (collectionError) {
        console.error('Error with collection/images:', collectionError);
        // Don't fail the whole request if collection management fails
      }
    }

    // Get product handle for URL
    let productHandle = null;
    if (shopifyProductId) {
      try {
        const productResponse = await fetch(
          `${shopifyStoreUrl}/admin/api/2025-04/products/${shopifyProductId}.json`,
          {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': shopifyAdminToken,
              'Content-Type': 'application/json',
            }
          }
        );

        if (productResponse.ok) {
          const productData = await productResponse.json();
          productHandle = productData.product.handle;
        }
      } catch (handleError) {
        console.error('Error fetching product handle:', handleError);
      }
    }

    res.json({
      success: true,
      message: 'Product published to Shopify successfully',
      printifyProductId: printifyProductId,
      shopifyProductId: shopifyProductId,
      productUrl: productHandle ? `${shopifyStoreUrl.replace('/admin', '')}/products/${productHandle}` : null,
      adminUrl: shopifyProductId ? `${shopifyStoreUrl}/admin/products/${shopifyProductId}` : null
    });

  } catch (error) {
    console.error('❌ Error publishing to Shopify:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish to Shopify',
      message: error.message
    });
  }
});

export default router;

