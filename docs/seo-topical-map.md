# HireeBridge — Topical Content Map & Cluster Architecture

**Date:** October 8, 2026  
**Auditor:** Codex / Antigravity Information Architecture & SEO Engineering  
**Standard:** Hub-and-Spoke Topical Authority, Semantic Entity Clustering, Contextual Graph  

---

## 1. Information Architecture Overview

```
                                    [ HOMEPAGE: / ]
                                           │
         ┌───────────────────┬─────────────┴─────────────┬────────────────────┐
         │                   │                           │                    │
[ /internships/ ]  [ /virtual-internships/ ]  [ /project-based-internships/ ]  [ /internship-certificate/ ]
 (Master Directory) (Remote Delivery Model)     (Hands-On Methodology)        (Verification & Trust)
         │                   │                           │                    │
         └───────────────────┴─────────────┬─────────────┴────────────────────┘
                                           │
                              [ /internship-projects/ ]
                              (32-Project Specification)
                                           │
         ┌───────────────────┬─────────────┴─────────────┬────────────────────┐
         ▼                   ▼                           ▼                    ▼
   [ DATA & AI ]    [ SOFTWARE ENG ]             [ INFRA & CLOUD ]    [ SECURITY, DESIGN & SPECIAL ]
     (7 Domains)       (8 Domains)                  (5 Domains)                (12 Domains)
         │                   │                           │                         │
  [DOMAIN PAGES]      [DOMAIN PAGES]               [DOMAIN PAGES]            [DOMAIN PAGES]
         │                   │                           │                         │
         └── Lateral Semantic Cross-Links (Bidirectional Related Domains) ─────────┘
```

---

## 2. The 6 Semantic Domain Clusters

### Cluster 1: Data & Artificial Intelligence
**Focus:** Machine learning modeling, statistical inference, NLP, computer vision, large language models, predictive telemetry.  
**Hub Parents:** `/internships/`, `/project-based-internships/`, `/internship-projects/`

| Domain Slug | Domain Name | Assigned Project Scenario | Primary Tech Stack | Bidirectional Semantic Cross-Links |
|:---|:---|:---|:---|:---|
| `data-science` | Data Science | Predictive Maintenance Analytics System | Python, Scikit-Learn, Pandas, FastAPI | `machine-learning`, `data-analytics`, `big-data-engineering` |
| `artificial-intelligence` | Artificial Intelligence | Multimodal Support Triage Assistant | PyTorch, Transformers, OpenAI, Vector DB | `generative-ai`, `machine-learning`, `nlp` |
| `machine-learning` | Machine Learning | Customer Churn Prediction Engine | XGBoost, Scikit-Learn, MLflow, Docker | `data-science`, `deep-learning`, `artificial-intelligence` |
| `data-analytics` | Data Analytics | E-Commerce Revenue & Retention Dashboard | SQL, Tableau/PowerBI, Python, dbt | `data-science`, `business-analytics` |
| `generative-ai` | Generative AI | Enterprise Retrieval-Augmented Generation (RAG) | LangChain, LlamaIndex, ChromaDB, FastAPI | `artificial-intelligence`, `nlp`, `python-development` |
| `nlp` | Natural Language Processing | Clinical Feedback Sentiment & Entity Extractor | HuggingFace, spaCy, PyTorch, Streamlit | `artificial-intelligence`, `generative-ai`, `machine-learning` |
| `computer-vision` | Computer Vision | Automated Defect Detection Pipeline | OpenCV, YOLOv8, PyTorch, Albumentations | `deep-learning`, `machine-learning`, `embedded-iot` |
| `deep-learning` | Deep Learning | Medical Image Segmentation via UNet | PyTorch, CUDA, TensorBoard, Torchvision | `computer-vision`, `machine-learning`, `bioinformatics` |

---

### Cluster 2: Software Engineering & Architecture
**Focus:** Application development, web architecture, client-side interfaces, distributed microservices, systems programming.  
**Hub Parents:** `/internships/`, `/project-based-internships/`, `/internship-projects/`

