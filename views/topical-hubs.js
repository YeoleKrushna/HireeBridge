'use strict';

const fs = require('fs');
const path = require('path');
const { getProjectForDomain, PROJECT_CATALOGUE } = require('../config/project-catalogue.js');

const esc = (value) =>
  String(value ?? '')
    .replace(/educational programme/gi, 'internship programme')
    .replace(/[&<>'"]/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[c]);

// Hub Navigation Switcher Strip rendered at the top of all 5 topical hubs
function hubSwitcher(activeSlug) {
  const hubs = [
    { slug: 'internships', label: 'Domain Directory', href: '/internships/' },
    { slug: 'project-based', label: 'Project-Based Model', href: '/project-based-internships/' },
    { slug: 'virtual', label: 'Virtual Delivery', href: '/virtual-internships/' },
    { slug: 'certificate', label: 'Credential & Verification', href: '/internship-certificate/' },
    { slug: 'projects', label: '32 Project Specs', href: '/internship-projects/' }
  ];

  return `
<nav class="hub-nav-strip" aria-label="Topical Hub Navigation">
  <div class="hub-nav-inner">
    <span class="hub-nav-label">Topical Hubs:</span>
    <ul class="hub-nav-list">
      ${hubs.map(h => `
        <li>
          <a href="${h.href}" class="hub-nav-link ${activeSlug === h.slug ? 'active' : ''}" ${activeSlug === h.slug ? 'aria-current="page"' : ''}>
            ${esc(h.label)}
          </a>
        </li>
      `).join('')}
    </ul>
  </div>
</nav>`;
}

// Reusable FAQ Component
function renderFaq(faqItems) {
  return `
<section class="section hub-faq-section" aria-labelledby="hub-faq-heading">
  <div class="section-head text-center">
    <div class="eyebrow">Clear Answers</div>
    <h2 id="hub-faq-heading">Frequently Asked Questions</h2>
    <p class="lead">Everything you need to know about our standards, evaluation, and credentials.</p>
  </div>
  <div class="hub-faq-grid">
    ${faqItems.map((item, idx) => `
      <details class="hub-faq-item" ${idx === 0 ? 'open' : ''}>
        <summary class="hub-faq-summary">
          <span>${esc(item[0])}</span>
          <svg class="hub-faq-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <div class="hub-faq-body">
          <p>${esc(item[1])}</p>
        </div>
      </details>
    `).join('')}
  </div>
</section>`;
}

// ============================================================================
// HUB 2: VIRTUAL INTERNSHIPS (/virtual-internships/)
// ============================================================================
function virtualInternshipsPage({ layout, session, geo, domains, PROJECT_CATALOGUE }) {
  const content = `<main class="hub-page hub-virtual">
${hubSwitcher('virtual')}

<header class="hub-hero">
  <div class="hub-hero-container">
    <div class="eyebrow-industry">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Remote Experiential Learning 2026
    </div>
    <h1>Virtual Internships Built Around Real Engineering Deliverables.</h1>
    <p class="hub-hero-lead">
      Gain verified project experience from anywhere. Work on production-grade problem statements, submit authentic GitHub repositories, and earn globally verifiable GreyRocks credentials without geographical or relocation barriers.
    </p>
    <div class="hub-hero-actions">
      <a class="btn btn-primary" href="/internships/">Explore 32 Virtual Tracks</a>
      <a class="btn btn-secondary" href="/internship-projects/">Inspect Project Deliverables</a>
    </div>
    <div class="hub-hero-badges">
      <span class="hub-badge">✓ 100% Self-Paced &amp; Remote</span>
      <span class="hub-badge">✓ Public Git &amp; Code Evidence</span>
      <span class="hub-badge">✓ Rigorous Rubric Review</span>
      <span class="hub-badge">✓ Verifiable GreyRocks Credential</span>
    </div>
  </div>
</header>

<section class="section hub-feature-strip">
  <div class="hub-feature-grid">
    <div class="hub-feat-card">
      <div class="hub-feat-icon">🌐</div>
      <h3>Location Independent</h3>
      <p>Execute real tasks from your college hostel, home, or workspace without needing to relocate or commute to tech hubs.</p>
    </div>
    <div class="hub-feat-card">
      <div class="hub-feat-icon">💻</div>
      <h3>Authentic Work Artifacts</h3>
      <p>No artificial quiz questions. You build functioning systems, push git commits, write tests, and document architecture.</p>
    </div>
    <div class="hub-feat-card">
      <div class="hub-feat-icon">🎯</div>
      <h3>Transparent Review</h3>
      <p>Work is reviewed against explicit rubric criteria. Approved submissions trigger an official verifiable credential.</p>
    </div>
    <div class="hub-feat-card">
      <div class="hub-feat-icon">📜</div>
      <h3>Verified Credential</h3>
      <p>Issued by GreyRocks with a unique credential ID and cryptographic QR code checkable on our public registry.</p>
    </div>
  </div>
</section>

<section class="section hub-prose-section">
  <div class="hub-prose-container">
    <div class="section-head">
      <div class="eyebrow">Practical Distinction</div>
      <h2>What a Virtual Internship Is (and What It Isn't)</h2>
    </div>
    <div class="hub-prose-text">
      <p>
        The landscape of engineering education has evolved. Traditional internships often require physical office attendance, rigid 9-to-5 schedules, and geographic proximity to major metropolitan tech corridors. For thousands of university students and early-career engineers, these logistical constraints create steep barriers to practical experience.
      </p>
      <p>
        <strong>A virtual internship at HireeBridge is project-based experiential learning.</strong> It is structured around an assigned engineering challenge with defined business context, technical constraints, and measurable deliverables. You work with the actual tools of modern software engineering: IDEs, version control, container platforms, APIs, and cloud services.
      </p>
      
      <div class="hub-contrast-card">
        <div class="contrast-col negative">
          <h4>What We Are Not</h4>
          <ul>
            <li>❌ <strong>Not a passive video lecture course:</strong> You do not watch hours of pre-recorded lectures to get a badge.</li>
            <li>❌ <strong>Not physical employer placement:</strong> We do not offer physical office seating or employment contracts.</li>
            <li>❌ <strong>Not an automated quiz generator:</strong> Multiple-choice quizzes do not replace writing and deploying software.</li>
            <li>❌ <strong>Not a paper certificate mill:</strong> Credentials are only issued after authentic project evidence is reviewed and approved.</li>
          </ul>
        </div>
        <div class="contrast-col positive">
          <h4>What HireeBridge Provides</h4>
          <ul>
            <li>✅ <strong>32 Production-Grade Project Briefs:</strong> Realistic enterprise scenarios with architectural constraints.</li>
            <li>✅ <strong>Self-Paced Execution:</strong> Balance your internship tasks around university exams and academic timetables.</li>
            <li>✅ <strong>Public Portfolio Artifacts:</strong> Walk away with GitHub repositories and live deployments to show technical recruiters.</li>
            <li>✅ <strong>Independent Verification Registry:</strong> A tamper-evident verification portal where employers can authenticate your credential.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section hub-workflow-section">
  <div class="section-head text-center">
    <div class="eyebrow">The 5-Step Process</div>
    <h2>How the Virtual Workflow Operates</h2>
    <p class="lead">From initial enrollment to verified credential, here is the exact progression.</p>
  </div>
  <div class="hub-steps-grid">
    <div class="hub-step-card">
      <div class="step-num-badge">01</div>
      <h3>Track Selection</h3>
      <p>Choose your domain from our 32 specialized engineering tracks. Receive your assigned problem statement, scenario context, and technical rubric.</p>
    </div>
    <div class="hub-step-card">
      <div class="step-num-badge">02</div>
      <h3>Local Implementation</h3>
      <p>Develop your solution in your local development environment using industry-standard tools, libraries, and frameworks.</p>
    </div>
    <div class="hub-step-card">
      <div class="step-num-badge">03</div>
      <h3>Evidence Packaging</h3>
      <p>Push your code to a public GitHub repository, write an engineering README with architectural diagrams, and document edge cases.</p>
    </div>
    <div class="hub-step-card">
      <div class="step-num-badge">04</div>
      <h3>Rubric Evaluation</h3>
      <p>Submit your project URL via your student dashboard. Technical reviewers evaluate your codebase against the domain evaluation criteria.</p>
    </div>
    <div class="hub-step-card">
      <div class="step-num-badge">05</div>
      <h3>Verified Credential</h3>
      <p>Upon approval, your official completion credential is issued by GreyRocks with a unique credential ID, public verification link, and QR code.</p>
    </div>
  </div>
</section>

<section class="section hub-categories-section">
  <div class="section-head text-center">
    <div class="eyebrow">Explore Available Tracks</div>
    <h2>Virtual Internship Domain Clusters</h2>
    <p class="lead">Browse our 32 specialized tracks categorized by technical discipline.</p>
  </div>
  <div class="hub-clusters-grid">
    <div class="hub-cluster-box">
      <h3>Data &amp; Artificial Intelligence</h3>
      <p>Data Science, Machine Learning, AI, Generative AI, NLP, Computer Vision, Deep Learning.</p>
      <a class="cluster-link" href="/internships/?category=ai-data">Explore AI &amp; Data Tracks &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Software &amp; Web Engineering</h3>
      <p>Full Stack, Frontend, Backend, Web Development, Python, API &amp; Microservices, Rust Systems, Mobile.</p>
      <a class="cluster-link" href="/internships/?category=software">Explore Software Tracks &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Cloud, DevOps &amp; Reliability</h3>
      <p>Cloud Computing, DevOps Engineering, SRE, Big Data Engineering, Embedded Systems &amp; IoT.</p>
      <a class="cluster-link" href="/internships/?category=cloud-infra">Explore Cloud &amp; Infra Tracks &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Cyber Security &amp; Trust</h3>
      <p>Cyber Security Threat Defense, Ethical Hacking &amp; Web Penetration Testing.</p>
      <a class="cluster-link" href="/internships/?category=security">Explore Security Tracks &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Product, Design &amp; Growth</h3>
      <p>UI/UX Design, Product Management, Business Analytics, Digital Marketing, Forward Deployed Engineer.</p>
      <a class="cluster-link" href="/internships/?category=product-design">Explore Product &amp; Design &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Specialized Engineering</h3>
      <p>Blockchain Development, Game Development, Bioinformatics, Software Testing &amp; QA.</p>
      <a class="cluster-link" href="/internships/?category=specialized">Explore Specialized Tracks &rarr;</a>
    </div>
  </div>
</section>

${renderFaq([
  ['Are virtual internships accepted by colleges for academic credits?', 'Yes, many universities and degree programs recognize project-based virtual internships provided they fulfill course requirements, duration standards, and provide verifiable proof of work. HireeBridge provides an offer letter, project brief, submission records, and a verifiable credential from GreyRocks. Check your specific department guidelines before enrolling.'],
  ['How do recruiters verify that I actually did the work?', 'Recruiters can verify your credential instantly via the public verification portal at /verification/:id or by scanning the cryptographic QR code on your certificate. Furthermore, your GitHub repository link and documented project architecture serve as undeniable primary proof during technical interviews.'],
  ['How much time do I need to commit each week?', 'Because the program is self-paced, you can work at your own schedule. Most students spend between 8 to 15 hours per week over 4 to 8 weeks depending on the complexity of their selected domain project.'],
  ['What happens if my project submission is not approved on the first try?', 'Our reviewers provide specific rubric feedback detailing which criteria were missed. You can revise your code, address edge cases, update your documentation, and resubmit without extra fees.'],
  ['Do you guarantee physical job placements or corporate hiring?', 'No. HireeBridge is a project-based experiential training platform. We do not make false promises of guaranteed employment. We equip you with verifiable project evidence, production code artifacts, and recognized credentials that significantly improve your job market standing.']
])}

<section class="section hub-cta-section">
  <div class="hub-cta-card">
    <h2>Ready to Build Production-Grade Project Experience?</h2>
    <p>Choose from 32 domains, receive your assigned engineering challenge, and prove your capabilities with verifiable work.</p>
    <div class="hub-cta-buttons">
      <a class="btn btn-primary" href="/internships/">Browse All 32 Domains</a>
      <a class="btn btn-ghost" href="/project-based-internships/">Read Project-Based Methodology</a>
    </div>
  </div>
</section>
</main>`;

  return layout({
    title: 'Virtual Internships | Remote Project-Based Technical Tracks | HireeBridge',
    description: 'Explore virtual internships built on real engineering deliverables. Self-paced remote tracks across 32 domains with code submission, rubric review, and verifiable GreyRocks credentials.',
    active: '/virtual-internships/',
    session,
    currency: geo?.currency || 'INR',
    extraStylesheets: ['/css/topical-hubs.css'],
    pageJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://hireebridge.com/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Virtual Internships', 'item': 'https://hireebridge.com/virtual-internships/' }
      ]
    },
    content
  });
}

