import os
import re
import json

base_dir = r"c:\Users\Admin\Downloads\logikchain\logikchain.com\work-management"
dep_html_path = os.path.join(base_dir, "dependency_graph.html")
arch_html_path = os.path.join(base_dir, "logikchain_architecture.html")

print("Enhancing dependency_graph.html and logikchain_architecture.html...")

# -------------------------------------------------------------
# 1. Update dependency_graph.html
# -------------------------------------------------------------
with open(dep_html_path, "r", encoding="utf-8") as f:
    dep_content = f.read()

# Ensure work_management_data.js script is included in head
if '<script src="work_management_data.js"></script>' not in dep_content:
    dep_content = dep_content.replace(
        '<head>',
        '<head>\n  <script src="work_management_data.js"></script>'
    )

# Add CSS for interactive status controls, sync toolbar, and diff modal if not present
status_css = """
    /* ─── STATUS PILLS & INTERACTIVE CONTROLS ───────────────── */
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-family: var(--font-mono);
    }
    .status-in_progress {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }
    .status-ready {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .status-done {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .status-planned {
      background: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }
    .status-blocked {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }

    .status-select {
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid var(--surface-border);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      font-family: var(--font-mono);
      cursor: pointer;
      outline: none;
      transition: all 0.2s;
    }
    .status-select:hover, .status-select:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }

    /* Floating Sync / Fact of Truth Toolbar */
    #sync-toolbar {
      position: absolute;
      top: 76px;
      right: 24px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(56, 189, 248, 0.3);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      padding: 6px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 95;
      font-size: 11px;
    }
    .sync-stat {
      display: flex;
      align-items: center;
      gap: 5px;
      color: var(--text-muted);
    }
    .sync-stat strong {
      color: #fff;
    }
    .sync-btn {
      background: var(--surface-elevated);
      border: 1px solid var(--surface-border);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .sync-btn:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .sync-btn.primary {
      background: #0284c7;
      border-color: #38bdf8;
      color: #fff;
    }
    .sync-badge-changed {
      background: #ef4444;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 6px;
      border-radius: 10px;
      display: none;
    }

    /* Diff / Export Modal */
    #diff-modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 500;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    #diff-modal.active { display: flex; }
    .diff-box {
      background: var(--surface);
      border: 1px solid var(--surface-border);
      border-radius: 14px;
      max-width: 800px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8);
    }
    .diff-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--surface-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .diff-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
      font-family: var(--font-mono);
      font-size: 12px;
      background: #090d16;
      color: #e2e8f0;
      white-space: pre-wrap;
    }
    .diff-footer {
      padding: 14px 20px;
      border-top: 1px solid var(--surface-border);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* Detail drawer sub-lists */
    .story-group {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 10px;
      margin-top: 8px;
    }
    .story-group-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-faint);
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .story-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 4px 6px;
      border-radius: 4px;
      font-size: 11px;
      transition: background 0.15s;
    }
    .story-item-row:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    .story-id-tag {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 10.5px;
      color: var(--accent);
      min-width: 90px;
    }
    .deploy-cmd-box {
      background: #090d16;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 8px 10px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: #38bdf8;
      margin-top: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      overflow-x: auto;
    }
"""

if '/* ─── STATUS PILLS & INTERACTIVE CONTROLS ─── */' not in dep_content:
    dep_content = dep_content.replace(
        '</style>',
        status_css + '\n</style>'
    )

# Insert the Floating Sync Toolbar right after header
sync_toolbar_html = """
  <!-- FLOATING SYNC & FACT OF TRUTH TOOLBAR -->
  <div id="sync-toolbar">
    <div class="sync-stat">
      <span style="color:#22c55e;">●</span>
      <span>Fact of Truth: <strong style="color:#38bdf8;">work-management/*.md</strong></span>
    </div>
    <div style="width:1px; height:14px; background:rgba(255,255,255,0.15);"></div>
    <div class="sync-stat" id="syncStatsSummary">
      <span>Stories: <strong id="statTotalStories">419</strong></span>
      <span>Features: <strong id="statTotalFeats">41</strong></span>
    </div>
    <span class="sync-badge-changed" id="unsavedBadge">0 Edits</span>
    <button class="sync-btn" onclick="saveWorkState()" title="Save changes to browser localStorage">💾 Save State</button>
    <button class="sync-btn primary" onclick="showDiffModal()" title="View and copy markdown updates to paste into MD files">📋 Export MD Diff</button>
    <button class="sync-btn" onclick="resetWorkState()" title="Revert all browser edits to the MD file truth">🔄 Reset</button>
  </div>

  <!-- DIFF / EXPORT MODAL -->
  <div id="diff-modal">
    <div class="diff-box">
      <div class="diff-header">
        <h3 style="font-size:15px; font-weight:700; display:flex; align-items:center; gap:8px;">
          <span>📋 Markdown Updates (Fact of Truth Sync)</span>
        </h3>
        <button onclick="closeDiffModal()" style="background:none; border:none; color:#fff; font-size:18px; cursor:pointer;">✕</button>
      </div>
      <div class="diff-body" id="diffContent">
        <!-- Rendered diff -->
      </div>
      <div class="diff-footer">
        <button class="sync-btn" onclick="copyDiffToClipboard()">📋 Copy Diff to Clipboard</button>
        <button class="sync-btn" onclick="downloadWorkJson()">💾 Download JSON State</button>
        <button class="sync-btn primary" onclick="closeDiffModal()">Done</button>
      </div>
    </div>
  </div>
"""

if 'id="sync-toolbar"' not in dep_content:
    dep_content = dep_content.replace(
        '</header>',
        '</header>\n' + sync_toolbar_html
    )

with open(dep_html_path, "w", encoding="utf-8") as f:
    f.write(dep_content)

print("[OK] Updated dependency_graph.html markup and styles.")

# -------------------------------------------------------------
# 2. Update logikchain_architecture.html
# -------------------------------------------------------------
with open(arch_html_path, "r", encoding="utf-8") as f:
    arch_content = f.read()

# Ensure work_management_data.js script is included in head
if '<script src="work_management_data.js"></script>' not in arch_content:
    arch_content = arch_content.replace(
        '<head>',
        '<head>\n  <script src="work_management_data.js"></script>'
    )

# Add CSS for interactive status in architecture map
arch_status_css = """
    /* ─── WORK ITEM STATUS CONTROLS IN ARCHITECTURE MAP ─── */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }
    .status-in_progress { background: #e0f2fe; color: #0284c7; border: 1px solid #7dd3fc; }
    .status-ready { background: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
    .status-done { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
    .status-planned { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; }
    .status-blocked { background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }

    .node .node-status-pill {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 5;
    }

    .status-dropdown {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid rgba(0,0,0,0.15);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
      cursor: pointer;
      outline: none;
    }
    .status-dropdown:hover, .status-dropdown:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.2);
    }

    /* Top sync status badge in architecture map */
    .arch-sync-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 10px;
      background: #f1f5f9;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 500;
    }
    .arch-sync-btn {
      background: #ffffff;
      border: 1px solid rgba(0,0,0,0.15);
      color: #0f172a;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .arch-sync-btn:hover {
      border-color: #0284c7;
      color: #0284c7;
    }
"""

if '/* ─── WORK ITEM STATUS CONTROLS IN ARCHITECTURE MAP ─── */' not in arch_content:
    arch_content = arch_content.replace(
        '</style>',
        arch_status_css + '\n</style>'
    )

with open(arch_html_path, "w", encoding="utf-8") as f:
    f.write(arch_content)

print("[OK] Updated logikchain_architecture.html styles.")
