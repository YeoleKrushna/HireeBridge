const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('Testing Admin UI Scripts & Modals...');

const serverContent = fs.readFileSync('server.js', 'utf8');

// 1. Verify script tags syntax
const scriptMatches = serverContent.match(/<script>([\s\S]*?)<\/script>/g);
assert(scriptMatches && scriptMatches.length >= 2, 'Must have at least 2 script tags');

const adminScript = scriptMatches[1].replace(/<\/?script>/g, '').replace(/\$\{JSON\.stringify\(resourcesByDomain\)\}/g, '{}');

// Execute script in a mock DOM / Window environment
const mockWindow = {
  innerWidth: 1024,
  location: { reload: () => {} },
  scrollTo: () => {}
};
const mockDocument = {
  querySelectorAll: () => [],
  getElementById: () => null,
  addEventListener: () => {}
};

const sandbox = {
  window: mockWindow,
  document: mockDocument,
  console: console,
  setTimeout: () => {},
  fetch: async () => ({ ok: true, json: async () => ({}) })
};

vm.createContext(sandbox);

try {
  vm.runInContext(adminScript, sandbox);
  console.log('[PASS] Admin client script executes with 0 syntax errors');
} catch (err) {
  console.error('[FAIL] Admin script error:', err);
  process.exit(1);
}

// 2. Check all required buttons and modal functions exist on window
const expectedFunctions = [
  'switchAdminView',
  'reconcileR2Storage',
  'deleteOrphanFile',
  'filterStudentsList',
  'filterStorageCertTable',
  'showStudentDeps',
  'closeStudentDepsModal',
  'promptSoftDelete',
  'closeSoftDeleteModal',
  'executeSoftDelete',
  'promptHardDelete',
  'checkHardDeleteInput',
  'closeHardDeleteModal',
  'executeHardDelete',
  'restoreStudentAccount',
  'openCreateStudentModal',
  'closeCreateStudentModal',
  'submitCreateStudentForm',
  'deleteCertArtifactsOnly',
  'regenerateCertArtifacts',
  'deleteFullCertRecord',
  'refreshAuditTrail'
];

expectedFunctions.forEach(fn => {
  assert.strictEqual(typeof mockWindow[fn], 'function', `Expected window.${fn} to be a function`);
  console.log(`[PASS] window.${fn} is properly defined`);
});

// 3. Verify modal tag balancing
const modalIds = [
  'adminCertPreviewModal',
  'adminStudentDepsModal',
  'adminSoftDeleteModal',
  'adminHardDeleteModal',
  'adminCreateStudentModal'
];

modalIds.forEach((id, idx) => {
  const nextId = modalIds[idx + 1];
  const startIdx = serverContent.indexOf(`<div class="admin-modal" id="${id}"`);
  assert(startIdx !== -1, `Modal ${id} must exist`);
  const endIdx = nextId ? serverContent.indexOf(`<div class="admin-modal" id="${nextId}"`) : serverContent.indexOf('</main>', startIdx);
  const chunk = serverContent.substring(startIdx, endIdx);
  const opens = (chunk.match(/<div(\s|>)/g) || []).length;
  const closes = (chunk.match(/<\/div>/g) || []).length;
  assert.strictEqual(opens, closes, `Modal ${id} open divs (${opens}) must equal closed divs (${closes})`);
  console.log(`[PASS] Modal #${id} is perfectly balanced (opens=${opens}, closes=${closes})`);
});

console.log('\n======================================================');
console.log('ALL ADMIN UI BUTTON & SCRIPT CHECKS PASSED (100%)');
console.log('======================================================\n');
