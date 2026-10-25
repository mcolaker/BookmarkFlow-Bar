---
name: bookmarkflow-browser-qa
description: "MANDATORY & PROACTIVE: Automatically activate for BookmarkFlow extension behavior, visible UI, keyboard/accessibility, or browser regression work."
---

1. Read `AGENTS.md`, `docs/agent-playbooks/ui_accessibility.md`, `docs/backlog/OPEN_TASKS.md`, and Git status first.
2. Before modifying shared functions or state handlers, run a `codebase-memory` **All-Callers Graph Audit** (`search_graph` / `trace_path`) across `src/background.js`, `src/content.js`, `src/newtab.js`, and `src/shared.js`, and verify **Multi-Entry-Point Tests** (Quick Add, Floating Bar, New Tab, Context Menu, Drag-Drop, Keyboard Shortcuts).
3. Execute the **6-Pillar & 7-Dimension Quality Matrix (`P0-19` / `BF-QA-010` / `BF-QA-011`)**:
   - **Pillar 1 (Seeing Eye)**: `npm run inspect:360` (`jev` 1.14 360° single-pass multimodal + `validateImageMagicBytes` PNG BOM guard) and `npm run qa:motion` (`evaluateIdleBlinkAndRebuildLoop`).
   - **Pillar 2 (Thinking Judge)**: Automatic Clef (`microsoft/decision-1`) failover and `npm run inspect:dom`.
   - **Pillar 3 (Standards & MV3)**: `npm run test:mv3`, `npm run guard:console` (`0` errors), and WAI-ARIA keyboard focus rings.
   - **Pillar 4 (Design & Aesthetic)**: `evaluateProactiveStitchBananaGate` (`STUDIO_GRADE_GLASS_BENTO`, `visual_design_score >= 3.50`, `truncatedLabelsCount === 0` — zero `'...'` / `'…'` ellipsis on buttons/chips).
   - **Pillar 5 (Localization & Cross-Locale Purity)**: `npm run test:raw-keys` and `scanI18nSuspiciousPatterns` across `en` and `tr` (`0` raw keys, `0` unresolved placeholders, `0` Turkish characters leaked into `en` UI).
   - **Pillar 6 (State Delta & Re-Entry Persistence — `t0 -> t1 -> t2`)**: Verify `Before (t0, --save-baseline)` -> `Action (t1, --verify-delta --expect-changed)` -> `Reload/Re-entry (t2, --verify-delta --expect-persisted)` and **Multi-Step Flow Verification** (`Popup -> New Tab -> Spotlight -> Floating Bar -> Native Host`).
4. Run `node scripts/validate-project.mjs`, `node scripts/verify-public-tree.mjs`, and `node scripts/security-regression.mjs` after source changes.
