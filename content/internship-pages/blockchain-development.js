"use strict";

const blockchainDiagram = `<svg viewBox="0 0 520 350" role="img" aria-labelledby="visual-title visual-desc">
  <title id="visual-title">Decentralized Academic Credential Verification Architecture</title>
  <desc id="visual-desc">Student identity is hashed locally using SHA-256 for zero PII on-chain, submitted to a Solidity verification smart contract on Sepolia testnet, confirmed in an immutable block, and queried instantly via a React Web3 dApp.</desc>
  <g class="dp-boxes">
    <rect x="15" y="55" width="110" height="72" rx="8"/>
    <rect x="143" y="55" width="110" height="72" rx="8"/>
    <rect x="271" y="55" width="110" height="72" rx="8"/>
    <rect x="399" y="55" width="110" height="72" rx="8"/>
    <rect x="35" y="195" width="200" height="80" rx="8"/>
    <rect x="285" y="195" width="200" height="80" rx="8"/>
  </g>
  <g class="dp-notes">
    <text x="70" y="42" text-anchor="middle" class="dp-tag">CLIENT DIGEST</text>
    <text x="70" y="84" text-anchor="middle" class="dp-title">SHA-256 Hash</text>
    <text x="70" y="104" text-anchor="middle" class="dp-sub">zero PII on-chain</text>

    <text x="198" y="42" text-anchor="middle" class="dp-tag">SMART CONTRACT</text>
    <text x="198" y="84" text-anchor="middle" class="dp-title">Solidity Logic</text>
    <text x="198" y="104" text-anchor="middle" class="dp-sub">access control</text>

    <text x="326" y="42" text-anchor="middle" class="dp-tag">LEDGER STATE</text>
    <text x="326" y="84" text-anchor="middle" class="dp-title">Testnet Block</text>
    <text x="326" y="104" text-anchor="middle" class="dp-sub">immutable logs</text>

    <text x="454" y="42" text-anchor="middle" class="dp-tag">WALLET</text>
    <text x="454" y="84" text-anchor="middle" class="dp-title">Web3 Provider</text>
    <text x="454" y="104" text-anchor="middle" class="dp-sub">signed transactions</text>

    <text x="135" y="180" text-anchor="middle" class="dp-tag">VERIFICATION DAPP</text>
    <text x="135" y="228" text-anchor="middle" class="dp-title">React + Ethers</text>
    <text x="135" y="252" text-anchor="middle" class="dp-sub">instant public lookup</text>

    <text x="385" y="180" text-anchor="middle" class="dp-tag">SECURITY SUITE</text>
    <text x="385" y="228" text-anchor="middle" class="dp-title">Hardhat Tests</text>
    <text x="385" y="252" text-anchor="middle" class="dp-sub">re-entrancy &amp; auth</text>
  </g>
  <path d="M125 91H143M253 91H271M381 91H399M454 127V155H260V235H235M260 235H285"/>
</svg>`;