| Domain Slug | Domain Name | Assigned Project Scenario | Primary Tech Stack | Bidirectional Semantic Cross-Links |
|:---|:---|:---|:---|:---|
| `web-development` | Web Development | College Event Management Portal | Node.js, Express, PostgreSQL, Vanilla JS | `frontend-development`, `full-stack-development`, `backend-development` |
| `full-stack-development` | Full Stack Development | SaaS Team Collaboration Workspace | React/Next.js, Node.js, PostgreSQL, Tailwind | `frontend-development`, `backend-development`, `web-development` |
| `frontend-development` | Frontend Development | Headless Design System & Dashboard | TypeScript, React, CSS Modules, Storybook | `web-development`, `full-stack-development`, `ui-ux-design` |
| `backend-development` | Backend Development | Distributed Order Processing Microservice | Go/Node.js, Redis, PostgreSQL, Kafka | `api-microservices`, `full-stack-development`, `cloud-computing` |
| `python-development` | Python Development | Async ETL Pipeline & CLI Platform | Python 3.12, asyncio, SQLAlchemy, Click | `data-science`, `backend-development`, `api-microservices` |
| `api-microservices` | API & Microservices | Event-Driven Gateway & Rate Limiter | Node.js/Go, Envoy/Nginx, Redis, OpenAPI | `backend-development`, `cloud-computing`, `devops` |
| `systems-rust` | Rust Systems Programming | High-Performance Zero-Copy Key-Value Store | Rust, Tokio, Criterion, Cargo | `backend-development`, `embedded-iot`, `sre` |
| `mobile-app-development` | Mobile App Development | Cross-Platform Fitness Tracking App | Flutter/React Native, SQLite, Firebase | `frontend-development`, `ui-ux-design` |

---

### Cluster 3: Cloud, Infrastructure & Site Reliability
**Focus:** Cloud infrastructure, automated CI/CD, cluster orchestration, site reliability, distributed streaming, edge telemetry.  
**Hub Parents:** `/internships/`, `/project-based-internships/`, `/internship-projects/`

| Domain Slug | Domain Name | Assigned Project Scenario | Primary Tech Stack | Bidirectional Semantic Cross-Links |
|:---|:---|:---|:---|:---|
| `cloud-computing` | Cloud Computing | Multi-Tier VPC & Container Deployment | AWS/GCP, Terraform, Docker, ECS/EKS | `devops`, `backend-development`, `sre` |
| `devops` | DevOps Engineering | GitOps Kubernetes CI/CD Pipeline | Kubernetes, GitHub Actions, ArgoCD, Helm | `cloud-computing`, `sre`, `api-microservices` |
| `sre` | Site Reliability Engineering | SLO/SLI Monitoring & Chaos Recovery Runbook | Prometheus, Grafana, OpenTelemetry, Chaos Mesh | `devops`, `cloud-computing`, `systems-rust` |
| `big-data-engineering` | Big Data Engineering | Real-Time IoT Stream Lakehouse | Apache Spark, Kafka, Delta Lake, MinIO | `data-science`, `cloud-computing`, `python-development` |
| `embedded-iot` | Embedded Systems & IoT | ESP32 Smart Environmental Telemetry Node | C/C++, FreeRTOS, MQTT, ESP-IDF | `systems-rust`, `computer-vision`, `cloud-computing` |

---

### Cluster 4: Cyber Security & Ethical Hacking
**Focus:** Offensive security, vulnerability assessment, defense in depth, SOC analysis, threat intelligence.  
**Hub Parents:** `/internships/`, `/project-based-internships/`, `/internship-projects/`

| Domain Slug | Domain Name | Assigned Project Scenario | Primary Tech Stack | Bidirectional Semantic Cross-Links |
|:---|:---|:---|:---|:---|
| `cyber-security` | Cyber Security | Threat Modeling & SOC SIEM Rule Engine | Wazuh, Suricata, Zeek, Elastic SIEM | `ethical-hacking`, `cloud-computing`, `devops` |
| `ethical-hacking` | Ethical Hacking | Web App Penetration Testing Report & Remediation | Burp Suite, OWASP ZAP, Nmap, Python | `cyber-security`, `web-development`, `backend-development` |

