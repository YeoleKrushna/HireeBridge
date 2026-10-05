# HireeBridge Master Facts / Truth Audit

**Scope and method.** Read-only source audit of the repository checkout `hireebridge-build` on 2026-10-06. Only this document was added. No application code, database, prices, or production behavior was changed. Evidence references use repository-relative paths and 1-based line numbers. The repository has no `.git` directory in this workspace, no production database connection was supplied, and no running deployment was queried. `data/db.example.json` is a template, not production records. Consequently, persisted/live prices, certificate counts, users, review activity, and the live GreyRocks destination cannot be verified here. Statements about what the code is designed to do are not proof that a deployed external service is operating.

## A. BUSINESS IDENTITY

| Fact | Current Value | Source | Confidence | Problem? |
|---|---|---|---|---|
| Brand name | HireeBridge | `server.js:694-1068` layout; `server.js:6207+` routes; package name in `package.json:2` | High | No |
| Website | `https://hireebridge.in` default | `server.js:35-37`; `.env.example:2`; `README.md:13` | High as configured value; live DNS/site not checked | Deployment could override `SITE_URL` / `CANONICAL_URL` |
| Operator/company | Terms name HireeBridge as “Company”; no legal entity name, registration number, or incorporation evidence found in checked-in public-page code | `server.js:5318-5324`; search of repo | High that public source does not identify a registered entity | Yes, operator legal identity is unclear |
| Issuing organization | GreyRocks Digital Engineering is named in public copy and rendered certificate/verification UI | `server.js:1371-1379`, `server.js:2366-2370`, `server.js:5860-5866`, `server.js:7870-7872` | High that code makes this claim; external authority/authorization not independently evidenced | Yes, issuer relationship is asserted, not independently proven |
| Relationship with GreyRocks | About and legal pages call it a credential-issuing partner; Terms say certificates present it as issuer | `server.js:5402-5405`, `server.js:5116-5117`, `server.js:5324-5327` | High as current claim | Yes, public proof/contract absent in checkout |
| Business address | Not found in rendered company/contact/legal pages or config | `server.js:5388-5522`, `.env.example`; repository search | High (repository inventory) | Yes, no public address located |
| Contact email | `help@hireebridge.in` default | `server.js:34-35`; `.env.example:4`; footer/schema | High as default | Could be overridden with `SUPPORT_EMAIL` |
| Support contact | Contact page links email and a Telegram option; email is also in privacy/refund/verification copy | `server.js:5418-5522`; `server.js:5363-5384` | High for source copy | Telegram contact identity/link needs confirmation |
| LinkedIn | `https://www.linkedin.com/company/hireebridge` in JSON-LD | `server.js:790-794` | High as code value; profile ownership/content not checked | Unverified external destination |
| Instagram | `https://www.instagram.com/hireebridge?stkn=MTU1ZndxY3djZGkxdA==` in JSON-LD | `server.js:790-794` | High as code value | Query-string-bearing profile link; verify it is intentional/current |
| YouTube | No company YouTube link found | Repository-wide search | High | None beyond missing identity link |
| GitHub | No HireeBridge company GitHub/social profile found; external GitHub repositories are used as project references | `config/project-catalogue.js:6-37` | High | Do not imply official account |
| Telegram | Invite URL `https://t.me/+u1eccYEzCelmZDBl` in JSON-LD; contact page has a Telegram contact option | `server.js:790-794`, `server.js:5418-5522` | High as code value | Ownership/current destination unverified |

## Program model

1. **Product classification in source:** the Terms call it “structured educational internship simulations, practical project curricula, and facilitated completion credentials” and say it creates no employment relationship (`server.js:5322-5324`). Public marketing also calls it internship/virtual internship, so “simulation/educational project program presented as an internship” best describes the code without resolving the legal/marketing tension.
2. **Purchase:** one of three plan keys (`certificate`, `project`, `comprehensive`) and a selected domain/duration; checkout creates a Cashfree order and the server snapshots its selected amount/currency (`server.js:6706-6907`; `db.js:1186-1188`). There is no evidence here of actual production transactions.
3. **Delivery:** a domain-mapped project brief/task for all plans; source repository for `project` and `comprehensive`; editable report, PPT/presentation and complete resource kit for `comprehensive`; an offer letter is implemented for paid enrollment and shown in the student dashboard for every plan (not just comprehensive); certificate after approved task submission (`server.js:564-646`, `server.js:1991-1993`, `server.js:2412-2507`, `server.js:2664-2665`). The page table and plan content conflict on offer-letter entitlement; see plan audit.
4. **Student work:** read the assigned project brief, implement/build or adapt/test the project, publish their own GitHub repository, provide a summary and test evidence (and optional demo URL/screenshots) in dashboard task submission (`server.js:564-601`, `server.js:2658-2670`, `server.js:6992-7070`).
5. **Review:** submission records start `pending`; admin evaluation can set status and approved submissions trigger `approveSubmissionAndIssueCertificate` (`server.js:7037-7064`, `server.js:7224-7244`). Public copy says an authorized HireeBridge reviewer; no named mentor, academic reviewer, or external evaluator is identified. The actual acting reviewer is an authorized admin using the admin interface.
6. **After submission:** pending/rejected/approved state shown; approval issues/persists credential, notification, and attempts certificate email (`server.js:7165-7222`). Rejection does not issue it. No evidence of individualized mentor sessions.
7. **Certificate condition:** task must be submitted and explicitly approved. Payment alone provides task access, not certificate issuance (`server.js:591`, `server.js:1570-1572`, `server.js:7165-7206`). A separate admin manual issuance endpoint exists and has an approved-submission guard when an order is attached (`server.js:7246-7309`).
8. **Issuance:** automatic after admin approval succeeds in the approval workflow; also manual admin generation endpoint. Not automatic on payment (`server.js:7165-7244`, `server.js:7246-7309`).
9. **Employment/job/stipend:** Terms explicitly deny employment relationship and promise of paid employment; code contains no job placement or stipend payment workflow found. It must not be marketed as employment/work experience without qualification. Offer letter wording does label GreyRocks as providing an internship opportunity (`server.js:2461-2507`), which conflicts with the Terms simulation/non-employment language.
10. **Terms:** independent, self-paced/guided learners; educational simulation/project curriculum; no employee relationship, apprenticeship, paid job promise, hiring preference, or degree conferral; presents GreyRocks as corporate issuer; claims no refunds; no promise of third-party academic acceptance (`server.js:5322-5327`, `server.js:5363-5371`).

