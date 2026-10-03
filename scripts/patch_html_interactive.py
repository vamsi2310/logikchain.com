import os

base_dir = r"c:\Users\Admin\Downloads\logikchain\logikchain.com\work-management"
dep_html_path = os.path.join(base_dir, "dependency_graph.html")
arch_html_path = os.path.join(base_dir, "logikchain_architecture.html")

print("Writing interactive status logic to dependency_graph.html...")

with open(dep_html_path, "r", encoding="utf-8") as f:
    dep_content = f.read()

# Replace EPICS_DATA and add interactive helper functions
old_script_start = """    // ─── DATA STORE ──────────────────────────────────────────────────────────
    const EPICS_DATA = ["""

new_script_logic = """    // ─── DATA STORE & FACT OF TRUTH SYNCHRONIZATION ─────────────────────────
    // Check if WorkManagementStore is loaded from work_management_data.js
    const store = window.WorkManagementStore;

    // Merge baseline architectural layout with live status registry
    const EPICS_LAYOUT = [
      { id: 'EPIC-10', tier: 0, color: '#64748b', colorRgb: '100, 116, 139', icon: '⚙️', x: 350, y: 80, w: 260, h: 220, prereqs: [], dependents: ['EPIC-01', 'EPIC-03', 'EPIC-02', 'EPIC-09'] },
      { id: 'EPIC-12', tier: 0, color: '#6366f1', colorRgb: '99, 102, 241', icon: '🛡️', x: 850, y: 80, w: 260, h: 220, prereqs: [], dependents: ['EPIC-01', 'EPIC-13', 'EPIC-03', 'EPIC-05'] },
      { id: 'EPIC-01', tier: 1, color: '#8b5cf6', colorRgb: '139, 92, 246', icon: '🪪', x: 400, y: 360, w: 260, h: 230, prereqs: ['EPIC-10', 'EPIC-12'], dependents: ['EPIC-13', 'EPIC-03', 'EPIC-08', 'EPIC-05', 'EPIC-02', 'EPIC-06', 'EPIC-11'] },
      { id: 'EPIC-13', tier: 1, color: '#25d366', colorRgb: '37, 211, 102', icon: '💬', x: 850, y: 360, w: 260, h: 230, prereqs: ['EPIC-12', 'EPIC-01'], dependents: ['EPIC-02'] },
      { id: 'EPIC-03', tier: 2, color: '#06b6d4', colorRgb: '6, 182, 212', icon: '🚚', x: 300, y: 650, w: 260, h: 220, prereqs: ['EPIC-10', 'EPIC-01', 'EPIC-12'], dependents: ['EPIC-04', 'EPIC-02', 'EPIC-07'] },
      { id: 'EPIC-04', tier: 2, color: '#0f766e', colorRgb: '15, 118, 110', icon: '📋', x: 800, y: 650, w: 260, h: 220, prereqs: ['EPIC-03'], dependents: ['EPIC-02'] },
      { id: 'EPIC-08', tier: 3, color: '#a855f7', colorRgb: '168, 85, 247', icon: '📊', x: 150, y: 940, w: 250, h: 220, prereqs: ['EPIC-01'], dependents: ['EPIC-02', 'EPIC-07', 'EPIC-09'] },
      { id: 'EPIC-05', tier: 3, color: '#ec4899', colorRgb: '236, 72, 153', icon: '💳', x: 550, y: 940, w: 260, h: 220, prereqs: ['EPIC-01', 'EPIC-11', 'EPIC-12'], dependents: ['FEAT-02.01', 'EPIC-09'] },
      { id: 'EPIC-02', tier: 3, color: '#f43f5e', colorRgb: '244, 63, 94', icon: '📦', x: 950, y: 940, w: 270, h: 230, prereqs: ['EPIC-01', 'EPIC-03', 'EPIC-04', 'EPIC-05', 'EPIC-08', 'EPIC-10', 'EPIC-13'], dependents: ['EPIC-07', 'EPIC-09'] },
      { id: 'EPIC-07', tier: 4, color: '#f59e0b', colorRgb: '245, 158, 11', icon: '💵', x: 350, y: 1240, w: 260, h: 220, prereqs: ['EPIC-02', 'EPIC-03', 'EPIC-08'], dependents: ['EPIC-06', 'EPIC-09'] },
      { id: 'EPIC-06', tier: 4, color: '#84cc16', colorRgb: '132, 204, 22', icon: '🏦', x: 800, y: 1240, w: 260, h: 220, prereqs: ['EPIC-01', 'EPIC-07'], dependents: ['EPIC-09'] },
      { id: 'EPIC-11', tier: 5, color: '#e11d48', colorRgb: '225, 29, 72', icon: '⚖️', x: 350, y: 1530, w: 260, h: 220, prereqs: ['EPIC-01', 'EPIC-05'], dependents: ['EPIC-05'] },
      { id: 'EPIC-09', tier: 5, color: '#059669', colorRgb: '5, 150, 105', icon: '📈', x: 800, y: 1530, w: 260, h: 220, prereqs: ['EPIC-02', 'EPIC-05', 'EPIC-06', 'EPIC-07', 'EPIC-08', 'EPIC-10'], dependents: [] }
    ];

    function buildLiveEpicsData() {
      const liveEpics = store ? store.getEpics() : [];
      return EPICS_LAYOUT.map(layout => {
        const live = liveEpics.find(e => e.id === layout.id) || {};
        return {
          ...layout,
          title: live.title || layout.id,
          status: live.status || 'READY',
          service: live.microservice ? live.microservice.split('/').pop() : layout.id.toLowerCase() + '-service',
          port: live.port || '4000',
          db: live.db || layout.id.toLowerCase() + '_db',
          desc: live.functionalArea || (live.title + ' microservice domain'),
          firestore: live.id === 'EPIC-01' ? '/UserProfiles/{uid}' : live.id === 'EPIC-02' ? '/Orders/{id}' : live.id === 'EPIC-10' ? '/Villages' : '/Mirror/' + layout.id,
          features: (live.features || []).map(f => ({
            code: f.id,
            name: f.title,
            status: f.status || 'READY',
            scope: f.scope,
            stories: f.stories || []
          }))
        };
      });
    }

    let EPICS_DATA = buildLiveEpicsData();"""

