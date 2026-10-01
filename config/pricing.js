/**
 * HireeBridge Centralized Purchasing Power Parity (PPP) Pricing Configuration
 *
 * All prices here are DELIBERATELY CONFIGURED fixed amounts per country / currency,
 * NOT calculated via live FX conversion.
 *
 * Developers & administrators can edit the amounts in the PPP_PRICING matrix below.
 */

// Supported payment currencies
const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', country: 'IN', label: 'INR — India (₹)' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', country: 'US', label: 'USD — United States ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', country: 'DE', label: 'EUR — Europe (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', country: 'GB', label: 'GBP — United Kingdom (£)' },
  { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', flag: '🇦🇪', country: 'AE', label: 'AED — UAE (AED)' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', country: 'SG', label: 'SGD — Singapore (S$)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', country: 'AU', label: 'AUD — Australia (A$)' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', country: 'CA', label: 'CAD — Canada (C$)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', country: 'JP', label: 'JPY — Japan (¥)' }
];

const VALID_CURRENCY_CODES = new Set(SUPPORTED_CURRENCIES.map(c => c.code));

// Eurozone ISO country codes mapping to EUR
const EUROZONE_COUNTRIES = new Set([
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT',
  'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
]);

// Country code to primary currency mapping
const COUNTRY_TO_CURRENCY = {
  IN: 'INR',
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  SG: 'SGD',
  AU: 'AUD',
  CA: 'CAD',
  JP: 'JPY'
};

/**
 * PPP Fixed Price Configuration Matrix
 * Format per currency:
 * {
 *   certificate:   { amount: X, old: Y },
 *   project:       { amount: X, old: Y },
 *   comprehensive: { amount: X, old: Y }
 * }
 */
const PPP_PRICING = {
  INR: {
    currency: 'INR',
    symbol: '₹',
    certificate:   { amount: 99,   old: 149, active: true },
    project:       { amount: 199,  old: 299, active: true },
    comprehensive: { amount: 500,  old: 899, active: true }
  },
  USD: {
    currency: 'USD',
    symbol: '$',
    certificate:   { amount: 4.99,  old: 7.99,  active: true },
    project:       { amount: 9.99,  old: 14.99, active: true },
    comprehensive: { amount: 19.99, old: 34.99, active: true }
  },
  GBP: {
    currency: 'GBP',
    symbol: '£',
    certificate:   { amount: 3.99,  old: 6.99,  active: true },
    project:       { amount: 7.99,  old: 11.99, active: true },
    comprehensive: { amount: 16.99, old: 29.99, active: true }
  },
  EUR: {
    currency: 'EUR',
    symbol: '€',
    certificate:   { amount: 4.49,  old: 7.49,  active: true },
    project:       { amount: 8.99,  old: 13.99, active: true },
    comprehensive: { amount: 18.99, old: 32.99, active: true }
  },
  AED: {
    currency: 'AED',
    symbol: 'AED ',
    certificate:   { amount: 19, old: 29,  active: true },
    project:       { amount: 39, old: 59,  active: true },
    comprehensive: { amount: 79, old: 139, active: true }
  },
  SGD: {
    currency: 'SGD',
    symbol: 'S$',
    certificate:   { amount: 6.99,  old: 10.99, active: true },
    project:       { amount: 13.99, old: 19.99, active: true },
    comprehensive: { amount: 27.99, old: 49.99, active: true }
  },
  AUD: {
    currency: 'AUD',
    symbol: 'A$',
    certificate:   { amount: 7.99,  old: 12.99, active: true },
    project:       { amount: 14.99, old: 22.99, active: true },
    comprehensive: { amount: 29.99, old: 54.99, active: true }
  },
  CAD: {
    currency: 'CAD',
    symbol: 'C$',
    certificate:   { amount: 6.99,  old: 10.99, active: true },
    project:       { amount: 13.99, old: 20.99, active: true },
    comprehensive: { amount: 27.99, old: 49.99, active: true }
  },
  JPY: {
    currency: 'JPY',
    symbol: '¥',
    certificate:   { amount: 750,  old: 1200, active: true },
    project:       { amount: 1500, old: 2250, active: true },
    comprehensive: { amount: 3000, old: 5400, active: true }
  }
};

/**
 * Format an amount with currency symbol
 * e.g. 99, 'INR' -> '₹99'
 *      4.99, 'USD' -> '$4.99'
 *      19, 'AED' -> 'AED 19'
 *      750, 'JPY' -> '¥750'
 */
