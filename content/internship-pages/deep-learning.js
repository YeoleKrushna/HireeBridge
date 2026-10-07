"use strict";

const dlDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Deep Learning Tensor Pipeline and Evaluation Architecture</title>
  <desc id="visual-desc">Raw plant leaf images pass through augmentation tensors, compare baseline custom CNN vs transfer learning ResNet, optimize via Adam and Cross-Entropy loss, evaluate per-class precision and recall on a held-out test split, and serve inference through FastAPI.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">DATASET</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Image Pipeline</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">tensor batches</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">AUGMENTATION</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Flips &amp; Jitter</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">prevent overfit</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">ARCHITECTURE</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">CNN vs ResNet</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">transfer learning</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">OPTIMIZATION</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Adam &amp; Loss</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">backpropagation</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">CLASS METRICS</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Confusion Matrix</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">per-class recall</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">INFERENCE SERVICE</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">FastAPI Backend</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">confidence bounds</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "deep-learning",
  name: "Deep Learning",
  primaryKeyword: "deep learning online internship with certificate",
  accent: "#4a3b8c",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Plant Disease Detection System - Train or fine-tune an image classifier and expose inference with clear evaluation and limitations.",
    deliverables: [
      "Dataset preparation and data augmentation pipeline script with explicit training/validation/test splits",
      "Model training code comparing a custom convolutional neural network (CNN) against transfer learning (ResNet)",
      "Training convergence logs and learning curve plots showing loss progression and early stopping",
      "Model evaluation report detailing per-class confusion matrices, precision, recall, and uncertainty scores",
      "Lightweight inference API or web interface outputting class probabilities with clear agricultural disclaimers",
    ],
    taskOutline: [
      "Prepare labelled plant-leaf image datasets, enforce reproducible splits, and apply tensor augmentations.",
      "Build and train a baseline custom Convolutional Neural Network (Conv2D, BatchNorm, Pooling).",
      "Fine-tune a pre-trained transfer learning architecture (e.g. ResNet-18 or MobileNetV2) using Cross-Entropy Loss.",
      "Evaluate classification accuracy across individual disease categories and inspect confusing visual edge cases.",
      "Deploy a lightweight inference service providing class probabilities, uncertainty estimates, and limitation notes.",
    ],
    validation:
      "Check preprocessing parity, class mapping, inference dimensions, and held-out evaluation.",
    toolsExpected:
      "PyTorch or TensorFlow/Keras, torchvision, Albumentations or PIL, Scikit-learn, Matplotlib, and FastAPI.",
  },
  diagram: dlDiagram,
  content: {
    h1: "Train Neural Networks in a Deep Learning Internship Project",
    summary:
      "This deep learning online internship with certificate is a fee-based, project-based internship programme that focuses on neural network architecture, computer vision training pipelines, and transfer learning. You prepare image datasets, train a baseline convolutional neural network (CNN), fine-tune a pre-trained ResNet backbone, benchmark loss optimization and confusion matrices, and build a lightweight inference service with explicit uncertainty estimates.",
    forYou: [
      "You want to understand the mathematical mechanics of deep learning: backpropagation, loss functions, learning rate schedules, and tensor operations.",
      "You appreciate the engineering differences between training simple baseline models and fine-tuning deep residual architectures.",
      "You want to build a deep learning portfolio project featuring PyTorch training scripts, loss convergence curves, and deployed inference endpoints.",
    ],
    notForYou: [
      "You only want to prompt existing commercial cloud AI services; this programme teaches you how to train and fine-tune neural networks directly.",
      "You expect deep learning models to deliver 100% flawless medical or agricultural diagnoses without documented confidence limits.",
      "You want classical tabular regression modeling without neural networks; our Machine Learning programme is more focused on tabular data.",
    ],
    buildIntro:
      "Deep learning has revolutionized computer vision by replacing manual feature extraction with hierarchical neural representations learned directly from raw pixel tensors. In this Deep Learning project, you construct a Plant Disease Detection System. You work with labelled agricultural leaf images, apply data augmentation to prevent overfitting, compare a custom baseline CNN against a transfer-learning backbone (such as ResNet-18), monitor training loss convergence, diagnose per-class classification confusion, and deploy an inference service that reports calibrated prediction probabilities alongside clear agricultural disclaimers.",
    projectNarrative: [
      "The deep learning training pipeline begins with rigorous dataset hygiene. High-dimensional image data easily leads to data leakage if spatial or temporal groupings are split improperly. You establish stratified training, validation, and held-out test splits. To teach the network invariance against real-world lighting and orientation changes, you implement a data augmentation pipeline using random horizontal flips, minor rotations, color jitter, and normalization matching ImageNet standards.",
      "Neural architecture design involves comparing foundational baselines against modern transfer learning. You implement a custom convolutional neural network (CNN) from scratch by stacking Conv2D layers, Batch Normalization, ReLU activations, and MaxPooling. Next, you implement transfer learning by freezing the feature extractor of a pre-trained ResNet-18 or MobileNetV2 architecture and retraining the classification head on your plant disease classes, comparing convergence speed and final accuracy.",
      "Optimization requires active monitoring of training dynamics. Using PyTorch, you write an explicit training loop computing Cross-Entropy Loss and updating weights via the Adam optimizer. You track both training loss and validation loss across epochs, implementing learning rate schedulers and early stopping to halt training before the network overfits to training noise. You plot training curves that provide transparent proof of model convergence.",
      "Evaluation and deployment turn model weights into usable software. Rather than reporting a single top-level accuracy number, you construct a granular confusion matrix across plant disease classes to identify where the model struggles (such as distinguishing between early blight and late blight). Finally, you expose the model through a lightweight FastAPI service that returns top-3 class predictions, confidence probabilities, and an explicit advisory reminding users that the prototype provides decision-support analysis rather than definitive diagnosis.",
    ],
    narrativeHeading: "From raw image tensors to optimized convolutional neural networks and inference APIs",
    evidenceNotes: [
      "Data pipeline script demonstrating train/val/test splitting, image normalization, and data augmentations.",
      "PyTorch training scripts containing custom CNN baseline and fine-tuned ResNet transfer learning implementations.",
      "Training convergence plots displaying training loss versus validation loss across training epochs.",
      "Per-class evaluation report featuring confusion matrix heatmaps, precision, recall, and F1 metrics.",
      "FastAPI inference script and curl/Postman logs showing image upload, class predictions, and confidence distributions.",
    ],
    progression: [
      [
        "Prepare Tensors",
        "Load raw leaf images, establish strict dataset splits, and apply normalization and data augmentations.",
      ],
      [
        "Build Baseline CNN",
        "Implement a custom multi-layer convolutional neural network to establish an empirical performance baseline.",
      ],
      [
        "Apply Transfer Learning",
        "Fine-tune a pre-trained ResNet backbone, configuring layer freezing and classification head replacements.",
      ],
      [
        "Optimize Training",
        "Execute the PyTorch training loop using Cross-Entropy Loss, Adam optimization, and early stopping guards.",
      ],
      [
        "Evaluate & Deploy",
        "Generate per-class confusion matrices and deploy a lightweight FastAPI inference endpoint with confidence scores.",
      ],
    ],
    selfCheck: [
      "Can you explain why transfer learning generally outperforms training small CNNs from scratch on limited image datasets?",
      "Do you understand the mathematical role of Batch Normalization in stabilizing deep neural network training?",
      "Can you diagnose overfitting by comparing training loss curves against validation loss curves?",
      "Are you prepared to explain how Cross-Entropy Loss evaluates predicted probability distributions against ground truth labels?",
      "Can you articulate why agricultural diagnostic models must communicate confidence intervals and advisory limits?",
    ],
    skills: [
      {
        group: "Tensor Pipelines & Augmentation",
        items: [
          ["PyTorch DataLoaders", "Construct efficient batching, shuffling, and worker thread pipelines for image datasets."],
          ["Image Augmentation", "Apply random affine transformations, flips, and color jitter to combat overfitting."],
          ["Tensor Normalization", "Normalize pixel channels to match pre-trained model input expectations."],
        ],
      },
      {
        group: "Neural Architecture & Training",
        items: [
          ["Convolutional Neural Networks", "Design Conv2D, pooling, and fully connected architectures from scratch."],
          ["Transfer Learning (ResNet/MobileNet)", "Fine-tune pre-trained weights by adapting classifier heads to custom domains."],
          ["Loss Functions & Optimizers", "Configure Cross-Entropy Loss, Adam/SGD optimizers, and learning rate schedulers."],
        ],
      },
      {
        group: "Model Evaluation & Serving",
        items: [
          ["Confusion Matrix Diagnostics", "Analyze per-class precision and recall to uncover confusing visual classes."],
          ["FastAPI Model Serving", "Wrap trained PyTorch weights into responsive REST API endpoints for image classification."],
          ["Uncertainty & Disclaimers", "Expose top-k probability distributions and document operational model limitations."],
        ],
      },
    ],
    links: [
      ["PyTorch Official Tutorials", "https://pytorch.org/tutorials/"],
      ["Torchvision Models & Pre-trained Weights", "https://pytorch.org/vision/stable/models.html"],
      ["Deep Learning Book by Goodfellow, Bengio, and Courville", "https://www.deeplearningbook.org/"],
    ],
    mistakes: [
      [
        "Evaluating the model on augmented images",
        "Apply data augmentation strictly to the training split; test and validation sets must remain unaugmented for clean evaluation.",
      ],
      [
        "Training without monitoring validation loss",
        "Always evaluate on a validation set at the end of every epoch to detect overfitting before the model memorizes training noise.",
      ],
      [
        "Forgetting to switch between model.train() and model.eval()",
        "Ensure model.eval() and torch.no_grad() are called during validation to disable dropout and freeze batch normalization layers.",
      ],
      [
        "Reporting only overall accuracy when disease classes are unbalanced",
        "Inspect per-class recall to ensure the model is not achieving high overall accuracy by simply ignoring rare disease categories.",
      ],
      [
        "Claiming the prototype provides definitive agricultural diagnosis",
        "Always state clearly that the model is an educational prototype and that real-world plant diagnosis requires expert agronomic inspection.",
      ],
    ],
    cvPatterns: [
      "Trained and evaluated deep convolutional neural networks in PyTorch for plant disease detection, achieving [metric]% top-1 accuracy.",
      "Implemented transfer learning with ResNet-18, improving convergence speed by [percentage] compared to a baseline custom CNN.",
      "Constructed an automated data augmentation pipeline mitigating overfitting across a corpus of [number] high-resolution leaf images.",
      "Analyzed per-class confusion matrices across [number] categories, identifying morphological feature similarities between disease stages.",
      "Deployed a lightweight FastAPI inference microservice serving real-time image predictions with probability confidence scores.",
    ],
    college: [
      "Confirm with your academic department that a deep learning, convolutional neural network, and image classification project fulfills internship requirements.",
      "Submit the official project brief outlining dataset preparation, CNN baseline design, transfer learning, and inference API milestones.",
      "Include training loss plots, confusion matrix charts, architectural layer diagrams, and API response logs in your final report.",
      "Provide public GitHub access to your PyTorch codebase containing reproducible training scripts and requirements files.",
      "Prepare a technical demonstration showcasing live image classification and confidence score generation for your university panel.",
    ],
    credential:
      "GreyRocks provides the technical assessment and credential verification infrastructure for HireeBridge programmes. Enrolment and fee payment grant access to the project specifications, starter architectures, and evaluation rubrics; they do not automatically award a completion certificate upon payment alone. To obtain your credential, you submit your completed PyTorch training scripts, loss convergence charts, evaluation report, and inference API code. A deep learning evaluator reviews your tensor pipelines, optimization choices, confusion matrices, and model disclaimers. Approved projects earn an official credential featuring a unique credential ID and QR verification destination on GreyRocks.",
    faqs: [
      [
        "What is the difference between Deep Learning and Machine Learning?",
        "Machine Learning typically uses algorithms like Random Forests or SVMs on pre-calculated tabular features. Deep Learning uses multi-layered neural networks (like CNNs or Transformers) that learn hierarchical representations directly from raw, unstructured data like images and audio.",
      ],
      [
        "Do I need an expensive cloud GPU to train this model?",
        "No. You can train the custom CNN and fine-tune lightweight transfer learning models (like ResNet-18 or MobileNetV2) using free cloud GPU environments like Google Colab or Kaggle Notebooks, or on modern laptop hardware.",
      ],
      [
        "What dataset will I use for the plant disease project?",
        "You will use cited, publicly available benchmark datasets (such as PlantVillage or curated synthetic equivalents) containing labelled healthy and diseased leaf photographs across diverse crop types.",
      ],
      [
        "What is transfer learning and why is it used?",
        "Transfer learning takes a neural network pre-trained on millions of diverse images (ImageNet) and repurposes its learned visual features (edges, textures, shapes) for your specific plant disease task, dramatically reducing training time and data requirements.",
      ],
      [
        "How do I prove that my model did not overfit?",
        "You provide training and validation loss curves plotted across all epochs. When training and validation loss decrease together and level off without validation loss diverging, you demonstrate healthy model generalization.",
      ],
      [
        "What should the inference API do?",
        "The API (built with FastAPI) accepts an uploaded leaf image, preprocesses it into a tensor, runs a forward pass through the model, and returns a JSON response containing the top predicted disease classes and their softmax probability percentages.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced study: week 1 covers data preparation and augmentations, week 2 builds the baseline CNN, week 3 applies transfer learning, and week 4 finalizes evaluation and the API.",
      ],
      [
        "How do employers verify my Deep Learning certificate?",
        "Each certificate features an official GreyRocks credential ID and a scannable QR verification code that displays your verified project scope and completion record on the online verification portal.",
      ],
    ],
    sibling: {
      href: "/internships/machine-learning/",
      label: "Compare with Machine Learning",
      difference:
        "Deep Learning focuses on deep neural networks, tensor operations, backpropagation, and image classification, whereas Machine Learning focuses on classical tabular algorithms, feature engineering, and churn prediction.",
    },
  },
};
