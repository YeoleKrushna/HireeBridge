"use strict";

const gameDevDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Godot 2D Game Architecture and Gameplay Loop</title>
  <desc id="visual-desc">Architecture showing the physics process game loop powering spaceship vector propulsion, Area2D collision detection and mining laser interactions, resource inventory state management, real-time CanvasLayer HUD updates, and scene transitions between title, gameplay, and game over screens.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">GAME LOOP</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Physics Tick</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">delta timing</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">CONTROLS</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Vector Thrust</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">inertia &amp; damping</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">COLLISIONS</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Area2D Mining</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">asteroid harvest</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">INVENTORY HUD</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">CanvasLayer UI</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">fuel &amp; minerals</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">GAMEPLAY STATE</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Scene Manager</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">menu, play, restart</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">STATE PERSISTENCE</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Save &amp; Reload</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">high score records</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "game-development",
  factsKey: "game-development",
  catalogueDomain: "Game Development",
  name: "Game Development",
  primaryKeyword: "game development online internship with certificate",
  accent: "#6a4c93",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "2D Space Exploration & Mining Game - Build a Godot 2D game with space movement, mining/resource systems, UI, and persistent game-state flow.",
    deliverables: [
      "Complete Godot 2D project repository containing cleanly organized scene trees, GDScript code, and asset folders",
      "Playable exported build executable or comprehensive one-click local run instructions for Windows, macOS, or Linux",
      "Formal asset credits and licensing register documenting third-party audio, sprite, and font attributions",
      "Comprehensive gameplay testing checklist verifying movement physics, collision boundaries, and resource drops",
      "Game design documentation outlining mechanics, HUD layout, difficulty progression, and state persistence rules",
    ],
    taskOutline: [
      "Initialize a Godot 4 or Godot 3 project, establishing a modular directory structure for scenes, scripts, and art assets.",
      "Program player spaceship kinematics in GDScript using delta-timed vector thrust, rotational inertia, and boundary clamping.",
      "Build interactive asteroid entities using Area2D and CollisionShape2D nodes with mining raycasts and drop mechanics.",
      "Design a responsive CanvasLayer HUD tracking fuel, hull integrity, collected mineral inventories, and score counters.",
      "Implement scene management transitions across title menu, active gameplay, pause overlays, game over, and clean restarts.",
    ],
    validation:
      "Verify movement, collisions, mining/resource updates, scene transitions, and restart behavior.",
    toolsExpected:
      "Godot Engine (v4.x or v3.5 LTS), GDScript, Git, free/open-source 2D sprite packages (e.g. Kenney.nl), and audio editing tools.",
  },
  diagram: gameDevDiagram,
  content: {
    h1: "Build Interactive Gameplay Loops in a Godot 2D Game Development Internship Project",
    summary:
      "This game development online internship with certificate is a fee-based, project-based internship programme focusing on gameplay programming, 2D physics simulation, and state management using the Godot Engine. You engineer a complete 2D space exploration and mining game in GDScript, implement inertial flight mechanics, build collision-driven mining interactions, manage inventory state and HUD telemetry, structure scene transitions, and publish a playable game build.",
    forYou: [
      "You want practical gameplay programming experience using Godot Engine and GDScript to turn mechanics into playable prototypes.",
      "You want to master 2D physics loops, node trees, signal-driven architectures, and collision detection systems.",
      "You want to build a game development portfolio featuring a complete, playable 2D game with clean code and proper asset credits.",
    ],
    notForYou: [
      "You only want to draw static 3D concept art without writing gameplay scripts; this project focuses heavily on programming and logic.",
      "You expect to build a massive multiplayer 3D online game in 4 weeks; this programme focuses on finishing a polished, focused 2D prototype.",
      "You want proprietary closed-source engine bloat; Godot is lightweight, open-source, and runs efficiently on standard hardware.",
    ],
    buildIntro:
      "Game development is one of the most rewarding disciplines in software engineering, combining interactive physics, user feedback loops, state management, and creative design. In this project, you build an engaging 2D space exploration and mining game using Godot Engine and GDScript. You program inertial spacecraft flight, build harvestable asteroid entities, implement resource collection systems, design a real-time HUD, and manage scene transitions from title screen to clean game restart.",
    projectNarrative: [
      "Solid gameplay begins with responsive, enjoyable controls. In space, movement behaves differently than terrestrial platformers. You program a `CharacterBody2D` or `RigidBody2D` spaceship node using GDScript's `_physics_process(delta)`. You calculate acceleration vectors based on player thrust, apply rotational damping and orbital inertia, and clamp speeds to keep the spacecraft controllable. By tying movement to fixed delta time, you ensure gameplay remains smooth and consistent across different frame rates.",
      "Interactive entities bring the game world to life. You instantiate asteroid fields with randomized sizes, compositions, and orbital velocities. Using `Area2D` and `CollisionShape2D` nodes, you detect when the player's mining laser intersects an asteroid. You program health decay mechanics, spawn particle effects upon fracture, and instantiate collectible mineral items that gravitate toward the player's ship when within proximity.",
      "A modular UI provides essential player feedback. Using Godot's `CanvasLayer` and control nodes, you construct a HUD displaying vital metrics: hull integrity, fuel levels, mineral cargo capacity, and credits. You connect game state events to UI nodes using Godot's loose-coupling signal architecture (`signal resource_collected(amount)`), ensuring that game logic remains independent from visual presentation code.",
      "Completing a game requires handling every phase of the player session lifecycle. You build a title menu with instructions, implement a pause system that halts physics without freezing UI inputs, program win/loss conditions (such as running out of fuel or meeting a mining quota), and ensure that restarting the game properly resets all variables without memory leaks. Finally, you assemble asset attribution credits and export a playable build.",
    ],
    narrativeHeading: "From physics kinematics and collision detection to UI signals and scene state management",
    evidenceNotes: [
      "Godot project source repository containing structured scene trees, GDScript scripts, and asset folders.",
      "Exported runnable game build or verified setup instructions for local execution in Godot.",
      "Gameplay testing verification matrix documenting collision checks, boundary tests, and restart states.",
      "Asset credits register detailing license compliance for third-party sprites, fonts, and sound effects.",
      "Game design specification document explaining controls, mining mechanics, and balancing parameters.",
    ],
    progression: [
      [
        "Project & Player Movement",
        "Configure Godot scene structure and program 2D inertial spaceship flight in _physics_process.",
      ],
      [
        "Collisions & Asteroids",
        "Instantiate asteroid nodes with Area2D collision shapes and implement raycast mining interactions.",
      ],
      [
        "Resource Collection",
        "Program collectible mineral drops, tractor beam proximity pull, and player cargo state updates.",
      ],
      [
        "CanvasLayer HUD",
        "Design a responsive HUD showing fuel, hull, cargo, and score using Godot's signal-driven events.",
      ],
      [
        "Scene Flow & Export",
        "Implement title screens, game over loops, asset credit registers, and export a playable project build.",
      ],
    ],
    selfCheck: [
      "Can you explain why delta time is essential when updating player velocity in _physics_process?",
      "Do you know why Godot's signal architecture is preferred over hardcoded node path references for UI updates?",
      "Can you explain the difference between CharacterBody2D, RigidBody2D, and Area2D nodes?",
      "How do you ensure that all audio and graphic assets used in your game adhere to open-source or creative commons licenses?",
      "What steps are required to cleanly restart a scene in Godot without leaving orphan nodes in memory?",
    ],
    skills: [
      {
        group: "Godot & 2D Physics Programming",
        items: [
          ["GDScript & Node Hierarchy", "Master Godot's object-oriented scene tree architecture and node lifecycle methods."],
          ["Kinematic Flight Physics", "Program vector math, thrust acceleration, rotational inertia, and drag damping."],
          ["Collision Detection Systems", "Configure Area2D, CollisionShape2D, and raycasting layers for mining interactions."],
        ],
      },
      {
        group: "Game Architecture & Signals",
        items: [
          ["Signal-Driven State Architecture", "Decouple gameplay simulation from UI updates using custom event signals."],
          ["Resource & Inventory Logic", "Track player cargo capacities, fuel consumption rates, and resource conversions."],
          ["Dynamic Entity Spawning", "Instantiate and pool asteroids, mineral drops, and visual particle effects at runtime."],
        ],
      },
      {
        group: "UI, State Management & Publishing",
        items: [
          ["CanvasLayer UI Engineering", "Build responsive HUDs that scale across different desktop display resolutions."],
          ["Scene Management & Menus", "Implement smooth state transitions for title screens, pauses, win/loss, and restarts."],
          ["Build Export & Asset Auditing", "Package playable game builds and maintain strict intellectual property credit logs."],
        ],
      },
    ],
    links: [
      ["Godot Engine Official Documentation (v4)", "https://docs.godotengine.org/en/stable/"],
      ["Kenney Free Game Assets Repository", "https://kenney.nl/assets"],
      ["GDScript Style Guide & Best Practices", "https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_styleguide.html"],
    ],
    mistakes: [
      [
        "Tightly coupling UI scripts to gameplay nodes",
        "Directly modifying HUD labels from the player script creates fragile code; use Godot signals to emit events cleanly.",
      ],
      [
        "Calculating movement without multiplying by delta",
        "Ignoring delta causes games to run at different speeds on 60Hz and 144Hz monitors; always multiply by delta.",
      ],
      [
        "Using unlicensed art or audio assets without attribution",
        "Never copy random internet images into game projects; use properly licensed CC0/MIT assets and provide credits.",
      ],
      [
        "Failing to clean up spawned nodes when leaving scenes",
        "Failing to call queue_free() on destroyed asteroids leaks memory; always remove entities properly from the tree.",
      ],
      [
        "Neglecting win and loss condition testing",
        "A game without clear win/loss or restart loops feels unfinished; test game-over triggers thoroughly.",
      ],
    ],
    cvPatterns: [
      "Developed a complete 2D space exploration and mining game in Godot Engine using modular GDScript architecture.",
      "Implemented delta-timed inertial flight physics with vector acceleration and custom rotational damping.",
      "Architected a signal-driven state system decoupling player entity logic from CanvasLayer HUD telemetry.",
      "Engineered Area2D collision detection and raycasting mechanics for procedural asteroid mining and resource collection.",
      "Managed game state lifecycle including title screens, pause overlays, win/loss logic, and playable build exports.",
    ],
    college: [
      "Confirm with your academic department that a 2D game development and interactive simulation project satisfies internship requirements.",
      "Submit the official project brief outlining Godot mechanics, physics simulation, and playable build deliverables.",
      "Include scene hierarchy diagrams, GDScript source code snippets, and gameplay test matrices in your final report.",
      "Provide public GitHub repository access containing Godot project files, asset credit logs, and execution instructions.",
      "Prepare a live technical gameplay demonstration showcasing player controls, mining mechanics, HUD updates, and restart loops.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, game starter templates, and evaluation rubric; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your Godot project repository, playable build instructions, asset licensing register, and gameplay testing checklist. A game development evaluator reviews your scene hierarchy, code cleanliness, signal usage, physics responsiveness, and asset licensing compliance. Approved submissions receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Do I need an expensive gaming PC to develop in Godot?",
        "No. Godot Engine is lightweight (under 100MB download) and runs smoothly on standard laptops running Windows, macOS, or Linux without requiring dedicated high-end GPUs.",
      ],
      [
        "Which version of Godot should I use?",
        "You can use Godot 4.x or Godot 3.5 LTS. Both are fully supported in our project guidelines and provide excellent 2D development features.",
      ],
      [
        "Where do I get graphics and audio for my game?",
        "You can use free, open-source asset repositories such as Kenney.nl or OpenGameArt.org. All third-party assets must have compatible open-source licenses and be documented in your asset credits register.",
      ],
      [
        "Can I customize the game theme or mechanics?",
        "Yes! While the core requirements focus on movement physics, mining interactions, resource management, and UI signals, you are encouraged to add creative flourishes like extra ship upgrades, alien hazards, or custom sound effects.",
      ],
      [
        "What is the difference between this project and Mobile App Development?",
        "Mobile App Development focuses on business applications, form inputs, local databases, and REST APIs using Flutter or React Native. Game Development focuses on real-time physics loops, rendering node trees, collision systems, and gameplay mechanics.",
      ],
      [
        "How do I submit my game for evaluation?",
        "You submit your complete Godot project repository on GitHub along with either an exported executable or clear instructions to launch the project directly in the Godot editor, accompanied by your test checklist.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced progress: week 1 covers player kinematics, week 2 covers mining and collisions, week 3 covers inventory and HUD signals, and week 4 finalizes menus, game loop, and build export.",
      ],
      [
        "How do employers verify my game development certificate?",
        "Each certificate includes a unique GreyRocks credential ID and QR verification code that links to an online verification portal displaying your verified game development project details and evaluation review.",
      ],
    ],
    sibling: {
      href: "/internships/mobile-app-development/",
      label: "Compare with Mobile App Development",
      difference:
        "Game Development focuses on real-time physics loops, 2D collisions, rendering nodes, and interactive gameplay mechanics in Godot, whereas Mobile App Development focuses on UI widgets, local SQLite storage, and mobile business applications in Flutter.",
    },
  },
};
