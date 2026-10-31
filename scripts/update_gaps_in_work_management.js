const fs = require('fs');
const path = require('path');

const wmJsonPath = path.resolve(__dirname, '../work-management/work_management_data.json');
const webWmJsonPath = path.resolve(__dirname, '../web/src/data/work_management_data.json');
const wmJsPath = path.resolve(__dirname, '../work-management/work_management_data.js');

const data = JSON.parse(fs.readFileSync(wmJsonPath, 'utf8'));

const gapsByFeature = {
  'FEAT-01.01': [
    'UI Design Gap: User-specific authentication flows need end-to-end multi-persona verification for all 7 roles (UC-01A through UC-01K).',
    'Pre-signup intent persistence and registration validation across individual persona corridors need automated test assertion.'
  ],
  'FEAT-01.02': [
    'UI Design Gap: Supplier app screens in web/src/apps/supplier/ need visual redesign to match the modern homepage design system and color palette.',
    'Self-serve mill facility registration flow and GSTIN onboarding UI requires modern responsive card components.'
  ],
  'FEAT-01.03': [
    'UI Design Gap: Kirana Merchant corridor (/m/gigs, /m/orders, /m/credit) in web/src/apps/merchant/ relies on legacy wireframe Chrome/Cards and needs complete UI rewrite matching the homepage design tokens.',
    'Fullscreen corridor handover and Close App experience requires high-contrast navigation polish.'
  ],
  'FEAT-01.04': [
    'UI Design Gap: Real-time account lockout and unauthorized role redirection (/unauthorized) needs automated circuit breaker verification (UC-01K).',
    'Suspended user banner and Support Desk appeal flow needs modern alert styling.'
  ],
  'FEAT-01.06': [
    'UI Design Gap: Buyer app screens in web/src/apps/buyer/ need complete rewrite from legacy wireframe cards to modern responsive layout matching PublicHomeScreen.',
    'User profile village selection and persistence UI needs polished styling and icon badges.'
  ],
  'FEAT-02.01': [
    'UI Design Gap: Buyer e-commerce checkout and parcel tracking screens in web/src/apps/buyer/ use outdated wireframes and need redesign matching main design tokens.'
  ],
  'FEAT-02.02': [
    'UI Design Gap: Merchant B2B bulk catalog ordering (/m/bulk/new) in web/src/apps/merchant/ needs modernization with high-density SKU tables and trade credit hold badges.'
  ],
  'FEAT-03.02': [
    'UI Design Gap: Fleet Driver PWA screens (/d/gigs, /d/trips) in web/src/apps/vehicle/ need complete UI rewrite with high-contrast outdoor widgets, cargo departure checklists, and live route navigation.'
  ],
  'FEAT-04.01': [
    'UI Design Gap: Dynamic rolling stock pamphlet builder in web/src/apps/supplier/ needs visual overhaul aligning with modern dashboard standards.'
  ],
  'FEAT-06.01': [
    'UI Design Gap: Transporter bank account registration and KMS encryption UI in web/src/apps/vehicle/ needs modern form cards with IFSC verification.'
  ],
  'FEAT-07.01': [
    'UI Design Gap: Driver CoD cash custody tracker and daily limit guard in web/src/apps/vehicle/ need modern outdoor UI rewrite with high-visibility balance progress meters.'
  ],
  'FEAT-08.01': [
    'UI Design Gap: Merchant trade credit line dashboard (/m/credit) in web/src/apps/merchant/ needs modern visual upgrade with headroom gauges and 2-phase hold monitors.'
  ]
};

let inProgressCount = 0;

data.forEach((epic) => {
  let epicHasInProgress = false;
  if (epic.features) {
    epic.features.forEach((feat) => {
      if (gapsByFeature[feat.id]) {
        feat.status = 'IN_PROGRESS';
        feat.gapsIdentified = gapsByFeature[feat.id];
        feat.reviewComments = `Gaps Identified: ${gapsByFeature[feat.id].join(' ')}`;
        
        // Update PWA and Test stories to IN_PROGRESS
        if (feat.stories) {
          feat.stories.forEach((s) => {
            if (s.type === 'pwa' || s.type === 'pwa_test' || s.type === 'user_journey') {
              s.status = 'IN_PROGRESS';
            }
          });
        }
        epicHasInProgress = true;
        inProgressCount++;
      }
    });
  }
  if (epicHasInProgress) {
    epic.status = 'IN_PROGRESS';
  }
});

console.log(`Updated ${inProgressCount} features with identified UI and flow gaps to IN_PROGRESS.`);

// Write back to all three files
fs.writeFileSync(wmJsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
fs.writeFileSync(webWmJsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

const jsContent = `// Auto-generated work management data file\nmodule.exports = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(wmJsPath, jsContent, 'utf8');

console.log('Synchronized work management JSON and JS data files successfully.');

