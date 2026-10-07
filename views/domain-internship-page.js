"use strict";

const fs = require("fs");
const path = require("path");
const DOMAIN_CRITICAL_CSS = fs.readFileSync(
  path.join(__dirname, "..", "public", "css", "domain-pages.critical.css"),
  "utf8",
);

const esc = (value) =>
  String(value ?? "").replace(/educational programme/gi, "internship programme").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
const DISCLOSURE =
  "HireeBridge is a fee-based, project-based internship programme built around a defined project, submission evidence and reviewer approval.";

function marker(label) {
  return process.env.NODE_ENV === "production"
    ? ""
    : `<aside class="domain-owner-marker" aria-label="Owner input required"><strong>OWNER_INPUT_REQUIRED</strong><span>${esc(label)}</span></aside>`;
}

function heroVisual(page) {
  if (page.diagram) return page.diagram;
  if (page.slug === "data-science")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Sensor telemetry analysis sketch</title><desc id="visual-desc">A technical notebook chart connects timestamped sensor readings to data checks, model comparison and maintenance review.</desc><g class="dp-grid"><path d="M45 55V290H480"/><path d="M45 240L105 221 155 235 210 151 263 183 315 103 376 124 450 70"/></g><g class="dp-points"><circle cx="105" cy="221" r="7"/><circle cx="210" cy="151" r="7"/><circle cx="315" cy="103" r="7"/><circle cx="450" cy="70" r="7"/></g><g class="dp-notes"><text x="62" y="326">TIMESTAMP</text><text x="52" y="43">SENSOR VALUE</text><text x="280" y="220">held-out window →</text></g></svg>`;
  if (page.slug === "artificial-intelligence")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Voice assistant request map</title><desc id="visual-desc">Speech becomes a visible transcript, passes through a bounded intent router and reaches only approved utilities.</desc><g class="dp-boxes"><rect x="25" y="115" width="105" height="105" rx="10"/><rect x="170" y="115" width="105" height="105" rx="10"/><rect x="315" y="90" width="175" height="155" rx="10"/></g><g class="dp-notes"><text x="48" y="105">SPEECH</text><text x="185" y="105">TRANSCRIPT</text><text x="350" y="78">BOUNDED ROUTER</text><text x="48" y="165">input</text><text x="187" y="165">visible</text><text x="340" y="135">supported intent</text><text x="340" y="170">safe utility</text><text x="340" y="205">clear fallback</text><text x="136" y="172">→</text><text x="281" y="172">→</text></g></svg>`;
  if (page.slug === "machine-learning")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Classification pipeline sketch</title><desc id="visual-desc">A documented split feeds training-only preparation, model comparison, threshold review and qualified scores.</desc><g class="dp-boxes"><rect x="25" y="120" width="90" height="95" rx="10"/><rect x="145" y="120" width="100" height="95" rx="10"/><rect x="275" y="120" width="100" height="95" rx="10"/><rect x="405" y="120" width="90" height="95" rx="10"/></g><g class="dp-notes"><text x="39" y="108">SPLIT</text><text x="155" y="108">PREPARE</text><text x="287" y="108">COMPARE</text><text x="414" y="108">REVIEW</text><text x="43" y="171">held-out</text><text x="159" y="171">train only</text><text x="290" y="160">models</text><text x="290" y="187">metrics</text><text x="420" y="160">threshold</text><text x="420" y="187">scores</text></g></svg>`;
  if (page.slug === "data-analytics")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Analytics evidence chain</title><desc id="visual-desc">Business questions connect to source tables, SQL definitions, reconciled KPIs and a dashboard narrative.</desc><g class="dp-boxes"><rect x="35" y="70" width="135" height="75" rx="10"/><rect x="195" y="70" width="135" height="75" rx="10"/><rect x="355" y="70" width="130" height="75" rx="10"/><rect x="115" y="205" width="135" height="75" rx="10"/><rect x="275" y="205" width="135" height="75" rx="10"/></g><g class="dp-notes"><text x="57" y="113">QUESTION</text><text x="226" y="113">TABLES</text><text x="398" y="113">SQL</text><text x="146" y="248">RECONCILE</text><text x="307" y="248">EXPLAIN</text></g><path d="M170 108H195M330 108H355M420 145L360 205M195 145L180 205M250 242H275"/></svg>`;
  if (page.slug === "python-development")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Python application module map</title><desc id="visual-desc">An interface calls tested core logic, validation, storage and reporting modules.</desc><g class="dp-boxes"><rect x="190" y="35" width="145" height="70" rx="10"/><rect x="35" y="145" width="130" height="80" rx="10"/><rect x="195" y="145" width="130" height="80" rx="10"/><rect x="355" y="145" width="130" height="80" rx="10"/><rect x="190" y="265" width="145" height="55" rx="10"/></g><g class="dp-notes"><text x="223" y="78">INTERFACE</text><text x="68" y="191">VALIDATE</text><text x="232" y="191">CORE</text><text x="394" y="191">STORE</text><text x="226" y="299">TEST + EXPORT</text></g><path d="M262 105V145M165 185H195M325 185H355M262 225V265"/></svg>`;
  if (page.slug === "full-stack-development")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Full-stack order flow</title><desc id="visual-desc">A storefront request crosses an authenticated API, persistent commerce records and an administration view.</desc><g class="dp-boxes"><rect x="25" y="115" width="105" height="105" rx="10"/><rect x="155" y="115" width="105" height="105" rx="10"/><rect x="285" y="115" width="105" height="105" rx="10"/><rect x="415" y="115" width="80" height="105" rx="10"/></g><g class="dp-notes"><text x="35" y="102">STOREFRONT</text><text x="183" y="102">API</text><text x="303" y="102">ORDERS</text><text x="425" y="102">ADMIN</text><text x="43" y="172">cart</text><text x="174" y="172">auth</text><text x="303" y="172">state</text><text x="429" y="172">review</text></g><path d="M130 167H155M260 167H285M390 167H415"/></svg>`;
  if (page.slug === "frontend-development")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Frontend component state map</title><desc id="visual-desc">Routes distribute state into reusable cards, charts, tables and accessible status views.</desc><g class="dp-boxes"><rect x="185" y="35" width="150" height="65" rx="10"/><rect x="25" y="145" width="125" height="90" rx="10"/><rect x="195" y="145" width="125" height="90" rx="10"/><rect x="365" y="145" width="125" height="90" rx="10"/></g><g class="dp-notes"><text x="220" y="76">ROUTE + STATE</text><text x="62" y="195">CARDS</text><text x="232" y="195">CHARTS</text><text x="402" y="195">TABLES</text><text x="154" y="294">LOADING / EMPTY / ERROR / READY</text></g><path d="M260 100V125M85 125H430M85 125V145M257 125V145M430 125V145"/></svg>`;
  if (page.slug === "backend-development")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Backend request controls</title><desc id="visual-desc">A URL string passes through rate limiting, validation, ownership and persistence without visiting the target.</desc><g class="dp-boxes"><rect x="20" y="120" width="90" height="90" rx="10"/><rect x="135" y="120" width="105" height="90" rx="10"/><rect x="265" y="120" width="105" height="90" rx="10"/><rect x="395" y="120" width="105" height="90" rx="10"/></g><g class="dp-notes"><text x="35" y="108">REQUEST</text><text x="150" y="108">VALIDATE</text><text x="287" y="108">AUTHORIZE</text><text x="417" y="108">PERSIST</text><text x="42" y="169">limit</text><text x="151" y="169">inert URL</text><text x="289" y="169">owner</text><text x="416" y="169">code</text></g><path d="M110 165H135M240 165H265M370 165H395"/></svg>`;
  if (page.slug === "cloud-computing")
    return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">Three-tier infrastructure map</title><desc id="visual-desc">A public entry tier reaches private application and data tiers with monitoring and explicit network boundaries.</desc><g class="dp-boxes"><rect x="45" y="115" width="115" height="105" rx="10"/><rect x="205" y="115" width="115" height="105" rx="10"/><rect x="365" y="115" width="115" height="105" rx="10"/></g><g class="dp-notes"><text x="66" y="102">ENTRY TIER</text><text x="224" y="102">APP TIER</text><text x="384" y="102">DATA TIER</text><text x="62" y="168">public edge</text><text x="222" y="168">private</text><text x="382" y="168">protected</text><text x="137" y="285">TERRAFORM / IDENTITY / HEALTH / LOGS / TEARDOWN</text></g><path d="M160 167H205M320 167H365"/></svg>`;
  const title = String(page.facts?.taskBrief || page.name).split(/\s*[—–\-:]\s*/)[0].toUpperCase().slice(0, 36);
  const steps = (page.facts?.taskOutline || ["DEFINE", "BUILD", "CHECK"]).slice(0, 3).map(step => String(step).split(" ").slice(0, 2).join(" ").toUpperCase());
  return `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc"><title id="visual-title">${esc(page.name)} project map</title><desc id="visual-desc">A project-specific three-stage map for ${esc(page.name)}.</desc><g class="dp-boxes"><rect x="32" y="104" width="122" height="112" rx="10"/><rect x="199" y="104" width="122" height="112" rx="10"/><rect x="366" y="104" width="122" height="112" rx="10"/></g><g class="dp-notes"><text x="42" y="62">${esc(title)}</text><text x="50" y="151">01</text><text x="217" y="151">02</text><text x="384" y="151">03</text><text x="48" y="185">${esc(steps[0] || "DEFINE")}</text><text x="215" y="185">${esc(steps[1] || "BUILD")}</text><text x="382" y="185">${esc(steps[2] || "CHECK")}</text><text x="158" y="165">→</text><text x="325" y="165">→</text></g></svg>`;
}

