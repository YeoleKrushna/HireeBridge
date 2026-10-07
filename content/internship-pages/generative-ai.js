"use strict";

const ragDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Retrieval-Augmented Generation Document Pipeline</title>
  <desc id="visual-desc">Local documents are chunked and embedded into a vector space, retrieved via top-k similarity against user queries, synthesized by an LLM with strict context boundaries, cited with page references, and guarded with explicit no-answer abstention.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">INGESTION</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">PDF Parse</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">page metadata</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">CHUNKING</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Vector Embeds</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">semantic chunks</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">RETRIEVAL</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Similarity Top-K</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">evidence match</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">PROMPT</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Context Pack</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">strict bounds</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">GROUNDED RESPONSE</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Cited Answer</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">source &amp; page number</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">ABSTENTION SAFEGUARD</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">No-Answer Gate</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">zero hallucinations</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "generative-ai",
  name: "Generative AI",
  primaryKeyword: "generative AI online internship with certificate",
  accent: "#6b4bb5",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "AI Document Assistant / RAG - Build a retrieval-augmented assistant with document ingestion, retrieval, grounded responses, and evaluation.",
    deliverables: [
      "Document ingestion pipeline preserving PDF page provenance and document metadata",
      "Chunking and embedding module with documented token/character boundary configurations",
      "Vector similarity retrieval service returning ranked context passages with relevance scores",
      "Grounded conversational interface presenting verifiable citations and honest abstention states",
      "Evaluation test suite containing supported, unsupported, and ambiguous benchmark questions",
    ],
    taskOutline: [
      "Ingest authorized PDF documents, extracting usable text while preserving page number metadata.",
      "Partition text into overlapping chunks and generate dense vector embeddings using a documented model.",
      "Implement similarity search to retrieve the top matching evidence passages for any user query.",
      "Construct grounded system prompts requiring page-level citations and enforcing an explicit refusal when context is missing.",
      "Evaluate retrieval accuracy and answer faithfulness against a documented benchmark question set.",
    ],
    validation:
      "Check page citations, empty or poor retrieval, unsupported questions, and ingestion failures.",
    toolsExpected:
      "Python, LangChain or LlamaIndex, ChromaDB or FAISS, OpenAI/HuggingFace embeddings, and Streamlit or Gradio.",
  },
  diagram: ragDiagram,
  content: {
    h1: "Build a Cited Document Assistant in a Generative AI Internship Project",
    summary:
      "This generative AI online internship with certificate is a fee-based, project-based internship programme that focuses on retrieval-augmented generation (RAG) architectures. You build an intelligent document assistant that ingests complex PDF documents, retrieves semantic evidence, enforces verifiable source citations, and demonstrates honest abstention when evidence is absent.",
    forYou: [
      "You want to build real-world GenAI applications that solve enterprise hallucination problems through retrieval grounding.",
      "You understand that responsible AI engineering requires traceable citations and measurable evaluation benchmarks.",
      "You want to master document ingestion, chunking strategies, dense vector embeddings, and similarity search pipelines.",
    ],
    notForYou: [
      "You want to train foundational large language models from scratch on massive supercomputing clusters.",
      "You only want to generate AI art images; this project focuses on enterprise document retrieval and knowledge extraction.",
      "You expect language models to guess answers when source documents do not contain the necessary facts.",
    ],
    buildIntro:
      "Large language models possess impressive conversational fluency, but in enterprise contexts, ungrounded models frequently invent plausible-sounding falsehoods. In this Generative AI project, you build an AI Document Assistant using Retrieval-Augmented Generation (RAG). You constrain the model's responses to a defined corpus of authorized PDF documents. Every factual statement generated by your assistant must cite the exact page and source passage, and when an answer cannot be proven by the retrieved text, the system must clearly declare that the information is unavailable.",
    projectNarrative: [
      "The engineering challenge begins with document ingestion. Extracting text from PDFs is fraught with formatting anomalies, headers, footers, tables, and multi-column layouts. Your ingestion pipeline parses raw PDF documents while maintaining strict metadata tags for document filename, section titles, and physical page numbers. Preserving this provenance at the extraction stage is essential for generating accurate citations later.",
      "Chunking and embedding bridge unstructured text and semantic search. If text chunks are too small, they lose vital context; if they are too large, retrieval precision degrades and injects irrelevant noise into the language model. You evaluate chunking strategies (such as 500-token chunks with 50-token overlaps) and transform these passages into dense numerical vectors using an embedding model stored within a local vector database.",
      "Retrieval logic must balance recall and precision. When a user submits an inquiry, your service embeds the query and retrieves the top-k most similar passages using cosine similarity. You evaluate whether the retrieved context contains the actual answer, inspect score thresholds, and configure the prompt orchestrator to assemble the evidence into a structured system prompt.",
      "Grounding and abstention form the safety boundary of your assistant. Your prompt engineering instructs the model to answer exclusively from the provided context and format page-level citations. Crucially, you implement and test an explicit abstention path: when the retrieved passages contain insufficient evidence, the assistant gracefully explains that the document corpus does not contain the answer, eliminating hallucinations entirely.",
    ],
    narrativeHeading: "Grounding language models in verifiable evidence and page-level citations",
    evidenceNotes: [
      "PDF parsing and ingestion pipeline script demonstrating metadata preservation across document pages.",
      "Vector store setup and configuration documentation detailing embedding dimensions and chunk sizes.",
      "Retrieval query engine source code showing top-k ranking and similarity score filtering.",
      "Grounded chat interface source code showcasing inline page citations and honest fallback messages.",
      "RAG evaluation dataset and benchmark results documenting retrieval precision and answer correctness.",
    ],
    progression: [
      [
        "Ingest",
        "Extract clean document text from PDFs while permanently attaching document and page metadata.",
      ],
      [
        "Embed",
        "Chunk passages with structured overlap and generate high-dimensional semantic vector embeddings.",
      ],
      [
        "Retrieve",
        "Execute similarity searches against your vector index to extract the most relevant context passages.",
      ],
      [
        "Synthesize",
        "Direct the language model to synthesize answers grounded strictly in retrieved passages with exact citations.",
      ],
      [
        "Evaluate",
        "Run automated benchmark evaluations testing retrieval relevance, citation accuracy, and abstention on unanswerable prompts.",
      ],
    ],
    selfCheck: [
      "Can you explain why language models hallucinate when asked questions outside their training data?",
      "Do you know why chunk size and chunk overlap choices directly impact retrieval quality?",
      "Can you describe how cosine similarity measures semantic closeness between query and document vectors?",
      "Are you prepared to enforce an explicit refusal prompt when retrieved context does not answer a question?",
      "Can you evaluate your assistant against ambiguous questions to verify that it does not fabricate facts?",
    ],
    skills: [
      {
        group: "Document Processing & Embeddings",
        items: [
          ["PDF Text Extraction", "Parse complex document layouts while preserving page numbers and section headers."],
          ["Text Chunking Strategies", "Determine optimal token window sizes and overlaps to maintain passage coherence."],
          ["Vector Embeddings", "Generate dense semantic vectors using OpenAI, Cohere, or HuggingFace embedding models."],
        ],
      },
      {
        group: "Vector Search & Orchestration",
        items: [
          ["Vector Database Indexing", "Store and query embedded vectors using ChromaDB, FAISS, or Qdrant."],
          ["Similarity Search (Top-K)", "Filter and rank relevant context passages using cosine similarity metrics."],
          ["Framework Orchestration", "Construct modular RAG pipelines with LangChain or LlamaIndex."],
        ],
      },
      {
        group: "Prompt Engineering & Evaluation",
        items: [
          ["Context-Grounded Prompting", "Design system prompts that strictly constrain answers to provided evidence."],
          ["Citation Formatting", "Instruct models to return verifiable page references for every stated claim."],
          ["RAG Triad Evaluation", "Measure context relevance, groundedness, and answer faithfulness against test suites."],
        ],
      },
    ],
    links: [
      ["OpenAI Retrieval-Augmented Generation Guide", "https://platform.openai.com/docs/guides/retrieval"],
      ["LlamaIndex Core Architecture Documentation", "https://docs.llamaindex.ai/en/stable/"],
      ["NIST Artificial Intelligence Risk Management Framework", "https://www.nist.gov/itl/ai-risk-management-framework"],
    ],
    mistakes: [
      [
        "Losing page number metadata during PDF parsing",
        "Always store page numbers and source filenames as metadata on each chunk so citations can be traced back to original pages.",
      ],
      [
        "Allowing the model to answer when retrieval finds no relevant text",
        "Configure strict guardrail prompts that instruct the model to state clearly that the answer is not present in the documents.",
      ],
      [
        "Using arbitrary chunk sizes without testing overlap",
        "Excessive chunking fragments ideas across boundaries; test overlap parameters to ensure sentences are not cut mid-thought.",
      ],
      [
        "Evaluating only easy questions where the answer is obvious",
        "Include trick questions, questions outside the document scope, and adversarial prompts to test system robustness.",
      ],
      [
        "Conflating fluency with factual accuracy",
        "A beautifully written answer can still be completely hallucinated; always verify claims against source chunk text.",
      ],
    ],
    cvPatterns: [
      "Engineered an enterprise RAG document assistant in Python using LangChain and ChromaDB, achieving [metric]% citation accuracy.",
      "Implemented a PDF ingestion pipeline indexing [number] pages with preserved metadata and zero-hallucination guardrails.",
      "Optimized semantic vector search across [number] document chunks, improving context retrieval precision by [percentage].",
      "Constructed a benchmark evaluation suite of [number] queries measuring retrieval relevance and answer faithfulness.",
      "Built an interactive chat interface in Streamlit displaying real-time source citations and explicit abstention states.",
    ],
    college: [
      "Confirm with your academic department that a Generative AI and RAG architecture project fulfills internship requirements.",
      "Submit the AI Document Assistant project brief highlighting vector embeddings, semantic retrieval, and citation verification.",
      "Include system architecture diagrams, chunking benchmark data, and prompt template designs in your final documentation.",
      "Provide public access to your project repository containing the ingestion code, vector store configuration, and chat interface.",
      "Demonstrate live document querying, citation verification, and abstention handling during your university project viva.",
    ],
    credential:
      "GreyRocks provides the technical evaluation and certification authority for HireeBridge programmes. Enrolment and fee payment provide access to the assigned project specifications, sample document sets, and architectural guidelines; they do not automatically issue a certificate. To receive certification, you submit your completed codebase, evaluation benchmark results, and video or screen recording demonstrations. An AI evaluator audits your retrieval grounding, citation integrity, and abstention handling. Approved projects are awarded an official credential with an unalterable ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "What specific project will I build in this Generative AI internship?",
        "You will build an AI Document Assistant / RAG project. You will ingest complex PDF documents, create semantic embeddings, store them in a vector database, retrieve relevant context passages for user questions, and generate answers with verifiable page citations while enforcing zero-hallucination abstention.",
      ],
      [
        "What is the difference between Generative AI and general Artificial Intelligence?",
        "General AI encompasses classical machine learning, speech recognition, and search algorithms. Generative AI specifically focuses on generative foundation models, prompt engineering, semantic embeddings, and retrieval-augmented architectures that synthesize new text grounded in verified facts.",
      ],
      [
        "Do I need to pay for expensive API keys to complete this project?",
        "No. You can complete the project using open-source embedding models (such as HuggingFace sentence-transformers) and local LLMs (via Ollama or Llama.cpp), or by utilizing free-tier developer credits from leading API providers.",
      ],
      [
        "What is an abstention path and why is it required?",
        "An abstention path is the system's ability to recognize when the retrieved documents do not contain the answer and explicitly respond that the information is unavailable. This prevents the model from hallucinating false answers.",
      ],
      [
        "How do I prove that the citations are real and not fabricated by the model?",
        "Your pipeline extracts and displays the actual text chunks and page numbers returned by the vector database alongside the generated response, allowing an evaluator to compare the generated claim against the source chunk.",
      ],
      [
        "Can I use my own choice of PDF documents?",
        "Yes. You can use authorized public sample PDFs (such as technical manuals, research papers, or open textbooks) and document your test queries against that specific collection.",
      ],
      [
        "How long does it take to complete the programme?",
        "The curriculum is designed for 4 weeks of structured, self-paced development, covering ingestion, embedding, vector search, interface construction, and evaluation.",
      ],
      [
        "Is the certificate recognized for college placement and resume building?",
        "Yes. The certificate is issued upon explicit project review by GreyRocks, providing a verifiable credential ID and QR verification link that demonstrates authentic, hands-on engineering capability.",
      ],
    ],
    sibling: {
      href: "/internships/nlp/",
      label: "Compare with Natural Language Processing (NLP)",
      difference:
        "Generative AI focuses on RAG pipelines, semantic vector search, and grounded LLM generation, whereas NLP focuses on classical text preprocessing, TF-IDF representation, and sentiment classification algorithms.",
    },
  },
};
