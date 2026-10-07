"use strict";

const businessDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Workforce Analytics Star Schema and Simulation Pipeline</title>
  <desc id="visual-desc">Enterprise HR data modeled into facts and dimensions, reconciled with DAX measures for employee turnover and retention, visualized in an interactive Power BI dashboard, simulated through what-if compensation models, and delivered via an executive memo.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">STAKEHOLDER</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Business Ask</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">attrition inquiry</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">DATA MODEL</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Star Schema</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">facts &amp; dimensions</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">MEASURES</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">DAX Metrics</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">attrition formulas</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">DASHBOARD</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Power BI Views</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">aggregate filters</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">SCENARIO MODELLING</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">What-If Simulation</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">compensation trends</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">DECISION MEMO</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Executive Summary</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">data-backed strategy</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "business-analytics",
  name: "Business Analytics",
  primaryKeyword: "business analytics online internship with certificate",
  accent: "#806d13",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Business Intelligence HR Dashboard - Model workforce data and communicate HR KPIs through a clear Power BI dashboard.",
    deliverables: [
      "Workforce data model with documented fact and dimension table relationships in Power BI",
      "Comprehensive KPI glossary defining exact mathematical formulas, denominators, and time windows",
      "Interactive multi-page Power BI dashboard featuring filtered headcount, attrition, and tenure analysis",
      "What-if scenario analysis model simulating retention interventions and budget impact",
      "Executive decision memo presenting strategic findings, limitations, and operational recommendations",
    ],
    taskOutline: [
      "Audit workforce records, profile missing attributes, and establish privacy-safe data aggregation boundaries.",
      "Design a relational star schema separating employee events from department, role, and calendar dimensions.",
      "Author DAX measures for headcount, annualized attrition rates, tenure distributions, and salary equity.",
      "Construct interactive dashboard views with departmental drill-downs and cross-filtering capabilities.",
      "Author an executive decision memo connecting quantitative KPI trends to actionable business recommendations.",
    ],
    validation:
      "Reconcile measures to source rows and check filters, missing values, and denominator definitions.",
    toolsExpected:
      "Power BI Desktop, DAX, Excel/CSV workforce datasets, star schema modeling, and business report authoring.",
  },
  diagram: businessDiagram,
  content: {
    h1: "Explain Workforce KPIs in a Business Analytics Internship Project",
    summary:
      "This business analytics online internship with certificate is a fee-based, project-based internship programme that focuses on executive business intelligence and decision modeling. You model enterprise workforce records in Power BI, author verified DAX measures, build interactive departmental dashboards, perform what-if scenario simulations, and communicate actionable retention strategies in an executive decision memo.",
    forYou: [
      "You want to bridge the gap between complex database records and senior executive business decisions.",
      "You value mathematical rigor in metrics: understanding why KPI denominators, time windows, and cohort filters must be explicitly defined.",
      "You want to build an end-to-end business intelligence portfolio project featuring Power BI modeling and strategic recommendation memos.",
    ],
    notForYou: [
      "You only want to write raw SQL queries for database administration; our Data Analytics programme focuses specifically on relational querying.",
      "You want to build predictive machine learning models; our Machine Learning or Data Science programmes are more suitable.",
      "You expect to build dashboards that expose individual confidential employee records; our project enforces aggregate privacy.",
    ],
    buildIntro:
      "Modern executives do not suffer from a lack of data; they suffer from a lack of clarity. In this Business Analytics project, you take on the role of a strategic analyst delivering an HR Business Intelligence solution. You model complex workforce records, define mathematically sound measures for attrition and compensation equity, design an interactive Power BI dashboard, and write an executive decision memo that translates visual trends into defensible corporate strategies.",
    projectNarrative: [
      "Business analytics begins with a stakeholder problem rather than a visualization tool. HR leadership needs to understand why certain technical departments experience elevated turnover and what organizational levers can improve retention. You start by examining workforce records, identifying data quality issues, and establishing a strict aggregate privacy rule: the dashboard must communicate systemic organizational patterns without exposing identifiable individual employee records.",
      "Data modeling is the foundation of dependable reporting. Rather than dumping a single flat spreadsheet into Power BI, you construct a dimensional star schema. You separate event transactions (such as hires, promotions, and exits) into a central fact table, linking it to dimension tables for organizational hierarchy, job grades, locations, and time. This structure ensures that all time-intelligence calculations calculate accurately across calendar years.",
      "Formulating DAX measures requires explicit mathematical definitions. A vague metric like 'attrition rate' can be calculated in multiple contradictory ways. You author formal DAX formulas that explicitly define the numerator (terminations during the period) and the denominator (average active headcount across that same period). You create synchronized measures for tenure quartiles, compensation benchmarks, and department turnover ratios, reconciling every calculation against raw source rows.",
      "Decision support culminates in the executive memo. A dashboard by itself does not make business decisions; an analyst must synthesize the evidence. You construct what-if scenario models exploring how compensation adjustments or career progression initiatives might impact turnover in critical departments. Your finished deliverable includes an executive briefing memo detailing observed findings, data limitations, and prioritized recommendations.",
    ],
    narrativeHeading: "From relational workforce data to defensible executive decision memos",
    evidenceNotes: [
      "Power BI .pbix file containing the dimensional star schema and verified table relationships.",
      "KPI dictionary detailing the mathematical formulas, DAX code, and business logic for all measures.",
      "Reconciliation spreadsheet validating DAX measure totals against raw source table counts.",
      "Multi-tab dashboard layout covering Executive Overview, Department Turnover, and Compensation Equity.",
      "Structured executive decision memo containing evidence-backed recommendations and risk analysis.",
    ],
    progression: [
      [
        "Frame Problem",
        "Define the executive business question, scope workforce metrics, and enforce aggregate employee privacy.",
      ],
      [
        "Model Data",
        "Construct a relational star schema linking fact tables with department, role, and calendar dimensions.",
      ],
      [
        "Author DAX",
        "Formulate mathematically verified measures for headcount, annualized attrition, and tenure distribution.",
      ],
      [
        "Visualize Views",
        "Build an interactive Power BI dashboard featuring dynamic drill-downs and cross-filtering controls.",
      ],
      [
        "Advise Leaders",
        "Author an executive decision memo presenting scenario models, data caveats, and strategic action plans.",
      ],
    ],
    selfCheck: [
      "Can you explain why average headcount is essential when calculating annualized attrition rates?",
      "Do you know the difference between a fact table and a dimension table in a star schema?",
      "Can you write a DAX measure that filters terminations within a specific rolling 12-month period?",
      "Are you prepared to explain how your dashboard protects sensitive individual employee compensation details?",
      "Can you translate a visual chart trend into three concrete, actionable corporate recommendations?",
    ],
    skills: [
      {
        group: "Dimensional Modeling & BI",
        items: [
          ["Star Schema Architecture", "Organize relational data models into normalized dimension tables and central fact tables."],
          ["Data Relationship Management", "Configure active and inactive relationships, cardinality, and cross-filter directions."],
          ["Data Hygiene & Profiling", "Audit missing entries, reconcile discrepancies, and document source data provenance."],
        ],
      },
      {
        group: "DAX & Business Metric Design",
        items: [
          ["Time Intelligence in DAX", "Calculate Year-to-Date, prior-period comparisons, and rolling retention metrics."],
          ["KPI Formulation", "Define unambiguous mathematical formulas for headcount, attrition, and tenure."],
          ["Measure Reconciliation", "Validate DAX calculations against source row counts to guarantee numerical integrity."],
        ],
      },
      {
        group: "Decision Support & Communication",
        items: [
          ["Executive Dashboard Layout", "Design clean, accessible Power BI views with intuitive filter cards and visual hierarchy."],
          ["What-If Scenario Modeling", "Build parameter-driven models to simulate the organizational impact of retention policies."],
          ["Executive Memo Writing", "Synthesize quantitative analytics into actionable, stakeholder-ready business memos."],
        ],
      },
    ],
    links: [
      ["Microsoft Power BI Guided Learning", "https://learn.microsoft.com/en-us/power-bi/guidance/"],
      ["DAX Guide & Reference", "https://dax.guide/"],
      ["Society for Human Resource Management (SHRM) Metric Standards", "https://www.shrm.org/topics/hr-metrics"],
    ],
    mistakes: [
      [
        "Calculating attrition rates without an explicit denominator definition",
        "Always document whether attrition uses starting headcount, ending headcount, or average period headcount to avoid distorted percentages.",
      ],
      [
        "Exposing individual employee records in public dashboards",
        "Aggregate employee data into cohorts and department summaries to uphold privacy and data compliance guidelines.",
      ],
      [
        "Building dashboards on flat, denormalized spreadsheets without a schema",
        "Always split flat datasets into dimensional star schemas in Power BI to ensure filter propagation and fast calculations.",
      ],
      [
        "Creating decorative charts that do not answer a business decision",
        "Every visualization must directly inform an operational question rather than merely filling whitespace.",
      ],
      [
        "Presenting findings as definitive proof without stating data caveats",
        "Always highlight dataset limitations, confounding variables, and unobserved factors in your executive memo.",
      ],
    ],
    cvPatterns: [
      "Engineered an executive HR Business Intelligence dashboard in Power BI, modeling workforce metrics across [number] employee records.",
      "Authored [number] DAX measures for annualized attrition, tenure distribution, and compensation equity in a star schema model.",
      "Reconciled business KPIs against raw database records, ensuring 100% numerical accuracy across multi-dimensional filters.",
      "Developed a what-if scenario model simulating the organizational impact of retention interventions across [number] departments.",
      "Delivered an executive decision memo translating quantitative turnover trends into actionable workforce recommendations.",
    ],
    college: [
      "Verify with your university department that a business intelligence and strategic decision modeling project satisfies internship criteria.",
      "Submit the official project brief outlining dimensional data modeling, DAX measure formulation, and executive reporting.",
      "Include data model relationship diagrams, DAX code snippets, dashboard screenshot walkthroughs, and the decision memo in your report.",
      "Maintain a project repository with your Power BI template, sample dataset documentation, and KPI definitions.",
      "Prepare a presentation demonstrating how your dashboard answers specific executive questions for your academic review panel.",
    ],
    credential:
      "GreyRocks provides the formal evaluation and credential verification infrastructure for HireeBridge programmes. Programme enrolment grants access to the project brief, workforce data specifications, and evaluation criteria; it does not confer a certificate upon payment. To obtain your credential, you submit your completed Power BI report, data reconciliation documentation, and executive decision memo. A technical business intelligence assessor reviews your star schema design, DAX formulas, and analytical clarity. Approved projects receive an authentic credential with an unalterable ID and QR verification destination on GreyRocks.",
    faqs: [
      [
        "What is the difference between Business Analytics and Data Analytics?",
        "Data Analytics focuses on exploratory querying, SQL transformations, and building reports. Business Analytics focuses on translating data into executive decisions: formulating business KPIs, dimensional modeling, what-if scenario analysis, and writing strategic guidance memos.",
      ],
      [
        "What software do I need to complete this project?",
        "You will use Power BI Desktop, which is free to download and use on Windows. If you use macOS or Linux, you can utilize Power BI on a virtual machine or build equivalent star-schema dashboards using Tableau Public or open-source Metabase.",
      ],
      [
        "Is real confidential employee data used in this project?",
        "No. You will work with cited public or synthetic workforce datasets containing anonymized employee records, ensuring compliance with data privacy standards.",
      ],
      [
        "Why is DAX measure reconciliation required?",
        "In corporate environments, dashboards that report conflicting numbers destroy executive trust. Reconciling your DAX measures against source row counts proves that your filter logic and math are 100% reliable.",
      ],
      [
        "What is an executive decision memo?",
        "An executive decision memo is a concise, professional written document that summarizes the key insights from your dashboard, outlines operational risks, and proposes 2–3 actionable business recommendations for leadership.",
      ],
      [
        "Can I complete this project without an enterprise Power BI license?",
        "Yes. The entire modeling, DAX authoring, and dashboard construction can be completed within the free standalone Power BI Desktop application.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced work, guiding you step-by-step from data auditing and dimensional modeling to dashboard design and executive memo authoring.",
      ],
      [
        "How can recruiters and placement cells verify my certificate?",
        "Each certificate features an official GreyRocks credential ID and a scannable QR verification link that displays your verified project scope on the online verification portal.",
      ],
    ],
    sibling: {
      href: "/internships/data-analytics/",
      label: "Compare with Data Analytics",
      difference:
        "Business Analytics focuses on executive decision memos, DAX metrics, and what-if scenario modeling, whereas Data Analytics focuses on SQL queries, revenue metrics, and transactional e-commerce reporting.",
    },
  },
};
