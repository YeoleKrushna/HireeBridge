"use strict";

const uxDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">CampusConnect Research-Led Mobile UX Process</title>
  <desc id="visual-desc">A complete design cycle moving from student user research and persona synthesis to user flow mapping, wireframing, design system specification, clickable prototyping, usability evaluation, and evidence-based design iterations.</desc>
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
    <text x="70" y="84" text-anchor="middle" class="dp-title">User Research</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">persona synthesis</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">ARCHITECTURE</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Task Flow Map</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">friction points</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">WIREFRAMING</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Low-Fi Screens</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">hierarchy &amp; layout</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">DESIGN SYSTEM</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">UI Tokens</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">WCAG AA compliant</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">PROTOTYPE &amp; TEST</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Interactive Prototype</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">usability task checks</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">EVIDENCE ITERATION</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Design Revisions</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">justified rationale</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "ui-ux-design",
  name: "UI/UX Design",
  primaryKeyword: "UI UX design online internship with certificate",
  accent: "#a73d6a",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "CampusConnect Mobile App UX Case Study - Deliver a research-led UX case study from user needs through tested high-fidelity prototype.",
    deliverables: [
      "User research synthesis document with privacy-safe student personas and pain points",
      "End-to-end user-flow map detailing decision nodes, system feedback, and error branches",
      "Low-fidelity wireframe set establishing layout hierarchy and content structure",
      "Reusable mobile design system covering typography scales, accessible color contrast, and component states",
      "Interactive clickable mobile prototype with documented usability evaluation findings and revisions",
    ],
    taskOutline: [
      "Conduct discovery research to define student workflow challenges and synthesize privacy-safe personas.",
      "Map out the core campus services task flow, identifying friction points and decision milestones.",
      "Draft low-fidelity wireframes to resolve layout hierarchy and navigation prior to visual styling.",
      "Construct a component-driven design system enforcing WCAG accessibility standards and mobile touch targets.",
      "Evaluate the interactive prototype with representative users, document completion metrics, and iterate.",
    ],
    validation:
      "Evaluate core task completion with representative users and check accessibility basics.",
    toolsExpected:
      "Figma or Penpot, Miro/FigJam for experience mapping, usability testing checklists, and WCAG contrast evaluation tools.",
  },
  diagram: uxDiagram,
  content: {
    h1: "Design and Test a Student Mobile Experience in a UI UX Design Internship Project",
    summary:
      "This UI UX design online internship with certificate is a fee-based, project-based internship programme that focuses on research-driven digital product design. You complete an end-to-end mobile UX case study for CampusConnect, moving from user discovery and flow mapping to accessible component design systems, interactive prototyping, and evidence-based usability evaluation.",
    forYou: [
      "You want to build a design portfolio piece grounded in real user research rather than surface-level aesthetic mockups.",
      "You value structured design thinking: translating messy user feedback into actionable wireframes and tested prototypes.",
      "You want to learn how design systems, WCAG accessibility guidelines, and usability feedback drive justifiable interface revisions.",
    ],
    notForYou: [
      "You want to write frontend HTML/CSS or React code; our Frontend Development programme focuses directly on code implementation.",
      "You only want to create decorative social media graphics; this programme focuses on user experience engineering and interaction design.",
      "You expect to present unvalidated visual concepts without documenting research rationale or usability test evidence.",
    ],
    buildIntro:
      "Great user interfaces are never created by accident; they are the result of deliberate inquiry, rigorous user workflow mapping, and evidence-based refinement. In this UI/UX Design project, you design CampusConnect, a mobile platform solving common campus friction points such as course resource tracking, event discovery, and administrative inquiries. You document user needs, build structured wireframes, establish a compliant mobile design system, and test your clickable prototype with real users to prove task completion.",
    projectNarrative: [
      "A defensible UX case study begins with thorough problem framing. Instead of designing based on personal preferences, you synthesize research from student interviews and survey responses into structured, privacy-safe personas. You identify high-friction moments (such as locating updated classroom assignments during orientation) and define measurable design objectives for the mobile application.",
      "User-flow mapping translates abstract needs into navigable paths. You diagram the step-by-step progression a student follows to accomplish critical tasks, mapping out positive outcomes, input validation warnings, and error recovery routes. By identifying navigation bottlenecks in wireframes before applying visual styling, you ensure the underlying product architecture is intuitive and efficient.",
      "Visual design is structured through a repeatable design system. You establish a balanced typography scale, define accessible color palettes meeting WCAG AA contrast ratios (at least 4.5:1 for standard text), and create reusable UI components including navigation bars, cards, form fields, and status banners. You specify interactive component states (default, pressed, active, disabled, and error) to ensure consistent user feedback.",
      "Usability evaluation closes the design loop. You place your high-fidelity clickable prototype in front of representative test participants, assign concrete scenario tasks, and observe where users succeed, hesitate, or encounter friction. Rather than defending initial design choices, you document these usability observations and implement justified revisions that directly improve task completion rates.",
    ],
    narrativeHeading: "From user research insights to tested high-fidelity mobile prototypes",
    evidenceNotes: [
      "Synthesized user research findings and two distinct student persona profiles.",
      "Comprehensive user-flow map detailing task entry points, decision trees, and recovery paths.",
      "Full low-fidelity wireframe progression showing structural hierarchy across mobile viewports.",
      "Documented design system component library with explicit WCAG color contrast validation.",
      "Interactive prototype link accompanied by a usability test report documenting observed revisions.",
    ],
    progression: [
      [
        "Discover",
        "Define research questions, synthesize qualitative student input, and construct evidence-based personas.",
      ],
      [
        "Structure",
        "Map end-to-end task flows, resolve information architecture, and expose potential user friction points.",
      ],
      [
        "Wireframe",
        "Construct low-fidelity screen layouts prioritizing visual hierarchy, tap targets, and content clarity.",
      ],
      [
        "Systemize",
        "Build a reusable component library with accessible contrast tokens, responsive typography, and state variants.",
      ],
      [
        "Validate",
        "Conduct task-based usability testing sessions, record participant feedback, and execute documented design revisions.",
      ],
    ],
    selfCheck: [
      "Can you explain why wireframing content hierarchy must occur before choosing visual color palettes?",
      "Do you know how to calculate and verify WCAG AA color contrast ratios for text and interactive buttons?",
      "Can you describe the difference between an experience map and a technical user-flow diagram?",
      "Are you prepared to revise a screen layout when usability test participants struggle to find a key button?",
      "Can you articulate design decisions using user-centred rationale rather than personal aesthetic taste?",
    ],
    skills: [
      {
        group: "User Research & Discovery",
        items: [
          ["Qualitative User Interviews", "Frame objective inquiry questions and identify underlying operational friction points."],
          ["Persona Construction", "Synthesize user demographics, goals, technical constraints, and behavioural tendencies."],
          ["Problem Framing", "Define concise 'How Might We' design opportunities backed by observed evidence."],
        ],
      },
      {
        group: "Information Architecture & Layout",
        items: [
          ["User-Flow Mapping", "Design logical navigation branches with clear success criteria and error states."],
          ["Low-Fidelity Wireframing", "Establish structural layout and hierarchy across 390px mobile viewport boundaries."],
          ["Content Hierarchy", "Organize complex campus datasets into scannable, mobile-friendly screen cards."],
        ],
      },
      {
        group: "Design Systems & Testing",
        items: [
          ["Design Token Systems", "Define systematic typography, elevation, spacing units, and color tokens."],
          ["Accessibility Compliance", "Ensure 48x48px minimum touch targets and WCAG AA contrast standards."],
          ["Usability Evaluation", "Formulate realistic test scripts, observe user friction, and document iterative design changes."],
        ],
      },
    ],
    links: [
      ["W3C Mobile Accessibility Guidelines", "https://www.w3.org/WAI/standards-guidelines/mobile/"],
      ["Nielsen Norman Group Usability Testing 101", "https://www.nngroup.com/articles/usability-testing-101/"],
      ["Material Design Mobile Touch Targets", "https://m3.material.io/foundations/interaction-design/touch-targets"],
    ],
    mistakes: [
      [
        "Skipping low-fidelity wireframes to design visual mockups immediately",
        "Premature visual styling distracts from fundamental navigation flaws; validate content layout and flow hierarchy first.",
      ],
      [
        "Designing only happy paths and ignoring error states",
        "Mobile users frequently encounter poor connectivity or form validation errors; design explicit empty, loading, and error states.",
      ],
      [
        "Ignoring touch target standards on mobile screens",
        "Interactive buttons and tap zones must measure at least 48x48 physical pixels to avoid frustrating mis-taps on handheld devices.",
      ],
      [
        "Relying on low-contrast text for modern minimalism",
        "Subtle gray text often fails accessibility benchmarks; verify that every text element exceeds the 4.5:1 contrast threshold.",
      ],
      [
        "Failing to document how user feedback shaped revisions",
        "A case study is compelling because of its iteration; explicitly highlight before-and-after screens based on usability observations.",
      ],
    ],
    cvPatterns: [
      "Authored an end-to-end mobile UX case study in Figma for [project name], driving a [metric]% task completion rate in usability trials.",
      "Constructed a WCAG AA-compliant mobile design system comprising [number] reusable components, tokens, and responsive variants.",
      "Mapped user journeys and task flows across [number] screens, reducing navigation steps for core user tasks by [percentage].",
      "Conducted usability testing sessions with [number] representative participants, synthesizing findings into [number] evidence-based UI iterations.",
      "Documented design specifications, touch target guidelines, and accessible color tokens for developer handoff.",
    ],
    college: [
      "Verify with your academic department that a comprehensive product design and UX research case study satisfies internship credit.",
      "Submit the CampusConnect project brief detailing user research, information architecture, wireframing, and prototype milestones.",
      "Include research synthesis sheets, persona templates, design system tokens, and usability testing logs in your final report.",
      "Provide accessible links to your interactive Figma/Penpot prototype and recorded user evaluation walkthroughs.",
      "Present a case study slide deck highlighting design rationale, research evidence, and before-and-after iterations to your faculty reviewers.",
    ],
    credential:
      "GreyRocks administers the review and credential verification infrastructure for HireeBridge programmes. Programme enrolment grants access to the project specification, design system criteria, and review rubrics; it does not grant an automatic credential upon payment. To qualify for credentialing, you submit your completed case study documentation, interactive prototype links, and usability testing evaluation records. A design reviewer examines your research alignment, accessibility compliance, and iterative rationale. Approved submissions receive a verifiable credential featuring a unique credential ID and scannable QR verification code.",
    faqs: [
      [
        "Do I need to know how to code to complete this UI/UX design internship?",
        "No. This programme focuses strictly on user experience research, information architecture, design systems, and interactive prototyping using design tools like Figma or Penpot. No frontend coding is required.",
      ],
      [
        "What specific mobile app case study will I build?",
        "You will design the CampusConnect mobile app, a comprehensive platform designed to streamline student campus life, including resource discovery, event registration, schedule tracking, and campus services navigation.",
      ],
      [
        "How do I prove that my design has been tested?",
        "You formulate a structured usability test scenario with representative tasks, record user observation notes (documenting where participants succeeded or hesitated), and present before-and-after screen revisions showing how feedback improved the interface.",
      ],
      [
        "Which design software is recommended for this project?",
        "Figma is the industry standard and highly recommended, though open-source alternatives like Penpot are fully accepted. You must provide public or shared review access to your interactive prototype and component library.",
      ],
      [
        "What is the difference between UI/UX Design and Frontend Development?",
        "UI/UX Design centers on user research, empathy mapping, information architecture, accessible typography/colors, and prototype testing. Frontend Development focuses on writing the actual production code (HTML, CSS, JavaScript, React) that brings design files to life.",
      ],
      [
        "Does the design system need to comply with accessibility standards?",
        "Yes. The evaluation criteria require compliance with WCAG AA accessibility standards, including text-to-background contrast ratios and ergonomic 48x48px touch targets for mobile thumb navigation.",
      ],
      [
        "How long does the programme take to finish?",
        "The project is structured for completion within 4 weeks of self-paced learning, allowing students to systematically progress from discovery research to final usability reporting.",
      ],
      [
        "How can recruiters verify my UI/UX certificate?",
        "Every approved certificate features a permanent GreyRocks credential ID and QR code that resolves to an online verification portal displaying your certified project scope and completion date.",
      ],
    ],
    sibling: {
      href: "/internships/frontend-development/",
      label: "Compare with Frontend Development",
      difference:
        "UI/UX Design explores user research, wireframing, design systems, and usability testing in Figma, whereas Frontend Development involves coding accessible React components and managing application state.",
    },
  },
};
