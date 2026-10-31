const fs = require('fs');
const path = require('path');

const jsonPath1 = path.join(__dirname, '../work-management/work_management_data.json');
const jsPath = path.join(__dirname, '../work-management/work_management_data.js');
const jsonPath2 = path.join(__dirname, '../web/src/data/work_management_data.json');

const data = JSON.parse(fs.readFileSync(jsonPath1, 'utf8'));

const targetEpicIds = ['EPIC-11', 'EPIC-09'];
const targetFeatureIds = [
  'FEAT-11.01', 'FEAT-11.02', 'FEAT-11.03', 'FEAT-11.04',
  'FEAT-09.01', 'FEAT-09.02', 'FEAT-09.03'
];

for (const epic of data) {
  if (targetEpicIds.includes(epic.id)) {
    epic.status = 'DONE';
  }
  if (Array.isArray(epic.features)) {
    for (const feat of epic.features) {
      if (targetFeatureIds.includes(feat.id)) {
        feat.status = 'DONE';
        if (Array.isArray(feat.stories)) {
          for (const story of feat.stories) {
            story.status = 'DONE';
          }
        }
      }
    }
  }
}

const formattedJson = JSON.stringify(data, null, 2);
fs.writeFileSync(jsonPath1, formattedJson, 'utf8');
fs.writeFileSync(jsonPath2, formattedJson, 'utf8');

const jsContent = `// Work Management Data Object\nwindow.WORK_MANAGEMENT_DATA = ${formattedJson};\n`;
fs.writeFileSync(jsPath, jsContent, 'utf8');

console.log('Successfully updated EPIC-11 and EPIC-09 and all Phase 5 features to DONE in data files.');

