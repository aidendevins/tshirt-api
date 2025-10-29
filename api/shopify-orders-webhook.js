// Shopify Orders Webhook -> Printify order creator (on hold)
// Expects Shopify orders/create webhook with line item properties containing Design_URL
// Env required: SHOPIFY_WEBHOOK_SECRET, PRINTIFY_API_KEY, PRINTIFY_SHOP_ID

import crypto from 'crypto';

// Disable body parsing to get raw body for HMAC verification
export const config = {
  api: {
    bodyParser: false,
  },
};

function verifyShopifyHmac(requestBody, hmacHeader, secret) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(requestBody, 'utf8')
    .digest('base64');
  return digest === hmacHeader;
}

// Map your Shopify variant IDs to Printify variant IDs
// Using Printify product: Unisex Jersey Short Sleeve Tee (Vintage White)
const SHOPIFY_TO_PRINTIFY_VARIANT = {
  '52646156239213': 64333, // Vintage White / S
};

// Upload image URL to Printify and get Printify image ID
async function uploadImageToPrintify(apiKey, imageUrl, fileName) {
  const res = await fetch(`https://api.printify.com/v1/uploads/images.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      file_name: fileName,
      url: imageUrl,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Printify image upload error ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log('Printify upload response:', data);
  return data.id; // Return the ID for creating products
}

// Create a custom product with the design
async function createCustomProduct(shopId, apiKey, imageId, variantId, designUrl) {
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      title: `Custom Design - ${Date.now()}`,
      description: `Custom design from ${designUrl.substring(0, 50)}`,
      blueprint_id: 6, // Unisex Jersey Short Sleeve Tee
      print_provider_id: 99, // Printify Choice
      variants: [
        {
          id: variantId,
          price: 2500, // $25 in cents
          is_enabled: true,
        },
      ],
      print_areas: [
        {
          variant_ids: [variantId],
          placeholders: [
            {
              position: 'front',
              images: [
                {
                  id: imageId,
                  x: 0.5,
                  y: 0.5,
                  scale: 1,
                  angle: 0,
                },
              ],
            },
          ],
        },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Printify product creation error ${res.status}: ${JSON.stringify(data)}`);
  }
  console.log('✅ Custom product created:', data);
  return data.id;
}

async function createPrintifyOrder(printifyShopId, apiKey, payload) {
  const res = await fetch(`https://api.printify.com/v1/shops/${printifyShopId}/orders.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Printify error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

// Helper to get raw body from request
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Shopify-Hmac-Sha256, X-Shopify-Topic');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const topic = req.headers['x-shopify-topic'];

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ success: false, error: 'Missing SHOPIFY_WEBHOOK_SECRET' });
  }

  const isValid = verifyShopifyHmac(rawBody, hmac, secret);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid HMAC' });
  }

  if (topic !== 'orders/create') {
    // Ignore other topics for now
    return res.status(200).json({ success: true, message: 'Ignored topic' });
  }

  const order = JSON.parse(rawBody);

  const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
  const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
    return res.status(500).json({ success: false, error: 'Missing Printify env vars' });
  }

  // NEW APPROACH: Create custom product first, then order
  const line_items = [];

  for (const item of order.line_items || []) {
    const props = item.properties || [];
    const designUrlProp = props.find(p => (p.name || p.key) === 'Design_URL' || (p.name || p.key) === '_Design_Image');
    const designUrl = designUrlProp?.value || designUrlProp?.[1];
    const printifyVariantId = SHOPIFY_TO_PRINTIFY_VARIANT[item.variant_id];

    if (!designUrl || !printifyVariantId) {
      continue;
    }

    const designIdProp = props.find(p => (p.name || p.key) === 'Design_ID');
    const designId = designIdProp?.value || designIdProp?.[1] || Date.now().toString();
    
    console.log(`🎨 Uploading design to Printify: ${designUrl}`);
    const printifyImageId = await uploadImageToPrintify(PRINTIFY_API_KEY, designUrl, `design-${designId}.jpg`);
    console.log(`✅ Image uploaded, ID: ${printifyImageId}`);

    // Create custom product with the design
    console.log(`🏭 Creating custom Printify product...`);
    const customProductId = await createCustomProduct(
      PRINTIFY_SHOP_ID,
      PRINTIFY_API_KEY,
      printifyImageId,
      printifyVariantId,
      designUrl
    );
    console.log(`✅ Custom product created: ${customProductId}`);

    // Add line item using the custom product (no print_areas needed)
    line_items.push({
      product_id: customProductId,
      variant_id: printifyVariantId,
      quantity: item.quantity || 1,
    });
  }

  if (line_items.length === 0) {
    return res.status(200).json({ success: true, message: 'No eligible items with design URL' });
  }

  // Get design URL for reference
  const firstItem = order.line_items?.[0];
  const props = firstItem?.properties || [];
  const designUrlProp = props.find(p => (p.name || p.key) === 'Design_URL');
  const designUrlForLabel = designUrlProp?.value || '';

  const payload = {
    external_id: `shopify-${order.id}`,
    label: `${order.name} | Design: ${designUrlForLabel.substring(0, 50)}...`,
    line_items,
    send_to_production: false, // manual approval
    shipping_method: 1, // default
    address_to: {
      first_name: order.shipping_address?.first_name || order.billing_address?.first_name || 'Customer',
      last_name: order.shipping_address?.last_name || order.billing_address?.last_name || 'Unknown',
      email: order.email || 'unknown@example.com',
      phone: order.phone || '',
      country: order.shipping_address?.country_code || 'US',
      region: order.shipping_address?.province || '',
      address1: order.shipping_address?.address1 || '',
      address2: order.shipping_address?.address2 || '',
      city: order.shipping_address?.city || '',
      zip: order.shipping_address?.zip || '',
    },
  };

  console.log('📦 Printify payload:', JSON.stringify(payload, null, 2));
  
  try {
    const created = await createPrintifyOrder(PRINTIFY_SHOP_ID, PRINTIFY_API_KEY, payload);
    console.log('✅ Printify order created:', JSON.stringify(created, null, 2));
    return res.status(200).json({ success: true, created });
  } catch (err) {
    console.error('❌ Printify order creation failed:', err);
    console.error('Error details:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}


