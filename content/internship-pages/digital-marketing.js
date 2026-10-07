"use strict";

const digitalMarketingDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Digital Marketing Growth Analytics and Attribution Engine</title>
  <desc id="visual-desc">Pipeline illustrating multi-channel campaign ingestion across paid search, social, and display, data cleaning and attribution reconciliation, unit economic KPI formulation of CAC, ROAS, and conversion rates, an interactive scenario dashboard simulating budget shifts, and an executive recommendation memo with defensible allocation trade-offs.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">INGESTION</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Ad Channels</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">search &amp; social</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">RECONCILIATION</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Attribution</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">deduplicate sales</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">UNIT ECONOMICS</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">CAC &amp; ROAS</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">payback period</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">SIMULATION</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Scenario Tool</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">budget shifts</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">SEGMENTATION</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Cohort Analysis</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">device &amp; audience</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">EXECUTIVE MEMO</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Strategic Plan</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">allocation guidance</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "digital-marketing",
  factsKey: "digital-marketing-growth",
  catalogueDomain: "Digital Marketing & Growth",
  name: "Digital Marketing & Growth",
  primaryKeyword: "digital marketing online internship with certificate",
  accent: "#1d7874",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Digital Campaign Performance Analytics - Analyze campaign ROI, conversions, and audiences and present a budget scenario dashboard.",
    deliverables: [
      "Analysis dataset and structured SQL/Python data transformation queries cleaning multi-channel campaign spend",
      "Formal KPI definition document establishing mathematical formulas for CAC, ROAS, conversion rate, and blended CPA",
      "Interactive scenario simulation dashboard allowing stakeholders to test alternative budget allocation models",
      "Channel and audience segmentation breakdown analyzing performance across demographics, devices, and placements",
      "Executive growth recommendation report summarizing data-backed budget adjustments, risks, and strategic priorities",
    ],
    taskOutline: [
      "Ingest, clean, and validate multi-channel digital advertising data covering search, social, and display campaigns.",
      "Formulate standardized growth KPIs and establish attribution rules to prevent double-counting conversions.",
      "Segment performance data by audience cohort, device category, creative theme, and campaign objective.",
      "Build an interactive scenario model in Python, Power BI, or Streamlit to simulate returns under reallocated ad spend.",
      "Author an executive-level strategic memo detailing concrete recommendations and highlighting underlying data limitations.",
    ],
    validation:
      "Reconcile ROI/conversion calculations and verify filters, zero spend, and missing values.",
    toolsExpected:
      "Python (Pandas, NumPy) or SQL, Streamlit or Power BI / Tableau, Excel / Google Sheets, and statistical analysis packages.",
  },
  diagram: digitalMarketingDiagram,
  content: {
    h1: "Drive Measurable Growth in a Digital Marketing & Analytics Internship Project",
    summary:
      "This digital marketing online internship with certificate is a fee-based, project-based internship programme focusing on marketing analytics, growth unit economics, and data-driven budget allocation. You analyze realistic multi-channel ad spend datasets, calculate critical growth metrics including CAC, ROAS, and conversion rates, address multi-touch attribution challenges, build an interactive budget scenario dashboard, and author an executive recommendation memo.",
    forYou: [
      "You want practical marketing analytics experience based on real performance data, unit economics, and campaign attribution.",
      "You want to replace guesswork with quantitative modeling: calculating exact CAC, ROAS, and return on ad spend across channels.",
      "You want to build a growth portfolio featuring clean SQL/Python analysis, an interactive scenario dashboard, and executive strategy memos.",
    ],
    notForYou: [
      "You only want to make social media graphics or write viral captions; this programme focuses on data analytics and financial allocation.",
      "You expect vanity metrics like impressions and follower counts to drive strategy; our focus is on customer acquisition cost and revenue ROI.",
      "You believe marketing dashboards build themselves; this project requires structuring data models, calculating metrics, and testing assumptions.",
    ],
    buildIntro:
      "Modern marketing is a rigorous analytical discipline driven by data, experimentation, and unit economics. Companies invest massive advertising budgets across search, paid social, display, and affiliate channels; marketing leaders must prove which channels deliver profitable customers. In this digital marketing analytics project, you take on the role of a growth marketing analyst evaluating multi-channel campaign spend. You clean messy campaign records, formulate core acquisition KPIs, analyze audience segments, build a budget simulation tool, and deliver an executive-level allocation recommendation.",
    projectNarrative: [
      "Performance marketing begins with clean, trustworthy data. Ad platforms often report conflicting metrics where Google Ads and Meta Ads may both claim credit for the same conversion, leading to duplicate revenue attribution. You ingest multi-channel campaign datasets, clean inconsistent campaign naming conventions, handle missing UTM parameters, and address zero-spend edge cases. You apply attribution rules to reconcile reported conversions against actual unique sales orders.",
      "Next, you establish a rigorous unit economics framework. Rather than relying on superficial metrics like clicks or impressions, you compute foundational acquisition indicators: Customer Acquisition Cost (CAC), Return on Ad Spend (ROAS), Cost Per Acquisition (CPA), and Click-Through Rate (CTR). You document the exact mathematical formulas, ensuring consistent definitions across paid search, sponsored social, and programmatic display.",
      "High-level averages often hide critical channel inefficiencies. You perform granular cohort and audience segmentation, breaking down performance by demographic groups, device types (mobile vs. desktop), geographic regions, and creative variants. This analysis uncovers that while a specific social campaign boasts a low cost-per-click, its downstream checkout conversion rate is poor, revealing hidden ad budget waste.",
      "Strategic decision-making requires modeling future scenarios. You build an interactive dashboard (using Streamlit, Power BI, or Python) that allows marketing managers to simulate budget reallocations. By adjusting spend sliders between high-performing search campaigns and brand-building video ads, the dashboard calculates projected conversions and blended CAC under diminishing returns assumptions. Finally, you write a concise executive memo presenting your recommended allocation plan.",
    ],
    narrativeHeading: "From multi-channel data reconciliation and unit economics to scenario modeling and executive strategy",
    evidenceNotes: [
      "Data transformation scripts (SQL queries or Python Pandas notebooks) demonstrating data cleaning and deduplication.",
      "Documented KPI definition dictionary detailing mathematical calculations for CAC, ROAS, and attribution metrics.",
      "Granular cohort and audience segmentation analysis highlighting performance variance across channels.",
      "Interactive scenario simulation tool or dashboard enabling dynamic budget reallocation modeling.",
      "Executive recommendation memorandum summarizing data-driven spend shifts and strategic business risks.",
    ],
    progression: [
      [
        "Data Ingestion & Cleaning",
        "Ingest multi-channel campaign data, handle missing values, and reconcile conflicting attribution records.",
      ],
      [
        "KPI Formulation",
        "Calculate core growth metrics including CAC, ROAS, CPA, conversion rates, and profit margins.",
      ],
      [
        "Audience Segmentation",
        "Break down performance across device types, demographics, creative themes, and geographic cohorts.",
      ],
      [
        "Scenario Dashboard",
        "Build an interactive simulation dashboard modeling projected revenue under reallocated ad budgets.",
      ],
      [
        "Executive Strategy",
        "Author a concise strategic memorandum presenting data-backed budget adjustments and risk guardrails.",
      ],
    ],
    selfCheck: [
      "Can you explain why reported conversions from individual ad platforms often sum to more than 100% of actual sales?",
      "Do you know the difference between first-click, last-click, and linear attribution models?",
      "Can you calculate CAC and ROAS given total advertising spend, visitor counts, and total generated revenue?",
      "How do you account for diminishing marginal returns when increasing ad spend in a saturated channel?",
      "Can you clearly communicate quantitative marketing data to executive stakeholders without unnecessary jargon?",
    ],
    skills: [
      {
        group: "Growth Analytics & Data Processing",
        items: [
          ["Multi-Channel Data Reconciliation", "Clean, join, and standardize disparate ad platform data streams using SQL and Python."],
          ["Campaign Attribution Modeling", "Analyze touchpoints to reconcile conversion overlaps between search, social, and display."],
          ["Cohort & Segment Analysis", "Identify top-performing customer cohorts across demographic and behavioral slices."],
        ],
      },
      {
        group: "Unit Economics & Financial Modeling",
        items: [
          ["CAC, CPA & ROAS Optimization", "Formulate unit economic metrics measuring true commercial customer acquisition efficiency."],
          ["Diminishing Returns Modeling", "Model how incremental ad spend affects marginal acquisition costs across channels."],
          ["Budget Scenario Simulation", "Construct mathematical models simulating future revenue under alternative budget splits."],
        ],
      },
      {
        group: "Visualization & Strategic Communication",
        items: [
          ["Interactive Dashboard Design", "Build responsive growth dashboards featuring dynamic sliders, filters, and KPI cards."],
          ["Executive Memorandum Writing", "Draft clear strategic proposals with concrete allocation recommendations and risk caveats."],
          ["Data Integrity & Validation", "Audit marketing data pipelines to flag anomaly spikes, zero spend, and missing tracking tags."],
        ],
      },
    ],
    links: [
      ["Google Analytics 4 Attribution Concepts", "https://support.google.com/analytics/answer/10596866"],
      ["Reforge Growth Marketing & Metrics Guide", "https://www.reforge.com/blog/growth-metrics"],
      ["Streamlit Documentation for Analytics Dashboards", "https://docs.streamlit.io/"],
    ],
    mistakes: [
      [
        "Relying on vanity metrics rather than revenue outcomes",
        "High impressions and low cost-per-click mean nothing if users do not convert into paying customers; focus on CAC and ROAS.",
      ],
      [
        "Double-counting conversions across ad platforms",
        "Both Meta and Google take credit for touchpoints; always reconcile ad-reported metrics with source-of-truth backend sales data.",
      ],
      [
        "Assuming linear returns when scaling budget",
        "Doubling ad spend in a niche audience increases marginal CAC due to audience saturation; incorporate diminishing returns.",
      ],
      [
        "Ignoring zero-spend or outlier tracking errors",
        "Tracking glitches can produce artificial $0 conversions or 1000% spikes; clean and validate data before modeling.",
      ],
      [
        "Writing an executive report filled with unstructured data tables",
        "Business leaders need actionable strategic guidance; highlight top findings, trade-offs, and clear spend shift recommendations.",
      ],
    ],
    cvPatterns: [
      "Analyzed multi-channel digital advertising campaigns across search, social, and display, reconciling conversion attribution.",
      "Formulated a comprehensive growth KPI framework calculating CAC, ROAS, and CPA across [number] audience segments.",
      "Engineered an interactive budget simulation dashboard modeling revenue projections under alternative channel allocations.",
      "Identified underperforming campaign cohorts, providing data-backed recommendations that reduced ad waste by [percentage].",
      "Authored an executive growth strategy memo balancing performance optimization with long-term brand building trade-offs.",
    ],
    college: [
      "Confirm with your academic supervisor that a Digital Marketing analytics and quantitative growth project meets internship requirements.",
      "Submit the official project brief outlining multi-channel data ingestion, KPI formulation, and scenario dashboard deliverables.",
      "Include data pipeline scripts, KPI dictionaries, dashboard screenshots, and the executive recommendation memo in your report.",
      "Provide public GitHub or portfolio repository access containing data transformation code, models, and analytical notes.",
      "Prepare a technical demonstration demonstrating live scenario simulation, metric adjustments, and strategic insights.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, curated campaign datasets, and evaluation rubric; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your data processing code, KPI definition dictionary, interactive dashboard, and completed executive recommendation memo. A marketing analytics evaluator reviews your calculation precision, attribution logic, scenario modeling rigor, and strategic communication clarity. Approved submissions receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Do I need to spend real money on ad campaigns for this project?",
        "No. You do not spend any personal money on ads. We provide rich, realistic multi-channel campaign datasets containing real-world performance patterns, spend figures, conversion histories, and tracking anomalies.",
      ],
      [
        "Can I build the dashboard using tools other than Python?",
        "Yes! You can build your scenario dashboard using Python (Streamlit or Dash), Power BI, Tableau, Metabase, or advanced interactive Excel/Google Sheets workbooks, provided the calculations are dynamic and transparent.",
      ],
      [
        "What is the difference between this programme and Business Analytics?",
        "Business Analytics focuses on enterprise dimensional data warehousing, star schemas, HR/operational attrition metrics, and DAX modeling. Digital Marketing & Growth focuses on customer acquisition funnels, digital advertising attribution, CAC/ROAS, and growth budgeting.",
      ],
      [
        "Why is attribution modeling so challenging in digital marketing?",
        "Customers rarely purchase on their first visit; they may see a social ad, search Google later, and click an email discount. Attributing credit fairly across these touchpoints requires understanding multi-touch models and reconciling platform overlap.",
      ],
      [
        "What programming skills are needed?",
        "Basic knowledge of SQL or Python (Pandas) is beneficial for manipulating datasets. The project materials provide step-by-step guidance on calculating growth metrics and structuring analysis workflows.",
      ],
      [
        "How do I simulate diminishing marginal returns?",
        "You apply mathematical logarithmic or power functions to ad spend, reflecting that as spend increases in a fixed audience pool, incremental conversion rates decrease and marginal CAC rises.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced progress: week 1 covers data cleaning and ingestion, week 2 covers KPI calculation and attribution, week 3 covers dashboard building, and week 4 finalizes the executive memo and verification.",
      ],
      [
        "How do employers verify my digital marketing analytics certificate?",
        "Each certificate includes a unique GreyRocks credential ID and QR verification code that links to an online verification portal displaying your verified marketing analytics project scope and evaluation assessment.",
      ],
    ],
    sibling: {
      href: "/internships/business-analytics/",
      label: "Compare with Business Analytics",
      difference:
        "Digital Marketing & Growth focuses on digital advertising channels, customer acquisition cost (CAC), ROAS, and budget allocation scenarios, whereas Business Analytics focuses on enterprise dimensional modeling, star schemas, and operational KPI dashboards.",
    },
  },
};
