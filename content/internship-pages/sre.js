"use strict";

const sreDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Site Reliability Engineering Observability and Incident Cycle</title>
  <desc id="visual-desc">Kubernetes services emit RED telemetry to Prometheus, track user-impacting SLIs against defined SLOs and error budgets, fire multi-window burn rate alerts upon budget depletion, guide automated cluster recovery, and conclude with a blameless postmortem review.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">TELEMETRY</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">RED Metrics</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">rate &amp; latency</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">PROMETHEUS</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Scrape &amp; Store</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">time-series data</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">SLO TARGETS</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Error Budget</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">budget tracking</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">ALERTS</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Burn Rate</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">user impact gate</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">CHAOS &amp; RECOVERY</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Failure Injection</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">automated pod restart</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">BLAMELESS REVIEW</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Postmortem Memo</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">root cause analysis</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "sre",
  factsKey: "site-reliability-engineering",
  catalogueDomain: "Site Reliability Engineering",
  name: "Site Reliability Engineering",
  primaryKeyword: "site reliability engineering online internship with certificate",
  accent: "#246b68",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Kubernetes SLO/Observability Project - Instrument a Kubernetes service, define SLOs, and build a tested observability and incident workflow.",
    deliverables: [
      "Instrumented Kubernetes application service exposing Prometheus RED metrics (Rate, Errors, Duration)",
      "Formal Service Level Objective (SLO) specification document defining SLIs, targets, and error budget policies",
      "Prometheus Alertmanager rules configured for multi-window burn rate detection rather than transient CPU spikes",
      "Comprehensive Grafana dashboard JSON layout tracking service availability, latency percentiles, and error budgets",
      "Chaos testing report and blameless postmortem incident review documenting controlled failures and recovery actions",
    ],
    taskOutline: [
      "Instrument a containerized service with Prometheus client metrics, capturing HTTP traffic rates, errors, and latencies.",
      "Formulate formal Service Level Indicators (SLIs) and establish a defensible 99.5% Service Level Objective (SLO).",
      "Build a Grafana observability dashboard displaying real-time error budget burn rates and latency histograms.",
      "Configure Prometheus alerting rules that trigger pages based on rapid error budget depletion.",
      "Execute a controlled chaos injection exercise (e.g. synthetic load and pod failure), test automated recovery, and author a postmortem.",
    ],
    validation:
      "Verify metrics, alert firing/resolution, SLO calculations, and health behavior during a controlled failure.",
    toolsExpected:
      "Kubernetes (Minikube, Kind, or sandbox), Prometheus, Grafana, Alertmanager, Python/Go microservice, and load generators (k6 or Apache Bench).",
  },
  diagram: sreDiagram,
  content: {
    h1: "Master Observability and SLOs in a Site Reliability Engineering Internship Project",
    summary:
      "This site reliability engineering online internship with certificate is a fee-based, project-based internship programme that focuses on production reliability engineering, service level metrics, and incident management. You instrument a Kubernetes service with Prometheus metrics, define user-centric SLOs and error budgets, configure multi-window burn rate alerts, execute controlled failure simulations, and author an operational blameless postmortem.",
    forYou: [
      "You want to understand how top tech companies maintain 99.9% uptime across complex distributed architectures.",
      "You value data-driven reliability: replacing arbitrary alert thresholds with mathematical error budget burn rates.",
      "You want to build an SRE portfolio project showcasing Prometheus instrumentation, Grafana dashboards, chaos testing, and postmortem authoring.",
    ],
    notForYou: [
      "You only want to write frontend user interfaces; our Frontend Development programme focuses directly on UI components.",
      "You want CI/CD deployment pipelines without production observability; our DevOps programme focuses on continuous delivery.",
      "You believe system reliability means zero failures ever occur; SRE accepts failure and manages it with error budgets.",
    ],
    buildIntro:
      "In modern distributed cloud platforms, systems will fail. Hardware breaks, network partitions occur, and software deployments introduce bugs. Site Reliability Engineering (SRE) is the discipline of treating operations as a software problem. In this SRE project, you take ownership of an application service running in Kubernetes. You instrument the code with Prometheus metrics, define user-centric Service Level Objectives (SLOs), quantify your service's error budget, build real-time Grafana dashboards, configure multi-window burn rate alerts, and conduct a controlled failure drill followed by a blameless incident postmortem.",
    projectNarrative: [
      "Reliability engineering begins by measuring what matters to actual users. Rather than monitoring low-level machine metrics like host CPU percentages (which rarely correlate directly with user satisfaction), you instrument your application using the RED method: Request Rate, Error Count, and Request Duration (latency). You expose these metrics via a clean `/metrics` HTTP endpoint formatted for Prometheus scraping.",
      "Service Level Objectives (SLOs) turn qualitative reliability goals into quantitative engineering contracts. You establish a Service Level Indicator (SLI) measuring the percentage of successful HTTP requests completed in under 300 milliseconds. You set a realistic SLO target (e.g. 99.5% over a rolling 30-day window), which mathematically establishes an 'error budget', the exact amount of unreliability your service is permitted to experience before feature releases are halted to prioritize stability.",
      "Alerting must be actionable rather than noisy. Alert fatigue causes on-call engineers to ignore critical warnings. You replace naive instant-threshold alerts with Google SRE multi-window burn rate alerts. Your Alertmanager configuration alerts only when the service is consuming its 30-day error budget at a rate that threatens to exhaust the entire budget within hours or days, filtering out transient, self-resolving network hiccups.",
      "Failure testing and blameless postmortems close the reliability loop. You run a controlled failure exercise using a load testing tool (like k6), injecting artificial latency or killing cluster pods. You observe your alerts fire in Prometheus, monitor how Kubernetes restarts unhealthy containers automatically, and observe the alert resolve. Finally, you write a structured, blameless postmortem detailing the incident timeline, root cause, user impact, and permanent preventive engineering items.",
    ],
    narrativeHeading: "From service instrumentation to error budget burn rate alerting and blameless postmortems",
    evidenceNotes: [
      "Kubernetes deployment and service YAML manifests featuring Prometheus scrape annotations.",
      "Application source code demonstrating Prometheus client metric instrumentation (RED method).",
      "Formal SLO and error budget calculation documentation with mathematical justification.",
      "Prometheus Alertmanager rules configuration file defining multi-window burn rate alerting.",
      "Chaos injection execution log, Grafana dashboard export, and completed blameless postmortem incident report.",
    ],
    progression: [
      [
        "Instrument Metrics",
        "Add Prometheus RED metrics (Rate, Errors, Duration) to a containerized microservice running in Kubernetes.",
      ],
      [
        "Define SLOs",
        "Formulate user-centric SLIs, establish a 99.5% availability objective, and calculate the 30-day error budget.",
      ],
      [
        "Visualize Health",
        "Build a Grafana dashboard visualizing request rates, p95/p99 latency histograms, and remaining error budget.",
      ],
      [
        "Configure Alerts",
        "Author Prometheus Alertmanager rules detecting rapid error budget burn rates to eliminate alert noise.",
      ],
      [
        "Chaos & Postmortem",
        "Inject controlled cluster failures, observe alert firing and automated pod recovery, and author a blameless postmortem.",
      ],
    ],
    selfCheck: [
      "Can you explain the difference between an SLI, an SLO, an SLA, and an error budget?",
      "Do you know why alerting on multi-window error budget burn rate is superior to alerting on high CPU utilization?",
      "Can you explain how p99 latency percentiles expose tail latency that average metrics conceal?",
      "Are you prepared to conduct a controlled failure drill and explain the automated recovery steps?",
      "Can you write a blameless postmortem that identifies systemic root causes without pointing fingers at individuals?",
    ],
    skills: [
      {
        group: "Observability & Instrumentation",
        items: [
          ["Prometheus Metrics & RED Method", "Instrument web services with counters, gauges, and latency histograms."],
          ["PromQL Query Mastery", "Author time-series queries computing rates, quantiles, and rolling availability."],
          ["Grafana Dashboard Engineering", "Design clean operational dashboards displaying latency heatmaps and budget burns."],
        ],
      },
      {
        group: "Service Level Engineering",
        items: [
          ["SLI & SLO Specification", "Define quantitative user-centric reliability targets based on business criticality."],
          ["Error Budget Management", "Calculate allowable downtime budgets and establish release-freeze policies."],
          ["Burn Rate Alerting", "Implement multi-window alerting to catch rapid budget depletion while ignoring noise."],
        ],
      },
    {
        group: "Resilience & Incident Management",
        items: [
          ["Controlled Chaos Testing", "Inject synthetic latency, resource starvation, and pod terminations safely."],
          ["Automated Container Recovery", "Configure Kubernetes restart policies and health probes to restore crashed services."],
          ["Blameless Postmortems", "Document incident timelines, root causes, detection gaps, and preventive action items."],
        ],
      },
    ],
    links: [
      ["Google SRE Book - Service Level Objectives", "https://sre.google/sre-book/service-level-objectives/"],
      ["Prometheus Alerting Best Practices", "https://prometheus.io/docs/practices/alerting/"],
      ["Grafana Dashboards Guidance", "https://grafana.com/docs/grafana/latest/dashboards/"],
    ],
    mistakes: [
      [
        "Alerting on transient CPU or memory spikes instead of user impact",
        "CPU can spike to 90% during healthy batch jobs; alert only when user-facing requests are failing or exceeding latency SLOs.",
      ],
      [
        "Using average latency instead of 95th/99th percentiles",
        "Average latency conceals severe lag experienced by unlucky users; always measure p95 and p99 percentiles.",
      ],
      [
        "Writing a postmortem that blames human error",
        "Human error is a symptom, not the root cause; identify why the system allowed the mistake and build automated safeguards.",
      ],
      [
        "Setting unrealistic 100% availability SLOs",
        "100% reliability is impossible and prevents product innovation; choose realistic targets like 99.5% with managed error budgets.",
      ],
      [
        "Failing to verify that alerting rules actually fire under stress",
        "Always execute a controlled failure injection test to confirm Alertmanager fires and resolves as designed.",
      ],
    ],
    cvPatterns: [
      "Instrumented a containerized Kubernetes microservice with Prometheus RED metrics, tracking p95/p99 latency percentiles.",
      "Engineered a user-centric 99.5% SLO and error budget framework, reducing un-actionable on-call alert noise by [percentage].",
      "Constructed multi-window burn rate alert rules in Prometheus Alertmanager to detect rapid error budget depletion.",
      "Conducted chaos engineering experiments injecting synthetic latency, validating automated Kubernetes pod recovery.",
      "Authored a comprehensive blameless postmortem report with root cause analysis and preventative architectural remediations.",
    ],
    college: [
      "Confirm with your academic department that a Site Reliability Engineering, observability, and Kubernetes project meets internship criteria.",
      "Submit the official project brief detailing Prometheus metrics, SLO definitions, burn rate alerting, and incident postmortem milestones.",
      "Include PromQL query definitions, Grafana dashboard exports, Alertmanager configuration files, and postmortem documents in your report.",
      "Provide public GitHub access to your repository containing Kubernetes manifests, application code, and test scripts.",
      "Prepare a technical demonstration showing live Prometheus metric collection, alert firing, and automated container recovery.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, Kubernetes starter manifests, and evaluation criteria; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your instrumented service code, Grafana dashboard JSON, Alertmanager rules, and completed blameless postmortem report. An SRE evaluator reviews your SLI definitions, PromQL formulas, burn rate logic, and postmortem thoroughness. Approved projects receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "What is the difference between Site Reliability Engineering (SRE) and DevOps?",
        "DevOps focuses on continuous integration, build automation, containerization, and delivery pipelines. SRE focuses on production reliability, observability (Prometheus/Grafana), defining user-centric SLOs and error budgets, managing incidents, and conducting blameless postmortems.",
      ],
      [
        "Do I need an expensive multi-node cloud cluster to complete this project?",
        "No. You can run the entire Kubernetes cluster locally using free lightweight tools like Minikube or Kind (Kubernetes in Docker), running Prometheus and Grafana seamlessly on your development machine.",
      ],
      [
        "What is an error budget and why is it important?",
        "An error budget is the allowable amount of downtime or failed requests permitted by your SLO (e.g. 0.5% for a 99.5% SLO). It provides a data-driven balance between shipping new features quickly and maintaining system stability.",
      ],
      [
        "What are the RED metrics?",
        "The RED method focuses on three core user-centric indicators: Rate (number of requests per second), Errors (number of failing requests), and Duration (the amount of time requests take to complete).",
      ],
      [
        "How do I simulate a failure in my project?",
        "You use a load testing tool (such as k6 or Apache Bench) to generate synthetic traffic, while introducing artificial latency or resource constraints into your application code, causing error budgets to burn and triggering alerts.",
      ],
      [
        "What is a blameless postmortem?",
        "A blameless postmortem is an engineering retrospective that analyzes an outage without blaming individuals. It examines the timeline, technical root cause, and systemic improvements needed to prevent the failure from reoccurring.",
      ],
      [
        "How long does the programme take to finish?",
        "The curriculum is designed for 4 weeks of structured, self-paced progress: week 1 covers Prometheus instrumentation, week 2 covers SLOs and Grafana, week 3 covers burn rate alerting, and week 4 executes failure testing and the postmortem.",
      ],
      [
        "How can employers verify my SRE certificate?",
        "Each certificate features an official GreyRocks credential ID and a scannable QR verification code that displays your verified project scope and completion record on the online verification portal.",
      ],
    ],
    sibling: {
      href: "/internships/devops/",
      label: "Compare with DevOps",
      difference:
        "Site Reliability Engineering focuses on production observability, SLOs, error budget burn rates, and incident postmortems, whereas DevOps focuses on CI/CD pipelines, container builds, and deployment automation.",
    },
  },
};