## All 32 internship domains

Authoritative runtime display/checkout catalogue is the `domains` array in `server.js:529-562`; it contains 32 rows. Task/project mapping separately lives in `config/project-catalogue.js:6-37`, with 32 entries. There are no dedicated per-domain HTML/SEO routes in `server.js`; `/internships` lists domains and links to `/checkout?plan=project&domain=<slug>`. Checkout accepts domain query value; `/api/domains` exposes the domain list (`server.js:7701`). Page = “Exists as entry on the one index page,” not a dedicated page.

| # | Domain Name | Slug | Exists in DB/config? | Exists as Page? | Checkout route? | Dedicated SEO page? | Notes |
|---:|---|---|---|---|---|---|---|
| 1 | Data Science | `data-science` | Yes, project config | Yes, `/internships` listing | Yes | No | |
| 2 | Artificial Intelligence | `artificial-intelligence` | Yes | Yes, listing | Yes | No | |
| 3 | Machine Learning | `machine-learning` | Yes | Yes, listing | Yes | No | |
| 4 | Data Analytics | `data-analytics` | Yes | Yes, listing | Yes | No | |
| 5 | Python Development | `python-development` | Yes | Yes, listing | Yes | No | |
| 6 | Web Development | `web-development` | Yes | Yes, listing | Yes | No | |
| 7 | Full Stack Development | `full-stack-development` | Yes | Yes, listing | Yes | No | |
| 8 | Frontend Development | `frontend-development` | Yes | Yes, listing | Yes | No | |
| 9 | Backend Development | `backend-development` | Yes | Yes, listing | Yes | No | |
| 10 | Cloud Computing | `cloud-computing` | Yes | Yes, listing | Yes | No | |
| 11 | DevOps | `devops` | Yes | Yes, listing | Yes | No | |
| 12 | Cyber Security | `cyber-security` | Yes | Yes, listing | Yes | No | |
| 13 | UI/UX Design | `ui-ux-design` | Yes | Yes, listing | Yes | No | |
| 14 | Generative AI | `generative-ai` | Yes | Yes, listing | Yes | No | |
| 15 | NLP | `nlp` | Yes | Yes, listing | Yes | No | |
| 16 | Computer Vision | `computer-vision` | Yes | Yes, listing | Yes | No | |
| 17 | Business Analytics | `business-analytics` | Yes | Yes, listing | Yes | No | |
| 18 | Software Testing | `software-testing` | Yes | Yes, listing | Yes | No | |
| 19 | FDE / Forward Deployed Engineering | `fde` | Yes | Yes, listing | Yes | No | |
| 20 | Product Management | `product-management` | Yes | Yes, listing | Yes | No | |
| 21 | Mobile App Development | `mobile-app-development` | Yes | Yes, listing | Yes | No | |
| 22 | Big Data Engineering | `big-data-engineering` | Yes | Yes, listing | Yes | No | |
| 23 | Deep Learning | `deep-learning` | Yes | Yes, listing | Yes | No | |
| 24 | Blockchain Development | `blockchain-development` | Yes | Yes, listing | Yes | No | |
| 25 | Site Reliability Engineering | `sre` | Yes | Yes, listing | Yes | No | |
| 26 | Ethical Hacking & Pen Testing | `ethical-hacking` | Yes | Yes, listing | Yes | No | |
| 27 | Embedded Systems & IoT | `embedded-iot` | Yes | Yes, listing | Yes | No | |
| 28 | Systems Programming in Rust | `systems-rust` | Yes | Yes, listing | Yes | No | |
| 29 | Game Development | `game-development` | Yes | Yes, listing | Yes | No | |
| 30 | Digital Marketing & Growth | `digital-marketing` | Yes | Yes, listing | Yes | No | |
| 31 | API & Microservices Architecture | `api-microservices` | Yes | Yes, listing | Yes | No | |
| 32 | Bioinformatics & Computational Biology | `bioinformatics` | Yes | Yes, listing | Yes | No | |

Runtime-backed count = 32 (`server.js:529-562`). Copy says `30+` only if present in other tracked content; the explicit `/internships` count and homepage count are generated from `PROJECT_CATALOGUE.length` (32). No repository-wide source claim of exactly 30 was located. Do not equate this with number of SEO landing pages: those are zero.

## Pricing audit