function ownerFact(page, key, render) {
  const value = page.facts[key];
  return value && (!Array.isArray(value) || value.length)
    ? render(value)
    : marker(`${page.name}: ${key}`);
}

function renderFullPage({ page, layout, siteUrl }) {
  const c = page.content;
  const defaultH1 = `${page.name} Online Internship Project with Verifiable Certificate`;
  const pageH1 = c.h1 || defaultH1;
  const path = `/internships/${page.slug}/`;
  const baseUrl = String(siteUrl || process.env.SITE_URL || "https://hireebridge.in").replace(/\/+$/, "");
  const url = `${baseUrl}${path}`;
  const titleWithOnline = `${page.name} Online Internship with Certificate | HireeBridge`;
  const title = titleWithOnline.length <= 60 ? titleWithOnline : `${page.name} Internship with Certificate | HireeBridge`;
  const summary = c.summary.startsWith("This fee-based, project-based educational programme")
    ? c.summary.replace("This fee-based, project-based educational programme", `This ${page.primaryKeyword} is a fee-based, project-based internship programme that`)
    : `This ${page.primaryKeyword} is a fee-based, project-based internship programme. ${c.summary}`;
  const faqEntities = c.faqs.map(([question, answer]) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  }));
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${baseUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Internships",
            item: `${baseUrl}/internships/`,
          },
          { "@type": "ListItem", position: 3, name: page.name, item: url },
        ],
      },
      {
        "@type": "Course",
      name: pageH1,
        description: summary,
        provider: { "@id": `${baseUrl}/#organization` },
        inLanguage: "en-IN",
        url: url,
      },
      { "@type": "WebPage", name: pageH1, description: summary, url },
      { "@type": "FAQPage", mainEntity: faqEntities },
    ],
  };
  const skillGroups = c.skills
    .map(
      (group, index) =>
        `<section class="skill-group" data-skill-group="${index}"><h3>${esc(group.group)}</h3>${group.items.map(([name, role]) => `<article><strong>${esc(name)}</strong><p>${esc(role)}</p></article>`).join("")}</section>`,
    )
    .join("");
  return layout({
    title,
    description: summary.slice(0, 152),
    active: path,
    noindex: !page.readyToIndex,
    keywords: false,
    ogLocale: "en_IN",
    lang: "en-IN",
    localDomainFonts: true,
    ogTitle: title,
    ogDescription: summary,
    ogImage: `${baseUrl}/og/${page.slug}.png`,
    ogImageAlt: `${page.name} project-based internship programme`,
    pageJsonLd: schema,
    extraStylesheets: [
      "/css/domain-pages.tokens.css?v=2",
      "/css/domain-pages.css?v=2",
    ],
    inlineCriticalCss: DOMAIN_CRITICAL_CSS,
    deferStylesheets: true,
    h2Overrides: c.h2Overrides || {},
    h1Override: c.h1 ? { original: defaultH1, replacement: c.h1 } : null,
    extraScripts: ["/js/domain-pages.js?v=1"],
    content: `<main id="main-content" class="domain-page domain-page--${esc(page.slug)}" style="--domain-accent:${esc(page.accent)}" data-domain-page>
      <nav class="domain-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><a href="/internships/">Internships</a><span>/</span><strong>${esc(page.name)}</strong></nav>
      <section class="domain-hero"><div class="domain-hero__copy"><p class="domain-eyebrow">Project-based Internship Programme</p><h1>${esc(pageH1)}</h1><p class="domain-answer">${esc(summary)}</p><aside class="domain-disclosure"><strong>Built around your project</strong><p>${esc(DISCLOSURE)}</p></aside><div class="domain-hero__actions"><a class="btn btn-dark domain-cta" href="/pricing">View plans and pricing</a><a class="domain-text-link" href="#assigned-project">Inspect the project brief</a></div></div><figure class="domain-hero__diagram">${heroVisual(page)}<figcaption>${esc(page.name)} project map / annotated working view</figcaption></figure></section>
      <section class="domain-section domain-fit"><header><p class="domain-label">Decision note 01</p><h2>Who this project fits and who it does not</h2></header><div class="domain-fit__columns"><div><h3>A useful fit if…</h3><ul>${c.forYou.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div><div><h3>Choose another route if…</h3><ul>${c.notForYou.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div></div></section>
      <section class="domain-section domain-project" id="assigned-project"><header><p class="domain-label">Official assigned project</p><h2>${esc(page.facts.taskBrief.split(/\s*[—–\-:]\s*/)[0])}</h2><p>${esc(c.buildIntro)}</p></header>${ownerFact(page, "taskBrief", (value) => `<div class="domain-callout"><strong>Task brief</strong><p>${esc(value)}</p></div>`)}${ownerFact(page, "deliverables", (items) => `<div class="deliverable-strip"><h3>Catalogue deliverables</h3><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>`)}</section>
      ${c.projectNarrative ? `<section class="domain-section domain-narrative"><header><p class="domain-label">How the project works</p><h2>${esc(c.narrativeHeading || "Make the engineering decisions visible")}</h2></header>${c.projectNarrative.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}</section>` : ""}
      ${c.evidenceNotes ? `<section class="domain-section domain-evidence"><header><p class="domain-label">Submission evidence</p><h2>What makes this work reviewable</h2></header><ul>${c.evidenceNotes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul></section>` : ""}
      <section class="domain-section domain-path"><header><p class="domain-label">Your build path</p><h2>Move from question to reviewable evidence</h2></header>${ownerFact(page, "taskOutline", (steps) => `<ol class="build-path" data-stepper>${steps.map((step, i) => `<li><button type="button" data-step-button aria-expanded="${i === 0 ? "true" : "false"}"><span>${String(i + 1).padStart(2, "0")}</span><strong>${esc(c.progression[i][0])}</strong></button><p>${esc(step)} ${esc(c.progression[i][1])}</p></li>`).join("")}</ol>`)}</section>
      <section class="domain-section domain-self-check" data-self-check><header><p class="domain-label">Private self-check</p><h2>Is this project a reasonable learning fit?</h2><p>Your answers remain in this browser tab and are not stored or sent.</p></header><fieldset><legend>Check statements you can answer “yes” to today</legend>${c.selfCheck.map((x, i) => `<label><input type="checkbox" value="${i}"><span>${esc(x)}</span></label>`).join("")}</fieldset><p class="self-check-result" role="status">Use these prompts for reflection; they are not an eligibility test.</p></section>
      <section class="domain-section domain-skills"><header><p class="domain-label">Skills notebook</p><h2>Build capability in a realistic order</h2><p>These are general domain-learning suggestions, not confirmed HireeBridge tool requirements.</p></header><div class="skill-filters" role="group" aria-label="Filter skill groups"><button type="button" class="is-active" data-skill-filter="all">All</button>${c.skills.map((x, i) => `<button type="button" data-skill-filter="${i}">${esc(x.group)}</button>`).join("")}</div><div class="skill-groups">${skillGroups}</div><div class="source-links"><h3>Authoritative references</h3>${c.links.map(([label, href]) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`).join("")}</div></section>
      <section class="domain-section domain-mistakes"><header><p class="domain-label">Review before submitting</p><h2>Common ${esc(page.name)} project mistakes</h2></header><ol>${c.mistakes.map(([name, detail], i) => `<li><span>${String(i + 1).padStart(2, "0")}</span><div><h3>${esc(name)}</h3><p>${esc(detail)}</p></div></li>`).join("")}</ol>${ownerFact(page, "reviewCriteria", (value) => `<div data-class-a-section><h3>What reviewers check</h3><p>${esc(value)}</p></div>`)}${ownerFact(page, "reviewer", (value) => `<div data-class-a-section><h3>Reviewer</h3><p>${esc(value)}</p></div>`)}${ownerFact(page, "validation", (value) => `<div class="domain-callout"><strong>Catalogue validation notes</strong><p>${esc(value)}</p></div>`)}</section>
      <section class="domain-section domain-cv" data-cv-builder><header><p class="domain-label">Evidence language</p><h2>Draft an honest CV bullet</h2><p>Keep placeholders until you can replace them with evidence from your own project.</p></header><div class="cv-controls"><label>Tool you actually used<input type="text" data-cv-tool placeholder="[tool]" maxlength="50"></label><label>Metric you actually measured<input type="text" data-cv-metric placeholder="[metric]" maxlength="50"></label></div><ul data-cv-patterns>${c.cvPatterns.map((x) => `<li>${esc(x)}</li>`).join("")}</ul><output data-cv-output>${esc(c.cvPatterns[0])}</output><button type="button" class="domain-action" data-copy-cv>Copy draft</button><span class="copy-status" role="status"></span></section>
      <section class="domain-section domain-college" data-college-checklist><header><p class="domain-label">Project readiness</p><h2>Prepare a strong project submission</h2></header><div class="college-checklist">${(c.college && c.college.length ? c.college : ["Read the assigned project brief and define your implementation plan.", "Set up your working environment and record the steps needed to run it.", "Keep test results, documentation and project evidence ready for submission.", "Review pricing and plan details before you start."]).map((item) => `<label><input type="checkbox"><span>${esc(item)}</span></label>`).join("")}</div><button type="button" class="domain-action" data-print-checklist>Print project checklist</button></section>
      <section class="domain-section domain-credential"><header><p class="domain-label">Certificate and verification</p><h2>Completion comes before the credential</h2><p>${esc(c.credential)}</p></header><ol aria-label="Credential process"><li>Complete</li><li>Submit</li><li>Review</li><li>Approval</li><li>Credential ID and QR</li></ol><p><a href="/certificate">Read the certificate process</a> · <a href="https://greyrocks.in/verification" target="_blank" rel="noopener noreferrer">Verify a credential on GreyRocks</a></p>${ownerFact(page, "duration", (value) => `<p data-class-a-section><strong>Duration:</strong> ${esc(value)}</p>`)}${ownerFact(page, "planInclusions", (value) => `<p data-class-a-section><strong>Plan inclusions:</strong> ${esc(value)}</p>`)}</section>
      <section class="domain-section domain-faq"><header><p class="domain-label">Questions from students</p><h2>${esc(page.name)} internship FAQ</h2></header>${c.faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>
      ${c.sibling ? `<aside class="domain-section domain-sibling"><p class="domain-label">Not what you are looking for?</p><h2><a href="${esc(c.sibling.href)}">${esc(c.sibling.label)}</a></h2><p>${esc(c.sibling.difference)}</p></aside>` : ""}
      <section class="domain-section domain-final"><p class="domain-label">Next step</p><h2>Choose your plan and start building.</h2><p>Review plan details, included resources and the assigned project scope before you begin.</p><div><a class="btn btn-dark" href="/pricing">View plans and pricing</a><a href="/about">About HireeBridge</a><a href="/internships/">All internship domains</a></div></section>
      <aside class="domain-mobile-cta"><span>${esc(page.name)} internship</span><a href="/checkout?plan=project&amp;domain=${encodeURIComponent(page.slug)}">View plans and start</a></aside>
    </main>`,
  });
}

function renderSkeleton({ page, layout }) {
  const path = `/internships/${page.slug}/`;
  return layout({
    title: `${page.name} programme | HireeBridge`,
    description: `Information about the HireeBridge ${page.name} project-based internship programme.`,
    active: path,
    noindex: true,
    keywords: false,
    ogLocale: "en_IN",
    lang: "en-IN",
    localDomainFonts: true,
    extraStylesheets: [
      "/css/domain-pages.tokens.css?v=2",
      "/css/domain-pages.css?v=2",
    ],
    content: `<main class="domain-page" style="--domain-accent:${esc(page.accent)}"><nav class="domain-breadcrumb"><a href="/internships/">Internships</a><span>/</span><strong>${esc(page.name)}</strong></nav><section class="domain-hero"><div><p class="domain-eyebrow">Project-based Internship Programme</p><h1>${esc(page.name)} Online Internship Project with Certificate</h1><p class="domain-answer">This page remains in preparation until its owner facts and content review are complete.</p><p class="domain-disclosure">${esc(DISCLOSURE)}</p></div></section>${marker(`${page.name}: ${page.missingFacts.join(", ")}`)}</main>`,
  });
}

function renderDomainInternshipPage(args) {
  return args.page.pilot ? renderFullPage(args) : renderSkeleton(args);
}
module.exports = { DISCLOSURE, renderDomainInternshipPage };
