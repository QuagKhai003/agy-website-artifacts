/**
 * agy-website-artifacts: Real-Time Bidirectional Sync Client (PC <-> Mobile Phone)
 * Uses Server-Sent Events (SSE) + Fetch POST so it works reliably over Wi-Fi LAN
 * and 4G HTTPS tunnels (localhost.run) with zero external dependencies.
 */
(function () {
  if (window.__AGY_SYNC_LOADED__) return;
  window.__AGY_SYNC_LOADED__ = true;

  const clientId = "c_" + Math.random().toString(36).slice(2, 10);
  const match = window.location.pathname.match(/\/__agy_(?:artifact|app)__\/([^/?#]+)/);
  const roomId = match ? match[1] : "global";

  let localState = { fields: {}, custom: {}, updatedAt: null };
  const listeners = new Set();
  let applyingRemote = false;

  // Whisper-quiet Apple HIG monochrome sync indicator (zero floating pill noise)
  const pill = document.createElement("div");
  pill.id = "agy-sync-pill";
  pill.style.cssText = [
    "position:fixed",
    "right:12px",
    "bottom:max(10px, env(safe-area-inset-bottom))",
    "z-index:2147483647",
    "display:inline-flex",
    "align-items:center",
    "gap:6px",
    "background:rgba(18,18,21,0.72)",
    "color:#a1a1a6",
    "border:1px solid rgba(255,255,255,0.08)",
    "border-radius:8px",
    "padding:4px 8px",
    "font:500 11px/1.2 -apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif",
    "font-variant-numeric:tabular-nums",
    "backdrop-filter:blur(16px) saturate(140%)",
    "-webkit-backdrop-filter:blur(16px) saturate(140%)",
    "pointer-events:none",
    "opacity:0.78"
  ].join(";");
  const dot = document.createElement("span");
  dot.style.cssText = "width:6px;height:6px;border-radius:50%;background:#6e6e73;display:inline-block;";
  const lbl = document.createElement("span");
  lbl.textContent = "Connecting";
  pill.appendChild(dot);
  pill.appendChild(lbl);

  function mountPill() {
    if (document.body && !pill.isConnected) {
      document.body.appendChild(pill);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountPill);
  } else {
    mountPill();
  }

  function updatePill(connected, peers) {
    mountPill();
    if (!connected) {
      dot.style.background = "#6e6e73";
      lbl.textContent = "Reconnecting";
    } else {
      dot.style.background = "#e4e4e7";
      lbl.textContent = peers > 1 ? `Synced · ${peers}` : "Synced";
    }
  }

  function fieldKey(el, idx) {
    if (el.id) return "id:" + el.id;
    if (el.name) return "name:" + el.name;
    return "idx:" + el.tagName.toLowerCase() + ":" + idx;
  }

  function applyFieldsToDom(fields) {
    if (!fields) return;
    applyingRemote = true;
    try {
      const els = document.querySelectorAll("input, textarea, select");
      els.forEach((el, idx) => {
        const key = fieldKey(el, idx);
        if (!(key in fields)) return;
        const val = fields[key];
        if (el.type === "checkbox" || el.type === "radio") {
          if (el.checked !== Boolean(val)) {
            el.checked = Boolean(val);
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else {
          if (el.value !== String(val)) {
            el.value = String(val);
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      });
    } finally {
      applyingRemote = false;
    }
  }

  function pushPatch(patch) {
    if (applyingRemote) return;
    fetch(`/__agy_sync__/${encodeURIComponent(roomId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, patch })
    }).catch(() => {});
  }

  function handleRemoteState(payload) {
    if (!payload) return;
    if (payload.forceLogout) {
      window.location.reload();
      return;
    }
    if (typeof payload.peers === "number") {
      updatePill(true, payload.peers);
    }
    if (!payload.state) return;
    if (payload.sender && payload.sender === clientId) return;

    localState = {
      fields: { ...(localState.fields || {}), ...(payload.state.fields || {}) },
      custom: { ...(localState.custom || {}), ...(payload.state.custom || {}) },
      updatedAt: payload.state.updatedAt || null
    };
    applyFieldsToDom(localState.fields);
    listeners.forEach((fn) => {
      try {
        fn(localState.custom, localState);
      } catch (_) {}
    });
  }

  // Listen for DOM input/change events automatically across all inputs/textareas/selects
  function attachDomListeners() {
    document.addEventListener(
      "input",
      (e) => {
        if (applyingRemote) return;
        const el = e.target;
        if (!el || !el.matches || !el.matches("input, textarea, select")) return;
        const all = Array.from(document.querySelectorAll("input, textarea, select"));
        const idx = all.indexOf(el);
        const key = fieldKey(el, idx);
        const val = el.type === "checkbox" || el.type === "radio" ? el.checked : el.value;
        localState.fields[key] = val;
        pushPatch({ fields: { [key]: val } });
      },
      true
    );
    document.addEventListener(
      "change",
      (e) => {
        if (applyingRemote) return;
        const el = e.target;
        if (!el || !el.matches || !el.matches("input, textarea, select")) return;
        const all = Array.from(document.querySelectorAll("input, textarea, select"));
        const idx = all.indexOf(el);
        const key = fieldKey(el, idx);
        const val = el.type === "checkbox" || el.type === "radio" ? el.checked : el.value;
        localState.fields[key] = val;
        pushPatch({ fields: { [key]: val } });
      },
      true
    );
  }
  attachDomListeners();

  // Connect Server-Sent Events stream for instant bidirectional sync
  function connectSse() {
    const es = new EventSource(`/__agy_sync__/${encodeURIComponent(roomId)}/events?clientId=${encodeURIComponent(clientId)}`);
    es.onopen = () => updatePill(true, 1);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        handleRemoteState(data);
      } catch (_) {}
    };
    es.onerror = () => {
      updatePill(false, 0);
    };
  }

  // Public API for interactive apps/artifacts (e.g., counters, dashboards, React state)
  window.agySync = {
    roomId,
    clientId,
    getState: () => ({ ...(localState.custom || {}) }),
    setState: (partial) => {
      localState.custom = { ...(localState.custom || {}), ...(partial || {}) };
      pushPatch({ custom: partial });
      listeners.forEach((fn) => {
        try {
          fn(localState.custom, localState);
        } catch (_) {}
      });
    },
    subscribe: (fn) => {
      listeners.add(fn);
      // Immediately deliver any already-loaded state
      if (localState.custom && Object.keys(localState.custom).length > 0) {
        try {
          fn(localState.custom, localState);
        } catch (_) {}
      }
      return () => listeners.delete(fn);
    }
  };

  // Load initial persisted state first so refresh NEVER loses state
  fetch(`/__agy_sync__/${encodeURIComponent(roomId)}`)
    .then((r) => r.json())
    .then((data) => {
      handleRemoteState({ state: data.state, peers: data.peers });
      connectSse();
    })
    .catch(() => {
      connectSse();
    });
})();
