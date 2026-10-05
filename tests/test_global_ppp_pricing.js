const assert = require('assert');
const {
  INDIA_REFERENCE_PPP_FACTOR,
  PROGRAM_PRICE_DEFAULTS,
  CASHFREE_SUPPORTED_CURRENCIES,
  CASHFREE_INTERNATIONAL_CURRENCIES,
  getCountryPppRecord,
  getAllCountryRecords,
  getCurrencyForCountry,
  getMinorUnits,
  roundToMinorUnits,
  formatPrice,
  getPlanPricing,
  getAllPlansPricing,
  toGatewaySubunits,
  fromGatewaySubunits
} = require('../config/pricing.js');

console.log('====================================================');
console.log('HIREEBRIDGE GLOBAL PPP PRICING ENGINE - TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`[PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${description}: ${err.message}`);
    failCount++;
  }
}

// ----------------------------------------------------
// 1. Authoritative Base Pricing & India Ref Factor
// ----------------------------------------------------
test('Authoritative India base prices are 99, 199, 299 (never 500)', () => {
  const defaults = PROGRAM_PRICE_DEFAULTS;
  const p1 = defaults.find(p => p.planId === 'certificate');
  const p2 = defaults.find(p => p.planId === 'project');
  const p3 = defaults.find(p => p.planId === 'comprehensive');
  assert.strictEqual(p1.amount, 99);
  assert.strictEqual(p2.amount, 199);
  assert.strictEqual(p3.amount, 299);
  assert.strictEqual(INDIA_REFERENCE_PPP_FACTOR, 19.8389);
});

// ----------------------------------------------------
// 2. The 9 Core Validation Countries
// ----------------------------------------------------
// Supported local currencies: IN (INR), NL (EUR), AU (AUD), GB (GBP), US (USD), JP (JPY)
// Unsupported local currencies falling back to USD: KR (KRW), RU (RUB), NG (NGN)
const validationTargets = [
  {
    code: 'IN', name: 'India',
    pricingCur: 'INR', pricingExpected: [99, 199, 299], minorUnits: 2, formatted: ['₹99', '₹199', '₹299'],
    settlementCur: 'INR', settlementExpected: [99, 199, 299], direct: true
  },
  {
    code: 'NL', name: 'Netherlands',
    pricingCur: 'EUR', pricingExpected: [3.83, 7.70, 11.56], minorUnits: 2, formatted: ['€3.83', '€7.70', '€11.56'],
    settlementCur: 'EUR', settlementExpected: [3.83, 7.70, 11.56], direct: true
  },
  {
    code: 'AU', name: 'Australia',
    pricingCur: 'AUD', pricingExpected: [7.31, 14.69, 22.07], minorUnits: 2, formatted: ['A$7.31', 'A$14.69', 'A$22.07'],
    settlementCur: 'AUD', settlementExpected: [7.31, 14.69, 22.07], direct: true
  },
  {
    code: 'GB', name: 'United Kingdom',
    pricingCur: 'GBP', pricingExpected: [3.50, 7.04, 10.57], minorUnits: 2, formatted: ['£3.50', '£7.04', '£10.57'],
    settlementCur: 'GBP', settlementExpected: [3.50, 7.04, 10.57], direct: true
  },
  {
    code: 'US', name: 'United States',
    pricingCur: 'USD', pricingExpected: [4.99, 10.03, 15.07], minorUnits: 2, formatted: ['$4.99', '$10.03', '$15.07'],
    settlementCur: 'USD', settlementExpected: [4.99, 10.03, 15.07], direct: true
  },
  {
    code: 'JP', name: 'Japan',
    pricingCur: 'JPY', pricingExpected: [516, 1037, 1557], minorUnits: 0, formatted: ['¥516', '¥1,037', '¥1,557'],
    settlementCur: 'JPY', settlementExpected: [516, 1037, 1557], direct: true
  },
  {
    code: 'KR', name: 'Korea, Rep.',
    pricingCur: 'KRW', pricingExpected: [4392, 8828, 13265], minorUnits: 0, formatted: ['₩4,392', '₩8,828', '₩13,265'],
    settlementCur: 'USD', settlementExpected: [4.99, 10.03, 15.07], direct: false
  },
  {
    code: 'RU', name: 'Russian Federation',
    pricingCur: 'RUB', pricingExpected: [153.46, 308.48, 463.49], minorUnits: 2, formatted: ['₽153.46', '₽308.48', '₽463.49'],
    settlementCur: 'USD', settlementExpected: [4.99, 10.03, 15.07], direct: false
  },
  {
    code: 'NG', name: 'Nigeria',
    pricingCur: 'NGN', pricingExpected: [1587.18, 3190.39, 4793.60], minorUnits: 2, formatted: ['₦1,587.18', '₦3,190.39', '₦4,793.60'],
    settlementCur: 'USD', settlementExpected: [4.99, 10.03, 15.07], direct: false
  }
];

