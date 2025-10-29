// Shopify Orders Webhook -> Printify order creator (on hold)
// Expects Shopify orders/create webhook with line item properties containing Design_URL
// Env required: SHOPIFY_WEBHOOK_SECRET, PRINTIFY_API_KEY, PRINTIFY_SHOP_ID

import crypto from 'crypto';

function verifyShopifyHmac(requestBody, hmacHeader, secret) {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(requestBody, 'utf8')
    .digest('base64');
  return digest === hmacHeader;
}

// Map your Shopify variant IDs to Printify variant IDs
const SHOPIFY_TO_PRINTIFY_VARIANT = {
  '52646156239213': 64333, // Vintage White / S
};

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

  const rawBody = JSON.stringify(req.body);
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

  const order = req.body;

  const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
  const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
    return res.status(500).json({ success: false, error: 'Missing Printify env vars' });
  }

  // Build Printify order payload
  const line_items = [];

  for (const item of order.line_items || []) {
    const props = item.properties || [];
    const designUrlProp = props.find(p => (p.name || p.key) === 'Design_URL' || (p.name || p.key) === '_Design_Image');
    const designUrl = designUrlProp?.value || designUrlProp?.[1];
    const printifyVariantId = SHOPIFY_TO_PRINTIFY_VARIANT[item.variant_id];

    if (!designUrl || !printifyVariantId) {
      // Skip items that don't have required data
      continue;
    }

    // Minimal example uses placeholders.images with URL
    line_items.push({
      variant_id: printifyVariantId,
      quantity: item.quantity || 1,
      print_areas: [{
        variant_ids: [printifyVariantId],
        placeholders: [{
          position: 'front',
          images: [{ url: designUrl, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
        }],
      }],
    });
  }

  if (line_items.length === 0) {
    return res.status(200).json({ success: true, message: 'No eligible items with design URL' });
  }

  const payload = {
    external_id: `shopify-${order.id}`,
    label: `Shopify order ${order.name}`,
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

  try {
    const created = await createPrintifyOrder(PRINTIFY_SHOP_ID, PRINTIFY_API_KEY, payload);
    return res.status(200).json({ success: true, created });
  } catch (err) {
    console.error('Printify order creation failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}


