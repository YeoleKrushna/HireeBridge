"use strict";

const pmDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Data-Driven Product Management Decision Cycle</title>
  <desc id="visual-desc">Analytical progression from onboarding funnel drop-off audit and cohort retention analysis to RICE prioritization, A/B experiment specification with guardrail metrics, and executive roadmap strategy memo.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">FUNNEL AUDIT</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Drop-Off Data</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">activation drop</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">COHORT EVIDENCE</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Retention Curve</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">behavior trends</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">PRIORITIZATION</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">RICE Matrix</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">impact vs effort</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">EXPERIMENT</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">A/B Test Spec</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">hypothesis design</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">GUARDRAIL METRICS</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Safety Checks</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">churn &amp; trade-offs</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">PRODUCT MEMO</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Executive Roadmap</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">decision document</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "product-management",
  name: "Product Management",
  primaryKeyword: "product management online internship with certificate",
  accent: "#a14f35",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Product Analytics & Growth Case - Define an analytics-backed product problem and recommend a measurable experiment.",
    deliverables: [
      "Product analytics audit diagnosing user onboarding funnel drop-offs and retention cohort trends",
      "Opportunity backlog evaluated and ranked using the quantitative RICE prioritization framework",
      "Comprehensive A/B experiment specification containing hypothesis, primary metrics, and guardrails",
      "Sample size, statistical significance, and minimum detectable effect (MDE) calculation plan",
      "Executive product decision memo outlining trade-offs, rollout milestones, and roadmap recommendations",
    ],
    taskOutline: [
      "Audit product user funnels and retention cohort data to isolate high-friction drop-off milestones.",
      "Synthesize analytics evidence into clear user problem statements and opportunity hypotheses.",
      "Score competing product initiatives using the RICE framework (Reach, Impact, Confidence, Effort).",
      "Design a controlled A/B experiment specifying primary success metrics and protective guardrail metrics.",
      "Author an executive product decision memo detailing operational trade-offs and post-experiment roadmaps.",
    ],
    validation:
      "Reconcile funnel denominators, validate cohort definitions, and check experiment metric calculations.",
    toolsExpected:
      "Mixpanel/Amplitude concepts, Excel/Sheets for RICE scoring, A/B test calculators, PRD templates, and decision memo frameworks.",
  },
  diagram: pmDiagram,
  content: {
    h1: "Define Growth Experiments in a Product Management Internship Project",
    summary:
      "This product management online internship with certificate is a fee-based, project-based internship programme that focuses on data-driven product strategy and experimentation. You diagnose user funnel friction points, evaluate opportunities using the RICE prioritization framework, design a rigorous A/B experiment with primary and guardrail metrics, and author an executive product decision memo.",
    forYou: [
      "You want to master data-driven product management: moving from telemetry analytics to structured product decisions.",
      "You appreciate systematic prioritization frameworks like RICE rather than building features based on executive intuition.",
      "You want to build a portfolio case study featuring funnel analytics, A/B experiment design, and an executive product memo.",
    ],
    notForYou: [
      "You only want to design UI graphics; our UI/UX Design programme focuses directly on Figma and visual design systems.",
      "You believe product management is about declaring personal feature ideas without backing them with quantitative evidence.",
      "You expect to build features without calculating trade-offs, guardrail metrics, or engineering feasibility costs.",
    ],
    buildIntro:
      "Great product managers do not simply collect feature requests; they discover why users struggle, quantify the business opportunity, prioritize ruthlessly, and design measurable experiments. In this Product Management project, you analyze a realistic product analytics case study. You examine user drop-off across an onboarding and activation funnel, identify the root cause of churn, rank candidate solutions using the RICE framework, design a controlled A/B experiment with protective guardrails, and write a persuasive product decision memo for cross-functional stakeholders.",
    projectNarrative: [
      "Data-driven product inquiry begins by auditing the user funnel. Rather than assuming what users want, you analyze event analytics tracking user progression from signup through activation, core feature usage, and 30-day retention. You calculate stage-by-stage drop-off percentages, uncover cohort anomalies, and identify the single most critical friction point (such as an unguided workspace setup step) where the majority of potential active users are lost.",
      "Opportunity framing turns raw metrics into actionable problem statements. You state the user problem from the customer's perspective, identify the underlying psychological or technical barrier, and assemble a prioritized backlog of potential solutions. You evaluate whether the issue stems from poor discovery, excessive cognitive friction, or a lack of immediate value demonstration.",
      "Prioritization requires structured decision frameworks. With limited engineering resources, a team cannot build every good idea. You apply the RICE framework, scoring each candidate solution across Reach (how many users are impacted), Impact (the degree of improvement), Confidence (how certain you are in the data), and Effort (engineering weeks required). This quantitative scoring prevents team bias and highlights the single highest-leverage product initiative.",
      "Experimentation design provides empirical validation. You author a formal A/B experiment specification. You formulate an explicit test hypothesis, define the primary success metric (such as 7-day feature retention), and establish protective guardrail metrics (such as support ticket volume and signup completion rates) to ensure the intervention does not cause unintended harm. Your final deliverable is an executive product decision memo outlining the experiment's rationale, rollout criteria, and subsequent roadmap iterations.",
    ],
    narrativeHeading: "From funnel drop-off analytics to prioritized experimentation and decision memos",
    evidenceNotes: [
      "Funnel drop-off analytics audit with reconciled step-by-step conversion percentages.",
      "Cohort retention analysis tables comparing user engagement across 7-day and 30-day windows.",
      "Documented RICE prioritization matrix scoring candidate product features with justified rationales.",
      "Formal A/B experiment specification document including hypothesis, primary metrics, and guardrails.",
      "Executive product decision memo outlining resource trade-offs, launch criteria, and product roadmap recommendations.",
    ],
    progression: [
      [
        "Audit Funnel",
        "Analyze event tracking logs to identify critical user drop-off points between signup and activation.",
      ],
      [
        "Frame Problem",
        "Formulate evidence-based problem statements and document user barriers behind observed friction.",
      ],
      [
        "Prioritize (RICE)",
        "Evaluate competing product proposals using quantitative Reach, Impact, Confidence, and Effort scores.",
      ],
      [
        "Design Experiment",
        "Construct an A/B test specification complete with sample size estimates, primary KPIs, and guardrail metrics.",
      ],
      [
        "Author Memo",
        "Synthesize quantitative findings and experiment rollout milestones into an executive decision memo.",
      ],
    ],
    selfCheck: [
      "Can you explain the mathematical difference between user conversion rate and cohort retention rate?",
      "Do you know how to calculate RICE scores and explain why Effort sits in the denominator?",
      "Can you articulate why guardrail metrics are essential to protect product health during A/B tests?",
      "Are you prepared to defend why your proposed feature was chosen over other popular feature requests?",
      "Can you write a concise product decision memo that a VP of Engineering and a Head of Product can review in five minutes?",
    ],
    skills: [
      {
        group: "Product Analytics & Funnels",
        items: [
          ["Funnel Drop-Off Analysis", "Deconstruct user activation telemetry to identify high-leverage friction milestones."],
          ["Cohort Retention Analysis", "Track user engagement curves over daily, weekly, and monthly intervals."],
          ["Event Taxonomy Design", "Define tracking schemas for core activation and feature engagement events."],
        ],
      },
      {
        group: "Prioritization & Strategy",
        items: [
          ["RICE Prioritization Framework", "Quantitatively score opportunities across Reach, Impact, Confidence, and Effort."],
          ["Opportunity Solution Trees", "Map strategic product objectives to validated user friction opportunities."],
          ["Trade-Off Analysis", "Evaluate engineering complexity against measurable business value and user impact."],
        ],
      },
      {
        group: "Experimentation & Communication",
        items: [
          ["A/B Experiment Specification", "Author formal test hypotheses, sample size plans, and measurement windows."],
          ["Guardrail Metric Selection", "Establish negative constraints to prevent growth experiments from degrading core trust."],
          ["Executive Product Memos", "Draft clear, structured strategic memos synthesizing data into executive action plans."],
        ],
      },
    ],
    links: [
      ["Reforge Product Management Guides", "https://www.reforge.com/blog"],
      ["Amplitude Product Analytics Playbook", "https://amplitude.com/mastering-retention"],
      ["Intercom on Product Management", "https://www.intercom.com/books/product-management"],
    ],
    mistakes: [
      [
        "Designing features without quantitative funnel drop-off evidence",
        "Never propose a feature solution before validating where and why users are currently failing in the existing product.",
      ],
      [
        "Treating RICE scores as unquestioned absolute truth",
        "Use RICE as a structured decision tool to facilitate discussion, documenting the data assumptions behind your Confidence scores.",
      ],
      [
        "Launching A/B tests without protective guardrail metrics",
        "An experiment that increases clicks but skyrockets user unsubscribes is a failure; always monitor negative guardrails.",
      ],
      [
        "Conflating feature outputs with measurable business outcomes",
        "Shipping a feature is merely an output; the outcome is the measured shift in user activation, retention, or efficiency.",
      ],
      [
        "Writing excessively long PRDs that nobody reads",
        "Keep product decision memos concise, structured, and focused on the core problem, evidence, test plan, and trade-offs.",
      ],
    ],
    cvPatterns: [
      "Conducted a comprehensive product analytics audit on an onboarding funnel of [number] users, identifying a [percentage]% activation drop-off.",
      "Prioritized a backlog of [number] product growth opportunities using the RICE framework to optimize engineering resource allocation.",
      "Authored a rigorous A/B experiment specification targeting [metric], incorporating statistical power calculations and guardrail metrics.",
      "Delivered an executive product decision memo defining success criteria, launch phases, and roadmap milestones for [feature name].",
      "Analyzed cohort retention curves across [number] segments, establishing new baseline definitions for active user engagement.",
    ],
    college: [
      "Confirm with your academic department that a product analytics, growth experimentation, and product strategy case study meets internship requirements.",
      "Submit the official project brief detailing funnel analysis, RICE prioritization, A/B test design, and decision memo milestones.",
      "Include funnel conversion diagrams, cohort retention heatmaps, RICE scoring sheets, and the final decision memo in your report.",
      "Provide accessible documentation of your experiment calculations and product specifications in a clean repository or document portfolio.",
      "Prepare a product review presentation showcasing your data evidence, feature trade-offs, and rollout roadmap for your faculty panel.",
    ],
    credential:
      "GreyRocks manages the evaluation and formal credential verification infrastructure for HireeBridge programmes. Programme fees grant access to the product case study brief, analytics telemetry datasets, and evaluation rubrics; they do not automatically issue a certificate upon payment. To qualify for credentialing, you submit your completed funnel analysis report, RICE scoring matrix, A/B experiment specification, and executive product decision memo. A senior product management evaluator reviews your metric definitions, prioritization logic, and strategic clarity. Approved projects receive an authentic credential with an unalterable ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Do I need to know how to code to complete this Product Management internship?",
        "No coding is required. The project focuses on product analytics, metric formulation, quantitative prioritization (RICE), experiment design, and executive communication. You work with analytics spreadsheets, calculators, and product memo documents.",
      ],
      [
        "What specific product problem will I analyze?",
        "You analyze a realistic SaaS onboarding and activation funnel case study where a significant percentage of newly registered users drop off before experiencing the product's core value proposition.",
      ],
      [
        "What is the RICE framework and why is it used?",
        "RICE is an industry-standard prioritization model that scores candidate projects using (Reach × Impact × Confidence) / Effort. It provides a transparent, objective way to rank product ideas based on expected ROI.",
      ],
      [
        "What is a guardrail metric in product experimentation?",
        "A guardrail metric is an indicator tracked during an A/B test to ensure the experimental feature does not cause harm. For example, if you test a new notification prompt to increase activation, a guardrail metric ensures app uninstalls or spam reports do not spike.",
      ],
      [
        "How is this different from UI/UX Design?",
        "UI/UX Design focuses on qualitative user research, wireframing, component design systems, and Figma prototypes. Product Management focuses on business viability, analytics funnels, quantitative prioritization, trade-offs, and experiment design.",
      ],
      [
        "What format should the executive decision memo be in?",
        "The decision memo is a structured 2–4 page written document covering the background problem, quantitative data evidence, prioritized recommendation, experiment plan, operational trade-offs, and next roadmap milestones.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced study, guiding you through funnel analysis, opportunity framing, RICE scoring, A/B experiment design, and executive memo synthesis.",
      ],
      [
        "How do recruiters verify my Product Management certificate?",
        "Each certificate features an official GreyRocks credential ID and a scannable QR verification link that displays your verified project scope and completion record on the online verification portal.",
      ],
    ],
    sibling: {
      href: "/internships/ui-ux-design/",
      label: "Compare with UI/UX Design",
      difference:
        "Product Management centers on data funnels, RICE prioritization, A/B testing, and business decision memos, whereas UI/UX Design centers on user research, wireframes, accessible design systems, and Figma prototypes.",
    },
  },
};