# Find where old_script_start is and where the array definition ends
start_idx = dep_content.find("const EPICS_DATA = [")
end_idx = dep_content.find("    // Build flattened EDGES list from prereqs/dependents")

if start_idx != -1 and end_idx != -1:
    dep_content = dep_content[:start_idx] + new_script_logic + "\n\n" + dep_content[end_idx:]
    print("[OK] Replaced EPICS_DATA with dynamic live store.")

# Update renderGraph to include status pill on node card
old_card_top = """          <div class="card-top">
            <span class="epic-badge">${epic.id}</span>
            <span class="tier-tag">Tier ${epic.tier}</span>
          </div>"""

new_card_top = """          <div class="card-top">
            <span class="epic-badge">${epic.id}</span>
            <span class="status-pill status-${(epic.status || 'ready').toLowerCase()}">${epic.status || 'READY'}</span>
            <span class="tier-tag">Tier ${epic.tier}</span>
          </div>"""

dep_content = dep_content.replace(old_card_top, new_card_top)

# Update selectEpic to render full interactive detail drawer
old_populate_detail = """      // Populate Detail Drawer
      document.getElementById('dp-badge').textContent = epic.id;
      document.getElementById('dp-badge').style.borderColor = epic.color;
      document.getElementById('dp-badge').style.color = epic.color;
      document.getElementById('dp-title').textContent = `${epic.icon} ${epic.title}`;
      document.getElementById('dp-sub').textContent = `${epic.service} · :${epic.port} · ${epic.db}`;
      document.getElementById('dp-desc').textContent = epic.desc;
      document.getElementById('dp-service').textContent = epic.service;
      document.getElementById('dp-port').textContent = epic.port;
      document.getElementById('dp-db').textContent = epic.db;
      document.getElementById('dp-firestore').textContent = epic.firestore;

      // Prereqs Tags
      const prereqsDiv = document.getElementById('dp-prereqs');
      prereqsDiv.innerHTML = epic.prereqs.length
        ? epic.prereqs.map(p => `<span class="dp-dep-tag prereq" onclick="selectEpic('${p}')">⬆️ ${p}</span>`).join('')
        : '<span style="color:var(--text-faint); font-size:12px;">None (Foundation Tier 0)</span>';

      // Dependents Tags
      const dependentsDiv = document.getElementById('dp-dependents');
      dependentsDiv.innerHTML = epic.dependents.length
        ? epic.dependents.map(d => `<span class="dp-dep-tag dependent" onclick="selectEpic('${d}')">⬇️ ${d}</span>`).join('')
        : '<span style="color:var(--text-faint); font-size:12px;">None (Terminal Governance Layer)</span>';

      // Features list
      const featsDiv = document.getElementById('dp-features');
      featsDiv.innerHTML = epic.features.map(f => `
        <div style="font-size:12px; padding:6px 10px; background:rgba(255,255,255,0.03); border-radius:6px; display:flex; align-items:center; gap:8px;">
          <span style="font-family:var(--font-mono); font-size:11px; color:var(--accent); font-weight:700;">${f.code}</span>
          <span style="color:var(--text-main); font-weight:600;">${f.name}</span>
        </div>
      `).join('');

      document.getElementById('detail-panel').classList.add('open');"""

