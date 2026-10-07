"use strict";
module.exports = {
  pilot: true,
  slug: "python-development",
  name: "Python Development",
  primaryKeyword: "python development online internship with certificate",
  accent: "#356e9a",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Personal Finance & Expense Tracker - build a Python application with validated transaction workflows, local persistence, summaries, charts, filters and export.",
    deliverables: [
      "A runnable Python expense tracker",
      "A documented local storage format",
      "Validated transaction and category workflows",
      "Summaries, filters, charts and export",
      "Automated tests and a setup guide",
    ],
    taskOutline: [
      "Create, view, update and delete transactions and categories.",
      "Validate dates and amounts and persist records in a documented local format.",
      "Filter records by date and category and calculate monthly and category totals.",
      "Present useful charts or summaries and export a selected record set.",
      "Separate core logic from the CLI, GUI or small API and document backup handling.",
    ],
    validation:
      "Test create/read/update/delete operations, invalid input, persistence reload, empty periods, filters, totals and export.",
  },
  content: {
    summary:
      "This fee-based, project-based educational programme asks you to build a dependable Personal Finance & Expense Tracker in Python. The emphasis is application behaviour: validated CRUD operations, explicit storage, tested calculations, filters, export and separation between core logic and the chosen interface. It does not require real financial records or imply financial advice.",
    forYou: [
      "You want to practise Python modules, data validation, tests and local persistence through a complete small application.",
      "You are prepared to define behaviour for invalid values, empty periods, reloads and failed writes.",
      "You can keep personal information out of the repository by using clearly synthetic fixtures.",
    ],
    notForYou: [
      "You mainly want to train a predictive model or build a dashboard over a supplied business dataset.",
      "You want to place every rule inside one interface file without testable application logic.",
      "You are looking for employment, paid work or guaranteed institutional acceptance.",
    ],
    buildIntro:
      "The Personal Finance & Expense Tracker is deliberately smaller than a full financial platform, which makes engineering discipline visible. A transaction has an identifier, date, amount, category and optional note. The program must preserve valid records across restarts, reject malformed input without damaging stored data, calculate summaries from the same source of truth and export only the records selected by documented filters.",
    progression: [
      [
        "Define the model",
        "Specify transaction and category fields, identifiers, amount rules, date representation and update/delete behaviour.",
      ],
      [
        "Separate the core",
        "Keep validation, storage and calculations independent from CLI prompts, GUI widgets or HTTP handlers.",
      ],
      [
        "Make persistence dependable",
        "Choose a documented local format, write and reload records safely, and explain backup or recovery limits.",
      ],
      [
        "Add summaries and export",
        "Implement date/category filters, monthly and category totals, empty states, charts or summaries and a verifiable export.",
      ],
      [
        "Test boundary behaviour",
        "Cover malformed dates, negative or zero values according to your rules, missing categories, reloads, empty periods and rounding.",
      ],
    ],
    skills: [
      {
        group: "Python structure",
        items: [
          [
            "Modules",
            "Separate models, validation, storage, calculations and interface concerns.",
          ],
          [
            "Type and data design",
            "Use clear representations for identifiers, dates, amounts and categories.",
          ],
          [
            "Error handling",
            "Return useful errors without swallowing failures or corrupting data.",
          ],
        ],
      },
      {
        group: "Application reliability",
        items: [
          [
            "Automated tests",
            "Check behaviour with focused fixtures and temporary storage.",
          ],
          [
            "Persistence",
            "Save and reload records predictably in a documented local format.",
          ],
          [
            "Packaging and setup",
            "State supported commands, dependencies and how another reviewer runs the application.",
          ],
        ],
      },
      {
        group: "Useful interfaces",
        items: [
          [
            "CLI, GUI or small API",
            "Expose the same core operations without duplicating business rules.",
          ],
          [
            "Reports and charts",
            "Calculate readable summaries from validated records.",
          ],
          [
            "Export",
            "Produce a documented selected dataset whose totals can be checked.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Using floating-point values carelessly for money",
        "Binary floating point can produce surprising totals. Choose and document a decimal or smallest-unit strategy and test rounding.",
      ],
      [
        "Mixing prompts with business rules",
        "Validation hidden inside input handlers is difficult to reuse and test. Put rules in functions or classes independent of the interface.",
      ],
      [
        "Overwriting storage directly",
        "A failed write can damage the only copy. Use a deliberate save strategy and document the limits of local persistence.",
      ],
      [
        "Testing only successful creation",
        "Update, deletion, reload, invalid values, empty periods and filter boundaries are part of the assigned validation.",
      ],
      [
        "Committing real finance records",
        "Use synthetic transactions and keep local user data, exports and secrets outside version control.",
      ],
    ],
    cvPatterns: [
      "Built a modular Python expense tracker with validated CRUD workflows for transactions and categories.",
      "Implemented documented local persistence in [format] and tested save, reload and [failure case] behaviour.",
      "Calculated monthly and category summaries using a documented [decimal/smallest-unit] amount strategy.",
      "Added date/category filters, selected-record export and explicit empty-period handling.",
      "Created [number] automated tests covering validation, persistence, calculations and interface-independent core logic.",
    ],
    selfCheck: [
      "Can you define every transaction field and validation rule before writing the interface?",
      "Will core operations work without direct CLI, GUI or request objects?",
      "Can your tests reload saved records from temporary storage?",
      "Have you chosen and documented how amounts and rounding are represented?",
      "Will every committed example use synthetic rather than personal finance data?",
    ],
    college: [
      "Ask whether a Python application project matches the relevant internship or coursework rules.",
      "Share the Personal Finance & Expense Tracker scope, tests and deliverables with your T&P or placement cell.",
      "Confirm required duration, review format, report, signatures and dates before paying.",
      "Retain source history, test output, synthetic fixtures, setup instructions and screenshots.",
      "If a listed opportunity is required, compare the process with the official free AICTE internship portal.",
    ],
    credential:
      "Programme access and certificate issuance are separate. Complete and submit the application, tests and documentation, then wait for explicit approval. The approved record is created by GreyRocks with a unique credential ID and the QR destination used by the verification implementation.",
    faqs: [
      [
        "What is the assigned Python Development project?",
        "The catalogue assigns a Personal Finance & Expense Tracker with validated CRUD, local persistence, summaries, filters, charts or reports and export.",
      ],
      [
        "Must I use real financial data?",
        "No. Use user-entered local records or clearly synthetic fixtures, and never commit personal finance exports.",
      ],
      [
        "Can I build a CLI?",
        "Yes. The interface may be a CLI, GUI or small API, provided the core logic is separated and the assigned workflows are complete.",
      ],
      [
        "How should amounts be stored?",
        "Choose and document a deliberate decimal or smallest-unit representation, then test calculations and rounding.",
      ],
      [
        "What persistence is expected?",
        "Use a documented local format and prove that valid records survive reload; also explain backup and failure limitations.",
      ],
      [
        "Which tests matter most?",
        "Cover CRUD, invalid input, reload, empty periods, filters, totals, rounding and export selection.",
      ],
      [
        "When is the certificate created?",
        "After submission and explicit approval, not merely after enrolment.",
      ],
      [
        "Is college acceptance automatic?",
        "No. Your institution decides whether the programme meets its requirement.",
      ],
    ],
    links: [
      [
        "Python tutorial: modules",
        "https://docs.python.org/3/tutorial/modules.html",
      ],
      [
        "Python unittest documentation",
        "https://docs.python.org/3/library/unittest.html",
      ],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/backend-development/",
      label: "Compare the Backend Development project",
      difference:
        "Backend Development centres on a networked URL-shortener API and service controls; Python Development centres on a small tested local application and its packaging.",
    },
  },
};
