"use strict";

const testingDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Quality Assurance and Automation Test Lifecycle</title>
  <desc id="visual-desc">Structured testing progression moving from risk-based test planning to manual boundary verification, Playwright Page Object Model automation, CI pipeline regression runs, trace recording, and documented release sign-off.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">REQUIREMENT</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Risk Analysis</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">critical paths</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">TEST DESIGN</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Manual Cases</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">boundary data</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">AUTOMATION</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Playwright POM</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">stable locators</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">CI EXECUTION</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Headless Run</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">parallel checks</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">DEFECT REPORTING</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Trace Evidence</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">reproducible tickets</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">REGRESSION SUITE</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Automated Retest</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">release verification</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "software-testing",
  name: "Software Testing",
  primaryKeyword: "software testing online internship with certificate",
  accent: "#41656e",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "E-commerce QA Automation Project - Create a practical QA suite combining test planning, manual cases, Playwright automation, and CI reporting.",
    deliverables: [
      "Risk-based test plan defining scope, critical paths, and test environment boundaries",
      "Comprehensive manual test case matrix with preconditions, boundary inputs, and expected outcomes",
      "Automated end-to-end Playwright test suite using the Page Object Model (POM) and auto-waiting",
      "GitHub Actions CI workflow executing test suites and publishing HTML artifacts and trace files",
      "Structured defect report documenting discovered bugs with reproduction steps, logs, and screenshots",
    ],
    taskOutline: [
      "Analyze e-commerce application requirements to identify high-risk workflows such as checkout and cart updates.",
      "Design structured manual test cases covering functional happy paths, boundary conditions, and invalid inputs.",
      "Automate stable storefront journeys using Playwright, leveraging resilient locator strategies.",
      "Integrate the test suite into a continuous integration pipeline with automated HTML report generation.",
      "Log detailed defect tickets with console logs, network traces, and verified reproduction steps.",
    ],
    validation:
      "Run deterministic tests and verify setup, failure screenshots/traces, and report generation.",
    toolsExpected:
      "Playwright (TypeScript or JavaScript), GitHub Actions, Jest or Mocha, Chromium/Firefox headless runners, and bug tracking templates.",
  },
  diagram: testingDiagram,
  content: {
    h1: "Build an Automated E-commerce QA Suite in a Software Testing Internship Project",
    summary:
      "This software testing online internship with certificate is a fee-based, project-based internship programme that focuses on modern quality assurance engineering. You design a risk-based test plan for an e-commerce platform, write comprehensive manual test cases, automate critical user journeys using Playwright and the Page Object Model, execute tests in GitHub Actions CI, and report defects using actionable traces and logs.",
    forYou: [
      "You want to master both foundational manual test design and modern automated browser testing with Playwright.",
      "You appreciate engineering discipline: designing robust Page Object Model architectures rather than fragile script recordings.",
      "You want to build a continuous integration testing pipeline that publishes clear HTML reports and failure traces on every pull request.",
    ],
    notForYou: [
      "You only want to click around websites randomly without writing structured test plans, boundary conditions, or automation code.",
      "You want to build full-stack web applications from scratch; our Full Stack Development programme focuses directly on feature development.",
      "You believe software testing is just about finding visual bugs rather than verifying data integrity, edge cases, and API responses.",
    ],
    buildIntro:
      "In modern software teams, quality assurance is an active engineering discipline, not an afterthought. In this Software Testing project, you act as the lead QA engineer for an e-commerce application. You analyze functional requirements, evaluate failure risks in purchase workflows, design systematic manual test cases, write automated browser tests using Playwright, and integrate your suite into GitHub Actions. You produce verifiable evidence that demonstrates software readiness and protects against regressions.",
    projectNarrative: [
      "Quality engineering starts with risk-based test planning. Before writing a single line of automation code, you analyze the e-commerce application's core user journeys: product discovery, cart manipulation, discount code application, user authentication, and checkout. You classify risks by likelihood and business impact, prioritizing testing efforts where failures would directly prevent transactions.",
      "Manual test case design establishes the baseline for automated coverage. You author formal test cases with explicit preconditions, parameterized inputs, and expected results. You apply boundary value analysis and equivalence partitioning to test edge cases - such as zero-quantity carts, out-of-stock items, invalid credit card formatting, and coupon expiration states - ensuring coverage extends far beyond basic happy paths.",
      "Automation with Playwright brings speed, consistency, and resilience to regression testing. Instead of writing brittle scripts that rely on volatile XPath selectors, you employ the Page Object Model (POM) pattern and user-facing locators (such as roles, labels, and text). You leverage Playwright's built-in auto-waiting to eliminate flaky 'sleep' statements, ensuring tests wait intelligently for elements to become visible and actionable.",
      "Continuous integration and defect reporting complete the QA lifecycle. You configure a GitHub Actions workflow that executes your Playwright suite across headless browsers on every commit. When a test fails, the pipeline automatically captures screenshots, video recordings, and interactive Playwright Trace files. You translate these failures into professional bug reports containing exact reproduction steps, expected versus actual outcomes, and network payloads.",
    ],
    narrativeHeading: "From requirement risk mapping to automated Playwright CI test pipelines",
    evidenceNotes: [
      "Risk-based test strategy document detailing scope, priorities, and environment configurations.",
      "Manual test case spreadsheet/repository containing boundary values and positive/negative scenarios.",
      "Playwright test suite repository structured using the Page Object Model across multiple pages.",
      "GitHub Actions workflow YAML demonstrating automated test execution and artifact archiving.",
      "Sample Playwright HTML test report and trace viewer files capturing simulated failure states.",
    ],
    progression: [
      [
        "Plan",
        "Analyze e-commerce user journeys, assess business risks, and define testing scope and environments.",
      ],
      [
        "Design",
        "Author detailed manual test cases with boundary value inputs, expected states, and error validations.",
      ],
      [
        "Automate",
        "Implement end-to-end tests in Playwright using the Page Object Model and resilient locator strategies.",
      ],
      [
        "Integrate",
        "Configure GitHub Actions to execute test suites automatically in headless mode and generate HTML reports.",
      ],
      [
        "Report & Retest",
        "Log reproducible defect reports with captured traces, verify bug fixes, and maintain the regression suite.",
      ],
    ],
    selfCheck: [
      "Can you explain the difference between boundary value analysis and equivalence partitioning?",
      "Do you know why hardcoded 'sleep(5000)' pauses create flaky tests and how Playwright auto-waiting solves this?",
      "Can you explain the architectural advantages of using the Page Object Model (POM) pattern in test suites?",
      "Are you prepared to diagnose a test failure using a Playwright Trace zip file?",
      "Can you write a structured bug report that allows a developer to reproduce an issue on their first attempt?",
    ],
    skills: [
      {
        group: "Test Strategy & Manual Design",
        items: [
          ["Risk-Based Test Planning", "Prioritize critical commercial user paths and assess failure impact across features."],
          ["Test Case Specification", "Write unambiguous test cases with preconditions, test data, and expected states."],
          ["Edge Case & Boundary Analysis", "Formulate boundary tests for cart counts, string inputs, and payment validations."],
        ],
      },
      {
        group: "Playwright Test Automation",
        items: [
          ["Page Object Model (POM)", "Encapsulate UI page interactions into maintainable, reusable object classes."],
          ["Resilient Locators", "Query elements using accessibility roles, labels, and data-testid attributes."],
          ["State & Fixture Management", "Authenticate users and seed test state programmatically before running UI journeys."],
        ],
      },
      {
        group: "CI Execution & Defect Triage",
        items: [
          ["GitHub Actions Automation", "Run headless browser tests on pull requests with parallel execution."],
          ["Playwright Trace Analysis", "Inspect DOM snapshots, console logs, and network waterfalls from failed runs."],
          ["Defect Reporting & Triage", "Document reproducible bug reports with severity ratings and environmental logs."],
        ],
      },
    ],
    links: [
      ["Playwright Official Documentation", "https://playwright.dev/docs/intro"],
      ["Ministry of Testing QA Learning Hub", "https://www.ministryoftesting.com/"],
      ["GitHub Actions for Web Testing", "https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs"],
    ],
    mistakes: [
      [
        "Using hardcoded pauses (sleep/timeout) to wait for elements",
        "Rely on Playwright's built-in web-first assertions and auto-waiting rather than arbitrary timer delays that cause test flakiness.",
      ],
      [
        "Using fragile CSS or XPath selectors tied to visual styles",
        "Target accessible user roles (such as getByRole('button', { name: 'Checkout' })) or test IDs rather than deep DOM paths.",
      ],
      [
        "Writing end-to-end tests without a Page Object Model structure",
        "Separate test logic from UI selectors using Page Objects so UI changes require updates in only one file.",
      ],
      [
        "Automating tests before understanding manual test cases",
        "Always outline the manual test steps and expected outcomes clearly before writing automation code.",
      ],
      [
        "Failing to capture failure artifacts in CI runs",
        "Configure Playwright to save screenshots, video recordings, and traces on failure so remote CI issues can be investigated.",
      ],
    ],
    cvPatterns: [
      "Engineered an automated end-to-end test suite in Playwright (TypeScript) covering [number] critical e-commerce purchase flows.",
      "Architected a Page Object Model framework, reducing test maintenance overhead by [percentage] across UI revisions.",
      "Integrated automated regression testing into GitHub Actions CI, executing [number] tests across Chromium, Firefox, and WebKit.",
      "Authored [number] manual test cases applying boundary value analysis and equivalence partitioning to payment workflows.",
      "Identified and logged [number] high-severity functional bugs with detailed reproduction steps, console logs, and trace artifacts.",
    ],
    college: [
      "Confirm with your academic supervisor that an automated software testing and QA engineering project satisfies internship criteria.",
      "Submit the official project brief detailing test strategy, manual test case design, Playwright automation, and CI integration.",
      "Include test execution matrices, coverage summaries, HTML report exports, and sample defect tickets in your final report.",
      "Provide public GitHub access to your test repository with installation instructions and headless execution commands.",
      "Prepare a live demonstration of automated test execution in terminal and trace analysis for your university review panel.",
    ],
    credential:
      "GreyRocks provides the official assessment and credential verification infrastructure for HireeBridge programmes. Enrolment and fee payment grant access to the project specification, e-commerce demo application, and review rubrics; they do not award a completion credential upon payment alone. To receive certification, you submit your test plan documentation, Playwright automation codebase, CI workflow logs, and defect reports. A QA assessor evaluates your locator stability, test structure, and reporting quality. Approved submissions earn an official certificate featuring a unique credential ID and QR code verifying authenticity on GreyRocks.",
    faqs: [
      [
        "What specific application will I test during this internship?",
        "You will test a functional demo e-commerce web application, covering vital user journeys including product catalog navigation, item search and filtering, cart management, user authentication, and checkout validation.",
      ],
      [
        "Why is Playwright chosen instead of Selenium for this project?",
        "Playwright provides modern, fast, and reliable automation with native auto-waiting, multi-tab and multi-context support, built-in trace recording, and cross-browser testing across Chromium, Firefox, and WebKit without third-party driver installations.",
      ],
      [
        "Do I need prior coding experience to complete the automation portion?",
        "Basic familiarity with JavaScript or TypeScript is helpful. The project guide provides step-by-step instruction on setting up Playwright, authoring locators, structuring Page Objects, and running tests.",
      ],
      [
        "What is the Page Object Model (POM) and why is it important?",
        "The Page Object Model is an industry-standard architectural pattern that organizes web pages into reusable class objects. If a button label or input ID changes on the website, you only update it once in the Page Object file rather than across dozens of individual tests.",
      ],
      [
        "How do I prove that my automated tests ran in CI?",
        "You include your GitHub Actions workflow configuration and provide links or screenshots of the workflow run history showing the green execution status and the attached Playwright HTML report artifact.",
      ],
      [
        "Can I complete both manual testing and automated testing in this project?",
        "Yes. The project explicitly combines both: you first author a formal manual test plan and test case matrix, and then automate the high-priority, stable journeys using Playwright.",
      ],
      [
        "How long does the programme take to complete?",
        "The programme is organized as a 4-week self-paced project, guiding you sequentially from test planning and manual design to Playwright scripting, CI pipeline integration, and defect reporting.",
      ],
      [
        "Is the certificate verifiable by employers?",
        "Yes. Every certificate is recorded in the GreyRocks verification registry, containing a unique credential ID and QR code that employers can scan to verify your certified skills.",
      ],
    ],
    sibling: {
      href: "/internships/devops/",
      label: "Compare with DevOps",
      difference:
        "Software Testing focuses on test case design, Playwright browser automation, and defect reporting, whereas DevOps focuses on containerization, infrastructure provisioning, and continuous deployment pipelines.",
    },
  },
};