// ============================================================================
// HUB 3: PROJECT-BASED INTERNSHIPS (/project-based-internships/)
// ============================================================================
function projectBasedInternshipsPage({ layout, session, geo, domains, PROJECT_CATALOGUE }) {
  const content = `<main class="hub-page hub-project-based">
${hubSwitcher('project-based')}

<header class="hub-hero">
  <div class="hub-hero-container">
    <div class="eyebrow-industry">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Applied Engineering Paradigm
    </div>
    <h1>Project-Based Internships: Proof Over Passive Theory.</h1>
    <p class="hub-hero-lead">
      Move beyond tutorial hell. Solve production-grade architectural challenges, write maintainable code, test edge cases, and build portfolio assets that prove your capabilities to hiring managers and engineering teams.
    </p>
    <div class="hub-hero-actions">
      <a class="btn btn-primary" href="/internship-projects/">Inspect 32 Project Specifications</a>
      <a class="btn btn-secondary" href="/internships/">Select Your Domain Track</a>
    </div>
    <div class="hub-hero-badges">
      <span class="hub-badge">✓ Production Architecture Scenarios</span>
      <span class="hub-badge">✓ Real Tooling &amp; Frameworks</span>
      <span class="hub-badge">✓ Codebase &amp; Test Suite Review</span>
      <span class="hub-badge">✓ Portfolio-Ready Documentation</span>
    </div>
  </div>
</header>

<section class="section hub-prose-section">
  <div class="hub-prose-container">
    <div class="section-head">
      <div class="eyebrow">The Core Philosophy</div>
      <h2>Why Project-Based Learning Wins in Modern Tech Hiring</h2>
    </div>
    <div class="hub-prose-text">
      <p>
        In contemporary software and data engineering, the value of generic online certifications has deteriorated. Hiring managers routinely review resumes claiming proficiency in Python, React, or AWS, only to find candidates who have never diagnosed an out-of-memory error, normalized a relational database schema, or configured a production CI/CD workflow.
      </p>
      <p>
        <strong>Project-based internships invert this dynamic.</strong> Instead of passive instruction, learning occurs through the continuous process of problem analysis, system design, implementation, debugging, and verification. You are assigned a realistic corporate scenario—such as building an IoT stream lakehouse, deploying a multi-tier VPC, or developing a multimodal support triage assistant—and held accountable for delivering a working, documented technical artifact.
      </p>

      <div class="hub-comparison-table-wrap">
        <table class="hub-table">
          <thead>
            <tr>
              <th>Evaluation Dimension</th>
              <th>Tutorial / Toy Projects</th>
              <th>HireeBridge Project-Based Internship</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Problem Definition</strong></td>
              <td>Simplistic, sanitized toy prompts (e.g., Todo app, Iris classifier).</td>
              <td>Enterprise scenarios with operational constraints, dirty data, and security rules.</td>
            </tr>
            <tr>
              <td><strong>Code Quality &amp; Structure</strong></td>
              <td>Single-file scripts copied directly from video guides.</td>
              <td>Modular architecture, automated unit tests, typing, and linting standards.</td>
            </tr>
            <tr>
              <td><strong>Artifacts Generated</strong></td>
              <td>Uncommented GitHub repository with no documentation.</td>
              <td>Comprehensive README, architecture diagrams, runbooks, and test reports.</td>
            </tr>
            <tr>
              <td><strong>Verification &amp; Trust</strong></td>
              <td>Unverified PDF download without evaluation or registry lookup.</td>
              <td>Cryptographically verifiable GreyRocks credential with unique ID and QR registry.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>

<section class="section hub-lifecycle-section">
  <div class="section-head text-center">
    <div class="eyebrow">The 5-Stage Lifecycle</div>
    <h2>The Anatomy of a Project-Based Internship</h2>
    <p class="lead">Every domain follows a structured, outcome-driven engineering methodology.</p>
  </div>
  <div class="lifecycle-flow">
    <div class="lifecycle-card">
      <div class="lifecycle-badge">Stage 1</div>
      <h3>Problem Definition</h3>
      <p>Analyze business objectives, examine edge cases, define system boundaries, and review input/output contracts.</p>
      <div class="lifecycle-deliverable">Deliverable: System Design Plan</div>
    </div>
    <div class="lifecycle-card">
      <div class="lifecycle-badge">Stage 2</div>
      <h3>Implementation</h3>
      <p>Write production-grade source code, implement domain logic, integrate database stores, and containerize services.</p>
      <div class="lifecycle-deliverable">Deliverable: Working Codebase &amp; Dockerfile</div>
    </div>
    <div class="lifecycle-card">
      <div class="lifecycle-badge">Stage 3</div>
      <h3>Testing &amp; Edge Cases</h3>
      <p>Write automated test suites (unit, integration, load), handle boundary conditions, and validate error resilience.</p>
      <div class="lifecycle-deliverable">Deliverable: Test Reports &amp; CI Pipeline</div>
    </div>
    <div class="lifecycle-card">
      <div class="lifecycle-badge">Stage 4</div>
      <h3>Evidence Documentation</h3>
      <p>Craft a technical README containing system architecture diagrams, deployment instructions, and evaluation metrics.</p>
      <div class="lifecycle-deliverable">Deliverable: Public GitHub Portfolio Repo</div>
    </div>
    <div class="lifecycle-card">
      <div class="lifecycle-badge">Stage 5</div>
      <h3>Rubric Evaluation &amp; Credential</h3>
      <p>Submit work for mentor evaluation. Upon meeting quality thresholds, receive your verifiable GreyRocks credential.</p>
      <div class="lifecycle-deliverable">Deliverable: Verifiable Credential &amp; Registry ID</div>
    </div>
  </div>
</section>

<section class="section hub-categories-section">
  <div class="section-head text-center">
    <div class="eyebrow">Project Archetypes by Domain</div>
    <h2>Real-World Project Categories</h2>
    <p class="lead">Inspect the types of technical systems you will build across each discipline.</p>
  </div>
  <div class="hub-clusters-grid">
    <div class="hub-cluster-box">
      <h3>Data Science &amp; Machine Learning</h3>
      <p>Build end-to-end telemetry pipelines, predictive maintenance models, customer churn engines, and interactive analytics dashboards.</p>
      <a class="cluster-link" href="/internships/data-science/">View Data Science Project &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Cloud Infrastructure &amp; DevOps</h3>
      <p>Construct GitOps Kubernetes pipelines with ArgoCD, provision multi-tier VPCs via Terraform, and implement SLO/SLI chaos recovery runbooks.</p>
      <a class="cluster-link" href="/internships/devops/">View DevOps Project &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Full Stack &amp; Distributed Systems</h3>
      <p>Architect team collaboration workspaces, event-driven order processing microservices, and high-performance zero-copy key-value stores.</p>
      <a class="cluster-link" href="/internships/full-stack-development/">View Full Stack Project &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Cyber Security &amp; Defensive Ops</h3>
      <p>Design SOC SIEM detection rules for Wazuh, perform web application vulnerability assessments, and produce remediation reports.</p>
      <a class="cluster-link" href="/internships/cyber-security/">View Cyber Security Project &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Generative AI &amp; Modern NLP</h3>
      <p>Deploy enterprise RAG pipelines with vector databases, multimodal support triage assistants, and clinical sentiment extractors.</p>
      <a class="cluster-link" href="/internships/generative-ai/">View Generative AI Project &rarr;</a>
    </div>
    <div class="hub-cluster-box">
      <h3>Product Management &amp; UI/UX</h3>
      <p>Author exhaustive B2B PRDs, design tokenized mobile FinTech applications in Figma, and build SaaS cohort retention models.</p>
      <a class="cluster-link" href="/internships/product-management/">View Product Management Project &rarr;</a>
    </div>
  </div>
</section>

${renderFaq([
  ['Why do engineering recruiters prefer project evidence over certificates alone?', 'A certificate simply claims someone enrolled; a GitHub repository containing architectural diagrams, modular commits, automated tests, and Docker deployment files proves that the engineer can actually produce software and solve problems.'],
  ['Are the project requirements pre-written or do I have to invent my own idea?', 'Each of our 32 domains comes with an assigned real-world problem statement, business scenario, architectural requirements, and evaluation rubric. This eliminates decision fatigue and ensures your project mirrors enterprise engineering expectations.'],
  ['What tools and programming languages do I need?', 'Tools depend on your selected track. For Data Science you will use Python, Scikit-Learn, Pandas, and FastAPI; for DevOps, Kubernetes, Helm, and GitHub Actions; for Web Development, Node.js, PostgreSQL, and modern JavaScript. All tools used are industry standards.'],
  ['Can I customize my project beyond the baseline requirements?', 'Yes! We encourage students to implement advanced features, extra security controls, or optimized caching layers. High-quality extensions are highlighted in reviewer evaluations.'],
  ['How is my project evaluated?', 'Reviewers evaluate code organization, error handling, adherence to system design specifications, automated test coverage, and documentation clarity. You receive constructive feedback upon review.']
])}

<section class="section hub-cta-section">
  <div class="hub-cta-card">
    <h2>Ready to Build Systems That Stand Out on Your Resume?</h2>
    <p>Explore all 32 assigned real-world project specifications and start engineering today.</p>
    <div class="hub-cta-buttons">
      <a class="btn btn-primary" href="/internship-projects/">Inspect All 32 Projects</a>
      <a class="btn btn-ghost" href="/internships/">Choose Your Career Track</a>
    </div>
  </div>
</section>
</main>`;

  return layout({
    title: 'Project-Based Internships | Hands-On Engineering Deliverables | HireeBridge',
    description: 'Master practical engineering through project-based internships. Build real-world architectures across 32 domains, submit authentic GitHub code, and earn verifiable GreyRocks credentials.',
    active: '/project-based-internships/',
    session,
    currency: geo?.currency || 'INR',
    extraStylesheets: ['/css/topical-hubs.css'],
    pageJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://hireebridge.com/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Project-Based Internships', 'item': 'https://hireebridge.com/project-based-internships/' }
      ]
    },
    content
  });
}

