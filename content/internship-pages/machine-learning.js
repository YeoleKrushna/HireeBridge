"use strict";
module.exports = {
  pilot: true,
  slug: "machine-learning",
  name: "Machine Learning",
  primaryKeyword: "machine learning online internship with certificate",
  accent: "#7b5c9c",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Customer Churn Prediction System - create a churn prediction pipeline with probability scores, model explanations, and a review dashboard.",
    deliverables: [
      "A documented preparation pipeline",
      "A comparison of at least two classification models",
      "Qualified churn probability scores",
      "A model-explanation report",
      "A review dashboard and setup guide",
    ],
    taskOutline: [
      "Profile a documented churn dataset and identify possible target leakage.",
      "Create preprocessing that is fitted on training data and handles incomplete records.",
      "Compare at least two classifiers while accounting for class balance.",
      "Evaluate threshold behaviour and explain qualified probability scores.",
      "Present risk segments and feature explanations for human review, not automated customer decisions.",
    ],
    validation:
      "Check split strategy, metrics, score ranges, threshold behaviour, explanations and incomplete records.",
  },
  content: {
    summary:
      "This fee-based, project-based educational programme is centred on a customer churn prediction system. You build a reproducible classification pipeline, compare models, inspect thresholds, qualify probability scores and prepare explanations for human review. The page treats machine learning as an evaluation discipline rather than a promise that a model can determine customer behaviour.",
    forYou: [
      "You want sustained practice with preprocessing, classification, validation and model comparison.",
      "You are willing to examine leakage, imbalance, thresholds and incomplete records before discussing model performance.",
      "You can communicate probability and explanation limits to a non-specialist reviewer.",
    ],
    notForYou: [
      "You want an AI assistant, speech interface or generative application; that is a different project boundary.",
      "You plan to automate retention treatment solely from a churn score. The catalogue frames the dashboard for staff review.",
      "You require a job, stipend or guaranteed college acceptance rather than a project-based educational programme.",
    ],
    buildIntro:
      "The Customer Churn Prediction System begins with a documented public or synthetic subscription dataset. The central question is whether information available before an account leaves can support a qualified risk estimate. The pipeline must keep the outcome out of its predictors, fit transformations without looking at validation data, and preserve the same preprocessing rules when it scores incomplete records.",
    progression: [
      [
        "Define the target",
        "Write what counts as churn, when it is observed and which fields would have existed before that point.",
      ],
      [
        "Build the split",
        "Choose and justify training and held-out partitions before fitting encoders, scalers, imputers or resampling operations.",
      ],
      [
        "Establish comparisons",
        "Use a simple baseline and at least two suitable classifiers so improvement has a meaningful reference.",
      ],
      [
        "Inspect thresholds",
        "Compare precision, recall and error costs at more than one operating threshold instead of treating 0.5 as automatic.",
      ],
      [
        "Package the pipeline",
        "Keep preprocessing and prediction together, test score ranges and incomplete records, then connect qualified outputs to the review dashboard.",
      ],
    ],
    skills: [
      {
        group: "Pipeline construction",
        items: [
          [
            "Feature review",
            "Separate information available at scoring time from leakage-prone outcome fields.",
          ],
          [
            "Preprocessing",
            "Fit repeatable transformations on training data and apply them consistently.",
          ],
          [
            "Pipeline tests",
            "Check schema, missing values, output ranges and deterministic behaviour.",
          ],
        ],
      },
      {
        group: "Validation",
        items: [
          [
            "Model comparison",
            "Compare baselines and classifiers under the same held-out design.",
          ],
          [
            "Class imbalance",
            "Use class-aware measures and explain the effect of resampling or weighting.",
          ],
          [
            "Threshold analysis",
            "Relate false positives and false negatives to a stated review use case.",
          ],
        ],
      },
      {
        group: "Interpretation",
        items: [
          [
            "Probability language",
            "Describe scores as model estimates, not facts about a person.",
          ],
          [
            "Feature explanations",
            "Show associations driving predictions without calling them causes.",
          ],
          [
            "Review dashboard",
            "Organise segments and explanations for human investigation rather than automatic action.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Including post-churn information",
        "Cancellation reasons, final-status fields or later contact outcomes can reveal the target. Audit when every feature becomes available.",
      ],
      [
        "Preprocessing before the split",
        "Imputation, scaling or feature selection across all rows leaks held-out information into training. Fit these steps inside the pipeline.",
      ],
      [
        "Reporting accuracy for an imbalanced target",
        "A majority guess can appear strong. Include class-aware measures and a confusion matrix tied to the review question.",
      ],
      [
        "Calling probabilities certainties",
        "A score is conditional on data, model and sampling choices. Qualify it and check calibration or observed score behaviour.",
      ],
      [
        "Using explanations as causes",
        "Feature contribution methods describe the fitted model. They do not prove why an account leaves or justify automatic treatment.",
      ],
    ],
    cvPatterns: [
      "Built a reproducible churn-classification pipeline in [tool] with training-only preprocessing and leakage checks.",
      "Compared [model A] and [model B] under one held-out design, reporting [metric] and threshold behaviour.",
      "Tested probability ranges, incomplete records and [number] schema conditions before dashboard integration.",
      "Produced model explanations for human review while documenting association and causation limits.",
      "Created a risk-review dashboard showing qualified scores, segments and model limitations.",
    ],
    selfCheck: [
      "Can you state when churn is observed and when each predictor becomes available?",
      "Will all learned preprocessing be fitted on training data only?",
      "Can you explain why accuracy may be misleading for the chosen target?",
      "Will you compare threshold trade-offs instead of reporting one default result?",
      "Can you prevent the dashboard from implying automated customer decisions?",
    ],
    college: [
      "Ask whether a model-building project satisfies the relevant academic requirement.",
      "Provide the Customer Churn Prediction System scope, outputs and validation plan to your T&P or placement cell.",
      "Confirm expected dates, duration, supervision, report format and signatures before paying.",
      "Keep the data dictionary, split rationale, pipeline tests, model comparison and limitation notes.",
      "Check the official free AICTE internship portal if your institution requires an opportunity listed through that route.",
    ],
    credential:
      "The programme task must be completed, submitted and explicitly approved before a certificate record is created. The resulting GreyRocks record uses a unique credential ID and the implemented QR destination. It documents completion of the reviewed educational project, not employment or a guaranteed performance outcome.",
    faqs: [
      [
        "What is the assigned Machine Learning project?",
        "The catalogue assigns a Customer Churn Prediction System with a preparation pipeline, model comparison, probability scores, explanations and review dashboard.",
      ],
      [
        "How is this different from Data Science?",
        "This project is narrowly organised around classifier construction, validation, threshold behaviour and pipeline reliability.",
      ],
      [
        "Why compare more than one model?",
        "A comparison shows whether added complexity improves the chosen evidence under the same held-out design.",
      ],
      [
        "What does target leakage mean here?",
        "It means using information that reveals or follows churn and would not be available when a real score is produced.",
      ],
      [
        "Should the dashboard trigger retention actions?",
        "No. It should support human review and clearly qualify model estimates and limitations.",
      ],
      [
        "Are SHAP explanations proof of causation?",
        "No. They describe how a fitted model used its inputs; they do not establish why a customer left.",
      ],
      [
        "When is the certificate issued?",
        "Only after submission and explicit approval, not at payment.",
      ],
      [
        "Is institutional credit guaranteed?",
        "No. Your institution sets its own requirements, so ask before enrolling.",
      ],
    ],
    links: [
      [
        "scikit-learn model evaluation guide",
        "https://scikit-learn.org/stable/modules/model_evaluation.html",
      ],
      [
        "scikit-learn pipeline documentation",
        "https://scikit-learn.org/stable/modules/compose.html",
      ],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/data-science/",
      label: "Compare the Data Science project",
      difference:
        "Data Science uses time-ordered sensor analysis and an operations dashboard; this project focuses on classification pipelines, probability scores and threshold validation.",
    },
  },
};