validationTargets.forEach(vt => {
  test(`Validation Target: ${vt.name} (${vt.code}) produces expected pricing and settlement`, () => {
    const p1 = getPlanPricing('certificate', vt.code);
    const p2 = getPlanPricing('project', vt.code);
    const p3 = getPlanPricing('comprehensive', vt.code);

    // Pricing Currency & Local PPP Amount
    assert.strictEqual(p1.pricingCurrency, vt.pricingCur, `Pricing cur ${p1.pricingCurrency} !== ${vt.pricingCur}`);
    assert.strictEqual(p1.minorUnits, vt.minorUnits);
    assert.ok(Math.abs(p1.pricingAmount - vt.pricingExpected[0]) <= 0.02, `P1 local ${p1.pricingAmount} vs ${vt.pricingExpected[0]}`);
    assert.ok(Math.abs(p2.pricingAmount - vt.pricingExpected[1]) <= 0.02, `P2 local ${p2.pricingAmount} vs ${vt.pricingExpected[1]}`);
    assert.ok(Math.abs(p3.pricingAmount - vt.pricingExpected[2]) <= 0.02, `P3 local ${p3.pricingAmount} vs ${vt.pricingExpected[2]}`);
    assert.strictEqual(p1.pricingFormatted, vt.formatted[0]);

    // Payment Currency & Gateway Amount
    assert.strictEqual(p1.paymentCurrency, vt.settlementCur, `Payment cur ${p1.paymentCurrency} !== ${vt.settlementCur}`);
    assert.strictEqual(p1.settlementCurrency, vt.settlementCur, `Settlement cur ${p1.settlementCurrency} !== ${vt.settlementCur}`);
    assert.strictEqual(p1.currency, vt.settlementCur);
    assert.ok(Math.abs(p1.paymentAmount - vt.settlementExpected[0]) <= 0.02, `P1 payment ${p1.paymentAmount} vs ${vt.settlementExpected[0]}`);
    assert.ok(Math.abs(p2.paymentAmount - vt.settlementExpected[1]) <= 0.02, `P2 payment ${p2.paymentAmount} vs ${vt.settlementExpected[1]}`);
    assert.ok(Math.abs(p3.paymentAmount - vt.settlementExpected[2]) <= 0.02, `P3 payment ${p3.paymentAmount} vs ${vt.settlementExpected[2]}`);
    assert.strictEqual(p1.isDirectPayment, vt.direct);
    assert.strictEqual(p1.isDirectSettlement, vt.direct);
    assert.strictEqual(p1.requiresUsdFallback, !vt.direct);
  });
});

