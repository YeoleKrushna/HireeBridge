"use strict";

const fs = require("fs");
const path = require("path");

const FIELD_MAP = Object.freeze({
  duration: "duration",
  "task brief": "taskBrief",
  deliverables: "deliverables",
  "task validation": "validation",
  "review process": "reviewProcess",
  "what reviewers check": "reviewCriteria",
  "tools expected": "toolsExpected",
  "which plans include what": "planInclusions",
  reviewer: "reviewer",
  "certificate and verification": "verification",
  "resubmission/refund policy": "resubmissionRefundPolicy",
  "last reviewed": "lastReviewed",
});

function parseValue(lines, key) {
  const nonEmpty = lines.map((line) => line.trim()).filter(Boolean);
  if (key === "deliverables")
    return nonEmpty.map((line) => line.replace(/^[-*]\s+/, "")).filter(Boolean);
  return nonEmpty.map((line) => line.replace(/^[-*]\s+/, "")).join(" ");
}

function parseDomainFacts(markdown) {
  const sections = {};
  let section = null;
  let field = null;
  let buffer = [];
  const flush = () => {
    if (!section || !field) return;
    const mapped = FIELD_MAP[field];
    if (mapped) sections[section][mapped] = parseValue(buffer, field);
    buffer = [];
  };
  for (const line of String(markdown).split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      flush();
      section =
        heading[1].trim() === "ALL" ? "ALL" : heading[1].trim().toLowerCase();
      sections[section] = sections[section] || {};
      field = null;
      continue;
    }
    const label = line.match(/^([^#][^:]+):(?:\s*<!--.*-->)?\s*$/);
    if (section && label && FIELD_MAP[label[1].trim().toLowerCase()]) {
      flush();
      field = label[1].trim().toLowerCase();
      continue;
    }
    if (section && field) buffer.push(line);
  }
  flush();
  return sections;
}

function resolveFacts(sections, slug, inlineFacts = {}) {
  // The page module contains catalogue-derived facts. It deliberately wins over
  // a draft in the editorial file so a generic placeholder cannot become live.
  return { ...(sections.ALL || {}), ...(sections[slug] || {}), ...inlineFacts };
}

const factsPath = path.join(__dirname, "..", "..", "docs", "domain-facts.md");
const DOMAIN_FACTS = parseDomainFacts(fs.readFileSync(factsPath, "utf8"));

module.exports = { FIELD_MAP, DOMAIN_FACTS, parseDomainFacts, resolveFacts };
