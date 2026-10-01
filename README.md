# HireeBridge — production-ready starter

HireeBridge is a Node/Express internship + credential platform. It includes a polished SEO-first public site, pricing, checkout demo mode, dashboard, task workflow, certificate generation from the supplied GreyRocks template, GreyRocks verification redirect, 20 SEO blog posts, FAQs, legal pages, robots.txt and sitemap.xml.

## Run locally

1. Install Node.js 20+.
2. `copy .env.example .env` on Windows.
3. Fill Razorpay/SMTP values when you are ready for live payments/email. Leaving them blank enables local demo checkout.
4. `npm install`
5. `npm start`
6. Open `http://localhost:3000`

## Production notes

- Demo checkout is intentionally enabled when Razorpay keys are blank. Do not treat demo orders as paid in production.
- Before launch, wire Razorpay Orders + signature verification and your production database/storage.
- Configure SMTP before relying on email delivery. The app tracks a 300-email daily budget in `data/db.json`.
- Replace illustrative review cards with consented, verifiable student reviews before publishing them as testimonials.
- Verification is represented as a GreyRocks verification destination; the production GreyRocks verification endpoint must be deployed separately.
