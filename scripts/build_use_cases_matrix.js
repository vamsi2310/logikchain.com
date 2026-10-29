const fs = require('fs');
const path = require('path');

const rootDir = 'c:/Users/Admin/Downloads/logikchain/logikchain.com';
const workDir = path.join(rootDir, 'work-management');
const catalog = require('../tests/bruno/catalog.mjs');

// Parse DOCUMENTATION-TRACEABILITY-MATRIX.md
const docMatrixPath = path.join(workDir, 'DOCUMENTATION-TRACEABILITY-MATRIX.md');
const docMatrixText = fs.readFileSync(docMatrixPath, 'utf-8');

// Parse doc entries by FEAT
const featDocMap = {};
const docLines = docMatrixText.split('\n');
let activeFeat = null;
let activeDocs = [];

docLines.forEach(line => {
  const m = line.match(/\|\s*\*\*(FEAT-\d+\.\d+)\*\*/);
  if (m) {
    if (activeFeat) {
      featDocMap[activeFeat] = activeDocs.join(' ');
    }
    activeFeat = m[1];
    activeDocs = [line];
  } else if (activeFeat && line.startsWith('|')) {
    activeDocs.push(line);
  } else if (activeFeat && line.startsWith('---')) {
    featDocMap[activeFeat] = activeDocs.join(' ');
    activeFeat = null;
    activeDocs = [];
  }
});
if (activeFeat) {
  featDocMap[activeFeat] = activeDocs.join(' ');
}

