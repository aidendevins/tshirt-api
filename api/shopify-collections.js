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
        sort_order: 'manual'
        // Temporarily removing metafields to test basic collection creation
        // metafields: [
        //   {
        //     namespace: 'creator',
        //     key: 'creator_id',
        //     value: creatorData.uid,
        //     type: 'single_line_text_field'
        //   },
        //   {
        //     namespace: 'creator',
        //     key: 'creator_email',
        //     value: creatorData.email,
        //     type: 'single_line_text_field'
        //   },
        //   {
        //     namespace: 'creator',
        //     key: 'collection_type',
        //     value: collectionType,
        //     type: 'single_line_text_field'
        //   }
        // ]
      }
    };

    const shopifyStoreUrl = process.env.SHOPIFY_STORE_URL;
    const url = `${shopifyStoreUrl}/admin/api/2025-04/custom_collections.json`;
    
    console.log('Creating collection:', collectionTitle);
    console.log('Request URL:', url);
    console.log('Access token (first 10 chars):', accessToken.substring(0, 10) + '...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(collectionData)
    });

    console.log('Response status:', response.status);

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
    
    console.log('Creating Shopify collections for creator:', creatorData.email);
    
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

    if (results.allSuccessful) {
      console.log('Successfully created both collections:', {
        creatorId: creatorCollection.collectionId,
        communityId: communityCollection.collectionId
      });
    } else {
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

export default router;