function formatPrice(amount, currency = 'INR') {
  const cur = String(currency || 'INR').toUpperCase();
  const num = Number(amount) || 0;
  const cfg = PPP_PRICING[cur] || PPP_PRICING.INR;
  const sym = cfg.symbol || (cur + ' ');

  const hasDecimals = (num % 1 !== 0);
  const formattedNum = hasDecimals ? num.toFixed(2) : num.toString();

  return `${sym}${formattedNum}`;
}

/**
 * Resolve currency code for a given ISO country code with explicit fallback rules:
 * 1. Known mapped country -> country-specific fixed PPP price
 * 2. Known country without dedicated pricing -> USD international default
 * 3. Unknown country / geolocation failure / localhost -> INR
 */
function getCurrencyForCountry(countryCode) {
  const code = String(countryCode || '').trim().toUpperCase();
  // Unknown country / geolocation failure / localhost -> INR
  if (!code || code === 'IN' || code === 'XX' || code === 'T1' || code === 'UNKNOWN' || code.length !== 2) {
    return 'INR';
  }
  // Known mapped country -> country-specific fixed PPP price
  if (COUNTRY_TO_CURRENCY[code]) {
    return COUNTRY_TO_CURRENCY[code];
  }
  if (EUROZONE_COUNTRIES.has(code)) {
    return 'EUR';
  }
  // Known country without dedicated pricing -> USD international default
  return 'USD';
}

/**
 * Validate currency code against supported list
 */
function isValidCurrency(currencyCode) {
  if (!currencyCode) return false;
  return VALID_CURRENCY_CODES.has(String(currencyCode).trim().toUpperCase());
}

/**
 * Get pricing configuration for a specific plan and currency
 */
function getPlanPricing(planId, currencyOrCountry = 'INR') {
  const planKey = (planId === 'starter' ? 'certificate' : planId === 'direct' ? 'project' : planId) || 'project';
  let currency = 'INR';

  const input = String(currencyOrCountry || '').trim().toUpperCase();
  if (VALID_CURRENCY_CODES.has(input)) {
    currency = input;
  } else {
    currency = getCurrencyForCountry(input);
  }

  const curConfig = PPP_PRICING[currency] || PPP_PRICING.INR;
  const planData = curConfig[planKey] || curConfig.project;

  return {
    planId: planKey,
    currency: curConfig.currency,
    symbol: curConfig.symbol,
    amount: planData.amount,
    oldAmount: planData.old,
    formatted: formatPrice(planData.amount, curConfig.currency),
    oldFormatted: formatPrice(planData.old, curConfig.currency)
  };
}

/**
 * Get pricing for all 3 plans in a specific currency/country
 */
function getAllPlansPricing(currencyOrCountry = 'INR') {
  let currency = 'INR';
  const input = String(currencyOrCountry || '').trim().toUpperCase();
  if (VALID_CURRENCY_CODES.has(input)) {
    currency = input;
  } else {
    currency = getCurrencyForCountry(input);
  }

  return {
    currency,
    certificate: getPlanPricing('certificate', currency),
    project: getPlanPricing('project', currency),
    comprehensive: getPlanPricing('comprehensive', currency)
  };
}

/**
 * Convert user-facing amount to Razorpay subunit amount.
 * Most currencies have 100 subunits (paise, cents, pence, fils).
 * Zero-decimal currencies like JPY have 1 subunit (no decimals).
 */
function toRazorpaySubunits(amount, currency = 'INR') {
  const cur = String(currency || 'INR').toUpperCase();
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF'];
  const num = Number(amount) || 0;
  if (zeroDecimalCurrencies.includes(cur)) {
    return Math.round(num);
  }
  return Math.round(num * 100);
}

/**
 * Convert Razorpay subunit amount back to user-facing amount.
 */
function fromRazorpaySubunits(subunits, currency = 'INR') {
  const cur = String(currency || 'INR').toUpperCase();
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF'];
  const num = Number(subunits) || 0;
  if (zeroDecimalCurrencies.includes(cur)) {
    return num;
  }
  return Number((num / 100).toFixed(2));
}

module.exports = {
  SUPPORTED_CURRENCIES,
  VALID_CURRENCY_CODES,
  EUROZONE_COUNTRIES,
  COUNTRY_TO_CURRENCY,
  PPP_PRICING,
  formatPrice,
  getCurrencyForCountry,
  isValidCurrency,
  getPlanPricing,
  getAllPlansPricing,
  toRazorpaySubunits,
  fromRazorpaySubunits
};