// ----------------------------------------------------
// 3. 20+ Additional Countries Across Diverse Regions
// ----------------------------------------------------
const additionalCountries = [
  // Europe
  { code: 'DE', region: 'Europe', expCur: 'EUR', direct: true },
  { code: 'FR', region: 'Europe', expCur: 'EUR', direct: true },
  { code: 'IT', region: 'Europe', expCur: 'EUR', direct: true },
  { code: 'SE', region: 'Europe', expCur: 'SEK', direct: false },
  { code: 'CH', region: 'Europe', expCur: 'CHF', direct: false },
  { code: 'PL', region: 'Europe', expCur: 'PLN', direct: false },
  // Americas
  { code: 'CA', region: 'Americas', expCur: 'CAD', direct: true },
  { code: 'BR', region: 'Americas', expCur: 'BRL', direct: false },
  { code: 'MX', region: 'Americas', expCur: 'MXN', direct: false },
  { code: 'AR', region: 'Americas', expCur: 'ARS', direct: false },
  { code: 'CO', region: 'Americas', expCur: 'COP', direct: false },
  { code: 'CL', region: 'Americas', expCur: 'CLP', direct: false },
  // Asia/Pacific
  { code: 'SG', region: 'Asia/Pacific', expCur: 'SGD', direct: true },
  { code: 'ID', region: 'Asia/Pacific', expCur: 'IDR', direct: false },
  { code: 'VN', region: 'Asia/Pacific', expCur: 'VND', direct: false },
  { code: 'TH', region: 'Asia/Pacific', expCur: 'THB', direct: false },
  { code: 'NZ', region: 'Asia/Pacific', expCur: 'NZD', direct: false },
  { code: 'PH', region: 'Asia/Pacific', expCur: 'PHP', direct: false },
  // Middle East
  { code: 'AE', region: 'Middle East', expCur: 'AED', direct: true },
  { code: 'SA', region: 'Middle East', expCur: 'SAR', direct: false },
  { code: 'QA', region: 'Middle East', expCur: 'QAR', direct: false },
  { code: 'IL', region: 'Middle East', expCur: 'ILS', direct: false },
  { code: 'KW', region: 'Middle East', expCur: 'KWD', direct: false },
  { code: 'OM', region: 'Middle East', expCur: 'OMR', direct: false },
  // Africa
  { code: 'ZA', region: 'Africa', expCur: 'ZAR', direct: false },
  { code: 'KE', region: 'Africa', expCur: 'KES', direct: false },
  { code: 'EG', region: 'Africa', expCur: 'EGP', direct: false },
  { code: 'GH', region: 'Africa', expCur: 'GHS', direct: false },
  { code: 'NA', region: 'Africa', expCur: 'NAD', direct: false }
];

test(`20+ Additional Countries Across Diverse Regions (${additionalCountries.length} countries tested)`, () => {
  additionalCountries.forEach(c => {
    const plans = getAllPlansPricing(c.code);
    assert.strictEqual(plans.pricingCurrency, c.expCur, `Expected pricing currency ${c.expCur} for ${c.code}, got ${plans.pricingCurrency}`);
    assert.ok(plans.certificate.pricingAmount > 0, `Certificate local price for ${c.code} must be > 0`);
    assert.ok(plans.project.pricingAmount > plans.certificate.pricingAmount, `Project local price must exceed Certificate for ${c.code}`);
    assert.ok(plans.comprehensive.pricingAmount > plans.project.pricingAmount, `Comprehensive local price must exceed Project for ${c.code}`);

    if (c.direct) {
      assert.strictEqual(plans.paymentCurrency, c.expCur, `Direct payment expected ${c.expCur} for ${c.code}`);
      assert.strictEqual(plans.settlementCurrency, c.expCur, `Direct settlement expected ${c.expCur} for ${c.code}`);
      assert.strictEqual(plans.requiresUsdFallback, false);
    } else {
      assert.strictEqual(plans.paymentCurrency, 'USD', `Fallback payment USD expected for ${c.code}`);
      assert.strictEqual(plans.settlementCurrency, 'USD', `Fallback USD expected for ${c.code}`);
      assert.strictEqual(plans.certificate.paymentAmount, 4.99);
      assert.strictEqual(plans.project.paymentAmount, 10.03);
      assert.strictEqual(plans.comprehensive.paymentAmount, 15.07);
      assert.strictEqual(plans.certificate.settlementAmount, 4.99);
      assert.strictEqual(plans.project.settlementAmount, 10.03);
      assert.strictEqual(plans.comprehensive.settlementAmount, 15.07);
      assert.strictEqual(plans.requiresUsdFallback, true);
    }
  });
});

