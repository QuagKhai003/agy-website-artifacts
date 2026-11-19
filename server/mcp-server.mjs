#!/usr/bin/env node
/**
 * agy-website-artifacts MCP Server + Local Gateway + Mobile 4G/Wi-Fi Tunnel
 * Zero-dependency Node.js (v20/v24+) implementation.
 * Does NOT modify any core Google Antigravity files.
 */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildPhotoTriageHtml,
  buildMediaReviewTimelineHtml,
  buildNotesPadHtml,
  buildCompareViewHtml,
  buildViewerDashboardHtml
} from "./layout-presets.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.AGY_DATA_DIR ? path.resolve(process.env.AGY_DATA_DIR) : __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
const BRIDGE_SCRIPT_PATH = path.join(__dirname, "iframe-bridge.js");
const SYNC_SCRIPT_PATH = path.join(__dirname, "iframe-sync.js");
const STATE_FILE = path.join(DATA_DIR, ".runtime-state.json");
const SECURITY_FILE = path.join(DATA_DIR, ".security.json");

// ============================================================================
// Security Gateway State (Token + 6-Digit PIN + Signed HttpOnly Cookie + Rate Limit)
// ============================================================================
let securityConfig = {
  accessToken: null,
  pin: null,
  sessionSecret: null,
  rotatedAt: null
};
const failedLoginAttempts = new Map(); // ip -> { count, resetAt }

function loadOrInitSecurity(forceRotate = false, customPin = null) {
  try {
    if (!forceRotate && fs.existsSync(SECURITY_FILE)) {
      const saved = JSON.parse(fs.readFileSync(SECURITY_FILE, "utf8"));
      if (saved.accessToken && saved.pin && saved.sessionSecret) {
        securityConfig = saved;
        return securityConfig;
      }
    }
  } catch (_) {}

  securityConfig = {
    accessToken: process.env.AGY_ACCESS_TOKEN && !forceRotate
      ? process.env.AGY_ACCESS_TOKEN
      : crypto.randomBytes(16).toString("hex"),
    pin: customPin
      ? String(customPin).trim()
      : (process.env.AGY_GATEWAY_PIN && !forceRotate
        ? String(process.env.AGY_GATEWAY_PIN)
        : String(crypto.randomInt(100000, 999999))),
    sessionSecret: crypto.randomBytes(32).toString("hex"),
    rotatedAt: new Date().toISOString()
  };
  try {
    fs.writeFileSync(SECURITY_FILE, JSON.stringify(securityConfig, null, 2), { encoding: "utf8", mode: 0o600 });
  } catch (_) {}
  return securityConfig;
}
loadOrInitSecurity(false);

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function signSessionToken() {
  const payload = `agy_ok:${securityConfig.rotatedAt}`;
  const sig = crypto.createHmac("sha256", securityConfig.sessionSecret).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifySessionCookie(cookieHeader) {
  if (!cookieHeader) return false;
  const parts = String(cookieHeader).split(";").map((s) => s.trim());
  for (const part of parts) {
    if (part.startsWith("agy_session=")) {
      const val = decodeURIComponent(part.slice("agy_session=".length));
      const expected = signSessionToken();
      if (safeEqual(val, expected)) return true;
    }
  }
  return false;
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function detectNetworkMode(req) {
  const host = String(req.headers.host || "").toLowerCase();
  const fwdHost = String(req.headers["x-forwarded-host"] || "").toLowerCase();
  const ip = getClientIp(req);
  if (fwdHost.includes("lhr.life") || host.includes("lhr.life") || host.includes("trycloudflare.com")) {
    return { mode: "4g_public", badge: "🌍 4G / Internet HTTPS (Bảo mật)" };
  }
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1") || ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
    return { mode: "localhost", badge: "💻 Localhost (Trực tiếp trên Máy A)" };
  }
  return { mode: "wifi_lan", badge: "📶 Wi-Fi Nội bộ (LAN)" };
}

function isRateLimited(ip) {
  const entry = failedLoginAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failedLoginAttempts.delete(ip);
    return false;
  }
  return entry.count >= 5;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = failedLoginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    failedLoginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
  } else {
    entry.count += 1;
  }
}

function buildCookieHeader(req) {
  const host = String(req.headers.host || "").toLowerCase();
  const isHttps =
    req.headers["x-forwarded-proto"] === "https" ||
    host.includes("lhr.life") ||
    host.includes("trycloudflare.com");
  const secureFlag = isHttps ? "; Secure" : "";
  return `agy_session=${encodeURIComponent(signSessionToken())}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secureFlag}`;
}

