import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Helper function to make authenticated Shopify API requests from backend
const makeShopifyRequest = async (endpoint, method = 'GET', data = null) => {
  const accessToken = req.headers['x-shopify-access-token'];
  
  if (!accessToken) {
    throw new Error('No Shopify access token provided');
  }

  const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
  const url = `${shopifyStoreUrl}/admin/api/2025-04/${endpoint}`;
  
  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json',
  };

  const config = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Shopify API Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Shopify API Request Failed:', error);
    throw error;
  }
};

// Create a custom collection for a creator
const createCreatorCollection = async (creatorData, collectionType, accessToken) => {
  try {
    const collectionTitle = collectionType === 'creator' 
      ? `${creatorData.businessName} - Original Designs`
      : `${creatorData.businessName} - Community Designs`;
    
    const collectionDescription = collectionType === 'creator'
      ? `Original designs created by ${creatorData.firstName} ${creatorData.lastName} from ${creatorData.businessName}`
      : `Community designs created by fans using ${creatorData.businessName}'s AI design tool`;

    const collectionData = {
      custom_collection: {
        title: collectionTitle,
        body_html: `<p>${collectionDescription}</p>`,
        published: true,
        sort_order: 'manual',
        metafields: [
          {
            namespace: 'creator',
            key: 'creator_id',
            value: creatorData.uid,
            type: 'single_line_text_field'
          },
          {
            namespace: 'creator',
            key: 'creator_email',
            value: creatorData.email,
            type: 'single_line_text_field'
          },
          {
            namespace: 'creator',
            key: 'collection_type',
            value: collectionType,
            type: 'single_line_text_field'
          }
        ]
      }
    };

    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Shopify API Error Response:', errorData);
      throw new Error(`Shopify API Error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      collectionId: result.custom_collection.id,
      collectionTitle: result.custom_collection.title,
      collectionHandle: result.custom_collection.handle
    };

  } catch (error) {
    console.error(`Failed to create ${collectionType} collection:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Test token permissions
router.post('/test-token', async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'No access token provided' });
    }

    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/shop.json`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      res.json({ valid: true });
    } else {
      res.status(403).json({ valid: false, error: 'Token invalid or insufficient permissions' });
    }

  } catch (error) {
    console.error('Token test error:', error);
    res.status(500).json({ valid: false, error: error.message });
  }
});

// Create both collections for a new creator using Admin API
router.post('/collections', async (req, res) => {
  try {
    const { creatorData } = req.body;
    
    // Use Admin API token from environment
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!adminToken) {
      return res.status(500).json({
        creatorCollection: { success: false, error: 'Admin API token not configured' },
        communityCollection: { success: false, error: 'Admin API token not configured' },
        allSuccessful: false
      });
    }
    
    // Create creator designs collection
    const creatorCollection = await createCreatorCollection(creatorData, 'creator', adminToken);
    
    // Create community designs collection
    const communityCollection = await createCreatorCollection(creatorData, 'community', adminToken);
    
    const results = {
      creatorCollection: creatorCollection,
      communityCollection: communityCollection,
      allSuccessful: creatorCollection.success && communityCollection.success
    };

    if (!results.allSuccessful) {
      console.error('Failed to create some collections:', results);
    }

    res.json(results);

  } catch (error) {
    console.error('Error creating creator collections:', error);
    res.status(500).json({
      creatorCollection: { success: false, error: error.message },
      communityCollection: { success: false, error: error.message },
      allSuccessful: false
    });
  }
});

// Get products from a specific collection
const getProductsFromCollection = async (collectionId, accessToken) => {
  try {
    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/collections/${collectionId}/products.json`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`);
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error fetching products from collection:', error);
    return [];
  }
};

// Get all collections from Shopify with metafields
const getAllCollections = async (accessToken) => {
  try {
    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections.json?limit=250&fields=id,title,handle,metafields`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.status}`);
    }

    const data = await response.json();
    const collections = data.custom_collections || [];
    
    // For each collection, fetch its metafields separately
    const collectionsWithMetafields = await Promise.all(
      collections.map(async (collection) => {
        try {
          const metafieldsUrl = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections/${collection.id}/metafields.json`;
          const metafieldsResponse = await fetch(metafieldsUrl, {
            method: 'GET',
            headers: {
              'X-Shopify-Access-Token': accessToken,
              'Content-Type': 'application/json',
            }
          });
          
          if (metafieldsResponse.ok) {
            const metafieldsData = await metafieldsResponse.json();
            collection.metafields = metafieldsData.metafields || [];
          } else {
            collection.metafields = [];
          }
        } catch (error) {
          console.error(`Error fetching metafields for collection ${collection.id}:`, error);
          collection.metafields = [];
        }
        
        return collection;
      })
    );
    
    return collectionsWithMetafields;
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
};

