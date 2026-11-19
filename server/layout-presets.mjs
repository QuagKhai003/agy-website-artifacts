/**
 * agy-website-artifacts: Task-Adaptive Responsive Layout Presets
 * Follows Apple HIG Minimalist Monochromatic Glassmorphism & Anti-AI-Slop Guidelines:
 * - Zero eyebrow/kicker labels, zero redundant subtitle fluff, zero emoji icons
 * - Max 1 surface layer: inset grouped surfaces with 1px hairline dividers (no card-in-card)
 * - Calm neutral graphite monochrome palette (#0b0b0d canvas, #f5f5f7 / #a1a1a6 / #6e6e73 inks)
 */

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BASE_CSS = `
  :root {
    --canvas: #0b0b0d;
    --surface: rgba(255, 255, 255, 0.045);
    --surface-hover: rgba(255, 255, 255, 0.075);
    --surface-press: rgba(255, 255, 255, 0.11);
    --surface-well: rgba(0, 0, 0, 0.28);
    --nav-glass: rgba(11, 11, 13, 0.76);
    --border: rgba(255, 255, 255, 0.095);
    --hairline: rgba(255, 255, 255, 0.075);
    --highlight: rgba(255, 255, 255, 0.06);
    --ink-1: #f5f5f7;
    --ink-2: #a1a1a6;
    --ink-3: #6e6e73;
    --action-bg: #f5f5f7;
    --action-ink: #0b0b0d;
    --danger: #f87171;
    --radius-lg: 14px;
    --radius-md: 10px;
    --radius-sm: 8px;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    min-height: 100dvh;
    background: var(--canvas);
    color: var(--ink-1);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .nav {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--nav-glass);
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border-bottom: 1px solid var(--hairline);
  }
  .nav-inner {
    max-width: 1080px;
    margin: 0 auto;
    padding: 12px 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .nav h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--ink-1);
  }
  .nav-meta {
    font-size: 13px;
    color: var(--ink-2);
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
  }
  .wrap {
    max-width: 1080px;
    margin: 0 auto;
    padding: 20px 16px 64px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .seg {
    display: inline-flex;
    align-items: center;
    padding: 3px;
    border-radius: var(--radius-md);
    background: var(--surface-well);
    border: 1px solid var(--hairline);
    gap: 2px;
    max-width: 100%;
    overflow-x: auto;
  }
  .seg button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--ink-2);
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
  }
  .seg button:hover { color: var(--ink-1); background: rgba(255, 255, 255, 0.05); }
  .seg button.active { background: rgba(255, 255, 255, 0.13); color: var(--ink-1); }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 42px;
    padding: 0 14px;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink-1);
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1;
    font-family: inherit;
    cursor: pointer;
    touch-action: manipulation;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  button:hover { background: var(--surface-hover); border-color: rgba(255, 255, 255, 0.18); }
  button:active { background: var(--surface-press); }
  button.primary, button.active {
    background: var(--action-bg);
    border-color: var(--action-bg);
    color: var(--action-ink);
  }
  button.primary:hover, button.active:hover { background: #e4e4e7; border-color: #e4e4e7; }
  input:not([type="checkbox"]):not([type="radio"]), select {
    display: block;
    width: 100%;
    height: 42px;
    background: var(--surface-well);
    color: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 0 14px;
    font-size: 14.5px;
    line-height: 1.35;
    font-family: inherit;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    transition: border-color 0.15s ease;
  }
  textarea {
    display: block;
    width: 100%;
    background: var(--surface-well);
    color: var(--ink-1);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    font-size: 14.5px;
    line-height: 1.55;
    font-family: inherit;
    outline: none;
    resize: vertical;
    transition: border-color 0.15s ease;
  }
  input::placeholder, textarea::placeholder {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    color: var(--ink-3);
    opacity: 1;
  }
  input:focus, textarea:focus { border-color: rgba(255, 255, 255, 0.34); }
  .section-label {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.3;
    color: var(--ink-2);
    margin: 0 0 8px;
    padding: 0 16px;
  }
  .surface {
    background: var(--surface);
    backdrop-filter: blur(24px) saturate(140%);
    -webkit-backdrop-filter: blur(24px) saturate(140%);
    border: 1px solid var(--border);
    box-shadow: inset 0 1px 0 var(--highlight);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .empty {
    padding: 16px;
    font-size: 14px;
    line-height: 1.4;
    color: var(--ink-3);
  }
  @media (max-width: 640px) {
    .nav-inner { padding: 12px 14px; }
    .wrap { padding: 16px 12px 68px; }
    button, input:not([type="checkbox"]):not([type="radio"]), select { height: 44px; }
    .seg button { height: 36px; }
  }
`;

