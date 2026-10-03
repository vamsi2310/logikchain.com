const fs = require('fs');
const path = require('path');

const WORK_DIR = path.join(__dirname, '..', 'work-management');

const epicFiles = [
  'EPIC-01-IDENTITY-ACCESS.md',
  'EPIC-02-ORDERS-FULFILLMENT.md',
  'EPIC-03-GIG-LOGISTICS.md',
  'EPIC-04-PAMPHLET-INVENTORY.md',
  'EPIC-05-PAYMENTS-COLLECTIONS.md',
  'EPIC-06-PAYOUTS-DISBURSEMENTS.md',
  'EPIC-07-CASH-CUSTODY.md',
  'EPIC-08-MERCHANT-CREDIT.md',
  'EPIC-09-FINANCE-RECONCILIATION.md',
  'EPIC-10-PLATFORM-CONFIG.md',
  'EPIC-11-PLATFORM-GOVERNANCE.md',
  'EPIC-12-GATEWAY-SYNC-INFRASTRUCTURE.md',
  'EPIC-13-SOCIAL-CONNECT.md'
];

// Determine baseline status based on current repository scaffolding
function determineDefaultStatus(epicId, featId, storyId) {
  if (epicId === 'EPIC-01' || epicId === 'EPIC-10' || epicId === 'EPIC-12' || epicId === 'EPIC-13') {
    if (storyId && (storyId.startsWith('DOC-') || storyId.includes('.01.01'))) {
      return 'IN_PROGRESS';
    }
    if (featId === 'FEAT-01.01' || featId === 'FEAT-10.01' || featId === 'FEAT-12.01' || featId === 'FEAT-12.02' || featId === 'FEAT-13.01' || featId === 'FEAT-13.02') {
      return 'IN_PROGRESS';
    }
  }
  return 'READY';
}

function processEpicFile(filename) {
  const filePath = path.join(WORK_DIR, filename);
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let currentEpicId = filename.split('-').slice(0, 2).join('-');
  let currentFeatId = null;
  let newLines = [];
  let inMetadataSection = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detect Epic ID line
    if (line.trim().startsWith('- **Epic ID**:')) {
      newLines.push(line);
      // Check next line for Epic Status
      if (!lines[i + 1] || !lines[i + 1].includes('**Epic Status**:')) {
        const defaultEpicStatus = (currentEpicId === 'EPIC-01' || currentEpicId === 'EPIC-10' || currentEpicId === 'EPIC-12' || currentEpicId === 'EPIC-13') ? '[IN_PROGRESS]' : '[READY]';
        newLines.push(`- **Epic Status**: ${defaultEpicStatus}`);
      }
      continue;
    }

    // Detect Feature Header
    const featMatch = line.match(/^##\s+(FEAT-\d+\.\d+):/);
    if (featMatch) {
      currentFeatId = featMatch[1];
      newLines.push(line);
      continue;
    }

    // Detect Feature ID line
    if (line.trim().startsWith('- **Feature ID**:')) {
      newLines.push(line);
      if (!lines[i + 1] || !lines[i + 1].includes('**Feature Status**:')) {
        const defaultFeatStatus = determineDefaultStatus(currentEpicId, currentFeatId, null);
        newLines.push(`- **Feature Status**: [${defaultFeatStatus}]`);
      }
      continue;
    }

    // Detect Story lines: US-, INT-, PWA-, AND-, IOS-, TEST-, OPS-, DOC-
    const storyMatch = line.match(/^(\s*-\s+\*\*)([A-Z]+-\d+\.\d+(?:\.[A-Z0-9]+)?)(.*)/);
    if (storyMatch) {
      const prefix = storyMatch[1];
      const storyId = storyMatch[2];
      let rest = storyMatch[3];

      // Check if status is already present
      if (!rest.match(/\[(READY|IN_PROGRESS|DONE|BLOCKED|PLANNED)\]/)) {
        const defaultStoryStatus = determineDefaultStatus(currentEpicId, currentFeatId, storyId);
        // If rest has format " (Title)**: ...", insert status
        if (rest.startsWith(' (')) {
          const parenEnd = rest.indexOf(')**:');
          if (parenEnd !== -1) {
            const title = rest.substring(2, parenEnd);
            const after = rest.substring(parenEnd + 4);
            rest = ` [${defaultStoryStatus}] (${title})**:${after}`;
          } else {
            rest = ` [${defaultStoryStatus}]${rest}`;
          }
        } else if (rest.startsWith('**:')) {
          rest = ` [${defaultStoryStatus}]**:${rest.substring(3)}`;
        } else {
          rest = ` [${defaultStoryStatus}] ${rest}`;
        }
      }
      newLines.push(`${prefix}${storyId}${rest}`);
      continue;
    }

    newLines.push(line);
  }

  const updatedContent = newLines.join('\n');
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  return { filename, currentEpicId };
}

