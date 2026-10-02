# HireeBridge — production-ready starter

HireeBridge is a Node/Express internship + credential platform. It includes a polished SEO-first public site, server-priced enrollment checkout, dashboard, task workflow, certificate generation from the supplied GreyRocks template, GreyRocks verification redirect, 20 SEO blog posts, FAQs, legal pages, robots.txt and sitemap.xml.

## Run locally

1. Install Node.js 20+.
2. `copy .env.example .env` on Windows.
3. For local development, explicitly set `NODE_ENV=development`, `CASHFREE_ENV=sandbox`, and sandbox credentials (`CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`) in `.env`. Production defaults to Cashfree production mode.
4. `npm install`
5. `npm start`
6. Open `http://localhost:3000`

## Production notes

- Payments use Cashfree hosted Web Checkout. Current INR prices for the three programs are seeded once at ₹1, ₹2, and ₹3 in the persistent `program_prices` table. An authenticated Admin can change them in Admin Portal → Program Pricing without a code change or redeploy.
- The database price is authoritative for public pages and new orders. Existing order amounts are immutable snapshots. International display/payment amounts are derived from the current INR price and existing market currency ratios.
- Missing Cashfree credentials or a gateway outage disables checkout; there is no demo-paid fallback.
- Set `SITE_URL=https://hireebridge.in`. Cashfree callbacks are derived from this origin: `/payment/return?order_id={order_id}` and `/api/payment/webhook`. Production order creation rejects HTTP, localhost, or any other host.
- Configure the Cashfree webhook at `https://hireebridge.in/api/payment/webhook` and enable the payment success webhook event in the Cashfree dashboard.
- Production environment variables: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=production`, `CASHFREE_API_VERSION=2025-01-01`, and `SITE_URL=https://hireebridge.in`.
- International payment currencies/methods require Cashfree merchant account approval and enablement. Unsupported currencies fail without automatic conversion; customers may explicitly switch to INR.
- Configure SMTP before relying on email delivery. The app tracks a 300-email daily budget in `data/db.json`.
- Replace illustrative review cards with consented, verifiable student reviews before publishing them as testimonials.
- Verification is represented as a GreyRocks verification destination; the production GreyRocks verification endpoint must be deployed separately.
