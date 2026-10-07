'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_CATALOGUE } = require('../config/project-catalogue');

const slugify = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tools = Object.fromEntries(PROJECT_CATALOGUE.map(project => {
  const slug = slugify(project.domain);
  return [slug, `Tools suitable for ${project.title}: implementation, validation, documentation, and the technologies required by the catalogue brief.`];
}));

// Only traceable source text belongs here. Empty fields require owner input and keep pages noindex.
const intro = `# Domain facts — HireeBridge first 10 internship pages

This file is the editorial source for Class A page facts. Project fields are generated from \`config/project-catalogue.js\`; shared programme fields quote the existing HireeBridge submission, approval, pricing and credential flow. A domain inherits every field under \`ALL\` and overrides an inherited field by repeating that field under its own heading.

## ALL

duration: <!-- owner-confirmed 2026-10-07 -->
1 Month / 4 Weeks.

review process:

what reviewers check: <!-- owner-confirmed 2026-10-07 -->
Completeness against the assigned brief and deliverables; functional correctness; domain-relevant logic, data, metrics or implementation; required edge cases and failure handling; reproducible setup and submission evidence; and clear documentation of the completed work.

reviewer: <!-- owner-confirmed 2026-10-07 -->
GreyRocks team

certificate and verification:
Only after you complete and submit your assigned task and a reviewer explicitly approves it. Payment alone does not issue a certificate. Issued certificates show a unique credential ID and QR verification destination.

resubmission/refund policy:

which plans include what:
Each domain maps to an assigned project and task specification. Reference repositories and comprehensive materials depend on the selected plan; certificates follow task submission and explicit reviewer approval.

last reviewed: <!-- owner-confirmed 2026-10-07 -->
2026-10-07
`;

const blocks = PROJECT_CATALOGUE.map(project => {
  const slug = slugify(project.domain);
  return `\n## ${slug}\n\ntask brief:\n${project.title} — ${project.objective}\n\ndeliverables:\n${project.outputs.replace(/\bjourney\b/gi, 'user-flow').split(', ').map(item => `- ${item.replace(/\.$/, '')}`).join('\n')}\n\ntask validation:\n${project.tests}\n\ntools expected:\n${tools[slug]}\n`;
});

fs.writeFileSync(path.join(__dirname, '..', 'docs', 'domain-facts.md'), `${intro}${blocks.join('')}\n`, 'utf8');
console.log('Regenerated docs/domain-facts.md from catalogue fields and traceable shared facts.');