new_populate_detail = """      // Populate Detail Drawer with Interactive Status Dropdowns
      document.getElementById('dp-badge').textContent = epic.id;
      document.getElementById('dp-badge').style.borderColor = epic.color;
      document.getElementById('dp-badge').style.color = epic.color;
      
      const titleContainer = document.getElementById('dp-title');
      titleContainer.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:4px;">
          <span>${epic.icon} ${epic.title}</span>
          <select class="status-select" onchange="changeEpicStatus('${epic.id}', this.value)" title="Change Epic Status">
            <option value="READY" ${epic.status === 'READY' ? 'selected' : ''}>READY</option>
            <option value="IN_PROGRESS" ${epic.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
            <option value="DONE" ${epic.status === 'DONE' ? 'selected' : ''}>DONE</option>
            <option value="PLANNED" ${epic.status === 'PLANNED' ? 'selected' : ''}>PLANNED</option>
            <option value="BLOCKED" ${epic.status === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
          </select>
        </div>
      `;

      document.getElementById('dp-sub').textContent = `${epic.service} · Port :${epic.port} · DB: ${epic.db}`;
      document.getElementById('dp-desc').textContent = epic.desc;
      document.getElementById('dp-service').textContent = epic.service;
      document.getElementById('dp-port').textContent = epic.port;
      document.getElementById('dp-db').textContent = epic.db;
      document.getElementById('dp-firestore').textContent = epic.firestore;

      // Prereqs Tags
      const prereqsDiv = document.getElementById('dp-prereqs');
      prereqsDiv.innerHTML = epic.prereqs.length
        ? epic.prereqs.map(p => `<span class="dp-dep-tag prereq" onclick="selectEpic('${p}')">⬆️ ${p}</span>`).join('')
        : '<span style="color:var(--text-faint); font-size:12px;">None (Foundation Tier 0)</span>';

      // Dependents Tags
      const dependentsDiv = document.getElementById('dp-dependents');
      dependentsDiv.innerHTML = epic.dependents.length
        ? epic.dependents.map(d => `<span class="dp-dep-tag dependent" onclick="selectEpic('${d}')">⬇️ ${d}</span>`).join('')
        : '<span style="color:var(--text-faint); font-size:12px;">None (Terminal Governance Layer)</span>';

      // Features list with Multi-Client Stories and Status Selectors
      const featsDiv = document.getElementById('dp-features');
      featsDiv.innerHTML = epic.features.map(f => {
        const stories = f.stories || [];
        const clientStories = stories.filter(s => s.type === 'pwa' || s.type === 'android' || s.type === 'ios');
        const pwaTestStories = stories.filter(s => s.type === 'pwa_test');
        const userJourneys = stories.filter(s => s.type === 'user_journey');
        const integrations = stories.filter(s => s.type === 'integration');
        const supportStories = stories.filter(s => s.type === 'devops' || s.type === 'documentation' || s.type === 'automation_test');

        return `
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px;">
              <div>
                <span style="font-family:var(--font-mono); font-size:11.5px; color:var(--accent); font-weight:800;">${f.code}</span>
                <span style="font-size:13px; font-weight:700; color:#fff; margin-left:6px;">${f.name}</span>
              </div>
              <select class="status-select" onchange="changeFeatureStatus('${f.code}', this.value)">
                <option value="READY" ${f.status === 'READY' ? 'selected' : ''}>READY</option>
                <option value="IN_PROGRESS" ${f.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                <option value="DONE" ${f.status === 'DONE' ? 'selected' : ''}>DONE</option>
                <option value="PLANNED" ${f.status === 'PLANNED' ? 'selected' : ''}>PLANNED</option>
                <option value="BLOCKED" ${f.status === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
              </select>
            </div>
            ${f.scope ? `<p style="font-size:11.5px; color:var(--text-muted); margin-bottom:8px; line-height:1.4;">${f.scope}</p>` : ''}
            
            <!-- Multi-Client Implementation Stories -->
            <div class="story-group">
              <div class="story-group-title">
                <span>📱 Multi-Client Implementation Stories</span>
                <span style="color:#38bdf8;">PWA · Android · iOS</span>
              </div>
              ${clientStories.map(s => `
                <div class="story-item-row">
                  <span class="story-id-tag">${s.id}</span>
                  <span style="flex:1; color:#cbd5e1; font-size:11px;">${s.title}</span>
                  <select class="status-select" onchange="changeStoryStatus('${s.id}', this.value)" style="font-size:9.5px; padding:1px 5px;">
                    <option value="READY" ${s.status === 'READY' ? 'selected' : ''}>READY</option>
                    <option value="IN_PROGRESS" ${s.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                    <option value="DONE" ${s.status === 'DONE' ? 'selected' : ''}>DONE</option>
                  </select>
                </div>
              `).join('')}
            </div>

            <!-- PWA Cloud Test Story -->
            ${pwaTestStories.length ? `
            <div class="story-group" style="border-left: 3px solid #22c55e;">
              <div class="story-group-title">
                <span>🧪 Live PWA Cloud Testing (Test Project)</span>
                <span style="color:#22c55e;">logikchain-test</span>
              </div>
              ${pwaTestStories.map(s => `
                <div class="story-item-row">
                  <span class="story-id-tag" style="color:#22c55e;">${s.id}</span>
                  <span style="flex:1; color:#cbd5e1; font-size:11px;">${s.description}</span>
                  <select class="status-select" onchange="changeStoryStatus('${s.id}', this.value)" style="font-size:9.5px; padding:1px 5px;">
                    <option value="READY" ${s.status === 'READY' ? 'selected' : ''}>READY</option>
                    <option value="IN_PROGRESS" ${s.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                    <option value="DONE" ${s.status === 'DONE' ? 'selected' : ''}>DONE</option>
                  </select>
                </div>
              `).join('')}
            </div>` : ''}

            <!-- Deploy & Test Commands -->
            <div style="margin-top:8px;">
              <div style="font-size:10.5px; font-weight:700; color:var(--text-faint); text-transform:uppercase;">Cloud Verification Commands</div>
              <div class="deploy-cmd-box">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">gcloud run deploy ${epic.service} --project=logikchain-test --region=asia-south1</span>
                <button class="sync-btn" onclick="copyText('gcloud run deploy ${epic.service} --project=logikchain-test --region=asia-south1')" style="padding:2px 6px; font-size:10px;">📋</button>
              </div>
              <div class="deploy-cmd-box">
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">firebase deploy --project test --only hosting</span>
                <button class="sync-btn" onclick="copyText('firebase deploy --project test --only hosting')" style="padding:2px 6px; font-size:10px;">📋</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      document.getElementById('detail-panel').classList.add('open');"""