/**
 * 1. PHOTO-TRIAGE: Fast photo filtering / culling with 4G preview/full toggle,
 * Grid vs Single-Focus mode, Keep / Star / Reject filters, and per-photo notes.
 */
export function buildPhotoTriageHtml(title, mediaItems = [], defaultQuality = "preview") {
  const itemsJson = JSON.stringify(
    mediaItems.map((m) => ({
      id: m.id,
      name: m.name,
      sizeKB: Math.round((m.size || 0) / 1024),
      previewUrl: `/__agy_media__/${m.id}?mode=preview`,
      fullUrl: `/__agy_media__/${m.id}?mode=full`
    }))
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <style>${BASE_CSS}
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 16px; }
    .grid.focus { grid-template-columns: minmax(0, 760px); justify-content: center; }
    .photo {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: border-color 0.15s ease, opacity 0.15s ease;
    }
    .photo.approved { border-color: rgba(245, 245, 247, 0.48); }
    .photo.starred { border-color: rgba(245, 245, 247, 0.72); }
    .photo.rejected { opacity: 0.45; }
    .img-box { background: #050507; display: flex; align-items: center; justify-content: center; min-height: 200px; }
    .img-box img { width: 100%; max-height: 360px; object-fit: contain; cursor: zoom-in; display: block; }
    .grid.focus .img-box img { max-height: 64vh; }
    .meta { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--hairline); }
    .fname { font-size: 13.5px; font-weight: 500; line-height: 1.35; display: flex; justify-content: space-between; gap: 8px; word-break: break-all; }
    .fsize { color: var(--ink-3); font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .acts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .acts button { height: 40px; padding: 0 8px; font-size: 13px; }
    .acts button.on { background: var(--action-bg); border-color: var(--action-bg); color: var(--action-ink); }
    .acts button.no.on { background: rgba(248, 113, 113, 0.16); border-color: rgba(248, 113, 113, 0.45); color: #fecaca; }
    .modal { position: fixed; inset: 0; background: rgba(5, 5, 7, 0.94); display: none; align-items: center; justify-content: center; z-index: 99999; padding: 16px; }
    .modal.open { display: flex; }
    .modal img { max-width: 100%; max-height: 92vh; object-fit: contain; border-radius: 6px; }
  </style>
</head>
<body>
  <header class="nav">
    <div class="nav-inner">
      <div>
        <h1>${esc(title)}</h1>
        <div class="nav-meta" id="summary"></div>
      </div>
      <div class="row">
        <div class="seg" role="tablist">
          <button id="f-all" class="active" onclick="setFilter('all')">All</button>
          <button id="f-pending" onclick="setFilter('pending')">Pending</button>
          <button id="f-approved" onclick="setFilter('approved')">Keep</button>
          <button id="f-starred" onclick="setFilter('starred')">Priority</button>
          <button id="f-rejected" onclick="setFilter('rejected')">Reject</button>
        </div>
        <button id="v-mode" onclick="toggleFocus()">Focus</button>
        <button id="q-mode" onclick="toggleQuality()">${defaultQuality === "full" ? "Full Res" : "4G Preview"}</button>
      </div>
    </div>
  </header>
  <main class="wrap">
    <div class="grid" id="grid"></div>
  </main>
  <div class="modal" id="modal" onclick="this.classList.remove('open')"><img id="mimg" src="" /></div>
  <script>
    const ITEMS = ${itemsJson};
    let filter = 'all', focus = false, quality = ${JSON.stringify(defaultQuality)};
    let decisions = {};
    function setFilter(f) {
      filter = f;
      ['all','pending','approved','starred','rejected'].forEach(k => document.getElementById('f-'+k).classList.toggle('active', k===f));
      render();
    }
    function toggleFocus() {
      focus = !focus;
      document.getElementById('v-mode').classList.toggle('active', focus);
      document.getElementById('grid').classList.toggle('focus', focus);
    }
    function toggleQuality() {
      quality = quality === 'preview' ? 'full' : 'preview';
      document.getElementById('q-mode').textContent = quality === 'full' ? 'Full Res' : '4G Preview';
      render();
    }
    function zoom(u) { document.getElementById('mimg').src = u; document.getElementById('modal').classList.add('open'); }
    function pick(id, st) {
      const d = decisions[id] || { status: 'pending', note: '' };
      d.status = d.status === st ? 'pending' : st;
      decisions[id] = d;
      if (window.agySync) window.agySync.setState({ decisions });
      render();
    }
    function note(id, val) {
      const d = decisions[id] || { status: 'pending', note: '' };
      d.note = val;
      decisions[id] = d;
      if (window.agySync) window.agySync.setState({ decisions });
    }
    function render() {
      let ok=0, star=0, no=0;
      ITEMS.forEach(i => { const s=(decisions[i.id]||{}).status; if(s==='approved') ok++; else if(s==='starred') star++; else if(s==='rejected') no++; });
      document.getElementById('summary').textContent = ITEMS.length + ' photos · Keep ' + ok + ' · Priority ' + star + ' · Reject ' + no + ' · Left ' + (ITEMS.length-ok-star-no);
      const list = ITEMS.filter(i => {
        const s = (decisions[i.id] || { status: 'pending' }).status;
        return filter === 'all' || s === filter;
      });
      document.getElementById('grid').innerHTML = list.map(i => {
        const d = decisions[i.id] || { status: 'pending', note: '' };
        const src = quality === 'full' ? i.fullUrl : i.previewUrl;
        return '<div class="photo ' + d.status + '">' +
          '<div class="img-box"><img loading="lazy" src="' + src + '" onclick="zoom(\\'' + i.fullUrl + '\\')" /></div>' +
          '<div class="meta">' +
            '<div class="fname"><span>' + i.name + '</span><span class="fsize">' + i.sizeKB + ' KB</span></div>' +
            '<div class="acts">' +
              '<button class="ok ' + (d.status==='approved'?'on':'') + '" onclick="pick(\\''+i.id+'\\',\\'approved\\')">Keep</button>' +
              '<button class="star ' + (d.status==='starred'?'on':'') + '" onclick="pick(\\''+i.id+'\\',\\'starred\\')">Priority</button>' +
              '<button class="no ' + (d.status==='rejected'?'on':'') + '" onclick="pick(\\''+i.id+'\\',\\'rejected\\')">Reject</button>' +
            '</div>' +
            '<input type="text" placeholder="Add a note for this photo…" value="' + (d.note||'').replace(/"/g,'&quot;') + '" onchange="note(\\''+i.id+'\\', this.value)" />' +
          '</div></div>';
      }).join('') || '<div class="empty">No photos match this filter.</div>';
    }
    window.addEventListener('load', () => {
      render();
      if (window.agySync) window.agySync.subscribe(c => { if (c && c.decisions) { decisions = c.decisions; render(); } });
    });
  </script>
</body>
</html>`;
}

/**
 * 2. MEDIA-REVIEW: Video / Audio / Image Review with 1-Tap Timestamped Feedback
 */
export function buildMediaReviewTimelineHtml(title, mediaItems = []) {
  const itemsJson = JSON.stringify(
    mediaItems.map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      url: `/__agy_media__/${m.id}?mode=full`,
      previewUrl: `/__agy_media__/${m.id}?mode=preview`
    }))
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <style>${BASE_CSS}
    .layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
    .stage {
      background: #050507;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 260px;
      padding: 12px;
    }
    video, img { width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; }
    audio { width: 100%; margin: 24px 0; }
    .audio-title { font-size: 14px; font-weight: 500; color: var(--ink-1); margin-bottom: 8px; }
    .tabs { margin-bottom: 16px; }
    .compose { padding: 14px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--hairline); }
    .notes-list { max-height: 50vh; overflow-y: auto; }
    .note-row {
      padding: 12px 16px;
      font-size: 14px;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      line-height: 1.45;
    }
    .note-row + .note-row { border-top: 1px solid var(--hairline); }
    .ts {
      font-size: 12px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--ink-1);
      background: rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 2px 7px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .ts:hover { background: rgba(255, 255, 255, 0.16); }
  </style>
</head>
<body>
  <header class="nav">
    <div class="nav-inner">
      <h1>${esc(title)}</h1>
      <div class="row">
        <button id="btn-ok" onclick="setVerdict('approved')">Approve</button>
        <button id="btn-no" onclick="setVerdict('rejected')">Needs Changes</button>
      </div>
    </div>
  </header>
  <main class="wrap">
    <div class="tabs"><div class="seg" id="tabs"></div></div>
    <div class="layout">
      <div class="stage" id="stage"></div>
      <div>
        <div class="section-label">Timestamped Notes</div>
        <div class="surface">
          <div class="compose">
            <input id="fb-input" type="text" placeholder="Add a note at current timestamp…" style="flex:1" onkeydown="if(event.key==='Enter')addTimestampNote()" />
            <button class="primary" onclick="addTimestampNote()">Save</button>
          </div>
          <div class="notes-list" id="notes"></div>
        </div>
      </div>
    </div>
  </main>
  <script>
    const ITEMS = ${itemsJson};
    let activeIdx = 0;
    let decisions = {};
    function fmt(sec) {
      if (typeof sec !== 'number' || isNaN(sec)) return null;
      const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }
    function currentItem() { return ITEMS[activeIdx] || ITEMS[0]; }
    function seekTo(sec) {
      const m = document.querySelector('#stage video, #stage audio');
      if (m && typeof sec === 'number') { m.currentTime = sec; m.play().catch(()=>{}); }
    }
    function setVerdict(st) {
      const it = currentItem(); if (!it) return;
      const d = decisions[it.id] || { status: 'pending', comments: [] };
      d.status = d.status === st ? 'pending' : st;
      decisions[it.id] = d;
      if (window.agySync) window.agySync.setState({ decisions });
      renderMeta();
    }
    function addTimestampNote() {
      const it = currentItem(); if (!it) return;
      const inp = document.getElementById('fb-input');
      const text = inp.value.trim(); if (!text) return;
      const media = document.querySelector('#stage video, #stage audio');
      const ts = media ? media.currentTime : null;
      const d = decisions[it.id] || { status: 'pending', comments: [] };
      d.comments = d.comments || [];
      d.comments.push({ ts, text });
      decisions[it.id] = d;
      inp.value = '';
      if (window.agySync) window.agySync.setState({ decisions });
      renderMeta();
    }
    function renderStage() {
      const it = currentItem(); if (!it) return;
      const stage = document.getElementById('stage');
      if (it.kind === 'video') stage.innerHTML = '<video controls playsinline preload="metadata" src="' + it.url + '"></video>';
      else if (it.kind === 'audio') stage.innerHTML = '<div class="audio-title">' + it.name + '</div><audio controls preload="metadata" src="' + it.url + '"></audio>';
      else stage.innerHTML = '<img src="' + it.previewUrl + '" />';
      renderMeta();
    }
    function renderMeta() {
      document.getElementById('tabs').innerHTML = ITEMS.map((it, i) => {
        const st = (decisions[it.id]||{}).status;
        const suffix = st === 'approved' ? ' · Approved' : st === 'rejected' ? ' · Changes' : '';
        return '<button class="' + (i===activeIdx?'active':'') + '" onclick="activeIdx='+i+';renderStage()">' + it.name + suffix + '</button>';
      }).join('');
      const it = currentItem(); if (!it) return;
      const d = decisions[it.id] || { status: 'pending', comments: [] };
      document.getElementById('btn-ok').classList.toggle('active', d.status === 'approved');
      document.getElementById('btn-no').classList.toggle('active', d.status === 'rejected');
      document.getElementById('notes').innerHTML = (d.comments || []).map(c =>
        '<div class="note-row">' +
          (c.ts !== null ? '<span class="ts" onclick="seekTo(' + c.ts + ')">' + fmt(c.ts) + '</span>' : '<span class="ts">Note</span>') +
          '<div style="flex:1">' + c.text.replace(/</g,'&lt;') + '</div>' +
        '</div>'
      ).join('') || '<div class="empty">No notes yet.</div>';
    }
    window.addEventListener('load', () => {
      renderStage();
      if (window.agySync) window.agySync.subscribe(c => { if (c && c.decisions) { decisions = c.decisions; renderMeta(); } });
    });
  </script>
</body>
</html>`;
}

/**
 * 3. NOTES-PAD: Distraction-free Synced Note-Taking + Interactive Checklist (PC <-> Phone)
 */
export function buildNotesPadHtml(title, initialNotes = "", initialTasks = []) {
  const tasksJson = JSON.stringify(
    (initialTasks || []).map((t, idx) =>
      typeof t === "string" ? { id: "t" + idx, text: t, done: false } : t
    )
  );
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <style>${BASE_CSS}
    .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 820px) { .grid { grid-template-columns: 1fr; } }
    textarea.pad {
      border: 0;
      border-radius: 0;
      background: transparent;
      padding: 16px;
      min-height: 360px;
      font-size: 15px;
      line-height: 1.6;
    }
    .compose { padding: 14px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--hairline); }
    .task-row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 48px;
      padding: 10px 16px;
      font-size: 14.5px;
      line-height: 1.4;
    }
    .task-row + .task-row { border-top: 1px solid var(--hairline); }
    .task-row input[type=checkbox] {
      width: 18px;
      height: 18px;
      margin: 0;
      padding: 0;
      accent-color: #f5f5f7;
      flex-shrink: 0;
      cursor: pointer;
    }
    .task-row.done span { text-decoration: line-through; color: var(--ink-3); }
    .icon-del {
      height: 32px;
      width: 32px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--ink-3);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
    }
    .icon-del:hover { background: var(--surface-hover); color: var(--ink-1); }
  </style>
