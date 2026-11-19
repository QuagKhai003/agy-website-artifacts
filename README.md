# agy-website-artifacts

A standalone, zero-dependency plugin for **Google Antigravity** that publishes live local web apps, static builds, task-adaptive review workspaces, and interactive HTML/React artifacts across **PC, iPad/Tablet, and Mobile Phone (Wi-Fi & 4G)** — without modifying any core Antigravity files or installing anything on your phone.

## Features

- **Live Websites & Static Builds:** Reverse-proxy running local dev servers (`Next.js`, `Vite`, `React`, `Flask`, `Gradio` with automatic root-asset fallback for `/_next/*`, `/assets/*`, `/@vite/*`, `/api/*`) or serve built static directories (`dist/`, `build/`).
- **5 Task-Adaptive Layouts:** Automatically adapts across Mobile (`<640px`), Tablet (`640–1024px`), and Desktop (`>1024px`):
  - `photo-triage` — Photo culling with Focus Mode, 4G Preview / Full Res toggle, filters, and per-photo synced notes.
  - `media-review` — Video & Audio review with HTTP Range streaming and 1-tap `mm:ss` timestamped feedback.
  - `notes-pad` — Two-way synced note editor and interactive checklist.
  - `compare-view` — Side-by-side A/B comparison on Desktop/iPad, segmented tab switcher on Mobile.
  - `viewer-dashboard` — Clean KPI strip, report reader, and synced feedback input.
- **Real-Time PC <-> Mobile Sync (`window.agySync`):** Server-Sent Events (SSE) keep form inputs, checklists, review verdicts, and custom state synchronized in real time and persisted across reloads.
- **1-Link Smart Auto-Routing:** Returns one clean URL that routes host PC traffic to `localhost` (`<180ms`) and remote devices over HTTPS.
- **Private Security Gateway:** 6-digit PIN + 256-bit access token, signed `HttpOnly` session cookie (7 days), brute-force rate limiting (5 failures -> 5-minute lockout), and 1-click **Rotate PIN & Sign Out All**.
- **Apple HIG Monochrome Glassmorphism:** Ships with [design-guidelines.md](skills/website-artifacts/references/design-guidelines.md) enforcing a calm neutral graphite palette, inset grouped surfaces with `1px` hairlines, aligned inputs/placeholders, and zero decorative clutter.

---

## Requirements

- **Node.js 18+** (uses built-in Node.js modules only — no `npm install` needed).
- **Google Antigravity CLI (`agy`)** or Antigravity IDE.
- **Git** (for Git-based installation and updates).
- **Optional (Recommended for multi-hour 4G tunnels):** [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) on your system `PATH` (or inside `server/bin/`). Falls back automatically to OpenSSH (`localhost.run`) if not installed.

---

## Installation

### 1. Direct Git Clone (Global — Available in All Workspaces)

**macOS / Linux:**
```bash
git clone https://github.com/QuagKhai003/agy-website-artifacts.git ~/.gemini/config/plugins/agy-website-artifacts
agy plugin validate ~/.gemini/config/plugins/agy-website-artifacts --strict
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/QuagKhai003/agy-website-artifacts.git "$env:USERPROFILE\.gemini\config\plugins\agy-website-artifacts"
agy plugin validate "$env:USERPROFILE\.gemini\config\plugins\agy-website-artifacts" --strict
```

Update anytime with:
```bash
git -C ~/.gemini/config/plugins/agy-website-artifacts pull --ff-only
```

### 2. Git Clone + Antigravity CLI

```bash
git clone https://github.com/QuagKhai003/agy-website-artifacts.git
agy plugin install ./agy-website-artifacts
```

### 3. Git Submodule (Per-Project / Team Repository)

Add the plugin to any repository so teammates receive it automatically when cloning:

```bash
git submodule add https://github.com/QuagKhai003/agy-website-artifacts.git .agents/plugins/agy-website-artifacts
```

### 4. Built-In Cross-Platform Installer (`install.mjs`)

```bash
# Install or update globally directly from GitHub
node install.mjs --git https://github.com/QuagKhai003/agy-website-artifacts.git

# Install into a specific project workspace
node install.mjs --git https://github.com/QuagKhai003/agy-website-artifacts.git --project /path/to/your-repo

# Install from an already cloned local directory
node install.mjs

# Uninstall
node install.mjs --uninstall
```

### 5. Validate Directly from GitHub Before Installing

```bash
agy plugin validate https://github.com/QuagKhai003/agy-website-artifacts --strict
```

---

## Optional Setup

### Stable Multi-Hour 4G HTTPS Tunnels (`cloudflared`)

- **Windows:** `winget install --id Cloudflare.cloudflared`
- **macOS:** `brew install cloudflared`
- **Linux:** [Cloudflare Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

The gateway automatically detects `cloudflared` on your `PATH` (or inside `server/bin/`). Without it, the plugin falls back to OpenSSH (`localhost.run`).

### Optional Desktop Browser Extension (Inline Chat Iframe)

If you use Google Antigravity in Chrome or Edge on Desktop and want `#agy-iframe` links to expand inline inside the chat tab:

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `browser-extension/` directory.

*(No app or extension is required on Mobile Phones or Tablets — simply open the Smart Link in Safari or Chrome.)*

---

## MCP Tools Reference

| Tool | Description |
| :--- | :--- |
| `publish_web_app` | Reverse-proxy a running local web app (`http://localhost:3000`, Vite, Next.js, Flask, Gradio) with root-asset fallback. |
| `publish_static_site` | Serve a built static website folder (`dist/`, `build/`, `index.html`). |
| `publish_task_layout` | Launch an adaptive workspace (`photo-triage`, `media-review`, `notes-pad`, `compare-view`, `viewer-dashboard`). |
| `publish_html_artifact` | Publish a custom HTML/CSS/JS or React/JSX + Tailwind artifact with `window.agySync`. |
| `publish_media_gallery` | Publish local images, video, or audio for remote review and approval. |
| `get_review_decisions` | Read back remote approvals, priorities, rejections, timestamps, and notes. |
| `rotate_security_credentials` | Generate a new 6-digit PIN & token and immediately sign out all active devices. |
| `list_published_previews` | List active workspaces, routes, and Smart Links. |

---

## Environment Variables

Configure under `mcp_config.json` -> `env` or export in your shell:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `AGY_IFRAME_PORT` | `4580` | Local HTTP gateway port (auto-increments if busy). |
| `AGY_DATA_DIR` | `${PLUGIN_DATA}` | Persistent storage for `.security.json`, `.runtime-state.json`, and `.media-cache/`. |
| `AGY_GATEWAY_PIN` | Random 6-digit | Optional fixed initial PIN on first run. |

---

## Security

- Every protected route requires a signed `HttpOnly` session cookie (unlocked via 6-digit PIN) or `x-agy-token` header.
- Login attempts are rate-limited (5 failures -> 5-minute IP lockout).
- Use **Rotate PIN & Sign Out All** in the Portal (or call `rotate_security_credentials`) to invalidate all active sessions and force-reload connected devices to the lock screen.
- Runtime credentials and state live in `${PLUGIN_DATA}` and are excluded from Git via `.gitignore`.

## License

[MIT](LICENSE)