// Get all products for a creator's collections
router.get('/creator-products/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    if (!adminToken) {
      return res.status(500).json({ 
        error: 'Admin API token not configured',
        creatorProducts: [],
        communityProducts: []
      });
    }
    
    // Get all collections from Shopify
    const allCollections = await getAllCollections(adminToken);
    
    // Filter collections by creator ID in metafields
    const creatorCollections = allCollections.filter(collection => {
      // Check if collection has metafields with creator_id matching our creatorId
      return collection.metafields && 
             collection.metafields.some(metafield => 
               metafield.namespace === 'creator' && 
               metafield.key === 'creator_id' && 
               metafield.value === creatorId
             );
    });
    
    if (creatorCollections.length === 0) {
      return res.json({
        creatorProducts: [],
        communityProducts: [],
        message: 'No collections found for this creator'
      });
    }
    
    // Separate creator designs from community designs based on collection type
    const creatorDesignsCollection = creatorCollections.find(collection => {
      return collection.metafields.some(metafield => 
        metafield.namespace === 'creator' && 
        metafield.key === 'collection_type' && 
        metafield.value === 'creator'
      );
    });
    
    const communityDesignsCollection = creatorCollections.find(collection => {
      return collection.metafields.some(metafield => 
        metafield.namespace === 'creator' && 
        metafield.key === 'collection_type' && 
        metafield.value === 'community'
      );
    });
    
    // Fetch products from both collections
    const [creatorProducts, communityProducts] = await Promise.all([
      creatorDesignsCollection ? getProductsFromCollection(creatorDesignsCollection.id, adminToken) : [],
      communityDesignsCollection ? getProductsFromCollection(communityDesignsCollection.id, adminToken) : []
    ]);
    
    res.json({
      creatorProducts: creatorProducts.map(product => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        price: product.variants?.[0]?.price || '0.00',
        image: product.images?.[0]?.src || '/placeholder-tshirt.jpg',
        images: product.images?.map(img => img.src) || [], // Include all image URLs
        status: product.status,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        vendor: product.vendor,
        productType: product.product_type,
        tags: product.tags
      })),
      communityProducts: communityProducts.map(product => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        price: product.variants?.[0]?.price || '0.00',
        image: product.images?.[0]?.src || '/placeholder-tshirt.jpg',
        images: product.images?.map(img => img.src) || [], // Include all image URLs
        status: product.status,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        vendor: product.vendor,
        productType: product.product_type,
        tags: product.tags,
        // Extract fan name from vendor or tags if available
        fanName: product.vendor || 'Unknown Fan'
      }))
    });

  } catch (error) {
    console.error('Error fetching creator products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      message: error.message,
      creatorProducts: [],
      communityProducts: []
    });
  }
});

// Get a single collection by ID
router.get('/collection/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    
    if (!adminToken) {
      return res.status(500).json({ error: 'Admin API token not configured' });
    }

    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections/${collectionId}.json`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: 'Failed to fetch collection',
        details: errorData 
      });
    }

    const data = await response.json();
    res.json({ collection: data.custom_collection });

  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection', message: error.message });
  }
});

// Update a collection
router.put('/collection/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { updates } = req.body;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    
    if (!adminToken) {
      return res.status(500).json({ error: 'Admin API token not configured' });
    }

    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections/${collectionId}.json`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        custom_collection: {
          id: collectionId,
          ...updates
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: 'Failed to update collection',
        details: errorData 
      });
    }

    const data = await response.json();
    res.json({ collection: data.custom_collection });

  } catch (error) {
    console.error('Error updating collection:', error);
    res.status(500).json({ error: 'Failed to update collection', message: error.message });
  }
});

// Delete a collection
router.delete('/collection/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    
    if (!adminToken) {
      return res.status(500).json({ error: 'Admin API token not configured' });
    }

    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections/${collectionId}.json`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({ 
        error: 'Failed to delete collection',
        details: errorData 
      });
    }

    res.json({ success: true, message: 'Collection deleted successfully' });

  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Failed to delete collection', message: error.message });
  }
});

export default router;