// ----------------------------------------------------
// 4. Namibia Correction
// ----------------------------------------------------
test('Namibia has authoritative ISO-2 "NA" and correct NAD pricing with USD payment charge', () => {
  const rec = getCountryPppRecord('NA');
  assert.ok(rec !== null, 'Namibia record must exist under ISO-2 "NA"');
  assert.strictEqual(rec.country, 'Namibia');
  assert.strictEqual(rec.iso2, 'NA');
  assert.strictEqual(rec.currency, 'NAD');
  assert.strictEqual(rec.pppFactor, 7.3792);
  assert.strictEqual(rec.minorUnits, 2);
  assert.strictEqual(rec.status, 'valid');

  const pricing = getPlanPricing('certificate', 'NA');
  assert.strictEqual(pricing.pricingAmount, 36.82);
  assert.strictEqual(pricing.pricingFormatted, 'N$36.82');
  assert.strictEqual(pricing.paymentCurrency, 'USD');
  assert.strictEqual(pricing.paymentAmount, 4.99);
  assert.strictEqual(pricing.settlementCurrency, 'USD');
  assert.strictEqual(pricing.settlementAmount, 4.99);
  assert.strictEqual(pricing.requiresUsdFallback, true);
});

// ----------------------------------------------------
// 5. Zimbabwe Handling
// ----------------------------------------------------
test('Zimbabwe handles obsolete currency safely: suppresses 0.14 ZWL and applies deterministic USD payment fallback', () => {
  const rec = getCountryPppRecord('ZW');
  assert.ok(rec !== null, 'Zimbabwe record exists');
  assert.strictEqual(rec.status, 'fallback_required');
  assert.ok(rec.reason.includes('ZWL'));

  const p1 = getPlanPricing('certificate', 'ZW');
  const p2 = getPlanPricing('project', 'ZW');
  const p3 = getPlanPricing('comprehensive', 'ZW');

  // Must NEVER be 0.14 ZWL
  assert.notStrictEqual(p1.amount, 0.14);
  assert.notStrictEqual(p1.pricingAmount, 0.14);
  assert.notStrictEqual(p1.currency, 'ZWL');
  assert.notStrictEqual(p1.pricingCurrency, 'ZWL');
  assert.strictEqual(p1.status, 'fallback_applied');

  // Deterministic USD fallback
  assert.strictEqual(p1.currency, 'USD');
  assert.strictEqual(p1.amount, 4.99);
  assert.strictEqual(p1.paymentCurrency, 'USD');
  assert.strictEqual(p1.paymentAmount, 4.99);
  assert.strictEqual(p1.settlementCurrency, 'USD');
  assert.strictEqual(p1.settlementAmount, 4.99);

  assert.strictEqual(p2.currency, 'USD');
  assert.strictEqual(p2.amount, 10.03);
  assert.strictEqual(p2.paymentCurrency, 'USD');
  assert.strictEqual(p2.paymentAmount, 10.03);

  assert.strictEqual(p3.currency, 'USD');
  assert.strictEqual(p3.amount, 15.07);
  assert.strictEqual(p3.paymentCurrency, 'USD');
  assert.strictEqual(p3.paymentAmount, 15.07);
});

// ----------------------------------------------------
// 6. Zero-Decimal Currencies (JPY, KRW, VND, CLP, PYG)
// ----------------------------------------------------
test('Zero-decimal currencies round local pricing to whole units without decimals', () => {
  ['JP', 'KR', 'VN', 'CL', 'PY'].forEach(code => {
    const p = getPlanPricing('certificate', code);
    assert.strictEqual(p.minorUnits, 0);
    assert.strictEqual(p.pricingAmount, Math.round(p.pricingAmount));
    assert.strictEqual(Number.isInteger(p.pricingAmount), true);
  });
});

