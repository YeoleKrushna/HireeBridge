"use strict";
module.exports = {
  pilot: true,
  slug: "artificial-intelligence",
  name: "Artificial Intelligence",
  primaryKeyword: "artificial intelligence online internship with certificate",
  accent: "#147d9c",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "AI Voice Assistant - build a conversational voice assistant with speech input, short-term memory, safe utilities, integrations, and a simple web interface.",
    deliverables: [
      "A runnable voice assistant",
      "A browser interface with visible transcription and error states",
      "Documented intent and utility handling",
      "Privacy and secret-management notes",
      "Evaluation examples and setup instructions",
    ],
    taskOutline: [
      "Capture or upload speech and show the resulting transcript or a useful failure state.",
      "Define supported intents and map them to bounded utility actions.",
      "Keep only the context required for the current session and provide a reset control.",
      "Place external API credentials in server-side configuration and handle service failures.",
      "Evaluate supported, unsupported and ambiguous requests, then document limitations.",
    ],
    validation:
      "Check transcription failures, supported and unsupported intents, session reset, external-service errors and secret handling.",
  },
  content: {
    summary:
      "This fee-based, project-based educational programme focuses on an AI voice assistant with a deliberately bounded set of capabilities. You design speech and text input states, intent handling, short-term context, safe utility actions and evaluation examples. The work is about constructing and testing an AI application, not claiming that it understands every request.",
    forYou: [
      "You want to connect speech processing, language interpretation and a browser interface around a clearly defined use case.",
      "You are prepared to specify what the assistant supports, what it refuses and how it behaves when a service fails.",
      "You can test varied wording and record evidence instead of presenting a few successful demonstrations.",
    ],
    notForYou: [
      "You want to describe a general-purpose assistant without defining its boundaries or evaluation cases.",
      "You plan to expose an API key in browser code or retain voice data without a stated reason.",
      "You need employment, a stipend or guaranteed institutional credit; this is an educational programme and acceptance belongs to your college.",
    ],
    buildIntro:
      "The assigned project is an AI Voice Assistant. Its quality depends less on a theatrical demonstration than on a traceable request path. A person speaks or uploads audio, the interface exposes transcription status, the application identifies a documented intent, a bounded utility performs an allowed action, and the response appears in written and spoken form. Every boundary needs an observable fallback.",
    progression: [
      [
        "Bound the assistant",
        "Choose a small, useful intent set and write examples, exclusions and required inputs before connecting a model or service.",
      ],
      [
        "Design the input states",
        "Handle microphone permission, file input, silence, unclear audio and transcription errors without trapping the user.",
      ],
      [
        "Route safe actions",
        "Separate language interpretation from utility execution, validate arguments and keep credentials on the server.",
      ],
      [
        "Manage session context",
        "Retain only the context required for the current exchange, show reset behaviour and explain what is not persisted.",
      ],
      [
        "Evaluate behaviour",
        "Use a documented prompt set covering supported, paraphrased, ambiguous, unsupported and failing-service cases.",
      ],
    ],
    skills: [
      {
        group: "Application design",
        items: [
          [
            "Intent specification",
            "Turn useful requests into explicit supported actions and exclusions.",
          ],
          [
            "Conversation state",
            "Keep limited session context predictable and resettable.",
          ],
          [
            "Fallback design",
            "Give people a clear next action when speech, interpretation or a utility fails.",
          ],
        ],
      },
      {
        group: "AI evaluation",
        items: [
          [
            "Test-set design",
            "Write varied requests before judging assistant behaviour.",
          ],
          [
            "Response review",
            "Check task completion, unsupported claims and consistency across paraphrases.",
          ],
          [
            "Responsible use",
            "Minimise retained data, disclose limitations and avoid presenting generated output as certain.",
          ],
        ],
      },
      {
        group: "Integration",
        items: [
          [
            "Speech interface",
            "Expose recording, upload, transcription and playback states accessibly.",
          ],
          [
            "Server-side utilities",
            "Validate inputs and protect service credentials outside browser code.",
          ],
          [
            "Observability",
            "Record privacy-safe error categories that help reproduce failures.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Treating one demonstration as evaluation",
        "A successful scripted request says little about paraphrases, silence, unsupported intents or upstream failure. Use a repeatable case table.",
      ],
      [
        "Allowing open-ended utility execution",
        "Language output must not become unchecked commands. Permit named actions, validate arguments and reject everything outside the documented boundary.",
      ],
      [
        "Hiding transcription from the user",
        "Visible text lets a person spot recognition errors before blaming later intent logic. Include retry and text-input alternatives.",
      ],
      [
        "Keeping unlimited conversation history",
        "Session context should have a stated purpose, limit and reset control. Do not imply persistence when none is required.",
      ],
      [
        "Placing credentials in frontend JavaScript",
        "Browser-delivered secrets are exposed secrets. Route protected integrations through server-side configuration.",
      ],
    ],
    cvPatterns: [
      "Implemented a bounded voice assistant supporting [number] documented intents with explicit unsupported-request handling.",
      "Designed speech capture, visible transcription and retry states using [tool] without placing service credentials in browser code.",
      "Created an evaluation set covering [number] paraphrase, ambiguity, failure and fallback cases.",
      "Separated language interpretation from validated utility execution for [utility type] actions.",
      "Documented session-context limits, reset behaviour, privacy assumptions and integration setup.",
    ],
    selfCheck: [
      "Can you name the exact intents the assistant will and will not handle?",
      "Will transcription and service failures remain visible and recoverable?",
      "Can every utility action validate its arguments independently of model output?",
      "Do you have evaluation cases beyond the example phrases used during development?",
      "Can a user reset session context and understand what data is retained?",
    ],
    college: [
      "Ask whether an AI application project satisfies the relevant internship or project requirement.",
      "Share the AI Voice Assistant title, deliverables and evaluation approach with your T&P or placement cell.",
      "Confirm duration, supervision, report, signature and demonstration requirements before paying.",
      "Keep your intent specification, test cases, privacy notes, source history and setup evidence.",
      "If your institution requires a listed opportunity, compare its process with the official free AICTE internship portal.",
    ],
    credential:
      "Payment provides access to the programme workflow; it does not create a certificate. Submit your own assistant, evaluation evidence and documentation for review. Following explicit approval, GreyRocks creates the certificate record with a unique credential ID and a QR destination used by the implemented verification flow.",
    faqs: [
      [
        "What is the assigned Artificial Intelligence project?",
        "The catalogue assigns an AI Voice Assistant with speech input, bounded intents, short-term session context, safe utilities, integrations and a browser interface.",
      ],
      [
        "Does the assistant need to answer every request?",
        "No. It should support a documented set and give a clear fallback for unsupported or ambiguous requests.",
      ],
      [
        "How should external API keys be handled?",
        "Keep them in server-side configuration. Never place secret keys in browser-delivered code or a public repository.",
      ],
      [
        "What should the evaluation include?",
        "Cover supported requests, paraphrases, unsupported requests, ambiguous wording, transcription problems, reset behaviour and integration failures.",
      ],
      [
        "Should voice or conversation history be stored?",
        "Retain only what the application genuinely needs, document that choice and provide session reset controls.",
      ],
      [
        "Can generated responses be presented as certain?",
        "No. Explain limitations and design responses appropriate to the bounded utility rather than implying universal accuracy.",
      ],
      [
        "When is a certificate created?",
        "Only after the task and evidence are submitted and explicitly approved. Payment alone is not completion.",
      ],
      [
        "Will a college accept this programme?",
        "The institution decides. Confirm its duration, documentation and approval rules before enrolling.",
      ],
    ],
    links: [
      [
        "Web Speech API guidance on MDN",
        "https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API",
      ],
      [
        "NIST AI Risk Management Framework",
        "https://www.nist.gov/itl/ai-risk-management-framework",
      ],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/machine-learning/",
      label: "Compare the Machine Learning project",
      difference:
        "Machine Learning concentrates on a churn prediction pipeline and model validation; this page concentrates on a bounded speech-and-language application.",
    },
  },
};
