/**
 * PayPal REST API Integration Utility for HireeBridge
 * Supports Sandbox and Production via environment variables.
 * Secure server-side OAuth2 token management, Order creation, and Capture.
 */

const crypto = require('crypto');

let cachedToken = null;

function getPayPalEnvironment() {
  const env = String(process.env.PAYPAL_ENV || 'sandbox').trim().toLowerCase();
  return (env === 'live' || env === 'production') ? 'live' : 'sandbox';
}

function getPayPalApiBase() {
  if (process.env.PAYPAL_API_BASE) {
    return process.env.PAYPAL_API_BASE.replace(/\/+$/, '');
  }
  return getPayPalEnvironment() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

function isPayPalConfigured() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  return Boolean(clientId && clientSecret && String(clientId).trim() && String(clientSecret).trim());
}

function getPayPalClientId() {
  return String(process.env.PAYPAL_CLIENT_ID || '').trim();
}

/**
 * Obtain or reuse cached PayPal OAuth 2.0 Access Token
 */
async function getPayPalAccessToken() {
  if (!isPayPalConfigured()) {
    throw new Error('PayPal credentials (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET) are not configured.');
  }

  if (cachedToken && cachedToken.token && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = String(process.env.PAYPAL_CLIENT_ID).trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET).trim();
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const apiBase = getPayPalApiBase();

  const response = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(15000)
  });

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

  if (!response.ok || !data.access_token) {
    const safeError = {
      status: response.status,
      error: data.error || 'oauth_error',
      description: data.error_description || 'Failed to authenticate with PayPal.'
    };
    console.error('[PAYPAL_AUTH_ERROR]', JSON.stringify(safeError));
    const err = new Error(safeError.description);
    err.status = response.status;
    err.details = safeError;
    throw err;
  }

  const expiresIn = Number(data.expires_in) || 3600;
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 120) * 1000
  };

  return cachedToken.token;
}

/**
 * Create a PayPal Order (Intent: CAPTURE)
 */
async function createPayPalOrder({ orderId, amount, currency = 'USD', description = 'HireeBridge enrollment', returnUrl, cancelUrl }) {
  const token = await getPayPalAccessToken();
  const apiBase = getPayPalApiBase();

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new Error('Invalid PayPal order amount.');
  }

  const siteUrl = (process.env.SITE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://hireebridge.in')).replace(/\/+$/, '');
  const rUrl = returnUrl || `${siteUrl}/payment/paypal/return`;
  const cUrl = cancelUrl || `${siteUrl}/payment/paypal/cancel`;

  const experienceContext = {
    brand_name: 'HireeBridge',
    locale: 'en-US',
    landing_page: 'NO_PREFERENCE',
    shipping_preference: 'NO_SHIPPING',
    user_action: 'PAY_NOW',
    return_url: rUrl,
    cancel_url: cUrl
  };

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: 'default',
        custom_id: String(orderId),
        description: String(description || 'HireeBridge enrollment').slice(0, 127),
        amount: {
          currency_code: String(currency || 'USD').toUpperCase(),
          value: numAmount.toFixed(2)
        }
      }
    ],
    payment_source: {
      paypal: {
        experience_context: experienceContext
      }
    }
  };

  const requestId = `hb-${orderId}-${Date.now()}`;
  const response = await fetch(`${apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': requestId,
      Accept: 'application/json'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

  if (!response.ok || !data.id) {
    const safeError = {
      status: response.status,
      name: data.name || 'ORDER_CREATION_FAILED',
      message: data.message || 'PayPal order creation failed',
      details: data.details || null,
      currency,
      amount: numAmount.toFixed(2)
    };
    console.error('[PAYPAL_CREATE_ORDER_ERROR]', JSON.stringify(safeError, null, 2));
    const err = new Error(safeError.message);
    err.status = response.status;
    err.details = safeError;
    throw err;
  }

  console.log('[PAYPAL_ORDER_CREATED]', JSON.stringify({
    paypalOrderId: data.id,
    orderId,
    currency,
    amount: numAmount.toFixed(2),
    status: data.status
  }));

  return data;
}

/**
 * Capture an approved PayPal Order
 */
async function capturePayPalOrder(paypalOrderId) {
  if (!paypalOrderId || typeof paypalOrderId !== 'string') {
    throw new Error('Missing PayPal order ID for capture.');
  }

  const cleanOrderId = paypalOrderId.trim();
  const token = await getPayPalAccessToken();
  const apiBase = getPayPalApiBase();

  const response = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(cleanOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(15000)
  });

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

  if (!response.ok) {
    const safeError = {
      status: response.status,
      name: data.name || 'CAPTURE_FAILED',
      message: data.message || 'PayPal order capture failed',
      details: data.details || null,
      paypalOrderId: cleanOrderId
    };
    console.error('[PAYPAL_CAPTURE_ERROR]', JSON.stringify(safeError, null, 2));
    const err = new Error(safeError.message);
    err.status = response.status;
    err.details = safeError;
    err.paypalResponse = data;
    throw err;
  }

  console.log('[PAYPAL_CAPTURE_COMPLETED]', JSON.stringify({
    paypalOrderId: data.id,
    status: data.status
  }));

  return data;
}

/**
 * Retrieve PayPal Order details (useful for status / verification checks)
 */
async function getPayPalOrderDetails(paypalOrderId) {
  if (!paypalOrderId || typeof paypalOrderId !== 'string') {
    throw new Error('Missing PayPal order ID.');
  }

  const cleanOrderId = paypalOrderId.trim();
  const token = await getPayPalAccessToken();
  const apiBase = getPayPalApiBase();

  const response = await fetch(`${apiBase}/v2/checkout/orders/${encodeURIComponent(cleanOrderId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    },
    signal: AbortSignal.timeout(15000)
  });

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { raw }; }

  if (!response.ok) {
    const err = new Error(data.message || `PayPal order lookup failed (${response.status})`);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

/**
 * Verify PayPal Webhook Signature against PayPal REST API
 */
async function verifyPayPalWebhookSignature({ headers, rawBody, webhookId }) {
  if (!webhookId) return false;
  try {
    const token = await getPayPalAccessToken();
    const apiBase = getPayPalApiBase();

    let parsedBody = {};
    try {
      parsedBody = typeof rawBody === 'string' ? JSON.parse(rawBody) : (Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString('utf8')) : rawBody);
    } catch {
      return false;
    }

    const verificationPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: parsedBody
    };

    const response = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(verificationPayload),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) return false;
    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  } catch (err) {
    console.warn('[PAYPAL_WEBHOOK_VERIFY_WARNING]', err.message);
    return false;
  }
}

function getPayPalSdkUrls() {
  const isLive = getPayPalEnvironment() === 'live';
  const host = isLive ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';
  return {
    coreUrl: `${host}/web-sdk/v6/core`,
    paymentsUrl: `${host}/web-sdk/v6/paypal-payments`
  };
}

function resetPayPalTokenCache() {
  cachedToken = null;
}

module.exports = {
  isPayPalConfigured,
  getPayPalEnvironment,
  getPayPalClientId,
  getPayPalApiBase,
  getPayPalAccessToken,
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalOrderDetails,
  verifyPayPalWebhookSignature,
  resetPayPalTokenCache,
  getPayPalSdkUrls
};