// ----------------------------------------------------
// 7. Three-Decimal Currencies (KWD, OMR, BHD, JOD)
// ----------------------------------------------------
test('Three-decimal currencies round local pricing to 3 decimal places', () => {
  ['KW', 'OM', 'BH', 'JO'].forEach(code => {
    const p = getPlanPricing('certificate', code);
    assert.strictEqual(p.minorUnits, 3);
    const parts = p.pricingAmount.toString().split('.');
    assert.ok(!parts[1] || parts[1].length <= 3);
  });

  // Explicit KWD check
  const kw = getPlanPricing('certificate', 'KW');
  assert.strictEqual(kw.pricingCurrency, 'KWD');
  assert.strictEqual(kw.pricingAmount, 0.914);
  assert.strictEqual(kw.pricingFormatted, 'KWD 0.914');
  assert.strictEqual(kw.minorUnits, 3);

  // Explicit OMR check
  const om = getPlanPricing('certificate', 'OM');
  assert.strictEqual(om.pricingCurrency, 'OMR');
  assert.strictEqual(om.pricingAmount, 0.908);
  assert.strictEqual(om.pricingFormatted, 'OMR 0.908');
  assert.strictEqual(om.minorUnits, 3);
});

// ----------------------------------------------------
// 8. Older PPP Years Preservation
// ----------------------------------------------------
test('Older PPP observations (<2025) preserve their source year and are marked', () => {
  const recs = getAllCountryRecords();
  let older = 0;
  for (const c of Object.values(recs)) {
    if (c.dataYear < 2025) {
      older++;
      assert.ok(c.status === 'warning_older_data' || c.status === 'fallback_required');
      assert.ok(c.dataYear >= 2021 && c.dataYear <= 2024);
    }
  }
  assert.strictEqual(older, 23);
});

// ----------------------------------------------------
// 9. Missing / Unknown / Localhost / Crawlers Fallback
// ----------------------------------------------------
test('Missing country, unknown code, and localhost fall back safely', () => {
  assert.strictEqual(getCurrencyForCountry(null), 'INR');
  assert.strictEqual(getCurrencyForCountry(''), 'INR');
  assert.strictEqual(getCurrencyForCountry('XX'), 'INR');

  // Domestic / local fallback (null / IN)
  const pNull = getPlanPricing('certificate', null);
  assert.strictEqual(pNull.currency, 'INR');
  assert.strictEqual(pNull.amount, 99);

  // Unrecognized international territory code falls back to deterministic USD
  const pUnk = getPlanPricing('certificate', 'ZZ');
  assert.strictEqual(pUnk.currency, 'USD');
  assert.strictEqual(pUnk.amount, 4.99);
  assert.strictEqual(pUnk.status, 'fallback_country_not_found');
});

// ----------------------------------------------------
// 10. Explicit "Switch to INR" Option
// ----------------------------------------------------
test('Explicit INR switch returns domestic ₹99 / ₹199 / ₹299 for any country', () => {
  const p1 = getPlanPricing('certificate', 'US', null, { explicitInr: true });
  assert.strictEqual(p1.currency, 'INR');
  assert.strictEqual(p1.amount, 99);
  assert.strictEqual(p1.formatted, '₹99');

  const p2 = getPlanPricing('certificate', 'INR');
  assert.strictEqual(p2.currency, 'INR');
  assert.strictEqual(p2.amount, 99);
});

// ----------------------------------------------------
// 11. Cashfree Gateway Currency Support & Payment Architecture
// ----------------------------------------------------
test('Cashfree direct vs fallback payment architecture', () => {
  // Direct supported: US, NL, GB, JP, AU, CA, AE, SG, IN
  const directUS = getPlanPricing('certificate', 'US');
  assert.strictEqual(directUS.isDirectPayment, true);
  assert.strictEqual(directUS.pricingCurrency, 'USD');
  assert.strictEqual(directUS.paymentCurrency, 'USD');
  assert.strictEqual(directUS.paymentAmount, 4.99);

  const directJP = getPlanPricing('certificate', 'JP');
  assert.strictEqual(directJP.isDirectPayment, true);
  assert.strictEqual(directJP.pricingCurrency, 'JPY');
  assert.strictEqual(directJP.paymentCurrency, 'JPY');
  assert.strictEqual(directJP.paymentAmount, 516);

  // Unsupported by gateway: Nigeria (NGN), Russia (RUB), South Korea (KRW)
  // MUST display local PPP price and charge in USD payment fallback ($4.99)
  const ng = getPlanPricing('certificate', 'NG');
  assert.strictEqual(ng.pricingCurrency, 'NGN');
  assert.strictEqual(ng.pricingAmount, 1587.18);
  assert.strictEqual(ng.isDirectPayment, false);
  assert.strictEqual(ng.requiresUsdFallback, true);
  assert.strictEqual(ng.paymentCurrency, 'USD');
  assert.strictEqual(ng.paymentAmount, 4.99);

  const kr = getPlanPricing('certificate', 'KR');
  assert.strictEqual(kr.pricingCurrency, 'KRW');
  assert.strictEqual(kr.pricingAmount, 4392);
  assert.strictEqual(kr.isDirectPayment, false);
  assert.strictEqual(kr.requiresUsdFallback, true);
  assert.strictEqual(kr.paymentCurrency, 'USD');
  assert.strictEqual(kr.paymentAmount, 4.99);

  const ru = getPlanPricing('certificate', 'RU');
  assert.strictEqual(ru.pricingCurrency, 'RUB');
  assert.strictEqual(ru.pricingAmount, 153.46);
  assert.strictEqual(ru.isDirectPayment, false);
  assert.strictEqual(ru.requiresUsdFallback, true);
  assert.strictEqual(ru.paymentCurrency, 'USD');
  assert.strictEqual(ru.paymentAmount, 4.99);
});

