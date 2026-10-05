/**
 * HireeBridge Centralized Purchasing Power Parity (PPP) Pricing Configuration
 *
 * Current prices live in the persistent program_prices table. Currency configuration
 * below controls display symbols and relative market scaling only.
 */

const path = require('path');
const fs = require('fs');

// Load runtime validated PPP dataset
const pppDatasetPath = path.join(__dirname, '..', 'data', 'global-ppp-pricing.json');
let pppData;
try {
  pppData = JSON.parse(fs.readFileSync(pppDatasetPath, 'utf8'));
} catch (err) {
  console.error('[PricingEngine] Failed to load global-ppp-pricing.json, using fallback:', err.message);
  pppData = {
    metadata: { indiaReferenceFactor: 19.8389 },
    countries: {}
  };
}

const INDIA_REFERENCE_PPP_FACTOR = pppData.metadata?.indiaReferenceFactor || 19.8389;

// Database seeds and fallback defaults for India base prices
const PROGRAM_PRICE_DEFAULTS = Object.freeze([
  Object.freeze({ planId: 'certificate', name: 'Certificate Program', amount: 99 }),
  Object.freeze({ planId: 'project', name: 'Project Based Internship', amount: 199 }),
  Object.freeze({ planId: 'comprehensive', name: 'Comprehensive Program', amount: 299 })
]);
const PROGRAM_PRICE_MAX_INR = 1000000;

function isValidProgramPrice(amount) {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 &&
    amount <= PROGRAM_PRICE_MAX_INR && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8;
}

// Cashfree International Payment Gateway supported card settlement currencies
const CASHFREE_INTERNATIONAL_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY']);
const CASHFREE_SUPPORTED_CURRENCIES = new Set(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY']);

// ISO 4217 Minor Unit Definitions
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'UYI', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'
]);

function getMinorUnits(currency) {
  const cur = String(currency || '').trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(cur)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(cur)) return 3;
  return 2;
}

function roundToMinorUnits(amount, minorUnits) {
  const factor = Math.pow(10, minorUnits);
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

// Currency Symbols Mapping
const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  KRW: '₩',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  AED: 'AED ',
  RUB: '₽',
  NGN: '₦',
  BRL: 'R$',
  ZAR: 'R ',
  NAD: 'N$',
  CHF: 'CHF ',
  CNY: '¥',
  NZD: 'NZ$',
  MXN: 'Mex$',
  HKD: 'HK$',
  SEK: 'kr ',
  NOK: 'kr ',
  DKK: 'kr ',
  PLN: 'zł ',
  TRY: '₺',
  ILS: '₪',
  PHP: '₱',
  THB: '฿',
  MYR: 'RM ',
  IDR: 'Rp '
};

// Supported Currencies List (Exported for backwards compatibility & selectors)
const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', country: 'IN', label: 'INR — India (₹)' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', country: 'US', label: 'USD — United States ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', country: 'NL', label: 'EUR — Europe (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', country: 'GB', label: 'GBP — United Kingdom (£)' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', flag: '🇦🇪', country: 'AE', label: 'AED — UAE (AED)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', country: 'SG', label: 'SGD — Singapore (S$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', country: 'AU', label: 'AUD — Australia (A$)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', country: 'CA', label: 'CAD — Canada (C$)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', country: 'JP', label: 'JPY — Japan (¥)' }
];

