"use strict";
const { normalisePage } = require("./schema");
const { DOMAIN_FACTS, resolveFacts } = require("./domain-facts");

const slugs = [
  // 1-10: First 10 benchmark domains
  "data-science",
  "artificial-intelligence",
  "machine-learning",
  "data-analytics",
  "python-development",
  "web-development",
  "full-stack-development",
  "frontend-development",
  "backend-development",
  "cloud-computing",
  // 11-20: Domains 11 through 20
  "devops",
  "cyber-security",
  "ui-ux-design",
  "generative-ai",
  "nlp",
  "computer-vision",
  "business-analytics",
  "software-testing",
  "forward-deployed-engineer",
  "product-management",
  // 21-32: Domains 21 through 32
  "mobile-app-development",
  "big-data-engineering",
  "deep-learning",
  "blockchain-development",
  "sre",
  "ethical-hacking",
  "embedded-iot",
  "systems-rust",
  "game-development",
  "digital-marketing",
  "api-microservices",
  "bioinformatics",
];

const allPages = slugs.map((slug) => {
  const page = require(`./${slug}`);
  return normalisePage({
    ...page,
    facts: resolveFacts(DOMAIN_FACTS, page.factsKey || slug, page.facts),
  });
});

module.exports = allPages;