dep_content = dep_content.replace(old_populate_detail, new_populate_detail)

# Add interactive status functions and matrix rendering
interactive_helpers = """
    // ─── WORK MANAGEMENT INTERACTIVE STATE MUTATIONS ─────────────────────────
    function changeEpicStatus(epicId, newStatus) {
      if (store) {
        store.updateEpicStatus(epicId, newStatus);
      }
      refreshStateFromStore();
    }

    function changeFeatureStatus(featId, newStatus) {
      if (store) {
        store.updateFeatureStatus(featId, newStatus);
      }
      refreshStateFromStore();
    }

    function changeStoryStatus(storyId, newStatus) {
      if (store) {
        store.updateStoryStatus(storyId, newStatus);
      }
      refreshStateFromStore();
    }

    function refreshStateFromStore() {
      EPICS_DATA = buildLiveEpicsData();
      renderGraph();
      if (selectedEpicId) {
        selectEpic(selectedEpicId);
      }
      renderMatrixTable();
      updateSyncToolbar();
    }

    function updateSyncToolbar() {
      if (!store) return;
      const stats = store.getStats();
      const stEl = document.getElementById('statTotalStories');
      if (stEl) stEl.textContent = stats.totalStories;
      const ftEl = document.getElementById('statTotalFeats');
      if (ftEl) ftEl.textContent = stats.totalFeatures;

      const badge = document.getElementById('unsavedBadge');
      if (badge) {
        const diffs = store.exportMarkdownDiff();
        if (diffs.length > 0) {
          badge.style.display = 'inline-block';
          badge.textContent = `${diffs.length} Edits`;
        } else {
          badge.style.display = 'none';
        }
      }
    }

    function saveWorkState() {
      if (store) {
        store.saveState();
        alert('Work management status saved to browser localStorage!');
        updateSyncToolbar();
      }
    }

    function resetWorkState() {
      if (confirm('Revert all status changes back to the Markdown Fact of Truth?')) {
        if (store) store.resetToBaseline();
        refreshStateFromStore();
      }
    }

    function showDiffModal() {
      const modal = document.getElementById('diff-modal');
      const diffContainer = document.getElementById('diffContent');
      if (!store || !modal || !diffContainer) return;

      const diffs = store.exportMarkdownDiff();
      if (diffs.length === 0) {
        diffContainer.textContent = 'Zero modifications detected. The UI is 100% in sync with the Markdown Fact of Truth files (work-management/*.md).';
      } else {
        let text = '# Work Management Status Updates to Apply to Markdown Files\\n\\n';
        diffs.forEach(d => {
          text += `[${d.file}] ${d.type.toUpperCase()}: ${d.id} -> Changed from [${d.oldStatus}] to [${d.newStatus}]\\n`;
        });
        diffContainer.textContent = text;
      }
      modal.classList.add('active');
    }

    function closeDiffModal() {
      const modal = document.getElementById('diff-modal');
      if (modal) modal.classList.remove('active');
    }

    function copyDiffToClipboard() {
      const diffContainer = document.getElementById('diffContent');
      if (diffContainer) {
        navigator.clipboard.writeText(diffContainer.textContent);
        alert('Copied status updates to clipboard!');
      }
    }

    function downloadWorkJson() {
      if (!store) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.getEpics(), null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "work_management_status.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    function copyText(str) {
      navigator.clipboard.writeText(str);
      alert('Copied to clipboard: ' + str);
    }
"""