**Pricing is plan-dependent and country/currency-dependent.** Public and checkout prices use `getAllPlansPricing` and current values from `program_prices`. PostgreSQL table seeds **₹1, ₹2, ₹3** once (`db.js:176-186`). JSON fallback instead uses `PROGRAM_PRICE_DEFAULTS` **₹99, ₹199, ₹299** (`config/pricing.js:35-39`, `db.js:1653-1688`). Existing database rows survive seed reruns because `ON CONFLICT DO NOTHING`; no live DB was available, so current deployed rows cannot be established. Admin can update persisted INR prices (`db.js:1670-1691`; `server.js:6665-6704`). International display/settlement is calculated from PPP data (`config/pricing.js:1-15`, `config/pricing.js:219-340`), and payment gateway support constrains currencies (`config/pricing.js:47-49`). Environment variables configure gateway/runtime but not base amounts.

| Plan | Internal Name | INR | USD | EUR | Other Currency | Duration | Actual Features |
|---|---|---:|---:|---:|---|---|---|
| Certificate Program | `certificate` | DB initial seed ₹1; JSON/default ₹99; live unknown | Derived PPP from active INR price; varies | Derived PPP; varies | Local PPP reference; actual payment may use supported currency or USD fallback | checkout selection (default UI suggests 4 weeks; not fixed plan feature) | Task brief; student builds independently; task submission and review; certificate only after approval; offer letter generated/displayed by implementation |
| Project Based Internship | `project` | DB initial seed ₹2; JSON/default ₹199; live unknown | Derived PPP; varies | Derived PPP; varies | As above | selected at checkout | Certificate plan + reference source repo, roadmap/setup guidance, submit own implementation and evidence; certificate after approval; offer letter implementation conflict |
| Comprehensive Program | `comprehensive` | DB initial seed ₹3; JSON/default ₹299; live unknown | Derived PPP; varies | Derived PPP; varies | As above | selected at checkout | Project plan + source/resources, editable report, presentation/PPT, complete kit, offer letter; certificate after approval |

