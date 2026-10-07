"use strict";

const bioinformaticsDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Bioinformatics DNA Sequence Analysis Pipeline</title>
  <desc id="visual-desc">Pipeline illustrating multi-record FASTA sequence ingestion, strict validation handling ambiguous IUPAC bases, GC content calculation and reverse complement generation, 6-frame open reading frame scanning, codon usage frequency tabulations and peptide translation, and structured report exports with explicit non-clinical research boundaries.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">FASTA INPUT</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">Sequence File</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">FASTA stream reader</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">VALIDATION</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">IUPAC Bases</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">ambiguous characters</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">COMPOSITION</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">GC Content</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">reverse complement</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">ORF SCANNER</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">6-Frame Scan</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">start &amp; stop codons</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">TRANSLATION</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">Codon Table #1</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">peptide translation</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">RESEARCH REPORT</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Structured Export</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">non-clinical scope</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "bioinformatics",
  factsKey: "bioinformatics-computational-biology",
  catalogueDomain: "Bioinformatics & Computational Biology",
  name: "Bioinformatics & Computational Biology",
  primaryKeyword: "bioinformatics online internship with certificate",
  accent: "#1f6f8b",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "DNA Sequence Analysis Toolkit - Build a toolkit for GC content, reverse complement, ORF detection, codon usage, and translation.",
    deliverables: [
      "Modular Python CLI or lightweight web interface parsing multi-record FASTA files and generating sequence statistics",
      "Curated FASTA test fixtures containing standard sequences, edge cases, ambiguous bases, and synthetic control records",
      "Analysis reports exporting GC content percentages, codon usage frequency tables, and detected peptide translations",
      "Automated unit test suite validating reverse complements, IUPAC character handling, and 6-frame ORF boundary detection",
      "Technical assumptions and scientific methodology documentation establishing explicit non-clinical research boundaries",
    ],
    taskOutline: [
      "Implement a multi-record FASTA file parser in Python that extracts sequence headers, validates bases, and handles formatting edge cases.",
      "Calculate fundamental sequence metrics including total length, Guanine-Cytosine (GC) content percentage, and Watson-Crick reverse complements.",
      "Develop an Open Reading Frame (ORF) detection algorithm scanning across all 6 reading frames (3 forward, 3 reverse).",
      "Implement genetic code translation using standard NCBI Codon Table #1 to generate peptide sequences and codon bias tables.",
      "Package the toolkit with automated pytest coverage, execute validation on control fixtures, and author methodological documentation.",
    ],
    validation:
      "Check known sequences, ambiguous bases, empty records, complements, translation, and ORF boundaries.",
    toolsExpected:
      "Python 3.9+, standard library or Biopython, pytest, Streamlit or Rich CLI library, and public genomic FASTA records (NCBI / Ensembl).",
  },
  diagram: bioinformaticsDiagram,
  content: {
    h1: "Analyze Genomic Sequences in a Bioinformatics & Computational Biology Internship Project",
    summary:
      "This bioinformatics online internship with certificate is a fee-based, project-based internship programme focusing on computational genomics, sequence parsing algorithms, and biological data processing. You engineer a modular Python DNA sequence analysis toolkit, parse multi-record FASTA datasets, calculate GC content and reverse complements, detect open reading frames across 6 reading frames, compute codon usage frequencies, translate DNA into peptide sequences, and package automated test suites.",
    forYou: [
      "You want practical computational biology experience applying Python algorithms to real genomic sequence data.",
      "You want to master foundational bioinformatics workflows: FASTA file parsing, GC content calculations, 6-frame ORF scanning, and codon translation.",
      "You want to build a bioinformatics portfolio project featuring clean algorithmic code, comprehensive unit tests, and scientific documentation.",
    ],
    notForYou: [
      "You expect to perform wet-lab biological experiments with pipettes and physical test tubes; this programme is 100% computational software.",
      "You want to generate clinical medical diagnoses for patients; this toolkit is strictly designed for educational and computational research purposes.",
      "You believe bioinformatics is just running third-party web tools; this project requires writing your own algorithms and test suites in Python.",
    ],
    buildIntro:
      "Bioinformatics sits at the intersection of computer science, statistics, and molecular biology. With the explosion of high-throughput DNA sequencing, biological discovery depends on computational algorithms that can accurately process, parse, and analyze millions of nucleotide base pairs. In this computational biology project, you engineer a modular DNA Sequence Analysis Toolkit in Python. You build robust FASTA parsers, compute nucleotide distribution metrics, uncover protein-coding candidate sequences using 6-frame open reading frame scanning, calculate codon bias frequencies, and translate genes into amino acid peptide chains.",
    projectNarrative: [
      "Genomic data processing begins with file parsing and data sanitization. The FASTA format is the universal standard for nucleotide and amino acid sequences, consisting of header lines starting with '>' followed by sequence lines. You write a parser capable of streaming multi-record FASTA files, stripping whitespace, and handling multiline entries. You implement input validation to identify and handle non-standard IUPAC degenerate characters (such as N for any nucleotide or R for purine), ensuring malformed or empty records do not corrupt analysis pipelines.",
      "Next, you compute foundational physical and chemical sequence characteristics. You calculate the Guanine-Cytosine (GC) content percentage, a crucial biological metric that influences DNA melting temperature, genomic stability, and PCR primer design. You implement reverse complement transformation, honoring Watson-Crick base pairing rules (Adenine pairs with Thymine, Cytosine pairs with Guanine) while reversing the 5'-to-3' orientation to model the complementary anti-parallel DNA strand.",
      "Identifying protein-coding genes requires scanning for Open Reading Frames (ORFs). An ORF is a continuous stretch of codons beginning with a Start codon (ATG) and concluding with a Stop codon (TAA, TAG, or TGA). Because double-stranded DNA can be transcribed in either direction across three distinct codon offsets, you implement an algorithm that searches all 6 possible reading frames (+1, +2, +3 on the forward strand, and -1, -2, -3 on the reverse strand). You filter candidate ORFs by minimum length thresholds to eliminate short random noise sequences.",
      "Finally, you translate identified candidate nucleotide sequences into amino acid peptide chains using NCBI Standard Genetic Code Table #1. You tabulate codon usage bias metrics, computing the relative frequency of synonymous codons across the sequence. You package the entire toolkit into a clean CLI or interactive Streamlit interface, back every algorithmic step with rigorous pytest unit tests against known control plasmids, and author scientific methodology notes detailing computational assumptions.",
    ],
    narrativeHeading: "From FASTA parsing and GC content to 6-frame ORF detection, codon translation, and automated testing",
    evidenceNotes: [
      "Python codebase implementing modular classes for FASTA parsing, sequence metrics, ORF discovery, and translation.",
      "Curated FASTA test fixtures containing known biological plasmids, synthetic edge cases, and ambiguous base entries.",
      "Comprehensive unit test suite executed with pytest validating algorithmic calculations against ground-truth reference data.",
      "Tabular analysis exports (JSON or TSV) detailing GC content percentages, codon usage tables, and translated peptides.",
      "Methodology document outlining algorithmic complexity, IUPAC assumption handling, and explicit non-clinical boundaries.",
    ],
    progression: [
      [
        "FASTA Parsing & Sanitization",
        "Implement a streaming multi-record FASTA reader that validates IUPAC bases and cleans whitespace.",
      ],
      [
        "GC Content & Complements",
        "Calculate GC percentages, analyze sequence composition, and generate antiparallel reverse complements.",
      ],
      [
        "6-Frame ORF Scanning",
        "Build an algorithm detecting open reading frames across 3 forward and 3 reverse reading frames.",
      ],
      [
        "Codon Usage & Translation",
        "Map nucleotide triplets to amino acids using standard genetic code tables and tabulate codon usage bias.",
      ],
      [
        "Testing & Research Export",
        "Develop automated pytest fixtures against control genomes, generate summary reports, and document research scope.",
      ],
    ],
    selfCheck: [
      "Can you explain why DNA sequences must be scanned across 6 distinct reading frames rather than just 1?",
      "Do you know how GC content influences the thermal stability of double-stranded DNA molecules?",
      "What are the canonical start and stop codons in the standard nuclear genetic code (Table #1)?",
      "How does your algorithm handle ambiguous nucleotide characters such as 'N' during translation?",
      "Can you explain why this computational toolkit is intended for research analysis and not for clinical patient diagnoses?",
    ],
    skills: [
      {
        group: "Computational Genomics & Parsing",
        items: [
          ["FASTA File Format Engineering", "Parse multi-record genomic files, handle line wrapping, and manage metadata headers."],
          ["IUPAC Ambiguity Validation", "Sanitize nucleotide strings and validate degenerate base notations."],
          ["Sequence Manipulation & Complements", "Generate Watson-Crick antiparallel reverse complements with linear time complexity."],
        ],
      },
      {
        group: "Algorithmic Sequence Analysis",
        items: [
          ["GC Content & Composition Metrics", "Compute nucleotide frequency distributions, GC ratios, and regional skewness."],
          ["6-Frame Open Reading Frame Detection", "Scan forward and reverse strands across all three reading frames for start-to-stop intervals."],
          ["Genetic Code Translation", "Translate triplet codons into polypeptide amino acid chains using standard NCBI codon tables."],
        ],
      },
      {
        group: "Software Quality & Scientific Integrity",
        items: [
          ["Pytest Validation on Control Fixtures", "Write automated tests comparing toolkit outputs against verified NCBI reference records."],
          ["Codon Usage Frequency Analysis", "Tabulate synonymous codon distributions to analyze organismal translation bias."],
          ["Scientific Assumptions Documentation", "Author transparent methodology guides establishing computational boundaries."],
        ],
      },
    ],
    links: [
      ["NCBI Genetic Codes & Codon Tables", "https://www.ncbi.nlm.nih.gov/Taxonomy/Utils/wprintgc.cgi"],
      ["Biopython Tutorial and Cookbook", "https://biopython.org/DIST/docs/tutorial/Tutorial.html"],
      ["EMBL-EBI Introduction to Sequence Analysis", "https://www.ebi.ac.uk/training/online/courses/sequence-analysis/"],
    ],
    mistakes: [
      [
        "Scanning only the single forward reading frame for ORFs",
        "Functional genes can occur on both forward and reverse strands across 3 frame offsets; always scan all 6 frames.",
      ],
      [
        "Crashing on multiline FASTA records or whitespace",
        "Genomic sequences in FASTA format frequently span multiple lines; concatenate chunks before validating length.",
      ],
      [
        "Assuming DNA only contains A, C, G, and T",
        "Real sequencing data includes IUPAC ambiguity codes like 'N'; handle or flag these characters gracefully.",
      ],
      [
        "Translating incomplete codons at sequence ends",
        "If a sequence length is not a multiple of 3 in a given frame, the trailing 1 or 2 bases cannot form a valid codon.",
      ],
      [
        "Presenting computational outputs as clinical diagnoses",
        "Educational bioinformatics software must clearly state that results are research heuristics, not medical diagnostic findings.",
      ],
    ],
    cvPatterns: [
      "Developed a modular Python DNA sequence analysis toolkit parsing multi-record genomic FASTA datasets.",
      "Engineered a 6-frame Open Reading Frame (ORF) detection algorithm identifying candidate protein-coding sequences.",
      "Implemented codon usage frequency tabulation and translation into peptide chains using NCBI Codon Table #1.",
      "Constructed comprehensive automated pytest suites validating GC content and reverse complements against NCBI control fixtures.",
      "Authored scientific methodology documentation detailing computational assumptions, IUPAC character handling, and research scope.",
    ],
    college: [
      "Confirm with your academic supervisor that a Bioinformatics and computational sequence analysis project meets internship criteria.",
      "Submit the official project brief detailing FASTA parser development, 6-frame ORF scanning, and translation deliverables.",
      "Include algorithmic flowcharts, codon translation tables, pytest test execution reports, and research notes in your report.",
      "Provide public GitHub repository access containing Python source code, test fixtures, and setup documentation.",
      "Prepare a technical demonstration demonstrating sequence parsing, ORF detection on a known plasmid, and codon bias reporting.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, sequence analysis starter guidelines, and evaluation rubric; it does not automatically award a completion certificate upon payment alone. To receive certification, you submit your Python toolkit codebase, curated FASTA fixtures, automated test results, sample analysis reports, and methodology documentation. A computational biology evaluator reviews your parsing resilience, algorithmic correctness, 6-frame ORF logic, and documentation thoroughness. Approved submissions receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Do I need a background in biology to complete this project?",
        "No advanced biology background is needed. Basic familiarity with high school biology concepts (DNA has bases A, T, C, G; triplets code for amino acids) is sufficient. The project materials explain all computational and biological concepts clearly.",
      ],
      [
        "Can I use Biopython or must I write everything from scratch?",
        "You are encouraged to implement the core algorithms (FASTA parsing, reverse complement, and basic ORF search) from scratch using Python standard libraries to demonstrate algorithmic mastery, while optionally using Biopython for verification.",
      ],
      [
        "What is an Open Reading Frame (ORF)?",
        "An Open Reading Frame is a portion of a DNA sequence that has the potential to be translated into protein. It starts with a start codon (ATG), continues in multiples of three nucleotides, and ends with a stop codon in the same reading frame.",
      ],
      [
        "Why is GC content important?",
        "GC base pairs bond with three hydrogen bonds, whereas AT pairs bond with two. Sequences with higher GC content have higher thermal melting temperatures, which affects genome stability, gene density, and molecular biology experiments.",
      ],
      [
        "Where do I get FASTA files for testing?",
        "You can download free public reference genomes and plasmid sequences from the National Center for Biotechnology Information (NCBI) GenBank database or use the synthetic test fixtures provided in the project brief.",
      ],
      [
        "Is this software suitable for medical or clinical diagnosis?",
        "No. The toolkit is designed strictly as an educational and computational research tool. All outputs are explicitly scoped for non-clinical research applications.",
      ],
      [
        "How long does the programme take to complete?",
        "The project is structured for 4 weeks of self-paced progress: week 1 covers FASTA parsing and GC content, week 2 covers reverse complements and ORF scanning, week 3 covers codon translation and bias tables, and week 4 finalizes test coverage and reporting.",
      ],
      [
        "How do employers verify my bioinformatics certificate?",
        "Each certificate features a unique GreyRocks credential ID and QR verification code that links to an online verification portal displaying your verified computational biology project scope and evaluation assessment.",
      ],
    ],
    sibling: {
      href: "/internships/data-science/",
      label: "Compare with Data Science",
      difference:
        "Bioinformatics focuses on biological sequence analysis, 6-frame ORF algorithms, codon translation, and FASTA file processing, whereas Data Science focuses on tabular business data, statistical feature engineering, and predictive machine learning models.",
    },
  },
};
