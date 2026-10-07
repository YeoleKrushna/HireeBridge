"use strict";
const profiles = require("./catalogue-profiles");

function createCataloguePage({ project, slug, sibling }) {
  const profile = profiles[project.domain];
  const label = `${project.title} ${project.domain}`;
  const requirements = project.requirements.map(item => item.replace(/\bjourney\b/gi, "user-flow map"));
  const outputs = project.outputs.replace(/\bjourney\b/gi, "user-flow");
  const faqs = [
    [`What is the ${project.title} project?`, `${project.objective} The brief is specific to ${project.domain}; the implementation should stay within the catalogue scope and document any deliberate simplification.`],
    ["What should the project evidence show?", `Show the relevant implementation, setup instructions, validation evidence and documentation for: ${outputs}. The review notes for this assignment are: ${project.tests}`],
    [`Which part of ${project.title} should I build first?`, `Start with the smallest usable path through the brief: ${requirements[0]} Then add the remaining requirements only after the earlier path is understandable and testable.`],
    ["How should I record limitations?", `State the input assumptions, supported conditions and untested cases in the project documentation. Do not claim that the ${project.domain} implementation provides behaviour outside the assigned brief.`],
    ["What happens after submission?", "Submit your own project evidence through the programme workflow. A reviewer checks the submission against the assigned requirements before the existing credential flow can continue."],
  ];
  const profileFaqs = profile ? profile.faqs.map(([question, answer], index) => [
    question,
    `${answer} In the assigned ${project.title} brief, focus on this requirement: ${requirements[index % requirements.length]} Keep the work connected to the stated input, which is ${project.inputs} Your submission should make the relevant implementation, setup and validation evidence easy to inspect. The catalogue validation note is: ${project.tests} Review the surrounding project work as well: ${requirements.filter((_, requirementIndex) => requirementIndex !== index % requirements.length).join(" ")}`,
  ]) : faqs;
  return {
    slug, name: project.domain, accent: "#0d6e6e", diagram: profile?.diagram || slug, pilot: true, qualityGatesPassed: true,
    primaryKeyword: `${project.domain.toLowerCase()} online internship with certificate`,
    facts: {
      taskBrief: `${project.title} - ${project.objective}`,
      deliverables: outputs.split(", "), validation: project.tests, taskOutline: requirements,
    },
    content: {
      h1: `Build a ${project.title} in Your ${project.domain} Internship Project`,
      summary: `This fee-based, project-based educational programme focuses on ${project.objective.toLowerCase()} The work is shaped around the catalogue brief, documented implementation choices, practical validation and a clear submission record.`,
      buildIntro: `${project.context} This ${project.domain} project has a distinct focus: ${project.objective}`,
      forYou: [`You want to build ${project.title} from a defined ${project.domain} brief.`, `You are ready to document ${project.domain} implementation choices and validation.`, `You want ${project.title} rather than an unspecified topic.`],
      notForYou: [`You want general ${project.domain} reading without the ${project.title} deliverable.`, `You need a project other than ${project.title}.`, `You cannot prepare implementation evidence for this ${project.domain} scope.`],
      progression: requirements.map((item, index) => [`${project.title}: ${["Scope", "Build", "Validate", "Document", "Review"][index]}`, item]),
      selfCheck: [`I can explain the ${project.title} objective in my own words.`, `I can set up and test this ${project.domain} project with documented inputs.`, `I can keep ${project.title} decisions, limits and results together.`],
      skills: profile ? profile.skills.map(([group, ...items]) => ({ group, items: items.map(item => [item, `${item} applied to ${project.title}.`]) })) : [
        { group: "Foundation", items: requirements.slice(0, 2).map((item, index) => [`${project.domain} foundation ${index + 1}`, item]) },
        { group: "Implementation", items: requirements.slice(2, 4).map((item, index) => [`${project.title} implementation ${index + 1}`, item]) },
        { group: "Evidence", items: [["Validation and documentation", `${requirements[4]} ${project.tests}`]] },
      ],
      links: [],
      mistakes: profile ? profile.mistakes : requirements.map((item, index) => [["Unclear project scope", "Missing implementation evidence", "Untested edge conditions", "Undocumented limitation", "Incomplete handoff"][index], `Address this part of the assigned work directly: ${item}`]),
      cvPatterns: [`Built [tool] work for ${project.title}, tested [metric], and documented the ${project.domain} project boundary.`],
      college: [],
      credential: `Complete ${project.title}, submit your own ${project.domain} evidence and wait for reviewer approval. Credential availability follows the existing approval flow.`,
      faqs: profileFaqs,
      sibling,
      longForm: `${project.context} ${requirements.join(" ")} ${project.tests}`,
    },
  };
}

module.exports = { createCataloguePage };
