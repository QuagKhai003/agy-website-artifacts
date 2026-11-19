# agy-website-artifacts Plugin Rules

When the user asks to preview, publish, interact with, compare, take notes on, or remotely review ANY work (live local websites, built static sites, UI artifacts, photos, videos, audio, dashboards, or notes) across PC, iPad/Tablet, and Mobile Phone (Wi-Fi / 4G):

1. **Always pick the optimal `agy-website-artifacts` MCP tool for the task:**
   - **Live local website / dev server (`localhost:3000`, Vite, Next.js, Flask, Gradio, etc.):** `publish_web_app` (includes automatic root-asset fallback for `/_next/*`, `/assets/*`, `/@vite/*`, `/api/*`).
   - **Built static website folder (`dist/`, `build/`, `index.html`):** `publish_static_site`.
   - **Task-specific adaptive workspaces:** `publish_task_layout` with the matching preset:
     - `photo-triage` (photo culling & selection with notes, Focus Mode, 4G Preview / Full Res toggle)
     - `media-review` (video / film / audio review with 1-tap `mm:ss` timestamped feedback)
     - `notes-pad` (two-way synced notes & interactive checklist between PC and Mobile)
     - `compare-view` (A/B visual or text comparison: 2 columns on PC/iPad, segmented tab switcher on Mobile)
     - `viewer-dashboard` (remote KPI metrics, structured reports, and feedback)
   - **Custom interactive UI / mini-app:** `publish_html_artifact` (HTML or React/Tailwind).
   - **Read back remote approvals/notes:** `get_review_decisions`.
   - **Revoke sessions / rotate PIN:** `rotate_security_credentials`.
2. **Always return ONLY ONE clean PIN-protected Smart Link (`smartUrl`)** — never spam 3 separate Local/Wi-Fi/4G links and never leak `?token=` in the URL.
3. **Apple HIG Minimalist Monochromatic Glassmorphism — Strict Anti-AI-Slop Rules** (full spec in `skills/website-artifacts/references/design-guidelines.md`):
   - **No Eyebrows / Kickers:** Never put uppercase micro-labels or pill badges above titles.
   - **No Nested Cards (Max 1 Surface Layer):** Never nest bordered cards/boxes inside glass cards. Use Apple inset grouped surfaces separated by crisp `1px` hairline dividers (`rgba(255,255,255,0.075)`).
   - **No AI Purple Glows or Emojis-as-Icons:** Use a calm monochromatic graphite palette (`#0b0b0d` canvas, frosted `rgba(255,255,255,0.045)` material with `backdrop-filter: blur(24px) saturate(140%)`, `#f5f5f7` / `#a1a1a6` / `#6e6e73` ink hierarchy) and clean `16px` monochrome SVG line icons instead of emojis.
   - **Pixel-Accurate Input, Placeholder & Control Alignment:** Give inputs explicit heights (`42px` desktop / `44px` mobile), symmetrical horizontal padding (`0 14px`), matching button heights, identical `font-size`/`line-height` on `input` and `::placeholder`, and `16px` optical rails matching section labels and grouped rows.
4. **Always wire `window.agySync`** in custom interactive artifacts so PC <-> Mobile Phone state stays synced in real time and persists across reloads.
5. **Never modify core Google Antigravity files.** Keep all runtime state inside the plugin's data directory (`AGY_DATA_DIR`).
