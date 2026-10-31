const fs = require('fs');
const path = require('path');

const docPath = path.resolve(__dirname, '../docs/USE_CASES.md');
const content = fs.readFileSync(docPath, 'utf8');

// 1. Extract Preface & Section 1 (Lifecycle, Test Data Architecture) & Section 2 (Personas)
const prefaceMatch = content.match(/([\s\S]*?)(?=###\s*Tier 1: Identity, Multi-Persona Onboarding)/);
if (!prefaceMatch) {
  console.error("Could not find preface match!");
  process.exit(1);
}
let preface = prefaceMatch[1];

// 2. Parse all individual use case blocks
// Regex to capture each usecase starting with #### `UC-XX` or #### UC-XX
const ucRegex = /####\s*(?:`?(UC-[0-9A-Z]+)`?:?\s*([^\r\n]+))([\s\S]*?)(?=(?:####\s*`?UC-[0-9A-Z]+`?|###\s*Tier|$))/g;
const usecases = {};
let match;
while ((match = ucRegex.exec(content)) !== null) {
  const ucId = match[1];
  const title = match[2].trim();
  const body = match[3].trim();
  usecases[ucId] = {
    id: ucId,
    title,
    fullBlock: `#### \`${ucId}\`: ${title}\n\n${body}\n`
  };
}

console.log(`Parsed ${Object.keys(usecases).length} use cases.`);

// 3. Define Business and Technical groupings
const BUSINESS_GROUPS = [
  {
    tier: 'Tier 1: End-User Onboarding & Identity Journeys',
    epic: 'EPIC-01: Multi-Persona Identity & Authentication',
    specFile: 'tests/e2e/pwa/business/usecases-identity-business.spec.ts & user-flow-login-role-village.spec.ts',
    ids: ['UC-01A', 'UC-01B', 'UC-01C', 'UC-01D', 'UC-01H', 'UC-01I', 'UC-01', 'UC-02', 'UC-03']
  },
  {
    tier: 'Tier 2: Commerce, Working Capital & Consignment Fulfillment',
    epic: 'EPIC-02: Orders & Fulfillment, EPIC-05: Kirana Consignment, EPIC-08: Working Capital & Credit',
    specFile: 'tests/e2e/pwa/business/usecases-commerce.spec.ts',
    ids: ['UC-04', 'UC-05', 'UC-06', 'UC-07']
  },
  {
    tier: 'Tier 3: Field Custody, Cash Management & Payouts',
    epic: 'EPIC-06: Payouts & Disbursements, EPIC-07: Cash Custody & Turn-In',
    specFile: 'tests/e2e/pwa/business/usecases-custody-payouts.spec.ts',
    ids: ['UC-08', 'UC-09', 'UC-10', 'UC-11', 'UC-12', 'UC-13']
  },
  {
    tier: 'Tier 4: Statutory Business Operations, Disputes & Tax Withholding',
    epic: 'EPIC-09: Financial Reconciliation, EPIC-11: Platform Governance & Disputes',
    specFile: 'tests/e2e/pwa/business/usecases-governance-business.spec.ts',
    ids: ['UC-16', 'UC-20', 'UC-21']
  },
  {
    tier: 'Tier 5: Commercial SaaS Subscription Plans & Tariffs',
    epic: 'EPIC-10: Master Configuration & SaaS Tariffs',
    specFile: 'tests/e2e/pwa/business/config-subscription-plans.spec.ts',
    ids: ['UC-23']
  },
  {
    tier: 'Tier 7: Automated Returns, Credit Repayments & Revolving Terms Governance',
    epic: 'EPIC-05: Returns & Credit Notes, EPIC-08: Credit Repayment Ledger',
    specFile: 'tests/e2e/pwa/business/usecases-refunds-credit.spec.ts',
    ids: ['UC-29', 'UC-30', 'UC-31']
  }
];

const TECHNICAL_GROUPS = [
  {
    tier: 'Tier 1: Platform Infrastructure, Zero-Trust Access & Operator RBAC',
    epic: 'EPIC-01: Zero-Trust Security, Operator RBAC, OpenID Federation',
    specFile: 'tests/e2e/pwa/technical/usecases-identity-technical.spec.ts',
    ids: ['UC-01E', 'UC-01F', 'UC-01G', 'UC-01J', 'UC-01K']
  },
  {
    tier: 'Tier 4: System Governance Invariant Gates, AML Stream & Ledger Invariance',
    epic: 'EPIC-09: Financial General Ledger, EPIC-11: Compliance, AML & Invariant Gates',
    specFile: 'tests/e2e/pwa/technical/usecases-governance-technical.spec.ts',
    ids: ['UC-14', 'UC-15', 'UC-17', 'UC-18', 'UC-19']
  },
  {
    tier: 'Tier 5: Master Data Infrastructure, Geo-Hierarchy & Tax Engine',
    epic: 'EPIC-10: Master Data & Platform Spatial Registries',
    specFile: 'tests/e2e/pwa/technical/config-geo-hierarchy.spec.ts & config-tax-profiles.spec.ts',
    ids: ['UC-22', 'UC-24']
  },
  {
    tier: 'Tier 5: Data Pipeline Ingestion & Operator Proxy Delegation',
    epic: 'EPIC-10: Data Pipelines, Bulk Ingestion & Support Delegation',
    specFile: 'tests/e2e/pwa/technical/support-supplier-bulk-ingest.spec.ts & support-supplier-proxy.spec.ts',
    ids: ['UC-25', 'UC-26']
  },
  {
    tier: 'Tier 6: Microservices Mesh Telemetry & Observability Console',
    epic: 'EPIC-12: Gateway Mesh Observability, Live Test Runner & Playback',
    specFile: 'tests/e2e/pwa/technical/status-services.spec.ts & status-test-runner.spec.ts',
    ids: ['UC-27', 'UC-28']
  }
];

// Check all 42 use cases are accounted for
const allIds = [
  ...BUSINESS_GROUPS.flatMap(g => g.ids),
  ...TECHNICAL_GROUPS.flatMap(g => g.ids)
];
console.log(`Total accounted IDs: ${allIds.length}`);
for (const id of allIds) {
  if (!usecases[id]) {
    console.error(`Missing usecase content for ${id}`);
  }
}

// Build Markdown
let newDoc = '';

// Retain and clean up Preface & Section 1 & Section 2
// Clean up any old "Canonical Numbered Use Cases" header from preface
preface = preface.replace(/##\s*3\.\s*Canonical Numbered Use Cases[\s\S]*$/, '').trim();

newDoc += preface + '\n\n';

// Add Master Domain Segregation Section
newDoc += `## 2. Master Domain Segregation: Business vs. Technical Capability Use Cases

Logikchain organizes its end-to-end specifications and test architecture into two primary architectural domains:

### 2.1 The Two Pillars

| Domain Category | Architectural Focus | Primary Personas | Target Test Suite |
|:---|:---|:---|:---|
| **💼 Part I: Business Use Cases** (24 Use Cases) | Real-world commerce, trade credit, multi-persona user journeys, consignment delivery, cash custody, doorstep verification, dispute resolution, statutory returns, and subscription billing. | Rural Consumer, Kirana Merchant, Fleet Driver, Regional Mill Supplier, Customer Support Manager. | \`tests/e2e/pwa/business/\` |
| **⚙️ Part II: Technical Capability Use Cases** (18 Use Cases) | System infrastructure, zero-trust RBAC privilege elevation, automated fraud velocity streaming circuit breakers, double-entry zero-sum invariants, Vertex AI bank reconciliation, spatial geo-hierarchies, bulk ETL loaders, operator proxy delegation, and microservices mesh observability. | DevOps / SRE, Security Auditor, System Service Worker, Finance Compliance Officer, Automation Runner. | \`tests/e2e/pwa/technical/\` |

---

### 2.2 Traceability & Test Suite Mapping Matrix

| Use Case ID | Domain | Title | Actor | Target Spec File |
|:---|:---:|:---|:---|:---|
${BUSINESS_GROUPS.flatMap(g => g.ids.map(id => {
  const uc = usecases[id];
  return `| \`${id}\` | 💼 **Business** | ${uc.title} | Multiple / Business Personas | \`${g.specFile.split('&')[0].trim()}\` |`;
})).join('\n')}
${TECHNICAL_GROUPS.flatMap(g => g.ids.map(id => {
  const uc = usecases[id];
  return `| \`${id}\` | ⚙️ **Technical** | ${uc.title} | SRE / SecOps / System | \`${g.specFile.split('&')[0].trim()}\` |`;
})).join('\n')}

