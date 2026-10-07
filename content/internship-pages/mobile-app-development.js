"use strict";

const mobileDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Offline-First Mobile Architecture and Sync Flow</title>
  <desc id="visual-desc">Mobile UI actions interact with reactive state management, persist instantly to local SQLite storage, buffer offline mutations, and synchronize with the remote API using exponential backoff retry logic upon network reconnection.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">MOBILE UI</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Flutter Screens</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">touch gestures</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">STATE LOGIC</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">State Notifier</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">Riverpod / Bloc</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">LOCAL CACHE</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">SQLite Store</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">sub-second persist</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">MUTATION QUEUE</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Offline Buffer</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">dirty flag records</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">NETWORK RECONNECT</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Background Sync</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">exponential backoff</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">CONFLICT RESOLUTION</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Reconciliation</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">last-write-wins policy</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "mobile-app-development",
  name: "Mobile App Development",
  primaryKeyword: "mobile app development online internship with certificate",
  accent: "#007a87",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Offline-First Task Management App - Build a Flutter task manager with local persistence and explicit offline/online synchronization states.",
    deliverables: [
      "Cross-platform Flutter application supporting task CRUD, status flags, and categorical filtering",
      "Local persistence layer utilizing SQLite (sqflite) ensuring complete state preservation across device restarts",
      "Network connectivity listener and offline mutation queue with exponential backoff synchronization",
      "Conflict resolution strategy and intuitive UI indicators displaying synced, pending, and error states",
      "Comprehensive test suite covering unit models, local database operations, and widget interactions",
    ],
    taskOutline: [
      "Construct responsive Flutter user interfaces supporting task creation, status updates, priority, and due dates.",
      "Integrate local SQLite storage to achieve immediate sub-second read and write persistence without network latency.",
      "Implement a network connectivity monitor that buffers pending mutations while the device is offline.",
      "Design an automated synchronization protocol that reconciles local queued changes with a backend API upon reconnect.",
      "Validate offline CRUD operations, app restart persistence, simulated network drops, and form validation.",
    ],
    validation:
      "Check offline CRUD, restart persistence, reconnect/sync, conflicts, and form validation.",
    toolsExpected:
      "Flutter SDK, Dart, SQLite (sqflite/drift), Riverpod or Bloc, Android Studio / VS Code, and simulated REST APIs.",
  },
  diagram: mobileDiagram,
  content: {
    h1: "Build an Offline-First Flutter App in a Mobile App Development Internship Project",
    summary:
      "This mobile app development online internship with certificate is a fee-based, project-based internship programme that focuses on production mobile client engineering. You build an offline-first Task Management application in Flutter, integrating local SQLite persistence, reactive state management, background synchronization queues, network state monitors, and robust conflict resolution protocols.",
    forYou: [
      "You want to build high-performance cross-platform mobile applications in Flutter that work seamlessly without an active internet connection.",
      "You appreciate real mobile architecture challenges: local database persistence, background mutation queues, and device lifecycle states.",
      "You want to publish a mobile portfolio project featuring clean Dart code, unit tests, and reliable offline-to-online data synchronization.",
    ],
    notForYou: [
      "You only want to write web applications; our Frontend Development programme focuses directly on React and browser DOM APIs.",
      "You want to rely entirely on live cloud APIs without writing local database persistence or offline fallback handling.",
      "You expect mobile apps to show a blocking error screen whenever the user walks into an elevator or loses cellular signal.",
    ],
    buildIntro:
      "On mobile devices, network connectivity is inherently volatile. Users frequently transition between cellular networks, Wi-Fi hotspots, and complete dead zones. A naive mobile app that stalls with loading spinners whenever the network drops frustrates users. In this Mobile App Development project, you build an Offline-First Task Management application in Flutter. You design an architecture where the local device database is the primary source of truth: user actions persist instantly to SQLite, pending mutations queue securely during disconnects, and background workers synchronize seamlessly once connectivity resumes.",
    projectNarrative: [
      "Mobile client engineering demands careful consideration of the mobile operating system lifecycle. Unlike web applications running inside desktop browser tabs, mobile apps face background suspension, low-memory terminations, and sudden network interruptions. Your Flutter application implements clean reactive state management (using Riverpod or Bloc) that decouples user interface components from underlying data persistence and networking services.",
      "The local persistence layer serves as the foundation of offline-first capability. When a user creates or edits a task, your application writes directly to a local SQLite database (using sqflite or Drift) rather than waiting for a remote server response. This ensures that UI interactions complete in under 50 milliseconds, providing an immediate, responsive experience regardless of external network latency.",
      "A resilient synchronization engine manages communication between local storage and remote servers. You implement a connectivity listener that monitors cellular and Wi-Fi state changes. While offline, all task modifications receive a 'pending' state flag and append to a persistent local mutation queue. When the device reconnects, a background sync service dispatches pending updates sequentially using exponential backoff retry algorithms.",
      "Conflict resolution and visual feedback complete the user experience. If a task was modified on another device while the local client was offline, your application applies an explicit conflict resolution rule (such as Last-Write-Wins with server timestamps). Throughout the interface, subtle status badges inform the user whether their data is synced, pending sync, or experiencing a network error, ensuring complete transparency without blocking user workflows.",
    ],
    narrativeHeading: "From volatile mobile network environments to resilient offline-first persistence",
    evidenceNotes: [
      "Flutter application repository containing clean modular Dart architecture and Riverpod/Bloc state models.",
      "SQLite database schema implementation demonstrating local indexing, CRUD operations, and version migrations.",
      "Synchronization service codebase showcasing network connectivity listeners and pending mutation queues.",
      "Demonstration recording showcasing offline task creation, app termination/restart, and automatic reconnect sync.",
      "Automated unit and widget test suite verifying local database persistence and state transitions.",
    ],
    progression: [
      [
        "Design Mobile UI",
        "Construct responsive Flutter screens incorporating accessible input forms, task cards, and filter tabs.",
      ],
      [
        "Persist Locally",
        "Implement SQLite schemas to achieve sub-second local reads and writes that survive complete application restarts.",
      ],
      [
        "Monitor Connectivity",
        "Integrate network state listeners to detect transitions between online and offline connectivity modes.",
      ],
      [
        "Queue Mutations",
        "Build a persistent change queue that buffers local edits with status flags during network disconnects.",
      ],
      [
        "Reconcile & Sync",
        "Execute background synchronization on reconnect, resolve data conflicts, and update visual sync indicators.",
      ],
    ],
    selfCheck: [
      "Can you explain why local SQLite persistence is essential for an offline-first mobile application?",
      "Do you understand how Riverpod or Bloc state management separates UI widgets from business logic in Flutter?",
      "Can you explain the Last-Write-Wins (LWW) conflict resolution strategy and its operational trade-offs?",
      "Are you prepared to demonstrate that tasks created while offline persist after force-quitting the app?",
      "Can your app handle network timeouts and intermittent cellular drops without crashing or locking the UI?",
    ],
    skills: [
      {
        group: "Flutter & Cross-Platform UI",
        items: [
          ["Flutter Widget Architecture", "Compose responsive, accessible mobile layouts adhering to Material Design."],
          ["Reactive State Management", "Implement unidirectional data flow using Riverpod or Bloc providers."],
          ["Form Validation & Input", "Handle keyboard focus, input validation rules, and date picker dialogs."],
        ],
      },
      {
        group: "Local Storage & Persistence",
        items: [
          ["SQLite (sqflite / Drift)", "Define structured relational tables, primary keys, and perform transactional CRUD operations."],
          ["Database Schema Migrations", "Manage versioned schema updates without corrupting existing local user data."],
          ["Restart Data Integrity", "Ensure local cached records persist reliably across application process terminations."],
        ],
      },
      {
        group: "Networking & Synchronization",
        items: [
          ["Network Connectivity Listeners", "Monitor real-time network reachability using connectivity state streams."],
          ["Offline Mutation Queueing", "Buffer pending REST mutations with retry logic and exponential backoff."],
          ["Conflict Resolution", "Implement timestamp-based reconciliation rules to resolve multi-client state conflicts."],
        ],
      },
    ],
    links: [
      ["Flutter Official Documentation", "https://docs.flutter.dev/"],
      ["sqflite SQLite Plugin for Flutter", "https://pub.dev/packages/sqflite"],
      ["Offline-First Mobile Architecture Patterns", "https://offlinefirst.org/"],
    ],
    mistakes: [
      [
        "Treating network disconnection as an error state with blocking modal popups",
        "Offline mode is a normal mobile state; allow users to view, create, and edit data locally with subtle status indicators.",
      ],
      [
        "Storing tasks only in in-memory state without persisting to SQLite",
        "Memory resets when the OS closes the app; always commit mutations to SQLite before updating the reactive state.",
      ],
      [
        "Dispatching simultaneous unordered sync requests on network reconnect",
        "Process pending mutations sequentially in chronological order to prevent out-of-order state overwrites.",
      ],
      [
        "Hardcoding layout pixel dimensions that break on different screen sizes",
        "Use MediaQuery, LayoutBuilder, and flexible widgets to adapt layouts seamlessly across diverse Android and iOS devices.",
      ],
      [
        "Failing to test app behavior during sudden process termination",
        "Simulate force-killing the app in the simulator immediately after adding a task to confirm database persistence.",
      ],
    ],
    cvPatterns: [
      "Architected an offline-first mobile task management application in Flutter using SQLite and Riverpod, achieving sub-50ms UI response times.",
      "Engineered an automated background synchronization engine with exponential backoff, syncing [number] offline mutations upon reconnect.",
      "Implemented a local SQLite database schema with transactional integrity, surviving complete device restarts with zero data loss.",
      "Designed a timestamped conflict resolution protocol and intuitive visual sync indicators (synced, pending, error).",
      "Constructed a suite of [number] unit and widget tests validating form boundaries, offline CRUD actions, and state transitions.",
    ],
    college: [
      "Confirm with your academic department that a cross-platform mobile application and offline architecture project satisfies internship requirements.",
      "Submit the official project brief detailing Flutter UI design, SQLite local database schemas, and network synchronization logic.",
      "Include database schema diagrams, state management architecture charts, widget test results, and APK screenshots in your final report.",
      "Provide public GitHub access to your repository containing complete Flutter source code and setup instructions.",
      "Prepare a live device or simulator demonstration showcasing offline creation, app restart, and reconnect sync for your university review panel.",
    ],
    credential:
      "GreyRocks serves as the independent evaluation and verification entity for HireeBridge technical programmes. Enrolment and fee payment grant access to the project specifications, starter schemas, and evaluation rubrics; they do not award a completion certificate upon payment alone. To receive certification, you submit your completed Flutter codebase, unit test logs, and a video demonstration exhibiting offline capability and reconnect synchronization. A mobile engineering evaluator reviews your SQLite schema, state architecture, and sync resilience. Approved submissions receive an official credential featuring a unique credential ID and QR code verifying authenticity on GreyRocks.",
    faqs: [
      [
        "Can I build this mobile app using React Native instead of Flutter?",
        "While the primary catalogue brief references Flutter and Dart with SQLite, you may implement the same architectural requirements using React Native with WatermelonDB or SQLite, provided you implement the offline persistence and sync queue.",
      ],
      [
        "Do I need a physical smartphone to develop and test this project?",
        "No. You can develop and test the entire application using Android Studio emulators or iOS simulators on your computer, both of which support simulating airplane mode and network disconnects.",
      ],
      [
        "How do I prove that my application works offline?",
        "You provide a video recording or automated test suite showing the emulator in airplane mode, creating and editing tasks, restarting the application to verify persistence, and then disabling airplane mode to show automatic background synchronization.",
      ],
      [
        "What backend API should I sync with?",
        "You can connect to a lightweight local REST API (built with Node.js/Express or Python), a mock server, or a free cloud backend. The core evaluation focus is on the mobile client's persistence, queuing, and conflict handling.",
      ],
      [
        "How is this different from Frontend Development?",
        "Frontend Development focuses on web browsers, DOM APIs, and CSS styling. Mobile App Development tackles native device lifecycles (pause/resume/kill), offline sandboxed databases, hardware connectivity states, and cross-platform mobile compilation.",
      ],
      [
        "Can I complete this project on Windows, macOS, or Linux?",
        "Yes. Flutter development for Android runs seamlessly across Windows, macOS, and Linux. (iOS simulation requires macOS, but Android emulation is fully sufficient to fulfill all project deliverables).",
      ],
      [
        "How long does the programme take to complete?",
        "The project is organized over 4 weeks of self-paced milestones: week 1 covers UI and state models, week 2 implements SQLite persistence, week 3 builds the sync engine, and week 4 finalizes tests and documentation.",
      ],
      [
        "Is the certificate verifiable online?",
        "Yes. Every certificate is registered on the GreyRocks verification portal with a unique credential ID and QR code, confirming your technical completion to recruiters and academic placement cells.",
      ],
    ],
    sibling: {
      href: "/internships/frontend-development/",
      label: "Compare with Frontend Development",
      difference:
        "Mobile App Development focuses on Flutter/Dart, SQLite local persistence, and offline synchronization, whereas Frontend Development focuses on React web applications, browser routing, and responsive web styling.",
    },
  },
};
