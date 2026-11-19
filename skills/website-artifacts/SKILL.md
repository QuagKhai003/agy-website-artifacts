---
name: website-artifacts
description: >-
  Versatile remote website and artifact publisher for Google Antigravity (`agy-website-artifacts`):
  publish live local websites (Next.js/Vite/React/Flask), static sites, task-adaptive layouts
  (photo triage, video/audio timestamp review, synced notes & checklists, A/B compare, KPI dashboards),
  and custom HTML/React artifacts with Apple HIG minimalist monochromatic glassmorphism (zero AI slop),
  real-time PC <-> Mobile sync, 1-Link Smart Auto-Routing, and PIN-protected Private Security Gateway.
---

# Website & Artifacts Publisher Skill (`website-artifacts`)

Automatically choose the right tool & adaptive layout for the user's job (see [layout-presets.md](references/layout-presets.md)):

| User Task | Tool to Call |
| :--- | :--- |
| Preview a live local website / dev server (`localhost:3000`, Next.js, Vite, Flask, Gradio) | `publish_web_app` |
| Preview a built static website folder (`dist/`, `build/`, folder with `index.html`) | `publish_static_site` |
| Cull / filter photos with notes (4G fast preview + Full Res zoom) | `publish_task_layout` (`preset: "photo-triage"`) |
| Review Video / Film / Audio with 1-tap timestamp notes (`mm:ss`) | `publish_task_layout` (`preset: "media-review"`) |
| Take synced notes & manage live checklists between PC & Phone | `publish_task_layout` (`preset: "notes-pad"`) |
| Compare 2 images, designs, or text drafts side-by-side (A/B) | `publish_task_layout` (`preset: "compare-view"`) |
| View remote KPI reports or structured documents with feedback | `publish_task_layout` (`preset: "viewer-dashboard"`) |
| Build a bespoke interactive tool, mini-app, or React component | `publish_html_artifact` |
| Read user's remote approvals, selections, or notes back into Agent | `get_review_decisions` |
| Rotate 6-digit PIN & immediately log out all devices | `rotate_security_credentials` |

## Mandatory Design System: Apple HIG Monochromatic Glassmorphism (Zero AI Slop)
Before generating any custom HTML/React UI (`publish_html_artifact`), **always read and strictly follow [design-guidelines.md](references/design-guidelines.md)**:

1. **Zero AI Slop Anti-Patterns:**
   - **No eyebrow/kicker micro-labels** (`11px` uppercase tracked labels or pill badges above titles).
   - **No card-inside-card nesting** (max 1 surface elevation; separate rows/sections inside a surface using `1px` inset hairline dividers instead of nested boxes).
   - **No purple/indigo SaaS spotlight glows**, heavy neon shadows, or bouncy hover animations.
   - **No emojis as UI icons** (use typography or clean `16px` monochrome SVG line icons with `stroke-width: 1.5`).
   - **No redundant explanatory subtitle filler** under every heading.
2. **Cohesive Monochromatic Graphite & Frosted Glass Tokens:**
   - Canvas: `#0b0b0d`, primary frosted surface: `rgba(255,255,255,0.045)` with `backdrop-filter: blur(24px) saturate(140%)`, crisp `1px` outer border `rgba(255,255,255,0.095)`, internal hairline `rgba(255,255,255,0.075)`.
   - Ink hierarchy: `#f5f5f7` primary, `#a1a1a6` secondary, `#6e6e73` tertiary; high-contrast monochrome primary button (`#f5f5f7` surface, `#0b0b0d` text).
   - Typography: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif`, `tabular-nums` for numbers/timestamps, strict 4pt/8pt spacing grid, matching `font-size`/`line-height` on inputs & placeholders.
3. **Responsive Ergonomics & Sync:**
   - Sticky frosted edge-to-edge header bar (not a floating rounded box), full-screen canvas, `viewport-fit=cover`, touch targets `>= 44px`, and `window.agySync` wired for PC <-> Mobile real-time sync.
4. **One Clean Link:** Return **1 single PIN-protected Smart Link** (`smartUrl`) + the 6-digit PIN.
