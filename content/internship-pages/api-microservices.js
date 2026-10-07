"use strict";

const microservicesDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Event-Driven Microservices Architecture and Message Bus</title>
  <desc id="visual-desc">Architecture showing client requests entering an API gateway, course catalog service persisting to PostgreSQL, publishing domain events to RabbitMQ topic exchanges, asynchronous consumer workers handling enrollments and notifications with idempotent deduplication, and dead-letter queues handling retries and failures.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">CLIENT ENTRY</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">REST Endpoints</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">FastAPI gateway</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">COURSE SERVICE</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Catalog Domain</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">PostgreSQL store</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">RABBITMQ</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Topic Exchange</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">AMQP message bus</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">CONSUMER</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Enrollment Svc</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">idempotent worker</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">DEAD LETTER QUEUE</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Retry Queue</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">quarantine payloads</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">SERVICE ISOLATION</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Database Per Svc</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">isolated schemas</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "api-microservices",
  factsKey: "api-microservices-architecture",
  catalogueDomain: "API & Microservices Architecture",
  name: "API & Microservices Architecture",
  primaryKeyword: "API microservices online internship with certificate",
  accent: "#2b5c8f",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Event-Driven E-learning Platform - Prototype service boundaries and asynchronous workflows with FastAPI, RabbitMQ, and PostgreSQL.",
    deliverables: [
      "Modular Python service codebase implementing isolated course catalog and enrollment domain boundaries with FastAPI",
      "Formal OpenAPI REST contracts and Pydantic event schemas defining asynchronous message payload standards",
      "Docker Compose environment orchestrating FastAPI services, RabbitMQ broker, and isolated PostgreSQL databases",
      "Architecture diagram and data flow documentation detailing service boundaries, queue topologies, and failure modes",
      "Operational runbook covering idempotent consumer deduplication, dead-letter retry logic, and health probe checks",
    ],
    taskOutline: [
      "Define bounded contexts for an e-learning platform, enforcing strict database-per-service isolation principles.",
      "Develop RESTful APIs using FastAPI with Pydantic validation schemas and automated OpenAPI documentation.",
      "Integrate RabbitMQ as an AMQP message broker, configuring topic exchanges and durable subscriber queues.",
      "Implement asynchronous event consumers with idempotent processing keys to handle network retries and duplicates safely.",
      "Orchestrate all containers using Docker Compose, implement health check endpoints, and test broker outage resilience.",
    ],
    validation:
      "Cover contracts, duplicate delivery, broker outage/retry, persistence, and service health.",
    toolsExpected:
      "FastAPI (Python 3.10+), RabbitMQ (AMQP broker), PostgreSQL, Pydantic v2, Docker and Docker Compose, pytest, and httpx.",
  },
  diagram: microservicesDiagram,
  content: {
    h1: "Build Scalable Distributed Systems in an API & Microservices Architecture Internship Project",
    summary:
      "This API microservices online internship with certificate is a fee-based, project-based internship programme focusing on distributed systems design, asynchronous event-driven architecture, and containerized microservice coordination. You prototype an event-driven e-learning platform using FastAPI, RabbitMQ, and PostgreSQL, enforce database-per-service isolation, implement idempotent message consumption, manage dead-letter retry queues, and orchestrate services using Docker Compose.",
    forYou: [
      "You want practical distributed systems experience moving beyond simple monolithic web applications.",
      "You want to understand event-driven messaging patterns, AMQP brokers (RabbitMQ), and asynchronous worker synchronization.",
      "You want to build a backend portfolio project showcasing service boundaries, idempotent consumers, Docker Compose, and resilience testing.",
    ],
    notForYou: [
      "You only want frontend UI styling; this project is an intensive backend distributed systems and systems architecture project.",
      "You believe microservices mean sharing a single monolithic database across all services; this project enforces strict database-per-service isolation.",
      "You assume network calls between services never fail; this project explicitly tests network drops, broker outages, and duplicate messages.",
    ],
    buildIntro:
      "Modern enterprise applications must handle massive scale, independent deployment cycles, and resilient fault isolation. When a single service slows down or crashes, it should not bring down the entire platform. In this microservices project, you architect an event-driven e-learning platform composed of autonomous services. Using FastAPI, RabbitMQ, and PostgreSQL, you design clean API contracts, establish asynchronous publish/subscribe workflows, handle duplicate deliveries with idempotency keys, and orchestrate the distributed ecosystem with Docker Compose.",
    projectNarrative: [
      "Distributed systems design starts with Domain-Driven Design (DDD) and bounded contexts. Rather than coupling all features into one monolithic database, you decompose the e-learning domain into distinct services: a Course Catalog Service managing syllabus records and an Enrollment Service managing student registrations and billing confirmations. You enforce the database-per-service pattern, ensuring that each microservice exclusively owns its private PostgreSQL database and exposes data solely through versioned APIs.",
      "Synchronous HTTP requests between internal services create tight coupling and cascading failure vulnerabilities. If service A waits for service B which waits for service C, a slowdown in C freezes the entire chain. To decouple your architecture, you integrate RabbitMQ as an asynchronous message broker. When an instructor publishes a new course or a student enrolls, the producer service publishes a domain event (`course.enrolled.v1`) to an AMQP topic exchange, immediately returning an HTTP 202 Accepted response to the client.",
      "Asynchronous message delivery in distributed networks introduces the reality of network retries and duplicate deliveries ('at-least-once' delivery). A student should never be billed twice because a network hiccup retransmitted an enrollment message. You engineer an idempotent message consumer. The consumer extracts a unique event ID or business correlation key, checks whether the transaction has already been recorded in a PostgreSQL deduplication table, and skips processing if already handled.",
      "Resilience testing proves your architecture can survive production faults. You implement Dead-Letter Exchanges (DLX) and retry queues in RabbitMQ to isolate malformed poisoned messages without blocking healthy traffic. You expose standardized `/health` and `/ready` probes on each FastAPI service. Using Docker Compose, you simulate broker outages and verify that services buffer transactions and reconnect automatically without human intervention. Finally, you author comprehensive operational runbooks and architectural schemas.",
    ],
    narrativeHeading: "From bounded contexts and REST contracts to RabbitMQ topic exchanges, idempotent consumers, and Docker orchestration",
    evidenceNotes: [
      "FastAPI service source code demonstrating bounded contexts, Pydantic data schemas, and REST endpoints.",
      "RabbitMQ AMQP messaging integration code featuring topic exchanges, routing keys, and consumer workers.",
      "Idempotency implementation scripts preventing duplicate processing on repeated event deliveries.",
      "Docker Compose orchestration file configuring services, database containers, and message broker networks.",
      "Resilience testing report documenting service recovery under simulated network drops and broker failures.",
    ],
    progression: [
      [
        "Service Boundaries",
        "Define bounded contexts, isolate PostgreSQL databases, and build REST APIs with FastAPI and Pydantic.",
      ],
      [
        "Event Architecture",
        "Deploy RabbitMQ broker, configure AMQP topic exchanges, and publish structured domain events.",
      ],
      [
        "Idempotent Consumers",
        "Build worker consumers with deduplication tables to safely process asynchronous events at-least-once.",
      ],
      [
        "Dead-Letter Handling",
        "Implement dead-letter queues and retry strategies to isolate malformed payloads without halting queues.",
      ],
      [
        "Docker & Resilience",
        "Orchestrate multi-container topology with Docker Compose, add health checks, and test broker outages.",
      ],
    ],
    selfCheck: [
      "Can you explain why the database-per-service pattern is preferred over a shared database in microservices architectures?",
      "Do you know why message delivery in distributed systems is typically at-least-once rather than exactly-once?",
      "Can you explain how an idempotency key prevents duplicate transactions when a consumer retries an event?",
      "How does an asynchronous message broker like RabbitMQ decouple producer services from downstream consumer workloads?",
      "What is the function of a Dead-Letter Exchange (DLX) in an enterprise messaging architecture?",
    ],
    skills: [
      {
        group: "Microservices Design & REST APIs",
        items: [
          ["Domain-Driven Design (DDD)", "Establish bounded contexts, aggregate roots, and database-per-service isolation."],
          ["FastAPI & OpenAPI Contracts", "Build high-performance REST APIs with strict Pydantic v2 request/response schemas."],
          ["Service Health Probes", "Implement liveness and readiness endpoints for container health monitoring."],
        ],
      },
      {
        group: "Asynchronous Messaging & RabbitMQ",
        items: [
          ["AMQP Exchange & Queue Topologies", "Design topic exchanges, routing keys, and durable queue subscriptions."],
          ["Idempotent Message Processing", "Implement deduplication tracking to safely handle duplicated event deliveries."],
          ["Dead-Letter & Retry Workflows", "Route failed or poisoned payloads to dead-letter queues for triage without blocking."],
        ],
      },
      {
        group: "Containerization & Resilience Testing",
        items: [
          ["Docker Compose Multi-Container Orchestration", "Define multi-service networks, volumes, and dependency startup ordering."],
          ["Fault Injection & Outage Testing", "Simulate message broker and database downtime to verify reconnect resilience."],
          ["Operational Documentation", "Author architecture diagrams, contract schemas, and operational troubleshooting runbooks."],
        ],
      },
    ],
    links: [
      ["FastAPI Framework Documentation", "https://fastapi.tiangolo.com/"],
      ["RabbitMQ Official Tutorials (Python pika)", "https://www.rabbitmq.com/tutorials/tutorial-one-python.html"],
      ["Microservices Architecture Patterns (Martin Fowler)", "https://martinfowler.com/articles/microservices.html"],
    ],
    mistakes: [
      [
        "Sharing a single database across multiple microservices",
        "Shared databases create tight schema coupling and defeat independent deployment; each service must own its private datastore.",
      ],
      [
        "Assuming message brokers provide magic exactly-once delivery",
        "Distributed networks deliver messages at-least-once; consumers must be idempotent to prevent duplicate operations.",
      ],
      [
        "Using synchronous HTTP calls for all inter-service communications",
        "Chaining synchronous REST calls creates cascading bottlenecks and high latency; use asynchronous messaging for background workflows.",
      ],
      [
        "Allowing poisoned messages to block consumer queues indefinitely",
        "A malformed event that constantly crashes a consumer halts the entire queue; route unprocessable messages to a dead-letter queue.",
      ],
      [
        "Omitting health check probes in container configurations",
        "Containers must signal when they are ready to receive traffic; configure /health endpoints in Docker Compose.",
      ],
    ],
    cvPatterns: [
      "Architected an event-driven e-learning microservices platform using FastAPI, RabbitMQ, and PostgreSQL.",
      "Enforced Domain-Driven Design and database-per-service isolation across course catalog and enrollment bounded contexts.",
      "Engineered an AMQP messaging pipeline with topic exchanges and asynchronous workers processing domain events.",
      "Implemented idempotent message deduplication and dead-letter retry queues, eliminating duplicate transactions during retries.",
      "Orchestrated multi-service local deployment with Docker Compose, including liveness health probes and outage recovery.",
    ],
    college: [
      "Confirm with your academic supervisor that a microservices architecture and distributed systems project meets internship criteria.",
      "Submit the official project brief outlining domain decomposition, RabbitMQ integration, and Docker Compose deliverables.",
      "Include system architecture diagrams, API contract specifications, and resilience testing logs in your final report.",
      "Provide public GitHub repository access containing service source code, Docker Compose manifests, and execution guides.",
      "Prepare a technical demonstration simulating service interactions, event publishing, duplicate delivery handling, and container health.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, microservices starter architecture, and evaluation rubric; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your multi-service codebase, OpenAPI contracts, Docker Compose configuration, architecture diagrams, and operational resilience notes. A distributed systems evaluator reviews your service boundaries, messaging patterns, idempotency handling, and fault recovery. Approved submissions receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Do I need cloud infrastructure to complete this project?",
        "No. The entire multi-service ecosystem (FastAPI services, RabbitMQ broker, and PostgreSQL databases) is orchestrated locally using Docker and Docker Compose on your own computer.",
      ],
      [
        "Why use RabbitMQ instead of just calling REST endpoints directly?",
        "Direct HTTP calls couple services together: if the recipient service is slow or offline, the caller fails or hangs. RabbitMQ enables asynchronous processing, decouples services, and buffers spikes in traffic.",
      ],
      [
        "What is idempotency and why does it matter in microservices?",
        "An idempotent operation produces the exact same result whether executed once or ten times. Because distributed networks can re-send messages after timeouts, idempotency ensures users are not charged twice or double-enrolled.",
      ],
      [
        "What programming language is used?",
        "The project is implemented in Python using the FastAPI framework, but the architectural principles (AMQP, event-driven design, containerization) apply universally across Go, Java, and Node.js.",
      ],
      [
        "What is a dead-letter queue?",
        "A dead-letter queue (DLQ) is a dedicated queue where messages that cannot be processed successfully after maximum retry attempts are isolated for developer inspection, preventing them from clogging the main queue.",
      ],
      [
        "What is the difference between this project and Backend Development?",
        "Backend Development focuses on building a single robust web application, relational database modeling, and user authentication. API & Microservices focuses on distributed systems, multiple cooperating services, message brokers, and asynchronous event streams.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced progress: week 1 covers service boundaries and FastAPI REST contracts, week 2 covers RabbitMQ topic exchanges, week 3 covers idempotent consumers and dead-letter queues, and week 4 finalizes Docker Compose and resilience testing.",
      ],
      [
        "How do employers verify my microservices credential?",
        "Each certificate includes a unique GreyRocks credential ID and QR verification code that links to an online verification portal displaying your verified distributed systems project details and technical evaluation score.",
      ],
    ],
    sibling: {
      href: "/internships/backend-development/",
      label: "Compare with Backend Development",
      difference:
        "API & Microservices Architecture focuses on distributed service boundaries, RabbitMQ event brokers, idempotent consumers, and multi-container Docker Compose networks, whereas Backend Development focuses on a single monolithic REST API and relational schema.",
    },
  },
};
