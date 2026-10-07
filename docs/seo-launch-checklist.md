# HireeBridge — SEO Launch & Search Console Readiness Checklist

**Date:** October 8, 2026  
**Auditor:** Codex / Antigravity Technical SEO Operations  
**Scope:** Production Deployment Readiness, Search Console Verification, Crawl Health, Post-Launch Monitoring  

---

## 1. Pre-Deployment Technical SEO Verification

### 1.1 Canonical & URL Integrity
- [x] **Canonical Tag Consistency**: Every public page declares `<link rel="canonical">` matching its exact protocol, hostname, and trailing slash format.
- [x] **Trailing Slash Enforcement**: Directory-level hub and domain routes enforce trailing slashes consistently (`/internships/`, `/internships/:slug/`, `/project-based-internships/`).
- [x] **No Redirect Chains**: All 301 redirects resolve directly in 1 hop to their final 200 OK target URL.
- [x] **No Internal Redirect Loops**: All internal navigation and in-page links point to final canonical URLs.

### 1.2 Robots.txt & Crawl Accessibility
- [x] **Robots Directive**: `Allow: /` declared for public search engine user-agents.
- [x] **Private Area Disallows**: Strict disallows for `/admin`, `/dashboard`, `/checkout`, and `/certificate/generated/`.
- [x] **Sitemap Directive**: Declares absolute XML sitemap URL (`Sitemap: https://hireebridge.com/sitemap.xml`).

### 1.3 Sitemap Cleanliness
- [x] **Clean Indexable Inventory**: Contains only 200 OK canonical public URLs (Homepage, 5 Topical Hubs, 32 Domain Pages, Core Trust Pages).
- [x] **Pruning Complete**: Zero deleted blog URLs (`/blog/*`) exist in `sitemap.xml`.
- [x] **No Private Pages in Sitemap**: Verified that `/login`, `/checkout`, `/admin`, and `/dashboard` are absent.

### 1.4 Structured Data & Schema Validation
- [x] **Organization / EducationalOrganization**: Valid JSON-LD markup on homepage and hub pages with official logo, URL, and description.
- [x] **BreadcrumbList**: Structured navigation hierarchy for all hub and domain pages.
- [x] **No Bogus BlogPosting Schema**: Removed obsolete `BlogPosting` schema that referenced pruned boilerplate articles.

---

## 2. Legacy URL Pruning & Redirect Execution

### 2.1 301 Permanent Redirects (Exact 1:1 Intent Matches)
- [x] `/blog` → `/internships/`
- [x] `/blog/internship-certificate` → `/internship-certificate/`
- [x] `/blog/get-internship-certificate-online` → `/internship-certificate/`
- [x] `/blog/what-should-internship-certificate-include` → `/internship-certificate/`
- [x] `/blog/how-to-verify-internship-certificate` → `/internship-certificate/`
- [x] `/blog/internship-certificate-format-checklist` → `/internship-certificate/`
- [x] `/blog/choose-internship-domain` → `/internships/`
- [x] `/blog/data-science-internship-certificate` → `/internships/data-science/`
- [x] `/blog/ai-ml-internship-certificate` → `/internships/artificial-intelligence/`
- [x] `/blog/python-internship-certificate` → `/internships/python-development/`
- [x] `/blog/web-development-internship-certificate` → `/internships/web-development/`
- [x] `/blog/cloud-devops-internship-certificate` → `/internships/cloud-computing/`
- [x] `/blog/github-internship-project` → `/internship-projects/`
- [x] `/blog/document-internship-tasks` → `/internship-projects/`
- [x] `/blog/hireebridge-internship-workflow` → `/how-it-works`

### 2.2 410 Gone Verification (Clean Permanent Removal)
- [x] `/blog/internship-vs-experience-certificate` → **410 Gone**
- [x] `/blog/add-internship-certificate-to-resume` → **410 Gone**
- [x] `/blog/internship-certificate-for-college` → **410 Gone**
- [x] `/blog/online-internship-certificate-guide` → **410 Gone**
- [x] `/blog/internship-credential-portfolio` → **410 Gone**
- [x] `/blog/student-internship-buying-checklist` → **410 Gone**

---

## 3. Google Search Console (GSC) Deployment Playbook

### Step 1: Property Verification
- [ ] Ensure Domain Property verification (DNS TXT record on root domain) in Google Search Console.
- [ ] Add URL Prefix properties for `https://hireebridge.com` and `https://hireebridge.in` if multi-domain mapping is active.

### Step 2: XML Sitemap Submission
- [ ] In GSC under **Sitemaps**, submit: `https://hireebridge.com/sitemap.xml`.
- [ ] Confirm "Success" status and verify that discovered URL count matches active page inventory (39 URLs).

### Step 3: Priority URL Inspection & Live Test
Run the **URL Inspection** tool on these 7 primary pages:
- [ ] Homepage: `https://hireebridge.com/`
- [ ] Hub 1: `https://hireebridge.com/internships/`
- [ ] Hub 2: `https://hireebridge.com/virtual-internships/`
- [ ] Hub 3: `https://hireebridge.com/project-based-internships/`
- [ ] Hub 4: `https://hireebridge.com/internship-certificate/`
- [ ] Hub 5: `https://hireebridge.com/internship-projects/`
- [ ] Sample Domain: `https://hireebridge.com/internships/data-science/`
*Verify:* "URL is available to Google", Page fetch: Successful, Mobile usability: Passed.

### Step 4: Deindexed URL Inspection
Inspect one 410 URL (e.g., `/blog/internship-vs-experience-certificate`) in GSC URL Inspection:
- [ ] Confirm response code is `410` or `404` (Not a soft 404).

---

## 4. Post-Launch Monitoring & Cadence

| Cadence | Metric / Action | Expected Benchmark | Action Trigger |
|:---|:---|:---|:---|
| **Day 1** | Server 4xx/5xx logs & redirect latency | 0 5xx errors; 301 latency < 50ms | Spike in 500s or redirect loops |
| **Day 3** | GSC Index Coverage report | 0 Excluded "Soft 404" errors | Any redirected URL flagged as soft 404 |
| **Week 1** | GSC Page Experience & Core Web Vitals | LCP < 2.5s, CLS < 0.1, INP < 200ms | Yellow/Red URLs in CWV report |
| **Week 2** | Indexation of 32 Domain Pages + 5 Hubs | All 37 target URLs indexed | Unindexed pages submitted via inspection |
| **Month 1**| Search impressions & ranking query clusters | Organic traffic growth on project terms | Optimize underperforming domain pages |
