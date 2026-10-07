"use strict";

const fdeDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Forward Deployed Engineering Client Delivery Cycle</title>
  <desc id="visual-desc">Customer-facing technical problem discovery, bounded MVP architecture, synthetic test fixture validation, staged deployment integration, and complete operational handoff documentation.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">DISCOVERY</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Problem Framing</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">workflow audit</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">ARCHITECTURE</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Technical Spec</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">constraints &amp; APIs</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">PROTOTYPE</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Bounded App</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">synthetic data</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">EVALUATION</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Acceptance Test</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">benchmark runs</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">INTEGRATION &amp; ROLLOUT</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Staged Release</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">phased telemetry</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">OPERATIONAL HANDOFF</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Customer Runbook</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">team enablement pack</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "forward-deployed-engineer",
  factsKey: "fde-forward-deployed-engineering",
  catalogueDomain: "FDE / Forward Deployed Engineering",
  name: "Forward Deployed Engineer",
  primaryKeyword: "forward deployed engineer online internship with certificate",
  accent: "#285a84",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Enterprise AI Deployment Case Study - Simulate an embedded deployment from discovery and scoping through prototype, evaluation, rollout, and handoff.",
    deliverables: [
      "Customer discovery report capturing operational workflows, technical pain points, and data constraints",
      "Enterprise solution architecture document detailing API contracts, security boundaries, and data pipelines",
      "Functional bounded prototype codebase operating on synthetic enterprise customer data",
      "Quantitative acceptance testing report measuring latency, accuracy, and operational benchmarks",
      "Comprehensive deployment handoff pack containing an operational runbook, monitoring rules, and open-issues register",
    ],
    taskOutline: [
      "Execute simulated customer discovery to unpack messy business workflows and establish technical constraints.",
      "Translate discovery findings into detailed system specifications, interface schemas, and architecture blueprints.",
      "Develop a working bounded prototype using synthetic customer records to validate end-to-end feasibility.",
      "Conduct rigorous acceptance testing against defined service benchmarks and document known boundary limits.",
      "Produce a customer handoff pack comprising production rollout stages, rollback protocols, and on-call runbooks.",
    ],
    validation:
      "Trace each requirement to an evaluation case and record known limitations and rollback steps.",
    toolsExpected:
      "Python/Node.js, Docker, OpenAPI/Swagger specifications, synthetic enterprise datasets, Markdown runbook authoring, and architectural diagramming.",
  },
  diagram: fdeDiagram,
  content: {
    h1: "Deploy Enterprise AI Systems in a Forward Deployed Engineer Internship Project",
    summary:
      "This forward deployed engineer online internship with certificate is a fee-based, project-based internship programme that focuses on customer-facing technical deployment and integration engineering. You simulate an embedded deployment engagement: conducting customer discovery, designing system architecture under enterprise constraints, implementing a bounded prototype with synthetic data, validating acceptance criteria, and authoring production handoff runbooks.",
    forYou: [
      "You want to combine strong software engineering capabilities with customer-facing technical leadership and problem discovery.",
      "You thrive in ambiguous environments where technical requirements must be extracted from messy operational workflows.",
      "You want to produce a portfolio project showcasing enterprise integration, system architecture, and production handoff documentation.",
    ],
    notForYou: [
      "You prefer working exclusively in isolation on purely theoretical algorithms without considering customer business constraints.",
      "You want product management without writing code; FDEs must implement and debug working prototypes.",
      "You expect customers to provide fully polished, complete technical specifications on day one of a project.",
    ],
    buildIntro:
      "Forward Deployed Engineers (FDEs) operate at the intersection of software engineering, customer operations, and strategic product delivery. Unlike back-office software engineers who build generic features, FDEs embed with enterprise stakeholders to solve high-stakes problems with tailored technical solutions. In this project, you navigate a simulated Enterprise AI Deployment. You interview stakeholders, define technical architecture under legacy constraints, build a working prototype, measure operational benchmarks, and deliver a production handoff pack that enables customer teams to run the system autonomously.",
    projectNarrative: [
      "Discovery and scoping establish the project foundation. You begin with a realistic customer engagement scenario: an enterprise organization struggling with manual, error-prone data processing across fragmented legacy systems. Rather than accepting high-level complaints, you conduct technical discovery to map out existing operational workflows, identify data format bottlenecks, catalogue security and privacy constraints, and isolate the exact core problem that an automated solution must solve.",
      "Translating ambiguous customer needs into a concrete technical architecture is where engineering leadership happens. You author a detailed solution architecture specification. You define API boundaries, authentication mechanisms, data schemas, and deployment topologies. You document technical trade-offs openly - explaining why a bounded microservice architecture was chosen over a monolithic integration - and establish clear acceptance criteria that customer stakeholders can verify.",
      "Rapid prototyping proves operational feasibility. Working with synthetic customer data, you implement a functional prototype demonstrating core workflow automation. You build API endpoints, integrate background processing logic, handle edge-case data errors gracefully, and package the application inside Docker containers. The prototype demonstrates that the proposed architecture solves the customer's problem without violating enterprise security constraints.",
      "Acceptance evaluation and customer handoff ensure long-term operational success. You execute benchmark evaluations testing throughput, response latency, and error recovery under synthetic load. You assemble a comprehensive handoff pack: an operational runbook detailing deployment procedures, health monitoring checks, automated rollback steps, and an open-issues register that honestly details current limitations. This ensures the client's internal engineering team can operate and maintain the system with complete confidence.",
    ],
    narrativeHeading: "From ambiguous stakeholder discovery to verified enterprise system deployment",
    evidenceNotes: [
      "Customer discovery interview notes and operational workflow diagrams highlighting existing bottlenecks.",
      "Solution architecture specification document including API contracts and data flow diagrams.",
      "Working prototype application source code packaged with a reproducible Dockerfile and setup guide.",
      "Acceptance benchmark report verifying response latency, data validation accuracy, and recovery tests.",
      "Complete customer handoff pack containing an operational runbook, monitoring alerts, and rollback protocols.",
    ],
    progression: [
      [
        "Discover & Scope",
        "Conduct customer workflow discovery, identify operational bottlenecks, and define technical project boundaries.",
      ],
      [
        "Architect Solution",
        "Author formal architecture blueprints, API schemas, and security boundaries that accommodate legacy constraints.",
      ],
      [
        "Build Prototype",
        "Implement a working prototype application in Python or Node.js using synthetic customer data and Docker packaging.",
      ],
      [
        "Evaluate Criteria",
        "Benchmark prototype performance against customer acceptance criteria, measuring throughput and error handling.",
      ],
      [
        "Deliver Handoff",
        "Author production runbooks, monitoring guidelines, rollback instructions, and an open-issues register.",
      ],
    ],
    selfCheck: [
      "Can you translate vague customer complaints into unambiguous technical requirements and acceptance criteria?",
      "Do you know how to architect software solutions around existing enterprise security and legacy constraints?",
      "Can you write a modular, clean prototype using synthetic data that demonstrates end-to-end feasibility?",
      "Are you prepared to document technical trade-offs and known system limitations honestly in a client handoff memo?",
      "Can you author an operational runbook that allows another engineer to deploy, monitor, and recover your system?",
    ],
    skills: [
      {
        group: "Customer Discovery & Scoping",
        items: [
          ["Technical Workflow Discovery", "Interview stakeholders, extract implicit assumptions, and map operational flows."],
          ["Constraint & Risk Analysis", "Identify legacy integration blockers, security compliance boundaries, and data gaps."],
          ["Acceptance Criteria Formulation", "Define measurable quantitative benchmarks for project success and client acceptance."],
        ],
      },
      {
        group: "Architecture & Prototyping",
        items: [
          ["Enterprise System Architecture", "Design modular services, API contracts (OpenAPI), and secure data pipelines."],
          ["Rapid Prototype Implementation", "Construct functional integration prototypes using Python, Node.js, and Docker."],
          ["Synthetic Data Engineering", "Generate realistic synthetic customer data that models real-world edge cases."],
        ],
      },
      {
        group: "Deployment & Customer Handoff",
        items: [
          ["Operational Runbook Authoring", "Write step-by-step guides for deployment, verification, and disaster rollback."],
          ["Telemetry & Health Monitoring", "Define operational metrics, alert thresholds, and health probe endpoints."],
          ["Client Engineering Enablement", "Create clear documentation that enables client teams to maintain the system independently."],
        ],
      },
    ],
    links: [
      ["OpenAPI Specification Standards", "https://swagger.io/specification/"],
      ["The Twelve-Factor App Deployment Methodology", "https://12factor.net/"],
      ["Google Cloud Architecture Framework", "https://cloud.google.com/architecture/framework"],
    ],
    mistakes: [
      [
        "Building software before fully understanding customer workflows",
        "Never begin coding based on assumptions; always document stakeholder discovery notes and confirm problem boundaries first.",
      ],
      [
        "Ignoring client security and compliance constraints in architecture",
        "Enterprise environments have strict network, data isolation, and auth rules; design them into the prototype from day one.",
      ],
      [
        "Using real confidential client data during testing",
        "Always use synthetic or heavily obfuscated sample datasets to protect client privacy and comply with data security standards.",
      ],
      [
        "Delivering a prototype without an operational runbook or handoff guide",
        "An FDE's job is not complete until client teams can run the software; provide clear deployment, monitoring, and recovery steps.",
      ],
      [
        "Hiding known bugs or system limitations during client review",
        "Maintain an open-issues register documenting current boundaries and recommended follow-on engineering tasks.",
      ],
    ],
    cvPatterns: [
      "Simulated an embedded Forward Deployed Engineer engagement, designing an enterprise AI deployment architecture for [use case].",
      "Conducted technical discovery, mapping legacy operational bottlenecks into [number] verified functional requirements.",
      "Engineered a Dockerized integration prototype in [language], processing [number] synthetic enterprise records with zero data leakage.",
      "Benchmarked prototype performance against acceptance criteria, achieving [metric] latency and [percentage]% data parsing accuracy.",
      "Authored a comprehensive client handoff pack including system architecture diagrams, an operational runbook, and rollback protocols.",
    ],
    college: [
      "Confirm with your academic department that a forward deployed engineering and enterprise deployment case study satisfies internship requirements.",
      "Submit the official project brief outlining stakeholder discovery, system architecture, prototype development, and operational handoff.",
      "Include discovery interview templates, architecture blueprints, prototype source code, and runbook documentation in your final report.",
      "Provide public GitHub access to your repository containing the Dockerized prototype and setup instructions.",
      "Prepare a technical presentation demonstrating the end-to-end deployment workflow and client handoff strategy to your academic panel.",
    ],
    credential:
      "GreyRocks serves as the independent evaluation and certification body for HireeBridge technical programmes. Programme fees grant access to the simulated customer scenario, architectural templates, and evaluation criteria; they do not automatically award a completion certificate upon payment. To obtain your credential, you submit your complete case study: customer discovery notes, system architecture specifications, prototype codebase, and the operational handoff pack. A technical assessor evaluates your engineering rigor, architectural choices, and handoff clarity. Approved projects receive an authentic credential with an unalterable ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "What does a Forward Deployed Engineer actually do?",
        "A Forward Deployed Engineer (FDE) embeds directly with clients to solve complex operational problems. They conduct technical discovery, design custom system architectures, write prototype code to integrate enterprise systems, and ensure smooth operational handoff to client engineering teams.",
      ],
      [
        "How is this different from standard Software Engineering?",
        "Standard software engineers typically build general product features based on tickets written by others. FDEs work directly with stakeholders to uncover the problem, design the solution architecture, implement the integration code, and manage the deployment rollout.",
      ],
      [
        "Do I need to talk to real enterprise clients to complete this internship?",
        "No. You work with a carefully constructed, realistic enterprise case study brief that simulates the exact technical challenges, stakeholder personas, and operational constraints encountered in real client engagements.",
      ],
      [
        "What programming languages can I use for the prototype?",
        "You can implement your prototype using Python or Node.js/TypeScript. The emphasis is on building clean, modular REST/API endpoints packaged with Docker and supported by comprehensive documentation.",
      ],
      [
        "What is included in an operational handoff pack?",
        "The handoff pack includes system architecture diagrams, an installation and deployment guide, an on-call runbook with disaster recovery steps, monitoring alert definitions, and an open-issues register.",
      ],
      [
        "Can I complete this project alongside my college coursework?",
        "Yes. The project is structured over 4 weeks of self-paced learning, providing clear weekly milestones from discovery and architecture to prototyping and handoff packaging.",
      ],
      [
        "How is the project evaluated by the review team?",
        "Reviewers evaluate the depth of your discovery analysis, the clarity of your architecture diagrams, the functionality of your Dockerized prototype, and the operational completeness of your client runbook.",
      ],
      [
        "How do recruiters verify my FDE certificate?",
        "Each certificate features an official GreyRocks credential ID and a scannable QR verification code that displays your verified project scope and completion record on the online verification portal.",
      ],
    ],
    sibling: {
      href: "/internships/product-management/",
      label: "Compare with Product Management",
      difference:
        "Forward Deployed Engineering focuses on client-specific architecture, technical prototyping, and enterprise deployment runbooks, whereas Product Management focuses on market discovery, user personas, and product roadmap prioritization.",
    },
  },
};