const VALID_CURRENCY_CODES = new Set(
  Object.values(pppData.countries || {}).map(c => c.currency).concat(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY'])
);

function isValidCurrency(currencyCode) {
  if (!currencyCode) return false;
  return VALID_CURRENCY_CODES.has(String(currencyCode).trim().toUpperCase());
}

/**
 * Format an amount according to currency minor units and symbol
 */
function formatPrice(amount, currency = 'INR') {
  const cur = String(currency || 'INR').trim().toUpperCase();
  const num = Number(amount) || 0;
  const minorUnits = getMinorUnits(cur);
  const symbol = CURRENCY_SYMBOLS[cur] || (cur === 'INR' ? '₹' : `${cur} `);

  let formattedNum;
  if (minorUnits === 0) {
    formattedNum = Math.round(num).toLocaleString('en-US');
  } else if (minorUnits === 3) {
    formattedNum = num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  } else {
    // 2 decimals: display formatted with thousands separator
    formattedNum = (num % 1 !== 0)
      ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : (num >= 1000 ? num.toLocaleString('en-US') : num.toString());
  }
  return `${symbol}${formattedNum}`;
}

/**
 * Retrieve the full PPP dataset record for a given ISO-2 country code
 */
function getCountryPppRecord(countryCode) {
  const code = String(countryCode || '').trim().toUpperCase();
  if (!code || code.length !== 2) return null;
  // Namibia NA check
  if (code === 'NA') {
    return pppData.countries?.['NA'] || null;
  }
  return pppData.countries?.[code] || null;
}

/**
 * Retrieve all country records in the dataset
 */
function getAllCountryRecords() {
  return pppData.countries || {};
}

/**
 * Resolve currency code for a given ISO country code driven by the dataset.
 */
function getCurrencyForCountry(countryCode) {
  const code = String(countryCode || '').trim().toUpperCase();
  if (!code || code === 'IN' || code === 'XX' || code === 'T1' || code === 'UNKNOWN' || code.length !== 2) {
    return 'INR';
  }

  const record = getCountryPppRecord(code);
  if (!record) {
    return 'USD';
  }

  // Zimbabwe fallback: ZWL is obsolete and factor 0.029 produces 0.14 ZWL. Fallback to USD.
  if (record.status === 'fallback_required' || code === 'ZW') {
    return 'USD';
  }

  return record.currency || 'USD';
}

/**
 * Calculate PPP Price for a plan given country code or currency code.
 *
 * Deterministic Fallback Rules:
 * 1. SUPPORTED LOCAL CURRENCY:
 *    Local PPP price + local-currency payment through Cashfree.
 * 2. UNSUPPORTED LOCAL CURRENCY:
 *    Local PPP price display + USD settlement derived from the active INR plan price.
 * 3. INVALID / OBSOLETE PPP CURRENCY (e.g. Zimbabwe ZW):
 *    No local price display + USD settlement derived from the active INR plan price.
 * 4. DOMESTIC INDIA (IN):
 *    Active persisted India plan pricing.
 */
function getPlanPricing(planId, countryOrCurrency = 'IN', programPrices = null, options = {}) {
  const planKey = (planId === 'starter' ? 'certificate' : planId === 'direct' ? 'project' : planId) || 'project';
  const cleanInput = String(countryOrCurrency || '').trim().toUpperCase();

  const isExplicitInr = (
    cleanInput === 'INR' ||
    options.explicitInr === true ||
    options.currencyPreference === 'INR'
  );

  const storedPrice = Array.isArray(programPrices)
    ? programPrices.find(item => item.planId === planKey)?.amount
    : programPrices?.[planKey]?.amount ?? programPrices?.[planKey];
  const seededPrice = PROGRAM_PRICE_DEFAULTS.find(item => item.planId === planKey)?.amount ?? 0;
  const baseInrAmount = Number(storedPrice ?? seededPrice);

  // International Dollar PPP Equivalent Amount (USD Fallback Amount)
  // Equivalent reference/settlement values are derived from the persisted INR price.
  const usdPppAmount = roundToMinorUnits(baseInrAmount / INDIA_REFERENCE_PPP_FACTOR, 2);

  // Domestic Indian pricing (or explicit user request to pay domestic INR)
  if (isExplicitInr || cleanInput === 'IN' || !cleanInput) {
    return {
      planId: planKey,
      country: 'IN',
      countryName: 'India',
      currency: 'INR',
      symbol: '₹',
      amount: baseInrAmount,
      oldAmount: baseInrAmount,
      formatted: formatPrice(baseInrAmount, 'INR'),
      oldFormatted: formatPrice(baseInrAmount, 'INR'),
      pricingCurrency: 'INR',
      pricingAmount: baseInrAmount,
      pricingFormatted: formatPrice(baseInrAmount, 'INR'),
      paymentCurrency: 'INR',
      paymentAmount: baseInrAmount,
      paymentFormatted: formatPrice(baseInrAmount, 'INR'),
      settlementCurrency: 'INR',
      settlementAmount: baseInrAmount,
      settlementFormatted: formatPrice(baseInrAmount, 'INR'),
      isDirectPayment: true,
      isDirectSettlement: true,
      requiresUsdFallback: false,
      baseInrAmount,
      usdPppAmount,
      pppFactor: INDIA_REFERENCE_PPP_FACTOR,
      pppYear: 2025,
      minorUnits: 2,
      status: 'valid'
    };
  }

  // Lookup country in dataset
  let countryRecord = getCountryPppRecord(cleanInput);

  // If input is a 3-letter currency code (e.g. legacy caller passing 'EUR', 'USD', 'GBP')
  if (!countryRecord && cleanInput.length === 3) {
    const matched = Object.values(pppData.countries || {}).find(c => c.currency === cleanInput);
    if (matched) {
      countryRecord = matched;
    }
  }

  // Fallback if country code is not in dataset (unrecognized territory) -> Deterministic USD
  if (!countryRecord) {
    return {
      planId: planKey,
      country: cleanInput,
      countryName: cleanInput,
      currency: 'USD',
      symbol: '$',
      amount: usdPppAmount,
      oldAmount: usdPppAmount,
      formatted: formatPrice(usdPppAmount, 'USD'),
      oldFormatted: formatPrice(usdPppAmount, 'USD'),
      pricingCurrency: 'USD',
      pricingAmount: usdPppAmount,
      pricingFormatted: formatPrice(usdPppAmount, 'USD'),
      paymentCurrency: 'USD',
      paymentAmount: usdPppAmount,
      paymentFormatted: formatPrice(usdPppAmount, 'USD'),
      settlementCurrency: 'USD',
      settlementAmount: usdPppAmount,
      settlementFormatted: formatPrice(usdPppAmount, 'USD'),
      isDirectPayment: true,
      isDirectSettlement: true,
      requiresUsdFallback: false,
      baseInrAmount,
      usdPppAmount,
      pppFactor: 1,
      pppYear: 2025,
      minorUnits: 2,
      status: 'fallback_country_not_found',
      fallbackReason: `Country ${cleanInput} not in World Bank ICP PPP dataset. Deterministic USD pricing applied.`
    };
  }

  // Zimbabwe fallback: Obsolete ZWL and stale 2021 factor (0.029) produces 0.14 ZWL.
  // Suppress local price display and use deterministic USD fallback!
  if (countryRecord.status === 'fallback_required' || countryRecord.iso2 === 'ZW') {
    return {
      planId: planKey,
      country: countryRecord.iso2,
      countryName: countryRecord.country,
      currency: 'USD',
      symbol: '$',
      amount: usdPppAmount,
      oldAmount: usdPppAmount,
      formatted: formatPrice(usdPppAmount, 'USD'),
      oldFormatted: formatPrice(usdPppAmount, 'USD'),
      pricingCurrency: 'USD',
      pricingAmount: usdPppAmount,
      pricingFormatted: formatPrice(usdPppAmount, 'USD'),
      paymentCurrency: 'USD',
      paymentAmount: usdPppAmount,
      paymentFormatted: formatPrice(usdPppAmount, 'USD'),
      settlementCurrency: 'USD',
      settlementAmount: usdPppAmount,
      settlementFormatted: formatPrice(usdPppAmount, 'USD'),
      isDirectPayment: true,
      isDirectSettlement: true,
      requiresUsdFallback: false,
      baseInrAmount,
      usdPppAmount,
      pppFactor: countryRecord.pppFactor,
      pppYear: countryRecord.dataYear,
      minorUnits: 2,
      status: 'fallback_applied',
      fallbackReason: countryRecord.reason || 'Zimbabwe currency transition in progress. Deterministic USD fallback applied.'
    };
  }

  // Core Global PPP Formula:
  // local_price = india_base_price * (country_ppp_factor / 19.8389)
  const pppFactor = Number(countryRecord.pppFactor);
  const minorUnits = countryRecord.minorUnits;
  const rawAmount = baseInrAmount * (pppFactor / INDIA_REFERENCE_PPP_FACTOR);
  const localPppAmount = roundToMinorUnits(rawAmount, minorUnits);
  const localFormatted = formatPrice(localPppAmount, countryRecord.currency);

  const isDirectPayment = CASHFREE_SUPPORTED_CURRENCIES.has(countryRecord.currency);
  const paymentCurrency = isDirectPayment ? countryRecord.currency : 'USD';
  const paymentAmount = isDirectPayment ? localPppAmount : usdPppAmount;
  const paymentFormatted = formatPrice(paymentAmount, paymentCurrency);

  return {
    planId: planKey,
    country: countryRecord.iso2,
    countryName: countryRecord.country,
    // The payment currency and amount sent to payment gateway:
    currency: paymentCurrency,
    amount: paymentAmount,
    oldAmount: paymentAmount,
    // Formatted local PPP price for marketing and transparent reference display:
    formatted: localFormatted,
    oldFormatted: localFormatted,
    // Explicit separation of reference pricing vs actual gateway payment charge:
    // 1. pricing_currency: customer's local PPP reference currency
    // 2. pricing_amount: PPP-derived local reference price
    pricingCurrency: countryRecord.currency,
    pricingAmount: localPppAmount,
    pricingFormatted: localFormatted,
    // 3. payment_currency: currency actually charged through Cashfree
    // 4. payment_amount: actual amount sent to Cashfree
    paymentCurrency,
    paymentAmount,
    paymentFormatted,
    // Backward-compatibility aliases:
    settlementCurrency: paymentCurrency,
    settlementAmount: paymentAmount,
    settlementFormatted: paymentFormatted,
    isDirectPayment,
    isDirectSettlement: isDirectPayment,
    requiresUsdFallback: !isDirectPayment,
    baseInrAmount,
    usdPppAmount,
    pppFactor,
    pppYear: countryRecord.dataYear,
    minorUnits,
    status: countryRecord.status,
    reason: countryRecord.reason
  };
}

/**
 * Get pricing for all 3 plans for a specific country or currency
 */
function getAllPlansPricing(countryOrCurrency = 'IN', programPrices = null, options = {}) {
  const cleanInput = String(countryOrCurrency || '').trim().toUpperCase();
  const cert = getPlanPricing('certificate', cleanInput, programPrices, options);
  const proj = getPlanPricing('project', cleanInput, programPrices, options);
  const comp = getPlanPricing('comprehensive', cleanInput, programPrices, options);

  return {
    country: cert.country,
    countryName: cert.countryName,
    pricingCurrency: cert.pricingCurrency,
    paymentCurrency: cert.paymentCurrency,
    settlementCurrency: cert.paymentCurrency,
    currency: cert.currency,
    symbol: cert.symbol,
    isDirectPayment: cert.isDirectPayment,
    isDirectSettlement: cert.isDirectPayment,
    requiresUsdFallback: cert.requiresUsdFallback,
    certificate: cert,
    project: proj,
    comprehensive: comp
  };
}

/**
 * Convert user-facing amount to gateway minor units.
 * Zero-decimal currencies like JPY, KRW have 1 subunit (no decimals).
 * Three-decimal currencies like OMR have 1000 subunits.
 * Standard currencies have 100 subunits.
 */
function toGatewaySubunits(amount, currency = 'INR') {
  const cur = String(currency || 'INR').trim().toUpperCase();
  const num = Number(amount) || 0;
  const minorUnits = getMinorUnits(cur);
  const factor = Math.pow(10, minorUnits);
  return Math.round(num * factor);
}

/**
 * Convert gateway minor units back to user-facing amount.
 */
function fromGatewaySubunits(subunits, currency = 'INR') {
  const cur = String(currency || 'INR').trim().toUpperCase();
  const num = Number(subunits) || 0;
  const minorUnits = getMinorUnits(cur);
  const factor = Math.pow(10, minorUnits);
  const result = num / factor;
  return minorUnits === 0 ? Math.round(result) : Number(result.toFixed(minorUnits));
}

module.exports = {
  INDIA_REFERENCE_PPP_FACTOR,
  PROGRAM_PRICE_DEFAULTS,
  PROGRAM_PRICE_MAX_INR,
  isValidProgramPrice,
  CASHFREE_INTERNATIONAL_CURRENCIES,
  CASHFREE_SUPPORTED_CURRENCIES,
  SUPPORTED_CURRENCIES,
  VALID_CURRENCY_CODES,
  isValidCurrency,
  getMinorUnits,
  roundToMinorUnits,
  formatPrice,
  getCountryPppRecord,
  getAllCountryRecords,
  getCurrencyForCountry,
  getPlanPricing,
  getAllPlansPricing,
  toGatewaySubunits,
  fromGatewaySubunits
};
