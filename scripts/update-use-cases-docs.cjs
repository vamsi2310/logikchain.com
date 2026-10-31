const ts = require('../web/node_modules/typescript');
const fs = require('fs');
const path = require('path');

const files = [
  { path: 'tests/e2e/data/tier1-identity.data.ts', key: 'TIER1_IDENTITY_TEST_DATA' },
  { path: 'tests/e2e/data/tier2-commerce.data.ts', key: 'TIER2_COMMERCE_TEST_DATA' },
  { path: 'tests/e2e/data/tier3-custody.data.ts', key: 'TIER3_CUSTODY_TEST_DATA' },
  { path: 'tests/e2e/data/tier4-governance.data.ts', key: 'TIER4_GOVERNANCE_TEST_DATA' },
  { path: 'tests/e2e/data/tier5-platform.data.ts', key: 'TIER5_PLATFORM_TEST_DATA' },
  { path: 'tests/e2e/data/tier6-refunds-credit.data.ts', key: 'TIER6_REFUNDS_CREDIT_TEST_DATA' },
];

const allData = {};
files.forEach(f => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', f.path), 'utf8');
  const js = ts.transpileModule(content, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { exports: {} };
  const fn = new Function('exports', js);
  fn(sandbox.exports);
  const data = sandbox.exports[f.key];
  for (const [id, val] of Object.entries(data)) {
    allData[id] = { ...val, fileRef: f.path };
  }
});

const docPath = path.resolve(__dirname, '..', 'docs', 'USE_CASES.md');
let doc = fs.readFileSync(docPath, 'utf8');

// 1. Insert Section 1.1 if not present
if (!doc.includes('### 1.1 Decoupled Test Data Architecture')) {
  const section1Anchor = '## 1. Architectural 4-Phase Lifecycle';
  const section11 = `
### 1.1 Decoupled Test Data Architecture & Individual Ingress Framework

To guarantee strict test isolation, reproducibility, and prevent hardcoded ad-hoc mock state in Playwright test files (\`*.spec.ts\`), all test data is strictly decoupled into dedicated TypeScript data modules under [\`tests/e2e/data/\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/):

| Tier & Domain | Dedicated Test Data File | Primary Source Datastore & Microservice |
|---|---|---|
| **Tier 1: Identity & Personas** | [\`tests/e2e/data/tier1-identity.data.ts\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier1-identity.data.ts) | PostgreSQL \`identity_db.user_profiles\` (\`:4001\`) & Firestore \`/UserProfiles\` |
| **Tier 2: Commerce & Working Capital** | [\`tests/e2e/data/tier2-commerce.data.ts\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier2-commerce.data.ts) | PostgreSQL \`credit_db\`, \`orders_db\`, \`payments_db\` (\`:4002\`, \`:4005\`, \`:4008\`) |
| **Tier 3: Field Custody & Payouts** | [\`tests/e2e/data/tier3-custody.data.ts\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier3-custody.data.ts) | PostgreSQL \`cash_db.driver_custody_ledgers\`, \`payouts_db.beneficiaries\` (\`:4006\`, \`:4007\`) |
| **Tier 4: General Ledger & TPAP AML** | [\`tests/e2e/data/tier4-governance.data.ts\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier4-governance.data.ts) | PostgreSQL \`governance_db.tpap_rules\`, \`ledger_db.journal_accounts\`, \`finance_db\` (\`:4009\`, \`:4011\`) |
| **Tier 5: Platform Config & Operations** | [\`tests/e2e/data/tier5-platform.data.ts\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier5-platform.data.ts) | PostgreSQL \`geo_db\`, \`config_db.subscription_plans\`, \`supplier_db\` (\`:4010\`) |
| **Tier 6: Refunds & Advanced Credit** | [\`tests/e2e/data/tier6-refunds-credit.data.ts\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/data/tier6-refunds-credit.data.ts) | PostgreSQL \`payments_db.refunds\`, \`credit_db.credit_agreements\` (\`:4005\`, \`:4008\`) |

#### Standardized Individual Ingress Hook
In every Playwright test, test data is loaded at runtime via the individual use case hook:
\`\`\`typescript
import { setupUseCaseTestData } from '../test-data-setup';

test('UC-XX: Use Case Title', async ({ page }) => {
  // Phase 1: Test Data Setup (invokes dedicated loader from tests/e2e/data/*.data.ts)
  const testData = await setupUseCaseTestData(page, 'UC-XX');
  // Access strongly-typed seed values
  const { userId, orderId, amount } = testData.seedValues;
  ...
});
\`\`\`
`;
  const pos = doc.indexOf(section1Anchor);
  if (pos !== -1) {
    const nextH2 = doc.indexOf('## 2. Actor Personas', pos);
    doc = doc.slice(0, nextH2) + section11 + '\n---\n\n' + doc.slice(nextH2);
  }
}

