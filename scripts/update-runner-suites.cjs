const fs = require('fs');
const path = require('path');

const SUITE_CATEGORIES = {
  'uc-01a': { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-identity-business.spec.ts' },
  'uc-01b': { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-identity-business.spec.ts' },
  'uc-01c': { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-identity-business.spec.ts' },
  'uc-01d': { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-identity-business.spec.ts' },
  'uc-01e': { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-identity-technical.spec.ts' },
  'uc-01f': { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-identity-technical.spec.ts' },
  'uc-01g': { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-identity-technical.spec.ts' },
  'uc-01h': { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-identity-business.spec.ts' },
  'uc-01i': { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-identity-business.spec.ts' },
  'uc-01j': { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-identity-technical.spec.ts' },
  'uc-01k': { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-identity-technical.spec.ts' },
  'uc-04':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-commerce.spec.ts' },
  'uc-05':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-commerce.spec.ts' },
  'uc-06':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-commerce.spec.ts' },
  'uc-07':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-commerce.spec.ts' },
  'uc-08':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-custody-payouts.spec.ts' },
  'uc-09':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-custody-payouts.spec.ts' },
  'uc-10':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-custody-payouts.spec.ts' },
  'uc-11':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-custody-payouts.spec.ts' },
  'uc-12':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-custody-payouts.spec.ts' },
  'uc-13':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-custody-payouts.spec.ts' },
  'uc-14':  { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-governance-technical.spec.ts' },
  'uc-15':  { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-governance-technical.spec.ts' },
  'uc-16':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-governance-business.spec.ts' },
  'uc-17':  { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-governance-technical.spec.ts' },
  'uc-18':  { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-governance-technical.spec.ts' },
  'uc-19':  { category: 'technical', specFile: 'tests/e2e/pwa/technical/usecases-governance-technical.spec.ts' },
  'uc-20':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-governance-business.spec.ts' },
  'uc-21':  { category: 'business', specFile: 'tests/e2e/pwa/business/usecases-governance-business.spec.ts' },
  'config-geo-hierarchy': { category: 'technical', specFile: 'tests/e2e/pwa/technical/config-geo-hierarchy.spec.ts' },
  'config-subscription-plans': { category: 'business', specFile: 'tests/e2e/pwa/business/config-subscription-plans.spec.ts' },
  'config-tax-profiles': { category: 'technical', specFile: 'tests/e2e/pwa/technical/config-tax-profiles.spec.ts' },
  'support-supplier-bulk-ingest': { category: 'technical', specFile: 'tests/e2e/pwa/technical/support-supplier-bulk-ingest.spec.ts' },
  'support-supplier-proxy': { category: 'technical', specFile: 'tests/e2e/pwa/technical/support-supplier-proxy.spec.ts' },
  'status-services': { category: 'technical', specFile: 'tests/e2e/pwa/technical/status-services.spec.ts' },
  'status-test-runner': { category: 'technical', specFile: 'tests/e2e/pwa/technical/status-test-runner.spec.ts' },
  'user-flow-login-role-village': { category: 'business', specFile: 'tests/e2e/pwa/business/user-flow-login-role-village.spec.ts' },
};

// 1. Update recordings/test-results.json
const jsonFiles = [
  path.resolve(__dirname, '../recordings/test-results.json'),
  path.resolve(__dirname, '../web/public/recordings/test-results.json'),
];

for (const jsonPath of jsonFiles) {
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (Array.isArray(data.suites)) {
      for (const suite of data.suites) {
        if (SUITE_CATEGORIES[suite.id]) {
          suite.category = SUITE_CATEGORIES[suite.id].category;
          suite.specFile = SUITE_CATEGORIES[suite.id].specFile;
        }
      }
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Updated ${jsonPath}`);
    }
  }
}

// 2. Update web/vite-plugin-test-runner.ts
const pluginPath = path.resolve(__dirname, '../web/vite-plugin-test-runner.ts');
let pluginCode = fs.readFileSync(pluginPath, 'utf8');

// Update TestCaseSuite interface to include category
if (!pluginCode.includes('category: "business" | "technical"')) {
  pluginCode = pluginCode.replace(
    /testFilter\?: string;\r?\n/,
    'testFilter?: string;\n  category: "business" | "technical";\n'
  );
}

// Update suites inside DEFAULT_SUITES
for (const [id, meta] of Object.entries(SUITE_CATEGORIES)) {
  const suiteRegex = new RegExp(`id:\\s*["']${id}["'],[\\s\\S]*?name:[\\s\\S]*?specFile:\\s*["'][^"']+["'],`, 'g');
  pluginCode = pluginCode.replace(suiteRegex, (match) => {
    let replaced = match.replace(/specFile:\s*["'][^"']+["']/, `specFile: "${meta.specFile}"`);
    if (!replaced.includes('category:')) {
      replaced = replaced.replace(`specFile: "${meta.specFile}",`, `specFile: "${meta.specFile}",\n    category: "${meta.category}",`);
    }
    return replaced;
  });
}

// Also ensure getSavedResults merges category
pluginCode = pluginCode.replace(
  'testFilter: def.testFilter,',
  'testFilter: def.testFilter,\n              category: def.category,'
);

fs.writeFileSync(pluginPath, pluginCode, 'utf8');
console.log(`Updated ${pluginPath}`);

