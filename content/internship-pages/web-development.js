"use strict";

const webDevDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">College Event Portal Web Architecture</title>
  <desc id="visual-desc">A responsive web portal connecting event discovery with client-side form validation, role-aware routing, persistent event records, and administrative management views.</desc>
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
    <text x="70" y="84" text-anchor="middle" class="dp-title">Event Catalog</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">search &amp; filter</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">REGISTRATION</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Student Form</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">input validation</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">CAPACITY</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Seat Tracker</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">limit enforcement</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">PERSISTENCE</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Event Database</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">stored records</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">ADMIN DASHBOARD</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Organizer View</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">attendee review</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">STATUS FEEDBACK</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Accessible UI</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">success &amp; errors</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "web-development",
  name: "Web Development",
  primaryKeyword: "web development online internship with certificate",
  accent: "#b2673c",
  qualityGatesPassed: true,
  diagram: webDevDiagram,
  facts: {
    taskBrief:
      "College Event Management Portal - build a responsive portal with event discovery, registration, role-aware views and a clear workflow.",
    deliverables: [
      "A responsive web portal",
      "An event and registration workflow",
      "Clearly identified sample data",
      "A setup guide",
    ],
    taskOutline: [
      "List events with date, venue, capacity and registration status.",
      "Add search, filtering and event detail views that work on mobile.",
      "Validate registration and prevent duplicate demonstration registrations.",
      "Provide organiser or administrator views for event and registration management.",
      "Show accessible success, validation and capacity states.",
    ],
    validation:
      "Check search and filtering, registration validation, capacity, duplicate handling and small-screen behaviour.",
  },
  content: {
    metaTitle: "College Event Portal Web Development Internship | HireeBridge",
    h1: "Build a College Event Portal in a Web Development Internship Project",
    h2Overrides: {
      "Who this project fits and who it does not":
        "Does a complete web workflow match your learning goal?",
      "Move from question to reviewable evidence":
        "Implement the student registration flow step by step",
      "Is this project a reasonable learning fit?":
        "Check your readiness for browser-to-server work",
      "Build capability in a realistic order":
        "Build semantic, responsive and validated web skills",
      "Common Web Development project mistakes":
        "Event portal mistakes to resolve before review",
      "Draft an honest CV bullet":
        "Turn portal evidence into an accurate CV bullet",
      "Check with your college before enrolling":
        "Verify the event portal scope with your college",
      "Completion comes before the credential":
        "Complete the portal workflow before approval",
      "Web Development programme FAQ": "College event portal questions",
      "Read the plan details before you decide.":
        "Review the web programme terms before starting.",
    },
    summary:
      "This fee-based, project-based educational programme asks you to build a college event management portal. You submit your own responsive product implementation, registration workflow, sample data and setup evidence. After review and explicit approval, the certificate record includes a unique credential ID and QR destination for GreyRocks verification.",
    forYou: [
      "You want to understand how browser interfaces, server routes and stored records cooperate in one student-facing workflow.",
      "You can test the same workflow with a keyboard, a narrow phone viewport and realistic empty or error states.",
      "You are ready to document setup and decisions so another person can run the portal.",
    ],
    notForYou: [
      "You are seeking employment or a job offer rather than a project-based educational programme.",
      "You only want to reproduce a visual mock-up without implementing registration rules and data flow.",
      "You require guaranteed institutional acceptance. Your college decides whether the programme meets its requirement.",
    ],
    buildIntro:
      "The portal is a product workflow, not a collection of disconnected screens. A student needs to discover an event, understand its date, venue and capacity, submit valid information, and receive a clear outcome. An organiser needs a role-aware view of events and registrations. Your implementation should keep these journeys coherent across browser, server and data boundaries.",
    progression: [
      [
        "Map the journeys",
        "Describe how a student discovers and registers for an event and how an organiser manages event records. Identify permissions and failure states before coding.",
      ],
      [
        "Build semantic views",
        "Create event lists and details with meaningful landmarks, headings, labels and links. Begin with a narrow screen and enhance the layout at larger widths.",
      ],
      [
        "Define HTTP behaviour",
        "Connect forms and controls to clear request routes. Validate on the server even when the browser also provides immediate feedback.",
      ],
      [
        "Protect registration rules",
        "Prevent duplicate demonstration registrations, handle capacity consistently, and make data changes predictable when requests are repeated.",
      ],
      [
        "Test the complete loop",
        "Exercise search, filtering, details, registration, capacity and organiser views with keyboard and mobile checks, then document how to reproduce the result.",
      ],
    ],
    skills: [
      {
        group: "Interface",
        items: [
          [
            "HTML",
            "Express content and controls with semantic elements before adding behaviour.",
          ],
          [
            "CSS",
            "Build responsive composition, readable states and predictable focus treatment.",
          ],
          [
            "JavaScript",
            "Enhance interactions while keeping core content and form meaning available in HTML.",
          ],
        ],
      },
      {
        group: "Application flow",
        items: [
          [
            "HTTP",
            "Understand request methods, status outcomes and the boundary between browser and server.",
          ],
          [
            "Server routes",
            "Validate input, enforce registration rules and return understandable errors.",
          ],
          [
            "Data storage",
            "Represent events and registrations with stable identifiers and explicit relationships.",
          ],
        ],
      },
      {
        group: "Quality",
        items: [
          [
            "Accessibility checks",
            "Test labels, focus order, status messages and keyboard completion.",
          ],
          [
            "Responsive testing",
            "Inspect content at phone, tablet and desktop widths without horizontal overflow.",
          ],
          [
            "Documentation",
            "Record prerequisites, commands, sample accounts and known limitations.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Building desktop first and shrinking later",
        "Event metadata, filters and forms often collapse badly. Start from the student’s phone workflow and add space progressively.",
      ],
      [
        "Trusting browser validation alone",
        "Client-side feedback helps users, but the server must still reject missing fields, malformed input, duplicates and full events.",
      ],
      [
        "Hiding state in colour",
        "Registration open, full, successful and failed states need text that remains clear without colour perception.",
      ],
      [
        "Ignoring repeat requests",
        "Refreshing or pressing a button twice should not silently create duplicate demonstration registrations. Define idempotent or guarded behaviour.",
      ],
      [
        "Using sample data as if it were live",
        "Label synthetic events and attendees clearly. Do not imply that named people or institutions use the portal.",
      ],
    ],
    cvPatterns: [
      "Built a responsive event portal using [frontend tool] and [server tool], covering discovery, detail and registration journeys.",
      "Implemented server-side validation for [number] registration rules, including duplicate and capacity handling.",
      "Designed role-aware organiser views for managing [event/registration] records with documented permissions.",
      "Tested keyboard navigation and layouts at [viewport widths], recording and resolving [issue type] defects.",
      "Documented local setup, sample data and reproduction steps for a reviewer-facing repository.",
    ],
    selfCheck: [
      "Can you describe the complete student registration flow before choosing components?",
      "Will you implement validation on the server as well as helpful browser feedback?",
      "Can you test open, full, invalid, duplicate and successful registration states?",
      "Are you prepared to use synthetic records and label them clearly?",
      "Will you verify keyboard use and small-screen layout, not only a desktop screenshot?",
    ],
    college: [
      "Ask whether a project-based educational programme can satisfy the specific internship or project requirement.",
      "Show your T&P or placement cell the College Event Management Portal scope and planned evidence.",
      "Confirm duration, reporting template, supervision, signatures and submission dates in writing.",
      "Keep source history, responsive screenshots, test evidence and your setup guide together.",
      "Compare the official free AICTE internship portal if your institution expects a listed opportunity or a different process.",
    ],
    credential:
      "GreyRocks is the issuer named in the HireeBridge certificate flow. Enrolment gives access to the programme workflow; it does not create a certificate. Your portal and evidence must be submitted and explicitly approved first. The resulting certificate record uses a unique credential ID, and its QR code points to the GreyRocks verification destination implemented by the platform.",
    faqs: [
      [
        "What is the assigned Web Development project?",
        "The catalogue assigns a College Event Management Portal with event discovery, registration, role-aware management and responsive behaviour.",
      ],
      [
        "Does a static event page complete the task?",
        "No. The catalogue also requires registration validation, duplicate prevention, organiser or administrator views, and accessible outcome states.",
      ],
      [
        "Should validation exist in JavaScript only?",
        "No. Browser feedback can improve usability, but the server should enforce the rules that protect registration and capacity data.",
      ],
      [
        "What mobile behaviour should I test?",
        "Check search, filters, event details, forms, errors, success messages and navigation at a narrow viewport without clipped content or horizontal scrolling.",
      ],
      [
        "Can I use a framework?",
        "Choose tools you can explain and document. Common HTML, CSS, JavaScript and server frameworks are general options, not confirmed programme requirements.",
      ],
      [
        "How should I present sample users and events?",
        "Label all demonstration data as synthetic and avoid implying that a real student, college or organiser uses the portal.",
      ],
      [
        "When does GreyRocks issue the certificate?",
        "The certificate follows submission and explicit approval. Payment alone does not create it.",
      ],
      [
        "Can the programme guarantee college credit?",
        "No. Confirm the institution’s duration, documentation and approval rules with its T&P or placement cell first.",
      ],
    ],
    links: [
      ["MDN Web Docs", "https://developer.mozilla.org/"],
      [
        "Web Content Accessibility Guidelines",
        "https://www.w3.org/WAI/standards-guidelines/wcag/",
      ],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/frontend-development/",
      label: "Compare the Frontend Development project",
      difference:
        "Frontend Development concentrates on a reusable React dashboard interface; Web Development implements the broader event registration workflow across browser, server and data.",
    },
  },
};