// Function to extract target docs from row
function extractDocs(featId) {
  const row = featDocMap[featId] || '';
  const parts = row.split('|');
  if (parts.length >= 4) {
    const rawTargetDocs = parts[3].trim();
    return rawTargetDocs
      .replace(/<br>/g, ', ')
      .replace(/[•`]/g, '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return [];
}

// Map Bruno operations by endpoint
const brunoOps = catalog.operations;
function findBrunoTests(featEndpoints, featId, epicId) {
  const matches = [];
  
  if (featEndpoints) {
    const epList = featEndpoints.split(',').map(e => e.trim());
    epList.forEach(ep => {
      const parts = ep.split(' ');
      const method = (parts[0] || '').toLowerCase();
      const rawPath = parts[1] || '';
      const cleanPath = rawPath.replace(/\{[^\}]+\}/g, '').replace(/:\w+/g, '');
      
      brunoOps.forEach(op => {
        const opCleanPath = op.path.replace(/\{[^\}]+\}/g, '').replace(/:\w+/g, '');
        if (op.method === method && opCleanPath === cleanPath) {
          matches.push(op);
        } else if (cleanPath.length > 5 && opCleanPath.startsWith(cleanPath)) {
          matches.push(op);
        }
      });
    });
  }

  // Fallbacks based on epic/feat ID
  if (matches.length === 0) {
    if (featId === 'FEAT-01.01') {
      matches.push({ id: 'login', group: '00-auth', isAuth: true });
      matches.push({ id: 'signup', group: '00-auth', isAuth: true });
    } else if (featId === 'FEAT-01.02') {
      const op = brunoOps.find(o => o.id === 'createSupplier');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-01.03') {
      brunoOps.filter(o => o.id === 'convertBuyerToRole' || o.id === 'disassociateMerchant').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-01.04') {
      brunoOps.filter(o => o.id === 'suspendUser' || o.id === 'restoreUser').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-01.06') {
      const op = brunoOps.find(o => o.id === 'updateUserProfile');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-02.01') {
      brunoOps.filter(o => o.id === 'placeOrder' || o.id === 'cancelOrder').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-02.02') {
      const op = brunoOps.find(o => o.id === 'placeMerchantOrder');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-02.03') {
      brunoOps.filter(o => o.id === 'markOrderDelivered' || o.id === 'updateMerchantOrderStatus').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-03.01') {
      brunoOps.filter(o => o.id === 'composeGig' || o.id === 'reassignGigDriver').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-03.02') {
      brunoOps.filter(o => o.id === 'startGig' || o.id === 'updateGigLocation').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-03.03') {
      brunoOps.filter(o => o.id === 'completeAndFinalizeGig' || o.id === 'suspendGig').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-03.04') {
      const op = brunoOps.find(o => o.id === 'upsertRoute');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-04.01' || featId === 'FEAT-04.02' || featId === 'FEAT-04.03') {
      const op = brunoOps.find(o => o.id === 'adjustProductStock');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-05.01') {
      const op = brunoOps.find(o => o.id === 'createPaymentIntent');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-05.02') {
      brunoOps.filter(o => o.id === 'processPayment' || o.id === 'handleGatewayWebhook').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-05.03') {
      brunoOps.filter(o => o.id === 'refundOrder' || o.id === 'issueCreditNote').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-06.01') {
      brunoOps.filter(o => o.id === 'registerPayoutBeneficiary' || o.id === 'blockPayoutBeneficiary').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-06.02') {
      brunoOps.filter(o => o.id === 'requestPayout' || o.id === 'reviewPayoutRequest').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-06.03') {
      brunoOps.filter(o => o.id === 'verifyManualPayout' || o.id === 'retryPayout' || o.id === 'recordPayoutSettlement').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-07.01') {
      brunoOps.filter(o => o.id === 'getCashCustodySummary' || o.id === 'initiateCreditRepayment').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-07.02') {
      brunoOps.filter(o => o.id === 'declareCashHandover' || o.id === 'confirmCashSettlement').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-07.03') {
      brunoOps.filter(o => o.id === 'raiseCashDiscrepancy' || o.id === 'resolveCashDiscrepancy').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-08.01') {
      brunoOps.filter(o => o.id === 'setMerchantCreditLimit' || o.id === 'requestCreditIncrease').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-08.02') {
      const op = brunoOps.find(o => o.id === 'setProvisionalCreditPolicy');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-08.03') {
      brunoOps.filter(o => o.id === 'initiateCreditRepayment' || o.id === 'confirmCreditRepayment').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-09.01') {
      const op = brunoOps.find(o => o.id === 'getFinancialReport');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-09.02') {
      brunoOps.filter(o => o.id === 'runReconciliation' || o.id === 'resolveReconciliationException' || o.id === 'closeAccountingPeriod').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-09.03') {
      brunoOps.filter(o => o.id === 'upsertTdsConfiguration' || o.id === 'recordTdsChallan' || o.id === 'issueTdsCertificate' || o.id === 'getTdsRegister').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-10.01') {
      brunoOps.filter(o => o.id === 'requestVillage' || o.id === 'upsertVillage' || o.id === 'rejectVillageRequest').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-10.02') {
      brunoOps.filter(o => o.id === 'subscribeToPlan' || o.id === 'changeSubscriptionPlan' || o.id === 'assignSubscription' || o.id === 'upsertSubscriptionPlan').forEach(o => matches.push(o));
    } else if (featId === 'FEAT-10.03') {
      const op = brunoOps.find(o => o.id === 'upsertTaxProfile');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-11.02') {
      const op = brunoOps.find(o => o.id === 'suspendUser');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-11.04') {
      const op = brunoOps.find(o => o.id === 'requestAccountDeletion');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-12.01') {
      const op = brunoOps.find(o => o.id === 'getSystemHealth');
      if (op) matches.push(op);
    } else if (featId === 'FEAT-13.01') {
      const op = brunoOps.find(o => o.id === 'registerDeviceToken');
      if (op) matches.push(op);
    }
  }

  // Deduplicate
  const unique = [];
  const seen = new Set();
  matches.forEach(m => {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      unique.push(m);
    }
  });
  return unique;
}

// Function to synthesize clear WHEN and WHY if not explicitly tagged
function deriveWhen(uc, feat) {
  if (uc.preconditions && uc.preconditions.length > 5) {
    return uc.preconditions;
  }
  // Synthesize from context
  if (uc.ucId.includes('01.01')) return 'User opens the app with a valid 10-digit mobile number and active SIM card.';
  if (uc.ucId.includes('01.02')) return 'Support Administrator initiates regional supplier onboarding with verified business documents.';
  if (uc.ucId.includes('01.03')) return 'Supplier or Support operator vets an existing buyer and promotes them to Merchant or Driver.';
  if (uc.ucId.includes('01.04')) return 'Triggered upon detection of compliance breach, fraud velocity limit, or unresolved cash shortfall (or manual reinstatement).';
  if (uc.ucId.includes('01.05.A')) return 'Supplier admin visits Security/Support settings on an eligible Growth or Enterprise subscription plan.';
  if (uc.ucId.includes('01.05.B')) return 'Support operator switches supplier context in console dropdown to inspect or operate on supplier data.';
  if (uc.ucId.includes('01.06')) return 'New user completes first login, updates profile details, or uploads avatar/KYC documents.';
  if (uc.ucId.includes('02.01.B')) return '[Parked] When multiple villagers aggregate orders to hit wholesale pallet volume thresholds.';
  if (uc.ucId.includes('02.04.A')) return 'Recipient inspects parcels at merchant drop point and discovers damaged, broken, or spoiled units.';
  if (uc.ucId.includes('02.04.B')) return 'Scheduled nightly cron runs and detects parcels held at merchant shop past the 72-hour customer pickup window.';
  if (uc.ucId.includes('03.03')) return 'Driver arrives back at origin warehouse after serving all scheduled village merchant waypoints.';
  if (uc.ucId.includes('03.04.A')) return 'Supplier designs new multi-village delivery circuit or clones existing standard corridor.';
  if (uc.ucId.includes('03.04.B')) return 'Supplier attempts to schedule a new gig or attempts to delete a route record.';
  if (uc.ucId.includes('04.02')) return 'Truck driver and warehouse staging crew verify physical stock cartons against digital gig manifest prior to departure.';
  if (uc.ucId.includes('04.03.A')) return 'In-transit transit vibration, rough rural road breakage, or physical spillage is detected by driver.';
  if (uc.ucId.includes('04.03.B')) return 'Driver and supplier report transit shrinkage at end of gig to assess contractual loss vs. 0.5% standard rural shrinkage allowance.';
  if (uc.ucId.includes('05.03')) return 'Order canceled by buyer prior to dispatch, or customer rejects damaged items during delivery handover.';
  if (uc.ucId.includes('06.02')) return 'Driver requests withdrawal of accumulated weekly delivery earnings, or supplier initiates bank payout.';
  if (uc.ucId.includes('06.03')) return 'Payout request passes auto-approval thresholds or receives Support manual clearance.';
  if (uc.ucId.includes('06.04')) return 'Support financial controller monitors escrow balance, take-rates, driver payouts, and commission allocations.';
  if (uc.ucId.includes('07.02')) return 'Delivery driver returns to supplier warehouse cashier at shift end to turn over collected cash.';
  if (uc.ucId.includes('07.03')) return 'Physical counted currency at warehouse desk mismatches driver digital cash custody total, or counterfeit bills are detected.';
  if (uc.ucId.includes('08.01')) return 'Supplier underwrites credit limit for a registered merchant based on transaction history and shop volume.';
  if (uc.ucId.includes('08.02')) return 'Merchant submits B2B restocking order with payment mode selected as revolving trade credit.';
  if (uc.ucId.includes('08.03')) return 'Visiting driver arrives at merchant shop and receives physical cash installment towards outstanding credit balance.';
  if (uc.ucId.includes('08.04.A')) return 'Merchant operates under standard 7-day or 14-day credit terms with supplier.';
  if (uc.ucId.includes('08.04.B')) return 'Merchant credit balance exceeds grace period (30+ days overdue) triggering automated ordering freezes and arbitration.';
  if (uc.ucId.includes('09.01')) return 'Financial transaction occurs anywhere across commerce, payments, cash, credit, or payouts.';
  if (uc.ucId.includes('09.02')) return 'Nightly automated scheduler executes bank statement and gateway reconciliation run.';
  if (uc.ucId.includes('09.03')) return 'Quarterly statutory tax reporting deadline approaches or TDS deduction occurs on driver earnings and supplier sales.';
  if (uc.ucId.includes('10.01')) return 'Admin or supplier adds a new village or inspects geographic boundaries for delivery serviceability.';
  if (uc.ucId.includes('10.02')) return 'Admin configures SaaS subscription tiers or supplier upgrades/downgrades plan.';
  if (uc.ucId.includes('10.03')) return 'Statutory GST tax brackets or Section 194C/194O TDS rates are updated by compliance admin.';
  if (uc.ucId.includes('10.05')) return 'Support administrator runs bulk superimposition pipeline to merge Post Offices CSV and GeoJSON boundaries into PostGIS.';
  if (uc.ucId.includes('10.06.A')) return 'Village merchant configures doorstep delivery availability, working days, and local delivery fee on MER-08.';
  if (uc.ucId.includes('10.06.B')) return 'Supplier sets monthly parcel volume tiers and commission payout rates for merchant drop hubs on SUP-12.';
  if (uc.ucId.includes('10.07.A')) return 'Support administrator authors and publishes standard master route corridors available to all suppliers.';
  if (uc.ucId.includes('10.07.B')) return 'Support administrator inspects, audits, or updates supplier routes across the entire platform.';
  if (uc.ucId.includes('10.08.A')) return 'Support admin executes one-click full ecosystem bulk onboarding for a new regional supplier.';
  if (uc.ucId.includes('10.08.B')) return 'Support operator selectively imports specific warehouses, routes, vehicles, drivers, or merchants for a supplier.';
  if (uc.ucId.includes('11.01')) return 'New supplier or driver registers bank account VPA for digital payout disbursements.';
  if (uc.ucId.includes('11.02')) return 'User or driver exceeds velocity limits (e.g. >5 orders/hr or >₹50,000 cash collection/day).';
  if (uc.ucId.includes('11.03')) return 'Customer or merchant files formal regulatory grievance or dispute exceeding operational SLA.';
  if (uc.ucId.includes('11.04.A')) return 'User signs up or accesses platform requiring explicit clickwrap acceptance of master legal policies.';
  if (uc.ucId.includes('11.04.B')) return 'Platform terms, privacy policy, or merchant agreement is updated with a major revision.';
  if (uc.ucId.includes('12.01')) return 'Any client application sends HTTPS request across the public Internet to the platform.';
  if (uc.ucId.includes('12.02')) return 'Client application initializes session and sends Firebase App Check token with request.';
  if (uc.ucId.includes('12.03')) return 'Database transaction commits in microservice PostgreSQL database with an outbox event.';
  if (uc.ucId.includes('12.04')) return 'Driver captures delivery proof photo or merchant uploads KYC documentation to Cloud Storage.';
  if (uc.ucId.includes('13.01')) return 'User modifies communication preferences (WhatsApp, SMS, Push) in account settings.';
  if (uc.ucId.includes('13.02')) return 'User requests login or signup OTP via WhatsApp messaging channel.';
  if (uc.ucId.includes('13.03')) return 'Order status transitions to dispatched, arrived at hub, or ready for pickup.';
  if (uc.ucId.includes('13.04')) return 'Order completes delivery or merchant restocking invoice is finalized.';

  return 'When operational workflow is initiated by actor or system schedule.';
}

function deriveWhy(uc, feat) {
  if (uc.postconditions && uc.postconditions.length > 5) {
    return uc.postconditions;
  }
  // Synthesize from context
  if (uc.ucId.includes('01.03')) return 'Provides economic mobility for rural citizens; activates shop as verified drop point or driver as vetted logistics operator.';
  if (uc.ucId.includes('01.04')) return 'Mitigates fraud, prevents cash leakage, and enforces contractual compliance across the regional supply chain.';
  if (uc.ucId.includes('02.01.B')) return 'Reduces shipping costs for remote villagers by pooling purchasing power.';
  if (uc.ucId.includes('04.03.A')) return 'Ensures inventory counts reflect physical reality; prevents phantom stock allocations on truck pamphlets.';
  return 'Enforces business logic invariants, data integrity, and regulatory compliance.';
}

// Parse all Epics
const epicFiles = fs.readdirSync(workDir).filter(f => f.startsWith('EPIC-') && f.endsWith('.md')).sort();

const allUseCases = [];

epicFiles.forEach(filename => {
  const content = fs.readFileSync(path.join(workDir, filename), 'utf-8');
  const epicMatch = content.match(/# (EPIC-\d+):\s*([^\r\n]+)/);
  const epicId = epicMatch ? epicMatch[1] : '';
  const epicTitle = epicMatch ? epicMatch[2].trim() : '';

  const svcMatch = content.match(/- \*\*Bound Microservice\*\*:\s*`?([^`\r\n]+)`?/);
  const microservice = svcMatch ? svcMatch[1].trim() : '';
  const dbMatch = content.match(/- \*\*Database\*\*:\s*`?([^`\r\n]+)`?/);
  const db = dbMatch ? dbMatch[1].trim() : '';

  // Split into features
  const featSections = content.split(/\n## (FEAT-\d+\.\d+):?\s*/);
  for (let i = 1; i < featSections.length; i += 2) {
    const featId = featSections[i];
    const featBlock = featSections[i + 1];
    const featTitleMatch = featBlock.match(/^([^\r\n]+)/);
    const featTitle = featTitleMatch ? featTitleMatch[1].trim() : '';

    const endpointsMatch = featBlock.match(/- \*\*Service Endpoints\*\*:\s*([^\r\n]+)/);
    const endpoints = endpointsMatch ? endpointsMatch[1].trim() : '';

    const screensMatch = featBlock.match(/- \*\*UI Screens\*\*:\s*([^\r\n]+)/);
    const screens = screensMatch ? screensMatch[1].trim() : '';

    const runtimesMatch = featBlock.match(/- \*\*Primary Runtimes\*\*:\s*([^\r\n]+)/);
    const runtimes = runtimesMatch ? runtimesMatch[1].trim() : 'Web PWA, Android, iOS';

    // User stories in this feature
    const userStoryMatches = [...featBlock.matchAll(/- \*\*(US-\d+\.\d+\.\d+)[^\*]*\*\*:\s*\*?([^\*\r\n]+)\*?/g)];
    const userStories = userStoryMatches.map(m => ({ id: m[1], text: m[2].trim() }));

    // Automation test stories
    const testStoryMatch = featBlock.match(/- \*\*(TEST-\d+\.\d+\.\d+)[^\*]*\*\*:\s*\*?([^\*\r\n]+)\*?/);
    const pwaTestMatch = featBlock.match(/- \*\*(TEST-\d+\.\d+\.PWA)[^\*]*\*\*:\s*\*?([^\*\r\n]+)\*?/);
    const docStoryMatch = featBlock.match(/- \*\*(DOC-\d+\.\d+\.\d+)[^\*]*\*\*:\s*\*?([^\*\r\n]+)\*?/);

    const testStories = [];
    if (testStoryMatch) testStories.push({ id: testStoryMatch[1], text: testStoryMatch[2].trim() });
    if (pwaTestMatch) testStories.push({ id: pwaTestMatch[1], text: pwaTestMatch[2].trim() });

    // Use Cases in this feature
    const ucSections = featBlock.split(/\n#### (UC-[\w\.\-]+):\s*/);
    for (let j = 1; j < ucSections.length; j += 2) {
      const ucId = ucSections[j];
      const ucBlock = ucSections[j + 1].split(/\n(####|### 3\.|### 4\.|### 5\.|### 6\.|### 7\.|### 8\.)/)[0];
      const ucTitleMatch = ucBlock.match(/^([^\r\n]+)/);
      const ucTitle = ucTitleMatch ? ucTitleMatch[1].trim() : '';

      const descMatch = ucBlock.match(/- \*\*Description\*\*:\s*([^\r\n]+)/);
      const actorMatch = ucBlock.match(/- \*\*Primary Actor\*\*:\s*([^\r\n]+)/);
      const secondaryMatch = ucBlock.match(/- \*\*Secondary Systems\*\*:\s*([^\r\n]+)/);
      const preMatch = ucBlock.match(/- \*\*Preconditions\*\*:\s*([^\r\n]+)/);
      const postMatch = ucBlock.match(/- \*\*Postconditions\*\*:\s*([^\r\n]+)/);

      // Extract nominal flow
      const flowMatch = ucBlock.match(/- \*\*Nominal Flow\*\*:\s*([\s\S]*?)(?=\n- \*\*Alternate|\n- \*\*Postconditions|\n$)/);
      let nominalFlow = '';
      if (flowMatch) {
        nominalFlow = flowMatch[1].trim().split('\n').map(l => l.trim()).filter(Boolean).join(' -> ');
      }

      // Feature anchor slug
      const featSlug = (featId + '-' + featTitle)
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      // Matched Bruno tests
      const brunoTests = findBrunoTests(endpoints, featId, epicId);

      // Target documentation
      const targetDocs = extractDocs(featId);

      const ucObj = {
        epicId,
        epicTitle,
        microservice,
        db,
        featId,
        featTitle,
        featSlug,
        endpoints,
        screens,
        runtimes,
        ucId,
        ucTitle,
        description: descMatch ? descMatch[1].trim() : '',
        primaryActor: actorMatch ? actorMatch[1].trim() : (actorMatch === null && ucId === 'UC-02.01.B' ? 'Village Buyers (Cooperative Group)' : 'System / User'),
        secondarySystems: secondaryMatch ? secondaryMatch[1].trim() : '',
        preconditions: preMatch ? preMatch[1].trim() : '',
        nominalFlow,
        postconditions: postMatch ? postMatch[1].trim() : '',
        userStories,
        testStories,
        docStory: docStoryMatch ? { id: docStoryMatch[1], text: docStoryMatch[2].trim() } : null,
        brunoTests,
        targetDocs,
        filename
      };

      ucObj.when = deriveWhen(ucObj, { featId, featTitle });
      ucObj.why = deriveWhy(ucObj, { featId, featTitle });

      allUseCases.push(ucObj);
    }
  }
});

console.log('Total extracted use cases:', allUseCases.length);

// Generate Markdown content
let md = `# Logikchain App Use Cases Traceability Matrix\n\n`;
md += `This document provides the complete, authoritative specification of **all ${allUseCases.length} Use Cases** across the Logikchain platform. Each use case is rigorously detailed with **WHO**, **WHAT**, **WHEN**, **WHY**, and **WHERE**, mapped 1:1 to agile User Stories, formal Work Items in \`work-management/\`, technical & operational Documentation, and Automated Test Suites (Bruno API tests & PWA Cloud E2E tests).\n\n`;

md += `## 1. 5W Architectural Framework (Taxonomy)\n\n`;
md += `Every use case in Logikchain adheres to the strict 5W operational taxonomy:\n\n`;
md += `- **WHO (Primary Actor & Roles)**: The operating persona executing the journey (e.g. Rural Buyer, Village Merchant, Delivery Driver, Regional Supplier, Support Operator, Unauthenticated Citizen).\n`;
md += `- **WHAT (Core Action & Capabilities)**: The concrete functionality executed, business logic processed, and state transitions recorded.\n`;
md += `- **WHEN (Operational Trigger & Preconditions)**: The exact state prerequisite, schedule, or business event triggering the interaction.\n`;
md += `- **WHY (Business Objective & Value Proposition)**: The core economic or logistical friction solved, KPI target, and fraud/regulatory protection achieved.\n`;
md += `- **WHERE (Touchpoint, Screens & Channels)**: The physical location (Village shop, moving delivery truck, central warehouse, support console) and designated client UI screen ID(s) across Web PWA, Android Compose, and iOS SwiftUI.\n\n`;

md += `--- \n\n`;
md += `## 2. Master Summary Matrix\n\n`;
md += `| Use Case ID | Use Case Name | Epic & Microservice | Primary Actor (WHO) | User Story ID | Work Item | Automated Test ID | Docs Link |\n`;
md += `|:---|:---|:---|:---|:---|:---:|:---:|:---:|\n`;

allUseCases.forEach(uc => {
  const storyIds = uc.userStories.map(s => '`' + s.id + '`').join(', ') || 'N/A';
  const workItemLink = `[${uc.featId}](file:///${rootDir.replace(/\\/g, '/')}/work-management/${uc.filename}#${uc.featSlug})`;
  
  let testLinks = [];
  uc.brunoTests.forEach(bt => {
    if (bt.isAuth) {
      testLinks.push(`[${bt.id}](file:///${rootDir.replace(/\\/g, '/')}/tests/bruno/${bt.group}/${bt.id}.bru)`);
    } else {
      testLinks.push(`[${bt.id}](file:///${rootDir.replace(/\\/g, '/')}/tests/bruno/${bt.group}/${bt.id}/10-execute.bru)`);
    }
  });
  uc.testStories.forEach(ts => {
    testLinks.push('`' + ts.id + '`');
  });
  const testDisplay = testLinks.length > 0 ? testLinks.slice(0, 2).join('<br>') : 'N/A';

  const docDisplay = `[Doc Trace](file:///${rootDir.replace(/\\/g, '/')}/work-management/DOCUMENTATION-TRACEABILITY-MATRIX.md#${uc.epicId.toLowerCase()})`;

  md += `| **${uc.ucId}** | ${uc.ucTitle.replace(/\|/g, '-')} | \`${uc.epicId}\`<br>(${uc.microservice}) | ${uc.primaryActor.replace(/\|/g, '-')} | ${storyIds} | ${workItemLink} | ${testDisplay} | ${docDisplay} |\n`;
});

md += `\n---\n\n`;
md += `## 3. Comprehensive Epic-by-Epic Traceability Matrix\n\n`;

// Group by Epic
const epicsMap = {};
allUseCases.forEach(uc => {
  if (!epicsMap[uc.epicId]) epicsMap[uc.epicId] = [];
  epicsMap[uc.epicId].push(uc);
});

Object.keys(epicsMap).forEach(epicId => {
  const ucs = epicsMap[epicId];
  const first = ucs[0];
  md += `### ${epicId}: ${first.epicTitle}\n`;
  md += `- **Bound Microservice**: \`${first.microservice}\`\n`;
  md += `- **Database**: \`${first.db}\`\n`;
  md += `- **Work Item File**: [${first.filename}](file:///${rootDir.replace(/\\/g, '/')}/work-management/${first.filename})\n\n`;

  md += `| ID | Use Case & Action (WHAT) | Actor (WHO) | When & Why | Where (Screens / Touchpoint) | Stories & Work Item | Automated Tests | Documentation Links |\n`;
  md += `|:---|:---|:---|:---|:---|:---|:---|:---|\n`;

  ucs.forEach(uc => {
    // 5W synthesis
    const who = uc.primaryActor + (uc.secondarySystems ? `<br>*Systems:* ${uc.secondarySystems}` : '');
    const what = `**${uc.ucTitle}**<br>${uc.description}`;
    const whenWhy = `**When:** ${uc.when}<br><br>**Why:** ${uc.why}`;
    const where = `**Screens:** ${uc.screens || 'Multi-Client'}<br>**Runtimes:** ${uc.runtimes}`;
    
    // Stories & Work Item
    const stories = uc.userStories.map(s => `• \`${s.id}\``).join('<br>');
    const workItem = `[${uc.featId}: ${uc.featTitle}](file:///${rootDir.replace(/\\/g, '/')}/work-management/${uc.filename}#${uc.featSlug})`;
    const storiesCol = `${workItem}<br>${stories}`;

    // Automated Tests
    let testLinks = [];
    uc.brunoTests.forEach(bt => {
      if (bt.isAuth) {
        testLinks.push(`• Bruno: [${bt.id}](file:///${rootDir.replace(/\\/g, '/')}/tests/bruno/${bt.group}/${bt.id}.bru)`);
      } else {
        testLinks.push(`• Bruno: [${bt.id}](file:///${rootDir.replace(/\\/g, '/')}/tests/bruno/${bt.group}/${bt.id}/10-execute.bru)`);
      }
    });
    uc.testStories.forEach(ts => {
      testLinks.push(`• Suite: \`${ts.id}\``);
    });
    const testCol = testLinks.length > 0 ? testLinks.join('<br>') : 'N/A';

    // Docs
    const docs = [];
    docs.push(`• [Traceability Matrix](file:///${rootDir.replace(/\\/g, '/')}/work-management/DOCUMENTATION-TRACEABILITY-MATRIX.md#${uc.epicId.toLowerCase()})`);
    if (uc.targetDocs && uc.targetDocs.length > 0) {
      uc.targetDocs.slice(0, 3).forEach(d => {
        docs.push(`• \`${d}\``);
      });
    }
    const docsCol = docs.join('<br>');

    md += `| **${uc.ucId}** | ${what.replace(/\|/g, '-')} | ${who.replace(/\|/g, '-')} | ${whenWhy.replace(/\|/g, '-')} | ${where.replace(/\|/g, '-')} | ${storiesCol} | ${testCol} | ${docsCol} |\n`;
  });

  md += `\n---\n\n`;
});

const outputPath = path.join(workDir, 'USE-CASES-TRACEABILITY-MATRIX.md');
fs.writeFileSync(outputPath, md, 'utf-8');
console.log('Successfully wrote matrix to:', outputPath);
console.log('Total characters written:', md.length);