---

`;

// Append Part I: Business Use Cases
newDoc += `## Part I: Business Use Cases (Commercial, Logistics & Value Flows)\n\n`;
newDoc += `The following 24 use cases specify the commercial, logistics, physical handover, financial settlement, and end-user journeys that drive the Logikchain rural supply chain platform. Every usecase is verified with dedicated test data in \`tests/e2e/data/\` and executed under \`tests/e2e/pwa/business/\`.\n\n`;

for (const group of BUSINESS_GROUPS) {
  newDoc += `### ${group.tier}\n`;
  newDoc += `**Epic Scope:** ${group.epic}  \n`;
  newDoc += `**Automated Test Suite:** \`${group.specFile}\`\n\n`;
  for (const id of group.ids) {
    if (usecases[id]) {
      newDoc += usecases[id].fullBlock + '\n---\n\n';
    }
  }
}

// Append Part II: Technical Capability Use Cases
newDoc += `## Part II: Technical Capability Use Cases (Architecture, Security & Governance)\n\n`;
newDoc += `The following 18 use cases validate system invariants, zero-trust security postures, streaming fraud circuit breakers, double-entry general ledger balance rules, automated Vertex AI variance analysis, spatial master data engines, and cluster telemetry. Every capability is verified with dedicated test data in \`tests/e2e/data/\` and executed under \`tests/e2e/pwa/technical/\`.\n\n`;

for (const group of TECHNICAL_GROUPS) {
  newDoc += `### ${group.tier}\n`;
  newDoc += `**Epic Scope:** ${group.epic}  \n`;
  newDoc += `**Automated Test Suite:** \`${group.specFile}\`\n\n`;
  for (const id of group.ids) {
    if (usecases[id]) {
      newDoc += usecases[id].fullBlock + '\n---\n\n';
    }
  }
}

fs.writeFileSync(docPath, newDoc, 'utf8');
console.log(`Successfully rewrote ${docPath}. New size: ${newDoc.length} characters.`);

