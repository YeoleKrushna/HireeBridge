"use strict";

const systemsRustDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Rust Concurrency and Thread Pool Architecture</title>
  <desc id="visual-desc">Architecture showing a main TCP listener binding to a port and accepting incoming connections, dispatching stream jobs into a bounded thread-safe job channel protected by Arc and Mutex, a fixed worker thread pool executing non-blocking request parsing and route handling, and a graceful shutdown handler executing drop semantics.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">TCP LISTENER</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">TcpListener</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">bind &amp; accept loop</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">JOB CHANNEL</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Arc Channel</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">thread-safe queue</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">WORKER POOL</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Fixed Workers</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">bounded pool</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">DISPATCHER</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">HTTP Parser</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">methods &amp; routes</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">SAFETY &amp; OWNERSHIP</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Data Race Free</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">compile guarantees</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">GRACEFUL SHUTDOWN</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Drop Semantics</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">clean thread join</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "systems-rust",
  factsKey: "systems-programming-in-rust",
  catalogueDomain: "Systems Programming in Rust",
  name: "Systems Programming in Rust",
  primaryKeyword: "Rust systems programming online internship with certificate",
  accent: "#a3481f",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Multithreaded HTTP Server in Rust - Implement a Rust TCP server with basic HTTP parsing, thread pool, routing, and robust error handling.",
    deliverables: [
      "Rust CLI/server binary implementing TCP stream handling, HTTP request parsing, and response serialization",
      "Custom thread pool implementation utilizing Arc, Mutex, and mpsc channels for safe worker management",
      "Unit and integration test suite verifying routing, header parsing, error codes, and concurrent throughput",
      "Technical usage documentation specifying command-line flags, supported HTTP subset, and API endpoints",
      "Benchmarking report measuring request latency and throughput under concurrent load using wrk or k6",
    ],
    taskOutline: [
      "Bind a TCP listener using Rust standard library primitives and parse raw stream bytes into HTTP request structs.",
      "Architect a bounded worker thread pool to eliminate unbounded thread spawning vulnerabilities.",
      "Implement route matching, HTTP status code generation (200, 400, 404, 500), and custom error handling without panics.",
      "Incorporate graceful shutdown signals by implementing the Drop trait to join all active worker threads cleanly.",
      "Execute automated tests against malformed inputs, run concurrency benchmarks, and author comprehensive documentation.",
    ],
    validation:
      "Cover routing, headers/statuses, malformed requests, concurrency bounds, and shutdown.",
    toolsExpected:
      "Rust (rustc and Cargo), Rust standard library (std::net, std::sync, std::thread), cargo test, and benchmarking tools (wrk, k6, or curl).",
  },
  diagram: systemsRustDiagram,
  content: {
    h1: "Master Concurrency and Memory Safety in a Rust Systems Programming Internship Project",
    summary:
      "This Rust systems programming online internship with certificate is a fee-based, project-based internship programme that focuses on systems software engineering, memory safety, and concurrent network architecture. You implement a high-performance multithreaded HTTP server from foundational TCP primitives in Rust, build a custom thread pool utilizing ownership and synchronization types, handle raw HTTP request parsing, ensure graceful shutdown, and benchmark concurrent request throughput.",
    forYou: [
      "You want deep hands-on mastery of Rust's ownership, borrowing, lifetime models, and fearless concurrency guarantees.",
      "You want to build systems-level network software from first principles without relying on monolithic black-box web frameworks.",
      "You want to showcase a systems programming portfolio project demonstrating thread pool internals, error handling, and performance benchmarks.",
    ],
    notForYou: [
      "You only want to build simple CRUD forms with existing full-stack frameworks; our Full-Stack programme covers higher-level web development.",
      "You avoid low-level concepts like sockets, byte buffers, threads, and mutexes; this project is built close to the operating system.",
      "You rely on runtime garbage collection; Rust manages memory deterministically at compile time without a runtime collector.",
    ],
    buildIntro:
      "Systems programming requires building software that is blazingly fast, memory-safe, and resilient under heavy concurrent loads. Rust has emerged as the premier language for systems development because it delivers bare-metal C++ performance with compile-time memory safety and fearless concurrency. In this project, you engineer a multithreaded HTTP/1.1 server from scratch using Rust's standard library. You will build a bounded worker thread pool, parse raw TCP streams into structured requests, implement routing without runtime panics, and enforce clean graceful termination.",
    projectNarrative: [
      "Systems engineering begins at the operating system socket layer. You bind a `TcpListener` to a local network port and listen for incoming client streams. Instead of relying on a high-level framework that obscures protocol mechanics, you read raw bytes from the TCP socket buffer into memory. You design a protocol parser that handles HTTP request lines (method, URI, protocol version), headers, and message bodies, rigorously guarding against malformed requests and partial stream reads.",
      "Handling concurrent traffic requires disciplined architectural choices. Spawning a new OS thread for every incoming connection creates severe denial-of-service risks through thread exhaustion. Instead, you design and implement a custom bounded thread pool. You create a fixed collection of worker threads that safely listen to a shared job receiver queue wrapped in `Arc<Mutex<mpsc::Receiver<Job>>>`. Rust's type system statically verifies that data cannot race between threads at compile time.",
      "Error handling in production systems must be resilient and non-panicking. You leverage Rust's `Result<T, E>` and `Option<T>` types rather than reckless `unwrap()` calls that crash the server process. If an invalid or malicious HTTP request is received, your parser returns structured error variants mapped to HTTP 400 Bad Request responses, ensuring the server stays online and responsive to other clients.",
      "A professional systems daemon must shut down cleanly without dropping in-flight transactions or leaking OS resources. You implement the `Drop` trait for your thread pool. When an interrupt signal (such as Ctrl+C) is received, the main thread terminates the channel, sends termination messages to all worker threads, waits for each thread to finish its active task, and joins them cleanly. Finally, you execute rigorous concurrency benchmarks using tools like wrk or k6 to quantify throughput and latency.",
    ],
    narrativeHeading: "From TCP socket primitives to bounded thread pools, error handling, and graceful shutdown",
    evidenceNotes: [
      "Rust codebase organized with clean Cargo workspace structure and zero compiler warnings.",
      "Custom thread pool implementation featuring Arc, Mutex, and mpsc channel synchronization.",
      "Unit and integration test suite executing automated verification of routing and malformed requests.",
      "Comprehensive benchmarking logs documenting requests per second and latency percentiles under load.",
      "Technical architecture documentation detailing memory safety invariants and protocol handling.",
    ],
    progression: [
      [
        "TCP Socket Server",
        "Bind a TCP listener using std::net and read raw connection byte streams from incoming clients.",
      ],
      [
        "HTTP Protocol Parser",
        "Parse methods, paths, and headers from byte streams, mapping invalid requests to 400 status codes.",
      ],
      [
        "Bounded Thread Pool",
        "Engineer a fixed worker thread pool using Arc and Mutex to distribute tasks across threads safely.",
      ],
      [
        "Routing & Safety",
        "Implement route matching, static responses, and non-panicking error handling with custom Result types.",
      ],
      [
        "Graceful Shutdown",
        "Implement the Drop trait to join worker threads cleanly and benchmark throughput under concurrent load.",
      ],
    ],
    selfCheck: [
      "Can you explain why Rust's ownership model eliminates data races at compile time?",
      "Do you know why Arc<Mutex<T>> is necessary when sharing mutable channel receivers across threads?",
      "Can you explain what happens if an unhandled panic occurs inside a worker thread in your pool?",
      "Why is a bounded thread pool safer than spawning a new thread for every incoming TCP connection?",
      "How does implementing the Drop trait ensure operating system resources and in-flight requests finish cleanly?",
    ],
    skills: [
      {
        group: "Systems Architecture & Rust Fundamentals",
        items: [
          ["Ownership, Borrowing & Lifetimes", "Apply Rust's core memory model to ensure zero memory leaks without garbage collection."],
          ["TCP Socket Programming", "Bind network sockets, stream raw bytes, and manage buffer allocations directly."],
          ["Protocol Parsing & Serialization", "Parse HTTP/1.1 syntax and construct RFC-compliant HTTP response streams."],
        ],
      },
      {
        group: "Concurrency & Synchronization",
        items: [
          ["Thread Pool Architecture", "Design bounded worker pools to manage CPU-bound and I/O-bound concurrency."],
          ["Thread Synchronization Primitives", "Master Arc (atomic reference counting), Mutex locks, and mpsc message channels."],
          ["Drop Semantics & Clean Shutdown", "Implement RAII patterns and thread join semantics for graceful process termination."],
        ],
      },
      {
        group: "Resilience & Performance Benchmarking",
        items: [
          ["Non-Panicking Error Handling", "Replace unwrap with idiomatic Result and Option chaining for production stability."],
          ["Automated Concurrency Testing", "Write unit and integration tests simulating concurrent clients and edge-case inputs."],
          ["Performance Benchmarking", "Evaluate latency distributions and throughput using load tools like wrk or k6."],
        ],
      },
    ],
    links: [
      ["The Rust Programming Language Book - Building a Multithreaded Web Server", "https://doc.rust-lang.org/book/ch20-00-final-project-a-web-server.html"],
      ["Rust Standard Library - std::sync Documentation", "https://doc.rust-lang.org/std/sync/"],
      ["Rust API Guidelines for Systems Software", "https://rust-lang.github.io/api-guidelines/"],
    ],
    mistakes: [
      [
        "Using unwrap() or expect() in production request paths",
        "An unhandled unwrap on an invalid client header panics the worker thread; always return Result with an HTTP 400 response.",
      ],
      [
        "Spawning an unbounded thread per connection",
        "Under high load, unbounded thread spawning exhausts OS file descriptors and crashes the machine; always use a bounded pool.",
      ],
      [
        "Holding a Mutex lock across slow I/O operations",
        "Locking a shared mutex while reading a slow network stream blocks other workers; unlock state before performing I/O.",
      ],
      [
        "Ignoring graceful shutdown on process signals",
        "Abruptly terminating the process drops active HTTP requests; implement Drop to join threads and flush buffers.",
      ],
      [
        "Failing to benchmark with realistic concurrency limits",
        "Benchmarking with a single client conceals locking bottlenecks; test with high concurrency to observe thread contention.",
      ],
    ],
    cvPatterns: [
      "Engineered a multithreaded HTTP/1.1 server from scratch in Rust using std::net primitives and a custom thread pool.",
      "Designed a thread-safe task distribution queue utilizing Arc<Mutex<mpsc::Receiver<Job>>> with compile-time race freedom.",
      "Implemented RFC-compliant HTTP stream parsing and route dispatching with zero-panic Result error handling.",
      "Architected graceful shutdown mechanics using the Drop trait to join active worker threads without dropping in-flight requests.",
      "Conducted load benchmarking with wrk, measuring throughput of [number] req/sec with sub-millisecond p99 latency.",
    ],
    college: [
      "Confirm with your academic supervisor that a Rust systems programming and concurrency project meets internship requirements.",
      "Submit the official project brief outlining TCP server implementation, thread pool architecture, and benchmarking deliverables.",
      "Include concurrency architecture diagrams, thread synchronization explanations, and benchmark charts in your final report.",
      "Provide public GitHub repository access containing Cargo files, source code, test suites, and setup guides.",
      "Prepare a technical demonstration executing concurrent client requests, testing malformed inputs, and verifying graceful shutdown.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, systems programming starter guidelines, and evaluation rubric; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your Rust codebase, unit test results, benchmarking report, and technical architecture documentation. A systems engineering evaluator reviews your ownership patterns, concurrency primitives, thread safety invariants, and error resilience. Approved projects receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Why build an HTTP server in Rust without using Actix or Axum?",
        "Production frameworks abstract away the lower-level systems concepts. By building the server directly with TCP sockets, thread pools, and mutexes, you master the foundational principles of networking, concurrency, and memory management.",
      ],
      [
        "Do I need advanced Rust experience before enrolling?",
        "A foundational understanding of programming (such as basic syntax, variables, and control flow) in C, C++, Python, or Rust is helpful. The project guide walks you through Rust's unique ownership, borrowing, and concurrency models step-by-step.",
      ],
      [
        "What is the difference between this project and Backend Development?",
        "Backend Development focuses on high-level business APIs, database ORMs, and web application logic. Rust Systems Programming focuses on low-level OS socket handling, memory layouts, custom thread pool mechanics, and concurrency safety.",
      ],
      [
        "What operating systems are supported?",
        "Rust and Cargo run natively on Windows, macOS, and Linux. The project uses standard library primitives that compile and execute seamlessly across all three platforms.",
      ],
      [
        "How is memory safety guaranteed without a garbage collector?",
        "Rust uses a compile-time ownership system with strict borrowing rules. The compiler verifies at build time that memory is allocated and freed deterministically without null pointer dereferences or memory leaks.",
      ],
      [
        "What benchmark tools should I use?",
        "You can use lightweight open-source benchmarking tools like wrk, k6, or Apache Bench to generate concurrent traffic and measure requests per second and latency distributions.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced progress: week 1 covers TCP sockets and HTTP parsing, week 2 covers thread pool design, week 3 covers routing and error handling, and week 4 finalizes shutdown and benchmarking.",
      ],
      [
        "How do employers verify my Rust credential?",
        "Each certificate features a unique GreyRocks credential ID and QR verification code that links to an online verification portal displaying your verified systems engineering project and code review results.",
      ],
    ],
    sibling: {
      href: "/internships/backend-development/",
      label: "Compare with Backend Development",
      difference:
        "Systems Programming in Rust focuses on socket-level TCP networking, thread pool concurrency internals, and compile-time memory safety, whereas Backend Development focuses on high-level REST APIs, database schemas, and business logic.",
    },
  },
};
