/**
 * agy-website-artifacts: Non-Invasive Client Bridge (iframe-bridge.js)
 * Zero-overhead lazy DOM enhancer: injects styles/drawer ONLY when a preview link
 * (#agy-iframe, /__agy_artifact__/, /__agy_app__/) actually appears in the page.
 * Follows Apple HIG Minimalist Monochromatic Glassmorphism Guidelines.
 */
(function () {
  if (window.__AGY_LIVE_IFRAME_LOADED__) return;
  window.__AGY_LIVE_IFRAME_LOADED__ = true;

  let uiMounted = false;
  let drawer = null;
  let drawerFrame = null;
  let drawerTitle = null;
  let drawerNewTab = null;
  let drawerTall = false;

  function ensureUiMounted() {
    if (uiMounted) return;
    uiMounted = true;

    const style = document.createElement("style");
    style.textContent = `
      .agy-iframe-actions {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 4px 6px;
        vertical-align: middle;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      }
      .agy-iframe-btn {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none !important;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #f5f5f7 !important;
        backdrop-filter: blur(12px);
        transition: background 0.15s ease, border-color 0.15s ease;
        line-height: 1.35;
      }
      .agy-iframe-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.22);
      }
      .agy-iframe-btn.secondary {
        background: transparent;
        color: #a1a1a6 !important;
        border-color: rgba(255, 255, 255, 0.09);
      }
      .agy-iframe-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.07);
        color: #f5f5f7 !important;
      }
      .agy-inline-iframe-box {
        margin: 12px 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        overflow: hidden;
        background: #0b0b0d;
      }
      .agy-inline-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: rgba(18, 18, 21, 0.85);
        backdrop-filter: blur(20px) saturate(140%);
        -webkit-backdrop-filter: blur(20px) saturate(140%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
        font-size: 12.5px;
        color: #f5f5f7;
        gap: 10px;
      }
      .agy-inline-toolbar-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
        color: #f5f5f7;
      }
      .agy-inline-toolbar-controls {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }
      .agy-inline-toolbar-controls button,
      .agy-inline-toolbar-controls a {
        background: rgba(255, 255, 255, 0.06);
        color: #e4e4e7 !important;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 7px;
        padding: 4px 9px;
        font-size: 11.5px;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        text-decoration: none !important;
        transition: background 0.15s ease;
      }
      .agy-inline-toolbar-controls button:hover,
      .agy-inline-toolbar-controls a:hover {
        background: rgba(255, 255, 255, 0.13);
      }
      .agy-inline-iframe {
        width: 100%;
        height: 460px;
        border: 0;
        display: block;
        background: #0b0b0d;
      }
      @media (max-width: 768px) {
        .agy-inline-iframe { height: 380px; }
      }
      .agy-drawer-backdrop {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 55vh;
        background: #0b0b0d;
        border-top: 1px solid rgba(255, 255, 255, 0.14);
        z-index: 2147483646;
        display: none;
        flex-direction: column;
      }
      .agy-drawer-backdrop.open { display: flex; }
      .agy-drawer-iframe { flex: 1; width: 100%; border: 0; background: #0b0b0d; }
    `;
    document.head.appendChild(style);

    drawer = document.createElement("div");
    drawer.className = "agy-drawer-backdrop";
    drawer.innerHTML = `
      <div class="agy-inline-toolbar">
        <span class="agy-inline-toolbar-title" id="agy-drawer-title">Live Preview</span>
        <div class="agy-inline-toolbar-controls">
          <button type="button" id="agy-drawer-size">Resize</button>
          <button type="button" id="agy-drawer-reload">Reload</button>
          <a id="agy-drawer-newtab" href="#" target="_blank" rel="noopener" data-agy-ignore="1">New Tab</a>
          <button type="button" id="agy-drawer-close">Close</button>
        </div>
      </div>
      <iframe class="agy-drawer-iframe" id="agy-drawer-frame" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"></iframe>
    `;
    document.body.appendChild(drawer);

    drawerFrame = drawer.querySelector("#agy-drawer-frame");
    drawerTitle = drawer.querySelector("#agy-drawer-title");
    drawerNewTab = drawer.querySelector("#agy-drawer-newtab");

    drawer.querySelector("#agy-drawer-size").addEventListener("click", () => {
      drawerTall = !drawerTall;
      drawer.style.height = drawerTall ? "85vh" : "55vh";
    });
    drawer.querySelector("#agy-drawer-reload").addEventListener("click", () => {
      if (drawerFrame.src) drawerFrame.src = drawerFrame.src;
    });
    drawer.querySelector("#agy-drawer-close").addEventListener("click", () => {
      drawer.classList.remove("open");
    });
  }

  function openInDrawer(url, label) {
    ensureUiMounted();
    drawerTitle.textContent = label || url;
    drawerFrame.src = url;
    drawerNewTab.href = url;
    drawer.classList.add("open");
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, "&quot;");
  }

  function createInlineIframeBox(url, label) {
    ensureUiMounted();
    const box = document.createElement("div");
    box.className = "agy-inline-iframe-box";
    box.innerHTML = `
      <div class="agy-inline-toolbar">
        <span class="agy-inline-toolbar-title">${escapeHtml(label || url)}</span>
        <div class="agy-inline-toolbar-controls">
          <button type="button" data-act="reload">Reload</button>
          <button type="button" data-act="drawer">Drawer</button>
          <a href="${escapeAttr(url)}" target="_blank" rel="noopener" data-agy-ignore="1">New Tab</a>
          <button type="button" data-act="close">Collapse</button>
        </div>
      </div>
      <iframe class="agy-inline-iframe" src="${escapeAttr(url)}" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"></iframe>
    `;
    const iframe = box.querySelector("iframe");
    box.querySelector('[data-act="reload"]').addEventListener("click", () => {
      iframe.src = iframe.src;
    });
    box.querySelector('[data-act="drawer"]').addEventListener("click", () => {
      openInDrawer(url, label);
    });
    box.querySelector('[data-act="close"]').addEventListener("click", () => {
      box.remove();
    });
    return box;
  }

  function isPreviewLink(a) {
    if (!a || !a.href) return false;
    if (a.dataset.agyEnhanced === "1" || a.dataset.agyIgnore === "1") return false;
    if (a.closest(".agy-iframe-actions, .agy-inline-toolbar, .agy-inline-iframe-box, .agy-drawer-backdrop")) return false;
    const href = a.href;
    return (
      href.includes("#agy-iframe") ||
      href.includes("agy_iframe=1") ||
      href.includes("/__agy_artifact__/") ||
      href.includes("/__agy_app__/")
    );
  }

  function enhanceLink(a) {
    if (a.dataset.agyEnhanced === "1") return;
    ensureUiMounted();
    a.dataset.agyEnhanced = "1";

    const rawUrl = a.href.replace(/#agy-iframe$/, "");
    const rawTargetUrl = rawUrl.includes("?") ? rawUrl + "&raw=1" : rawUrl + "?raw=1";
    const label = a.textContent.trim() || "Live Preview";

    const actions = document.createElement("span");
    actions.className = "agy-iframe-actions";

    const inlineBtn = document.createElement("button");
    inlineBtn.type = "button";
    inlineBtn.className = "agy-iframe-btn";
    inlineBtn.textContent = "Preview";

    const newTabLink = document.createElement("a");
    newTabLink.className = "agy-iframe-btn secondary";
    newTabLink.dataset.agyEnhanced = "1";
    newTabLink.dataset.agyIgnore = "1";
    newTabLink.href = rawUrl;
    newTabLink.target = "_blank";
    newTabLink.rel = "noopener";
    newTabLink.textContent = "New Tab";

    let inlineBox = null;
    function toggleInline(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (inlineBox && inlineBox.isConnected) {
        inlineBox.remove();
        inlineBox = null;
        inlineBtn.textContent = "Preview";
      } else {
        inlineBox = createInlineIframeBox(rawTargetUrl, label);
        const container = a.closest("p, li, div") || a.parentElement;
        container.insertAdjacentElement("afterend", inlineBox);
        inlineBtn.textContent = "Collapse";
      }
    }

    a.addEventListener("click", toggleInline);
    inlineBtn.addEventListener("click", toggleInline);

    actions.appendChild(inlineBtn);
    actions.appendChild(newTabLink);
    a.insertAdjacentElement("afterend", actions);
  }

  function scanNode(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === "A") {
      if (isPreviewLink(node)) enhanceLink(node);
      return;
    }
    if (!node.querySelectorAll) return;
    const links = node.querySelectorAll("a[href*='agy-iframe'], a[href*='__agy_artifact__'], a[href*='__agy_app__']");
    for (const a of links) {
      if (isPreviewLink(a)) enhanceLink(a);
    }
  }

  // Initial lightweight scan using targeted attribute selectors only
  scanNode(document.body);

  // Observe ONLY newly added nodes (zero full-document rescans during chat streaming!)
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (!m.addedNodes || m.addedNodes.length === 0) continue;
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) scanNode(n);
      }
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "AGY_ARTIFACT_HEIGHT") return;
    const frames = document.querySelectorAll(".agy-inline-iframe");
    for (const f of frames) {
      if (f.contentWindow === event.source && event.data.height) {
        const h = Math.min(Math.max(Number(event.data.height) + 24, 260), 720);
        f.style.height = h + "px";
      }
    }
  });
})();