// 2. For each usecase, insert the test data block under its header
for (const [id, info] of Object.entries(allData)) {
  const headerPatterns = [
    '#### `' + id + '`:',
    '#### `' + id + ':',
    '#### ' + id + ':'
  ];
  let headerIndex = -1;
  let matchedHeader = '';
  for (const pat of headerPatterns) {
    const idx = doc.indexOf(pat);
    if (idx !== -1) {
      headerIndex = idx;
      matchedHeader = pat;
      break;
    }
  }

  if (headerIndex !== -1) {
    // Check if test data spec already inserted for this use case
    const nextHeaderIdx = doc.indexOf('#### `UC-', headerIndex + matchedHeader.length);
    const endRange = nextHeaderIdx !== -1 ? nextHeaderIdx : headerIndex + 2500;
    const currentSection = doc.slice(headerIndex, endRange);

    if (!currentSection.includes('**Test Data Specification (Source & Values)**')) {
      const block = `* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [\`${info.fileRef}\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/${info.fileRef})
  * **Datastore Source**: \`${info.source.datastore}\`
  * **Microservice**: \`${info.source.microservice}\`
  * **Sync Target / Endpoint**: \`${info.source.syncTarget || info.source.apiEndpoint || 'N/A'}\`
  * **Authentication Mechanism**: \`${info.source.authMechanism || 'Standard Role Token'}\`
  * **Individual Ingress Hook**: \`const testData = await setupUseCaseTestData(page, '${id}');\`
  * **Input Keys & Seed Values**:
    \`\`\`json
${JSON.stringify(info.seedValues, null, 2).split('\n').map(l => '    ' + l).join('\n')}
    \`\`\`
  * **Expected Outcomes**:
    \`\`\`json
${JSON.stringify(info.expectedOutcomes || {}, null, 2).split('\n').map(l => '    ' + l).join('\n')}
    \`\`\`
`;
      // Find insertion point right after * **Actor**: or * **Actors**:
      const actorPos = currentSection.indexOf('* **Actor');
      if (actorPos !== -1) {
        const nextLinePos = currentSection.indexOf('\n', actorPos);
        const insertAbsPos = headerIndex + nextLinePos + 1;
        doc = doc.slice(0, insertAbsPos) + block + doc.slice(insertAbsPos);
        console.log('Inserted test data spec into ' + id);
      } else {
        // Insert right after header line
        const headerLineEnd = doc.indexOf('\n', headerIndex);
        doc = doc.slice(0, headerLineEnd + 1) + block + doc.slice(headerLineEnd + 1);
        console.log('Inserted test data spec after header in ' + id);
      }
    } else {
      console.log('Already has test data spec: ' + id);
    }
  } else {
    console.log('Header not found for ' + id + ', appending to end of document');
    const tier7Block = `
---

### Tier 7: Automated Returns, Credit Repayments & Revolving Terms Governance (\`EPIC-05\`, \`EPIC-08\`)

#### \`${id}\`: ${info.title}
* **Actor**: \`ACT-${info.actor === 'merchant' ? 'MER' : info.actor === 'support' ? 'OPS' : 'BUY'}\`
* **Test Data Specification (Source & Values)**:
  * **Test Data File**: [\`${info.fileRef}\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/${info.fileRef})
  * **Datastore Source**: \`${info.source.datastore}\`
  * **Microservice**: \`${info.source.microservice}\`
  * **Sync Target / Endpoint**: \`${info.source.syncTarget || info.source.apiEndpoint || 'N/A'}\`
  * **Authentication Mechanism**: \`${info.source.authMechanism || 'Standard Role Token'}\`
  * **Individual Ingress Hook**: \`const testData = await setupUseCaseTestData(page, '${id}');\`
  * **Input Keys & Seed Values**:
    \`\`\`json
${JSON.stringify(info.seedValues, null, 2).split('\n').map(l => '    ' + l).join('\n')}
    \`\`\`
  * **Expected Outcomes**:
    \`\`\`json
${JSON.stringify(info.expectedOutcomes || {}, null, 2).split('\n').map(l => '    ' + l).join('\n')}
    \`\`\`
* **Feature ID**: \`${info.featureId}\`
* **Automated Spec**: [\`tests/e2e/pwa/usecases-refunds-credit.spec.ts\`](file:///c:/Users/Admin/Downloads/logikchain/logikchain.com/tests/e2e/pwa/usecases-refunds-credit.spec.ts)
`;
    doc += tier7Block;
  }
}

fs.writeFileSync(docPath, doc, 'utf8');
console.log('Successfully updated docs/USE_CASES.md. New length:', doc.length);
