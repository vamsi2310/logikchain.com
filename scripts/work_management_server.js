const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3005;
const HOST = '127.0.0.1';
const WORK_DIR = path.join(__dirname, '..', 'work-management');

function setCorsHeaders(req, res) {
  const origin = req.headers && req.headers.origin ? req.headers.origin : '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function updateMarkdownFiles(epics) {
  const updatedFiles = [];

  epics.forEach(epic => {
    if (!epic.mdFile) return;
    const filePath = path.join(WORK_DIR, epic.mdFile);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n');

    let currentFeatId = null;
    let modified = false;

    // Map for fast feature and story lookup
    const featMap = new Map();
    if (epic.features) {
      epic.features.forEach(f => featMap.set(f.id, f));
    }

    const storyMap = new Map();
    if (epic.features) {
      epic.features.forEach(f => {
        if (f.stories) {
          f.stories.forEach(s => storyMap.set(s.id, s));
        }
      });
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Update Epic Status
      if (line.trim().startsWith('- **Epic Status**:') && epic.status) {
        const newLine = `- **Epic Status**: [${epic.status}]`;
        if (lines[i] !== newLine) {
          lines[i] = newLine;
          modified = true;
        }
        continue;
      }

      // Track current feature
      const featMatch = line.match(/^##\s+(FEAT-\d+\.\d+):/);
      if (featMatch) {
        currentFeatId = featMatch[1];
        continue;
      }

      // Update Feature Status
      if (line.trim().startsWith('- **Feature Status**:') && currentFeatId) {
        const feat = featMap.get(currentFeatId);
        if (feat && feat.status) {
          const newLine = `- **Feature Status**: [${feat.status}]`;
          if (lines[i] !== newLine) {
            lines[i] = newLine;
            modified = true;
          }
        }
        continue;
      }

      // Update Story Status: line starting with - **STORY_ID [STATUS]
      const storyMatch = line.match(/^(\s*-\s+\*\*)([A-Z]+-\d+\.\d+(?:\.[A-Z0-9]+)?)\s*\[[A-Z_]+\](.*)/);
      if (storyMatch) {
        const prefix = storyMatch[1];
        const storyId = storyMatch[2];
        const rest = storyMatch[3];
        const story = storyMap.get(storyId);
        if (story && story.status) {
          const newLine = `${prefix}${storyId} [${story.status}]${rest}`;
          if (lines[i] !== newLine) {
            lines[i] = newLine;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
      updatedFiles.push(epic.mdFile);
    }
  });

  // Also update work_management_data.json
  const jsonPath = path.join(WORK_DIR, 'work_management_data.json');
  fs.writeFileSync(jsonPath, JSON.stringify(epics, null, 2), 'utf8');
  updatedFiles.push('work_management_data.json');

  // Trigger sync script as fresh process to regenerate work_management_data.js cleanly
  try {
    const syncScript = path.join(__dirname, 'sync_work_management.js');
    execSync(`node "${syncScript}"`, { stdio: 'pipe' });
    updatedFiles.push('work_management_data.js');
  } catch (e) {
    console.error('Error running sync script:', e);
  }

  return updatedFiles;
}

const server = http.createServer((req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  // API Status
  if (url.pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, server: 'Logikchain Work Management Sync Server', port: PORT }));
    return;
  }

  // API Save
  if (url.pathname === '/api/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const epics = payload.epics || payload;
        if (!Array.isArray(epics)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Expected epics array' }));
          return;
        }

        const updatedFiles = updateMarkdownFiles(epics);
        console.log(`[Sync Server] Saved! Updated ${updatedFiles.length} files:`, updatedFiles);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          savedToDisk: true,
          updatedFiles: updatedFiles,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('[Sync Server] Error processing save:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Static File Serving from work-management/
  let filePath = path.join(WORK_DIR, url.pathname === '/' ? 'dependency_graph.html' : url.pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.md': 'text/markdown; charset=utf-8',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`[Work Management Server] Listening on http://${HOST}:${PORT}`);
  console.log(`[Work Management Server] Serving work-management files with live Fact of Truth write-back`);
});
