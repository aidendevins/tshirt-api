// Shopify OAuth service for authentication
const SHOPIFY_BASE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL;
const SHOPIFY_CLIENT_ID = import.meta.env.VITE_SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = import.meta.env.VITE_SHOPIFY_CLIENT_SECRET;
const SHOPIFY_API_VERSION = '2025-04';

// OAuth configuration
const OAUTH_REDIRECT_URI = `${window.location.origin}/shopify/callback`;
const OAUTH_SCOPES = 'write_products,read_products';

// Debug function to log OAuth configuration
const logOAuthConfig = () => {
  console.log('OAuth Configuration:', {
    baseUrl: SHOPIFY_BASE_URL,
    clientId: SHOPIFY_CLIENT_ID,
    redirectUri: OAUTH_REDIRECT_URI,
    scopes: OAUTH_SCOPES,
    hasClientSecret: !!SHOPIFY_CLIENT_SECRET
  });
};

// Storage keys for OAuth tokens
const ACCESS_TOKEN_KEY = 'shopify_access_token';
const TOKEN_EXPIRY_KEY = 'shopify_token_expiry';

// Generate OAuth authorization URL
export const getShopifyAuthUrl = () => {
  // Log configuration for debugging
  logOAuthConfig();
  
  // Validate required configuration
  if (!SHOPIFY_CLIENT_ID) {
    throw new Error('SHOPIFY_CLIENT_ID is not configured');
  }
  
  if (!SHOPIFY_BASE_URL || SHOPIFY_BASE_URL.includes('your-store')) {
    throw new Error('SHOPIFY_STORE_URL is not configured properly');
  }

  const params = new URLSearchParams({
    client_id: SHOPIFY_CLIENT_ID,
    scope: OAUTH_SCOPES,
    redirect_uri: OAUTH_REDIRECT_URI,
    state: 'creator_platform_auth', // Optional: add CSRF protection
    'grant_options[]': 'per-user'
  });

  const authUrl = `${SHOPIFY_BASE_URL}/admin/oauth/authorize?${params.toString()}`;
  console.log('Generated OAuth URL:', authUrl);
  
  return authUrl;
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code) => {
  try {
    const response = await fetch(`${SHOPIFY_BASE_URL}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code: code
      })
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Store token with expiry (Shopify tokens typically last 24 hours)
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

    return data.access_token;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

// Get stored access token
export const getStoredAccessToken = () => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  if (!token || !expiry) {
    return null;
  }

  // Check if token is expired
  if (Date.now() > parseInt(expiry)) {
    clearStoredToken();
    return null;
  }

  return token;
};

// Clear stored token
export const clearStoredToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

// Check if we have a valid token
export const hasValidToken = () => {
  return getStoredAccessToken() !== null;
};

// Get access token (either stored or trigger OAuth)
export const getAccessToken = async () => {
  const storedToken = getStoredAccessToken();
  if (storedToken) {
    return storedToken;
  }

  // If no stored token, redirect to OAuth
  window.location.href = getShopifyAuthUrl();
  return null;
};

// Helper function to make authenticated Shopify API requests
const makeShopifyRequest = async (endpoint, method = 'GET', data = null) => {
  const accessToken = await getAccessToken();
  
  if (!accessToken) {
    throw new Error('No valid access token available');
  }

  const url = `${SHOPIFY_BASE_URL}/admin/api/${SHOPIFY_API_VERSION}/${endpoint}`;
  
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
      if (response.status === 401) {
        // Token expired, clear it and redirect to OAuth
        clearStoredToken();
        window.location.href = getShopifyAuthUrl();
        return;
      }
      
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
        template_suffix: '',
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

// Create both collections for a new creator
export const createCreatorCollections = async (creatorData) => {
  try {
    console.log('Creating Shopify collections for creator:', creatorData.email);
    
    // Create creator designs collection
    const creatorCollection = await createCreatorCollection(creatorData, 'creator');
    
    // Create community designs collection
    const communityCollection = await createCreatorCollection(creatorData, 'community');
    
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
