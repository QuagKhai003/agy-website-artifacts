# Task-Adaptive Layout Selection Matrix (`agy-website-artifacts`)

Antigravity MUST automatically choose the best responsive layout preset based on the user's task type so every screen (Mobile `<640px`, iPad `640–1024px`, Desktop `>1024px`) gets the optimal interaction layout without debug clutter:

| Task Type | Preset ID (`publish_task_layout`) | Layout Behavior Across Devices |
| :--- | :--- | :--- |
| **Photo culling / selection with notes** | `photo-triage` | Fluid responsive grid (`auto-fill minmax(280px, 1fr)`) + 1-tap **Focus Mode**, segmented filters (*All / Pending / Keep / Priority / Reject*), **4G Fast Preview <-> Full Res** toggle, and per-photo synced notes. |
| **Video, film, audio, or podcast review** | `media-review` | 2-column split on Desktop/iPad (Media Player + Timestamped Notes), single-column stack on Mobile. Pressing **Save** automatically attaches the active playback timestamp (`mm:ss`); clicking any timestamp seeks directly to that moment. |
| **Synced notes, meeting minutes, & checklists** | `notes-pad` | Distraction-free editor + interactive checklist synced keystroke-by-keystroke between PC and Mobile, persisted cleanly across reloads. |
| **A/B comparison** (Before/After images, UI drafts, text variants) | `compare-view` | Side-by-side 2-column view on Desktop/iPad (`>768px`), automatically switches to a full-width **A / B segmented tab bar** on Mobile + winner selection and synced feedback note. |
| **Remote KPI reports & documents** | `viewer-dashboard` | Single-surface hairline KPI strip + clean reading body + synced feedback input for the Agent. |
| **Bespoke interactive mini-app / React UI** | `publish_html_artifact` | Full-screen Apple HIG monochrome glassmorphism UI wired with `window.agySync` and auto-injected `agy-device-mobile`, `agy-device-tablet`, `agy-device-desktop` classes. |
