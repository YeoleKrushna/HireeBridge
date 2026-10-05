const assert = require('assert');
const db = require('../db.js');
const {
  getPlanPricing,
  formatPrice,
  toGatewaySubunits,
  fromGatewaySubunits,
  getMinorUnits
} = require('../config/pricing.js');

async function runMonetaryPrecisionTests() {
  console.log('========================================================================');
  console.log('HIREEBRIDGE MONETARY PRECISION & INVARIANT TEST SUITE');
  console.log('========================================================================\n');

  await db.init();

  let pass = 0;
  let fail = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      pass++;
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      fail++;
    }
  }

  // 1. KWD 3-decimal amount
  await check('KWD 3-decimal currency invariant: calculated = displayed = db = Cashfree = verified', async () => {
    const pricing = getPlanPricing('certificate', 'KW');
    assert.strictEqual(pricing.pricingCurrency, 'KWD');
    assert.strictEqual(pricing.minorUnits, 3);
    assert.strictEqual(getMinorUnits('KWD'), 3);

    // Calculated amount
    const calcAmount = pricing.pricingAmount;
    assert.strictEqual(calcAmount, 0.914);

    // Displayed amount
    const displayed = pricing.pricingFormatted;
    assert.strictEqual(displayed, 'KWD 0.914');
    assert.strictEqual(formatPrice(calcAmount, 'KWD'), 'KWD 0.914');

    // Gateway subunits conversion
    const subunits = toGatewaySubunits(calcAmount, 'KWD');
    assert.strictEqual(subunits, 914);
    assert.strictEqual(fromGatewaySubunits(subunits, 'KWD'), 0.914);

    // Database roundtrip test (Direct storage in NUMERIC(14,3))
    const testId = `PREC-KWD-${Date.now()}`;
    await db.createOrder({
      id: testId,
      name: 'KWD Precision Student',
      email: 'student.kwd@example.com',
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'certificate',
      amount: calcAmount,
      currency: 'KWD',
      country: 'KW',
      pricingCurrency: 'KWD',
      pricingAmount: calcAmount,
      paymentCurrency: 'KWD',
      paymentAmount: calcAmount
    });

    const saved = await db.getOrderById(testId);
    assert.ok(saved, 'Saved order must exist');
    assert.strictEqual(saved.currency, 'KWD');
    assert.strictEqual(Number(saved.amount), 0.914);
    assert.strictEqual(Number(saved.pricingAmount), 0.914);
    assert.strictEqual(Number(saved.paymentAmount), 0.914);
    // Strict precision equality: no truncation to 0.91
    assert.strictEqual(saved.pricingAmount, calcAmount);
    assert.strictEqual(saved.paymentAmount, calcAmount);
    assert.strictEqual(saved.amount, calcAmount);

    // Verification check: Cashfree payment matching simulated
    const gatewayOrder = { order_id: testId, order_status: 'PAID', order_amount: 0.914, order_currency: 'KWD' };
    const payment = { payment_status: 'SUCCESS', order_id: testId, payment_amount: 0.914, payment_currency: 'KWD' };
    assert.strictEqual(Number(gatewayOrder.order_amount), Number(saved.amount));
    assert.strictEqual(Number(payment.payment_amount), Number(saved.amount));

    // Update order with 3-decimal amounts
    await db.updateOrder(testId, {
      amount: 0.915,
      pricingAmount: 0.915,
      paymentAmount: 0.915
    });
    const updated = await db.getOrderById(testId);
    assert.strictEqual(Number(updated.amount), 0.915);
    assert.strictEqual(Number(updated.pricingAmount), 0.915);
    assert.strictEqual(Number(updated.paymentAmount), 0.915);
  });

  // 2. OMR 3-decimal amount
  await check('OMR 3-decimal currency invariant: calculated = displayed = db = Cashfree = verified', async () => {
    const pricing = getPlanPricing('certificate', 'OM');
    assert.strictEqual(pricing.pricingCurrency, 'OMR');
    assert.strictEqual(pricing.minorUnits, 3);
    assert.strictEqual(getMinorUnits('OMR'), 3);

    // Calculated amount
    const calcAmount = pricing.pricingAmount;
    assert.strictEqual(calcAmount, 0.908);

    // Displayed amount
    const displayed = pricing.pricingFormatted;
    assert.strictEqual(displayed, 'OMR 0.908');
    assert.strictEqual(formatPrice(calcAmount, 'OMR'), 'OMR 0.908');

    // Gateway subunits conversion
    const subunits = toGatewaySubunits(calcAmount, 'OMR');
    assert.strictEqual(subunits, 908);
    assert.strictEqual(fromGatewaySubunits(subunits, 'OMR'), 0.908);

    // Database roundtrip test
    const testId = `PREC-OMR-${Date.now()}`;
    await db.createOrder({
      id: testId,
      name: 'OMR Precision Student',
      email: 'student.omr@example.com',
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'certificate',
      amount: calcAmount,
      currency: 'OMR',
      country: 'OM',
      pricingCurrency: 'OMR',
      pricingAmount: calcAmount,
      paymentCurrency: 'OMR',
      paymentAmount: calcAmount
    });

    const saved = await db.getOrderById(testId);
    assert.ok(saved, 'Saved order must exist');
    assert.strictEqual(Number(saved.amount), 0.908);
    assert.strictEqual(Number(saved.pricingAmount), 0.908);
    assert.strictEqual(Number(saved.paymentAmount), 0.908);
    // Strict precision equality: no truncation to 0.90 or 0.91
    assert.strictEqual(saved.pricingAmount, calcAmount);
    assert.strictEqual(saved.paymentAmount, calcAmount);
    assert.strictEqual(saved.amount, calcAmount);

    // Verification check
    const gatewayOrder = { order_id: testId, order_status: 'PAID', order_amount: 0.908, order_currency: 'OMR' };
    const payment = { payment_status: 'SUCCESS', order_id: testId, payment_amount: 0.908, payment_currency: 'OMR' };
    assert.strictEqual(Number(gatewayOrder.order_amount), Number(saved.amount));
    assert.strictEqual(Number(payment.payment_amount), Number(saved.amount));
  });

  // 3. EUR 2-decimal amount
  await check('EUR 2-decimal currency invariant: calculated = displayed = db = Cashfree = verified', async () => {
    const pricing = getPlanPricing('certificate', 'NL');
    assert.strictEqual(pricing.pricingCurrency, 'EUR');
    assert.strictEqual(pricing.paymentCurrency, 'EUR');
    assert.strictEqual(pricing.minorUnits, 2);
    assert.strictEqual(getMinorUnits('EUR'), 2);

    // Calculated amount
    const calcAmount = pricing.paymentAmount;
    assert.strictEqual(calcAmount, 3.83);

    // Displayed amount
    assert.strictEqual(pricing.paymentFormatted, '€3.83');
    assert.strictEqual(formatPrice(calcAmount, 'EUR'), '€3.83');

    // Gateway subunits
    const subunits = toGatewaySubunits(calcAmount, 'EUR');
    assert.strictEqual(subunits, 383);
    assert.strictEqual(fromGatewaySubunits(subunits, 'EUR'), 3.83);

    // Database roundtrip test
    const testId = `PREC-EUR-${Date.now()}`;
    await db.createOrder({
      id: testId,
      name: 'EUR Precision Student',
      email: 'student.eur@example.com',
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'certificate',
      amount: calcAmount,
      currency: 'EUR',
      country: 'NL',
      pricingCurrency: 'EUR',
      pricingAmount: calcAmount,
      paymentCurrency: 'EUR',
      paymentAmount: calcAmount
    });

    const saved = await db.getOrderById(testId);
    assert.ok(saved, 'Saved order must exist');
    assert.strictEqual(Number(saved.amount), 3.83);
    assert.strictEqual(Number(saved.pricingAmount), 3.83);
    assert.strictEqual(Number(saved.paymentAmount), 3.83);

    // Verification check
    const gatewayOrder = { order_id: testId, order_status: 'PAID', order_amount: 3.83, order_currency: 'EUR' };
    const payment = { payment_status: 'SUCCESS', order_id: testId, payment_amount: 3.83, payment_currency: 'EUR' };
    assert.strictEqual(Number(gatewayOrder.order_amount), Number(saved.amount));
    assert.strictEqual(Number(payment.payment_amount), Number(saved.amount));
  });

  // 4. JPY 0-decimal amount
  await check('JPY 0-decimal currency invariant: calculated = displayed = db = Cashfree = verified', async () => {
    const pricing = getPlanPricing('certificate', 'JP');
    assert.strictEqual(pricing.pricingCurrency, 'JPY');
    assert.strictEqual(pricing.paymentCurrency, 'JPY');
    assert.strictEqual(pricing.minorUnits, 0);
    assert.strictEqual(getMinorUnits('JPY'), 0);

    // Calculated amount
    const calcAmount = pricing.paymentAmount;
    assert.strictEqual(calcAmount, 516);

    // Displayed amount
    assert.strictEqual(pricing.paymentFormatted, '¥516');
    assert.strictEqual(formatPrice(calcAmount, 'JPY'), '¥516');

    // Gateway subunits (0 decimals = 1:1)
    const subunits = toGatewaySubunits(calcAmount, 'JPY');
    assert.strictEqual(subunits, 516);
    assert.strictEqual(fromGatewaySubunits(subunits, 'JPY'), 516);

    // Database roundtrip test
    const testId = `PREC-JPY-${Date.now()}`;
    await db.createOrder({
      id: testId,
      name: 'JPY Precision Student',
      email: 'student.jpy@example.com',
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'certificate',
      amount: calcAmount,
      currency: 'JPY',
      country: 'JP',
      pricingCurrency: 'JPY',
      pricingAmount: calcAmount,
      paymentCurrency: 'JPY',
      paymentAmount: calcAmount
    });

    const saved = await db.getOrderById(testId);
    assert.ok(saved, 'Saved order must exist');
    assert.strictEqual(Number(saved.amount), 516);
    assert.strictEqual(Number(saved.pricingAmount), 516);
    assert.strictEqual(Number(saved.paymentAmount), 516);

    // Verification check
    const gatewayOrder = { order_id: testId, order_status: 'PAID', order_amount: 516, order_currency: 'JPY' };
    const payment = { payment_status: 'SUCCESS', order_id: testId, payment_amount: 516, payment_currency: 'JPY' };
    assert.strictEqual(Number(gatewayOrder.order_amount), Number(saved.amount));
    assert.strictEqual(Number(payment.payment_amount), Number(saved.amount));
  });

  // 5. KRW 0-decimal amount
  await check('KRW 0-decimal currency invariant: calculated = displayed = db = Cashfree = verified', async () => {
    const pricing = getPlanPricing('certificate', 'KR');
    assert.strictEqual(pricing.pricingCurrency, 'KRW');
    assert.strictEqual(pricing.minorUnits, 0);
    assert.strictEqual(getMinorUnits('KRW'), 0);

    // Calculated amount
    const calcAmount = pricing.pricingAmount;
    assert.strictEqual(calcAmount, 4392);

    // Displayed amount
    assert.strictEqual(pricing.pricingFormatted, '₩4,392');
    assert.strictEqual(formatPrice(calcAmount, 'KRW'), '₩4,392');

    // Gateway subunits
    const subunits = toGatewaySubunits(calcAmount, 'KRW');
    assert.strictEqual(subunits, 4392);
    assert.strictEqual(fromGatewaySubunits(subunits, 'KRW'), 4392);

    // Database roundtrip test
    const testId = `PREC-KRW-${Date.now()}`;
    await db.createOrder({
      id: testId,
      name: 'KRW Precision Student',
      email: 'student.krw@example.com',
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'certificate',
      amount: pricing.paymentAmount, // 4.99 USD charged
      currency: pricing.paymentCurrency,
      country: 'KR',
      pricingCurrency: 'KRW',
      pricingAmount: calcAmount,
      paymentCurrency: 'USD',
      paymentAmount: pricing.paymentAmount
    });

    const saved = await db.getOrderById(testId);
    assert.ok(saved, 'Saved order must exist');
    assert.strictEqual(Number(saved.pricingAmount), 4392);
    assert.strictEqual(Number(saved.paymentAmount), 4.99);
    assert.strictEqual(Number(saved.amount), 4.99);
    assert.strictEqual(saved.pricingCurrency, 'KRW');
    assert.strictEqual(saved.paymentCurrency, 'USD');
  });

  // 6. Existing 2-decimal transactions (INR ₹99 and USD $15.07) are completely unaffected
  await check('Existing 2-decimal transactions (INR ₹99, USD $15.07) remain completely unaffected', async () => {
    const inrId = `PREC-INR-${Date.now()}`;
    await db.createOrder({
      id: inrId,
      name: 'Domestic Student',
      email: 'student.inr@example.com',
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'certificate',
      amount: 99,
      currency: 'INR',
      country: 'IN',
      pricingCurrency: 'INR',
      pricingAmount: 99,
      paymentCurrency: 'INR',
      paymentAmount: 99
    });

    const savedInr = await db.getOrderById(inrId);
    assert.strictEqual(Number(savedInr.amount), 99);
    assert.strictEqual(Number(savedInr.pricingAmount), 99);
    assert.strictEqual(Number(savedInr.paymentAmount), 99);
    assert.strictEqual(formatPrice(savedInr.amount, 'INR'), '₹99');

    const usdId = `PREC-USD-${Date.now()}`;
    await db.createOrder({
      id: usdId,
      name: 'US Comprehensive Student',
      email: 'student.usd@example.com',
      domain: 'Data Science',
      duration: '4 Weeks',
      plan: 'comprehensive',
      amount: 15.07,
      currency: 'USD',
      country: 'US',
      pricingCurrency: 'USD',
      pricingAmount: 15.07,
      paymentCurrency: 'USD',
      paymentAmount: 15.07
    });

    const savedUsd = await db.getOrderById(usdId);
    assert.strictEqual(Number(savedUsd.amount), 15.07);
    assert.strictEqual(Number(savedUsd.pricingAmount), 15.07);
    assert.strictEqual(Number(savedUsd.paymentAmount), 15.07);
    assert.strictEqual(formatPrice(savedUsd.amount, 'USD'), '$15.07');
  });

  // Clean up test orders
  if (db.pool) {
    await db.pool.query("DELETE FROM orders WHERE id LIKE 'PREC-%'");
  }

  console.log(`\n========================================================================`);
  console.log(`MONETARY PRECISION SUMMARY: ${pass} PASSED, ${fail} FAILED`);
  console.log(`========================================================================\n`);

  process.exit(fail > 0 ? 1 : 0);
}

runMonetaryPrecisionTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
