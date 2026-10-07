"use strict";
module.exports = {
  pilot: true,
  slug: "data-analytics",
  name: "Data Analytics",
  primaryKeyword: "data analytics online internship with certificate",
  accent: "#1976a2",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "E-commerce Sales Analytics Dashboard - use SQL and an interactive dashboard to turn transaction data into reliable business KPIs and insights.",
    deliverables: [
      "Reviewed e-commerce data and quality notes",
      "SQL queries for defined business KPIs",
      "A KPI definition sheet",
      "An interactive dashboard",
      "A concise findings report",
    ],
    taskOutline: [
      "Inspect tables, keys, data types and quality issues in public or synthetic commerce data.",
      "Define revenue, orders, product and customer KPIs before writing SQL.",
      "Reconcile query totals to source records and handle null, date and filter edge cases.",
      "Build readable dashboard views for trends, products, categories and customer segments.",
      "Write findings that separate observed facts from hypotheses and follow-up questions.",
    ],
    validation:
      "Reconcile KPI totals to source data and verify date boundaries, filters, null handling and denominator definitions.",
  },
  content: {
    summary:
      "This fee-based, project-based educational programme uses an e-commerce sales dashboard to connect business questions with source tables, SQL, KPI definitions and visual explanation. You reconcile totals, test filters and write findings from observed transaction data. It is an analytics project, not predictive modelling or an exercise in inventing commercial results.",
    forYou: [
      "You want to translate questions about orders, revenue, products and customers into explicit calculations.",
      "You enjoy checking totals, definitions and edge cases before designing a dashboard.",
      "You can distinguish a measured pattern from a possible explanation that needs more evidence.",
    ],
    notForYou: [
      "You primarily want to train predictive models or build probability scores; the assigned work is descriptive and diagnostic analytics.",
      "You want a decorative dashboard without query evidence, KPI definitions or reconciliation.",
      "You expect employment, a stipend or guaranteed college credit from an educational programme.",
    ],
    buildIntro:
      "The assigned E-commerce Sales Analytics Dashboard starts with related order, product and customer records. Before choosing a chart, you need to understand the grain of every table: whether one row represents an order, line item, product or customer; which keys connect them; and how returns, discounts, missing categories or duplicate records affect a total. The dashboard should make those definitions inspectable.",
    progression: [
      [
        "Write the business questions",
        "Specify which decisions a revenue, order, product or customer view should inform and what period or population it covers.",
      ],
      [
        "Map tables and grain",
        "Document keys, row meaning, joins, data types, missing values and records that can multiply totals.",
      ],
      [
        "Define and reconcile KPIs",
        "Write plain-language formulas, implement them in SQL and compare results with controlled source checks.",
      ],
      [
        "Design the reading order",
        "Arrange overview, time trend, product and segment views so labels, units, filters and empty states remain clear.",
      ],
      [
        "Write qualified findings",
        "State what the data shows, note data-quality limits and separate hypotheses from conclusions.",
      ],
    ],
    skills: [
      {
        group: "Data questioning",
        items: [
          [
            "Metric definition",
            "Turn a business term into a formula, population, time window and exclusions.",
          ],
          [
            "Table grain",
            "Identify what one row means before joining or aggregating.",
          ],
          [
            "Quality review",
            "Find nulls, duplicates, invalid dates and category inconsistencies that affect interpretation.",
          ],
        ],
      },
      {
        group: "Query work",
        items: [
          [
            "SQL joins",
            "Connect related tables without silently multiplying measures.",
          ],
          [
            "Aggregation",
            "Calculate totals, rates and segments with explicit denominator rules.",
          ],
          [
            "Reconciliation",
            "Compare query results with source-level checks and known subsets.",
          ],
        ],
      },
      {
        group: "Communication",
        items: [
          [
            "Dashboard design",
            "Choose readable views and filters that match the stated questions.",
          ],
          [
            "Spreadsheet checks",
            "Use pivots or formulas as transparent spot checks where appropriate.",
          ],
          [
            "Finding notes",
            "Distinguish evidence, caveats, hypotheses and recommended follow-up questions.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Using revenue without defining it",
        "Gross item value, discounts, tax, shipping, cancelled orders and returns produce different totals. State the formula and exclusions.",
      ],
      [
        "Joining at incompatible grains",
        "Joining order totals to multiple line items can duplicate revenue. Check row counts and reconcile before and after each join.",
      ],
      [
        "Treating customers as rows",
        "One customer may place many orders. Use stable identifiers and define whether a metric counts people, orders or line items.",
      ],
      [
        "Letting filters change denominators silently",
        "A category or date filter can alter both numerator and comparison base. Show scope and test boundary dates.",
      ],
      [
        "Writing causes from correlations",
        "A sales decline by itself does not prove why it occurred. Present observed movement and label possible explanations as hypotheses.",
      ],
    ],
    cvPatterns: [
      "Defined and implemented [number] e-commerce KPIs in SQL with documented formulas and exclusion rules.",
      "Reconciled dashboard totals against [source/check] and resolved [data-quality issue] affecting aggregation.",
      "Modelled order, line-item, product and customer tables while preventing duplicate measures across joins.",
      "Built an interactive dashboard in [tool] with tested date, category and customer-segment filters.",
      "Presented evidence-based findings and separated observed transaction patterns from follow-up hypotheses.",
    ],
    selfCheck: [
      "Can you explain the grain and key of every source table?",
      "Have you defined revenue and order KPIs before building charts?",
      "Will you reconcile totals and test null, duplicate and boundary-date cases?",
      "Can a reader tell exactly which filters and date range are active?",
      "Will you label hypotheses instead of presenting them as established causes?",
    ],
    college: [
      "Ask whether a SQL-and-dashboard analytics project meets the applicable requirement.",
      "Give your T&P or placement cell the project title, outputs, validation checks and proposed evidence.",
      "Confirm duration, dates, report structure, supervision and signature expectations before payment.",
      "Keep query files, KPI definitions, reconciliation notes, dashboard exports and findings together.",
      "Review the official free AICTE internship portal if your institution requires a separately listed programme.",
    ],
    credential:
      "Access to the task does not itself create a certificate. Submit the SQL, KPI definitions, dashboard, reconciliation evidence and findings for explicit review. After approval, GreyRocks creates the certificate record with its unique credential ID and the QR destination used by the platform verification flow.",
    faqs: [
      [
        "What is the assigned Data Analytics project?",
        "The catalogue assigns an E-commerce Sales Analytics Dashboard built from documented transaction data, SQL, KPI definitions and findings.",
      ],
      [
        "Is predictive modelling required?",
        "No. This project concentrates on reliable descriptive and diagnostic analytics rather than forecasting or classification.",
      ],
      [
        "Which KPIs should be included?",
        "The catalogue names revenue, orders, products and customers; your definitions must explain formulas, populations and exclusions.",
      ],
      [
        "Why is table grain important?",
        "It prevents joins and aggregations from counting orders, line items or customers more than intended.",
      ],
      [
        "Can a spreadsheet be used?",
        "A spreadsheet can support transparent checks or analysis, while the assigned outputs still include SQL queries and an interactive dashboard.",
      ],
      [
        "How should findings be written?",
        "State measured patterns, data limits and follow-up questions; do not turn an association into an unsupported cause.",
      ],
      [
        "When is the credential created?",
        "Only after the project evidence is submitted and explicitly approved.",
      ],
      [
        "Does a college have to accept it?",
        "No. Check the institution’s rules and obtain confirmation before enrolling.",
      ],
    ],
    links: [
      [
        "PostgreSQL query documentation",
        "https://www.postgresql.org/docs/current/queries.html",
      ],
      [
        "Microsoft dashboard design guidance",
        "https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips",
      ],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/data-science/",
      label: "Compare the Data Science project",
      difference:
        "Data Science develops a time-aware predictive-maintenance model; Data Analytics answers commerce questions through SQL, reconciled KPIs and explanatory dashboards.",
    },
  },
};