---

### Cluster 5: Product, Design & Business Strategy
**Focus:** User experience research, product specifications, unit economics, analytics cohorts, go-to-market.  
**Hub Parents:** `/internships/`, `/project-based-internships/`, `/internship-projects/`

| Domain Slug | Domain Name | Assigned Project Scenario | Primary Tech Stack | Bidirectional Semantic Cross-Links |
|:---|:---|:---|:---|:---|
| `ui-ux-design` | UI/UX Design | FinTech Mobile App Design & Design System | Figma, Design Systems, Whimsical, Usability Hub | `frontend-development`, `product-management`, `mobile-app-development` |
| `product-management` | Product Management | B2B Feature Spec, PRD & Launch Roadmap | Notion, Jira, Mixpanel, Amplitude, PRD Templates | `ui-ux-design`, `business-analytics`, `forward-deployed-engineer` |
| `business-analytics` | Business Analytics | SaaS CAC/LTV & Expansion Cohort Model | Excel/Sheets, SQL, Python, Cohort Analytics | `data-analytics`, `product-management`, `digital-marketing` |
| `digital-marketing` | Digital Marketing | Full-Funnel Performance Marketing Audit & Attribution | Google Analytics 4, Meta Ads, Search Console, Looker | `business-analytics`, `product-management` |
| `forward-deployed-engineer` | Forward Deployed Engineer | ERP Data Integration & Onboarding Bridge | Python, Webhooks, REST, ETL, SQL | `product-management`, `full-stack-development`, `backend-development` |

---

### Cluster 6: Specialized Engineering Disciplines
**Focus:** Decentralized computing, game loops, automated QA, genomics pipelines.  
**Hub Parents:** `/internships/`, `/project-based-internships/`, `/internship-projects/`

| Domain Slug | Domain Name | Assigned Project Scenario | Primary Tech Stack | Bidirectional Semantic Cross-Links |
|:---|:---|:---|:---|:---|
| `blockchain-development` | Blockchain Development | Decentralized Escrow Smart Contract Suite | Solidity, Hardhat, Ethers.js, OpenZeppelin | `backend-development`, `cyber-security` |
| `game-development` | Game Development | 2.5D Procedural Action-Platformer Mechanics | Unity/Godot, C#, HLSL ShaderLab, Git LFS | `computer-vision`, `systems-rust` |
| `bioinformatics` | Bioinformatics | Genomic Variant Calling Pipeline | Snakemake, Nextflow, BWA-MEM, GATK, Python | `data-science`, `deep-learning`, `python-development` |
| `software-testing` | Software Testing & QA | End-to-End Test Automation Framework | Playwright, Jest, Cypress, GitHub Actions | `web-development`, `backend-development`, `devops` |

---

## 3. Site-Wide Internal Linking Rules

1. **Top-Down Hub-to-Spoke Links**:
   - Each Hub (`/internships/`, `/project-based-internships/`, `/virtual-internships/`, `/internship-projects/`) contains explicit semantic cards linking directly to member domain pages with descriptive, anchor-rich text.
2. **Bottom-Up Spoke-to-Hub Breadcrumbs**:
   - Every domain page features breadcrumb navigation linking back to `Home` and `Internships`, plus contextual callouts linking to `/project-based-internships/` and `/internship-certificate/`.
3. **Lateral Semantic Cross-Links**:
   - Every domain page presents **3 verified related domains** (defined in `catalogue-profiles.js`). These links provide natural lateral pathways across adjacent domains without creating spammy footer clouds.
4. **Credential & Verification Cross-Links**:
   - Domain pages link directly to `/internship-certificate/` and the GreyRocks `/verification/:id` portal, closing the trust loop.
