# HireeBridge Production Smoke-Test & Verification Plan

This checklist outlines the exact verification sequence to be executed after deployment on Render.

---

## Part 1: Pre-Flight & Health Checks

- [ ] **1.1 Lightweight Health Check**:
  - Request: `GET https://hireebridge.in/health`
  - Expected: HTTP `200 OK`, JSON response `{ ok: true, status: 'healthy', service: 'hireebridge', database: 'connected' }`
- [ ] **1.2 Security Headers Audit**:
  - Request: `curl -I https://hireebridge.in/`
  - Expected headers:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: SAMEORIGIN`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] **1.3 Robots & Sitemap**:
  - `GET https://hireebridge.in/robots.txt` → includes `Disallow: /admin`, `Disallow: /dashboard`, `Sitemap: https://hireebridge.in/sitemap.xml`
  - `GET https://hireebridge.in/sitemap.xml` → XML valid, contains canonical URLs.

---

## Part 2: End-to-End Happy Path Verification

- [ ] **2.1 Homepage & Navigation**:
  - Load `https://hireebridge.in/`.
  - Verify Hero section, Pricing cards, Curriculum sections, and Footer links.
  - Verify `/contact`, `/pricing`, `/how-it-works`, `/certificate`, `/privacy`, `/terms`, `/data-rights`.
- [ ] **2.2 Student Registration & Checkout**:
  - Navigate to `/checkout?plan=project&domain=web-development`.
  - Enter student details, phone number, check required Privacy Policy notice and 18+ age confirmation.
  - Submit checkout → Cashfree payment modal loads correctly.
- [ ] **2.3 Cashfree Payment & Webhook**:
  - Complete payment in Cashfree Gateway (Production / Sandbox).
  - Cashfree triggers `POST /api/payment/webhook` with `x-webhook-signature`.
  - Order status transitions atomically: `created` → `paid_processing` → `paid`.
  - Task is automatically assigned for the purchased domain.
- [ ] **2.4 Student Dashboard Access**:
  - Student is redirected to `/dashboard`.
  - Verify **Internship Roadmap** and **Curated Project Resources** tabs are accessible.
  - Verify **Submit Deliverables** form is active.
- [ ] **2.5 Task Submission**:
  - Student submits GitHub repository link (`https://github.com/example/repo`), LinkedIn, and optional deployment URL.
  - System registers submission with status `pending`.
  - Status updates to `under_review`.
- [ ] **2.6 Admin Evaluation & Approval**:
  - Admin logs in at `/login` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
  - Open `/admin#submissions`.
  - Click **Approve Submission**:
    - Backend generates official GreyRocks certificate via Python engine.
    - Uploads JPG & PDF artifacts to Cloudflare R2 bucket.
    - Sends congratulatory certificate email via Brevo SMTP.
- [ ] **2.7 Credential Verification**:
  - Open public verification link `https://hireebridge.in/verification/[CREDENTIAL_ID]`.
  - Verify Candidate Name, Domain, Issue Date, and GreyRocks verification destination are displayed.
  - Verify no personal contact info (email, phone, payment) is exposed.
- [ ] **2.8 Logout**:
  - Click Logout → Session cookie is cleared with `Expires=1970`, redirected to `/login`.

---

## Part 3: Failure & Edge-Case Scenarios

- [ ] **3.1 Payment Cancellation / Drop-off**:
  - Close Cashfree payment window before paying.
  - Verify order remains in `created` status without granting task access or issuing credentials.
- [ ] **3.2 Duplicate Payment Callbacks / Webhook Retry**:
  - Resend the exact same `PAYMENT_SUCCESS_WEBHOOK` payload.
  - Verify backend returns `status: 'ok'` without duplicating tasks or re-running fulfillment.
- [ ] **3.3 Duplicate Click / Debounce**:
  - Rapid double-click on checkout submission.
  - Backend in-flight debounce prevents duplicate order rows.
- [ ] **3.4 Path Traversal Defense**:
  - Request `GET https://hireebridge.in/downloads/..%2F..%2F.env`.
  - Expected: HTTP `400 Bad Request` (`Invalid file path.`).
- [ ] **3.5 Rate Limiting (Abuse Prevention)**:
  - Submit 6 consecutive contact messages within 1 minute.
  - 6th request receives HTTP `429 Too Many Requests` with `Retry-After` header.
- [ ] **3.6 Unauthorized Administrative Access**:
  - Attempt `GET /admin` without an active admin session.
  - Expected: Immediate redirect to `/login`.
