const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../tests/e2e/pwa');
const busDir = path.resolve(srcDir, 'business');
const techDir = path.resolve(srcDir, 'technical');

if (!fs.existsSync(busDir)) fs.mkdirSync(busDir, { recursive: true });
if (!fs.existsSync(techDir)) fs.mkdirSync(techDir, { recursive: true });

function copyAndFixImports(srcFile, destFile) {
  let content = fs.readFileSync(srcFile, 'utf8');
  content = content.replace(/from\s+['"]\.\.\/test-data-setup['"]/g, "from '../../test-data-setup'");
  fs.writeFileSync(destFile, content, 'utf8');
  console.log(`Copied ${path.basename(srcFile)} -> ${destFile}`);
}

// 1. Move direct business files
copyAndFixImports(path.join(srcDir, 'user-flow-login-role-village.spec.ts'), path.join(busDir, 'user-flow-login-role-village.spec.ts'));
copyAndFixImports(path.join(srcDir, 'usecases-commerce.spec.ts'), path.join(busDir, 'usecases-commerce.spec.ts'));
copyAndFixImports(path.join(srcDir, 'usecases-custody-payouts.spec.ts'), path.join(busDir, 'usecases-custody-payouts.spec.ts'));
copyAndFixImports(path.join(srcDir, 'config-subscription-plans.spec.ts'), path.join(busDir, 'config-subscription-plans.spec.ts'));
if (fs.existsSync(path.join(srcDir, 'usecases-refunds-credit.spec.ts'))) {
  copyAndFixImports(path.join(srcDir, 'usecases-refunds-credit.spec.ts'), path.join(busDir, 'usecases-refunds-credit.spec.ts'));
}

// 2. Move direct technical files
copyAndFixImports(path.join(srcDir, 'config-geo-hierarchy.spec.ts'), path.join(techDir, 'config-geo-hierarchy.spec.ts'));
copyAndFixImports(path.join(srcDir, 'config-tax-profiles.spec.ts'), path.join(techDir, 'config-tax-profiles.spec.ts'));
copyAndFixImports(path.join(srcDir, 'support-supplier-bulk-ingest.spec.ts'), path.join(techDir, 'support-supplier-bulk-ingest.spec.ts'));
copyAndFixImports(path.join(srcDir, 'support-supplier-proxy.spec.ts'), path.join(techDir, 'support-supplier-proxy.spec.ts'));
copyAndFixImports(path.join(srcDir, 'status-services.spec.ts'), path.join(techDir, 'status-services.spec.ts'));
copyAndFixImports(path.join(srcDir, 'status-test-runner.spec.ts'), path.join(techDir, 'status-test-runner.spec.ts'));

// 3. Split usecases-tier1-identity.spec.ts
const identityContent = fs.readFileSync(path.join(srcDir, 'usecases-tier1-identity.spec.ts'), 'utf8');
// Extract header/beforeEach
const identityHeaderMatch = identityContent.match(/([\s\S]*?)(?=\s*\/\/\s*─+\r?\n\s*\/\/\s*UC-01A:)/);
const identityHeader = (identityHeaderMatch ? identityHeaderMatch[1] : '')
  .replace(/from\s+['"]\.\.\/test-data-setup['"]/g, "from '../../test-data-setup'");

// Extract individual tests
const testBlocks = {};
const testMatches = [...identityContent.matchAll(/(?:\/\/\s*─+\r?\n\s*\/\/\s*(UC-[0-9A-Z]+):[\s\S]*?)test\(\s*['"]\1:[^'"]+['"],[\s\S]*?\n  \}\);\n/g)];
for (const match of testMatches) {
  testBlocks[match[1]] = match[0];
}

const busIdentityTests = ['UC-01A', 'UC-01B', 'UC-01C', 'UC-01D', 'UC-01H', 'UC-01I']
  .map(id => testBlocks[id] || '').join('\n');

const techIdentityTests = ['UC-01E', 'UC-01F', 'UC-01G', 'UC-01J', 'UC-01K']
  .map(id => testBlocks[id] || '').join('\n');

fs.writeFileSync(
  path.join(busDir, 'usecases-identity-business.spec.ts'),
  `${identityHeader.replace("Tier 1: Identity Architecture", "Business Identity & Multi-Persona Onboarding (UC-01A, 01B, 01C, 01D, 01H, 01I)")}\n${busIdentityTests}\n});\n`,
  'utf8'
);
console.log('Created business/usecases-identity-business.spec.ts');

fs.writeFileSync(
  path.join(techDir, 'usecases-identity-technical.spec.ts'),
  `${identityHeader.replace("Tier 1: Identity Architecture", "Technical Identity, RBAC Elevation & Security Gates (UC-01E, 01F, 01G, 01J, 01K)")}\n${techIdentityTests}\n});\n`,
  'utf8'
);
console.log('Created technical/usecases-identity-technical.spec.ts');

// 4. Split usecases-governance-ledger.spec.ts
const govContent = fs.readFileSync(path.join(srcDir, 'usecases-governance-ledger.spec.ts'), 'utf8');
const govHeaderMatch = govContent.match(/([\s\S]*?)(?=\s*\/\*\*[\s\S]*?\*\s*UC-14)/);
const govHeader = (govHeaderMatch ? govHeaderMatch[1] : '')
  .replace(/from\s+['"]\.\.\/test-data-setup['"]/g, "from '../../test-data-setup'");

const govTestBlocks = {};
const govTestMatches = [...govContent.matchAll(/(?:\/\*\*[\s\S]*?\*\/\s*)?test\(\s*['"](UC-[0-9]+)[^'"]+['"],[\s\S]*?\n  \}\);\n/g)];
for (const match of govTestMatches) {
  govTestBlocks[match[1]] = match[0];
}

const busGovTests = ['UC-16', 'UC-20', 'UC-21']
  .map(id => govTestBlocks[id] || '').join('\n');

const techGovTests = ['UC-14', 'UC-15', 'UC-17', 'UC-18', 'UC-19']
  .map(id => govTestBlocks[id] || '').join('\n');

fs.writeFileSync(
  path.join(busDir, 'usecases-governance-business.spec.ts'),
  `${govHeader.replace("Tier 4: Financial Ledger, Nightly Bank Reconciliation & TPAP AML", "Business Governance, Disputes & TDS Settlement (UC-16, UC-20, UC-21)")}\n${busGovTests}\n});\n`,
  'utf8'
);
console.log('Created business/usecases-governance-business.spec.ts');

fs.writeFileSync(
  path.join(techDir, 'usecases-governance-technical.spec.ts'),
  `${govHeader.replace("Tier 4: Financial Ledger, Nightly Bank Reconciliation & TPAP AML", "Technical Governance, AML Velocity, Zero-Sum Invariance & Vertex AI Reconciliation (UC-14, 15, 17, 18, 19)")}\n${techGovTests}\n});\n`,
  'utf8'
);
console.log('Created technical/usecases-governance-technical.spec.ts');