module.exports = {
  pilot: true,
  slug: "blockchain-development",
  name: "Blockchain Development",
  primaryKeyword: "blockchain development online internship with certificate",
  accent: "#1f5f5b",
  qualityGatesPassed: true,
  facts: {
    taskBrief:
      "Blockchain Certificate Verification DApp - Build a DApp that issues certificate proofs, stores hashes, and verifies proofs through a Web3 frontend.",
    deliverables: [
      "Solidity smart contract source code implementing proof storage, issuer authorization, and revocation states",
      "Comprehensive Hardhat unit test suite testing access controls, duplicate proof rejections, and gas usage",
      "React Web3 frontend interface allowing users to upload documents, compute hashes, and query on-chain status",
      "Deployment script and verifiable transaction logs on a local Hardhat node or public Ethereum testnet",
      "Technical architecture documentation highlighting privacy protection and client-side hashing safeguards",
    ],
    taskOutline: [
      "Author a secure Solidity smart contract that stores cryptographic certificate hashes and issuer metadata.",
      "Implement strict access control modifiers ensuring only authorized admin wallets can register new credentials.",
      "Write automated Hardhat tests verifying duplicate prevention, unauthorized access errors, and event emission.",
      "Construct a React frontend using ethers.js or viem that computes document hashes client-side without uploading files.",
      "Deploy the contract to an Ethereum testnet and document the complete issuance, verification, and revocation workflow.",
    ],
    validation:
      "Cover issuer authorization, proof match/mismatch, duplicates, and network errors.",
    toolsExpected:
      "Solidity, Hardhat or Foundry, JavaScript/TypeScript, React, Ethers.js or Viem, MetaMask, and Sepolia testnet.",
  },
  diagram: blockchainDiagram,
  content: {
    h1: "Build a Decentralized Verification DApp in a Blockchain Internship Project",
    summary:
      "This blockchain development online internship with certificate is a fee-based, project-based internship programme that focuses on smart contract engineering and decentralized Web3 application architecture. You develop a verifiable certificate registry using Solidity, enforce strict client-side hashing to protect personal privacy, test security boundaries with Hardhat, and build an interactive React Web3 frontend.",
    forYou: [
      "You want to understand the mechanics of decentralized systems: smart contracts, immutable state, gas economics, and Web3 wallets.",
      "You value real-world privacy engineering: understanding why personal identity data must never be recorded directly on public blockchains.",
      "You want to build a functional Web3 portfolio project featuring clean Solidity code, comprehensive unit tests, and React integration.",
    ],
    notForYou: [
      "You are looking for cryptocurrency trading, speculative token launches, or financial investment advice.",
      "You want to build a general centralized web application; our Backend Development programme is focused on standard REST architectures.",
      "You believe blockchain projects can store sensitive student names and personal data directly in public smart contract variables.",
    ],
    buildIntro:
      "Public blockchains provide an unalterable, decentralized timestamping ledger, but they introduce unique engineering and privacy constraints. Once data is written to a smart contract, it can never be deleted or modified. In this Blockchain Development project, you design a Blockchain Certificate Verification DApp. You learn how to anchor academic and professional credentials immutably to an Ethereum testnet while protecting student privacy. By hashing certificates on the client side, your DApp records only a cryptographic proof on-chain, allowing anyone in the world to verify authenticity without exposing personal records.",
    projectNarrative: [
      "Privacy-first architecture is the foundational requirement of enterprise blockchain systems. Writing student names, grades, or personal identification onto an immutable public blockchain violates international privacy regulations like GDPR and DPDP. Your DApp solves this by enforcing client-side cryptographic hashing. The student or employer drops the certificate document into the browser, which computes its SHA-256 or Keccak-256 hash locally. Only this unique 32-byte digest is transmitted to the smart contract.",
      "Smart contract development in Solidity requires defensive programming against security vulnerabilities. You implement a CertificateRegistry contract featuring structured mappings, state variables, and event logs. You enforce role-based access control (using OpenZeppelin's Ownable or AccessControl patterns) to ensure that only verified issuing authorities can anchor new certificate hashes, preventing unauthorized actors from minting fraudulent credentials.",
      "Thorough testing with Hardhat establishes protocol security before deployment. Because smart contract bugs cannot be patched with simple server restarts, automated testing is paramount. You write automated tests that simulate authorized and unauthorized transactions, verify that duplicate certificate hashes are rejected, validate event emission on registration, and inspect transaction gas consumption.",
      "The Web3 frontend interface connects decentralized contracts to end users. Using React and ethers.js, you build a clean portal that connects to Web3 browser wallets (like MetaMask). The interface supports two core workflows: an administrative portal where authorized issuers sign transactions to register certificate proofs, and a public verification tab where any verifier can upload a document to instantly query the blockchain and view verification status, issue timestamps, and issuer addresses.",
    ],
    narrativeHeading: "From client-side cryptographic hashing to immutable smart contract verification",
    evidenceNotes: [
      "Clean, modular Solidity smart contract source code implementing role access controls and state mapping.",
      "Comprehensive Hardhat unit test suite proving 100% test pass rates across access and duplicate scenarios.",
      "React Web3 frontend codebase showcasing wallet integration and client-side document hashing.",
      "Recorded testnet deployment transactions and contract address on an Ethereum block explorer (e.g. Etherscan).",
      "Architecture documentation outlining privacy guarantees, gas optimization, and smart contract boundaries.",
    ],
    progression: [
      [
        "Design Architecture",
        "Establish client-side hashing boundaries to ensure zero personally identifiable information reaches the blockchain.",
      ],
      [
        "Write Solidity Contract",
        "Author the smart contract with role-based access controls, event logging, and duplicate prevention logic.",
      ],
      [
        "Test with Hardhat",
        "Execute automated test suites validating authorization guards, gas usage, and failure state handling.",
      ],
      [
        "Integrate Web3 UI",
        "Build a responsive React frontend connecting MetaMask, computing local hashes, and querying contract state.",
      ],
      [
        "Deploy & Verify",
        "Deploy the contract to an Ethereum testnet, register sample certificate proofs, and verify public lookups.",
      ],
    ],
    selfCheck: [
      "Can you explain why storing personal user information on a public blockchain violates privacy compliance?",
      "Do you understand how cryptographic hashes (SHA-256) prove document integrity without exposing document contents?",
      "Can you explain the function of the 'onlyOwner' modifier in Solidity access control?",
      "Are you prepared to demonstrate that an unauthorized wallet cannot issue a certificate in your contract?",
      "Can your React frontend calculate the hash of an uploaded file without uploading it to an external server?",
    ],
    skills: [
      {
        group: "Smart Contract Engineering",
        items: [
          ["Solidity Programming", "Author secure smart contracts using mappings, custom structs, events, and modifiers."],
          ["Access Control Patterns", "Implement role-based authorization to restrict administrative contract capabilities."],
          ["Gas Optimization", "Structure data storage types and memory usage to minimize transaction execution costs."],
        ],
      },
      {
        group: "Web3 Testing & Deployment",
        items: [
          ["Hardhat Testing Framework", "Write automated JavaScript/TypeScript unit tests simulating multi-account transactions."],
          ["Testnet Deployment", "Deploy contracts to local Hardhat nodes or Ethereum testnets (Sepolia)."],
          ["Block Explorer Verification", "Verify contract source code on block explorers like Etherscan."],
        ],
      },
      {
        group: "Decentralized Frontend Integration",
        items: [
          ["Ethers.js / Viem Integration", "Connect browser applications to Ethereum nodes and parse contract ABIs."],
          ["Client-Side Cryptography", "Compute cryptographic SHA-256 digests in the browser using the Web Crypto API."],
          ["Wallet State Management", "Handle user account switching, network changes, and pending transaction states."],
        ],
      },
    ],
    links: [
      ["Solidity Official Documentation", "https://docs.soliditylang.org/"],
      ["Hardhat Ethereum Development Environment", "https://hardhat.org/docs"],
      ["OpenZeppelin Secure Contract Standards", "https://docs.openzeppelin.com/contracts/"],
    ],
    mistakes: [
      [
        "Storing student names and grades on-chain",
        "Never record personal identifiable information on an immutable ledger; store only the one-way cryptographic hash.",
      ],
      [
        "Failing to restrict the certificate issuance function",
        "Always guard issuance functions with access control modifiers so only authorized admin addresses can register credentials.",
      ],
      [
        "Deploying contracts without automated Hardhat tests",
        "Smart contracts cannot be easily modified after deployment; test every revert condition and edge case thoroughly.",
      ],
      [
        "Uploading user documents to a centralized server to compute hashes",
        "Use client-side JavaScript (SubtleCrypto) to calculate the file hash directly in the browser for maximum user privacy.",
      ],
      [
        "Promising speculative cryptocurrency returns or financial tokens",
        "This project is strictly an educational software engineering exercise focused on document verification architectures.",
      ],
    ],
    cvPatterns: [
      "Architected a decentralized certificate verification DApp in Solidity and React, anchoring cryptographic proofs on an Ethereum testnet.",
      "Implemented client-side SHA-256 hashing to guarantee zero PII data exposure on-chain in compliance with data privacy standards.",
      "Authored a comprehensive Hardhat unit test suite covering role-based access control, gas optimization, and duplicate rejection.",
      "Integrated Ethers.js and MetaMask into a Web3 portal allowing instant public verification of issued credentials in under 2 seconds.",
      "Deployed and verified smart contracts on the Sepolia testnet, documenting transaction gas metrics and event logs.",
    ],
    college: [
      "Confirm with your academic supervisor that a decentralized application and smart contract engineering project fulfills internship requirements.",
      "Submit the official project proposal detailing blockchain architecture, Solidity smart contracts, and Web3 verification interfaces.",
      "Include contract source code, Hardhat test execution reports, Etherscan transaction links, and UI screenshots in your report.",
      "Provide public GitHub access to your repository containing contracts, migrations, test suites, and frontend code.",
      "Prepare a live Web3 demonstration showing wallet connection, proof issuance, and document verification for your university panel.",
    ],
    credential:
      "GreyRocks serves as the independent technical evaluation and credential verification entity for HireeBridge programmes. Programme enrolment grants access to the project specification, contract templates, and review rubrics; it does not automatically award a certificate upon payment alone. To receive certification, you submit your completed Solidity contract, Hardhat test suite, React Web3 interface code, and testnet deployment records. A blockchain engineering assessor evaluates your access control implementation, privacy design, and frontend integration. Approved projects receive an official credential featuring a unique credential ID and QR verification link on GreyRocks.",
    faqs: [
      [
        "Do I need to spend real money on cryptocurrency to deploy this smart contract?",
        "No. You will develop and test your smart contract using local test nodes provided by Hardhat, or deploy to public testnets (like Ethereum Sepolia) using free testnet faucet tokens.",
      ],
      [
        "What is the difference between a hash and the certificate document itself?",
        "The certificate document is the actual file (such as a PDF or image). A hash is a unique 64-character mathematical fingerprint of that file. Storing the hash on the blockchain proves the document existed in that exact state without exposing the contents.",
      ],
      [
        "Why is storing personal data on the blockchain a problem?",
        "Public blockchains are permanent, unchangeable, and visible to everyone globally. Storing real names, birthdates, or contact information violates international privacy regulations like GDPR and DPDP that require the right to erasure.",
      ],
      [
        "What tools do I need installed on my computer?",
        "You will need Node.js, an IDE (like VS Code), the Hardhat framework, and a browser wallet extension (like MetaMask) configured for local or test networks.",
      ],
      [
        "How do I prove that unauthorized users cannot issue certificates?",
        "You write automated unit tests in Hardhat where a non-admin wallet attempts to call the registration function and assert that the transaction reverts with an explicit unauthorized access error.",
      ],
      [
        "Can a verifier check a certificate without having a crypto wallet?",
        "Yes. While issuing credentials requires an authorized wallet signature, reading public mapping data from a smart contract can be executed by anyone using public RPC providers without paying gas or connecting a wallet.",
      ],
      [
        "How long does the programme take to finish?",
        "The project is structured for 4 weeks of self-paced study: week 1 covers Solidity fundamentals and privacy architecture, week 2 covers contract authoring and Hardhat testing, week 3 covers Web3 frontend integration, and week 4 finalizes deployment and documentation.",
      ],
      [
        "Is the certificate verifiable online?",
        "Yes. Every certificate includes an official GreyRocks credential ID and a scannable QR verification link that displays your verified project scope and completion record on the online verification portal.",
      ],
    ],
    sibling: {
      href: "/internships/backend-development/",
      label: "Compare with Backend Development",
      difference:
        "Blockchain Development focuses on decentralized smart contracts, client-side cryptographic hashing, and Web3 wallet transactions, whereas Backend Development focuses on centralized REST APIs, SQL databases, and rate limiting.",
    },
  },
};