// ============================================================================
// HUB 4: INTERNSHIP CERTIFICATE & CREDENTIALS (/internship-certificate/)
// ============================================================================
function internshipCertificatePage({ layout, session, geo, domains, PROJECT_CATALOGUE }) {
  const content = `<main class="hub-page hub-certificate">
${hubSwitcher('certificate')}

<header class="hub-hero">
  <div class="hub-hero-container">
    <div class="eyebrow-industry">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Verifiable Credential Standards
    </div>
    <h1>Internship Certificate &amp; Credential Verification Guide.</h1>
    <p class="hub-hero-lead">
      Understanding authentic internship credentials. Learn how HireeBridge project completion leads to verifiable credentials issued by GreyRocks, backed by a public verification registry and cryptographic QR checks.
    </p>
    <div class="hub-hero-actions">
      <a class="btn btn-primary" href="/verification">Access Verification Registry</a>
      <a class="btn btn-secondary" href="/certificate">View Credential Sample</a>
    </div>
    <div class="hub-hero-badges">
      <span class="hub-badge">✓ Unique Credential Identifier</span>
      <span class="hub-badge">✓ Tamper-Evident QR Code</span>
      <span class="hub-badge">✓ Issued by GreyRocks</span>
      <span class="hub-badge">✓ Submission-Gated (No Buy-to-Print)</span>
    </div>
  </div>
</header>

<section class="section hub-prose-section">
  <div class="hub-prose-container">
    <div class="section-head">
      <div class="eyebrow">Integrity &amp; Trust</div>
      <h2>What Makes an Internship Credential Meaningful?</h2>
    </div>
    <div class="hub-prose-text">
      <p>
        In recent years, the internet has become saturated with unregulated websites selling generic certificate templates. Anyone can download a PDF claiming completion of an internship without ever opening a terminal, writing a line of code, or submitting work. Employers, university evaluation panels, and technical recruiters have become rightfully skeptical of unverified paper certificates.
      </p>
      <p>
        <strong>A meaningful credential represents verified work, not mere financial transaction.</strong> At HireeBridge, credentials are cryptographically verifiable records issued by GreyRocks that correspond to an approved, independently reviewed project submission.
      </p>

      <div class="hub-anatomy-card">
        <h3>The 4 Pillars of a Verifiable HireeBridge Credential</h3>
        <div class="anatomy-grid">
          <div class="anatomy-item">
            <div class="anatomy-num">01</div>
            <h4>Unique Credential ID</h4>
            <p>Every certificate contains a unique alphanumeric identifier (e.g. <code>HB-2026-DS-4921</code>) mapped directly to the recipient record.</p>
          </div>
          <div class="anatomy-item">
            <div class="anatomy-num">02</div>
            <h4>Cryptographic QR Verification</h4>
            <p>A high-resolution QR code allows recruiters to scan the document with any smartphone and instantly load the authoritative registry record.</p>
          </div>
          <div class="anatomy-item">
            <div class="anatomy-num">03</div>
            <h4>GreyRocks Issuing Authority</h4>
            <p>Credentials are formally issued by GreyRocks as the credentialing body, preserving separation between program delivery and credential issuance.</p>
          </div>
          <div class="anatomy-item">
            <div class="anatomy-num">04</div>
            <h4>Immutable Public Registry</h4>
            <p>Records are hosted on an always-on public registry (<code>hireebridge.com/verification/:id</code>) confirming name, domain, issue date, and validity.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section hub-prose-section">
  <div class="hub-prose-container">
    <div class="section-head">
      <div class="eyebrow">Quality Gate</div>
      <h2>Submission-Gated vs. "Buy-to-Print" Certifications</h2>
    </div>
    <div class="hub-prose-text">
      <p>
        We enforce an absolute rule across all 32 domains: <strong>enrolling in a plan does not automatically issue a certificate.</strong>
      </p>
      <p>
        To earn your credential, you must log in to your student dashboard, access your assigned problem statement, complete the technical implementation, and submit your public GitHub repository and documentation. Our technical reviewers inspect your submission against the domain rubric. If the submission is incomplete or fails basic functional checks, the credential is withheld until necessary revisions are made.
      </p>
      <p>
        This quality gate protects you as a student. When you present a HireeBridge credential issued by GreyRocks, hiring managers know it represents genuine project execution.
      </p>
    </div>
  </div>
</section>

<section class="section hub-portfolio-guide-section">
  <div class="section-head text-center">
    <div class="eyebrow">Professional Best Practices</div>
    <h2>How to Feature Your Credential on Resumes &amp; LinkedIn</h2>
    <p class="lead">Pair your certificate with code evidence for maximum hiring impact.</p>
  </div>
  <div class="portfolio-grid">
    <div class="portfolio-card">
      <h3>1. On Your LinkedIn Profile</h3>
      <p>Add under <strong>Licenses &amp; Certifications</strong>:</p>
      <ul>
        <li><strong>Name:</strong> [Domain Name] Internship Experience (e.g., Data Science Internship)</li>
        <li><strong>Issuing Organization:</strong> GreyRocks / HireeBridge</li>
        <li><strong>Issue Date:</strong> [Month, Year]</li>
        <li><strong>Credential ID:</strong> [Your Unique ID]</li>
        <li><strong>Credential URL:</strong> https://hireebridge.com/verification/[Your-ID]</li>
      </ul>
    </div>
    <div class="portfolio-card">
      <h3>2. On Your Engineering Resume</h3>
      <p>Feature under <strong>Project Experience</strong> rather than generic education:</p>
      <div class="resume-snippet">
        <strong>Data Science Intern | HireeBridge (Issued by GreyRocks)</strong><br>
        <em>Jan 2026 – Feb 2026 | Credential ID: HB-2026-DS-4921</em><br>
        &bull; Engineered a predictive maintenance telemetry system using Scikit-Learn and FastAPI.<br>
        &bull; Built an automated anomaly detection pipeline processing sensor logs with 92% F1 score.<br>
        &bull; Published reproducible codebase and Docker container to GitHub.
      </div>
    </div>
    <div class="portfolio-card">
      <h3>3. In Your GitHub README</h3>
      <p>Embed the verification badge directly in your project README:</p>
      <div class="code-snippet-box">
        <code>[![Credential Verified](https://hireebridge.com/brand/favicon-32x32.png)](https://hireebridge.com/verification/YOUR-ID)</code>
      </div>
    </div>
  </div>
</section>

${renderFaq([
  ['How can a recruiter or college verify my certificate?', 'Anyone can verify your credential by visiting /verification and typing your Credential ID, or by scanning the QR code printed on the certificate. The registry displays the student name, domain, issue date, issuing partner (GreyRocks), and authentication status.'],
  ['Is an internship certificate equivalent to an employment certificate?', 'No. An internship certificate validates participation and successful project completion in a structured training or experiential learning programme. It must not be misrepresented as corporate employment or salaried service.'],
  ['Can I get a certificate immediately after paying?', 'No. Enrolling gives you access to the project task, reference materials, and dashboard. You must finish your assigned project, submit your code and documentation, and pass reviewer evaluation before your certificate is generated.'],
  ['Are GreyRocks certificates recognized internationally?', 'Yes. GreyRocks credentials adhere to modern digital verification standards. Because they include a verifiable online URL, tamper-evident cryptographic QR code, and public registry entry, they can be authenticated from anywhere in the world.'],
  ['Can I request a hard copy of my certificate?', 'HireeBridge issues high-resolution, vector-crisp digital PDF and JPG certificates suitable for high-dpi printing. You can print the generated PDF directly on standard parchment or cardstock for in-person university submissions.']
])}

<section class="section hub-cta-section">
  <div class="hub-cta-card">
    <h2>Earn a Verifiable Credential You Can Confidently Defend.</h2>
    <p>Choose your domain, complete the assigned engineering challenge, and get verified.</p>
    <div class="hub-cta-buttons">
      <a class="btn btn-primary" href="/internships/">Explore 32 Domains</a>
      <a class="btn btn-ghost" href="/how-it-works">Review Workflow Steps</a>
    </div>
  </div>
</section>
</main>`;

  return layout({
    title: 'Internship Certificate & Credential Verification Guide | HireeBridge',
    description: 'Learn how HireeBridge internship certificates work. Verifiable credentials issued by GreyRocks with unique IDs, QR registry lookup, and project submission quality gates.',
    active: '/internship-certificate/',
    session,
    currency: geo?.currency || 'INR',
    extraStylesheets: ['/css/topical-hubs.css'],
    pageJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://hireebridge.com/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Internship Certificate', 'item': 'https://hireebridge.com/internship-certificate/' }
      ]
    },
    content
  });
}

