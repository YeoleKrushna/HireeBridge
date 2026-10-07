"use strict";

const nlpDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Natural Language Processing Sentiment Pipeline</title>
  <desc id="visual-desc">End-to-end sentiment classification architecture demonstrating raw text tokenization, negation-aware preprocessing, n-gram TF-IDF vectorization, baseline model comparison, error analysis via confusion matrix, and interactive Streamlit inference.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">RAW TEXT</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Review Corpus</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">labelled dataset</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">PREPROCESSING</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Tokens &amp; Clean</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">negation handling</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">REPRESENTATION</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">TF-IDF Matrix</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">n-gram vocabulary</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">CLASSIFICATION</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Model Compare</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">Bayes vs Logistic</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">ERROR ANALYSIS</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Confusion Matrix</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">class-level metrics</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">INFERENCE INTERFACE</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Streamlit App</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">live review scoring</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "nlp",
  name: "NLP",
  primaryKeyword: "NLP online internship with certificate",
  accent: "#3a689f",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Product Review Sentiment Analyzer - Prepare text data, compare sentiment classifiers, and publish an interpretable prediction interface.",
    deliverables: [
      "Reproducible text preprocessing pipeline with explicit tokenization and negation handling",
      "TF-IDF feature extraction module with tuned n-gram vocabulary and stopword rules",
      "Model comparison report evaluating at least two classifiers using held-out test splits",
      "Detailed error analysis documenting class-level confusion, sarcasm, and false classifications",
      "Interactive Streamlit application providing real-time text scoring and aggregate sentiment charts",
    ],
    taskOutline: [
      "Audit the cited product review dataset, verify class balance, and establish clean label mappings.",
      "Clean raw text, preserve meaningful linguistic negation signals, and build TF-IDF matrices.",
      "Train and compare baseline classifiers (e.g. Multinomial Naive Bayes and Logistic Regression).",
      "Evaluate precision, recall, and F1-scores across positive, neutral, and negative classes.",
      "Deploy the pipeline to a Streamlit interface capable of handling single reviews and batch uploads.",
    ],
    validation:
      "Check text preprocessing, class mapping, held-out metrics, and empty or long input handling.",
    toolsExpected:
      "Python, Pandas, NLTK or spaCy, Scikit-learn, Matplotlib/Seaborn, and Streamlit.",
  },
  diagram: nlpDiagram,
  content: {
    h1: "Compare Review Sentiment Models in an NLP Internship Project",
    summary:
      "This NLP online internship with certificate is a fee-based, project-based internship programme that focuses on applied Natural Language Processing. You clean and process real-world product review text, construct TF-IDF feature representations, benchmark classification algorithms on held-out test data, perform in-depth error analysis, and deploy an interpretable sentiment prediction interface using Streamlit.",
    forYou: [
      "You want to understand how statistical text representations transform unstructured language into predictive signals.",
      "You appreciate thorough error analysis: examining why models fail on negation, subtle sarcasm, or mixed reviews.",
      "You want to build a functional NLP application with an interactive dashboard displaying both individual scores and trend summaries.",
    ],
    notForYou: [
      "You only want to generate AI text using commercial chatbot APIs; this programme teaches the underlying mechanics of text classification.",
      "You want to work with computer vision and image classification; our Computer Vision programme is more appropriate.",
      "You believe a single accuracy score proves model success without inspecting precision and recall for underrepresented classes.",
    ],
    buildIntro:
      "Customer reviews contain critical business feedback, but reading millions of comments manually is impossible. In this Natural Language Processing project, you build an end-to-end Product Review Sentiment Analyzer. You learn that text classification success depends far more on thoughtful preprocessing and feature representation than on simply feeding noisy text into an algorithm. You compare multiple classifiers, analyze misclassifications honestly, and package your solution into an interactive web interface.",
    projectNarrative: [
      "Text preprocessing is an analytical decision that dictates downstream model quality. Naively stripping all punctuation and stopwords can destroy vital sentiment clues - turning 'not good' into 'good'. Your pipeline implements careful tokenization, handles contractions, normalizes casing, and preserves negation tokens. You inspect review lengths, handle empty inputs gracefully, and verify that the dataset's ground truth labels are properly formatted.",
      "Feature representation transforms textual tokens into mathematical feature vectors. You construct a Term Frequency-Inverse Document Frequency (TF-IDF) representation, experimenting with sublinear term weighting, minimum document frequency thresholds, and n-gram ranges (unigrams and bigrams). Incorporating bigrams allows your feature extractor to capture word pairings like 'highly recommended' or 'poor quality' that single words fail to express.",
      "Model benchmarking reveals the performance characteristics of different classification algorithms. You train at least two distinct models - such as Multinomial Naive Bayes and regularized Logistic Regression - using an identical held-out test split. You avoid evaluating solely on accuracy, which is misleading when ratings are predominantly positive. Instead, you analyze per-class Precision, Recall, and Macro F1-scores.",
      "Error analysis and interface delivery bring the project into production readiness. You inspect the confusion matrix to identify where the model confuses neutral and negative sentiments, examining misclassified reviews to document linguistic edge cases such as sarcasm or domain-specific jargon. Finally, you deploy the model inside a clean Streamlit dashboard featuring instant review scoring, confidence score bars, and batch CSV sentiment visualizers.",
    ],
    narrativeHeading: "From raw linguistic tokens to interpretable sentiment analytics",
    evidenceNotes: [
      "Documented text preprocessing script demonstrating reproducible cleaning and negation preservation.",
      "TF-IDF vectorizer configuration showing tuned hyperparameter selections and n-gram ranges.",
      "Comparative model evaluation report with precision, recall, F1, and confusion matrix plots.",
      "Qualitative error analysis notebook examining representative misclassifications and ambiguous reviews.",
      "Runnable Streamlit application code with robust validation against empty and excessively long strings.",
    ],
    progression: [
      [
        "Ingest & Clean",
        "Inspect class distributions, handle missing values, and implement reproducible tokenization and negation rules.",
      ],
      [
        "Vectorize",
        "Construct an optimized TF-IDF matrix capturing both unigram and bigram sentiment expressions.",
      ],
      [
        "Train & Compare",
        "Train baseline and linear classifiers on a held-out split, recording performance across each sentiment category.",
      ],
      [
        "Diagnose Errors",
        "Inspect the confusion matrix, identify linguistic failure modes, and document model boundary conditions.",
      ],
      [
        "Deploy & Present",
        "Construct an interactive Streamlit interface capable of real-time review scoring and aggregate sentiment reporting.",
      ],
    ],
    selfCheck: [
      "Can you explain why removing all stopwords can inadvertently reverse the sentiment of a sentence?",
      "Do you understand the mathematical intuition behind Inverse Document Frequency (IDF)?",
      "Can you explain why Macro F1-Score is more reliable than overall accuracy on an imbalanced dataset?",
      "Are you prepared to show specific examples of reviews where your model produced incorrect predictions?",
      "Can your web interface handle inputs with special characters, emojis, or zero words without crashing?",
    ],
    skills: [
      {
        group: "Text Processing Foundations",
        items: [
          ["Linguistic Tokenization", "Deconstruct raw text into clean tokens while maintaining grammatical modifiers."],
          ["Negation Handling", "Preserve modifier relationships to prevent sentiment inversion during cleaning."],
          ["Text Normalization", "Apply lemmatization, contraction expansion, and controlled casing rules."],
        ],
      },
      {
        group: "Feature Engineering & Modelling",
        items: [
          ["TF-IDF Vectorization", "Tune vocabulary bounds, document frequency cutoffs, and n-gram parameters."],
          ["Multinomial Naive Bayes", "Train and evaluate probabilistic text classification baselines."],
          ["Linear Classifiers (Logistic Regression)", "Optimize regularization penalties and inspect learned feature weights."],
        ],
      },
      {
        group: "Model Diagnostics & Deployment",
        items: [
          ["Confusion Matrix Diagnostics", "Isolate cross-class error patterns between neutral, negative, and positive classes."],
          ["Per-Class Precision & Recall", "Measure trade-offs to ensure minority sentiment classes are not ignored."],
          ["Streamlit Dashboard Engineering", "Build responsive interactive interfaces for single-text and batch file scoring."],
        ],
      },
    ],
    links: [
      ["Scikit-learn Feature Extraction Documentation", "https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction"],
      ["NLTK Sentiment Analysis How-To", "https://www.nltk.org/howto/sentiment.html"],
      ["Streamlit Official Documentation", "https://docs.streamlit.io/"],
    ],
    mistakes: [
      [
        "Blindly removing negative contraction words like 'not' and 'never'",
        "Preserve critical negation tokens during stopword filtering so phrases like 'not satisfied' remain negative.",
      ],
      [
        "Evaluating only on high-level accuracy when classes are heavily skewed",
        "Most e-commerce datasets have 70%+ 5-star ratings; report macro-averaged F1 and per-class recall to reveal true capability.",
      ],
      [
        "Fitting the TF-IDF vectorizer on both training and test data simultaneously",
        "Always fit the vectorizer strictly on training data and transform the test data to prevent data leakage.",
      ],
      [
        "Failing to validate blank or whitespace-only inputs in the UI",
        "Implement explicit boundary checks in your web interface so empty inputs display a clear warning instead of throwing errors.",
      ],
      [
        "Overstating model capabilities on sarcasm and nuance",
        "Acknowledge that linear bag-of-words models struggle with sarcasm and idiomatic humor; document these known limitations clearly.",
      ],
    ],
    cvPatterns: [
      "Engineered an NLP product review sentiment classifier in Python using TF-IDF and Logistic Regression, achieving [metric]% Macro F1.",
      "Built a reproducible text preprocessing pipeline incorporating n-gram tokenization and negation preservation across [number] records.",
      "Conducted granular error analysis and confusion matrix diagnostics, uncovering linguistic failure modes in borderline review categories.",
      "Developed an interactive Streamlit inference dashboard displaying live sentiment probability scores and batch analytics.",
      "Evaluated multiple classification algorithms across class-imbalanced corpora, documenting trade-offs between precision and recall.",
    ],
    college: [
      "Verify with your college department head that an applied Natural Language Processing project satisfies internship guidelines.",
      "Submit the official project proposal outlining text preprocessing, TF-IDF vectorization, model comparison, and deployment goals.",
      "Include precision-recall curves, confusion matrices, feature coefficient tables, and application screenshots in your internship report.",
      "Ensure your GitHub repository includes comprehensive installation instructions, sample datasets, and clean modular code.",
      "Be prepared to explain tokenization choices, data leakage prevention, and model limitations during your final project evaluation.",
    ],
    credential:
      "GreyRocks serves as the independent evaluation and credential verification entity for HireeBridge technical programmes. Enrolling in the programme and paying the registration fee gives you access to the project curriculum, dataset specifications, and testing rubrics; it does not automatically confer a credential upon payment. To earn your certificate, you must submit your complete codebase, model comparison report, and working Streamlit application demonstration. A technical assessor audits your preprocessing logic, model metrics, and error analysis. Approved submissions receive an official credential featuring a unique credential ID and QR code verifying authenticity on GreyRocks.",
    faqs: [
      [
        "What dataset will I use for the sentiment analysis project?",
        "You will use a cited, publicly available product review dataset (such as Amazon product reviews, Yelp reviews, or synthetic equivalents) containing text comments and labelled sentiment categories.",
      ],
      [
        "Why do we compare multiple models instead of just using one?",
        "Comparing multiple models (such as Naive Bayes and Logistic Regression) demonstrates engineering rigor. It allows you to examine how different mathematical assumptions perform on identical text data and justify your final model selection.",
      ],
      [
        "What is the difference between NLP and Generative AI?",
        "NLP in this project focuses on analytical text classification, extracting features from raw text to predict sentiment categories. Generative AI focuses on foundational large language models, prompt engineering, and generating new text grounded in document retrieval.",
      ],
      [
        "Do I need deep learning or GPU hardware to run this project?",
        "No. High-performing TF-IDF representations combined with linear models run efficiently on standard laptop CPUs in seconds, making them ideal for understanding foundational NLP principles without expensive compute requirements.",
      ],
      [
        "How do I prove that my model avoids data leakage?",
        "You separate your dataset into distinct training and held-out test splits before vectorization. You fit the TF-IDF vectorizer only on the training set and transform the test set, demonstrating this separation in your code.",
      ],
      [
        "What should the Streamlit interface include?",
        "The interface should feature a text input area for real-time review scoring, visual confidence score indicators, and a batch upload option where users can upload a CSV and view aggregate sentiment distribution charts.",
      ],
      [
        "How long does the programme take to finish?",
        "The curriculum is designed for 4 weeks of self-paced study, allowing students to progress smoothly through data cleaning, feature engineering, model training, error analysis, and dashboard deployment.",
      ],
      [
        "Can recruiters verify my certificate online?",
        "Yes. Every issued certificate includes a unique GreyRocks credential identifier and QR code linking directly to the verification portal, verifying your project completion.",
      ],
    ],
    sibling: {
      href: "/internships/generative-ai/",
      label: "Compare with Generative AI",
      difference:
        "NLP focuses on statistical text classification, TF-IDF representations, and sentiment analysis, whereas Generative AI focuses on RAG pipelines, semantic embeddings, and context-grounded LLM generation.",
    },
  },
};
