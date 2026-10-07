"use strict";

const ethicalHackingDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Ethical Hacking and Penetration Testing Workflow</title>
  <desc id="visual-desc">Structured penetration testing workflow starting with explicit scope and lab authorization, traffic interception via proxy, systematic vulnerability assessment of injection and auth flaws, CVSS impact scoring with reproducible proofs of concept, remediation guidance, and formal retesting against the local lab environment.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">AUTHORIZATION</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Bound Scope</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">local target only</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">RECON &amp; PROXY</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">HTTP Intercept</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">ZAP proxy analysis</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">EXPLOITATION</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">OWASP Top 10</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">SQLi, auth, IDOR</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">SCORING</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">CVSS v3.1</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">severity &amp; risk</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">REMEDIATION</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Fix Guidance</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">code-level patch</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">VERIFICATION</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Lab Retesting</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">confirm patch &amp; reset</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "ethical-hacking",
  factsKey: "ethical-hacking-pen-testing",
  catalogueDomain: "Ethical Hacking & Pen Testing",
  name: "Ethical Hacking & Pen Testing",
  primaryKeyword: "ethical hacking online internship with certificate",
  accent: "#1c6b58",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "OWASP Juice Shop Security Assessment - Assess a local OWASP Juice Shop instance, document reproducible findings, recommend fixes, and retest.",
    deliverables: [
      "Scope and test plan defining authorization boundaries, excluded actions, and target inventory",
      "Vulnerability findings report covering OWASP Top 10 issues with step-by-step reproduction proofs",
      "CVSS v3.1 severity scoring matrix with business impact explanations for technical and executive readers",
      "Actionable remediation guide detailing parameterized queries, secure session handling, and validation patches",
      "Retest verification log confirming vulnerability closure and complete lab environment reset notes",
    ],
    taskOutline: [
      "Configure a contained local OWASP Juice Shop container instance and establish written rules of engagement.",
      "Execute passive and active reconnaissance using an intercepting HTTP proxy (OWASP ZAP or Burp Suite Community).",
      "Identify, isolate, and verify common application vulnerabilities including SQL injection, broken authentication, and IDOR.",
      "Calculate Common Vulnerability Scoring System (CVSS v3.1) base scores and draft reproduction proofs of concept.",
      "Author engineering remediation recommendations, retest the patched endpoints, and document residual security posture.",
    ],
    validation:
      "Verify each target is local/in-scope and each reported finding has safe reproduction and retest steps.",
    toolsExpected:
      "OWASP Juice Shop (local Docker container), OWASP ZAP or Burp Suite Community, curl, browser developer tools, Python script fixtures, and markdown reporting templates.",
  },
  diagram: ethicalHackingDiagram,
  content: {
    h1: "Master Practical Vulnerability Assessment in an Ethical Hacking Internship Project",
    summary:
      "This ethical hacking online internship with certificate is a fee-based, project-based internship programme focusing on defensive security assessment, application penetration testing, and vulnerability remediation. You assess a contained local instance of OWASP Juice Shop, intercept and inspect HTTP traffic, uncover common application vulnerabilities including injection and authorization flaws, calculate CVSS scores, author reproducible security findings reports, and conduct retesting against patched endpoints.",
    forYou: [
      "You want practical offensive and defensive application security experience grounded in industry-standard OWASP methodologies.",
      "You want to master intercepting proxies, authenticated testing, and vulnerability reporting with reproducible proof of concepts.",
      "You want to build a security portfolio featuring a structured penetration test report, CVSS scoring, and code remediation advice.",
    ],
    notForYou: [
      "You want to launch unauthorized attacks against external networks; our programme is strictly restricted to authorized local labs.",
      "You want purely theoretical security memorization; this internship requires hands-on vulnerability reproduction and proxy analysis.",
      "You want automated scanner button-pushing; we emphasize manual verification, root-cause deduction, and practical fix guidance.",
    ],
    buildIntro:
      "In modern software engineering, security cannot be an afterthought bolted on after deployment. Ethical penetration testing is the disciplined practice of identifying, analyzing, and proving vulnerabilities before malicious actors exploit them. In this security project, you conduct an assessment against a local, contained instance of the OWASP Juice Shop web application. Operating under strict rules of engagement, you intercept HTTP traffic, identify structural authentication and input validation flaws, compute CVSS v3.1 scores, explain business risks, propose concrete code fixes, and perform retest verification.",
    projectNarrative: [
      "Every penetration test begins with scoping and authorization. Testing software without explicit written permission is both illegal and dangerous. You establish a formal Rules of Engagement document defining your local target (local container environment), testing windows, safe payload limits, and excluded activities such as denial-of-service or external network scanning. This ensures all assessment activities remain safe, legal, and reproducible.",
      "Next, you configure an intercepting proxy such as OWASP ZAP or Burp Suite Community to inspect and manipulate browser requests. You map application attack surfaces including login forms, user registration, review submissions, and shopping cart checkouts. Rather than relying on noisy automated scanners that generate false positives, you manually analyze HTTP headers, JWT tokens, cookies, and hidden form fields to uncover logical vulnerabilities.",
      "You systematically test for OWASP Top 10 vulnerabilities. You identify SQL injection in search inputs, broken authentication allowing credential stuffing or password reset bypasses, and Insecure Direct Object References (IDOR) enabling unauthorized access to customer order history. For each finding, you craft a minimal, non-destructive proof of concept (PoC) demonstrating exploitability without corrupting underlying application integrity.",
      "A penetration tester's most important output is the final assessment report. You calculate standardized CVSS v3.1 metrics (Vector Strings, Attack Complexity, Privileges Required, and Impact metrics) and draft clear executive summaries alongside detailed developer-focused remediation recommendations. Finally, you execute retest procedures to verify that recommended controls (such as prepared statements and strict token validation) eliminate the vulnerabilities.",
    ],
    narrativeHeading: "From scoped authorization and proxy interception to reproducible findings, CVSS scoring, and retesting",
    evidenceNotes: [
      "Scoped Rules of Engagement document specifying testing boundaries and local target parameters.",
      "HTTP request and response interception logs proving vulnerability reproduction.",
      "Formal penetration testing report with CVSS v3.1 vector calculations and severity ratings.",
      "Remediation patch guide illustrating before-and-after code snippets for input validation and authentication.",
      "Retest verification matrix demonstrating successful closure of identified security findings.",
    ],
    progression: [
      [
        "Scope & Engagement",
        "Set up the local OWASP Juice Shop lab container and draft formal rules of engagement defining boundaries.",
      ],
      [
        "Traffic Interception",
        "Configure OWASP ZAP or Burp proxy, establish CA certificate trusts, and map out application endpoints.",
      ],
      [
        "Vulnerability Discovery",
        "Test for SQL injection, broken object-level authorization (IDOR), and sensitive data exposure.",
      ],
      [
        "PoC & CVSS Scoring",
        "Build non-destructive proofs of concept and calculate standardized CVSS v3.1 base and impact metrics.",
      ],
      [
        "Report & Retest",
        "Author an executive-ready vulnerability report with developer code remediation and retest confirmations.",
      ],
    ],
    selfCheck: [
      "Can you explain why automated security scanners cannot replace manual proxy inspection and business logic analysis?",
      "Do you understand the difference between reflected XSS, stored XSS, and SQL injection?",
      "Can you calculate a CVSS v3.1 score and justify the Attack Vector and Privileges Required ratings?",
      "Do you know how to safely document an IDOR flaw without accessing real user data?",
      "Can you articulate the remediation steps needed to secure an application against parameter tampering?",
    ],
    skills: [
      {
        group: "Application Security & Assessment",
        items: [
          ["OWASP Top 10 Methodology", "Identify and analyze critical web flaws including injection, broken auth, and IDOR."],
          ["HTTP Interception & Proxying", "Intercept, inspect, and modify web requests using OWASP ZAP and Burp Suite."],
          ["Attack Surface Mapping", "Enumerate API endpoints, parameters, session cookies, and authentication flows."],
        ],
      },
      {
        group: "Vulnerability Analysis & Scoring",
        items: [
          ["Proof of Concept Authoring", "Construct safe, non-destructive reproduction steps for technical review."],
          ["CVSS v3.1 Severity Scoring", "Calculate base scores, attack complexity, and business impact vectors."],
          ["Authentication & Session Auditing", "Analyze JWT structure, token expiration, cookie attributes, and session fixation."],
        ],
      },
      {
        group: "Remediation & Technical Reporting",
        items: [
          ["Developer Remediation Guidance", "Specify parameterized queries, input sanitization, and authorization filters."],
          ["Executive & Technical Reporting", "Draft structured reports balancing high-level risk summaries with reproduction steps."],
          ["Retest Verification", "Execute structured retest procedures to validate that security patches resolve defects."],
        ],
      },
    ],
    links: [
      ["OWASP Top Ten Web Application Security Risks", "https://owasp.org/www-project-top-ten/"],
      ["CVSS v3.1 Specification and Calculator", "https://www.first.org/cvss/v3.1/specification-document"],
      ["OWASP Web Security Testing Guide", "https://owasp.org/www-project-web-security-testing-guide/"],
    ],
    mistakes: [
      [
        "Testing targets outside the authorized local scope",
        "Never scan, probe, or test any domain or network without written consent; keep all activities isolated to your local lab.",
      ],
      [
        "Submitting raw scanner dumps instead of curated findings",
        "Automated scanner outputs contain false positives; every finding must have manual reproduction steps and verified impact.",
      ],
      [
        "Using destructive payloads that corrupt application state",
        "Professional penetration testing demonstrates impact using minimal proofs of concept rather than damaging data tables.",
      ],
      [
        "Assigning arbitrary severity ratings without CVSS justification",
        "Always compute CVSS v3.1 scores with documented vectors to provide transparent, defensible risk ratings.",
      ],
      [
        "Omitting actionable remediation advice from the final report",
        "A finding without a practical fix is unhelpful; provide concrete code-level instructions for engineering teams.",
      ],
    ],
    cvPatterns: [
      "Conducted a scoped web application security assessment on OWASP Juice Shop, uncovering and documenting [number] vulnerabilities.",
      "Analyzed HTTP traffic flows using OWASP ZAP to identify SQL injection, IDOR, and authentication logic vulnerabilities.",
      "Calculated CVSS v3.1 severity scores and authored an executive-ready security assessment report with developer fixes.",
      "Authored actionable remediation guidance including parameterized queries and strict role-based access controls.",
      "Executed structured retest verification on patched endpoints, documenting vulnerability mitigation and residual risk.",
    ],
    college: [
      "Confirm with your department head that an Ethical Hacking and application security assessment meets internship standards.",
      "Submit the formal project brief detailing OWASP Juice Shop lab setup, rules of engagement, and findings report deliverables.",
      "Include sample sanitized vulnerability writeups, CVSS v3.1 scoring calculations, and remediation guidance in your report.",
      "Maintain a secure repository containing non-destructive test scripts, proxy logs, and markdown assessment reports.",
      "Prepare a technical presentation explaining how common web vulnerabilities function and how secure coding practices prevent them.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, security lab setup instructions, and evaluation rubric; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your formal penetration testing report, CVSS scoring breakdown, remediation recommendations, and retest evidence. A cybersecurity evaluator reviews your methodology, reproduction steps, technical clarity, and adherence to safe scoping. Approved submissions receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Is this ethical hacking project legal and safe?",
        "Yes, absolutely. The entire assessment is performed strictly against a local Docker container running the intentionally vulnerable OWASP Juice Shop project on your own machine. No external systems are ever scanned or touched.",
      ],
      [
        "Do I need advanced Linux or Kali Linux experience?",
        "No. You can complete the project on Windows, macOS, or Linux. The required tools (Docker, OWASP ZAP or Burp Suite Community, and a standard browser) run on all major desktop operating systems.",
      ],
      [
        "What is the difference between this programme and Cyber Security?",
        "Our Cyber Security programme focuses primarily on defensive triage, threat analysis, and phishing detection algorithms, whereas Ethical Hacking focuses on hands-on application penetration testing, vulnerability discovery, CVSS scoring, and retesting.",
      ],
      [
        "What is CVSS and why do I need it?",
        "The Common Vulnerability Scoring System (CVSS) is an open industry standard for assessing the severity of computer system security flaws. Using CVSS gives your reports credibility and enables engineering teams to prioritize fixes objectively.",
      ],
      [
        "Can I use automated vulnerability scanners like Nikto or Nessus?",
        "You may use scanners for initial reconnaissance, but your primary deliverables must feature manual verification, proxy-level analysis, and curated human-authored reproduction steps.",
      ],
      [
        "What happens if I cannot reproduce a vulnerability during retesting?",
        "That is often the expected goal of remediation. In your report, you document the original finding, the applied security fix, the retest procedure, and the confirmation that the vulnerability has been closed.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced progress: week 1 covers lab setup and scoping, week 2 covers proxy analysis and discovery, week 3 covers exploit proofs and CVSS scoring, and week 4 finalizes the report and retesting.",
      ],
      [
        "How do employers verify my ethical hacking credential?",
        "Each certificate includes a unique GreyRocks credential ID and QR verification code that links to an online verification portal displaying your verified security project completion record.",
      ],
    ],
    sibling: {
      href: "/internships/cyber-security/",
      label: "Compare with Cyber Security",
      difference:
        "Ethical Hacking focuses on active application penetration testing, vulnerability discovery, and CVSS scoring on local web labs, whereas Cyber Security emphasizes defensive threat analysis, phishing URL classification, and security operations triage.",
    },
  },
};