// ============================================================================
// HUB 5: INTERNSHIP PROJECTS (/internship-projects/)
// ============================================================================
function internshipProjectsPage({ layout, session, geo, domains, DOMAIN_SEARCH_METADATA }) {
  const content = `<main class="hub-page hub-projects">
${hubSwitcher('projects')}

<header class="hub-hero">
  <div class="hub-hero-container">
    <div class="eyebrow-industry">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      Master Engineering Catalogue
    </div>
    <h1>Explore 32 Real-World Internship Projects.</h1>
    <p class="hub-hero-lead">
      Inspect every production-grade scenario across technology, data, infrastructure, security, and product. Discover the problem statement, technical challenge, and required deliverables before you enroll.
    </p>
    <div class="hub-hero-actions">
      <a class="btn btn-primary" href="/internships/">Choose Domain &amp; Enroll</a>
      <a class="btn btn-secondary" href="/project-based-internships/">Read Engineering Methodology</a>
    </div>
    <div class="hub-hero-badges">
      <span class="hub-badge">✓ 32 Production Problem Briefs</span>
      <span class="hub-badge">✓ Explicit Architectural Rubrics</span>
      <span class="hub-badge">✓ Real Tooling &amp; Frameworks</span>
      <span class="hub-badge">✓ Public Portfolio Outputs</span>
    </div>
  </div>
</header>

<section class="section hub-project-directory-section" aria-label="Internship Projects Directory">
  <div class="section-head text-center">
    <div class="eyebrow">Project Specifications Directory</div>
    <h2>Assigned Projects for All 32 Domains</h2>
    <p class="lead">Every project is tied to an authentic engineering problem scenario, defined architectural requirements, and evaluated deliverables.</p>
  </div>

  <div class="hub-projects-directory-grid">
    ${domains.map((d, idx) => {
      const slug = d[1];
      const domainName = d[0];
      const num = String(idx + 1).padStart(2, '0');
      const project = (typeof getProjectForDomain === 'function' ? getProjectForDomain(domainName) : null) || 
                      (PROJECT_CATALOGUE.find(p => p.domain.toLowerCase() === domainName.toLowerCase())) ||
                      { title: `${domainName} Project`, context: d[2], objective: d[2], inputs: 'Standard specifications', outputs: 'Complete implementation and README', tests: 'Functional and unit tests' };
      const categoryName = (typeof DOMAIN_SEARCH_METADATA !== 'undefined' && DOMAIN_SEARCH_METADATA[slug]?.categoryName) || 'Engineering';

      return `
      <article class="hub-project-item-card" id="project-${slug}">
        <div class="proj-card-top">
          <span class="proj-num">#${num}</span>
          <span class="proj-cat-badge">${esc(categoryName)}</span>
        </div>
        <h3 class="proj-title">${esc(project.title)}</h3>
        <div class="proj-domain-tag">Internship Track: <strong>${esc(domainName)}</strong></div>
        
        <div class="proj-brief-box">
          <p class="proj-problem"><strong>Business Context:</strong> ${esc(project.context)}</p>
          <p class="proj-challenge"><strong>Core Objective:</strong> ${esc(project.objective)}</p>
        </div>

        <div class="proj-meta-group">
          <div class="proj-deliverables">
            <span class="deliv-label">Input / Data Context:</span>
            <span class="deliv-text">${esc(project.inputs)}</span>
          </div>
          <div class="proj-deliverables">
            <span class="deliv-label">Evaluated Output:</span>
            <span class="deliv-text">${esc(project.outputs)}</span>
          </div>
        </div>

        <div class="proj-card-footer">
          <a class="btn btn-primary proj-cta-btn" href="/internships/${slug}/">
            View Full ${esc(domainName)} Specification &rarr;
          </a>
        </div>
      </article>`;
    }).join('')}
  </div>
</section>

${renderFaq([
  ['How does /internship-projects/ differ from /internships/?', '/internships/ is our primary career domain directory designed to help students choose between professional fields. /internship-projects/ is an architectural discovery directory where students can inspect the exact technical tasks, problem scenarios, and code deliverables for all 32 projects.'],
  ['Are these real projects or simulated quizzes?', 'Every project is a real engineering task requiring source code, configurations, database integration, test suites, and documentation. You build the software in your local environment and deploy it.'],
  ['Can I use these projects in my university final-year viva or seminar?', 'Yes. Many students submit their HireeBridge project documentation and GitHub repository as their academic internship or capstone project submission.'],
  ['What if I want to switch projects after enrolling?', 'If you wish to switch tracks before submitting your work, contact support and our team can adjust your assigned domain in your dashboard.'],
  ['How long do I have to finish the project?', 'HireeBridge projects are self-paced. Most learners complete their implementation and documentation within 4 to 8 weeks, but your dashboard access remains active so you can complete the work around your university exams.']
])}

<section class="section hub-cta-section">
  <div class="hub-cta-card">
    <h2>Select Your Project and Start Engineering Today.</h2>
    <p>Get your assigned problem statement, local setup instructions, and reviewer evaluation.</p>
    <div class="hub-cta-buttons">
      <a class="btn btn-primary" href="/internships/">Select Your Domain Track</a>
      <a class="btn btn-ghost" href="/internship-certificate/">Read Credential Details</a>
    </div>
  </div>
</section>
</main>`;

  return layout({
    title: '32 Internship Projects | Production Technical Specifications | HireeBridge',
    description: 'Explore 32 assigned real-world internship projects across AI, software engineering, cloud, security, design, and product. Inspect problem scenarios, tech stacks, and deliverables.',
    active: '/internship-projects/',
    session,
    currency: geo?.currency || 'INR',
    extraStylesheets: ['/css/topical-hubs.css'],
    pageJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://hireebridge.com/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Internship Projects', 'item': 'https://hireebridge.com/internship-projects/' }
      ]
    },
    content
  });
}

