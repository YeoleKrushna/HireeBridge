"use strict";

const cyberDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Defensive Phishing URL Triage and Analysis Architecture</title>
  <desc id="visual-desc">Untrusted URL strings are safely ingested as inert text without network contact, transformed into documented lexical features, evaluated by a machine learning classifier, and explained via feature importance in an analyst audit dashboard.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">CONTAINMENT</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Inert URL</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">zero network fetch</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">FEATURE EXTRACTION</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Lexical Signals</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">entropy &amp; symbols</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">MODEL INFERENCE</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">ML Classifier</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">risk probability</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">DECISION</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Triage Flag</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">analyst alert</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">EXPLAINABILITY</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">SHAP Signals</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">feature importance</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">SECURITY AUDIT</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Analyst Review</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">immutable triage log</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "cyber-security",
  name: "Cyber Security",
  primaryKeyword: "cyber security online internship with certificate",
  accent: "#9b4d1a",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Explainable Phishing URL Detection Platform - Extract URL features, classify likely phishing indicators, explain predictions, and present results in an analyst dashboard.",
    deliverables: [
      "Safe URL feature extraction pipeline with strict no-fetch containment guarantees",
      "Model training, cross-validation, and classification performance report",
      "Model explainability module detailing top risk factors using SHAP or feature coefficients",
      "Interactive analyst triage dashboard displaying predictions, confidence, and explanations",
      "Comprehensive project report covering defensive posture, dataset provenance, and test cases",
    ],
    taskOutline: [
      "Establish defensive input handling ensuring untrusted URL strings are never fetched or resolved.",
      "Extract documented structural, lexical, and statistical features from cited or synthetic datasets.",
      "Train and compare classification algorithms, measuring precision, recall, and false-positive rates.",
      "Integrate explainability to reveal which specific URL attributes triggered the risk score.",
      "Construct a security analyst review dashboard and execute tests with defanged and malformed inputs.",
    ],
    validation:
      "Confirm no outbound URL requests, validate feature extraction, and test malformed or defanged strings.",
    toolsExpected:
      "Python, Scikit-learn, Pandas, SHAP or LIME, Streamlit or Flask, and defensive security testing suites.",
  },
  diagram: cyberDiagram,
  content: {
    h1: "Build an Explainable Phishing Detection Platform in a Cyber Security Internship Project",
    summary:
      "This cyber security online internship with certificate is a fee-based, project-based internship programme that focuses on defensive security engineering. You build an explainable phishing detection system that triages suspicious URL strings without visiting dangerous destinations, extracts verifiable lexical indicators, evaluates classification models, and presents results in a security operations dashboard.",
    forYou: [
      "You are interested in defensive cyber security, threat analysis, and automated incident triage.",
      "You understand why security prototypes must enforce strict containment when handling untrusted inputs.",
      "You want to combine machine learning classification with explainable security telemetry that analysts can audit.",
    ],
    notForYou: [
      "You want to perform offensive exploit payload generation against unauthorized web targets; ethical hacking labs require distinct authorization.",
      "You expect to build a production antivirus engine; this project focuses on analytical triage and explainable classification.",
      "You plan to browse or download malicious payloads directly; safety rules strictly prohibit outbound live requests.",
    ],
    buildIntro:
      "Security analysts face thousands of suspicious alert URLs every day. Visiting an unverified URL to determine if it is dangerous exposes corporate infrastructure to malware downloads, browser exploits, and attacker reconnaissance. In this Cyber Security project, you design a secure analyst tool that treats suspicious URLs as inert text data. You extract structural and lexical attributes, train a statistical classifier, compute explainable risk indicators, and deliver an auditable dashboard that empowers analysts to make rapid, defensible triage decisions.",
    projectNarrative: [
      "The foundational security principle of this project is strict input containment. When evaluating suspicious links, your pipeline must never initiate network calls, perform DNS lookups against unknown servers, or trigger browser pre-fetching. You enforce safe parsing rules, support defanged URL notations like 'hxxp[://]', and guarantee that untrusted inputs cannot compromise the analysis host.",
      "Feature engineering transforms raw URL strings into quantifiable threat signals. You compute lexical measurements such as string length, subdomain depth, presence of IP addresses in hostnames, special character counts (such as '@', '-', and '%'), and Shannon entropy over character distributions. Because legitimate brands often encounter typosquatting, your pipeline checks for misleading subdomain prefixing and character substitutions.",
      "Model evaluation requires balancing security trade-offs. In defensive operations, false positives overwhelm security operations center (SOC) analysts with spurious alerts, while false negatives allow credential harvesters to reach employee inboxes. You compare multiple classifiers (such as Random Forest and Logistic Regression), inspect precision-recall trade-offs, and establish a justifiable decision threshold based on defensive operational needs.",
      "Explainability transforms black-box predictions into actionable intelligence. By integrating SHAP (SHapley Additive exPlanations) or interpretable feature importances, your tool shows an analyst exactly why a URL scored 88% risk by highlighting high entropy, excessive subdomains, or suspicious token patterns. This allows security responders to justify firewall blocks and document forensic evidence with confidence.",
    ],
    narrativeHeading: "Defensive triage, strict containment, and interpretable threat telemetry",
    evidenceNotes: [
      "Input containment test suite verifying zero outbound HTTP, TCP, or DNS network calls.",
      "Documented feature extraction module producing repeatable numerical vectors from raw strings.",
      "Model comparison matrix detailing Precision, Recall, F1-Score, and ROC-AUC across test splits.",
      "SHAP summary plots demonstrating feature impact on benign versus phishing classifications.",
      "Security analyst web dashboard source code featuring input defanging, prediction metrics, and audit history.",
    ],
    progression: [
      [
        "Contain",
        "Implement strict input sanitization ensuring URL strings remain inert text without network resolution.",
      ],
      [
        "Extract",
        "Compute documented lexical, structural, and entropy features from benign and malicious sample corpora.",
      ],
      [
        "Classify",
        "Train and cross-validate statistical classifiers while tuning decision thresholds to minimize false alerts.",
      ],
      [
        "Explain",
        "Generate feature attribution values to expose the exact signals driving each suspicious URL risk score.",
      ],
      [
        "Audit",
        "Build an analyst triage dashboard and test edge cases using malformed, truncated, and defanged URLs.",
      ],
    ],
    selfCheck: [
      "Do you understand why defensive security tools must never execute or fetch untrusted URL targets?",
      "Can you calculate Shannon entropy on a string and explain what high randomness indicates in domain names?",
      "Can you differentiate between a false positive and a false negative in a security triage context?",
      "Are you prepared to explain how SHAP values translate statistical model output into analyst-readable evidence?",
      "Can you test your feature extraction code against defanged and malformed inputs without generating uncaught exceptions?",
    ],
    skills: [
      {
        group: "Defensive Security Foundations",
        items: [
          ["Input Containment & Defanging", "Safely handle malicious indicators without triggering automatic execution or network lookups."],
          ["Threat Surface Analysis", "Identify common adversary tactics including typosquatting, credential harvesting, and obfuscation."],
          ["Security Audit Logging", "Record timestamped triage decisions and feature attributions for forensic investigation."],
        ],
      },
      {
        group: "Feature Engineering & ML",
        items: [
          ["Lexical Feature Extraction", "Calculate string metrics, token counts, entropy, and symbol frequencies from raw URLs."],
          ["Model Evaluation & Tuning", "Evaluate classifiers with precision, recall, confusion matrices, and ROC curves."],
          ["Explainable AI (XAI)", "Apply SHAP or LIME to explain individual risk scores to incident responders."],
        ],
      },
      {
        group: "Security Tooling & Interface",
        items: [
          ["Analyst Dashboard Design", "Construct clear, accessible triage interfaces displaying risk scores and signal breakdowns."],
          ["Edge-Case Validation", "Validate pipeline resilience against empty inputs, non-standard encodings, and defanged schemas."],
          ["Technical Documentation", "Author defensive security reports detailing threat assumptions, limitations, and operational usage."],
        ],
      },
    ],
    links: [
      ["OWASP Input Validation Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html"],
      ["Scikit-Learn Classification Evaluation", "https://scikit-learn.org/stable/modules/model_evaluation.html"],
      ["SHAP Explainability Documentation", "https://shap.readthedocs.io/en/latest/"],
    ],
    mistakes: [
      [
        "Initiating live HTTP requests to submitted links",
        "Never connect to or resolve untrusted URLs; analyze their structure purely through string operations and static features.",
      ],
      [
        "Relying solely on overall accuracy for evaluation",
        "Phishing datasets are often imbalanced; measure precision, recall, and false-positive rates to understand operational impact.",
      ],
      [
        "Hiding model limitations from security analysts",
        "Clearly indicate borderline predictions and document that machine learning assists human decision-making rather than replacing it.",
      ],
      [
        "Failing to handle defanged inputs gracefully",
        "Support standard security analyst notations such as 'hxxp[://]' so users can paste indicators without manual sanitization.",
      ],
      [
        "Using black-box models without explanatory evidence",
        "Always present the top contributing features alongside the risk percentage so an analyst can defend their escalation decision.",
      ],
    ],
    cvPatterns: [
      "Engineered an explainable phishing URL detection platform in Python using [classifier], achieving [metric]% precision on a corpus of [number] samples.",
      "Implemented a zero-network containment pipeline extracting [number] structural and lexical threat signals from raw URL strings.",
      "Integrated SHAP explainability into a security analyst dashboard to highlight primary risk factors for rapid incident triage.",
      "Evaluated classifier performance under class imbalance, reducing false-positive alerts by [percentage] through threshold calibration.",
      "Documented defensive security triage procedures, threat model assumptions, and automated audit logging for incident response teams.",
    ],
    college: [
      "Confirm with your academic supervisor that a defensive cyber security and automated threat detection project fulfills internship credits.",
      "Submit the detailed project synopsis emphasizing threat modeling, safe containment, machine learning, and explainability.",
      "Ensure your final report includes architectural diagrams, mathematical feature definitions, confusion matrices, and triage screenshots.",
      "Retain your version-controlled repository containing the feature extraction code, test fixtures, and dashboard implementation.",
      "Prepare a technical presentation demonstrating safe indicator analysis and model explainability to your evaluation panel.",
    ],
    credential:
      "GreyRocks serves as the independent verification body for HireeBridge technical programmes. Registration and programme fees grant access to the curated project brief, architectural guidelines, and evaluation rubrics; they do not award a completion credential automatically. After you submit your project repository, verification logs, and analytical documentation, a technical assessor evaluates your defensive containment, model validation, and dashboard functionality. Approved submissions receive an official credential with an immutable identifier and QR code linking to GreyRocks verification records.",
    faqs: [
      [
        "Does this project require visiting dangerous or live malicious websites?",
        "No. The project strictly enforces a zero-outbound-network rule. You analyze existing, cited public datasets or synthetic sample URLs entirely as inert text strings without resolving domain names or requesting web pages.",
      ],
      [
        "What is the difference between Cyber Security and Ethical Hacking?",
        "Cyber Security in this project focuses on defensive engineering, automated threat detection, telemetry, and analyst triage tooling. Ethical Hacking focuses on offensive security, vulnerability assessment, penetration testing, and authorized exploitation methodologies.",
      ],
      [
        "What datasets are used for training and testing the classifier?",
        "You utilize cited open security datasets (such as PhishTank, ISCX-URL, or synthetic equivalents) containing pre-labelled benign and malicious links. You document data provenance and avoid using proprietary or unverified sources.",
      ],
      [
        "How do I demonstrate that my tool does not make network calls?",
        "You include automated unit tests that inspect network interfaces or mock socket connections, verifying that feature extraction executes purely through string processing and statistical calculation without network socket activation.",
      ],
      [
        "Why is model explainability important in cyber security operations?",
        "Security analysts cannot block critical infrastructure or domain names based solely on an unexplained percentage score. Explainability highlights the exact signals (such as high entropy or deceptive subdomains) that justify an escalation or firewall rule.",
      ],
      [
        "Can I complete this project using standard Python libraries?",
        "Yes. Standard scientific Python libraries including Scikit-learn, Pandas, NumPy, and SHAP, coupled with a lightweight web framework like Streamlit, provide everything necessary to complete the project successfully.",
      ],
      [
        "How is the project evaluated by the GreyRocks team?",
        "Evaluators inspect your input containment safeguards, verify the mathematical correctness of your lexical features, examine your cross-validation metrics and confusion matrices, and review the clarity of your analyst dashboard.",
      ],
      [
        "Is this certificate verifiable by universities and employers?",
        "Yes. Approved projects receive a verified certificate registered on the GreyRocks verification portal, complete with a unique credential ID and scannable QR verification link.",
      ],
    ],
    sibling: {
      href: "/internships/ethical-hacking/",
      label: "Compare with Ethical Hacking & Pen Testing",
      difference:
        "Cyber Security focuses on defensive threat detection, feature extraction, and analyst triage, whereas Ethical Hacking focuses on authorized penetration testing and vulnerability assessment in a local lab.",
    },
  },
};