function buildLockScreenHtml(errorMsg = "", nextUrl = "/") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Antigravity Private Access</title>
  <style>
    :root {
      --canvas: #0b0b0d;
      --surface: rgba(255, 255, 255, 0.045);
      --surface-well: rgba(0, 0, 0, 0.28);
      --border: rgba(255, 255, 255, 0.095);
      --hairline: rgba(255, 255, 255, 0.075);
      --ink-1: #f5f5f7;
      --ink-2: #a1a1a6;
      --ink-3: #6e6e73;
      --action-bg: #f5f5f7;
      --action-ink: #0b0b0d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: var(--canvas);
      color: var(--ink-1);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      width: 100%;
      max-width: 360px;
      background: var(--surface);
      backdrop-filter: blur(24px) saturate(140%);
      -webkit-backdrop-filter: blur(24px) saturate(140%);
      border: 1px solid var(--border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 24px;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    .lock-icon {
      color: var(--ink-2);
      flex-shrink: 0;
      display: block;
    }
    h1 {
      margin: 0;
      font-size: 17px;
      font-weight: 600;
      line-height: 1.3;
      letter-spacing: -0.02em;
      color: var(--ink-1);
    }
    p {
      margin: 0 0 20px;
      font-size: 14px;
      color: var(--ink-2);
      line-height: 1.45;
    }
    input {
      display: block;
      width: 100%;
      height: 44px;
      padding: 0 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-well);
      color: var(--ink-1);
      font-family: inherit;
      font-size: 15px;
      line-height: 1.35;
      font-variant-numeric: tabular-nums;
      margin: 0 0 12px;
      text-align: center;
      letter-spacing: 0.22em;
      text-indent: 0.22em;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      transition: border-color 0.15s ease;
    }
    input:placeholder-shown {
      letter-spacing: normal;
      text-indent: 0;
    }
    input::placeholder {
      font-family: inherit;
      font-size: 15px;
      line-height: 1.35;
      letter-spacing: normal;
      color: var(--ink-3);
      opacity: 1;
    }
    input:focus { border-color: rgba(255, 255, 255, 0.34); }
    button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 44px;
      padding: 0 16px;
      border-radius: 10px;
      border: 0;
      background: var(--action-bg);
      color: var(--action-ink);
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    button:hover { background: #e4e4e7; }
    button:active { background: #d4d4d8; }
    .msg {
      border-left: 2px solid var(--ink-2);
      padding: 6px 0 6px 12px;
      color: var(--ink-1);
      font-size: 13.5px;
      margin: 0 0 16px;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="head">
      <svg class="lock-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <h1>Private Gateway</h1>
    </div>
    <p>Enter your 6-digit PIN to unlock this device.</p>
    ${errorMsg ? `<div class="msg">${escapeHtml(errorMsg)}</div>` : ""}
    <form method="POST" action="/__agy_login__">
      <input type="hidden" name="next" value="${escapeHtml(nextUrl)}" />
      <input type="password" inputmode="numeric" name="secret" placeholder="6-digit PIN" autocomplete="off" required autofocus />
      <button type="submit">Continue</button>
    </form>
  </main>
</body>
</html>`;
}

/**
 * Smart One-Link Auto-Router (Apple HIG Monochrome)
 */
function buildSmartRouterHtml({ targetPath, token }) {
  const localGo = `http://localhost:${gatewayPort}/__agy_go__?to=${encodeURIComponent(targetPath)}&token=${encodeURIComponent(token)}&direct=1`;
  const cleanTarget = targetPath.startsWith("/") ? targetPath : "/";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connecting</title>
  <style>
    body {
      margin: 0;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      background: #0b0b0d;
      color: #a1a1a6;
      font-size: 13.5px;
      -webkit-font-smoothing: antialiased;
    }
  </style>
</head>
<body>
  <div id="status">Connecting…</div>
  <script>
    (function () {
      const target = ${JSON.stringify(cleanTarget)};
      const localGo = ${JSON.stringify(localGo)};
      const pingUrl = "http://localhost:${gatewayPort}/__agy_ping__";

      const h = location.hostname;
      if (h === "localhost" || h === "127.0.0.1" || /^192\\.168\\.|^10\\.|^172\\.(1[6-9]|2\\d|3[01])\\./.test(h)) {
        location.replace(target);
        return;
      }

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 180);
      fetch(pingUrl, { mode: "cors", cache: "no-store", signal: ctrl.signal })
        .then((r) => {
          clearTimeout(timer);
          if (r.ok) location.replace(localGo);
          else location.replace(target);
        })
        .catch(() => {
          clearTimeout(timer);
          location.replace(target);
        });
    })();
  </script>
</body>
</html>`;
}

// In-memory registries
const artifacts = new Map(); // id -> { id, title, type, code, createdAt }
const appRoutes = new Map(); // id -> { id, title, targetOrigin, createdAt }
const staticSites = new Map(); // id -> { id, title, rootDir, createdAt }
const mediaFiles = new Map(); // mediaId -> { id, filePath, name, mime, kind, size }
const syncStates = new Map(); // roomId -> { fields: {}, custom: {}, updatedAt }
const syncPeers = new Map(); // roomId -> Set<http.ServerResponse>
let activeAppOrigin = null;
const CACHE_DIR = path.join(DATA_DIR, ".media-cache");
try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (_) {}

const MIME_MAP = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac"
};

function classifyMedia(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_MAP[ext] || "application/octet-stream";
  let kind = "file";
  if (mime.startsWith("image/")) kind = "image";
  else if (mime.startsWith("video/")) kind = "video";
  else if (mime.startsWith("audio/")) kind = "audio";
  return { ext, mime, kind };
}

function registerLocalMedia(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return null;
  const stat = fs.statSync(abs);
  if (!stat.isFile()) return null;
  const id = crypto.createHash("sha1").update(abs).digest("hex").slice(0, 10);
  const { mime, kind } = classifyMedia(abs);
  const item = { id, filePath: abs, name: path.basename(abs), mime, kind, size: stat.size };
  mediaFiles.set(id, item);
  return item;
}

/**
 * Generates a lightweight JPEG preview (max 960px wide) on Windows via System.Drawing
 * for fast 4G mobile loading; falls back to original file if unavailable.
 */
function ensurePreviewImage(mediaItem) {
  if (mediaItem.kind !== "image" || mediaItem.mime === "image/svg+xml" || mediaItem.mime === "image/gif") {
    return mediaItem.filePath;
  }
  const outPath = path.join(CACHE_DIR, `${mediaItem.id}_preview.jpg`);
  if (fs.existsSync(outPath)) return outPath;
  if (process.platform !== "win32") return mediaItem.filePath;

  try {
    const ps = `
      Add-Type -AssemblyName System.Drawing;
      $img = [System.Drawing.Image]::FromFile(${JSON.stringify(mediaItem.filePath)});
      $maxW = 960;
      if ($img.Width -le $maxW) { $img.Save(${JSON.stringify(outPath)}, [System.Drawing.Imaging.ImageFormat]::Jpeg); $img.Dispose(); exit 0 }
      $ratio = $maxW / [double]$img.Width;
      $newH = [int]($img.Height * $ratio);
      $bmp = New-Object System.Drawing.Bitmap($maxW, $newH);
      $g = [System.Drawing.Graphics]::FromImage($bmp);
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;
      $g.DrawImage($img, 0, 0, $maxW, $newH);
      $bmp.Save(${JSON.stringify(outPath)}, [System.Drawing.Imaging.ImageFormat]::Jpeg);
      $g.Dispose(); $bmp.Dispose(); $img.Dispose();
    `;
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", ps], { windowsHide: true });
    child.unref();
  } catch (_) {}
  return mediaItem.filePath;
}

function buildMediaReviewGalleryHtml(title, items, defaultQuality = "preview") {
  const hasAudioOrVideo = (items || []).some((m) => m.kind === "video" || m.kind === "audio");
  if (hasAudioOrVideo) {
    return buildMediaReviewTimelineHtml(title, items);
  }
  return buildPhotoTriageHtml(title, items, defaultQuality);
}
let upstreamUiOrigin = process.env.AGY_UPSTREAM_UI || null;
let gatewayPort = Number(process.env.AGY_IFRAME_PORT || 4580);
let serverStarted = false;
let publicTunnelUrl = null;
let tunnelProcess = null;

function getRoomState(roomId) {
  if (!syncStates.has(roomId)) {
    syncStates.set(roomId, { fields: {}, custom: {}, updatedAt: null });
  }
  return syncStates.get(roomId);
}

function broadcastRoom(roomId, payload) {
  const peers = syncPeers.get(roomId);
  if (!peers || peers.size === 0) return;
  const msg = `data: ${JSON.stringify({ ...payload, peers: peers.size })}\n\n`;
  for (const peerRes of peers) {
    try {
      peerRes.write(msg);
    } catch (_) {
      peers.delete(peerRes);
    }
  }
}

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function saveState() {
  try {
    const data = {
      gatewayPort,
      lanIp: getLanIp(),
      publicTunnelUrl,
      upstreamUiOrigin,
      artifacts: Array.from(artifacts.values()),
      appRoutes: Array.from(appRoutes.values()),
      staticSites: Array.from(staticSites.values()),
      mediaFiles: Array.from(mediaFiles.values()),
      activeAppOrigin,
      syncStates: Object.fromEntries(syncStates.entries()),
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (_) {}
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      if (Array.isArray(raw.artifacts)) {
        for (const item of raw.artifacts) artifacts.set(item.id, item);
      }
      if (Array.isArray(raw.appRoutes)) {
        for (const item of raw.appRoutes) appRoutes.set(item.id, item);
      }
      if (Array.isArray(raw.staticSites)) {
        for (const item of raw.staticSites) staticSites.set(item.id, item);
      }
      if (raw.activeAppOrigin) activeAppOrigin = raw.activeAppOrigin;
      if (Array.isArray(raw.mediaFiles)) {
        for (const item of raw.mediaFiles) mediaFiles.set(item.id, item);
      }
      if (raw.syncStates && typeof raw.syncStates === "object") {
        for (const [k, v] of Object.entries(raw.syncStates)) {
          if (!syncStates.has(k)) syncStates.set(k, v);
        }
      }
      if (raw.upstreamUiOrigin) upstreamUiOrigin = raw.upstreamUiOrigin;
    }
  } catch (_) {}
}
loadState();

/**
 * Claude-style Artifact Runner HTML generator
 * Supports raw HTML/CSS/JS and single-file React/JSX + Tailwind components.
 * Automatically injects real-time PC <-> Mobile sync runtime (iframe-sync.js).
 */
function buildArtifactRawHtml(artifact) {
  const responsiveAndSyncHead = `
<style id="agy-auto-responsive">
  html, body { max-width: 100%; overflow-x: hidden; -webkit-text-size-adjust: 100%; }
  *, *::before, *::after { box-sizing: border-box; }
  img, video, canvas, svg, iframe { max-width: 100%; height: auto; }
  audio { max-width: 100%; }
  html.agy-device-mobile body { padding-left: max(12px, env(safe-area-inset-left)); padding-right: max(12px, env(safe-area-inset-right)); }
</style>`;

  const resizeBridge = `
<script src="/__agy_bridge__/iframe-sync.js"></script>
<script>
(function(){
  function detectDevice(){
    var w = window.innerWidth || document.documentElement.clientWidth || 1024;
    var root = document.documentElement;
    root.classList.remove("agy-device-mobile", "agy-device-tablet", "agy-device-desktop");
    var mode = w < 640 ? "mobile" : (w <= 1024 ? "tablet" : "desktop");
    root.classList.add("agy-device-" + mode);
    root.dataset.agyDevice = mode;
    window.__AGY_DEVICE__ = mode;
  }
  function sendHeight(){
    detectDevice();
    var h = document.documentElement.scrollHeight || document.body.scrollHeight || 400;
    parent.postMessage({ type: "AGY_ARTIFACT_HEIGHT", id: "${artifact.id}", height: h }, "*");
  }
  detectDevice();
  window.addEventListener("resize", detectDevice);
  window.addEventListener("orientationchange", detectDevice);
  window.addEventListener("load", sendHeight);
  new ResizeObserver(sendHeight).observe(document.documentElement);
})();
</script>`;

  if (artifact.type === "react") {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${escapeHtml(artifact.title)}</title>
  ${responsiveAndSyncHead}
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-white text-slate-900 min-h-screen m-0 p-0">
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useEffect, useMemo, useRef, useCallback } = React;
    ${artifact.code}
    const RootComponent = typeof App !== "undefined" ? App : (typeof Artifact !== "undefined" ? Artifact : null);
    if (RootComponent) {
      ReactDOM.createRoot(document.getElementById("root")).render(<RootComponent />);
    }
  </script>
  ${resizeBridge}
</body>
</html>`;
  }

  // Standard HTML artifact
  let html = artifact.code;
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${responsiveAndSyncHead}</head>`);
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${resizeBridge}</body>`);
  }
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${escapeHtml(artifact.title)}</title>
  ${responsiveAndSyncHead}