// Parse markdown file into full structured object
function parseEpicMarkdown(filename) {
  const filePath = path.join(WORK_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8');

  const epic = {
    id: '',
    title: '',
    status: 'READY',
    functionalArea: '',
    microservice: '',
    port: '',
    db: '',
    mdFile: filename,
    features: []
  };

  const epicHeaderMatch = content.match(/^#\s+(EPIC-\d+):\s*(.*)/m);
  if (epicHeaderMatch) {
    epic.id = epicHeaderMatch[1].trim();
    epic.title = epicHeaderMatch[2].trim();
  }

  const epicStatusMatch = content.match(/\*\*Epic Status\*\*:\s*\[?([A-Z_]+)\]?/);
  if (epicStatusMatch) epic.status = epicStatusMatch[1].trim();

  const serviceMatch = content.match(/\*\*Bound (?:Microservice|Platform Modules)\*\*:\s*`?([^`\n]+)`?/);
  if (serviceMatch) epic.microservice = serviceMatch[1].trim();

  const portMatch = content.match(/\*\*Container Ports?\*\*:\s*`?([^`\n]+)`?/);
  if (portMatch) epic.port = portMatch[1].trim();

  const dbMatch = content.match(/\*\*Database\*\*:\s*`?([^`\n]+)`?/);
  if (dbMatch) epic.db = dbMatch[1].trim();

  // Features split
  const featSections = content.split(/\n(?=##\s+FEAT-\d+\.\d+:)/);
  for (let i = 1; i < featSections.length; i++) {
    const sec = featSections[i];
    const featHeaderMatch = sec.match(/^##\s+(FEAT-\d+\.\d+):\s*(.*)/m);
    if (!featHeaderMatch) continue;

    const featId = featHeaderMatch[1].trim();
    const featTitle = featHeaderMatch[2].trim();

    const featStatusMatch = sec.match(/\*\*Feature Status\*\*:\s*\[?([A-Z_]+)\]?/);
    const featStatus = featStatusMatch ? featStatusMatch[1].trim() : 'READY';

    const featScopeMatch = sec.match(/\*\*Functional Scope\*\*:\s*([^\n]+)/);
    const featScope = featScopeMatch ? featScopeMatch[1].trim() : '';

    const featEndpointsMatch = sec.match(/\*\*Service Endpoints\*\*:\s*`?([^\n`]+)`?/);
    const featEndpoints = featEndpointsMatch ? featEndpointsMatch[1].trim() : '';

    const feature = {
      id: featId,
      title: featTitle,
      status: featStatus,
      scope: featScope,
      endpoints: featEndpoints,
      stories: []
    };

    // Find stories
    const storyRegex = /-\s+\*\*([A-Z]+-\d+\.\d+(?:\.[A-Z0-9]+)?)\s*\[([A-Z_]+)\]\s*(?:\(([^)]+)\))?\*\*:\s*(.+)/g;
    let sm;
    while ((sm = storyRegex.exec(sec)) !== null) {
      const storyId = sm[1];
      const storyStatus = sm[2];
      const storyName = sm[3] || '';
      const storyDesc = sm[4].trim().replace(/^\*|\*$/g, '');

      let type = 'user_journey';
      if (storyId.startsWith('INT-')) type = 'integration';
      else if (storyId.startsWith('PWA-')) type = 'pwa';
      else if (storyId.startsWith('AND-')) type = 'android';
      else if (storyId.startsWith('IOS-')) type = 'ios';
      else if (storyId.startsWith('TEST-') && storyId.includes('.PWA')) type = 'pwa_test';
      else if (storyId.startsWith('OPS-')) type = 'devops';
      else if (storyId.startsWith('DOC-')) type = 'documentation';
      else if (storyId.startsWith('TEST-')) type = 'automation_test';

      feature.stories.push({
        id: storyId,
        type: type,
        title: storyName || storyId,
        status: storyStatus,
        description: storyDesc
      });
    }

    epic.features.push(feature);
  }

  return epic;
}

console.log('Processing Epic files to normalize statuses in MD files...');
const parsedEpics = [];
for (const file of epicFiles) {
  processEpicFile(file);
  const parsed = parseEpicMarkdown(file);
  parsedEpics.push(parsed);
  console.log(`✓ Processed ${file}: ${parsed.id} (${parsed.features.length} features, ${parsed.features.reduce((acc, f) => acc + f.stories.length, 0)} stories)`);
}