</head>
<body>
  <header class="nav">
    <div class="nav-inner">
      <h1>${esc(title)}</h1>
    </div>
  </header>
  <main class="wrap">
    <div class="grid">
      <div>
        <div class="section-label">Notes</div>
        <div class="surface">
          <textarea class="pad" id="main-notes" placeholder="Write notes…">${esc(initialNotes)}</textarea>
        </div>
      </div>
      <div>
        <div class="section-label">Checklist</div>
        <div class="surface">
          <div class="compose">
            <input id="new-task" type="text" placeholder="Add a task…" style="flex:1" onkeydown="if(event.key==='Enter')addTask()" />
            <button class="primary" onclick="addTask()">Add</button>
          </div>
          <div id="task-list"></div>
        </div>
      </div>
    </div>
  </main>
  <script>
    let tasks = ${tasksJson};
    function saveTasks() { if (window.agySync) window.agySync.setState({ tasks }); renderTasks(); }
    function addTask() {
      const el = document.getElementById('new-task');
      const txt = el.value.trim(); if (!txt) return;
      tasks.push({ id: 't' + Date.now(), text: txt, done: false });
      el.value = '';
      saveTasks();
    }
    function toggleTask(idx) { tasks[idx].done = !tasks[idx].done; saveTasks(); }
    function delTask(idx) { tasks.splice(idx, 1); saveTasks(); }
    function renderTasks() {
      document.getElementById('task-list').innerHTML = tasks.map((t, i) =>
        '<div class="task-row ' + (t.done?'done':'') + '">' +
          '<input type="checkbox" ' + (t.done?'checked':'') + ' onchange="toggleTask('+i+')" />' +
          '<span style="flex:1">' + t.text.replace(/</g,'&lt;') + '</span>' +
          '<button class="icon-del" aria-label="Delete" onclick="delTask('+i+')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
        '</div>'
      ).join('') || '<div class="empty">No tasks yet.</div>';
    }
    window.addEventListener('load', () => {
      renderTasks();
      if (window.agySync) window.agySync.subscribe(c => { if (c && Array.isArray(c.tasks)) { tasks = c.tasks; renderTasks(); } });
    });
  </script>
