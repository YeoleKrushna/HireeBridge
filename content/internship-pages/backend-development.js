"use strict";
module.exports = {
  pilot: true,
  slug: "backend-development",
  name: "Backend Development",
  primaryKeyword: "backend development online internship with certificate",
  accent: "#4b7a5a",
  qualityGatesPassed: true,
  facts: {
    taskOutline: [
      "Define URL creation, lookup and redirect contracts with consistent status and error responses.",
      "Validate URL strings without visiting targets, create unique codes and persist ownership and timestamps.",
      "Add authentication or ownership controls for protected management actions.",
      "Apply rate limits, structured logging and a bounded risk-classification fallback.",
      "Test malformed input, collisions, redirects, limits, persistence and degraded classifier behaviour.",
    ],
  },
  content: {
    metaTitle: "Secure REST API Backend Internship Project | HireeBridge",
    h1: "Build and Test a Secure URL Shortener Backend API",
    summary:
      "This fee-based, project-based educational programme focuses on a secure URL shortener REST API. You implement endpoint contracts, persistence, ownership controls, validation, rate limiting, structured errors, logging and a bounded malicious-link risk classification step without fetching submitted destinations. The project is server-side and does not claim to provide complete threat detection.",
    h2Overrides: {
      "Who this project fits and who it does not":
        "Is API reliability the engineering depth you want?",
      "Move from question to reviewable evidence":
        "Harden the service one boundary at a time",
      "Is this project a reasonable learning fit?":
        "Check your server-side testing readiness",
      "Build capability in a realistic order":
        "Develop API, persistence and operational controls",
      "Common Backend Development project mistakes":
        "Backend failure modes to catch before review",
      "Draft an honest CV bullet": "Record backend work as verifiable evidence",
      "Check with your college before enrolling":
        "Confirm the API project requirements",
      "Completion comes before the credential":
        "Prove service behaviour before credential approval",
      "Backend Development programme FAQ": "Secure URL-shortener API questions",
      "Read the plan details before you decide.":
        "Read the backend scope and enrolment terms.",
    },
    forYou: [
      "You want to concentrate on HTTP contracts, server validation, database behaviour and operational controls.",
      "You are ready to test collisions, malformed input, rate limits and degraded dependencies rather than only successful requests.",
      "You can treat submitted URLs as inert strings and avoid contacting unknown destinations.",
    ],
    notForYou: [
      "You mainly want to design a React interface or own an end-to-end storefront.",
      "You intend to visit submitted URLs during classification, which is outside the safe project boundary.",
      "You expect paid work, employment or guaranteed institutional credit.",
    ],
    buildIntro:
      "The Secure URL Shortener API turns a simple redirect into a service-design exercise. Creating a short link requires input validation, unique-code handling, ownership and durable storage. Redirect lookup needs predictable status behaviour and safe logging. Abuse controls must constrain request volume, while the risk-classification step operates on URL text only and has a documented fallback when its classifier is unavailable.",
    progression: [
      [
        "Write the contracts",
        "Define request fields, response bodies, status codes, authentication needs and error shapes for creation, lookup, redirect and management.",
      ],
      [
        "Model identity and storage",
        "Choose code uniqueness, owner relationships, timestamps and indexes, then test persistence across process restarts.",
      ],
      [
        "Validate inert input",
        "Parse and constrain URL strings without navigating to them, and keep classifier features limited to documented text structure.",
      ],
      [
        "Add service controls",
        "Implement rate limits, structured logs, protected configuration and consistent dependency-failure behaviour.",
      ],
      [
        "Test hostile edges safely",
        "Exercise malformed strings, code collisions, missing records, unauthorized changes, excessive requests and classifier fallback locally.",
      ],
    ],
    skills: [
      {
        group: "API contracts",
        items: [
          [
            "HTTP semantics",
            "Choose methods, status codes, redirects and cache behaviour deliberately.",
          ],
          [
            "Input validation",
            "Reject malformed or unsupported URL strings with consistent field errors.",
          ],
          [
            "Error design",
            "Return stable machine-readable failures without leaking internal details.",
          ],
        ],
      },
      {
        group: "Data and access",
        items: [
          [
            "Persistence",
            "Store original URL, short code, owner and timestamps under explicit constraints.",
          ],
          [
            "Authentication",
            "Establish identity for protected management operations.",
          ],
          [
            "Authorization",
            "Enforce ownership and administrative permissions on the server.",
          ],
        ],
      },
      {
        group: "Operations",
        items: [
          [
            "Rate limiting",
            "Bound abuse with testable policies and clear responses.",
          ],
          [
            "Structured logging",
            "Record request and failure context without secrets or unnecessary personal data.",
          ],
          [
            "Fallback behaviour",
            "Keep classification failure distinct from URL validity and service availability.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Checking URL shape with a network request",
        "The task says not to visit submitted destinations. Treat them as strings and document lexical or structural classification only.",
      ],
      [
        "Generating codes without collision handling",
        "A random result still needs a uniqueness constraint and a retry or conflict strategy.",
      ],
      [
        "Applying rate limits after expensive work",
        "Reject excessive traffic early and test the documented scope, key and response headers.",
      ],
      [
        "Logging secrets or complete sensitive values",
        "Logs should support diagnosis while minimising tokens, credentials and unnecessary submitted data.",
      ],
      [
        "Returning a successful risk label when classification fails",
        "Expose a bounded fallback or unavailable state instead of silently treating an error as safe.",
      ],
    ],
    cvPatterns: [
      "Designed [number] REST endpoints with consistent status codes, validation errors and API documentation.",
      "Implemented unique short-code persistence with database constraints and tested collision behaviour.",
      "Enforced authentication and owner authorization for [operation] while keeping public redirects bounded.",
      "Added rate limiting and structured logs, verifying [limit condition] without recording secrets.",
      "Built an inert-string risk classification step with explicit fallback and no outbound target requests.",
    ],
    selfCheck: [
      "Can every endpoint state its authentication, validation and error contract?",
      "Will database uniqueness protect short codes under concurrent requests?",
      "Can the classifier operate without visiting the submitted destination?",
      "Are rate-limit scope and fallback behaviour testable?",
      "Do logs avoid secrets and unnecessary full URL data?",
    ],
    college: [
      "Ask whether a server-side REST API project satisfies the relevant requirement.",
      "Provide the URL-shortener scope, safety boundary, persistence model and test plan to your T&P or placement cell.",
      "Confirm duration, documentation, hosting, supervision and signature expectations before paying.",
      "Keep API specifications, schema, test output, rate-limit evidence and operational notes.",
      "Run all hostile-input tests against the local project, never against third-party systems.",
    ],
    credential:
      "A certificate is not created by payment or API deployment. Submit the service, tests and evidence for review; explicit approval enables the GreyRocks record with a unique credential ID and QR verification destination. The certificate does not certify a security product or promise detection of every malicious URL.",
    faqs: [
      [
        "What is the assigned Backend project?",
        "The catalogue assigns a secure URL shortener REST API with persistence, rate limiting and a bounded malicious-link risk classification step.",
      ],
      [
        "May the service visit submitted URLs?",
        "No. The catalogue says the classifier should work without visiting the destination. Treat input as inert text.",
      ],
      [
        "How should short-code collisions be handled?",
        "Use a database uniqueness constraint plus a documented retry or conflict response strategy.",
      ],
      [
        "Does the project need authentication?",
        "Ownership or protected management actions need server-side identity and authorization controls.",
      ],
      [
        "What should happen if classification is unavailable?",
        "Return a documented fallback or unavailable state; do not silently label the URL safe.",
      ],
      [
        "Which tests are essential?",
        "Cover malformed strings, uniqueness, persistence, redirects, missing records, authorization, rate limits and classifier fallback.",
      ],
      [
        "When is the certificate created?",
        "After submission and explicit approval.",
      ],
      [
        "Does this programme guarantee academic credit?",
        "No. Confirm the institution’s requirements first.",
      ],
    ],
    links: [
      [
        "OWASP REST security guidance",
        "https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html",
      ],
      ["RFC 9110 HTTP semantics", "https://www.rfc-editor.org/rfc/rfc9110"],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/full-stack-development/",
      label: "Compare the Full Stack e-commerce project",
      difference:
        "Full Stack Development includes storefront and administration interfaces; Backend Development concentrates on API contracts, persistence, access control, validation and service operations.",
    },
  },
};