</head>
<body>
${html}
${resizeBridge}
</body>
</html>`;
}

/**
 * Interactive Shell wrapper when user opens the link directly on Mobile (4G/Wi-Fi) or PC
 * Allows switching between Inline/Interactive View, Code View, or Fullscreen New Tab.
 */
function buildInteractiveShellHtml({ title, rawUrl, code, kind }) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
      background: #0b0b0d;
      color: #f5f5f7;
      display: flex;
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(11, 11, 13, 0.8);
      backdrop-filter: blur(20px) saturate(140%);
      -webkit-backdrop-filter: blur(20px) saturate(140%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 10px;
      flex-wrap: wrap;
    }
    .brand {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: #f5f5f7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    button, a.btn {
      min-height: 32px;
      background: rgba(255, 255, 255, 0.05);
      color: #f5f5f7;
      border: 1px solid rgba(255, 255, 255, 0.095);
      border-radius: 8px;
      padding: 5px 10px;
      font-size: 12.5px;
      font-weight: 500;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      transition: background 0.15s ease;
    }
    button:hover, a.btn:hover { background: rgba(255, 255, 255, 0.09); }
    button.active, a.btn.primary {
      background: #f5f5f7;
      border-color: #f5f5f7;
      color: #0b0b0d;
    }
    main {
      flex: 1;
      position: relative;
      display: flex;
      justify-content: center;
      background: #0b0b0d;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: #0b0b0d;
      transition: max-width 0.2s ease;
    }
    pre#code-view {
      display: none;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 16px;
      overflow: auto;
      background: #0b0b0d;
      color: #e4e4e7;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      line-height: 1.55;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">${escapeHtml(title)}</div>
    <div class="actions">
      <button type="button" id="btn-preview" class="active">Preview</button>
      ${code ? `<button type="button" id="btn-code">Source</button>` : ""}
      <button type="button" id="btn-mobile">Mobile View</button>
      <button type="button" id="btn-reload">Reload</button>
      <a class="btn primary" href="${escapeHtml(rawUrl)}" target="_blank" rel="noopener">Open Fullscreen</a>
    </div>
  </header>
  <main>
    <iframe id="live-frame" src="${escapeHtml(rawUrl)}" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"></iframe>
    ${code ? `<pre id="code-view"><code>${escapeHtml(code)}</code></pre>` : ""}
  </main>
  <script>
    const frame = document.getElementById("live-frame");
    const codeView = document.getElementById("code-view");
    const btnPreview = document.getElementById("btn-preview");
    const btnCode = document.getElementById("btn-code");
    const btnMobile = document.getElementById("btn-mobile");
    const btnReload = document.getElementById("btn-reload");
    let mobileMode = false;

    if (btnCode && codeView) {
      btnPreview.addEventListener("click", () => {
        frame.style.display = "block";
        codeView.style.display = "none";
        btnPreview.classList.add("active");
        btnCode.classList.remove("active");
      });
      btnCode.addEventListener("click", () => {
        frame.style.display = "none";
        codeView.style.display = "block";
        btnCode.classList.add("active");
        btnPreview.classList.remove("active");
      });
    }
    btnMobile.addEventListener("click", () => {
      mobileMode = !mobileMode;
      frame.style.maxWidth = mobileMode ? "412px" : "100%";
      btnMobile.classList.toggle("active", mobileMode);
    });
    btnReload.addEventListener("click", () => {
      frame.src = frame.src;
    });
  </script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function proxyHttpRequest(req, res, targetOrigin, stripPrefix = "", injectBridge = false) {
  try {
    const targetUrl = new URL(targetOrigin);
    const isHttps = targetUrl.protocol === "https:";
    const client = isHttps ? https : http;
    const rewrittenPath = stripPrefix && req.url.startsWith(stripPrefix)
      ? req.url.slice(stripPrefix.length) || "/"
      : req.url;

    const headers = { ...req.headers, host: targetUrl.host };
    if (injectBridge) {
      // Request uncompressed HTML so we can cleanly append iframe-bridge.js before </body>
      delete headers["accept-encoding"];
    }

    const proxyReq = client.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: rewrittenPath,
        method: req.method,
        headers
      },
      (proxyRes) => {
        const resHeaders = { ...proxyRes.headers };
        // Remove restrictive framing headers so mobile/PC iframe works smoothly
        delete resHeaders["x-frame-options"];
        delete resHeaders["content-security-policy"];

        const contentType = String(resHeaders["content-type"] || "");
        if (injectBridge && contentType.includes("text/html")) {
          const chunks = [];
          proxyRes.on("data", (c) => chunks.push(c));
          proxyRes.on("end", () => {
            let html = Buffer.concat(chunks).toString("utf8");
            const tag = `<script src="/__agy_bridge__/iframe-bridge.js" defer></script>`;
            if (html.includes("</body>")) {
              html = html.replace("</body>", `${tag}</body>`);
            } else {
              html += tag;
            }
            delete resHeaders["content-length"];
            res.writeHead(proxyRes.statusCode || 200, resHeaders);
            res.end(html, "utf8");
          });
        } else {
          res.writeHead(proxyRes.statusCode || 200, resHeaders);
          proxyRes.pipe(res);
        }
      }
    );

    proxyReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Gateway Proxy Error (${targetOrigin}): ${err.message}`);
    });
    req.pipe(proxyReq);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Internal Proxy Error: ${err.message}`);
  }
}

async function ensureGatewayServer() {
  if (serverStarted) return gatewayPort;

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || "/", `http://localhost:${gatewayPort}`);
    const pathname = parsedUrl.pathname;
    const clientIp = getClientIp(req);

    // Reload shared state & security credentials so CLI & MCP tools stay in sync
    loadState();
    loadOrInitSecurity(false);

    // 0a. Public Health/Latency Ping (zero sensitive data — used solely for Smart Auto-Routing)
    if (pathname === "/__agy_ping__") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store"
      });
      res.end('{"ok":true}');
      return;
    }

    // 0b. Public Login Endpoint (PIN or Access Token) with Brute-Force Rate Limiting
    if (pathname === "/__agy_login__") {
      if (req.method === "GET") {
        const nextUrl = parsedUrl.searchParams.get("next") || "/";
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(buildLockScreenHtml("", nextUrl));
        return;
      }
      if (req.method === "POST") {
        if (isRateLimited(clientIp)) {
          res.writeHead(429, { "Content-Type": "text/html; charset=utf-8" });
          res.end(buildLockScreenHtml("Too many failed attempts. Try again in 5 minutes.", "/"));
          return;
        }
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          const form = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
          const secret = (form.get("secret") || "").trim();
          const nextUrl = form.get("next") || "/";
          const safeNext = nextUrl.startsWith("/") ? nextUrl : "/";
          if (safeEqual(secret, securityConfig.accessToken) || safeEqual(secret, securityConfig.pin)) {
            failedLoginAttempts.delete(clientIp);
            res.writeHead(302, {
              "Set-Cookie": buildCookieHeader(req),
              Location: safeNext
            });
            res.end();
          } else {
            recordFailedLogin(clientIp);
            res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
            res.end(buildLockScreenHtml("Incorrect PIN. Please try again.", safeNext));
          }
        });
        return;
      }
    }

    // 0c. Smart One-Link Entry & Auto-Router (/__agy_go__?to=...&token=...)
    if (pathname === "/__agy_go__") {
      const targetPath = parsedUrl.searchParams.get("to") || "/";
      const safeTarget = targetPath.startsWith("/") ? targetPath : "/";
      const queryToken = parsedUrl.searchParams.get("token") || "";
      const isDirect = parsedUrl.searchParams.get("direct") === "1";

      const hasValidCookie = verifySessionCookie(req.headers.cookie);
      const hasValidToken =
        safeEqual(queryToken, securityConfig.accessToken) ||
        safeEqual(queryToken, securityConfig.pin);

      if (!hasValidCookie && !hasValidToken) {
        if (queryToken) recordFailedLogin(clientIp);
        const returnTo = `/__agy_go__?to=${encodeURIComponent(safeTarget)}`;
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
        res.end(buildLockScreenHtml(queryToken ? "Invalid or expired link. Enter your PIN to continue." : "", returnTo));
        return;
      }

      const headers = {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      };
      if (hasValidToken) {
        headers["Set-Cookie"] = buildCookieHeader(req);
      }

      if (isDirect) {
        // Already switched to fastest route — redirect cleanly so ?token= disappears from URL bar
        res.writeHead(302, {
          ...(hasValidToken ? { "Set-Cookie": buildCookieHeader(req) } : {}),
          Location: safeTarget
        });
        res.end();
        return;
      }

      res.writeHead(200, headers);
      res.end(
        buildSmartRouterHtml({
          targetPath: safeTarget,
          token: hasValidToken ? queryToken : securityConfig.accessToken
        })
      );
      return;
    }

    // 0d. Global Authentication Gatekeeper for EVERY protected route
    const queryToken = parsedUrl.searchParams.get("token") || "";
    const headerToken = String(req.headers["x-agy-token"] || "");
    const authedByCookie = verifySessionCookie(req.headers.cookie);
    const authedByToken =
      safeEqual(queryToken, securityConfig.accessToken) ||
      safeEqual(queryToken, securityConfig.pin) ||
      safeEqual(headerToken, securityConfig.accessToken) ||
      safeEqual(headerToken, securityConfig.pin);

    if (!authedByCookie && !authedByToken) {
      if (queryToken || headerToken) recordFailedLogin(clientIp);
      const isApi =
        pathname.startsWith("/__agy_sync__/") ||
        pathname === "/__agy_status__" ||
        String(req.headers.accept || "").includes("application/json");
      if (isApi) {
        res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ ok: false, error: "unauthorized", message: "Access denied. Valid session or token required." }));
      } else {
        res.writeHead(401, { "Content-Type": "text/html; charset=utf-8" });
        res.end(buildLockScreenHtml("", req.url || "/"));
      }
      return;
    }

    // If user passed ?token=... directly on a protected page, set HttpOnly cookie and redirect to clean URL
    if (queryToken && authedByToken && req.method === "GET") {
      parsedUrl.searchParams.delete("token");
      const cleanUrl = parsedUrl.pathname + (parsedUrl.search ? parsedUrl.search : "");
      res.writeHead(302, {
        "Set-Cookie": buildCookieHeader(req),
        Location: cleanUrl
      });
      res.end();
      return;
    }

    // 0e. Rotate Credentials & Revoke All Logged-in Devices (Authenticated POST)
    if (pathname === "/__agy_rotate__" && req.method === "POST") {
      loadOrInitSecurity(true);
      // Kick all active SSE peers across PC and Mobile immediately!
      for (const [rId, peers] of syncPeers.entries()) {
        for (const peerRes of peers) {
          try {
            peerRes.write(`data: ${JSON.stringify({ forceLogout: true })}\n\n`);
            peerRes.end();
          } catch (_) {}
        }
        peers.clear();
      }
      const isHttps =
        req.headers["x-forwarded-proto"] === "https" ||
        String(req.headers.host || "").toLowerCase().includes("trycloudflare.com") ||
        String(req.headers.host || "").toLowerCase().includes("lhr.life");
      const clearCookie = `agy_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isHttps ? "; Secure" : ""}`;
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": clearCookie,
        "Cache-Control": "no-store"
      });
      res.end(
        buildLockScreenHtml(
          `PIN rotated and all devices signed out. New PIN: ${securityConfig.pin}`,
          "/"
        )
      );
      return;
    }

    // 1. Serve Non-Invasive Bridge & Real-Time Sync Scripts
    if (pathname === "/__agy_bridge__/iframe-bridge.js") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(fs.readFileSync(BRIDGE_SCRIPT_PATH, "utf8"));
      return;
    }
    if (pathname === "/__agy_bridge__/iframe-sync.js") {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(fs.readFileSync(SYNC_SCRIPT_PATH, "utf8"));
      return;
    }

    // 1b. Real-Time Bidirectional Sync Endpoints (PC <-> Mobile Phone)
    if (pathname.startsWith("/__agy_sync__/")) {
      const parts = pathname.split("/").filter(Boolean); // ["__agy_sync__", roomId, "events"?]
      const roomId = decodeURIComponent(parts[1] || "global");
      const sub = parts[2];

      if (req.method === "OPTIONS") {
        res.writeHead(204, {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        });
        res.end();
        return;
      }

      if (sub === "events" && req.method === "GET") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no"
        });
        if (!syncPeers.has(roomId)) syncPeers.set(roomId, new Set());
        const peers = syncPeers.get(roomId);
        peers.add(res);

        // Immediately push current persisted state + updated peer count to all connected devices
        broadcastRoom(roomId, { state: getRoomState(roomId), sender: null });

        const hb = setInterval(() => {
          try {
            res.write(": ping\n\n");
          } catch (_) {
            clearInterval(hb);
          }
        }, 20000);

        req.on("close", () => {
          clearInterval(hb);
          peers.delete(res);
          broadcastRoom(roomId, { state: null, sender: null });
        });
        return;
      }

      if (req.method === "GET") {
        const peers = syncPeers.get(roomId);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(
          JSON.stringify({
            roomId,
            peers: peers ? peers.size : 0,
            state: getRoomState(roomId)
          })
        );
        return;
      }

      if (req.method === "POST") {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
            const state = getRoomState(roomId);
            if (body.patch?.fields && typeof body.patch.fields === "object") {
              state.fields = { ...(state.fields || {}), ...body.patch.fields };
            }
            if (body.patch?.custom && typeof body.patch.custom === "object") {
              state.custom = { ...(state.custom || {}), ...body.patch.custom };
            }
            state.updatedAt = new Date().toISOString();
            saveState();
            broadcastRoom(roomId, { state, sender: body.clientId || null });
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: true, state }));
          } catch (err) {
            res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ ok: false, error: err.message }));
          }
        });
        return;
      }
    }

    // 2. Serve Status & Dashboard
    if (pathname === "/__agy_status__") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(
        JSON.stringify(
          {
            ok: true,
            gatewayPort,
            lanIp: getLanIp(),
            publicTunnelUrl,
            upstreamUiOrigin,
            artifacts: Array.from(artifacts.values()).map((a) => ({
              id: a.id,
              title: a.title,
              type: a.type,
              createdAt: a.createdAt
            })),
            appRoutes: Array.from(appRoutes.values())
          },
          null,
          2
        )
      );
      return;
    }

    // 3b. Serve Authenticated Local Media (Images w/ Preview or Full-Res + Audio/Video HTTP Range Streaming)
    if (pathname.startsWith("/__agy_media__/")) {
      const mediaId = pathname.split("/")[2];
      const item = mediaFiles.get(mediaId);
      if (!item || !fs.existsSync(item.filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Media file not found.");
        return;
      }
      const mode = parsedUrl.searchParams.get("mode") || "full";
      let servePath = item.filePath;
      let serveMime = item.mime;
      if (mode === "preview" && item.kind === "image") {
        const previewPath = ensurePreviewImage(item);
        if (previewPath !== item.filePath && fs.existsSync(previewPath)) {
          servePath = previewPath;
          serveMime = "image/jpeg";
        }
      }
      const stat = fs.statSync(servePath);
      const total = stat.size;
      const range = req.headers.range;
      if (range) {
        const m = range.match(/bytes=(\d+)-(\d*)/);
        const start = m ? parseInt(m[1], 10) : 0;
        const end = m && m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Content-Type": serveMime,
          "Cache-Control": "private, max-age=3600"
        });
        fs.createReadStream(servePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          "Accept-Ranges": "bytes",
          "Content-Length": total,
          "Content-Type": serveMime,
          "Cache-Control": "private, max-age=3600"
        });
        fs.createReadStream(servePath).pipe(res);
      }
      return;
    }

    // 3. Serve Claude-style Artifacts: /__agy_artifact__/<id> (Clean Full-Screen by default)
    if (pathname.startsWith("/__agy_artifact__/")) {
      const id = pathname.split("/")[2];
      const artifact = artifacts.get(id);
      if (!artifact) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Artifact not found.");
        return;
      }
      const isShell = parsedUrl.searchParams.get("shell") === "1";
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (isShell) {
        res.end(
          buildInteractiveShellHtml({
            title: artifact.title,
            rawUrl: `/__agy_artifact__/${artifact.id}?raw=1`,
            code: artifact.code,
            kind: artifact.type
          })
        );
      } else {
        res.end(buildArtifactRawHtml(artifact));
      }
      return;
    }

    // 4. Serve Reverse-Proxied Local Web Apps: /__agy_app__/<id>/*
    if (pathname.startsWith("/__agy_app__/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const route = appRoutes.get(id);
      if (!route) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Published web app route not found.");
        return;
      }
      activeAppOrigin = route.targetOrigin;
      const isShell = parsedUrl.searchParams.get("shell") === "1";
      if (isShell) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          buildInteractiveShellHtml({
            title: route.title,
            rawUrl: `/__agy_app__/${route.id}/`,
            code: null,
            kind: "web-app"
          })
        );
        return;
      }
      proxyHttpRequest(req, res, route.targetOrigin, `/__agy_app__/${id}`, false);
      return;
    }

    // 4b. Serve Built Static Website Folders: /__agy_site__/<id>/*
    if (pathname.startsWith("/__agy_site__/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const site = staticSites.get(id);
      if (!site || !fs.existsSync(site.rootDir)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Static site not found.");
        return;
      }
      const rel = decodeURIComponent(parts.slice(3).join("/") || "index.html");
      const safeRel = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
      let filePath = path.join(site.rootDir, safeRel);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(site.rootDir, "index.html");
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("File not found in static site.");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const staticMimes = {
        ...MIME_MAP,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".ttf": "font/ttf"
      };
      res.writeHead(200, { "Content-Type": staticMimes[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // 4c. Smart Root-Asset Fallback for Next.js / Vite / React / Flask / Gradio Local Web Apps
    // Ensures root-relative paths like /_next/*, /assets/*, /@vite/*, /api/* work seamlessly over 4G/Wi-Fi!
    if (pathname !== "/" && !pathname.startsWith("/__agy_") && activeAppOrigin) {
      proxyHttpRequest(req, res, activeAppOrigin, "", false);
      return;
    }

    // 5. If upstream Antigravity Web Remote Control UI is configured, proxy it transparently + inject iframe-bridge.js
    if (upstreamUiOrigin) {
      proxyHttpRequest(req, res, upstreamUiOrigin, "", true);
      return;
    }

    // 6. Default Landing Portal (Apple HIG Inset Grouped List — Zero AI Slop)
    const netInfo = detectNetworkMode(req);
    const netLabel =
      netInfo.mode === "localhost"
        ? "Localhost"
        : netInfo.mode === "wifi_lan"
          ? "Wi-Fi LAN"
          : "Private HTTPS";
    const chevronSvg = `<svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>`;
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    const artifactItems = Array.from(artifacts.values())
      .map(
        (a) =>
          `<a class="row-link" href="/__agy_artifact__/${a.id}" data-agy-ignore="1"><span class="row-title">${escapeHtml(a.title)}</span><span class="row-right"><span class="meta">${escapeHtml(a.type)}</span>${chevronSvg}</span></a>`
      )
      .join("");
    const appItems = [
      ...Array.from(appRoutes.values()).map(
        (r) =>
          `<a class="row-link" href="/__agy_app__/${r.id}/" data-agy-ignore="1"><span class="row-title">${escapeHtml(r.title)}</span><span class="row-right"><span class="meta">${escapeHtml(r.targetOrigin)}</span>${chevronSvg}</span></a>`
      ),
      ...Array.from(staticSites.values()).map(
        (s) =>
          `<a class="row-link" href="/__agy_site__/${s.id}/" data-agy-ignore="1"><span class="row-title">${escapeHtml(s.title)}</span><span class="row-right"><span class="meta">Static</span>${chevronSvg}</span></a>`
      )
    ].join("");

    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>Antigravity</title>
  <style>
    :root {
      --canvas: #0b0b0d;
      --surface: rgba(255, 255, 255, 0.045);
      --surface-hover: rgba(255, 255, 255, 0.075);
      --border: rgba(255, 255, 255, 0.095);
      --hairline: rgba(255, 255, 255, 0.075);
      --ink-1: #f5f5f7;
      --ink-2: #a1a1a6;
      --ink-3: #6e6e73;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100dvh;
      padding: 28px 16px 56px;
      background: var(--canvas);
      color: var(--ink-1);
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .shell { max-width: 520px; margin: 0 auto; }
    .head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 24px;
      padding: 0 16px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      line-height: 1.25;
      letter-spacing: -0.025em;
      color: var(--ink-1);
    }
    .net {
      font-size: 13px;
      line-height: 1.3;
      color: var(--ink-3);
    }
    .section { margin-bottom: 24px; }
    .section:last-child { margin-bottom: 0; }
    .section-label {
      font-size: 13px;
      font-weight: 500;
      line-height: 1.3;
      color: var(--ink-2);
      margin: 0 0 8px;
      padding: 0 16px;
    }
    .group {
      background: var(--surface);
      backdrop-filter: blur(24px) saturate(140%);
      -webkit-backdrop-filter: blur(24px) saturate(140%);
      border: 1px solid var(--border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      overflow: hidden;
    }
    .row-link, .row-static {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 52px;
      padding: 12px 16px;
      text-decoration: none;
      color: var(--ink-1);
      font-size: 15px;
      line-height: 1.35;
      font-weight: 400;
      transition: background 0.15s ease;
    }
    .row-static { flex-wrap: wrap; row-gap: 10px; }
    .row-link:hover { background: var(--surface-hover); }
    .row-link + .row-link,
    .row-static + .row-static {
      border-top: 1px solid var(--hairline);
    }
    .row-title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .row-right {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .meta {
      font-size: 13.5px;
      line-height: 1.35;
      color: var(--ink-3);
    }
    .chev { color: var(--ink-3); display: block; }
    .empty {
      padding: 16px;
      font-size: 14px;
      line-height: 1.4;
      color: var(--ink-3);
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 36px;
      padding: 0 14px;
      border-radius: 9px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.06);
      color: var(--ink-1);
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .btn:hover { background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.18); }
  </style>
</head>
<body>
  <main class="shell">
    <header class="head">
      <h1>Antigravity</h1>
      <span class="net">${escapeHtml(netLabel)}</span>
    </header>
    <section class="section">
      <div class="section-label">Workspaces</div>
      <div class="group">${artifactItems || '<div class="empty">No workspaces published yet.</div>'}</div>
    </section>
    <section class="section">
      <div class="section-label">Websites</div>
      <div class="group">${appItems || '<div class="empty">No local websites published yet.</div>'}</div>
    </section>
    <section class="section">
      <div class="section-label">Security</div>
      <div class="group">
        <div class="row-static">
          <span class="meta">Active session</span>
          <form method="POST" action="/__agy_rotate__" style="margin:0">
            <button type="submit" class="btn">Rotate PIN &amp; Sign Out All</button>
          </form>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`);
  });

  await new Promise((resolve) => {
    server.on("error", () => {
      gatewayPort += 1;
      server.listen(gatewayPort, "0.0.0.0", () => resolve());
    });
    server.listen(gatewayPort, "0.0.0.0", () => resolve());
  });

  serverStarted = true;
  saveState();
  return gatewayPort;
}

function findCloudflaredBinary() {
  const localBin = path.join(
    __dirname,
    "bin",
    process.platform === "win32" ? "cloudflared.exe" : "cloudflared"
  );
  if (fs.existsSync(localBin)) return localBin;
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    const res = spawnSync(cmd, ["cloudflared"], { encoding: "utf8", windowsHide: true });
    if (res.status === 0 && res.stdout) {
      const first = res.stdout.trim().split(/\r?\n/)[0]?.trim();
      if (first) return first;
    }
  } catch (_) {}
  return null;
}

/**
 * Starts a stable public HTTPS tunnel (prefers Cloudflare Quick Tunnel via bundled
 * or system-installed cloudflared; falls back to OpenSSH localhost.run) with auto-reconnect.
 */
async function ensurePublicTunnel() {
  if (publicTunnelUrl && tunnelProcess && !tunnelProcess.killed && tunnelProcess.exitCode === null) {
    return publicTunnelUrl;
  }
  await ensureGatewayServer();

  const cloudflaredBin = findCloudflaredBinary();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (url) => {
      if (settled) return;
      settled = true;
      if (url) {
        publicTunnelUrl = url;
        saveState();
      }
      resolve(url);
    };

    try {
      if (cloudflaredBin) {
        tunnelProcess = spawn(
          cloudflaredBin,
          ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${gatewayPort}`],
          { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
        );
      } else {
        const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
        const sshArgs = [
          "-T",
          "-o",
          "StrictHostKeyChecking=no",
          "-o",
          `UserKnownHostsFile=${nullDevice}`,
          "-o",
          "BatchMode=yes",
          "-o",
          "ServerAliveInterval=30",
          "-R",
          `80:127.0.0.1:${gatewayPort}`,
          "nokey@localhost.run"
        ];
        tunnelProcess = spawn("ssh", sshArgs, {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true
        });
      }

      const onData = (chunk) => {
        const text = chunk.toString("utf8");
        const cfMatch = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (cfMatch) {
          finish(cfMatch[0]);
          return;
        }
        const lhrMatch = text.match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
        if (lhrMatch) {
          finish(lhrMatch[0]);
        }
      };

      tunnelProcess.stdout.on("data", onData);
      tunnelProcess.stderr.on("data", onData);
      tunnelProcess.on("exit", () => {
        publicTunnelUrl = null;
        // Auto-reconnect watchdog in daemon mode if tunnel ever drops
        setTimeout(() => {
          ensurePublicTunnel().catch(() => {});
        }, 3000);
      });
    } catch (_) {
      finish(null);
    }

    // Timeout after 15 seconds if offline or blocked
    setTimeout(() => finish(publicTunnelUrl), 15000);
  });
}

