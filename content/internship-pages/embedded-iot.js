"use strict";

const embeddedIotDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Embedded Systems and IoT Sensor Telemetry Pipeline</title>
  <desc id="visual-desc">Architecture showing physical or simulated environmental sensors communicating with an ESP32 microcontroller, firmware performing edge sampling and calibration, MQTT telemetry publishing over Wi-Fi with reconnection handling, an MQTT broker dispatching topics, and an interactive dashboard rendering real-time metrics with threshold alert debouncing.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">SENSORS</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Physical / Sim</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">DHT22 &amp; BME280</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">ESP32 FIRMWARE</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Edge Sampling</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">calibration &amp; JSON</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">MQTT BROKER</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Mosquitto Pub</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">reconnect handling</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">TELEMETRY</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Live Dashboard</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">stream charts</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">EDGE LOGIC</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Threshold Alerts</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">debounce &amp; hysteresis</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">DATA PERSISTENCE</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Time-Series Log</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">telemetry history</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "embedded-iot",
  factsKey: "embedded-systems-iot",
  catalogueDomain: "Embedded Systems & IoT",
  name: "Embedded Systems & IoT",
  primaryKeyword: "IoT online internship with certificate",
  accent: "#2a6f97",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "ESP32 Smart Sensor Monitoring System - Build an ESP32 sensor node with MQTT communication and a real-time monitoring dashboard.",
    deliverables: [
      "Firmware source code in C++/Arduino or ESP-IDF with sensor polling, error handling, and Wi-Fi reconnection routines",
      "MQTT broker configuration file establishing topic hierarchy, access controls, and QoS delivery levels",
      "Sample telemetry history dataset containing recorded environmental readings with structured ISO timestamps",
      "Hardware wiring schematic diagram and calibration notes detailing GPIO connections and power requirements",
      "Setup and operational runbook documenting simulation or physical deployment steps and alert threshold tuning",
    ],
    taskOutline: [
      "Configure the development environment using an ESP32 physical board or deterministic Wokwi simulator.",
      "Write embedded firmware to poll temperature, humidity, and environmental sensors via I2C or GPIO buses.",
      "Implement resilient Wi-Fi and MQTT client routines featuring non-blocking reconnection and exponential backoff.",
      "Deploy a local MQTT broker (such as Mosquitto) and establish structured telemetry payload serialization in JSON format.",
      "Build a web dashboard visualizing real-time metrics, implement alert hysteresis to prevent spam, and verify failure modes.",
    ],
    validation:
      "Check threshold edges, disconnected broker, malformed readings, and timestamp order.",
    toolsExpected:
      "ESP32 microcontroller (hardware or Wokwi simulator), C++/Arduino IDE or ESP-IDF, Mosquitto MQTT broker, Python or Node.js dashboard, and Git.",
  },
  diagram: embeddedIotDiagram,
  content: {
    h1: "Build Connected Telemetry Systems in an Embedded Systems & IoT Internship Project",
    summary:
      "This IoT online internship with certificate is a fee-based, project-based internship programme that focuses on microcontroller firmware development, sensor interfacing, and networked telemetry systems. You develop modular C++ firmware for the ESP32 microcontroller, interface digital environmental sensors, implement robust MQTT client communication with automatic reconnection, configure an MQTT broker, build a real-time monitoring dashboard, and enforce alert debouncing logic.",
    forYou: [
      "You want practical experience writing embedded C++ firmware that interacts with hardware sensors and networked protocols.",
      "You want to understand lightweight IoT protocols like MQTT and how edge devices communicate with central cloud brokers.",
      "You want to build an IoT portfolio project showcasing firmware resilience, sensor calibration, real-time visualization, and edge alert logic.",
    ],
    notForYou: [
      "You only want high-level web frontend development; our Frontend Development programme focuses directly on browser applications.",
      "You expect to only study electronic circuit theory on paper; this project requires compiling firmware and processing real telemetry data.",
      "You believe IoT devices never disconnect; this project specifically demands handling network dropouts and corrupted sensor packets.",
    ],
    buildIntro:
      "The Internet of Things bridges the physical and digital worlds. From industrial automation to smart environmental monitoring, connected devices must read physical inputs reliably and publish data efficiently under real-world network constraints. In this embedded systems project, you engineer an ESP32-based environmental monitoring node. Whether using a physical ESP32 development board or a deterministic browser-based simulator like Wokwi, you develop modular firmware, establish an MQTT pub/sub pipeline, stream time-series sensor data, and build an operational monitoring dashboard.",
    projectNarrative: [
      "Embedded development begins at the hardware interface. Sensors communicate using digital protocols such as I2C, SPI, or 1-Wire. You write firmware to initialize sensor hardware, configure sample rates, read raw registers, and apply mathematical calibration formulas to calculate temperature, humidity, and atmospheric metrics. You implement input validation to discard corrupted or out-of-range sensor readings before they pollute downstream systems.",
      "Microcontrollers operating in the wild experience intermittent power and network drops. Writing naive firmware that locks up in an infinite loop when Wi-Fi is lost leads to catastrophic device freezes. You design non-blocking connection logic using timer interrupts and state machines. If the Wi-Fi router restarts or the MQTT broker goes offline, your firmware logs the failure, buffers critical readings, and attempts reconnection with exponential backoff.",
      "MQTT is the industry standard for lightweight, battery-efficient telemetry transport. You define a structured topic hierarchy (such as `devices/{deviceId}/telemetry` and `devices/{deviceId}/status`) and publish compact JSON payloads. You configure Quality of Service (QoS) levels, ensuring critical alert signals arrive reliably without saturating constrained wireless bandwidth.",
      "The data pipeline culminates in visualization and actionable intelligence. You set up an MQTT subscriber that ingests incoming topics into a dashboard or time-series datastore. You implement alert threshold monitoring with software debounce and hysteresis, ensuring that if a temperature fluctuates around a 30°C warning boundary, the system does not fire dozens of duplicate alerts every minute. Finally, you author wiring documentation and operational setup guides.",
    ],
    narrativeHeading: "From sensor polling and resilient firmware to MQTT pub/sub streaming and dashboard alerts",
    evidenceNotes: [
      "ESP32 firmware source code repository containing modular drivers for sensors and network management.",
      "Wiring schematic diagrams and pinout documentation detailing GPIO mappings and pull-up resistor configurations.",
      "Mosquitto MQTT broker configuration files and topic access control definitions.",
      "Sample time-series telemetry log demonstrating continuous data streaming with valid timestamps.",
      "Operational test runbook demonstrating edge threshold alert debouncing and network reconnection behavior.",
    ],
    progression: [
      [
        "Hardware & Drivers",
        "Configure the ESP32 toolchain or simulator and write modular drivers to read digital sensor values.",
      ],
      [
        "Stateful Firmware",
        "Implement non-blocking event loops, sensor validation checks, and edge data formatting routines.",
      ],
      [
        "Resilient MQTT",
        "Write Wi-Fi connection logic with exponential backoff and publish telemetry packets to an MQTT broker.",
      ],
      [
        "Broker & Pipeline",
        "Configure Mosquitto broker topics, QoS parameters, and structured JSON telemetry schema definitions.",
      ],
      [
        "Dashboard & Alerts",
        "Build a real-time telemetry dashboard, implement alert debouncing hysteresis, and verify network dropouts.",
      ],
    ],
    selfCheck: [
      "Can you explain why non-blocking code is essential when managing both sensor reading and network connectivity on a microcontroller?",
      "Do you know why MQTT is preferred over standard HTTP polling for battery-operated IoT nodes?",
      "Can you explain how hysteresis prevents alert thrashing when sensor readings hover near a threshold?",
      "What steps does your firmware take when the Wi-Fi connection drops during a live telemetry session?",
      "How do you calibrate an analog or digital sensor to ensure measurements match expected physical units?",
    ],
    skills: [
      {
        group: "Embedded Firmware & Hardware",
        items: [
          ["ESP32 Microcontroller Programming", "Develop modular firmware in C++ using Arduino or ESP-IDF frameworks."],
          ["Sensor Interfacing & Calibration", "Configure I2C/GPIO buses, poll digital sensors, and apply calibration formulas."],
          ["Non-blocking State Machines", "Implement asynchronous polling loops without relying on blocking delay functions."],
        ],
      },
      {
        group: "IoT Protocols & Networking",
        items: [
          ["MQTT Telemetry Architecture", "Design structured topic schemas, QoS parameters, and retain flags."],
          ["Network Reconnection Handling", "Engineer automated reconnect routines with exponential backoff on connection loss."],
          ["JSON Payload Serialization", "Format compact sensor telemetry payloads for constrained bandwidth transmission."],
        ],
      },
      {
        group: "Monitoring & Edge Intelligence",
        items: [
          ["Real-Time Dashboard Engineering", "Visualize live sensor metrics, status indicators, and historical trends."],
          ["Threshold Alert Debouncing", "Implement software hysteresis to prevent duplicate alarm generation at boundary values."],
          ["Failure Mode Validation", "Test and document edge behaviors under broker outages, bad sensors, and power cycles."],
        ],
      },
    ],
    links: [
      ["ESP32 Technical Documentation & Guides", "https://docs.espressif.com/projects/esp-idf/en/latest/esp32/"],
      ["MQTT Protocol Specifications & Guidance", "https://mqtt.org/documentation/"],
      ["Wokwi ESP32 Online Simulator", "https://docs.wokwi.com/"],
    ],
    mistakes: [
      [
        "Using blocking delay() calls in the main loop",
        "Blocking calls freeze network stacks and miss sensor interrupts; use millis() timers or FreeRTOS tasks instead.",
      ],
      [
        "Assuming network connections never drop",
        "Wi-Fi will inevitably disconnect; always write non-blocking reconnection routines with backoff limits.",
      ],
      [
        "Allowing alert flooding around threshold boundaries",
        "A reading fluctuating between 29.9°C and 30.1°C triggers dozens of alerts without hysteresis or debounce guards.",
      ],
      [
        "Hardcoding Wi-Fi credentials in public repositories",
        "Store network credentials in external configuration files or environment variables excluded by gitignore.",
      ],
      [
        "Failing to validate raw sensor data before publishing",
        "Sensors can return NaN or impossible spikes; always sanity check values before emitting MQTT messages.",
      ],
    ],
    cvPatterns: [
      "Developed modular C++ embedded firmware for an ESP32 sensor node streaming real-time environmental telemetry.",
      "Architected an MQTT pub/sub pipeline featuring structured topic hierarchies and QoS delivery guarantees.",
      "Engineered automated Wi-Fi and broker reconnection logic with exponential backoff, preventing device freezes during dropouts.",
      "Implemented alert debouncing and hysteresis logic, reducing false alarm notifications by [percentage].",
      "Constructed a real-time web dashboard visualizing live sensor telemetry and historical time-series trends.",
    ],
    college: [
      "Confirm with your academic supervisor that an Embedded Systems and IoT sensor firmware project satisfies internship criteria.",
      "Submit the official project brief detailing ESP32 development, sensor interfacing, and MQTT communication milestones.",
      "Include circuit schematics, pinout documentation, firmware source code, and telemetry sample logs in your report.",
      "Provide public GitHub access to your repository containing firmware files, broker configurations, and setup documentation.",
      "Prepare a working technical demonstration showing live sensor readings streaming to the dashboard and alert triggers.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, firmware starter templates, and evaluation rubric; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your completed firmware code, broker configuration, sample telemetry logs, wiring schematics, and operational runbook. An embedded systems evaluator reviews your code architecture, connection handling resilience, topic structure, and documentation quality. Approved projects receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Do I need physical ESP32 hardware to complete this project?",
        "No. While you can use physical hardware (ESP32 DevKit, DHT22/BME280 sensor), you can also complete 100% of the project using the Wokwi online simulator, which deterministically simulates an ESP32, wiring, sensors, and network connections.",
      ],
      [
        "What programming language is used for the firmware?",
        "You can use C++ with either the Arduino framework or the Espressif ESP-IDF framework. Both are widely supported across industry and academic environments.",
      ],
      [
        "What is the difference between this project and Web Development?",
        "Web development focuses on browser user interfaces and server backend logic. Embedded Systems & IoT focuses on hardware microcontroller programming, low-level bus communication (I2C/GPIO), and lightweight telemetry protocols (MQTT).",
      ],
      [
        "How do I set up a local MQTT broker?",
        "You can easily run Eclipse Mosquitto locally using Docker, an installer package on Windows/macOS/Linux, or connect to a free public test broker like test.mosquitto.org for initial verification.",
      ],
      [
        "What is hysteresis in sensor monitoring?",
        "Hysteresis is a technique that uses two distinct thresholds (e.g. alert on at 32°C, alert off at 30°C) to prevent rapid on/off switching when a measurement oscillates around a single limit.",
      ],
      [
        "What sensor data does the project capture?",
        "The project captures temperature, relative humidity, and optional environmental metrics like heat index or simulated atmospheric pressure, formatting each packet with units and ISO timestamps.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced progress: week 1 covers sensor reading and drivers, week 2 covers MQTT networking, week 3 covers dashboard and alerts, and week 4 finalizes documentation and verification.",
      ],
      [
        "How do employers verify my IoT certificate?",
        "Each certificate features a unique GreyRocks credential ID and QR verification link that displays your verified project scope, firmware architecture, and completion status on the official portal.",
      ],
    ],
    sibling: {
      href: "/internships/devops/",
      label: "Compare with DevOps",
      difference:
        "Embedded Systems & IoT focuses on microcontroller firmware, hardware bus interfacing, and MQTT telemetry, whereas DevOps focuses on cloud infrastructure automation, Docker containers, and CI/CD pipelines.",
    },
  },
};