if "function changeEpicStatus" not in dep_content:
    dep_content = dep_content.replace(
        "    // ─── MATRIX TABLE GENERATOR ──────────────────────────────────────────────",
        interactive_helpers + "\n    // ─── MATRIX TABLE GENERATOR ──────────────────────────────────────────────"
    )

# Enhance renderMatrixTable to render dynamically from store with status selects
old_render_matrix = """    function renderMatrixTable() {
      const tbody = document.getElementById('matrixTbody');
      tbody.innerHTML = MATRIX_DATA.map(m => `
        <tr>
          <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent);">${m.id}</td>
          <td style="font-weight:600;">${m.name}</td>
          <td><span class="pill">${m.svc}</span></td>
          <td style="color:var(--text-muted);">${m.prereqs}</td>
          <td style="color:#38bdf8;">${m.consumers}</td>
        </tr>
      `).join('');
    }"""

new_render_matrix = """    function renderMatrixTable(statusFilter = 'ALL') {
      const tbody = document.getElementById('matrixTbody');
      if (!tbody) return;

      const rows = [];
      EPICS_DATA.forEach(epic => {
        epic.features.forEach(f => {
          if (statusFilter !== 'ALL' && f.status !== statusFilter) return;

          const clientScope = f.stories.some(s => s.type === 'pwa' || s.type === 'android')
            ? '<span class="status-pill status-done">PWA · AND · IOS</span>'
            : '<span class="status-pill status-ready">Specs Ready</span>';

          const matchingMatrix = (typeof MATRIX_DATA !== 'undefined' ? MATRIX_DATA.find(m => m.id === f.code) : null) || {};

          rows.push(`
            <tr>
              <td style="font-family:var(--font-mono); font-weight:700; color:var(--accent);">${f.code}</td>
              <td style="font-weight:600;">
                <div>${f.name}</div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Epic: ${epic.id}</div>
              </td>
              <td><span class="pill">${epic.service}</span></td>
              <td>
                <select class="status-select" onchange="changeFeatureStatus('${f.code}', this.value)">
                  <option value="READY" ${f.status === 'READY' ? 'selected' : ''}>READY</option>
                  <option value="IN_PROGRESS" ${f.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                  <option value="DONE" ${f.status === 'DONE' ? 'selected' : ''}>DONE</option>
                  <option value="PLANNED" ${f.status === 'PLANNED' ? 'selected' : ''}>PLANNED</option>
                  <option value="BLOCKED" ${f.status === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
                </select>
              </td>
              <td>${clientScope}</td>
              <td style="color:var(--text-muted); font-size:11px;">${matchingMatrix.prereqs || 'Architecture approved'}</td>
              <td style="color:#38bdf8; font-size:11px;">${matchingMatrix.consumers || 'Downstream microservices & clients'}</td>
            </tr>
          `);
        });
      });

      tbody.innerHTML = rows.join('');
    }"""