function buildSmartLinks(relativePath) {
  const goPath = `/__agy_go__?to=${encodeURIComponent(relativePath)}`;
  const lanIp = getLanIp();
  const baseOrigin = publicTunnelUrl || `http://${lanIp}:${gatewayPort}`;
  // ONE clean PIN-protected Smart Link (never exposes raw token in URL; prompts 6-digit PIN once per device!)
  const smartUrl = `${baseOrigin}${goPath}#agy-iframe`;
  const localUrl = `http://localhost:${gatewayPort}${goPath}#agy-iframe`;
  const wifiUrl = `http://${lanIp}:${gatewayPort}${goPath}#agy-iframe`;
  const mobile4gUrl = publicTunnelUrl ? `${publicTunnelUrl}${goPath}#agy-iframe` : null;
  return { smartUrl, localUrl, wifiUrl, mobile4gUrl, pin: securityConfig.pin };
}

// ============================================================================
// MCP Tool Definitions & Handlers
// ============================================================================
const TOOLS = [
  {
    name: "publish_html_artifact",
    description:
      "Create and publish an interactive HTML/CSS/JS or React/JSX Artifact (Claude Artifact style) with real-time PC <-> Mobile bidirectional sync and return ONE Smart Secure Link that auto-routes Localhost vs Wi-Fi/4G.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Human-readable title for the artifact" },
        code: { type: "string", description: "Complete HTML document or React/JSX component source code" },
        type: { type: "string", enum: ["html", "react"], description: "'html' or 'react' (JSX + Tailwind)" },
        enable_4g_tunnel: { type: "boolean", description: "Auto-create HTTPS tunnel for 4G/Wi-Fi (default: true)" }
      },
      required: ["title", "code"]
    }
  },
  {
    name: "publish_task_layout",
    description:
      "Automatically build and publish a clean, Apple-minimalist monochromatic glassmorphism workspace tailored to the user's exact task type: 'photo-triage' (culling/filtering photos with notes), 'media-review' (video/audio/film review with 1-tap timestamp notes), 'notes-pad' (synced notes & checklist), 'compare-view' (A/B visual or text comparison), or 'viewer-dashboard' (KPI & report viewer).",
    inputSchema: {
      type: "object",
      properties: {
        preset: {
          type: "string",
          enum: ["photo-triage", "media-review", "notes-pad", "compare-view", "viewer-dashboard"],
          description: "Task-specific adaptive layout preset"
        },
        title: { type: "string", description: "Workspace title" },
        paths: {
          type: "array",
          items: { type: "string" },
          description: "For photo-triage or media-review: local file or folder paths"
        },
        default_quality: {
          type: "string",
          enum: ["preview", "full"],
          description: "For photo-triage: 'preview' (fast 4G 960px) or 'full'"
        },
        notes: { type: "string", description: "For notes-pad or viewer-dashboard: initial text/content" },
        tasks: {
          type: "array",
          items: { type: "string" },
          description: "For notes-pad: initial checklist items"
        },
        compare_a: { type: "object", description: "For compare-view: { label, imagePath?, text? }" },
        compare_b: { type: "object", description: "For compare-view: { label, imagePath?, text? }" },
        metrics: {
          type: "array",
          items: { type: "object" },
          description: "For viewer-dashboard: [{ label, value }]"
        },
        enable_4g_tunnel: { type: "boolean", description: "Auto-create Cloudflare HTTPS tunnel (default: true)" }
      },
      required: ["preset", "title"]
    }
  },
  {
    name: "publish_static_site",
    description:
      "Publish a local static website folder (e.g., dist/, build/, out/, or folder containing index.html) behind the PIN-protected Smart Gateway for remote PC/iPad/Mobile viewing.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Website name" },
        directory: { type: "string", description: "Absolute path to the website directory containing index.html" },
        enable_4g_tunnel: { type: "boolean", description: "Auto-create Cloudflare HTTPS tunnel (default: true)" }
      },
      required: ["title", "directory"]
    }
  },
  {
    name: "publish_media_gallery",
    description:
      "Publish local images, videos, or audio files (from a folder or file list) into a secure Remote Media Review Studio Artifact where the user can view (Fast 4G Preview or Full Resolution), play/seek audio & video, and Approve/Reject/Comment from their phone with real-time PC <-> Phone sync.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the media review session" },
        paths: {
          type: "array",
          items: { type: "string" },
          description: "Array of absolute file paths or folder paths containing images, videos, or audio files"
        },
        default_quality: {
          type: "string",
          enum: ["preview", "full"],
          description: "'preview' (resized fast load for 4G) or 'full' (original resolution). Default: 'preview'"
        },
        enable_4g_tunnel: { type: "boolean", description: "Auto-create HTTPS tunnel for 4G/Wi-Fi (default: true)" }
      },
      required: ["title", "paths"]
    }
  },
  {
    name: "get_review_decisions",
    description:
      "Read the user's real-time Approve/Reject/Comment decisions synced from any published Media Review Gallery or Interactive Artifact.",
    inputSchema: {
      type: "object",
      properties: {
        artifact_id: { type: "string", description: "The artifact ID returned by publish_media_gallery or publish_html_artifact" }
      },
      required: ["artifact_id"]
    }
  },
  {
    name: "publish_web_app",
    description:
      "Publish an existing local web application (e.g., http://localhost:3000) through the secure Smart Gateway and return ONE auto-routing Smart Link.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Name of the web application" },
        target_url: { type: "string", description: "Local URL of the running web app, e.g. http://localhost:3000" },
        enable_4g_tunnel: { type: "boolean", description: "Auto-create HTTPS tunnel for 4G/Wi-Fi (default: true)" }
      },
      required: ["title", "target_url"]
    }
  },
  {
    name: "rotate_security_credentials",
    description:
      "Rotate the Gateway Access Token and 6-digit PIN, immediately revoking and logging out all previously authenticated devices.",
    inputSchema: {
      type: "object",
      properties: {
        custom_pin: { type: "string", description: "Optional custom PIN (leave empty to auto-generate 6-digit PIN)" }
      }
    }
  },
  {
    name: "list_published_previews",
    description: "List all active artifacts, media galleries, web apps, and Smart Secure Links.",
    inputSchema: { type: "object", properties: {} }
  }
];