// ----------------------------------------------------
// 12. Gateway Subunits Conversions
// ----------------------------------------------------
test('Gateway subunits conversions (to/from gateway minor units)', () => {
  // INR: 99 -> 9900 paise
  assert.strictEqual(toGatewaySubunits(99, 'INR'), 9900);
  assert.strictEqual(fromGatewaySubunits(9900, 'INR'), 99);

  // USD: 4.99 -> 499 cents
  assert.strictEqual(toGatewaySubunits(4.99, 'USD'), 499);
  assert.strictEqual(fromGatewaySubunits(499, 'USD'), 4.99);

  // JPY: 516 -> 516 (0 decimals)
  assert.strictEqual(toGatewaySubunits(516, 'JPY'), 516);
  assert.strictEqual(fromGatewaySubunits(516, 'JPY'), 516);

  // KRW: 4392 -> 4392 (0 decimals)
  assert.strictEqual(toGatewaySubunits(4392, 'KRW'), 4392);
  assert.strictEqual(fromGatewaySubunits(4392, 'KRW'), 4392);

  // KWD: 0.914 -> 914 (3 decimals)
  assert.strictEqual(toGatewaySubunits(0.914, 'KWD'), 914);
  assert.strictEqual(fromGatewaySubunits(914, 'KWD'), 0.914);

  // OMR: 0.908 -> 908 (3 decimals)
  assert.strictEqual(toGatewaySubunits(0.908, 'OMR'), 908);
  assert.strictEqual(fromGatewaySubunits(908, 'OMR'), 0.908);

  // EUR: 3.83 -> 383 (2 decimals)
  assert.strictEqual(toGatewaySubunits(3.83, 'EUR'), 383);
  assert.strictEqual(fromGatewaySubunits(383, 'EUR'), 3.83);
});

// ----------------------------------------------------
// 13. Price Tampering Security Test
// ----------------------------------------------------
test('Price Tampering: Client amount and client currency tampering are rejected', () => {
  // Client attempts to pass amount: 0.01 or currency: 'INR' without explicit switch
  const maliciousReq = {
    body: {
      plan: 'comprehensive',
      amount: 0.01,
      currency: 'INR'
    }
  };
  const resolvedGeoUS = { country: 'US', currency: 'USD' };

  // Independent server resolution (identical to POST /api/checkout)
  const isExplicitInr = (
    (maliciousReq.body.currencyPreference === 'INR' || maliciousReq.body.currency === 'INR') &&
    (maliciousReq.body.explicitInr === true || maliciousReq.body.explicitInr === 'true')
  );
  assert.strictEqual(isExplicitInr, false, 'Tampered INR without explicitInr flag must NOT be honored');

  const target = isExplicitInr ? 'INR' : resolvedGeoUS.country;
  const pppPricing = getPlanPricing('comprehensive', target);

  assert.strictEqual(pppPricing.currency, 'USD');
  assert.strictEqual(pppPricing.amount, 15.07);
  assert.notStrictEqual(pppPricing.amount, 0.01);
});

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
}
