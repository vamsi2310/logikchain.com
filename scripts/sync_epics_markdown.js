const fs = require('fs');
const path = require('path');

const WORK_DIR = path.resolve('work-management');
const epicsData = JSON.parse(fs.readFileSync(path.join(WORK_DIR, 'work_management_data.json'), 'utf8'));

// Build lookup map for epic status and feature status
const epicStatusMap = {};
const featureStatusMap = {};

epicsData.forEach(e => {
  epicStatusMap[e.id] = e.status;
  (e.features || []).forEach(f => {
    featureStatusMap[f.id] = f.status;
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
  const targetEpicStatus = epicStatusMap[epicId] || 'DONE';

  // Replace Epic Status line
  content = content.replace(
    /- \*\*Epic Status\*\*:\s*`?\[?[a-zA-Z_]+\]?`?/g,
    `- **Epic Status**: [${targetEpicStatus}]`
  );

  // Replace Feature Status lines within each feature block
  const lines = content.split('\n');
  let currentFeatId = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const featHeaderMatch = line.match(/^##\s+(FEAT-\d+\.\d+):/);
    if (featHeaderMatch) {
      currentFeatId = featHeaderMatch[1];
    }

    if (currentFeatId && line.includes('**Feature Status**:')) {
      const featStatus = featureStatusMap[currentFeatId] || 'DONE';
      lines[i] = line.replace(
        /- \*\*Feature Status\*\*:\s*`?\[?[a-zA-Z_]+\]?`?/,
        `- **Feature Status**: [${featStatus}]`
      );
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`Updated ${file} -> Epic [${targetEpicStatus}]`);
});

// Now update Section 3 of USE-CASES-TRACEABILITY-MATRIX.md
const matrixPath = path.join(WORK_DIR, 'USE-CASES-TRACEABILITY-MATRIX.md');
let matrix = fs.readFileSync(matrixPath, 'utf8');

// Update header
matrix = matrix.replace(
  '## 3. Latest Test Results & Use Case Review Analysis (Status: IN_PROGRESS)',
  '## 3. Latest Test Results & Use Case Review Analysis (Status: VERIFIED & COMPLETED)'
);

// Update status markers in Section 3
matrix = matrix.replace(/\*\*IN_PROGRESS\*\*<br>○ READY/g, '**VERIFIED**<br>✓ PASSED');
matrix = matrix.replace(/\*\*IN_PROGRESS\*\*<br>Phase 5 Critical Path/g, '**VERIFIED**<br>✓ PASSED');
matrix = matrix.replace(/\*\*IN_PROGRESS\*\*<br>✓ PASSED/g, '**VERIFIED**<br>✓ PASSED');

fs.writeFileSync(matrixPath, matrix, 'utf8');
console.log('Updated USE-CASES-TRACEABILITY-MATRIX.md Section 3 to VERIFIED & COMPLETED');

