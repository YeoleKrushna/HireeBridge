"use strict";
module.exports = {
  pilot: true,
  slug: "cloud-computing",
  name: "Cloud Computing",
  primaryKeyword: "cloud computing online internship with certificate",
  accent: "#586cc0",
  qualityGatesPassed: true,
  facts: {
    taskOutline: [
      "Translate the assigned three-tier architecture into network, application, data and operational boundaries.",
      "Define Terraform modules for network segmentation, routing, security groups and tier dependencies.",
      "Use roles and managed secret references rather than committed credentials.",
      "Add health checks, logs, monitoring notes and scaling or availability choices where appropriate.",
      "Validate plans, inspect exposure, document cost assumptions and provide a safe teardown procedure.",
    ],
  },
  content: {
    metaTitle: "Terraform Three-Tier Cloud Internship Project | HireeBridge",
    h1: "Provision a Three-Tier Cloud Architecture with Terraform",
    summary:
      "This fee-based, project-based educational programme uses Terraform to document and provision the catalogue’s three-tier AWS architecture in a sandbox account. You reason about network isolation, dependencies, identity, secret references, health, logs, cost awareness and teardown. The operational principles are explained in vendor-neutral terms, and HireeBridge does not imply affiliation with AWS or any cloud provider.",
    h2Overrides: {
      "Who this project fits and who it does not":
        "Does infrastructure and operations work suit this project choice?",
      "Move from question to reviewable evidence":
        "Turn the architecture diagram into inspectable infrastructure",
      "Is this project a reasonable learning fit?":
        "Check your infrastructure safety preparation",
      "Build capability in a realistic order":
        "Develop provisioning and operational reasoning",
      "Common Cloud Computing project mistakes":
        "Infrastructure risks to remove before submission",
      "Draft an honest CV bullet":
        "Describe provisioned evidence without provider claims",
      "Check with your college before enrolling":
        "Confirm the infrastructure project with your institution",
      "Completion comes before the credential":
        "Validate and document before credential review",
      "Cloud Computing programme FAQ":
        "Terraform and three-tier architecture questions",
      "Read the plan details before you decide.":
        "Review sandbox, cost and enrolment conditions.",
    },
    forYou: [
      "You want to model networking, identity, compute, data and monitoring as reviewable configuration.",
      "You will use a sandbox account, inspect planned exposure and remove resources after testing.",
      "You can explain availability and security choices without implying endorsement or certification by a provider.",
    ],
    notForYou: [
      "You want application feature development to be the main deliverable.",
      "You cannot use an approved sandbox or cannot review potential costs before provisioning.",
      "You seek a provider certification, employment or guaranteed college acceptance; this programme offers none of those.",
    ],
    buildIntro:
      "The catalogue names a Production 3-Tier AWS Architecture, so the submitted Terraform must target that assigned environment. The engineering ideas remain portable: isolate public entry points from private application and data tiers, grant only required access, reference secrets safely, make dependencies explicit, observe health and logs, and remove resources deliberately. Provider names describe the target, not a partnership or endorsement.",
    progression: [
      [
        "Draw trust boundaries",
        "Identify public entry, private application and protected data paths, including administrative access and outbound dependencies.",
      ],
      [
        "Model modules and state",
        "Separate reusable network, application and data concerns while documenting provider, backend and state assumptions.",
      ],
      [
        "Constrain identity and traffic",
        "Use narrow security-group paths, roles and managed secret references instead of broad access or committed credentials.",
      ],
      [
        "Plan for operation",
        "Add health checks, logs and monitoring notes; explain availability, scaling and failure assumptions without claiming production guarantees.",
      ],
      [
        "Validate and remove",
        "Run formatting and validation, inspect the plan for exposure and dependencies, estimate likely cost categories, then document teardown and residual resources.",
      ],
    ],
    skills: [
      {
        group: "Infrastructure modelling",
        items: [
          [
            "Terraform structure",
            "Express resources, variables, outputs and dependencies in reviewable modules.",
          ],
          [
            "Network segmentation",
            "Separate entry, application and data tiers with explicit routing and traffic rules.",
          ],
          [
            "State awareness",
            "Document where infrastructure state lives and how sensitive values are protected.",
          ],
        ],
      },
      {
        group: "Security and identity",
        items: [
          [
            "Least access",
            "Permit only the traffic and actions each component requires.",
          ],
          [
            "Role-based access",
            "Use workload roles rather than long-lived credentials in source code.",
          ],
          [
            "Secret references",
            "Point to managed secret storage without printing values into examples or logs.",
          ],
        ],
      },
      {
        group: "Operations",
        items: [
          [
            "Health and logs",
            "Describe how failed instances, requests and dependencies become visible.",
          ],
          [
            "Cost awareness",
            "Identify chargeable resource categories and test in a controlled sandbox.",
          ],
          [
            "Teardown",
            "Destroy resources in a checked order and verify that billable remnants are understood.",
          ],
        ],
      },
    ],
    mistakes: [
      [
        "Putting every tier in public subnets",
        "Only the required entry point should be internet-facing. Document routes and permitted tier-to-tier traffic.",
      ],
      [
        "Opening security groups broadly for convenience",
        "Temporary wide access often survives. Encode narrow sources, ports and purposes in configuration.",
      ],
      [
        "Committing credentials or secret values",
        "Use roles and managed references. Keep local variables, state and provider credentials outside version control.",
      ],
      [
        "Treating a successful plan as operational proof",
        "Formatting and planning help, but health, dependency, exposure and teardown reasoning still require evidence.",
      ],
      [
        "Forgetting cost-bearing remnants",
        "Load balancers, addresses, storage, logs and backups may persist. Document the teardown scope and verify the sandbox afterward.",
      ],
    ],
    cvPatterns: [
      "Modelled a three-tier architecture in Terraform with separate network, application and data modules.",
      "Restricted traffic through [number] documented security-group paths and role-based service access.",
      "Added health, logging and monitoring configuration for [component] with stated operational limits.",
      "Reviewed the Terraform plan for public exposure, dependencies and [cost category] before sandbox provisioning.",
      "Documented deployment prerequisites, managed secret references and teardown verification without committing credentials.",
    ],
    selfCheck: [
      "Can you draw every allowed network path between the three tiers?",
      "Will all provider credentials and secret values remain outside source control?",
      "Can you explain Terraform state handling and its sensitivity?",
      "Have you reviewed cost categories before creating sandbox resources?",
      "Does teardown identify resources that may remain or require separate action?",
    ],
    college: [
      "Ask whether an infrastructure-as-code project meets the applicable academic requirement.",
      "Share the three-tier scope, sandbox boundary, architecture evidence and teardown plan with your T&P or placement cell.",
      "Confirm duration, cloud-account, report, supervision and demonstration requirements before paying.",
      "Keep diagrams, formatted configuration, validation output, reviewed plans, monitoring notes and teardown evidence.",
      "Never use institutional or production accounts without explicit authorization.",
    ],
    credential:
      "Submit the Terraform, diagram, validation evidence and operational documentation for review. Explicit approval enables the GreyRocks certificate record with a unique credential ID and QR verification destination. The credential is a HireeBridge educational completion record, not an AWS certification or evidence of provider affiliation.",
    faqs: [
      [
        "What is the assigned Cloud Computing project?",
        "The catalogue assigns a production three-tier AWS architecture provisioned with Terraform and documented operational defaults.",
      ],
      [
        "Is HireeBridge affiliated with AWS?",
        "No affiliation is claimed. AWS is the target named by the assigned project; the networking and operational reasoning is explained generally.",
      ],
      [
        "Must I use a sandbox account?",
        "Use an approved sandbox, review costs and permissions first, and never experiment in an unapproved production account.",
      ],
      [
        "What should remain private?",
        "Application and data tiers should use private network placement unless a documented requirement proves otherwise.",
      ],
      [
        "Can credentials appear in Terraform files?",
        "No. Use supported credential mechanisms, roles and managed secret references, and keep sensitive state protected.",
      ],
      [
        "What must teardown cover?",
        "Document destruction and check for billable remnants such as addresses, storage, logs or backups.",
      ],
      [
        "When is the certificate issued?",
        "Only after submission and explicit approval.",
      ],
      [
        "Does this replace a provider certification?",
        "No. It documents completion of the reviewed educational project only.",
      ],
    ],
    links: [
      [
        "Terraform language documentation",
        "https://developer.hashicorp.com/terraform/language",
      ],
      [
        "AWS Well-Architected Framework",
        "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
      ],
      ["AICTE internship portal", "https://internship.aicte-india.org/"],
    ],
    sibling: {
      href: "/internships/full-stack-development/",
      label: "Compare the Full Stack application project",
      difference:
        "Full Stack Development integrates application code and commerce data flow; Cloud Computing concentrates on Terraform provisioning, network boundaries and operations.",
    },
  },
};
