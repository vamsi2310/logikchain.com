const fs = require('fs');
const path = require('path');

const jsonPath = path.resolve('work-management/work_management_data.json');
const webJsonPath = path.resolve('web/src/data/work_management_data.json');
const jsPath = path.resolve('work-management/work_management_data.js');

const epics = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const doneFeatures = [
  'FEAT-01.01', 'FEAT-01.03', 'FEAT-01.06',
  'FEAT-09.01', 'FEAT-09.02', 'FEAT-09.03',
  'FEAT-10.01', 'FEAT-10.02', 'FEAT-10.03',
  'FEAT-11.01', 'FEAT-11.02', 'FEAT-11.03', 'FEAT-11.04'
];

let updatedCount = 0;
epics.forEach(epic => {
  (epic.features || []).forEach(f => {
    if (doneFeatures.includes(f.id)) {
      if (f.status !== 'DONE') {
        f.status = 'DONE';
        updatedCount++;
      }
    }
    if (f.id === 'FEAT-06.02' && !f.useCaseNumber) {
      f.useCaseNumber = 'UC-10';
      f.useCaseTitle = 'Driver & Supplier Payout Requests & Cash Discrepancy Gate';
      f.lifecycle = '1. Test Data Setup -> 2. User Sign-In -> 3. Core Business Flow -> 4. Explicit User Sign-Out';
    }
  });

  const allFeaturesDone = (epic.features || []).every(f => f.status === 'DONE');
  if (allFeaturesDone && epic.status !== 'DONE') {
    epic.status = 'DONE';
    console.log(`Epic ${epic.id} updated to DONE`);
  }
});

console.log('Total features updated to DONE:', updatedCount);

fs.writeFileSync(jsonPath, JSON.stringify(epics, null, 2), 'utf8');
fs.writeFileSync(webJsonPath, JSON.stringify(epics, null, 2), 'utf8');
fs.writeFileSync(
  jsPath,
  'window.WORK_MANAGEMENT_DATA = ' + JSON.stringify(epics, null, 2) + ';\nif (typeof module !== "undefined") module.exports = window.WORK_MANAGEMENT_DATA;\n',
  'utf8'
);

console.log('Successfully wrote updated work management data to all 3 files.');