// ============================================================================
// 410 GONE RETIRED BLOG PAGE
// ============================================================================
function retiredBlogPage({ layout, session, slug }) {
  const content = `<main class="hub-page hub-retired">
<section class="page-hero">
  <div class="eyebrow" style="background:#fef2f2; color:#b91c1c; border-color:#fecaca;">Content Architecture Notice &middot; HTTP 410</div>
  <h1>This article has been permanently retired.</h1>
  <p class="lead">
    In accordance with our people-first content quality standards, HireeBridge has retired legacy repetitive blog guides in favor of comprehensive project-based landing pages and topical hubs.
  </p>
</section>

<section class="section hub-retired-section" style="max-width:800px; margin:0 auto; padding:0 16px 60px;">
  <div class="retired-card" style="background:white; border:1px solid var(--line); border-radius:20px; padding:36px; box-shadow:var(--shadow);">
    <h2 style="font:800 22px Manrope; margin:0 0 14px;">Where to find what you are looking for:</h2>
    <p style="color:var(--muted); line-height:1.6; margin-bottom:24px;">
      The URL you requested (<code>/blog/${esc(slug)}</code>) no longer exists. All relevant information regarding technical tracks, project evidence, credentials, and verification has been reorganized into our primary hubs:
    </p>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-bottom:30px;">
      <a href="/internships/" style="display:block; padding:18px; border:1px solid var(--line); border-radius:14px; text-decoration:none; color:var(--ink); background:#fafcfd;">
        <strong style="color:#0d6e6e; display:block; margin-bottom:4px;">Domain Directory &rarr;</strong>
        <span style="font-size:13px; color:var(--muted);">Explore all 32 specialized technical internship tracks.</span>
      </a>
      <a href="/project-based-internships/" style="display:block; padding:18px; border:1px solid var(--line); border-radius:14px; text-decoration:none; color:var(--ink); background:#fafcfd;">
        <strong style="color:#0d6e6e; display:block; margin-bottom:4px;">Project-Based Model &rarr;</strong>
        <span style="font-size:13px; color:var(--muted);">Learn about hands-on deliverables and evidence.</span>
      </a>
      <a href="/internship-certificate/" style="display:block; padding:18px; border:1px solid var(--line); border-radius:14px; text-decoration:none; color:var(--ink); background:#fafcfd;">
        <strong style="color:#0d6e6e; display:block; margin-bottom:4px;">Credential &amp; Verification &rarr;</strong>
        <span style="font-size:13px; color:var(--muted);">Everything about GreyRocks credentials and QR check.</span>
      </a>
      <a href="/internship-projects/" style="display:block; padding:18px; border:1px solid var(--line); border-radius:14px; text-decoration:none; color:var(--ink); background:#fafcfd;">
        <strong style="color:#0d6e6e; display:block; margin-bottom:4px;">Project Directory &rarr;</strong>
        <span style="font-size:13px; color:var(--muted);">Inspect the 32 real-world assigned engineering challenges.</span>
      </a>
    </div>

    <div style="text-align:center;">
      <a class="btn btn-primary" href="/internships/">Explore All Internship Domains</a>
    </div>
  </div>
</section>
</main>`;

  return layout({
    title: 'Article Retired (HTTP 410) | HireeBridge',
    description: 'This legacy blog article has been permanently retired in favor of comprehensive project landing pages and topical hubs.',
    active: `/blog/${slug}`,
    session,
    noindex: true,
    extraStylesheets: ['/css/topical-hubs.css'],
    content
  });
}

module.exports = {
  hubSwitcher,
  virtualInternshipsPage,
  projectBasedInternshipsPage,
  internshipCertificatePage,
  internshipProjectsPage,
  retiredBlogPage
};
