import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Create a new product in Shopify and add it to creator's collection
const createShopifyProduct = async (productData, creatorId) => {
  try {
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    
    if (!adminToken || !shopifyStoreUrl) {
      throw new Error('Shopify credentials not configured');
    }

    // Step 1: Find the creator's "Original Designs" collection
    const collectionsUrl = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections.json?limit=250`;
    const collectionsResponse = await fetch(collectionsUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      }
    });

    if (!collectionsResponse.ok) {
      throw new Error(`Failed to fetch collections: ${collectionsResponse.status}`);
    }

    const collectionsData = await collectionsResponse.json();
    let creatorCollection = null;

    // Find the creator's collection by checking metafields
    for (const collection of collectionsData.custom_collections || []) {
      const metafieldsUrl = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections/${collection.id}/metafields.json`;
      const metafieldsResponse = await fetch(metafieldsUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': adminToken,
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

    if (!creatorCollection) {
      throw new Error('Creator collection not found. Please create collections first.');
    }

    // Step 2: Create variants for each color and size combination
    const variants = [];
    for (const color of productData.availableColors) {
      for (const size of productData.availableSizes) {
        variants.push({
          option1: color.charAt(0).toUpperCase() + color.slice(1), // Color
          option2: size, // Size
          price: productData.price.toString(),
          sku: `${productData.title.replace(/\s+/g, '-').toLowerCase()}-${color}-${size}`,
          inventory_management: 'shopify',
          inventory_policy: 'deny',
          inventory_quantity: 100, // Adjust as needed
          weight: 200, // grams
          weight_unit: 'g'
        });
      }
    }

    // Step 3: Create the product
    const productPayload = {
      product: {
        title: productData.title,
        body_html: productData.description || '',
        vendor: 'Custom Creator Design',
        product_type: 'T-Shirt',
        tags: ['custom-design', 'creator-original', `creator-${creatorId}`],
        status: 'active',
        published: true,
        options: [
          {
            name: 'Color',
            values: productData.availableColors.map(c => c.charAt(0).toUpperCase() + c.slice(1))
          },
          {
            name: 'Size',
            values: productData.availableSizes
          }
        ],
        variants: variants,
        images: productData.images ? productData.images.map((img, index) => {
          // Handle both base64 (editor images) and URLs (Printify mockups)
          if (img.data && img.data.startsWith('data:')) {
            // Base64 image from editor
            return {
              attachment: img.data.split(',')[1],
              filename: `${productData.title.replace(/\s+/g, '-')}-${img.view || index}.png`,
              alt: `${productData.title} - ${img.view || `View ${index + 1}`}`
            };
          } else if (img.data && (img.data.startsWith('http://') || img.data.startsWith('https://'))) {
            // External URL from Printify mockups
            return {
              src: img.data,
              alt: `${productData.title} - ${img.view || 'mockup'}`
            };
          }
          return null;
        }).filter(Boolean) : [{
          attachment: productData.imageUrl ? productData.imageUrl.split(',')[1] : '',
          filename: `${productData.title.replace(/\s+/g, '-')}.png`
        }],
        metafields: [
          {
            namespace: 'custom',
            key: 'creator_id',
            value: creatorId,
            type: 'single_line_text_field'
          },
          {
            namespace: 'custom',
            key: 'design_timestamp',
            value: productData.timestamp,
            type: 'single_line_text_field'
          },
          // Store Printify product ID for reference
          ...(productData.printifyProductId ? [{
            namespace: 'printify',
            key: 'product_id',
            value: productData.printifyProductId,
            type: 'single_line_text_field'
          }] : [])
        ]
      }
    };

    const createProductUrl = `${shopifyStoreUrl}/admin/api/2025-04/products.json`;
    const createProductResponse = await fetch(createProductUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productPayload)
    });

    if (!createProductResponse.ok) {
      const errorData = await createProductResponse.json().catch(() => ({}));
      console.error('Product creation error:', errorData);
      throw new Error(`Failed to create product: ${createProductResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const newProduct = await createProductResponse.json();
    const productId = newProduct.product.id;

    // Step 4: Add the product to the creator's collection
    const addToCollectionUrl = `${shopifyStoreUrl}/admin/api/2025-04/collects.json`;
    const addToCollectionResponse = await fetch(addToCollectionUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        collect: {
          product_id: productId,
          collection_id: creatorCollection.id
        }
      })
    });

    if (!addToCollectionResponse.ok) {
      console.error('Failed to add product to collection, but product was created');
    }

    return {
      success: true,
      product: {
        id: productId,
        title: newProduct.product.title,
        handle: newProduct.product.handle,
        url: `${shopifyStoreUrl.replace('/admin', '')}/products/${newProduct.product.handle}`,
        adminUrl: `${shopifyStoreUrl}/admin/products/${productId}`
      },
      collection: {
        id: creatorCollection.id,
        title: creatorCollection.title
      }
    };

  } catch (error) {
    console.error('Error creating Shopify product:', error);
    throw error;
  }
};

// POST endpoint to create a product
router.post('/create-product', async (req, res) => {
  try {
    const { productData, creatorId } = req.body;

    if (!productData || !creatorId) {
      return res.status(400).json({ 
        error: 'Missing required fields: productData and creatorId' 
      });
    }

    // Validate required product fields
    if (!productData.title || !productData.price) {
      return res.status(400).json({ 
        error: 'Missing required product fields: title or price' 
      });
    }

    if (!productData.images && !productData.imageUrl) {
      return res.status(400).json({ 
        error: 'Missing product images' 
      });
    }

    if (!productData.availableColors || productData.availableColors.length === 0) {
      return res.status(400).json({ 
        error: 'At least one color must be selected' 
      });
    }

    if (!productData.availableSizes || productData.availableSizes.length === 0) {
      return res.status(400).json({ 
        error: 'At least one size must be selected' 
      });
    }

    const result = await createShopifyProduct(productData, creatorId);

    res.json({
      success: true,
      message: 'Product created successfully',
      ...result
    });

  } catch (error) {
    console.error('Create product endpoint error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create product',
      message: error.message 
    });
  }
});

export default router;

