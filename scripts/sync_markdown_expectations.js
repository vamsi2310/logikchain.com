const fs = require('fs');
const path = require('path');

const WORK_DIR = path.resolve('work-management');
const epicsData = JSON.parse(fs.readFileSync(path.join(WORK_DIR, 'work_management_data.json'), 'utf8'));

// Build lookup map for epic status, feature status, and clear expectations
const epicStatusMap = {};
const featureMap = {};

epicsData.forEach(e => {
  epicStatusMap[e.id] = e.status;
  (e.features || []).forEach(f => {
    featureMap[f.id] = f;
  });
});

const epicFiles = fs.readdirSync(WORK_DIR).filter(f => f.startsWith('EPIC-') && f.endsWith('.md'));

epicFiles.forEach(file => {
  const filePath = path.join(WORK_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Extract Epic ID
  const epicIdMatch = file.match(/^(EPIC-\d+)/);
  if (!epicIdMatch) return;
  const epicId = epicIdMatch[1];
  const targetEpicStatus = epicStatusMap[epicId] || 'IN_PROGRESS';

  // Replace Epic Status line
  content = content.replace(
    /- \*\*Epic Status\*\*:\s*`?\[?[a-zA-Z_]+\]?`?/g,
    `- **Epic Status**: [${targetEpicStatus}]`
  );

  const lines = content.split('\n');
  let currentFeatId = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const featHeaderMatch = line.match(/^##\s+(FEAT-\d+\.\d+):/);
    if (featHeaderMatch) {
      currentFeatId = featHeaderMatch[1];
    }

    if (currentFeatId && line.includes('**Feature Status**:')) {
      const featObj = featureMap[currentFeatId];
      const featStatus = featObj ? featObj.status : 'IN_PROGRESS';
      lines[i] = line.replace(
        /- \*\*Feature Status\*\*:\s*`?\[?[a-zA-Z_]+\]?`?/,
        `- **Feature Status**: [${featStatus}]`
      );
    }
  }

  content = lines.join('\n');

  // Inject or update Clear Expectations under each feature in Markdown
  Object.keys(featureMap).forEach(fid => {
    if (file.includes(fid.split('.')[0])) {
      const feat = featureMap[fid];
      if (feat.clearExpectations && !content.includes(`### Clear Expectations (${fid})`)) {
        const featHeaderRegex = new RegExp(`(##\\s+${fid}:[^\n]+)`, 'g');
        const expectationsBlock = `\n### Clear Expectations (${fid})\n- **Functional Scope**: ${feat.clearExpectations.functionalExpectations}\n- **4-Phase Lifecycle**: \`${feat.clearExpectations.lifecycleExpectations}\`\n- **Circuit Breakers & Guards**: ${feat.clearExpectations.circuitBreakerExpectations}\n- **Definition of Done**: ${feat.clearExpectations.definitionOfDone}\n`;
        content = content.replace(featHeaderRegex, `$1\n${expectationsBlock}`);
      }
    }
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file} -> Epic [${targetEpicStatus}] with Clear Expectations`);
});

// Update USE-CASES-TRACEABILITY-MATRIX.md
const matrixPath = path.join(WORK_DIR, 'USE-CASES-TRACEABILITY-MATRIX.md');
let matrix = fs.readFileSync(matrixPath, 'utf8');

// Update Section 3 header
matrix = matrix.replace(
  /## 3\. Latest Test Results & Use Case Review Analysis \(Status:[^\)]+\)/,
  '## 3. Latest Test Results & Use Case Review Analysis (Status: IN_PROGRESS - Active Continuous Verification)'
);

// Update Section 3 statuses to IN_PROGRESS with verified test marker
matrix = matrix.replace(/\*\*VERIFIED\*\*<br>✓ PASSED/g, '**IN_PROGRESS**<br>✓ PASSED (Verified)');

fs.writeFileSync(matrixPath, matrix, 'utf8');
console.log('Successfully updated USE-CASES-TRACEABILITY-MATRIX.md');

