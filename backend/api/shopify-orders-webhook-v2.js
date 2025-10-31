// ALTERNATIVE APPROACH: Create custom Printify product, then order
// This might be what's required for custom designs

import crypto from 'crypto';

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

// Upload image to Printify
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
  return data.id; // Return image ID
}

// Create a custom product with the design
async function createCustomProduct(shopId, apiKey, blueprintId, printProviderId, variantIds, imageId) {
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      title: `Custom Design ${Date.now()}`,
      description: 'Custom T-shirt design',
      blueprint_id: blueprintId, // 6 for "Unisex Jersey Short Sleeve Tee"
      print_provider_id: printProviderId, // Use your print provider
      variants: variantIds.map(vid => ({
        id: vid,
        price: 2500, // $25.00 in cents
        is_enabled: true,
      })),
      print_areas: [
        {
          variant_ids: variantIds,
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
  return data.id; // Return product ID
}

// Create order from custom product
async function createPrintifyOrder(shopId, apiKey, productId, variantId, quantity, shippingAddress, email, externalId) {
  const res = await fetch(`https://api.printify.com/v1/shops/${shopId}/orders.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      external_id: externalId,
      label: `Shopify order ${externalId}`,
      line_items: [
        {
          product_id: productId,
          variant_id: variantId,
          quantity: quantity,
        },
      ],
      shipping_method: 1,
      send_to_production: false,
      address_to: shippingAddress,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Printify order error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

export default async function handler(req, res) {
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
    return res.status(200).json({ success: true, message: 'Ignored topic' });
  }

  const order = JSON.parse(rawBody);

  const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
  const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
    return res.status(500).json({ success: false, error: 'Missing Printify env vars' });
  }

  try {
    const firstItem = order.line_items?.[0];
    if (!firstItem) {
      return res.status(200).json({ success: true, message: 'No line items' });
    }

    const props = firstItem.properties || [];
    const designUrlProp = props.find(p => (p.name || p.key) === 'Design_URL');
    const designUrl = designUrlProp?.value || designUrlProp?.[1];

    if (!designUrl) {
      return res.status(200).json({ success: true, message: 'No design URL' });
    }

    // Step 1: Upload image to Printify
    const imageId = await uploadImageToPrintify(PRINTIFY_API_KEY, designUrl, `design-${order.id}.jpg`);
    
    // Step 2: Create custom product with the design
    const productId = await createCustomProduct(
      PRINTIFY_SHOP_ID,
      PRINTIFY_API_KEY,
      6, // Blueprint ID for "Unisex Jersey Short Sleeve Tee"
      99, // Print provider ID (adjust as needed)
      [64333], // Variant IDs (S)
      imageId
    );
    
    // Step 3: Create order from the custom product
    const printifyOrder = await createPrintifyOrder(
      PRINTIFY_SHOP_ID,
      PRINTIFY_API_KEY,
      productId,
      64333, // Variant ID for S
      firstItem.quantity || 1,
      {
        first_name: order.shipping_address?.first_name || 'Customer',
        last_name: order.shipping_address?.last_name || 'Unknown',
        email: order.email || 'unknown@example.com',
        phone: order.phone || '',
        country: order.shipping_address?.country_code || 'US',
        region: order.shipping_address?.province || '',
        address1: order.shipping_address?.address1 || '',
        address2: order.shipping_address?.address2 || '',
        city: order.shipping_address?.city || '',
        zip: order.shipping_address?.zip || '',
      },
      order.email || 'unknown@example.com',
      `shopify-${order.id}`
    );

    return res.status(200).json({ success: true, printifyOrder });
  } catch (err) {
    console.error('❌ Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

