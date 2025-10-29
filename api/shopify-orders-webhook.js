// Shopify Orders Webhook -> Printify order creator (on hold)
// Expects Shopify orders/create webhook with line item properties containing Design_URL
// Env required: SHOPIFY_WEBHOOK_SECRET, PRINTIFY_API_KEY, PRINTIFY_SHOP_ID

async function verifyShopifyHmac(requestBody, hmacHeader, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(requestBody)
  );
  
  const digest = btoa(String.fromCharCode(...new Uint8Array(signature)));
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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { 
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let rawBody;
  try {
    rawBody = await req.text();
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Cannot read body' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const hmac = req.headers.get('x-shopify-hmac-sha256');
  const topic = req.headers.get('x-shopify-topic');

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ success: false, error: 'Missing SHOPIFY_WEBHOOK_SECRET' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const isValid = await verifyShopifyHmac(rawBody, hmac, secret);
  if (!isValid) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid HMAC' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (topic !== 'orders/create') {
    // Ignore other topics for now
    return new Response(JSON.stringify({ success: true, message: 'Ignored topic' }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const order = JSON.parse(rawBody);

  const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
  const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
  if (!PRINTIFY_API_KEY || !PRINTIFY_SHOP_ID) {
    return new Response(JSON.stringify({ success: false, error: 'Missing Printify env vars' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
    return new Response(JSON.stringify({ success: true, message: 'No eligible items with design URL' }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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
    return new Response(JSON.stringify({ success: true, created }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Printify order creation failed:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