**Price contradictions:** (a) DB seed vs code fallback: 1/2/3 vs 99/199/299; (b) homepage FAQ hardcodes INR 99/199/**499** (`server.js:1434`), while pricing page uses active runtime price and seeded/fallback third plan is 3/299; (c) `config/pricing.js` comment states 99/199/299 but runtime DB seed differs; (d) `README.md:17-18` says current seeded values ₹1/₹2/₹3 and admin-controlled; (e) static starter copy in `scripts/original_*` may contain historical values and is not an active runtime source. International values are not one fixed displayed number; they are computed. Site copy also implies global availability while Cashfree currency/method enablement is conditional (`README.md:19-20`). Checkout records amount snapshot on order; no displayed email/terms price was identified as fixed numeric price beyond general price references.

## Plan features audit

`plans` feature declarations: `server.js:604-646`; pricing page/comparison: `server.js:1444-1464`, `server.js:1474-1583`; dashboard offer letter: `server.js:1991-1993`, `server.js:2412-2507`; checkout fulfillment: `server.js:6078-6111`.

| Feature | Certificate Program | Project Based Internship | Comprehensive Program | Source | Conflict? |
|---|---|---|---|---|---|
| Domain-specific task/project brief | Yes | Yes | Yes | `server.js:564-601`; pricing cards | No |
| Internship label/experience | marketed as internship; Terms qualify as simulation/project curriculum | same | same | `server.js:5322-24`, marketing copy | High wording tension |
| Certificate | after approval | after approval | after approval | `server.js:591`, `server.js:1460` | Issuer claims unverified externally |
| Verification ID/QR | issued certificate | same | same | `server.js:5837`, `server.js:1461` | Destination availability not proven |
| Offer letter | dashboard creates for paid order | same | included in plan copy | `server.js:2412-2507`; comparison row 1459 says included for all | Yes: pricing card suggests only comprehensive; implementation provides to all |
| Reference repo/source code | No | Yes | Yes | `assignmentForOrder` lines 570-601 | No |
| Report | no | no | editable template | resources and comparisons 1462 | No |
| PPT/presentation | no | no | yes | `server.js:1464`; comprehensive resources | No |
| Dashboard | yes after enrollment | yes | yes | checkout/dashboard routes | No |
| Submission | yes | yes | yes | `server.js:6992-7070` | No |
| Evaluation | admin reviewer | same | same | `server.js:7165-7244` | “reviewer” identity unspecified publicly |
| Mentor/live sessions | no implemented evidence | no | no | code inventory | Marketing should not imply one-on-one mentorship |
| Support | email/contact | same | same | `server.js:5418+` | Response/service level not established |
| Priority review | no | no | comparison says “Priority support” | `server.js:1463` | Claims support, not evaluation SLA; no SLA implementation found |

## Certificate audit

- **Issuer as represented:** GreyRocks Digital Engineering, printed in the template/UI, emails, About/Terms and verification screen. This proves the app’s representation, not an independent corporate authorization (`server.js:1371-1379`, `server.js:5324-27`, `server.js:5860-66`).
- **Title/wording:** internship certificate/credential; generated image/PDF uses supplied GreyRocks certificate template, populated with name, domain, duration, date, ID and QR (`server.js:5793-5914`, `scripts/generate_certificate.py`). Exact visual certificate wording is in binary templates, so not all template text is independently text-searchable.
- **ID format:** generated unique ID helper based on domain/year/randomized suffix (`server.js:5765-5792`); UI example `GR-DS-2026-XXXXXX` (`server.js:7895-7901`). Treat example as illustrative; no live registry IDs audited.
- **QR/verification URL:** QR is encoded as `${GREYROCKS_URL}/verification/<id>` (`server.js:5837`). Default `GREYROCKS_URL` is `https://greyrocks.in` (`server.js:37`). App also has local `/verification/:credentialId` route; it looks up local DB and then links out to `https://greyrocks.in/verification/<id>` (`server.js:7818-7883`). README explicitly says GreyRocks production endpoint must be deployed separately (`README.md:25`). Therefore actual third-party verification is not established by this repo.
- **Trigger/approval:** normal flow: paid order -> task provisioned -> student submits GitHub/evidence -> pending submission -> authorized admin approves -> server generates/persists certificate, makes dashboard downloads available, and attempts email (`server.js:6078-6111`, `server.js:6992-7070`, `server.js:7165-7244`). Manual admin generation also exists (`server.js:7246-7309`).
- **Statuses:** order `created` then payment fulfillment/paid; submission `pending`, `approved`, `rejected`; certificates represented by persisted row/artifacts rather than an explicit certificate status enum. Revocation claims in refund/legal text are not backed by a certificate `status` column in schema; deletion/revocation implementation should not be conflated (`db.js:188-204`, `server.js:7513-7526`).
- **Visibility/data:** dashboard certificate tab/downloads gated by approved submission in route logic; local public `/verification/:id` looks up the local DB and exposes name, domain, duration, issue date, ID, issuer, and active label. It does not display email/phone/order ID/payment data (`server.js:7818-7883`). Legal/privacy docs claim data-minimized public verification (`docs/DPDP-COMPLIANCE.md:20`, `:159`) consistent with shown fields, but the local page labels any found cert “Active in Registry” without checking a revoked status.
- **Dates/duration/expiry:** issue date and duration stored/rendered; duration is user-selected and defaults vary (`server.js:1662`, `db.js:194-204`). No certificate expiry field or expiry behavior found. UI fallback date `29 Sept 2026` exists in dashboard display (`server.js:2884`) when missing; potential false display risk.

## GreyRocks relationship audit

HireeBridge public copy says HireeBridge is the student-facing platform and GreyRocks is the credential issuer/partner (`server.js:1371-1379`, `server.js:5402-05`). The certificate generation pipeline is local Python/PDF rendering, with GreyRocks-branded template and QR that points to GreyRocks domain (`server.js:5793-5914`). The local verification route reads HireeBridge's configured database via `db.getCertificateById` and links out to GreyRocks; no GreyRocks API client, external registry synchronization, credentials, or database integration was found. README says production GreyRocks verification endpoint “must be deployed separately” (`README.md:25`). No HireeBridge ownership by GreyRocks is established. Link from HireeBridge to GreyRocks exists in partner/footer/certificate pages. Reverse link from GreyRocks to HireeBridge cannot be established from this repository. Claims of “live/tamper-proof” external verification have no implementation evidence in this checkout.

## Student / country / scale claims

| Claim | Value | Location | Evidence Source | Is It Dynamically Generated? | Conflict? |
|---|---:|---|---|---|---|
| Students joined | `100 + count(users)` with plus suffix | `server.js:1079-1088`, `server.js:1175-1182`; `db.js:1631-1650` | DB count of non-admin users, cached 60s | Yes, but fixed baseline 100 is added | Yes, UI implies actual cumulative total while baseline is unexplained |
| Certificates issued | `100 + count(certificates)` with plus suffix | `server.js:1180-1185`; DB query above | DB count | Yes, plus unexplained baseline 100 | Yes; cannot present as true issued count |
| Domains | catalogue length, 32 | `server.js:529-562`, homepage/proof strip and internships page | Runtime array length | Yes | Main count agrees with 32 |
| Countries / market coverage | `170+` | `server.js:1074-1075`, `server.js:1186-1189` | Constant comment refers to Cashfree “global markets” | Yes, from constant, not users/program eligibility | Mislabel risk: market acceptance ≠ served countries; static copy also mentions “global” |
| `80+ countries` | Not found in active code | Repo search | none | No | Unsupported/not present in audited active files |
| `30+ domains` | No current active exact wording found | Repo search | none | No | Active runtime is 32 |
| Reviews | Six named review cards | `server.js:1097-1104` | Literal source array | No | See testimonial audit |

## Testimonial audit

| Name | Quote | Page | Real Source Link? | Verified? | Evidence Available? | Risk |
|---|---|---|---|---|---|---|
| Aanya Sharma (India) | “I used the structured workflow to keep my project, GitHub link and certificate details in one place.” | Home | No | No | None in repo | High |
| Liam Walker (United Kingdom) | “The dashboard format made it clear what I needed to finish before requesting my credential.” | Home | No | No | None | High |
| Sofia Rodriguez (Philippines) | “I liked having a defined domain and completion checklist instead of just receiving a document.” | Home | No | No | None | High |
| Mateo Hernandez (Mexico) | “The certificate preview helped me understand exactly what information would appear on the final credential.” | Home | No | No | None | High |
| Noah Tremblay (Canada) | “I used the internship project as a portfolio item and kept the credential as supporting documentation.” | Home | No | No | None | High |
| Priya Patel (India) | “The flow was simple to follow during my final-year engineering project preparation.” | Home | No | No | None | High |

Static literals in `home()`; not DB/user submitted/imported/attributed/linked/marked verified in implementation (`server.js:1091-1105`). README calls them “illustrative review cards” and says replace with consented, verifiable reviews before publishing (`README.md:24`).

## Claim / marketing language audit

Risk here is claim substantiation risk from evidence available in this checkout, not a legal conclusion.

| Claim | Exact Wording | Location | Evidence Found? | Terms Compatible? | Risk Level |
|---|---|---|---|---|---|
| Industry recognition | “Industry Recognized Programs” | `server.js:1123-1127` | No recognition, criteria, or endorsing organization evidence found | Unclear | HIGH |
| Real-world / work experience | “Build real-world internship experience” | `server.js:1106-1108`; journey copy at `server.js:5580+` | Project workflows exist; external workplace/employer work evidence absent | Tension with educational simulations/non-employment Terms | HIGH |
| Globally verifiable | “globally verifiable credentials issued by GreyRocks” | `server.js:1106-1108` | QR points to external GreyRocks URL, but endpoint explicitly separate/not in repo | Not established | HIGH |
| Issuer/partner | “Your certificate is issued by GreyRocks”; “credential issuing partner” | `server.js:1371-1374`, `server.js:5402-5405` | App/templates say so; independent authorization absent | Compatible with Terms statement, unsupported externally | HIGH |
| Internship at GreyRocks | Offer letter: “internship opportunity with GreyRocks” | `server.js:2461-2489`; email `server.js:6189-6192` | No employment/HR workflow evidence | Conflicts with Terms’ simulation/no employment wording | HIGH |
| Employment disclaimer | “does NOT create an employer-employee relationship” | `server.js:5322-5324` | Direct legal copy | Conflicts with internship offer at GreyRocks appearance | MEDIUM/HIGH |
| No job guarantee | Terms and generated blog state no job guarantee | `server.js:5324-5325`, `server.js:690` | Direct code copy; no placement workflow found | Compatible | LOW |
| `170+` markets/countries | “170+” constant appears as Countries | `server.js:1074-1075`, `server.js:1186-1189` | Constant/comment only; not program eligibility data | Not established | HIGH |
| Certificate status “Verified & Authentic”, “Active in Registry” | Local verification page | `server.js:7836-7850` | Local record lookup only; no external registry check/revocation check | Broad claim exceeds local lookup | HIGH |
| Tamper-proof | Certificate/QR copy | `server.js:5404`, `server.js:5672`, `server.js:2823` | QR linkage exists; tamper-proof registry absent | Not established | HIGH |
| Academic acceptance | credential acceptance implied in “academic” kit copy | `server.js:610-646`; countered by disclaimer | No institutional acceptance evidence | Terms disclaim acceptance | MEDIUM |
| AICTE/government/accreditation/guaranteed placement | No active matching claim found | repository search | None | N/A | LOW (absence in checked files) |

## Terms / privacy / refund / legal audit

- **Terms route `/terms`:** educational simulations/practical curricula; independent learners; no employment, apprenticeship, paid employment, guaranteed hiring preference or degree; GreyRocks issuer representation; authentic work required; arbitration seat Pune/Maharashtra (`server.js:5307-5340`). Last updated Jan 1, 2026.
- **Refund route `/refund`:** states all payments final and non-refundable; technical duplicate deductions can be submitted with evidence to support within 24 hours for reconciliation (`server.js:5346-5385`). Broad absolute disclaimer may need legal review; this audit only records copy.
- **Privacy `/privacy`, data-rights `/data-rights`:** collects account/contact/profile, task, credential/payment and technical data; describes consent, retention, user rights and verification disclosure; refers to third-party Cashfree, email, Cloudflare R2 and GreyRocks (`server.js:5067-5305`; `docs/DPDP-COMPLIANCE.md:28-39`, `:170-176`). Documentation is a repo claim; actual vendor configuration and legal compliance not independently verified.
- **Cookie policy/disclaimer/program rules:** no separate cookie policy or separate disclaimer page/route found. Terms and page FAQs contain disclaimers/rules; no standalone program-rules route located.
- **Payment:** Cashfree is implemented, callbacks/webhook/payment verification routes are present (`server.js:5973-6111`, `server.js:6706-6960`). `README.md:18-20` says production Cashfree, international acceptance requires merchant enablement, and unsupported currencies fail unless customer switches to INR. Privacy document says Cashfree; no Razorpay active integration claim found.
- **Conflicts:** marketing presents a GreyRocks internship opportunity/real-world experience while Terms define a simulation and deny employment; marketing calls certificate globally verified/tamper-proof despite absent external verification implementation; refund policy says credential records are automatically allocated immediately while actual certificate issuance requires later reviewer approval. Offer-letter existence is immediate, but not the completion certificate.

## Location / market claims

Page copy calls the platform global; homepage states “170+ Countries” from a `CASHFREE_IPG_GLOBAL_MARKETS` constant (`server.js:1074-1075`, `1186-1189`). Geo helper `utils/geo.js` and request currency flow use request/IP-derived country and currency, with user-selectable currency endpoint (`server.js:414-427`; `utils/geo.js`). Pricing supports INR and PPP-derived local references; direct gateway currency list is INR/USD/EUR/GBP/AED/SGD/AUD/CAD/JPY (`config/pricing.js:47-49`). Payment methods/eligibility depend on Cashfree merchant configuration. No country-based program eligibility allowlist or translated language implementation was found; page language is English (`server.js:735`). Currency selection is user-selectable and geo influenced; program availability is not proven globally merely from price calculation.

## Current SEO facts only

| Item | Current implementation |
|---|---|
| Current domain | Default canonical/site origin `https://hireebridge.in` (`server.js:35-37`) |
| Framework | Node.js + Express 4; server-rendered HTML strings (`package.json:2-18`, `server.js`) |
| Sitemap | Dynamic route `/sitemap.xml`; lists public main pages and 20 blog topic URLs; `lastmod` is current request date, not content modification date (`server.js:7654-7684`) |
| Robots | Dynamic `/robots.txt`; disallows admin/dashboard/checkout/API/login/reset/forgot/logout (`server.js:7685-7699`) |
| Canonical | Layout emits canonical for active route using `CANONICAL_URL` (`server.js:724-743`); dynamic verification page canonical is `/certificate`, not its credential URL (`server.js:7902-7912`) |
| Metadata | Layout-generated title, description, keywords, robots, author (`server.js:694-769`) |
| Open Graph | Generic OG title/description/url/image/type; default image sample certificate (`server.js:728-761`) |
| Twitter/X | Large-image card, `@hireebridge` site/creator (`server.js:762-769`); ownership unverified |
| JSON-LD | JSON-LD graph emitted on indexable pages: EducationalOrganization and WebSite; no page-specific Article/Course/Offer/Review/JobPosting/Breadcrumb schema observed in layout (`server.js:770-837`). A second `Organization` node appears in footer area (`server.js:990-1016`). |
| Organization schema | Yes: EducationalOrganization and Organization; asserts email/socials and global virtual internship/credentials claims (`server.js:776-806`, `990-1016`) |
| WebSite schema | Yes, includes SearchAction to `/internships?search=...` (`server.js:800-815`) |
| Article schema | None found |
| Breadcrumb schema | None found |
| Course schema | None found |
| Offer schema | None found |
| Review schema | None found |
| JobPosting schema | None found |
| Noindex | Layout marks admin/dashboard/checkout/login/reset/forgot and explicit `noindex` pages `noindex,nofollow` (`server.js:724-726`). `/register` redirects to pricing. |
| Checkout/login/dashboard indexing | Noindex in HTML; robots also disallows checkout/login/dashboard (`server.js:724-726`, `server.js:7688-7696`) |
| Blog URLs | `/blog` and `/blog/:slug`; 20 slugs from `blogTopics`; sitemap includes them (`server.js:656-676`, `6221-6228`, `7654-7684`) |
| Internship URLs | Only `/internships`; no `/internships/:slug` route; query checkout URLs from index |
| Verification URLs | local `/verification/:credentialId` and `/verification`; these are not in sitemap; page uses active `/certificate` for canonical (`server.js:7818`, `7902-7912`) |
| Static SEO files | No separate public `sitemap.xml`/`robots.txt`; Express routes implement both |

## Content / blog audit

The 20 topics/slugs are listed in `server.js:656-676`; `/blog` and `/blog/:slug` routes at `server.js:6221-6228`; page builder `article(topic, keywords)` at `server.js:678-692`. Each page is generated at request/render time from one shared template with topic/keyword substitutions and repeated checklist/FAQ. They are **not** individual persisted article records. Dates/authors are not stored per article; no article-specific published or modified date shown. Sitemap `lastmod` is request/build date (`server.js:7654-7684`), so it is automatically stamped on request, not actual content edit date.

| Article | URL | Word Count | Topic | Author | Published Date | Modified Date | Unique Content? | Template Similarity |
|---|---|---:|---|---|---|---|---|---|
| What Is an Internship Certificate and Why Does It Matter? | `/blog/internship-certificate` | generated; not separately stored | certificate basics | not stated | not stated | not stated | shared generated body | High |
| How to Get an Internship Certificate Online | `/blog/get-internship-certificate-online` | generated | obtaining certificate | not stated | not stated | not stated | shared template | High |
| Internship Certificate vs Experience Certificate | `/blog/internship-vs-experience-certificate` | generated | certificate comparison | not stated | not stated | not stated | shared template | High |
| What Should an Internship Certificate Include? | `/blog/what-should-internship-certificate-include` | generated | certificate fields | not stated | not stated | not stated | shared template | High |
| How to Add an Internship Certificate to Your Resume | `/blog/add-internship-certificate-to-resume` | generated | resume use | not stated | not stated | not stated | shared template | High |
| How to Verify an Internship Certificate | `/blog/how-to-verify-internship-certificate` | generated | verification | not stated | not stated | not stated | shared template | High |
| Internship Certificate for College Submission: A Practical Guide | `/blog/internship-certificate-for-college` | generated | college submission | not stated | not stated | not stated | shared template | High |
| Online Internship Certificate: What Students Should Check | `/blog/online-internship-certificate-guide` | generated | online program checklist | not stated | not stated | not stated | shared template | High |
| How to Choose an Internship Domain in 2026 | `/blog/choose-internship-domain` | generated | choosing domains | not stated | not stated | not stated | shared template | High |
| Data Science Internship Certificate: What to Look For | `/blog/data-science-internship-certificate` | generated | data science credential | not stated | not stated | not stated | shared template | High |
| AI and Machine Learning Internship Certificate Guide | `/blog/ai-ml-internship-certificate` | generated | AI/ML credential | not stated | not stated | not stated | shared template | High |
| Python Internship Certificate: Skills and Evidence | `/blog/python-internship-certificate` | generated | Python evidence | not stated | not stated | not stated | shared template | High |
| Web Development Internship Certificate Guide | `/blog/web-development-internship-certificate` | generated | web credential | not stated | not stated | not stated | shared template | High |
| Cloud and DevOps Internship Certificate Guide | `/blog/cloud-devops-internship-certificate` | generated | cloud/DevOps | not stated | not stated | not stated | shared template | High |
| How GitHub Project Work Strengthens Internship Evidence | `/blog/github-internship-project` | generated | GitHub evidence | not stated | not stated | not stated | shared template | High |
| Internship Tasks: How to Document What You Actually Did | `/blog/document-internship-tasks` | generated | task documentation | not stated | not stated | not stated | shared template | High |
| Internship Certificate Format: Modern Examples and Checklist | `/blog/internship-certificate-format-checklist` | generated | certificate format | not stated | not stated | not stated | shared template | High |
| How Internship Credentials Can Support a Fresher Portfolio | `/blog/internship-credential-portfolio` | generated | portfolio | not stated | not stated | not stated | shared template | High |
| A Student Checklist Before Buying an Online Internship Program | `/blog/student-internship-buying-checklist` | generated | buying checklist | not stated | not stated | not stated | shared template | High |
| HireeBridge Internship Workflow: From Enrollment to Credential | `/blog/hireebridge-internship-workflow` | generated | platform workflow | not stated | not stated | not stated | shared template | High |

Word counts were not supplied as persisted article content because these pages are runtime templates; calculate from rendered output if a later step needs exact counts. The common body is largely identical and topic string/keywords are substituted; a substantial templating concern is present. Blog copy itself makes issuer, pricing, refund, and claim accuracy checklist statements and should be checked against unresolved facts.

## Proposed Authoritative Sources

| Fact | Current Sources | Recommended Authority |
|---|---|---|
| Pricing | PostgreSQL seed, fallback JS defaults, homepage FAQ, admin table, PPP dataset | One persisted plan/pricing config used by checkout and every rendered price; no hardcoded price copy |
| Domain list | `server.js` array + `config/project-catalogue.js` map | One catalog/config that validates task and page/checkout slugs |
| Plan features | plan definitions, pricing cards, comparison, dashboard offer letter | One plan-feature config consumed by all surfaces and fulfillment; resolve offer entitlement explicitly |
| Issuer identity | certificate artwork, Terms, About, email, local registry | Approved issuer/business configuration backed by actual authorization and registry owner |
| Certificate verification | QR, local DB route, remote GreyRocks URL, README | One documented operational registry endpoint and authoritative revocation/status lookup |
| Program rules | marketing pages, workflow, offer letter, Terms/refund | Terms/program rules and implemented workflow aligned; clearly distinguish simulation/project from employment |
| Student/certificate counts | DB count plus added 100 baseline | Actual query-backed values with date/definition; never a fabricated offset |
| Country/market count | Cashfree constant described as markets/countries | Verified payment-provider coverage vs actual program-eligible country list; separately named |
| Testimonials | static home literals, README says illustrative | Consented verified testimonial records with evidence and source link, otherwise do not present as customer reviews |
| Company details/socials | env/config/schema/footer | Verified legal entity contact record and controlled official social profiles |
| Blog dates/authors | shared template/sitemap request date | Real editorial records with authored and modified dates |

## Critical Conflicts That Must Be Fixed

### P0 — Must fix before SEO expansion

1. **Pricing cannot be asserted confidently:** ₹1/2/3 DB seeds, ₹99/199/299 fallback, and FAQ ₹99/199/499. Determine live DB values and unify.
2. **Offer-letter entitlement conflicts:** all plans receive dashboard offer letter in code and comparison row, while cards advertise it only under Comprehensive. Confirm intended entitlement.
3. **Certificate issuer/verification substantiation:** GreyRocks issuer is asserted, but separate remote endpoint is not implemented here; local route only checks local DB and links externally. Verify partnership and deployed registry behavior before “verified/globally verifiable/tamper-proof.”
4. **Program nature/employment language:** Terms describe educational internship simulations and no employment; offer letter says internship opportunity with GreyRocks and marketing says real-world experience. Align factual description before targeting internship queries.
5. **Unsupported/unverifiable testimonials:** six named static quotes; README itself calls them illustrative. Verify consent/evidence or avoid presenting as real reviews.
6. **Scale claims:** 100 baseline added to actual joined/issued counts; 170 Cashfree markets rendered as countries. Neither displayed value is a direct supported program metric.
7. **Refund representation:** legal copy says credentials/offer letters/certificates are generated/provisioned immediately, while actual certificate is approval-gated; clarify what digital service is provided on payment.

### P1 — Important

1. No operator legal entity/address appears; GreyRocks and HireeBridge organizational relationship/authorization is not externally substantiated in repo.
2. “Priority support” feature has no documented response time or priority mechanism; no mentor identity/sessions evidenced.
3. Verification page’s “Active in Registry” label lacks a revocation status check despite legal claims that revocation occurs.
4. User-selected duration and marketing duration descriptions vary (“flexible 2 to 4 weeks or 1 month” vs selected duration); confirm what is actually offered.
5. Social profile links and organization schema need ownership/currentness confirmation.

### P2 — Later

1. Sitemap stamps each response date as `lastmod`, not actual content modification.
2. Verification pages canonicalize to `/certificate`, and are not in sitemap.
3. Twenty blog pages share generated template copy and have no visible authors or article dates.
4. Multiple Organization/EducationalOrganization schema representations and broad default claims should be made internally consistent after facts are established.

## Executive Summary

1. **What is HireeBridge in implementation?** A Node/Express learning/project workflow sold and marketed as virtual internships; its Terms specifically define these as educational internship simulations/practical curricula and disclaim employment.
2. **What does the customer buy?** One of three program plans and domain/duration enrollment, at prices dependent on persistent DB/admin configuration, with major conflicting default/FAQ figures.
3. **What do they receive?** Paid enrollment/task/dashboard and offer letter; plan-dependent project repository/resources; submit work for admin review; approved work can receive a generated JPG/PDF credential.
4. **Who issues the certificate?** The platform labels GreyRocks Digital Engineering as issuer. The repository does not independently prove corporate authorization or ownership of GreyRocks.
5. **How does verification work?** App generates a QR URL pointing to GreyRocks; local HireeBridge route checks its own DB and presents selected credential fields then links out. External GreyRocks registry operation is not proven and README says endpoint deployed separately.
6. **Authoritative domain count?** 32 domain rows in the runtime array and 32 project config records; 32 is supported as source-code catalog count. It is not 32 dedicated landing pages.
7. **Authoritative plans/prices?** Three plan IDs/names are clear. Prices are not resolved: DB creation seed ₹1/₹2/₹3; fallback defaults ₹99/₹199/₹299; FAQ says ₹99/₹199/₹499; deployed DB is unavailable.
8. **Unsupported claims?** Industry recognition, globally/tamper-proof verification, GreyRocks relationship/authorization, testimonial authenticity, real-world employment-like experience, country eligibility, 170+ program countries, live counts as shown.
9. **Main conflicts?** pricing, offer letter, simulation vs GreyRocks internship wording, external vs local verification, refund instant-resource description vs delayed certificate, scale/count baselines.
10. **What must be fixed before SEO?** Resolve P0 facts and establish their authoritative evidence/source; do not publish uncertain counts, prices, testimonials, recognition, issuer/verification or employment claims as facts.

## SEO-Safe Facts

- The current code provides three plans named Certificate Program, Project Based Internship, and Comprehensive Program.
- The runtime domain/task catalog contains 32 entries.
- A paid enrollment provisions a domain-specific task; the student submits a project repository and evidence.
- The normal certificate path requires explicit reviewer/admin approval after submission; payment alone does not issue a certificate.
- Certificate records/artifacts include candidate name, domain, duration, issue date, credential ID, and QR destination in the implementation.
- The application has a local credential lookup route backed by its configured database.
- HireeBridge’s Terms say enrollment is not employment, does not promise a paid job, and may not be accepted for academic credit by third parties.
- Public application routes include `/`, `/pricing`, `/internships`, `/how-it-works`, `/certificate`, `/about`, `/contact`, legal pages, and blog pages.

## Facts We Must NOT Publish Until Verified

- Any current fixed plan price, including ₹1/2/3, ₹99/199/299, ₹99/199/499, or a USD/EUR equivalent, until production DB/admin prices are checked.
- That offer letters are exclusive to Comprehensive (implementation says all plans) or definitively included in all plans (pricing page cards imply otherwise) until entitlement is decided.
- Any actual number of students joined or certificates issued; current displayed logic adds an unexplained 100.
- “170+ countries” as countries served/program eligibility; source constant describes Cashfree market reach and has no country program allowlist.
- Testimonial names/quotes as genuine reviews, outcomes, or verified customers absent consent and primary evidence.
- Industry recognition, government/AICTE approval, accreditation, employer acceptance, job placement, or hiring advantage.
- GreyRocks ownership of HireeBridge, operation of HireeBridge, issuer authorization/partnership beyond the code’s own assertion, or external registry/database integration.
- “Globally verified,” “tamper-proof,” or currently active external certificate verification until the live endpoint and status/revocation behavior are confirmed.
- That students are employees, receive stipends, perform work for employer clients, obtain employment experience, or are guaranteed employment.
- Public address, registered operator identity, YouTube/GitHub official profiles, or exact external social account ownership.
- Country-specific program availability, international payment acceptance, university/college credit, credential acceptance, or program durations until operational terms are confirmed.

**STEP 1 COMPLETE** — the audit is based on repository evidence only; no Step 2 work was started.

### Ten most important findings

1. Pricing sources conflict sharply: ₹1/2/3 DB seed, ₹99/199/299 fallback, and ₹99/199/499 FAQ.
2. Live production pricing could not be inspected because no production DB credentials/data were available.
3. Three plan names are stable; offers/resources differ by code path, and offer-letter claims conflict across plan surfaces.
4. The project catalog has exactly 32 domains, but there are no dedicated domain SEO pages.
5. Certificate issuance normally follows student submission and explicit admin/reviewer approval, not payment.
6. GreyRocks is named issuer in app content; external verification service and partnership authority are not proven in this repository.
7. HireeBridge local verification looks up its own database and then links to GreyRocks; README says the external endpoint must be deployed separately.
8. Six named homepage testimonials are hardcoded; README labels them illustrative and asks for consented/verifiable replacements.
9. Homepage scale figures use an unexplained +100 baseline, and the 170+ Cashfree market constant is labeled as countries.
10. Terms define the product as educational internship simulations without employment, while offer letter and marketing describe an internship with GreyRocks / real-world experience.