</body>
</html>`;
}

/**
 * 4. COMPARE-VIEW: Side-by-side on Desktop/iPad, Quick A/B Segmented Toggle on Mobile
 */
export function buildCompareViewHtml(title, itemA = {}, itemB = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <style>${BASE_CSS}
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .mobile-tabs { display: none; margin-bottom: 14px; }
    @media (max-width: 768px) {
      .split { grid-template-columns: 1fr; }
      .mobile-tabs { display: flex; }
      .col.hidden-mobile { display: none; }
    }
    .col-head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--hairline);
      font-size: 14.5px;
      font-weight: 600;
      line-height: 1.35;
      color: var(--ink-1);
    }
    .col-body { padding: 16px; }
    .col.picked { border-color: rgba(245, 245, 247, 0.55); }
    .col img { width: 100%; max-height: 60vh; object-fit: contain; border-radius: 8px; background: #050507; display: block; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.55; color: var(--ink-1); }
    .note-bar { margin-top: 16px; }
  </style>
</head>
<body>
  <header class="nav">
    <div class="nav-inner">
      <h1>${esc(title)}</h1>
      <div class="row">
        <button id="pick-a" onclick="choose('A')">Select Option A</button>
        <button id="pick-b" onclick="choose('B')">Select Option B</button>
      </div>
    </div>
  </header>
  <main class="wrap">
    <div class="mobile-tabs">
      <div class="seg" style="width:100%">
        <button id="tab-a" class="active" style="flex:1" onclick="showTab('A')">Option A</button>
        <button id="tab-b" style="flex:1" onclick="showTab('B')">Option B</button>
      </div>
    </div>
    <div class="split">
      <div class="surface col" id="col-a">
        <div class="col-head">${esc(itemA.label || "Option A")}</div>
        <div class="col-body">
          ${itemA.imageUrl ? `<img src="${esc(itemA.imageUrl)}" />` : ""}
          ${itemA.text ? `<pre>${esc(itemA.text)}</pre>` : ""}
        </div>
      </div>
      <div class="surface col hidden-mobile" id="col-b">
        <div class="col-head">${esc(itemB.label || "Option B")}</div>
        <div class="col-body">
          ${itemB.imageUrl ? `<img src="${esc(itemB.imageUrl)}" />` : ""}
          ${itemB.text ? `<pre>${esc(itemB.text)}</pre>` : ""}
        </div>
      </div>
    </div>
    <div class="note-bar">
      <input id="compare-note" type="text" placeholder="Add your reasoning or revision notes…" />
    </div>
  </main>
  <script>
    let winner = null;
    function showTab(side) {
      document.getElementById('tab-a').classList.toggle('active', side==='A');
      document.getElementById('tab-b').classList.toggle('active', side==='B');
      document.getElementById('col-a').classList.toggle('hidden-mobile', side!=='A');
      document.getElementById('col-b').classList.toggle('hidden-mobile', side!=='B');
    }
    function choose(w) {
      winner = winner === w ? null : w;
      if (window.agySync) window.agySync.setState({ winner });
      renderPick();
    }
    function renderPick() {
      document.getElementById('pick-a').classList.toggle('active', winner==='A');
      document.getElementById('pick-b').classList.toggle('active', winner==='B');
      document.getElementById('col-a').classList.toggle('picked', winner==='A');
      document.getElementById('col-b').classList.toggle('picked', winner==='B');
    }
    window.addEventListener('load', () => {
      if (window.agySync) window.agySync.subscribe(c => { if (c && 'winner' in c) { winner = c.winner; renderPick(); } });
    });
  </script>
</body>
</html>`;
}

