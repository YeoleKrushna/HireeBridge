/**
 * Server-Side Country & Geolocation Detection
 *
 * Strict Fallback Rules (per Production Specification):
 * 1. Known mapped country -> country-specific fixed PPP price
 * 2. Known country without dedicated pricing -> USD international default
 * 3. Unknown country / geolocation failure / localhost -> INR
 *
 * Anti-Bypass Security:
 * - Backend determines the authorized market price strictly from the visitor country.
 * - A visitor cannot obtain another country's cheaper PPP price by setting ?currency= or hb_currency cookie.
 *   (e.g., US visitor with hb_currency=GBP receives USD, NOT GBP).
 * - Explicit INR switch is permitted ONLY on checkout when the user explicitly requests and confirms it.
 */

const https = require('https');
const { getCurrencyForCountry, isValidCurrency } = require('../config/pricing');

// In-memory cache for IP lookups (TTL 24 hours)
const geoCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 5000;

// Known search engine bots for deterministic SEO fallback to INR
const BOT_UA_REGEX = /googlebot|bingbot|yandex|baiduspider|slurp|duckduckbot|facebot|facebookexternalhit|twitterbot|linkedinbot|embedly|quora link preview|pinterest/i;

/**
 * Check if IP is private or localhost
 */
function isPrivateOrLocalIp(ip) {
  if (!ip) return true;
  const clean = ip.trim().replace(/^::ffff:/, '');
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;
  if (clean.startsWith('10.') || clean.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(clean)) return true;
  if (clean.startsWith('fe80:') || clean.startsWith('fc00:') || clean.startsWith('fd00:')) return true;
  return false;
}

/**
 * Perform fast external IP geolocation lookup with strict timeout
 */
function lookupCountryFromIp(ip) {
  return new Promise((resolve) => {
    if (!ip || isPrivateOrLocalIp(ip)) {
      return resolve('IN');
    }

    const cleanIp = ip.trim().replace(/^::ffff:/, '');

    // Check in-memory cache
    const cached = geoCache.get(cleanIp);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return resolve(cached.country);
    }

    const req = https.get(`https://api.country.is/${encodeURIComponent(cleanIp)}`, { timeout: 1200 }, (res) => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          const countryCode = String(parsed.country || '').trim().toUpperCase();
          if (countryCode && countryCode.length === 2 && countryCode !== 'XX' && countryCode !== 'T1') {
            if (geoCache.size > MAX_CACHE_ENTRIES) {
              const firstKey = geoCache.keys().next().value;
              geoCache.delete(firstKey);
            }
            geoCache.set(cleanIp, { country: countryCode, timestamp: Date.now() });
            return resolve(countryCode);
          }
        } catch {
          // Parse failure
        }
        resolve('IN');
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve('IN');
    });

    req.on('error', () => {
      resolve('IN');
    });
  });
}

/**
 * Parse cookies safely from request header
 */
function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(c => {
    const parts = c.split('=');
    if (parts.length >= 2) {
      list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim());
    }
  });
  return list;
}

/**
 * Detect visitor country and resolve authorized currency.
 *
 * Rules:
 * 1. Search engine crawler -> deterministic IN (INR).
 * 2. Country detected via reverse proxy headers or IP lookup.
 * 3. Fallback on unknown/failure/localhost -> IN (INR).
 * 4. Authorized market currency is locked to visitor country (e.g. US -> USD).
 *    A visitor CANNOT bypass country pricing simply by passing ?currency=GBP or hb_currency=GBP.
 * 5. Explicit INR fallback is accepted ONLY when explicitInr=true is set on checkout.
 */
async function detectVisitorGeo(req) {
  // 1. Search Engine Crawler Check -> Deterministic INR
  const ua = req.headers?.['user-agent'] || '';
  if (BOT_UA_REGEX.test(ua)) {
    return {
      country: 'IN',
      currency: 'INR',
      isCrawler: true,
      source: 'crawler'
    };
  }

  // 2. Authoritative Country Detection
  // Check Reverse Proxy Country Headers first (0ms latency)
  let detectedCountry = (
    req.headers?.['cf-ipcountry'] ||
    req.headers?.['x-vercel-ip-country'] ||
    req.headers?.['cloudfront-viewer-country'] ||
    req.headers?.['x-country-code'] ||
    ''
  ).trim().toUpperCase();

  let source = 'proxy-header';

  // If no proxy header or invalid, inspect client IP
  if (!detectedCountry || detectedCountry.length !== 2 || detectedCountry === 'XX' || detectedCountry === 'T1') {
    const xff = req.headers?.['x-forwarded-for'];
    const clientIp = (
      (xff ? xff.split(',')[0] : (req.headers?.['x-real-ip'] || req.socket?.remoteAddress || ''))
    ).trim().replace(/^::ffff:/, '');

    if (isPrivateOrLocalIp(clientIp)) {
      detectedCountry = 'IN';
      source = 'localhost-default';
    } else {
      try {
        detectedCountry = await lookupCountryFromIp(clientIp);
        source = 'ip-lookup';
      } catch {
        detectedCountry = 'IN';
        source = 'geo-failure-fallback';
      }
    }
  }

  // Guarantee valid 2-letter country code or fallback to IN
  if (!detectedCountry || detectedCountry.length !== 2 || detectedCountry === 'XX' || detectedCountry === 'T1') {
    detectedCountry = 'IN';
    source = 'unknown-fallback';
  }

  // 3. Resolve Authorized Market Currency strictly from detected country
  const authorizedMarketCurrency = getCurrencyForCountry(detectedCountry);

  // 4. Explicit INR Fallback Check:
  // An INR fallback is acceptable ONLY if the user explicitly switches to INR before payment
  // (e.g. on checkout with ?currency=INR&explicit=true or form body explicitInr: true).
  // Under NO circumstances can a visitor adopt another country's PPP pricing (e.g. US visitor setting GBP).
  const isExplicitInr = (
    (req.query?.currency === 'INR' && (req.query?.explicit === 'true' || req.query?.fallback === 'inr')) ||
    (req.body?.currencyPreference === 'INR' && (req.body?.explicitInr === true || req.body?.explicitInr === 'true'))
  );

  let finalCurrency = authorizedMarketCurrency;
  if (isExplicitInr) {
    finalCurrency = 'INR';
    source = 'explicit-inr-fallback';
  }

  return {
    country: detectedCountry,
    currency: finalCurrency,
    authorizedMarketCurrency,
    source
  };
}

module.exports = {
  detectVisitorGeo,
  lookupCountryFromIp,
  isPrivateOrLocalIp
};
