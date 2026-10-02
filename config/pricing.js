/**
 * HireeBridge Centralized Purchasing Power Parity (PPP) Pricing Configuration
 *
 * Current prices live in the persistent program_prices table. Currency configuration
 * below controls display symbols and relative market scaling only.
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

// Database seeds are the authoritative initial prices for all plans.
const PROGRAM_PRICE_DEFAULTS = Object.freeze([
  Object.freeze({ planId: 'certificate', name: 'Certificate Program', amount: 1 }),
  Object.freeze({ planId: 'project', name: 'Project Based Internship', amount: 2 }),
  Object.freeze({ planId: 'comprehensive', name: 'Comprehensive Program', amount: 3 })
]);
const PROGRAM_PRICE_MAX_INR = 1000000;

function isValidProgramPrice(amount) {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 &&
    amount <= PROGRAM_PRICE_MAX_INR && Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8;
}

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

// Currency formatting and regional scaling only. Program prices always come from program_prices.
const PPP_PRICING = {
  INR: { currency: 'INR', symbol: '\u20b9' }, USD: { currency: 'USD', symbol: '$' },
  EUR: { currency: 'EUR', symbol: '\u20ac' }, GBP: { currency: 'GBP', symbol: '\u00a3' },
  AED: { currency: 'AED', symbol: 'AED ' }, SGD: { currency: 'SGD', symbol: 'S$' },
  AUD: { currency: 'AUD', symbol: 'A$' }, CAD: { currency: 'CAD', symbol: 'C$' },
  JPY: { currency: 'JPY', symbol: '\u00a5' }
};
const MARKET_PRICE_RATIOS = Object.freeze({
  USD: Object.freeze({ certificate: 4.99 / 99, project: 9.99 / 199, comprehensive: 19.99 / 500 }),
  GBP: Object.freeze({ certificate: 3.99 / 99, project: 7.99 / 199, comprehensive: 16.99 / 500 }),
  EUR: Object.freeze({ certificate: 4.49 / 99, project: 8.99 / 199, comprehensive: 18.99 / 500 }),
  AED: Object.freeze({ certificate: 19 / 99, project: 39 / 199, comprehensive: 79 / 500 }),
  SGD: Object.freeze({ certificate: 6.99 / 99, project: 13.99 / 199, comprehensive: 27.99 / 500 }),
  AUD: Object.freeze({ certificate: 7.99 / 99, project: 14.99 / 199, comprehensive: 29.99 / 500 }),
  CAD: Object.freeze({ certificate: 6.99 / 99, project: 13.99 / 199, comprehensive: 27.99 / 500 }),
  JPY: Object.freeze({ certificate: 750 / 99, project: 1500 / 199, comprehensive: 3000 / 500 })
});

/**
 * Format an amount with currency symbol
 * e.g. 1, 'INR' -> '₹1'
 *      1, 'USD' -> '$1'
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
function getPlanPricing(planId, currencyOrCountry = 'INR', programPrices = null) {
  const planKey = (planId === 'starter' ? 'certificate' : planId === 'direct' ? 'project' : planId) || 'project';
  let currency = 'INR';

  const input = String(currencyOrCountry || '').trim().toUpperCase();
  if (VALID_CURRENCY_CODES.has(input)) {
    currency = input;
  } else {
    currency = getCurrencyForCountry(input);
  }

  const curConfig = PPP_PRICING[currency] || PPP_PRICING.INR;
  const storedPrice = Array.isArray(programPrices)
    ? programPrices.find(item => item.planId === planKey)?.amount
    : programPrices?.[planKey]?.amount ?? programPrices?.[planKey];
  const seededPrice = PROGRAM_PRICE_DEFAULTS.find(item => item.planId === planKey)?.amount || 1;
  const baseInrAmount = Number(storedPrice ?? seededPrice);
  const amount = currency === 'INR'
    ? baseInrAmount
    : Math.round((baseInrAmount * (MARKET_PRICE_RATIOS[currency]?.[planKey] || 1) + Number.EPSILON) * (currency === 'JPY' ? 1 : 100)) / (currency === 'JPY' ? 1 : 100);
  const oldAmount = amount;

  return {
    planId: planKey,
    currency: curConfig.currency,
    symbol: curConfig.symbol,
    amount,
    oldAmount,
    formatted: formatPrice(amount, curConfig.currency),
    oldFormatted: formatPrice(oldAmount, curConfig.currency)
  };
}

/**
 * Get pricing for all 3 plans in a specific currency/country
 */
function getAllPlansPricing(currencyOrCountry = 'INR', programPrices = null) {
  let currency = 'INR';
  const input = String(currencyOrCountry || '').trim().toUpperCase();
  if (VALID_CURRENCY_CODES.has(input)) {
    currency = input;
  } else {
    currency = getCurrencyForCountry(input);
  }

  return {
    currency,
    certificate: getPlanPricing('certificate', currency, programPrices),
    project: getPlanPricing('project', currency, programPrices),
    comprehensive: getPlanPricing('comprehensive', currency, programPrices)
  };
}

/**
 * Convert user-facing amount to gateway minor units.
 * Most currencies have 100 subunits (paise, cents, pence, fils).
 * Zero-decimal currencies like JPY have 1 subunit (no decimals).
 */
function toGatewaySubunits(amount, currency = 'INR') {
  const cur = String(currency || 'INR').toUpperCase();
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'PYG', 'UGX', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF'];
  const num = Number(amount) || 0;
  if (zeroDecimalCurrencies.includes(cur)) {
    return Math.round(num);
  }
  return Math.round(num * 100);
}

/**
 * Convert gateway minor units back to user-facing amount.
 */
function fromGatewaySubunits(subunits, currency = 'INR') {
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
  PROGRAM_PRICE_DEFAULTS,
  PROGRAM_PRICE_MAX_INR,
  isValidProgramPrice,
  formatPrice,
  getCurrencyForCountry,
  isValidCurrency,
  getPlanPricing,
  getAllPlansPricing,
  toGatewaySubunits,
  fromGatewaySubunits
};
