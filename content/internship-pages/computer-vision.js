"use strict";

const visionDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Real-time Object Detection and Alert Pipeline</title>
  <desc id="visual-desc">Video frames are sampled from an approved source, preprocessed into tensors, passed through a YOLO detector with non-maximum suppression, evaluated against confidence thresholds, debounced across multiple frames, and logged to an audit trail.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">INPUT MEDIA</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Video Stream</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">approved frames</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">PREPROCESS</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Resize &amp; Tensor</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">normalization</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">YOLO INFERENCE</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">BBox &amp; Score</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">NMS filtering</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">THRESHOLD</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Confidence Gate</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">boundary tuning</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">ALERT LOGIC</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Debounce Engine</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">multi-frame state</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">EVENT AUDIT TRAIL</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Telemetry Logs</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">timestamped records</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "computer-vision",
  name: "Computer Vision",
  primaryKeyword: "computer vision online internship with certificate",
  accent: "#c8582a",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Real-Time Fire Detection System - Build a YOLO-based image/video detection pipeline with confidence display and alert logic.",
    deliverables: [
      "Real-time visual inference script supporting image files, local video, and synthetic test frames",
      "Bounding box visualization rendering class labels, confidence scores, and detection coordinates",
      "Stateful alert engine featuring multi-frame debounce timers and manual/automatic reset controls",
      "Structured event logging module recording timestamped alerts and bounding box data",
      "Model evaluation report analyzing precision, recall, mAP, and edge-case failure modes",
    ],
    taskOutline: [
      "Load the documented YOLO model weights and configure image/video preprocessing pipelines.",
      "Execute inference to detect flame and smoke signatures, rendering bounding boxes with confidence scores.",
      "Calibrate detection confidence thresholds to balance false alarms against missed detections.",
      "Implement a stateful alert manager that prevents single-frame visual flicker from triggering spam alerts.",
      "Test model behaviour across positive samples, negative non-fire frames, and challenging lighting conditions.",
    ],
    validation:
      "Check image and video input, threshold edges, no-detection frames, and event logging.",
    toolsExpected:
      "Python, OpenCV, Ultralytics YOLO (v8 or comparable), NumPy, Matplotlib, and lightweight UI tooling.",
  },
  diagram: visionDiagram,
  content: {
    h1: "Evaluate Fire Detection Models in a Computer Vision Internship Project",
    summary:
      "This computer vision online internship with certificate is a fee-based, project-based internship programme that focuses on real-time object detection engineering. You build an image and video processing pipeline using YOLO, render bounding boxes with confidence indicators, implement stateful alert debouncing, log timestamped detection events, and evaluate performance boundaries on challenging visual test data.",
    forYou: [
      "You want to master the complete computer vision inference pipeline: frame extraction, normalization, tensor inference, and NMS.",
      "You recognize that real-world object detection requires careful threshold tuning and stateful alert logic rather than raw model output.",
      "You want to build an inspectable prototype that logs timestamped coordinates and documents visual failure modes responsibly.",
    ],
    notForYou: [
      "You are looking to certify a commercial life-safety product; this programme is an educational software engineering prototype.",
      "You want to build text processing pipelines; our NLP programme focuses directly on natural language and sentiment analysis.",
      "You expect deep learning models to be 100% accurate under all visual conditions without false alarms or lighting sensitivity.",
    ],
    buildIntro:
      "Deploying computer vision models in real-world scenarios requires much more than simply running an inference loop. In this Computer Vision project, you design a Real-Time Fire Detection System using a documented YOLO model. You process approved images and authorized local video streams, draw accurate bounding boxes, establish confidence thresholds, implement multi-frame alert debounce logic to avoid false alarms, and maintain an auditable event log. You document the prototype's operational boundaries honestly, acknowledging that software models are decision-support tools rather than certified safety devices.",
    projectNarrative: [
      "The visual processing pipeline begins with frame acquisition and normalization. Whether processing static image files or video sequences, each input frame must be resized to match the model's expected dimensions (such as 640x640), normalized, and converted into input tensors. Your OpenCV pipeline maintains consistent aspect ratios through letterboxing, ensuring that spatial proportions are preserved without image distortion.",
      "YOLO inference performs object detection in a single forward pass. The network predicts bounding box coordinates (x, y, width, height), class probabilities, and objectness scores across spatial grid cells. To eliminate duplicate overlapping boxes around the same flame or smoke region, you implement Non-Maximum Suppression (NMS) using an Intersection over Union (IoU) threshold, ensuring only the highest-confidence bounding box survives.",
      "Alert logic must handle transient visual noise. In live video, a single frame featuring bright headlights or reflective sunlight can momentarily trigger a high-confidence detection. Rather than immediately sounding an alarm, your alert manager uses multi-frame persistence checks (requiring detections across several consecutive frames) and debounce timers before elevating an alert state. When no fire is present, the interface cleanly displays a normal operational status.",
      "Event logging and systematic evaluation establish technical credibility. Your system records every verified alert into a structured log containing timestamps, confidence scores, bounding box coordinates, and frame numbers. You benchmark performance on labelled validation sets, inspecting precision-recall curves and documenting specific failure modes (such as sunset glares or red clothing) to delineate the exact boundary of the prototype's reliability.",
    ],
    narrativeHeading: "From raw video frames to robust bounding box detection and alert state machines",
    evidenceNotes: [
      "OpenCV frame ingestion and letterbox preprocessing script supporting image and local video streams.",
      "Documented YOLO inference script featuring bounding box visualization and confidence overlays.",
      "Multi-frame debounce state machine code preventing spurious single-frame alert activations.",
      "Structured CSV/JSON event log file recording timestamped detection events and coordinates.",
      "Model evaluation report analyzing precision, recall, and annotated visual failure cases.",
    ],
    progression: [
      [
        "Ingest & Preprocess",
        "Capture video frames with OpenCV, apply letterbox resizing, and normalize tensors for YOLO inference.",
      ],
      [
        "Detect & Filter",
        "Execute model forward passes, extract bounding box coordinates, and apply Non-Maximum Suppression.",
      ],
      [
        "Calibrate Thresholds",
        "Tune confidence thresholds to balance sensitivity against environmental false alarms.",
      ],
      [
        "Debounce Alerts",
        "Implement a stateful alert manager requiring multi-frame persistence before triggering an alert state.",
      ],
      [
        "Log & Benchmark",
        "Generate timestamped audit logs and evaluate detection metrics on positive, negative, and edge-case frames.",
      ],
    ],
    selfCheck: [
      "Can you explain how Non-Maximum Suppression (NMS) removes duplicate overlapping bounding boxes?",
      "Do you know why letterbox resizing is superior to naive stretching when preprocessing image tensors?",
      "Can you explain why a multi-frame debounce mechanism is essential for video alert systems?",
      "Are you prepared to show examples of negative frames where your system correctly produces zero detections?",
      "Can you articulate why this prototype must never be marketed as a replacement for certified smoke detectors?",
    ],
    skills: [
      {
        group: "Computer Vision & Preprocessing",
        items: [
          ["OpenCV Frame Processing", "Capture, resize, letterbox, and manipulate video streams and static image arrays."],
          ["Coordinate Normalization", "Translate normalized bounding box coordinates into physical screen pixel dimensions."],
          ["Non-Maximum Suppression (NMS)", "Apply IoU overlap thresholds to filter redundant spatial predictions."],
        ],
      },
      {
        group: "Deep Learning Inference",
        items: [
          ["YOLO Architecture & Weights", "Load, configure, and execute object detection models using Ultralytics or PyTorch."],
          ["Confidence Threshold Tuning", "Calibrate minimum confidence scores to minimize false positives under varying light."],
          ["Precision-Recall Evaluation", "Compute Mean Average Precision (mAP) and evaluate confusion matrices across test sets."],
        ],
      },
      {
        group: "System Architecture & Logging",
        items: [
          ["Stateful Alert Management", "Design debounce logic and state transitions to prevent erratic alarm flicker."],
          ["Structured Audit Trails", "Log timestamped detection coordinates and confidence values to persistent storage."],
          ["Failure Mode Analysis", "Systematically document environmental conditions (glare, smoke vs dust) that confuse the model."],
        ],
      },
    ],
    links: [
      ["Ultralytics YOLO Documentation", "https://docs.ultralytics.com/"],
      ["OpenCV Python Tutorials", "https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html"],
      ["NIST AI Risk Management Framework", "https://www.nist.gov/itl/ai-risk-management-framework"],
    ],
    mistakes: [
      [
        "Claiming the prototype replaces commercial fire alarms",
        "Always document that this is an educational computer vision experiment and not a certified safety device.",
      ],
      [
        "Triggering alerts on a single flickering frame",
        "Implement multi-frame persistence checks so transient glares or visual artifacts do not trigger false alerts.",
      ],
      [
        "Evaluating only on clear fire images and ignoring negative frames",
        "Test your model extensively on regular office, warehouse, and outdoor scenes without fire to measure false-positive rates.",
      ],
      [
        "Distorting image aspect ratios during resizing",
        "Use letterboxing with padding to preserve the original geometry of objects rather than stretching images to a square.",
      ],
      [
        "Omitting detection confidence scores from the visual output",
        "Always display the confidence percentage above bounding boxes so operators can observe the model's certainty level.",
      ],
    ],
    cvPatterns: [
      "Developed a real-time fire and smoke detection pipeline in Python using YOLOv8 and OpenCV, achieving [metric]% mAP50.",
      "Implemented a stateful multi-frame alert debounce algorithm, reducing false-positive alert flicker by [percentage] in video streams.",
      "Engineered an automated event logging module recording timestamped bounding box coordinates and detection confidence scores.",
      "Benchmarked model performance across [number] video clips under varying illumination, smoke density, and background noise.",
      "Constructed an interactive desktop review interface rendering real-time bounding boxes and system status indicators.",
    ],
    college: [
      "Verify with your university project coordinator that a real-time computer vision and object detection project satisfies curriculum requirements.",
      "Submit the official project synopsis detailing YOLO architecture, frame preprocessing, confidence thresholds, and alert state management.",
      "Include precision-recall curves, confusion matrices, bounding box screenshots, and event log exports in your final submission.",
      "Provide public access to your repository containing clean modular Python scripts, requirements files, and setup instructions.",
      "Prepare a live video demonstration showcasing real-time detection, alert triggering, and reset capabilities for your academic viva.",
    ],
    credential:
      "GreyRocks manages the evaluation and verifiable credentialing framework for HireeBridge technical programmes. Paying the enrolment fee provides access to the project specification, reference pipelines, and testing rubrics; it does not guarantee a completion certificate upon payment. To obtain your credential, you must submit your complete codebase, evaluation report, and video demonstration. A technical evaluator verifies your preprocessing pipeline, threshold handling, debounce logic, and honest failure documentation. Approved submissions receive an official credential featuring a unique credential ID and QR code verifying authenticity on GreyRocks.",
    faqs: [
      [
        "What specific computer vision project will I build?",
        "You will build a Real-Time Fire Detection System using a documented YOLO model and OpenCV. You will process images and local video streams, render bounding boxes with confidence scores, implement multi-frame alert debounce logic, and record timestamped event logs.",
      ],
      [
        "Can this software be used as an actual fire safety alarm?",
        "No. This project is strictly an educational software prototype. You will document this boundary explicitly in your project report, emphasizing that computer vision prototypes cannot replace certified physical smoke and fire alarms.",
      ],
      [
        "Do I need an expensive GPU to run this project?",
        "No. Modern lightweight YOLO models (such as YOLOv8n) run efficiently on standard modern laptop CPUs at real-time or near-real-time speeds (15–30 FPS), making this project accessible without dedicated hardware.",
      ],
      [
        "What is Non-Maximum Suppression (NMS) and why is it needed?",
        "Object detection models typically predict dozens of overlapping candidate bounding boxes for a single object. Non-Maximum Suppression filters out all overlapping boxes that have lower confidence scores, leaving only the single most accurate box.",
      ],
      [
        "How do I prevent false alarms caused by red objects or bright sunlight?",
        "You calibrate your confidence threshold and implement a multi-frame debounce algorithm that requires consistent detections across multiple consecutive frames before an alert is officially raised.",
      ],
      [
        "What video inputs can I use for testing?",
        "You can use authorized public fire and smoke datasets, royalty-free stock footage of controlled flames, or synthetic video clips. You must also test normal indoor and outdoor scenes containing zero fire.",
      ],
      [
        "How is the project evaluated by the GreyRocks team?",
        "Reviewers check your OpenCV frame handling and letterboxing, examine your YOLO model integration, test your alert debounce and reset state machine, and review your evaluation report and failure mode documentation.",
      ],
      [
        "Does the certificate include a verifiable link?",
        "Yes. Approved projects receive a certificate issued by GreyRocks with a unique credential ID and scannable QR verification code that links directly to the official online verification registry.",
      ],
    ],
    sibling: {
      href: "/internships/deep-learning/",
      label: "Compare with Deep Learning",
      difference:
        "Computer Vision specializes in real-time object detection (bounding boxes, video streaming, OpenCV, YOLO), whereas Deep Learning explores training deep neural networks and custom convolutional backbones from scratch.",
    },
  },
};
