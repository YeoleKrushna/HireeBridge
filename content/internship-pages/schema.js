"use strict";

const REQUIRED_FACTS = [
  "duration",
  "taskBrief",
  "deliverables",
  "reviewCriteria",
  "toolsExpected",
  "reviewer",
  "verification",
  "lastReviewed",
];

function normalisePage(page) {
  const facts = page.facts || {};
  const missingFacts = REQUIRED_FACTS.filter(
    (key) => !facts[key] || (Array.isArray(facts[key]) && !facts[key].length),
  );
  const flatten = (value) =>
    Array.isArray(value)
      ? value.map(flatten).join(" ")
      : value && typeof value === "object"
        ? Object.values(value).map(flatten).join(" ")
        : String(value || "");
  // Readiness is based on the visible page, including its catalogue-derived
  // brief, deliverables and validation notes rendered alongside editorial copy.
  const wordCount = flatten({ ...(page.content || page.mainContent), facts })
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return {
    ...page,
    facts,
    missingFacts,
    wordCount,
    readyToIndex:
      missingFacts.length === 0 &&
      wordCount >= 800 &&
      page.qualityGatesPassed === true,
  };
}

module.exports = { REQUIRED_FACTS, normalisePage };
