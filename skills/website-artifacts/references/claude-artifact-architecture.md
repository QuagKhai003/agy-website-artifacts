# Artifact Sandbox & Non-Invasive Bridge Architecture

How `agy-website-artifacts` delivers interactive web workspaces and Claude-style Artifacts in Google Antigravity without modifying any core Antigravity files:

## 1. Isolated Sandbox Runner (`/__agy_artifact__/<id>`)
- Renders standalone HTML/CSS/JS or single-file React 18 + JSX + Tailwind artifacts cleanly at full viewport width (`viewport-fit=cover`).
- Automatically injects:
  - Responsive baseline CSS and device classes (`agy-device-mobile`, `agy-device-tablet`, `agy-device-desktop`).
  - Real-time bidirectional sync client (`/__agy_bridge__/iframe-sync.js`) exposing `window.agySync` (SSE + persisted JSON state).
  - Automatic `ResizeObserver` height messaging (`AGY_ARTIFACT_HEIGHT`) for inline chat iframe embeds.

## 2. Optional Studio Shell (`/__agy_artifact__/<id>?shell=1`)
- Appending `?shell=1` wraps any artifact or proxied local web app in a clean monochrome toolbar offering:
  - **Preview / Source** toggle
  - **Mobile Viewport** width toggle (`412px`)
  - **Reload** and **Open Fullscreen** actions

## 3. Non-Invasive In-Chat Bridge (`iframe-bridge.js` & `browser-extension/`)
- When loaded via the optional unpacked Chrome/Edge extension (`browser-extension/`), any link containing `#agy-iframe`, `/__agy_artifact__/`, or `/__agy_app__/` is lazily enhanced with zero overhead on regular pages:
  - Click the link (or **Preview**) to expand an inline sandboxed `<iframe>` or slide-up drawer directly inside the browser tab.
  - Click **New Tab** to open in a dedicated full-screen tab.