dep_content = dep_content.replace(old_render_matrix, new_render_matrix)

# Update matrix table header in HTML
old_table_headers = """          <tr>
            <th>Feature ID</th>
            <th>Feature Name</th>
            <th>Bound Microservice</th>
            <th>Hard Pre-requisites</th>
            <th>Downstream Consumers</th>
          </tr>"""

new_table_headers = """          <tr>
            <th>Feature ID</th>
            <th>Feature Name</th>
            <th>Bound Microservice</th>
            <th>Status</th>
            <th>Multi-Client Scope</th>
            <th>Hard Pre-requisites</th>
            <th>Downstream Consumers</th>
          </tr>"""

dep_content = dep_content.replace(old_table_headers, new_table_headers)

# Update matrix overlay controls to add status filter dropdown
old_matrix_header = """      <h2 style="font-size:24px; font-weight:800; margin-bottom:8px;">Comprehensive Feature Dependency Matrix</h2>
      <p style="color:var(--text-muted); font-size:14px;">Detailed technical dependency and consumer mapping across all 35+ platform features.</p>
    </div>"""

new_matrix_header = """      <h2 style="font-size:24px; font-weight:800; margin-bottom:8px;">Comprehensive Feature Dependency Matrix</h2>
      <p style="color:var(--text-muted); font-size:14px;">Detailed technical dependency and consumer mapping across all 41 platform features.</p>
      <div style="margin-top:14px; display:flex; align-items:center; justify-content:center; gap:12px;">
        <span style="font-size:12px; color:var(--text-muted);">Filter by Status:</span>
        <select class="status-select" onchange="renderMatrixTable(this.value)" style="padding:4px 12px; font-size:12px;">
          <option value="ALL">Show All Statuses</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="READY">READY</option>
          <option value="DONE">DONE</option>
          <option value="PLANNED">PLANNED</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
      </div>
    </div>"""

dep_content = dep_content.replace(old_matrix_header, new_matrix_header)

# In init call, update toolbar
dep_content = dep_content.replace(
    "    renderHappyPathStoryboard();\n  </script>",
    "    renderHappyPathStoryboard();\n    updateSyncToolbar();\n  </script>"
)

with open(dep_html_path, "w", encoding="utf-8") as f:
    f.write(dep_content)

print("[OK] Finished patching dependency_graph.html with interactive Fact-of-Truth status management.")
