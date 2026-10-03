import os

base_dir = r"c:\Users\Admin\Downloads\logikchain\logikchain.com\work-management"
arch_html_path = os.path.join(base_dir, "logikchain_architecture.html")

print("Writing interactive status logic to logikchain_architecture.html...")

with open(arch_html_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add mapping and interactive node status badges
node_render_old = """  el.innerHTML = `
    <div class="node-header">
      <div class="node-icon" style="background:${n.color}22;color:${n.color}">${n.icon}</div>
      <div>
        <div class="node-title" style="color:${n.color}">${n.title}</div>"""

node_render_new = """  const NODE_TO_EPIC = {
    'identity': 'EPIC-01',
    'orders': 'EPIC-02',
    'gigs': 'EPIC-03',
    'pamphlet': 'EPIC-04',
    'payments': 'EPIC-05',
    'payouts': 'EPIC-06',
    'cash': 'EPIC-07',
    'credit': 'EPIC-08',
    'finance': 'EPIC-09',
    'config': 'EPIC-10',
    'governance': 'EPIC-11',
    'api-gateway': 'EPIC-12',
    'social-connect': 'EPIC-13'
  };

  const store = window.WorkManagementStore;
  const linkedEpicId = NODE_TO_EPIC[n.id];
  const linkedEpic = linkedEpicId && store ? store.getEpic(linkedEpicId) : null;
  const currentStatus = linkedEpic ? linkedEpic.status : (n.layer === 'client' ? 'IN_PROGRESS' : 'READY');

  el.innerHTML = `
    <div class="node-status-pill">
      <span class="status-badge status-${currentStatus.toLowerCase()}">${currentStatus}</span>
    </div>
    <div class="node-header">
      <div class="node-icon" style="background:${n.color}22;color:${n.color}">${n.icon}</div>
      <div>
        <div class="node-title" style="color:${n.color}">${n.title}</div>"""

content = content.replace(node_render_old, node_render_new)

# 2. Add header sync toolbar in logikchain_architecture.html
old_header_sep = '<div class="sep"></div>'
new_header_sep = """<div class="sep"></div>
  <div class="arch-sync-bar">
    <span style="color:#16a34a; font-size:12px;">●</span>
    <span>Fact of Truth: <strong style="color:#0284c7;">work-management/*.md</strong></span>
    <button class="arch-sync-btn" onclick="saveArchState()" title="Save changes to browser localStorage">💾 Save</button>
    <button class="arch-sync-btn" onclick="exportArchDiff()" title="Export Markdown updates">📋 Export Diff</button>
    <button class="arch-sync-btn" onclick="resetArchState()" title="Reset to Markdown truth">🔄 Reset</button>
  </div>"""

content = content.replace(old_header_sep, new_header_sep, 1)

# 3. Enhance openDetail in logikchain_architecture.html
old_open_detail = """function openDetail(n) {
  document.getElementById('detail-title').textContent = n.title;
  const body = document.getElementById('detail-body');
  const mLabel = { call:'CALL', webhook:'WH', task:'TASK', sched:'SCHED', entry:'ENTRY', auth:'AUTH', db:'DB', push:'PUSH', storage:'FS', gcp:'GCP' };
  const mCls   = { call:'m-call', webhook:'m-post', task:'m-post', sched:'m-sched', entry:'m-get', auth:'m-get', db:'m-get', push:'m-get', storage:'m-get', gcp:'m-get' };

  const connNames = { 
    'firebase-core':'Firebase Core',
    'api-gateway':'API Gateway',
    'identity':'Identity',
    'orders':'Orders',
    'gigs':'Gigs',
    'pamphlet':'Pamphlet',
    'payments':'Payments',
    'payouts':'Payouts',
    'cash':'Cash / Custody',
    'credit':'Credit',
    'finance':'Finance',
    'config':'Config',
    'gcp-services':'GCP Services',
    'pwa':'PWA',
    'android':'Android',
    'ios':'iOS',
    'governance':'Governance',
    'social-connect':'Social & Interaction'
  };

  body.innerHTML = `
    <div class="detail-section">
      <h4>Description</h4>
      <p style="font-size:12px;line-height:1.6;color:var(--muted)">${n.desc}</p>
    </div>
    <div class="detail-section">
      <h4>Functions / Exports (${n.fns.length})</h4>
      ${n.fns.map(f=>`<div class="detail-fn"><span class="method ${mCls[f.m]||'m-call'}">${mLabel[f.m]||f.m.toUpperCase()}</span><code>${f.name}</code></div>`).join('')}
    </div>
    <div class="detail-section">
      <h4>Connections (${n.connects.length})</h4>
      ${n.connects.map(c=>`<div class="conn-item" onclick="selectNode('${c}')" style="cursor:pointer" title="Click to view ${connNames[c]||c}"><div class="conn-dot" style="background:${(nodeMap[c]||{color:'#94a3b8'}).color}"></div>${connNames[c]||c}</div>`).join('')}
    </div>
    <div class="detail-section">
      <h4>Notable Constraints</h4>
      ${n.tags.map(t=>`<div class="conn-item" style="color:var(--text);font-size:11px">· ${t}</div>`).join('')}
    </div>
  `;
  detail.classList.add('open');
}"""

new_open_detail = """function openDetail(n) {
  const store = window.WorkManagementStore;
  const NODE_TO_EPIC = {
    'identity': 'EPIC-01',
    'orders': 'EPIC-02',
    'gigs': 'EPIC-03',
    'pamphlet': 'EPIC-04',
    'payments': 'EPIC-05',
    'payouts': 'EPIC-06',
    'cash': 'EPIC-07',
    'credit': 'EPIC-08',
    'finance': 'EPIC-09',
    'config': 'EPIC-10',
    'governance': 'EPIC-11',
    'api-gateway': 'EPIC-12',
    'social-connect': 'EPIC-13'
  };

  const epicId = NODE_TO_EPIC[n.id];
  const epic = epicId && store ? store.getEpic(epicId) : null;

  document.getElementById('detail-title').textContent = n.title + (epic ? ` (${epic.id})` : '');
  const body = document.getElementById('detail-body');
  const mLabel = { call:'CALL', webhook:'WH', task:'TASK', sched:'SCHED', entry:'ENTRY', auth:'AUTH', db:'DB', push:'PUSH', storage:'FS', gcp:'GCP' };
  const mCls   = { call:'m-call', webhook:'m-post', task:'m-post', sched:'m-sched', entry:'m-get', auth:'m-get', db:'m-get', push:'m-get', storage:'m-get', gcp:'m-get' };

  const connNames = { 
    'firebase-core':'Firebase Core',
    'api-gateway':'API Gateway',
    'identity':'Identity',
    'orders':'Orders',
    'gigs':'Gigs',
    'pamphlet':'Pamphlet',
    'payments':'Payments',
    'payouts':'Payouts',
    'cash':'Cash / Custody',
    'credit':'Credit',
    'finance':'Finance',
    'config':'Config',
    'gcp-services':'GCP Services',
    'pwa':'PWA',
    'android':'Android',
    'ios':'iOS',
    'governance':'Governance',
    'social-connect':'Social & Interaction'
  };

  let workItemSection = '';
  if (epic) {
    workItemSection = `
      <div class="detail-section" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">
          <h4 style="margin:0; font-size:12px; color:#0f172a;">Epic Status (${epic.id})</h4>
          <select class="status-dropdown" onchange="updateArchEpicStatus('${epic.id}', this.value)">
            <option value="READY" ${epic.status === 'READY' ? 'selected' : ''}>READY</option>
            <option value="IN_PROGRESS" ${epic.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
            <option value="DONE" ${epic.status === 'DONE' ? 'selected' : ''}>DONE</option>
            <option value="PLANNED" ${epic.status === 'PLANNED' ? 'selected' : ''}>PLANNED</option>
            <option value="BLOCKED" ${epic.status === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
          </select>
        </div>
        <div style="font-size:11px; color:#64748b; margin-bottom:10px;">
          Fact of truth: <code>work-management/${epic.mdFile}</code>
        </div>
        
        <h5 style="font-size:11px; text-transform:uppercase; color:#475569; margin-bottom:6px;">Constituent Features (${epic.features.length})</h5>
        ${epic.features.map(f => {
          const clientStories = (f.stories || []).filter(s => s.type === 'pwa' || s.type === 'android' || s.type === 'ios');
          const pwaTest = (f.stories || []).find(s => s.type === 'pwa_test');

          return `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:8px; margin-bottom:8px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#0284c7; font-size:11px;">${f.id}</span>
                <select class="status-dropdown" style="font-size:10px; padding:2px 6px;" onchange="updateArchFeatureStatus('${f.id}', this.value)">
                  <option value="READY" ${f.status === 'READY' ? 'selected' : ''}>READY</option>
                  <option value="IN_PROGRESS" ${f.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
                  <option value="DONE" ${f.status === 'DONE' ? 'selected' : ''}>DONE</option>
                </select>
              </div>
              <div style="font-size:11px; font-weight:600; color:#0f172a; margin-top:2px;">${f.title}</div>
              
              <div style="display:flex; gap:4px; flex-wrap:wrap; margin-top:6px;">
                ${clientStories.map(s => `<span class="status-badge status-${s.status.toLowerCase()}" style="font-size:9px;">${s.id.split('-')[0]}: ${s.status}</span>`).join('')}
                ${pwaTest ? `<span class="status-badge status-${pwaTest.status.toLowerCase()}" style="font-size:9px; border-color:#86efac;">TEST-PWA: ${pwaTest.status}</span>` : ''}
              </div>
            </div>
          `;
        }).join('')}

        <!-- Cloud Deploy Command -->
        <div style="margin-top:10px; padding-top:8px; border-top:1px dashed #cbd5e1;">
          <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Cloud Run Deploy Command</div>
          <div style="background:#0f172a; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-size:10px; padding:6px 8px; border-radius:5px; margin-top:4px; word-break:break-all;">
            gcloud run deploy ${epic.microservice.split('/').pop()} --project=logikchain-test --region=asia-south1
          </div>
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    ${workItemSection}
    <div class="detail-section">
      <h4>Description</h4>
      <p style="font-size:12px;line-height:1.6;color:var(--muted)">${n.desc}</p>
    </div>
    <div class="detail-section">
      <h4>Functions / Exports (${n.fns.length})</h4>
      ${n.fns.map(f=>`<div class="detail-fn"><span class="method ${mCls[f.m]||'m-call'}">${mLabel[f.m]||f.m.toUpperCase()}</span><code>${f.name}</code></div>`).join('')}
    </div>
    <div class="detail-section">
      <h4>Connections (${n.connects.length})</h4>
      ${n.connects.map(c=>`<div class="conn-item" onclick="selectNode('${c}')" style="cursor:pointer" title="Click to view ${connNames[c]||c}"><div class="conn-dot" style="background:${(nodeMap[c]||{color:'#94a3b8'}).color}"></div>${connNames[c]||c}</div>`).join('')}
    </div>
    <div class="detail-section">
      <h4>Notable Constraints</h4>
      ${n.tags.map(t=>`<div class="conn-item" style="color:var(--text);font-size:11px">· ${t}</div>`).join('')}
    </div>
  `;
  detail.classList.add('open');
}

function updateArchEpicStatus(epicId, newStatus) {
  if (window.WorkManagementStore) {
    window.WorkManagementStore.updateEpicStatus(epicId, newStatus);
    updateArchNodeBadges();
  }
}

function updateArchFeatureStatus(featId, newStatus) {
  if (window.WorkManagementStore) {
    window.WorkManagementStore.updateFeatureStatus(featId, newStatus);
    updateArchNodeBadges();
  }
}

function updateArchNodeBadges() {
  const store = window.WorkManagementStore;
  if (!store) return;
  const NODE_TO_EPIC = {
    'identity': 'EPIC-01',
    'orders': 'EPIC-02',
    'gigs': 'EPIC-03',
    'pamphlet': 'EPIC-04',
    'payments': 'EPIC-05',
    'payouts': 'EPIC-06',
    'cash': 'EPIC-07',
    'credit': 'EPIC-08',
    'finance': 'EPIC-09',
    'config': 'EPIC-10',
    'governance': 'EPIC-11',
    'api-gateway': 'EPIC-12',
    'social-connect': 'EPIC-13'
  };

  Object.entries(NODE_TO_EPIC).forEach(([nodeId, epicId]) => {
    const epic = store.getEpic(epicId);
    if (!epic) return;
    const nodeEl = document.getElementById('node-' + nodeId);
    if (nodeEl) {
      const badge = nodeEl.querySelector('.node-status-pill .status-badge');
      if (badge) {
        badge.className = `status-badge status-${epic.status.toLowerCase()}`;
        badge.textContent = epic.status;
      }
    }
  });
}

function saveArchState() {
  if (window.WorkManagementStore) {
    window.WorkManagementStore.saveState();
    alert('Architecture work status saved to browser storage!');
  }
}

function resetArchState() {
  if (confirm('Reset architecture statuses to Markdown Fact of Truth?')) {
    if (window.WorkManagementStore) {
      window.WorkManagementStore.resetToBaseline();
      updateArchNodeBadges();
      alert('Reset to Markdown baseline truth.');
    }
  }
}

function exportArchDiff() {
  if (!window.WorkManagementStore) return;
  const diffs = window.WorkManagementStore.exportMarkdownDiff();
  if (diffs.length === 0) {
    alert('Zero modifications. Architecture map is in 100% sync with Markdown Fact of Truth files.');
  } else {
    let msg = 'Work Management Status Updates to Apply to MD Files:\\n\\n';
    diffs.forEach(d => {
      msg += `[${d.file}] ${d.id}: ${d.oldStatus} -> ${d.newStatus}\\n`;
    });
    navigator.clipboard.writeText(msg);
    alert('Copied ' + diffs.length + ' status updates to clipboard!\\n\\n' + msg);
  }
}"""

content = content.replace(old_open_detail, new_open_detail)

with open(arch_html_path, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] Finished patching logikchain_architecture.html with interactive Fact-of-Truth status management.")
