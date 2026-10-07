"use strict";

const devopsDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">DevOps Deployment and Rollback Pipeline</title>
  <desc id="visual-desc">Automated continuous delivery pipeline building Docker images, validating staging gates, rolling updates to Kubernetes, and monitoring health probes with tested rollback runbooks.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">SOURCE</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Git Commit</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">branch rules</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">CI STAGE</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Lint &amp; Tests</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">gate checks</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">ARTIFACT</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Docker Image</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">registry push</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">DEPLOY</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Kubernetes</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">manifests</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">OBSERVABILITY</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Health Probes</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">liveness &amp; readiness</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">RECOVERY RUNBOOK</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Rollback Plan</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">verified state reset</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "devops",
  name: "DevOps",
  primaryKeyword: "devops online internship with certificate",
  accent: "#0b7f83",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Cloud-Native CI/CD Deployment - Create a cloud-native delivery pipeline using Docker, Kubernetes, GitHub Actions, and GitOps practices.",
    deliverables: [
      "Reproducible Dockerfile and multi-stage container build assets",
      "GitHub Actions CI pipeline workflow with lint, test, and security stages",
      "Kubernetes deployment manifests or Helm chart with resource bounds and probes",
      "GitOps deployment configuration and synchronization documentation",
      "Operational runbook with verified rollback and recovery steps",
    ],
    taskOutline: [
      "Containerize the provided service with multi-stage builds and minimal image layers.",
      "Build a GitHub Actions workflow that executes linting, unit tests, and image publishing.",
      "Write declarative Kubernetes manifests specifying CPU/memory limits and health probes.",
      "Document GitOps synchronization patterns and separation of application code from config.",
      "Execute a staged deployment test, record health check outputs, and demonstrate rollback.",
    ],
    validation:
      "Validate build reproducibility, pipeline execution logs, manifest syntax, health probe responses, and the documented rollback procedure.",
    toolsExpected:
      "Docker, Kubernetes (Minikube, Kind, or managed sandbox), GitHub Actions, Helm or Kustomize, and shell scripting.",
  },
  diagram: devopsDiagram,
  content: {
    h1: "Build a Cloud-Native Delivery Pipeline in a DevOps Internship Project",
    summary:
      "This devops online internship with certificate is a fee-based, project-based internship programme that focuses on building an automated software delivery pipeline with Docker, Kubernetes, and GitHub Actions. You containerize a sample microservice, configure automated verification, deploy to a test cluster, and document a verifiable rollback procedure.",
    forYou: [
      "You want to understand how code moves reliably from local development to a running cluster.",
      "You appreciate systematic verification: reproducible builds, automated tests, and declarative manifests.",
      "You want to produce an operational runbook that proves how an application recovers when a release encounters faults.",
    ],
    notForYou: [
      "You only want to write frontend interface components; our Frontend Development project is more relevant.",
      "You are looking for cloud vendor certifications (AWS/GCP/Azure); this programme teaches vendor-neutral engineering practices.",
      "You expect production root access to live enterprise clusters without completing foundational deployment exercises.",
    ],
    buildIntro:
      "In modern engineering teams, deploying software is not an occasional manual chore; it is an engineered software delivery system. In this DevOps project, you take a working sample service and build the delivery architecture around it. You package the application inside an optimized container image, configure continuous integration checks that reject broken commits before publication, construct declarative Kubernetes resources, and prove that an operator can diagnose and reverse an unhealthy release within minutes.",
    projectNarrative: [
      "A dependable delivery system begins with containerization. Rather than creating arbitrary container images, you implement a multi-stage Dockerfile that cleanly separates build dependencies from the final minimal runtime image. This keeps the distribution lightweight, avoids leaking compilation tools into running environments, and ensures that builds remain identical across development machines and automated runners.",
      "The continuous integration pipeline acts as the primary quality gate. Inside GitHub Actions, every pull request triggers linting checks, unit tests, and vulnerability scanning. Only when all automated checks succeed does the pipeline build and push a version-tagged container image to a container registry. You will configure secret variables properly rather than embedding sensitive credentials in configuration files.",
      "For cluster execution, declarative configuration takes precedence over manual commands. You define Kubernetes manifests covering Deployments, Services, and ConfigMaps, establishing explicit CPU and memory resource allocations alongside liveness and readiness probes. These health probes inform the cluster whether a container is prepared to handle user traffic or requires an automated restart.",
      "Operational resilience requires a proven rollback protocol. A release is only as safe as its recovery mechanism. Your project documentation includes a step-by-step runbook detailing how an engineer inspects deployment events, determines that a newly released version is failing, and executes a revision rollback to restore service availability without manual intervention.",
    ],
    narrativeHeading: "From checked commit to monitored cluster workload",
    evidenceNotes: [
      "Multi-stage Dockerfile demonstrating build separation and non-root execution.",
      "GitHub Actions workflow file showing sequential check, test, and package jobs.",
      "Kubernetes YAML manifests specifying resource limits, liveness probes, and readiness probes.",
      "Recorded terminal execution logs demonstrating successful cluster rollout and service reachability.",
      "Step-by-step rollback runbook detailing detection, command execution, and state verification.",
    ],
    progression: [
      [
        "Package",
        "Create a minimal, reproducible multi-stage container image with strict non-root user execution.",
      ],
      [
        "Automate",
        "Construct a GitHub Actions workflow that enforces linting, automated testing, and secure image tagging.",
      ],
      [
        "Declare",
        "Author declarative Kubernetes resources incorporating CPU/memory constraints and explicit health probes.",
      ],
      [
        "Observe",
        "Verify cluster deployment status, inspect pod logs, and confirm that readiness checks route traffic accurately.",
      ],
      [
        "Recover",
        "Simulate an application failure, execute the documented rollback procedure, and verify service restoration.",
      ],
    ],
    selfCheck: [
      "Can you explain the difference between a container image and a running container instance?",
      "Do you know why continuous integration pipelines must run tests on isolated ephemeral runners?",
      "Can you describe how Kubernetes readiness probes prevent routing traffic to uninitialized pods?",
      "Are you comfortable documenting environment variables without exposing sensitive secret values?",
      "Can you walk a reviewer through the exact commands required to roll back a problematic release?",
    ],
    skills: [
      {
        group: "Packaging & Build Automation",
        items: [
          ["Docker Multi-Stage Builds", "Construct lean, secure container images separating compilers from runtime binaries."],
          ["Image Tagging & Registries", "Manage semantic versioning and immutable image tags across container registries."],
          ["Environment Configuration", "Externalize runtime configuration using environment variables and configuration mounts."],
        ],
      },
      {
        group: "Continuous Integration",
        items: [
          ["GitHub Actions Workflows", "Model automated validation pipelines with distinct lint, test, and build jobs."],
          ["Secret Management", "Safeguard deployment tokens and registry keys using encrypted runner secrets."],
          ["Artifact Verification", "Ensure pipeline runs generate traceable build logs and verifiable artifacts."],
        ],
      },
      {
        group: "Orchestration & Operations",
        items: [
          ["Kubernetes Deployments", "Declare desired pod counts, rolling update strategies, and resource quotas."],
          ["Health Probes", "Configure liveness and readiness probes to maintain resilient application availability."],
          ["Rollback Runbooks", "Document operational failure modes and verified recovery procedures for on-call teams."],
        ],
      },
    ],
    links: [
      ["Docker Official Documentation", "https://docs.docker.com/"],
      ["Kubernetes Tasks & Concepts", "https://kubernetes.io/docs/concepts/"],
      ["GitHub Actions Documentation", "https://docs.github.com/en/actions"],
    ],
    mistakes: [
      [
        "Embedding secrets inside container images",
        "Never bake API keys or database passwords into Docker layers; inject them at runtime through environment variables or Kubernetes Secret objects.",
      ],
      [
        "Running containers as the root user",
        "Specify an unprivileged USER inside your Dockerfile to mitigate container breakout vulnerabilities.",
      ],
      [
        "Omitting container resource constraints",
        "Always declare CPU and memory requests and limits in Kubernetes to prevent a single faulty container from crashing host nodes.",
      ],
      [
        "Using mutable 'latest' tags in deployments",
        "Reference specific commit SHAs or semantic version tags so deployments remain fully deterministic and reversible.",
      ],
      [
        "Treating rollback as an afterthought",
        "Write and verify the rollback command sequence during initial pipeline development rather than waiting for an emergency.",
      ],
    ],
    cvPatterns: [
      "Built an automated CI/CD pipeline in GitHub Actions for a [technology] microservice, reducing deployment verification time by [percentage].",
      "Containerized a sample application using multi-stage Docker builds, trimming final runtime image size to [number] MB.",
      "Authored declarative Kubernetes manifests with customized liveness/readiness probes and enforced resource constraints.",
      "Documented an operational rollback runbook and validated zero-downtime rolling updates on a test cluster.",
      "Configured automated container vulnerability scanning and secret separation for reproducible deployment environments.",
    ],
    college: [
      "Verify with your department coordinator that a DevOps and cloud-native infrastructure project meets internship requirements.",
      "Submit the formal project brief detailing containerization, CI/CD pipelines, and Kubernetes deployment objectives.",
      "Ensure your evaluation report documents architecture diagrams, configuration files, and terminal verification logs.",
      "Maintain a version-controlled repository showcasing commit history, automated pipeline runs, and test records.",
      "Present the final operational runbook and live demonstration to your academic review committee if requested.",
    ],
    credential:
      "GreyRocks is the designated evaluation and verification authority for HireeBridge programmes. Enrolment and fee payment grant access to the task curriculum and project resources; they do not automatically award a credential. After you complete the delivery pipeline, push your repository assets, and submit your project documentation, a technical reviewer examines your work. Upon approval, an authentic certificate record is generated featuring a unique credential ID and QR code linking directly to the GreyRocks verification portal.",
    faqs: [
      [
        "What specific project will I build during this DevOps internship?",
        "You will build a Cloud-Native CI/CD Deployment project. You containerize an application service with Docker, build a GitHub Actions pipeline for automated linting and unit testing, create declarative Kubernetes manifests with health probes, and write an operational runbook detailing deployment and rollback verification.",
      ],
      [
        "Do I need an expensive public cloud account to complete this project?",
        "No. You can execute this project using local cluster tooling such as Minikube, Kind, or Docker Desktop Kubernetes, or using a free sandbox cluster. The core principles of containerization, continuous integration, and declarative orchestration remain identical.",
      ],
      [
        "How is this project evaluated by the review team?",
        "Reviewers check your Dockerfile for multi-stage efficiency and non-root execution, examine your GitHub Actions pipeline configuration and logs, verify that your Kubernetes manifests contain proper resource bounds and health checks, and review the clarity of your operational rollback runbook.",
      ],
      [
        "What is the difference between DevOps and Cloud Computing?",
        "Cloud Computing emphasizes infrastructure provisioning (VPCs, subnets, managed databases, IAM policies). DevOps focuses on the software delivery lifecycle: packaging code into containers, automated build pipelines, continuous integration gates, cluster deployment, and rapid rollback mechanisms.",
      ],
      [
        "Will I receive assistance if my pipeline encounters configuration errors?",
        "Depending on your selected plan, you receive comprehensive project documentation, reference implementations, and guided diagnostic notes to help you troubleshoot pipeline issues, Docker caching errors, and Kubernetes scheduling conditions.",
      ],
      [
        "How do I prove that my delivery pipeline actually works?",
        "You provide your repository link containing the workflow files and manifests, alongside execution logs showing green CI checks, container build outputs, and cluster status commands demonstrating healthy pods and service endpoints.",
      ],
      [
        "Can I complete this programme while attending college classes?",
        "Yes. The programme is self-paced over a four-week period, designed to allow university students to work through containerization, CI automation, and orchestration steps alongside their regular academic schedules.",
      ],
      [
        "How does the certificate verification work?",
        "Once your project submission is reviewed and approved, a verified certificate is issued by GreyRocks with a unique credential identifier and QR verification code that employers and university placement cells can validate online.",
      ],
    ],
    sibling: {
      href: "/internships/cloud-computing/",
      label: "Compare with Cloud Computing",
      difference:
        "Cloud Computing centres on Terraform infrastructure provisioning and VPC networking, while DevOps focuses on application containerization, CI/CD pipeline automation, and cluster deployment.",
    },
  },
};
