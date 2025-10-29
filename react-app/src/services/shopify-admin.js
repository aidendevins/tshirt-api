// Shopify Admin API service (no OAuth required)
const SHOPIFY_BASE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL;
const SHOPIFY_ADMIN_TOKEN = import.meta.env.VITE_SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_API_VERSION = '2025-04';

// Helper function to make authenticated Shopify API requests using Admin token
const makeShopifyRequest = async (endpoint, method = 'GET', data = null) => {
  if (!SHOPIFY_ADMIN_TOKEN) {
    throw new Error('Shopify Admin API token not configured');
  }

  const url = `${SHOPIFY_BASE_URL}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
  
  const headers = {
    'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
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
export const createCreatorCollection = async (creatorData, collectionType) => {
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
        // Add custom metafields to track creator info
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

    console.log('Creating collection:', collectionTitle);
    const response = await makeShopifyRequest('custom_collections.json', 'POST', collectionData);
    
    return {
      success: true,
      collectionId: response.custom_collection.id,
      collectionTitle: response.custom_collection.title,
      collectionHandle: response.custom_collection.handle
    };

  } catch (error) {
    console.error(`Failed to create ${collectionType} collection:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create both collections for a new creator via backend
export const createCreatorCollections = async (creatorData) => {
  try {
    console.log('Creating Shopify collections for creator:', creatorData.email);
    
    const response = await fetch('/api/shopify/collections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        creatorData: creatorData
      })
    });

    if (!response.ok) {
      throw new Error(`Collection creation failed: ${response.status}`);
    }

    const results = await response.json();
    
    if (results.allSuccessful) {
      console.log('Successfully created both collections:', {
        creatorId: results.creatorCollection.collectionId,
        communityId: results.communityCollection.collectionId
      });
    } else {
      console.error('Failed to create some collections:', results);
    }

    return results;

  } catch (error) {
    console.error('Error creating creator collections:', error);
    return {
      creatorCollection: { success: false, error: error.message },
      communityCollection: { success: false, error: error.message },
      allSuccessful: false
    };
  }
};

// Get collection by ID
export const getCollection = async (collectionId) => {
  try {
    const response = await makeShopifyRequest(`custom_collections/${collectionId}.json`);
    return response.custom_collection;
  } catch (error) {
    console.error('Failed to get collection:', error);
    throw error;
  }
};

// Update collection
export const updateCollection = async (collectionId, updates) => {
  try {
    const collectionData = {
      custom_collection: {
        id: collectionId,
        ...updates
      }
    };
    
    const response = await makeShopifyRequest(`custom_collections/${collectionId}.json`, 'PUT', collectionData);
    return response.custom_collection;
  } catch (error) {
    console.error('Failed to update collection:', error);
    throw error;
  }
};

// Delete collection
export const deleteCollection = async (collectionId) => {
  try {
    await makeShopifyRequest(`custom_collections/${collectionId}.json`, 'DELETE');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete collection:', error);
    throw error;
  }
};