/**
 * 5. VIEWER-DASHBOARD: Single-surface hairline KPI strip + clean report body + feedback
 */
export function buildViewerDashboardHtml(title, metrics = [], markdownOrText = "") {
  const cells = (metrics || [])
    .map(
      (m) =>
        `<div class="kpi"><div class="klbl">${esc(m.label)}</div><div class="kval">${esc(m.value)}</div></div>`
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <style>${BASE_CSS}
    .kpi-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      border-bottom: 1px solid var(--hairline);
    }
    .kpi { padding: 16px; }
    .kpi + .kpi { border-left: 1px solid var(--hairline); }
    @media (max-width: 640px) {
      .kpi + .kpi { border-left: 0; border-top: 1px solid var(--hairline); }
    }
    .klbl { font-size: 13px; line-height: 1.35; color: var(--ink-2); margin-bottom: 6px; }
    .kval { font-size: 24px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--ink-1); }
    .report-body { padding: 16px; font-size: 14.5px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; color: var(--ink-1); }
    .feedback { margin-top: 16px; }
  </style>
</head>
<body>
  <header class="nav">
    <div class="nav-inner"><h1>${esc(title)}</h1></div>
  </header>
  <main class="wrap">
    <div class="surface">
      ${cells ? `<div class="kpi-strip">${cells}</div>` : ""}
      <div class="report-body">${esc(markdownOrText)}</div>
    </div>
    <div class="feedback">
      <input id="viewer-feedback" type="text" placeholder="Add feedback for the Agent about this report…" />
    </div>
  </main>
</body>
</html>`;
}