// Generate work_management_data.js
const jsContent = `/**
 * Logikchain Work Management - Central Source of Truth Data Registry
 * Generated from Markdown specifications in /work-management/*.md
 * Synchronized with Epic, Feature, and Story statuses.
 */
(function(window) {
  const BASELINE_DATA = ${JSON.stringify(parsedEpics, null, 2)};

  // Storage key for interactive browser mutations
  const STORAGE_KEY = 'logikchain_work_management_state';

  class WorkManagementStore {
    constructor() {
      this.baseline = JSON.parse(JSON.stringify(BASELINE_DATA));
      this.data = this.loadState();
      this.listeners = [];
      this.serverOnline = false;
      this.checkServerStatus();
      this.initIndexedDB();
    }

    async checkServerStatus() {
      try {
        const resp = await fetch('http://127.0.0.1:3005/api/status', { method: 'GET', mode: 'cors' });
        if (resp.ok) {
          const d = await resp.json();
          this.serverOnline = !!d.ok;
        } else {
          this.serverOnline = false;
        }
      } catch (e) {
        this.serverOnline = false;
      }
      this.notify();
      return this.serverOnline;
    }

    initIndexedDB() {
      if (typeof indexedDB === 'undefined') return;
      try {
        const req = indexedDB.open('LogikchainWorkDB', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('stateStore')) {
            db.createObjectStore('stateStore');
          }
        };
        req.onsuccess = (e) => {
          const db = e.target.result;
          try {
            const tx = db.transaction('stateStore', 'readonly');
            const getReq = tx.objectStore('stateStore').get('workState');
            getReq.onsuccess = () => {
              if (getReq.result) {
                // If local storage was empty, restore from indexedDB
                let hasLocal = false;
                try { hasLocal = !!localStorage.getItem(STORAGE_KEY); } catch(err){}
                if (!hasLocal) {
                  this.data = this.mergeState(this.baseline, getReq.result);
                  this.notify();
                }
              }
            };
          } catch(err) {}
        };
      } catch (e) {
        console.warn('IndexedDB initialization skipped:', e);
      }
    }

    loadState() {
      try {
        if (typeof localStorage !== 'undefined') {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            return this.mergeState(BASELINE_DATA, parsed);
          }
        }
      } catch (e) {
        console.warn('LocalStorage access restricted on file:/// protocol:', e);
      }
      return JSON.parse(JSON.stringify(BASELINE_DATA));
    }

    mergeState(baseline, overrides) {
      const merged = JSON.parse(JSON.stringify(baseline));
      if (!overrides || !Array.isArray(overrides)) return merged;

      const overrideMap = new Map();
      overrides.forEach(e => overrideMap.set(e.id, e));

      merged.forEach(epic => {
        const ovEpic = overrideMap.get(epic.id);
        if (ovEpic) {
          if (ovEpic.status) epic.status = ovEpic.status;
          const featMap = new Map();
          if (ovEpic.features) ovEpic.features.forEach(f => featMap.set(f.id, f));

          epic.features.forEach(feat => {
            const ovFeat = featMap.get(feat.id);
            if (ovFeat) {
              if (ovFeat.status) feat.status = ovFeat.status;
              const storyMap = new Map();
              if (ovFeat.stories) ovFeat.stories.forEach(s => storyMap.set(s.id, s));

              feat.stories.forEach(story => {
                const ovStory = storyMap.get(story.id);
                if (ovStory && ovStory.status) story.status = ovStory.status;
              });
            }
          });
        }
      });
      return merged;
    }

    saveDraft() {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        }
      } catch (e) {
        console.warn('LocalStorage save failed (file:/// restriction):', e);
      }

      if (typeof indexedDB !== 'undefined') {
        try {
          const req = indexedDB.open('LogikchainWorkDB', 1);
          req.onsuccess = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains('stateStore')) {
              const tx = db.transaction('stateStore', 'readwrite');
              tx.objectStore('stateStore').put(this.data, 'workState');
            }
          };
        } catch (e) {}
      }
      this.notify();
    }

    async saveState(options = {}) {
      this.saveDraft();
      const serverUrl = options.serverUrl || 'http://127.0.0.1:3005';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const resp = await fetch(serverUrl + '/api/save', {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ epics: this.data }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const resData = await resp.json();
          // Update in-memory baseline to match current data so diff is 0!
          this.baseline = JSON.parse(JSON.stringify(this.data));
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem(STORAGE_KEY);
            }
          } catch (e) {}
          this.serverOnline = true;
          this.notify();
          return {
            success: true,
            savedToDisk: true,
            updatedFiles: resData.updatedFiles || [],
            timestamp: resData.timestamp
          };
        } else {
          return {
            success: true,
            savedToDisk: false,
            localOnly: true,
            error: 'Server HTTP ' + resp.status
          };
        }
      } catch (err) {
        this.serverOnline = false;
        return {
          success: true,
          savedToDisk: false,
          localOnly: true,
          error: err.message || 'Server connection failed'
        };
      }
    }

    resetToBaseline() {
      this.data = JSON.parse(JSON.stringify(BASELINE_DATA));
      this.baseline = JSON.parse(JSON.stringify(BASELINE_DATA));
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {}
      if (typeof indexedDB !== 'undefined') {
        try {
          const req = indexedDB.open('LogikchainWorkDB', 1);
          req.onsuccess = (e) => {
            const db = e.target.result;
            if (db.objectStoreNames.contains('stateStore')) {
              const tx = db.transaction('stateStore', 'readwrite');
              tx.objectStore('stateStore').delete('workState');
            }
          };
        } catch (e) {}
      }
      this.notify();
      return this.data;
    }

    hasUnsavedChanges() {
      return this.exportMarkdownDiff().length > 0;
    }

    getEpics() {
      return this.data;
    }

    getEpic(epicId) {
      return this.data.find(e => e.id === epicId);
    }

    getFeature(featId) {
      for (const epic of this.data) {
        const feat = epic.features.find(f => f.id === featId);
        if (feat) return { ...feat, epicId: epic.id, epicTitle: epic.title };
      }
      return null;
    }

    updateEpicStatus(epicId, newStatus) {
      const epic = this.getEpic(epicId);
      if (epic) {
        epic.status = newStatus;
        this.saveDraft();
        return true;
      }
      return false;
    }

    updateFeatureStatus(featId, newStatus) {
      for (const epic of this.data) {
        const feat = epic.features.find(f => f.id === featId);
        if (feat) {
          feat.status = newStatus;
          this.saveDraft();
          return true;
        }
      }
      return false;
    }

    updateStoryStatus(storyId, newStatus) {
      for (const epic of this.data) {
        for (const feat of epic.features) {
          const story = feat.stories.find(s => s.id === storyId);
          if (story) {
            story.status = newStatus;
            this.saveDraft();
            return true;
          }
        }
      }
      return false;
    }

    getStats() {
      let totalEpics = this.data.length;
      let totalFeatures = 0;
      let totalStories = 0;
      const statusCounts = {
        DONE: 0,
        IN_PROGRESS: 0,
        READY: 0,
        PLANNED: 0,
        BLOCKED: 0
      };

      this.data.forEach(epic => {
        epic.features.forEach(feat => {
          totalFeatures++;
          feat.stories.forEach(story => {
            totalStories++;
            statusCounts[story.status] = (statusCounts[story.status] || 0) + 1;
          });
        });
      });

      return { totalEpics, totalFeatures, totalStories, statusCounts };
    }

    exportMarkdownDiff() {
      const patches = [];
      const baseline = this.baseline || BASELINE_DATA;
      this.data.forEach((epic) => {
        const baseEpic = baseline.find(b => b.id === epic.id);
        if (!baseEpic) return;
        if (epic.status !== baseEpic.status) {
          patches.push({ file: epic.mdFile, type: 'epic', id: epic.id, oldStatus: baseEpic.status, newStatus: epic.status });
        }
        epic.features.forEach((feat) => {
          const baseFeat = baseEpic.features.find(bf => bf.id === feat.id);
          if (baseFeat && feat.status !== baseFeat.status) {
            patches.push({ file: epic.mdFile, type: 'feature', id: feat.id, oldStatus: baseFeat.status, newStatus: feat.status });
          }
          feat.stories.forEach((story) => {
            const baseStory = baseFeat ? baseFeat.stories.find(bs => bs.id === story.id) : null;
            if (baseStory && story.status !== baseStory.status) {
              patches.push({ file: epic.mdFile, type: 'story', id: story.id, oldStatus: baseStory.status, newStatus: story.status });
            }
          });
        });
      });
      return patches;
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      this.listeners.forEach(cb => {
        try { cb(this.data); } catch (e) { console.error(e); }
      });
    }
  }

  window.WorkManagementStore = new WorkManagementStore();
  window.WORK_MANAGEMENT_BASELINE = BASELINE_DATA;
})(window);
`;

const jsPath = path.join(WORK_DIR, 'work_management_data.js');
fs.writeFileSync(jsPath, jsContent, 'utf8');
console.log(`\n✓ Generated ${jsPath}`);

const jsonPath = path.join(WORK_DIR, 'work_management_data.json');
fs.writeFileSync(jsonPath, JSON.stringify(parsedEpics, null, 2), 'utf8');
console.log(`✓ Generated ${jsonPath}`);
