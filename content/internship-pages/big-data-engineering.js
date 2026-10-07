"use strict";

const bigDataDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Real-time Telemetry Streaming Architecture</title>
  <desc id="visual-desc">IoT sensors publish event streams to Apache Kafka partitioned topics, ingested by Spark Structured Streaming with watermark windowing, persisting validated metrics to PostgreSQL while routing malformed payloads to a quarantine dead-letter table.</desc>
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
    <text x="70" y="84" text-anchor="middle" class="dp-title">IoT Producers</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">telemetry events</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">STREAM BUFFER</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Apache Kafka</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">partitioned topic</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">STREAM ENGINE</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Spark Streaming</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">watermark logic</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">STORAGE</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">PostgreSQL</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">analytical sink</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">DEAD-LETTER QUEUE</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Quarantine Store</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">malformed records</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">ANALYTICS &amp; REPLAY</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Checkpointing</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">fault-tolerant recovery</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "big-data-engineering",
  name: "Big Data Engineering",
  primaryKeyword: "big data online internship with certificate",
  accent: "#1e5e8a",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Real-Time IoT Data Pipeline - Build a Kafka-to-Spark Structured Streaming pipeline that validates events and stores queryable results in PostgreSQL.",
    deliverables: [
      "Docker Compose orchestration file spinning up Kafka, Zookeeper/KRaft, Spark, and PostgreSQL services",
      "Event publisher script generating continuous synthetic IoT sensor records with intentional anomalies",
      "Apache Spark Structured Streaming job with schema validation, watermarking, and sliding window aggregations",
      "Relational PostgreSQL database schema including partitioned aggregate tables and a dead-letter quarantine store",
      "Pipeline reliability report verifying schema evolution handling, duplicate suppression, and restart recovery",
    ],
    taskOutline: [
      "Define versioned JSON event schemas and construct a Python generator publishing sensor readings to Kafka.",
      "Configure Apache Kafka topics with multiple partitions to support scalable parallel consumer streams.",
      "Author a Spark Structured Streaming application that validates event schemas and handles late-arriving data.",
      "Route malformed or corrupt sensor records into a quarantine dead-letter table while saving clean metrics to PostgreSQL.",
      "Validate end-to-end pipeline throughput, simulate service interruptions, and demonstrate checkpoint replay recovery.",
    ],
    validation:
      "Check schema evolution, duplicates, invalid records, late events, and service restart behavior.",
    toolsExpected:
      "Apache Kafka, Apache Spark (PySpark or Scala), Docker Compose, PostgreSQL, Python, and SQL.",
  },
  diagram: bigDataDiagram,
  content: {
    h1: "Build a Real-Time Streaming Pipeline in a Big Data Internship Project",
    summary:
      "This big data online internship with certificate is a fee-based, project-based internship programme that focuses on distributed data engineering and high-throughput streaming architectures. You build an end-to-end IoT data pipeline using Apache Kafka, Apache Spark Structured Streaming, and PostgreSQL, implementing schema validation, watermarking for late-arriving data, dead-letter queues, and fault-tolerant checkpoint recovery.",
    forYou: [
      "You want to build high-throughput data infrastructure capable of processing streaming events in real time.",
      "You appreciate core distributed systems principles: partitioning, offset management, consumer groups, and stream watermarks.",
      "You want to construct a production-style data pipeline portfolio project orchestrated with Docker Compose and PySpark.",
    ],
    notForYou: [
      "You only want to train statistical machine learning models; our Data Science programme focuses directly on predictive modeling.",
      "You want basic SQL dashboard reporting on static CSV spreadsheets without distributed streaming infrastructure.",
      "You believe Big Data pipelines can drop corrupted data silently without routing failures to a dead-letter quarantine queue.",
    ],
    buildIntro:
      "In modern enterprise architectures, data is not delivered in neat, static batches at midnight; it arrives as an endless, high-velocity stream of sensor readings, financial transactions, and user events. In this Big Data Engineering project, you design a Real-Time IoT Data Pipeline. You ingest high-frequency sensor readings into Apache Kafka, process the stream in micro-batches using Apache Spark Structured Streaming, enforce data quality standards by isolating invalid records in a dead-letter quarantine, and persist clean aggregated metrics into PostgreSQL for analytical querying.",
    projectNarrative: [
      "Distributed data engineering begins with reliable event ingestion. When thousands of IoT devices emit readings simultaneously, databases cannot accept direct point-to-point connections without crashing under connection overhead. You configure Apache Kafka as an immutable, partitioned message buffer. You design a versioned JSON event schema, establish topic partitioning to enable parallel consumer scaling, and author a synthetic event generator that simulates temperature, vibration, and pressure sensors.",
      "Stream processing with Apache Spark Structured Streaming provides scalable computation. Using PySpark or Scala, your streaming job consumes events from Kafka topics. You enforce schema constraints on every record. Real-world streams frequently contain out-of-order or delayed events due to network transmission lag; you implement event-time watermarking (e.g. 10-minute thresholds) and sliding window aggregations to calculate average sensor readings accurately without waiting indefinitely for late data.",
      "Data quality cannot be compromised by bad inputs. Rather than allowing corrupted records to crash the stream job or polluting downstream databases with bad data, your pipeline implements a dual-path branch. Records with invalid formats, missing mandatory fields, or physically impossible sensor values are immediately routed to a quarantine dead-letter table in PostgreSQL alongside error diagnostics, while clean records pass to aggregation tables.",
      "Fault tolerance and recovery establish operational durability. Distributed streaming jobs must survive node crashes and infrastructure restarts without duplicating data. You configure Spark checkpointing to persistent storage, which preserves read offsets and intermediate state. You execute controlled failure simulations (restarting Docker containers under load) and verify that the pipeline resumes from the last committed offset with zero data loss and exact-once processing semantics.",
    ],
    narrativeHeading: "From high-velocity Kafka event ingestion to fault-tolerant Spark streaming sinks",
    evidenceNotes: [
      "Complete Docker Compose configuration file orchestrating Kafka, Zookeeper/KRaft, Spark, and PostgreSQL.",
      "Python event generator script producing parameterized sensor telemetry with controllable anomaly ratios.",
      "PySpark Structured Streaming application code implementing schema validation, watermarking, and windowing.",
      "PostgreSQL database DDL creating analytical summary tables and quarantine dead-letter tables.",
      "Pipeline reliability benchmark documenting throughput, latency, schema rejection tests, and restart recovery.",
    ],
    progression: [
      [
        "Orchestrate",
        "Deploy a multi-service Docker Compose cluster orchestrating Kafka, Spark, and PostgreSQL environments.",
      ],
      [
        "Ingest to Kafka",
        "Publish versioned sensor telemetry to partitioned Kafka topics, verifying offset management and throughput.",
      ],
      [
        "Process Streams",
        "Author Spark Structured Streaming jobs applying explicit schemas, watermarking, and sliding window metrics.",
      ],
      [
        "Quarantine & Sink",
        "Route invalid records to a dead-letter quarantine table while upserting clean analytical aggregations to PostgreSQL.",
      ],
      [
        "Test Resilience",
        "Simulate service restarts, test late-arriving event boundaries, and confirm fault-tolerant checkpoint recovery.",
      ],
    ],
    selfCheck: [
      "Can you explain the difference between batch data processing and real-time streaming architectures?",
      "Do you know how Kafka topic partitions enable horizontal scaling across multiple consumer instances?",
      "Can you explain why event-time watermarking is necessary when processing late-arriving streaming events?",
      "Are you prepared to explain how your pipeline isolates corrupted data without dropping records or crashing?",
      "Can you demonstrate that your Spark streaming job resumes seamlessly from a checkpoint after a simulated restart?",
    ],
    skills: [
      {
        group: "Distributed Ingestion & Messaging",
        items: [
          ["Apache Kafka Architecture", "Manage topics, partitions, consumer groups, retention policies, and offsets."],
          ["Event Schema Design", "Author versioned JSON telemetry contracts supporting schema evolution."],
          ["Throughput & Backpressure", "Buffer high-frequency event bursts without overwhelming downstream sinks."],
        ],
      },
      {
        group: "Stream Processing & Analytics",
        items: [
          ["Spark Structured Streaming", "Execute micro-batch streaming transformations using the PySpark DataFrame API."],
          ["Watermarking & Windowing", "Handle out-of-order events using event-time sliding and tumbling windows."],
          ["Dead-Letter Queue (DLQ)", "Isolate malformed payloads into dedicated quarantine storage for investigation."],
        ],
      },
      {
        group: "Data Storage & Reliability",
        items: [
          ["PostgreSQL Analytical Sinks", "Design time-series storage tables and execute idempotent upsert operations."],
          ["Checkpoint Directory Recovery", "Preserve streaming state to guarantee fault tolerance across worker restarts."],
          ["Docker Container Orchestration", "Orchestrate complex distributed service stacks in reproducible local environments."],
        ],
      },
    ],
    links: [
      ["Apache Kafka Quickstart & Architecture", "https://kafka.apache.org/documentation/#quickstart"],
      ["Apache Spark Structured Streaming Guide", "https://spark.apache.org/docs/latest/structured-streaming-programming-guide.html"],
      ["PostgreSQL Official Documentation", "https://www.postgresql.org/docs/"],
    ],
    mistakes: [
      [
        "Dropping corrupted records silently without logging or quarantine",
        "Always route invalid events to a dead-letter quarantine table with timestamps and error reasons so engineers can debug issues.",
      ],
      [
        "Processing streaming data using system arrival time instead of event timestamp",
        "Network delays scramble arrival order; always use the event's embedded timestamp combined with watermarking.",
      ],
      [
        "Forgetting to configure persistent checkpoint directories in Spark",
        "Without persistent checkpoint storage, a restarted Spark job loses its offset position and reprocesses or skips data.",
      ],
      [
        "Connecting individual sensor producers directly to relational databases",
        "High-frequency write bursts exhaust database connection pools; always buffer streaming data through Kafka first.",
      ],
      [
        "Ignoring duplicate events caused by network retries",
        "Design your downstream database sink to perform idempotent writes (e.g. ON CONFLICT DO UPDATE) to prevent double counting.",
      ],
    ],
    cvPatterns: [
      "Engineered an end-to-end real-time Big Data pipeline in PySpark and Apache Kafka, processing [number] IoT sensor events per second.",
      "Implemented a dead-letter quarantine architecture isolating corrupted payloads and preventing streaming pipeline crashes.",
      "Configured Spark event-time watermarking and sliding window aggregations, handling late-arriving events up to [number] minutes delayed.",
      "Orchestrated a fault-tolerant distributed data infrastructure with Docker Compose, validating checkpoint replay across service restarts.",
      "Designed a PostgreSQL analytical database sink executing idempotent upsert transactions with sub-second query latency.",
    ],
    college: [
      "Confirm with your academic department that a Big Data engineering and real-time streaming pipeline project fulfills internship guidelines.",
      "Submit the official project brief detailing Kafka message buffering, Spark Structured Streaming, and PostgreSQL sink architecture.",
      "Include architectural block diagrams, Spark DAG execution screenshots, SQL query benchmarks, and quarantine table exports in your report.",
      "Provide public GitHub access to your repository containing Docker Compose files, PySpark jobs, and synthetic data producer scripts.",
      "Prepare a live terminal demonstration showcasing real-time event streaming and recovery after container restarts for your academic panel.",
    ],
    credential:
      "GreyRocks provides the formal technical assessment and credential verification infrastructure for HireeBridge programmes. Enrolment and fee payment grant access to the project specifications, container orchestration templates, and evaluation rubrics; they do not automatically award a completion certificate upon payment. To obtain your credential, you submit your completed codebase, Docker Compose configuration, execution logs, and benchmark report. A big data engineering evaluator reviews your Kafka partition design, Spark watermarking logic, quarantine handling, and checkpoint recovery. Approved projects earn an official credential with an unalterable ID and QR verification destination on GreyRocks.",
    faqs: [
      [
        "Do I need a paid cloud cluster (like AWS EMR or Databricks) to complete this project?",
        "No. You run the entire distributed architecture locally using Docker Compose, which spins up containerized instances of Kafka, Spark, and PostgreSQL on your machine with zero cloud expenditure.",
      ],
      [
        "What is the difference between Big Data Engineering and Data Science?",
        "Data Science focuses on training statistical and machine learning models to answer analytical questions. Big Data Engineering builds the distributed, scalable data pipelines (Kafka, Spark, storage sinks) that reliably transport, validate, and process massive volumes of data.",
      ],
      [
        "What is a dead-letter queue (DLQ) and why is it needed?",
        "In streaming data, corrupted or malformed records inevitably arrive. A dead-letter queue catches and stores these invalid records separately rather than letting them crash the entire streaming pipeline or corrupt analytical databases.",
      ],
      [
        "What programming language will I use for the Spark job?",
        "You can use Python with PySpark (the most common and accessible industry standard) or Scala. Both interfaces utilize the same underlying Spark Structured Streaming engine.",
      ],
      [
        "How do I prove that my pipeline handles service restarts?",
        "You simulate a failure by stopping the Spark container mid-stream, verifying that Kafka buffers events while Spark is down, and showing that upon restarting, Spark reads from the saved checkpoint and catches up without duplicating records.",
      ],
      [
        "Can I run this on an average student laptop?",
        "Yes. Standard modern laptops with 8GB to 16GB of RAM can run lightweight containerized single-node Kafka, Spark, and PostgreSQL instances smoothly using Docker Desktop.",
      ],
      [
        "How long does the programme take to finish?",
        "The curriculum is designed for 4 weeks of structured, self-paced progress: week 1 covers Docker and Kafka ingestion, week 2 covers Spark streaming and validation, week 3 covers quarantine sinks and PostgreSQL, and week 4 finalizes tests and benchmarks.",
      ],
      [
        "How do recruiters verify my Big Data certificate?",
        "Each certificate features an official GreyRocks credential ID and a scannable QR verification code that displays your verified project scope and completion record on the online verification portal.",
      ],
    ],
    sibling: {
      href: "/internships/data-science/",
      label: "Compare with Data Science",
      difference:
        "Big Data Engineering focuses on Kafka message streaming, Spark Structured Streaming pipelines, and high-throughput database sinks, whereas Data Science focuses on feature engineering, statistical modeling, and predictive algorithms.",
    },
  },
};