function collectMediaPaths(inputPaths = []) {
  const results = [];
  for (const p of inputPaths) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(abs)) {
        const full = path.join(abs, entry);
        if (fs.statSync(full).isFile()) {
          const { kind } = classifyMedia(full);
          if (kind === "image" || kind === "video" || kind === "audio") {
            const item = registerLocalMedia(full);
            if (item) results.push(item);
          }
        }
      }
    } else if (stat.isFile()) {
      const item = registerLocalMedia(abs);
      if (item) results.push(item);
    }
  }
  return results;
}

async function handleToolCall(name, args = {}) {
  await ensureGatewayServer();

  if (name === "publish_html_artifact") {
    const id = crypto.randomBytes(4).toString("hex");
    const artifact = {
      id,
      title: args.title || `Artifact ${id}`,
      type: args.type === "react" ? "react" : "html",
      code: args.code || "",
      createdAt: new Date().toISOString()
    };
    artifacts.set(id, artifact);
    if (args.enable_4g_tunnel !== false) {
      await ensurePublicTunnel();
    }
    saveState();

    const links = buildSmartLinks(`/__agy_artifact__/${id}`);
    return {
      content: [
        {
          type: "text",
          text: [
            `Published interactive artifact: **${artifact.title}** (ID: \`${id}\`)`,
            ``,
            `- **Smart Link:** [${artifact.title}](${links.smartUrl})`,
            `- **PIN:** \`${links.pin}\``
          ].join("\n")
        }
      ]
    };
  }

  if (name === "publish_task_layout") {
    const id = crypto.randomBytes(4).toString("hex");
    let html = "";
    const preset = args.preset;
    const title = args.title || `Workspace ${id}`;
    if (preset === "photo-triage") {
      const items = collectMediaPaths(args.paths || []);
      for (const m of items) if (m.kind === "image") ensurePreviewImage(m);
      html = buildPhotoTriageHtml(title, items, args.default_quality === "full" ? "full" : "preview");
    } else if (preset === "media-review") {
      const items = collectMediaPaths(args.paths || []);
      html = buildMediaReviewTimelineHtml(title, items);
    } else if (preset === "notes-pad") {
      html = buildNotesPadHtml(title, args.notes || "", args.tasks || []);
    } else if (preset === "compare-view") {
      const prepSide = (side = {}) => {
        const out = { label: side.label || "", text: side.text || "", imageUrl: side.imageUrl || "" };
        if (side.imagePath) {
          const m = registerLocalMedia(side.imagePath);
          if (m) out.imageUrl = `/__agy_media__/${m.id}?mode=full`;
        }
        return out;
      };
      html = buildCompareViewHtml(title, prepSide(args.compare_a), prepSide(args.compare_b));
    } else {
      html = buildViewerDashboardHtml(title, args.metrics || [], args.notes || "");
    }

    artifacts.set(id, { id, title, type: preset, code: html, createdAt: new Date().toISOString() });
    if (args.enable_4g_tunnel !== false) await ensurePublicTunnel();
    saveState();
    const links = buildSmartLinks(`/__agy_artifact__/${id}`);
    return {
      content: [
        {
          type: "text",
          text: [
            `Published workspace: **${title}** (Preset: \`${preset}\`, ID: \`${id}\`)`,
            `- **Smart Link:** [${title}](${links.smartUrl})`,
            `- **PIN:** \`${links.pin}\``
          ].join("\n")
        }
      ]
    };
  }

  if (name === "publish_static_site") {
    const absDir = path.resolve(args.directory || "");
    if (!fs.existsSync(absDir) || !fs.statSync(absDir).isDirectory()) {
      throw new Error(`Directory not found: ${absDir}`);
    }
    const id = crypto.randomBytes(4).toString("hex");
    staticSites.set(id, { id, title: args.title || path.basename(absDir), rootDir: absDir, createdAt: new Date().toISOString() });
    if (args.enable_4g_tunnel !== false) await ensurePublicTunnel();
    saveState();
    const links = buildSmartLinks(`/__agy_site__/${id}/`);
    return {
      content: [
        {
          type: "text",
          text: [
            `Published static site: **${args.title}** (\`${absDir}\`)`,
            `- **Smart Link:** [${args.title}](${links.smartUrl})`,
            `- **PIN:** \`${links.pin}\``
          ].join("\n")
        }
      ]
    };
  }

  if (name === "publish_media_gallery") {
    const mediaItems = collectMediaPaths(args.paths || []);
    if (mediaItems.length === 0) {
      throw new Error("No valid image, video, or audio files found in the provided paths.");
    }
    const id = crypto.randomBytes(4).toString("hex");
    const quality = args.default_quality === "full" ? "full" : "preview";
    for (const m of mediaItems) {
      if (m.kind === "image") ensurePreviewImage(m);
    }
    const html = buildMediaReviewGalleryHtml(args.title || "Media Review", mediaItems, quality);
    const artifact = {
      id,
      title: args.title || `Media Review (${mediaItems.length} files)`,
      type: "html",
      code: html,
      mediaIds: mediaItems.map((m) => m.id),
      createdAt: new Date().toISOString()
    };
    artifacts.set(id, artifact);
    if (args.enable_4g_tunnel !== false) {
      await ensurePublicTunnel();
    }
    saveState();

    const links = buildSmartLinks(`/__agy_artifact__/${id}`);
    return {
      content: [
        {
          type: "text",
          text: [
            `Published media gallery (**${mediaItems.length} files**, mode: \`${quality}\`, ID: \`${id}\`)`,
            `- **Smart Link:** [${artifact.title}](${links.smartUrl})`,
            `- **PIN:** \`${links.pin}\``,
            `- Call \`get_review_decisions\` with \`artifact_id: "${id}"\` to read back approvals and notes.`
          ].join("\n")
        }
      ]
    };
  }

  if (name === "get_review_decisions") {
    const id = args.artifact_id;
    const state = getRoomState(id);
    const decisions = state.custom?.decisions || {};
    const resolved = {};
    for (const [mediaId, info] of Object.entries(decisions)) {
      const m = mediaFiles.get(mediaId);
      resolved[m ? m.filePath : mediaId] = {
        name: m ? m.name : mediaId,
        ...info
      };
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              artifactId: id,
              updatedAt: state.updatedAt,
              decisions: resolved,
              rawState: state
            },
            null,
            2
          )
        }
      ]
    };
  }

  if (name === "publish_web_app") {
    const id = crypto.randomBytes(4).toString("hex");
    const route = {
      id,
      title: args.title || `Web App ${id}`,
      targetOrigin: args.target_url,
      createdAt: new Date().toISOString()
    };
    appRoutes.set(id, route);
    if (args.enable_4g_tunnel !== false) {
      await ensurePublicTunnel();
    }
    saveState();

    const links = buildSmartLinks(`/__agy_app__/${id}/`);
    return {
      content: [
        {
          type: "text",
          text: [
            `Published local web app: **${route.title}** (\`${route.targetOrigin}\`)`,
            `- **Smart Link:** [${route.title}](${links.smartUrl})`,
            `- **PIN:** \`${links.pin}\``
          ].join("\n")
        }
      ]
    };
  }

  if (name === "rotate_security_credentials") {
    loadOrInitSecurity(true, args.custom_pin || null);
    for (const [, peers] of syncPeers.entries()) {
      for (const peerRes of peers) {
        try {
          peerRes.write(`data: ${JSON.stringify({ forceLogout: true })}\n\n`);
          peerRes.end();
        } catch (_) {}
      }
      peers.clear();
    }
    return {
      content: [
        {
          type: "text",
          text: [
            `Rotated security credentials and signed out all devices.`,
            `- **New PIN:** \`${securityConfig.pin}\``,
            `- **Smart Portal Link:** [Open Portal](${buildSmartLinks("/").smartUrl})`
          ].join("\n")
        }
      ]
    };
  }

  if (name === "list_published_previews") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              gatewayPort,
              lanIp: getLanIp(),
              publicTunnelUrl,
              pin: securityConfig.pin,
              portalSmartLink: buildSmartLinks("/").smartUrl,
              artifacts: Array.from(artifacts.values()).map((a) => ({
                id: a.id,
                title: a.title,
                type: a.type,
                smartUrl: buildSmartLinks(`/__agy_artifact__/${a.id}`).smartUrl
              })),
              appRoutes: Array.from(appRoutes.values()).map((r) => ({
                id: r.id,
                title: r.title,
                targetOrigin: r.targetOrigin,
                smartUrl: buildSmartLinks(`/__agy_app__/${r.id}/?shell=1`).smartUrl
              }))
            },
            null,
            2
          )
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ============================================================================
// Stdio JSON-RPC Loop
// ============================================================================
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch (_) {
      continue;
    }

    if (msg.method === "initialize") {
      sendRpc({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "agy-website-artifacts", version: "1.0.0" }
        }
      });
    } else if (msg.method === "notifications/initialized") {
      // No response needed for notification
    } else if (msg.method === "ping") {
      sendRpc({ jsonrpc: "2.0", id: msg.id, result: {} });
    } else if (msg.method === "tools/list") {
      sendRpc({
        jsonrpc: "2.0",
        id: msg.id,
        result: { tools: TOOLS }
      });
    } else if (msg.method === "tools/call") {
      try {
        const res = await handleToolCall(msg.params?.name, msg.params?.arguments || {});
        sendRpc({ jsonrpc: "2.0", id: msg.id, result: res });
      } catch (err) {
        sendRpc({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            isError: true,
            content: [{ type: "text", text: `Error: ${err.message}` }]
          }
        });
      }
    }
  }
});

function sendRpc(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

// Standalone Daemon Flag (--daemon) for immediate background execution
if (process.argv.includes("--daemon")) {
  (async () => {
    await ensureGatewayServer();
    await ensurePublicTunnel();
    console.log(
      JSON.stringify({
        status: "daemon_running",
        gatewayPort,
        lanIp: getLanIp(),
        publicTunnelUrl
      })
    );
    setInterval(() => {}, 60000);
  })();
}

