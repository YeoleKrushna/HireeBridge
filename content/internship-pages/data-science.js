"use strict";
module.exports = {
  pilot: true,
  slug: "data-science",
  name: "Data Science",
  primaryKeyword: "data science online internship with certificate",
  accent: "#0d6e6e",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Predictive Maintenance Analytics System - analyse machine sensor data, build and evaluate a failure-risk model, explain its main drivers, and present the findings in an operations dashboard.",
    deliverables: [
      "A reproducible cleaning and feature pipeline",
      "A comparison of suitable predictive models",
      "An explainability summary",
      "An operations dashboard",
      "A setup guide",
    ],
    taskOutline: [
      "Inspect timestamped sensor and maintenance data; document missing values and outliers.",
      "Explore sensor trends and relate readings to recorded failures without leaking future information.",
      "Engineer features and compare at least two suitable predictive models using a held-out split.",
      "Report precision and recall, then explain model drivers with appropriate limitations.",
      "Build a dashboard for asset health, risk scores, trends and maintenance review.",
    ],
    validation:
      "Validate schema, time ordering, leakage prevention, metric calculations and dashboard behaviour on incomplete data.",
  },
  content: {
    summary:
      "This fee-based, project-based educational programme centres on a predictive maintenance analytics system. You prepare sensor and maintenance data, compare predictive approaches, explain their limitations, and submit your own reproducible implementation and evidence. After review and explicit approval, the certificate record includes a unique credential ID and QR destination for GreyRocks verification.",
    forYou: [
      "You are comfortable learning through a substantial project rather than short isolated exercises.",
      "You want to practise reasoning about messy, timestamped data and can document why each transformation is defensible.",
      "You are willing to compare models and discuss limitations instead of presenting one score as proof of success.",
    ],
    notForYou: [
      "You are looking for employment, a stipend, or a job offer. This is an educational programme.",
      "You want to submit copied notebooks or unexplained model output. Your implementation and evidence need to be your own.",
      "You need guaranteed college credit. Acceptance depends on your institution, so confirm its rules before enrolling.",
    ],
    buildIntro:
      "The project begins with public or synthetic machine sensor readings and labelled maintenance or failure events. The analytical challenge is temporal: a useful pipeline must preserve what would have been knowable at prediction time. That means inspecting timestamps, separating historical signals from future outcomes, documenting missing readings, and treating unusual values as questions rather than deleting them automatically.",
    progression: [
      [
        "Frame the event",
        "Define the prediction unit, observation window, outcome and operational question before selecting an algorithm.",
      ],
      [
        "Audit the timeline",
        "Profile timestamps, gaps, duplicate readings, sensor ranges and failure labels. Record every assumption that changes the dataset.",
      ],
      [
        "Build features safely",
        "Create lagged, rolling or change-based features using past observations only. Keep preprocessing reproducible and fitted on training data.",
      ],
      [
        "Compare evidence",
        "Establish a simple baseline, compare at least two suitable models on held-out data, and examine precision, recall and threshold trade-offs.",
      ],
      [
        "Explain for review",
        "Connect feature importance or local explanations to sensor behaviour, document limitations, and design a dashboard for maintenance review rather than automated decisions.",
      ],
    ],
    skills: [
      {
        group: "Data preparation",
        items: [
          ["Python", "Coordinate a reproducible analysis workflow."],
          [
            "pandas",
            "Inspect, join, reshape and validate tabular time-stamped data.",
          ],
          ["NumPy", "Express numerical transformations and checks clearly."],
        ],
      },
      {
        group: "Modelling",
        items: [
          [
            "scikit-learn",
            "Build preprocessing pipelines, baselines and model comparisons.",
          ],
          [
            "Evaluation design",
            "Choose splits and metrics that reflect the time-aware failure question.",
          ],
          [
            "Explainability",
            "Describe model drivers without claiming that importance proves causation.",
          ],
        ],
      },
      {
        group: "Communication",
        items: [
          [
            "Matplotlib or a comparable library",
            "Make diagnostic plots whose labels and scales can be reviewed.",
          ],
          [
            "Dashboard reasoning",
            "Organise asset health, risk and trend information for a human maintenance decision.",
          ],
          [
            "README documentation",
            "Explain data provenance, setup, assumptions and reproduction steps.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Randomly splitting time-dependent rows",
        "A random split can let later information influence earlier predictions. Explain the chronology and why the held-out period is genuinely unseen.",
      ],
      [
        "Treating missing readings as a cosmetic problem",
        "Missingness may reflect sensor outages or operating conditions. Measure it by sensor and time, then justify any fill or removal rule.",
      ],
      [
        "Optimising accuracy alone",
        "Failure events can be uncommon. Report class-aware measures such as precision and recall and explain what false alarms and missed failures mean.",
      ],
      [
        "Leaking maintenance outcomes into features",
        "Fields recorded after inspection or repair cannot be used to predict the event that triggered them. Audit feature timestamps explicitly.",
      ],
      [
        "Showing a dashboard without analytical traceability",
        "Every displayed score or trend should map back to a documented transformation, model output or source field.",
      ],
    ],
    cvPatterns: [
      "Built a predictive-maintenance data pipeline in [tool], validating [number] sensor fields and documenting missing-value and outlier rules.",
      "Compared [model A] and [model B] on a held-out [time period/data split], reporting [metric] without overstating the result.",
      "Engineered [feature type] features from timestamped readings while applying documented leakage-prevention checks.",
      "Created a maintenance-review dashboard in [tool] covering asset health, trends and qualified risk scores.",
      "Documented data provenance, reproduction steps and model limitations for a reviewer-facing project repository.",
    ],
    selfCheck: [
      "Can you explain why time order matters when evaluating failure prediction?",
      "Are you prepared to document data cleaning decisions rather than hiding them inside a notebook?",
      "Will you compare a baseline and at least two suitable predictive models?",
      "Can you discuss precision, recall and threshold trade-offs in plain language?",
      "Will you keep the dashboard tied to review and evidence rather than claiming automated maintenance decisions?",
    ],
    college: [
      "Ask whether your institution accepts a fee-based, project-based educational programme for its requirement.",
      "Share the project title, expected deliverables and submission process with your T&P or placement cell.",
      "Confirm required duration, dates, supervision format, signatures and report format before paying.",
      "Keep written approval from your institution and retain your repository, report and review evidence.",
      "If your institution requires a different route, review the official free AICTE internship portal before deciding.",
    ],
    credential:
      "GreyRocks is the issuer named in the HireeBridge certificate flow. Payment provides access to the programme task; it does not issue a certificate. After you submit your work and it receives explicit approval, the certificate record is created with a unique credential ID. The implementation encodes a GreyRocks verification destination in the certificate QR code. You can also use HireeBridge’s certificate page to understand the certificate workflow.",
    faqs: [
      [
        "What is the assigned Data Science project?",
        "The catalogue assigns a Predictive Maintenance Analytics System using machine sensor readings and maintenance or failure events.",
      ],
      [
        "Do I need to invent model results?",
        "No. Report only results produced by your own reproducible work, including weak results and limitations where relevant.",
      ],
      [
        "Why does the task mention a held-out split?",
        "A held-out split provides evidence on data that was not used to fit the model. For time-dependent data, the chronology also needs careful justification.",
      ],
      [
        "Is accuracy enough for failure prediction?",
        "Usually not. The assigned task explicitly asks for precision and recall, along with an explanation of model drivers and limitations.",
      ],
      [
        "Must the dashboard make maintenance decisions automatically?",
        "No. The catalogue describes a dashboard for asset health, risk scores, trends and maintenance review. Present it as decision support.",
      ],
      [
        "Which tools should I use?",
        "Common choices include Python, pandas, NumPy, scikit-learn and a plotting or dashboard tool. These are general learning suggestions, not confirmed programme requirements.",
      ],
      [
        "When is the certificate issued?",
        "The certificate follows task submission and explicit approval; enrolment or payment alone does not issue it.",
      ],
      [
        "Will my college accept it?",
        "That decision belongs to your institution. Confirm with your T&P or placement cell before enrolling.",
      ],
    ],
    links: [
      ["pandas documentation", "https://pandas.pydata.org/docs/"],
      [
        "scikit-learn user guide",
        "https://scikit-learn.org/stable/user_guide.html",
      ],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/data-analytics/",
      label: "Compare the Data Analytics project",
      difference:
        "Data Analytics answers commerce questions with SQL and reconciled KPIs; Data Science develops a time-aware predictive-maintenance model.",
    },
  },
};
