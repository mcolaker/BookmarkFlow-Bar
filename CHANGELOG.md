# Changelog

All notable public changes to BookmarkFlow Bar are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project does not currently claim Semantic Versioning compatibility.

## [Unreleased]

## [0.4.0] — 2026-10-10

### Added

- Add In-Page Folder Menu Dynamic Row Height & Header Component (BF-UX-030): Replaced rigid 35px fixed row heights with dynamic flex layout (`min-height: 38px`, `height: auto`), preventing text and tag overlap across items, while introducing an accessible `.bf-menu-header` featuring folder icon, folder name, and live item counter.
- Add In-Page Folder Menu Keyboard Navigation & Focus Loop (BF-UX-031): Enabled full W3C keyboard navigation across popup folder menus (`ArrowDown`/`ArrowUp` navigation, `Enter` to open link, `Tab`/`Shift+Tab` cycling, and `Escape` restoring focus to originating folder button).
- Add In-Page Folder Menu Live Substring Search & Spring Motion (BF-UX-032): Automatically surfaced an accessible 28px search input (`.bf-menu-filter`) in folders with 15+ bookmarks, providing instant filtering, live count indicator, and smooth `cubic-bezier(0.16, 1, 0.3, 1)` spring entrance physics.
- Add Folder Menu Quick Clear Action (BF-UX-033): Added an accessible `×` clear button (`.bf-menu-filter-clear`) in the live filter input to instantly reset search queries and return focus to the input box.
- Add Folder Menu Context Menu Actions (BF-UX-034): Right-clicking any bookmark in the folder menu opens an instant BookmarkFlow context menu with "Open in Incognito Window" (`BF_OPEN_INCOGNITO`) and "Copy URL" with green toast feedback.
- Add Folder Menu Middle-Click Background Tab Support (BF-UX-035): Middle-clicking (auxclick) any folder menu bookmark opens the link in a background tab (`BF_OPEN_BACKGROUND_TAB`) without closing the menu, enabling rapid tab opening.
- Add Substring Matching Highlight in Folder Filter (BF-UX-036): Highlighted query characters in bookmark titles using safe DOM `<mark class="bf-highlight">` with theme accent glow and high-contrast support.
- Add Search Palette Substring Matching Highlight Parity (BF-UX-037): Extended substring matching highlight to Spotlight (`Alt+Shift+K`), floating bar search results, and New Tab live search cards with locale-aware case mapping and non-overlapping range merging.
- Add Folder Menu Smart Tag (#tag) Filter (BF-UX-038): Typing `#` in the folder filter instantly matches and isolates tag pills (`.bf-tag-pill.is-tag-matched`) with glowing accent borders.
- Add Open All in Tabs Action (BF-UX-039): Added a compact "↗ Open All" action in folder menu headers (`.bf-menu-open-all-btn`) and folder right-click menus (`open-folder-all-tabs`) to open all links in background tabs with confirmation threshold for >15 tabs.
- Add Tag Pill Live Match Glow in Search Results (BF-UX-040): Visual match glow and accent styling for `#tag` pills across Spotlight, search drawer, and New Tab cards.
- Add Folder Menu Quick Add Bookmark and Create Folder Actions (BF-UX-041): Compact `+` micro button in folder menu headers opening a popover to quickly add bookmarks or create subfolders inside the current folder.
- Add Smart Filter Chips in Spotlight & New Tab (BF-UX-042): Compact, horizontal scrollable filter chips ("All", "Folders", "Tags", "Reading List") directly below search inputs for instant data type isolation.
- Add Smart Sorting Modes in Folder Menus (BF-UX-043): Compact sort button cycling through "Default", "A-Z", "Newest", and "Frequently Used" with local visit tracking (`recordBookmarkVisit`).
- Add W3C Tablist Keyboard Navigation for Filter Chips (BF-UX-045): Full arrow key (`ArrowLeft`/`ArrowRight`), `Home`/`End`, and `Enter`/`Space` keyboard navigation across filter chips in Spotlight and New Tab.
- Add Persistent Folder Sort Preferences (BF-UX-046): Persist folder sort modes in `chrome.storage.local` (`bfFolderSortModes`) per folder, restoring preferred sort order instantly on reopen.
- Add Terminal-First GitHub CLI Mandate & Automation (BF-GOV-016..019): Autonomous terminal workflows for PR creation, CI monitoring, auto-merge, and release pipeline orchestration (`release:full`).
- Add Manifest V3 API Compliance & Zero-Deprecation Gate (BF-QA-005): Fail-closed MV3 contract tests (`npm run test:mv3`) guaranteeing zero legacy MV2 sync APIs and pure Service Worker compliance.
- Add Web Extension Quality Quadrumvirate & Autonomous DevTools (BF-QA-006, BF-GOV-022): 4-pillar quality framework (Agentic Motion, Clef/Decision-1 dual arbiter, MV3/WAI-ARIA, Design Tokens) and autonomous DevTools inspection authority.
- Add Fast Shadow DOM Tree Inspector (BF-QA-007): Lightweight CLI tool (`npm run inspect:dom`) inspecting closed Shadow DOM hierarchy, ARIA roles, and state in <200ms.
- Add User-Centric Inspiring Copy Mandate & Internal Jargon Prohibition (BF-GOV-025): Strict ban on internal bugfix/DOM jargon in public announcements and store listings, prioritizing user-centric values.
- Add Persistent Proactive Backlog & Eviction Gate (BF-GOV-024): Durable backlog tracking in `PROJECT_STATE.md` with automatic eviction upon completion and pre-proposal verification gate.

## [0.3.1] — 2026-09-30

### Added

- Add Turquoise Glow Theme and Centralized Design Tokens Integration (BF-UX-024): Introduced Turquoise Glow (`turquoise-glow`), the 5th official theme featuring high-contrast vivid turquoise accents (`#22d3ee`), deep oceanic surfaces (`#061318`, `#0a1a20`), and icy turquoise text (`#ecfeff`). Fully integrated across in-page floating bar (`src/content.css`), Spotlight & Command Palette (`src/spotlight.css`), New Tab (`src/newtab.css`), Popup (`src/popup.css`), and Maintenance Center (`src/settings.css`), paired with 5-segment theme switcher in popup and complete EN/TR locale parity (`themeTurquoise`).
- Add Turquoise Abyss New Tab Background & Radiant Folder Accents (BF-UX-025): Added Turquoise Abyss (`turquoise-abyss`) as the 5th ambient wallpaper option (`radial-gradient(circle at 50% 25%, #0e303d 0%, #061318 65%, #02070a 100%)`) with 5-way switcher in popup settings, paired with oceanic folder container backgrounds (`--bf-folder-bg: #09202a`) and glowing turquoise folder icons (`.bf-folder-icon`, `.nt-folder-icon`) in turquoise theme.
- Add Turquoise Glow Edge Peek Strip & Search Action Accents (BF-UX-026): Minimalist hidden bar edge restore handle (`.bf-edge-restore`) illuminates with vivid turquoise gradient and subtle drop shadow in turquoise mode, while action chips (`.bf-command-action-chip`, `.nt-search-action-chip`, `.nt-inline-save-btn`) feature crisp turquoise border and glow on focus and hover.
- Add Turquoise Toast Progress Bar & Search Focus Ring Refinements (BF-UX-027): Subtle progress indicator line (`.bf-toast-progress`, `.nt-toast-progress`) animates with vivid turquoise gradient (`#22d3ee` to `#06b6d4`), while search boxes across all surfaces gain a high-visibility turquoise focus ring (`box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.45)`) for enhanced keyboard accessibility.
- Add Turquoise Shortcuts Grid Glow & Health Inspector Metrics (BF-UX-028): Top shortcut cards on New Tab (`.nt-shortcut-card`, `.nt-shortcut-icon-box`, `.nt-shortcut-initial`) display subtle turquoise hover border and icon box glow, and the Bookmark Maintenance Center synchronizes active theme to illuminate health check metrics, counters, and filter chips with radiant turquoise accents.
- Add Turquoise Clock & Greeting Text Gradient and Folder Merge Action Glow (BF-UX-029): The New Tab dynamic clock (`#clockDisplay`) and greeting message (`#greetingDisplay`) feature modern icy-turquoise text clip gradients (`linear-gradient(135deg, #ffffff 30%, #22d3ee 100%)`) and drop shadows, while the Maintenance Center duplicate folder merge button (`#merge.primary`) receives vivid turquoise neon gradient, button press physics, and turquoise `:focus-visible` styling across all form controls.

## [0.3.0] — 2026-09-29

### Added

- Add Search Bar Link Capture & Quick Folder Selector (BF-UX-013): Typing a URL into the New Tab search box captures the link into an add dialog instead of navigating away immediately, with quick action cards ("⭐ Add to Bookmarks" and "🌐 Open in New Tab").
- Add Hierarchical Folder Selector Dropdown (`#addFolderSelect`, `.bf-add-select`): Added folder dropdown selector to both New Tab and in-page Shadow DOM add bookmark dialogs to pick any parent folder before saving.
- Add Smart Folder Memory (`bfLastUsedFolderId`): Automatically persist the last selected bookmark folder locally and preselect it on subsequent add operations across New Tab, In-Page Dialog, and Omnibox.
- Add Windows Desktop Companion with Global Hotkey (`Win+Shift+B`), System Tray status icon, and customizable hotkey settings (BF-WIN-001, BF-WIN-002).
- Add Quick Folder Chips (BF-UX-014): One-click compact folder pills ([⭐ Bar] [📁 Folder 1] [📁 Folder 2]) in add bookmark dialogs for instant folder assignment with two-way dropdown synchronization.
- Add Instant Folder Save Chips to Search Results (BF-UX-015): Inline mini action buttons in the link capture card to save directly to Bookmarks Bar or top folder with zero intermediate dialog steps.
- Add Instant Toast Feedback for Direct Saves (BF-UX-016): Golden accent subtle toast notification (`.nt-toast`, `.bf-toast`) shown in New Tab and In-Page Spotlight after saving a bookmark directly to confirm target folder with zero UI friction.
- Add In-Page Command Palette URL Action (`Alt+Shift+K`): Typing or pasting a web link into the Spotlight command palette surfaces a direct "Add to folder" quick card.
- Add Chrome Omnibox Keyword Integration (`bf <url>`): Type `bf` in the Chrome address bar to quickly save any link to the bookmarks bar or subfolders without switching tabs.
- Add JaponiGo Governance & Modular Playbook Architecture (BF-GOV-010): Upgraded `AGENTS.md` to Operating Kernel, established `DECISION_INDEX.md` (durable decisions), `PROJECT_STATE.md`, 6 modular domain playbooks (`docs/agent-playbooks/`), Proactive Holistic QA (P0-11), zero-end-user AI invariant (P0-13), mandatory verbatim terminal evidence, and `validate-governance.mjs`.
- Add Zero-Latency Intent Engine & Live Smart Routing Badges (BF-UX-017): Instant local rule engine (`BookmarkIntentRoutingEngine` in `src/intent-router.js`) classifying search inputs across 6 modes (URL, command, tag, folder, tab switch, smart search) with live color-coded pill badges (`.nt-intent-badge`, `.bf-intent-badge`), folder deep navigation, and zero-end-user AI terminology.
- Add Web-based Live Motion QA & Automated Media Quality Gate (BF-QA-002, BF-QA-003): Playwright browser screen recording (`recordVideo`) coupled with Gemini Agentic Video (`processing: "agentic"`) for sub-second jank and frame drop detection (`npm run qa:motion`), alongside automated promotional asset privacy and framing validation (`npm run qa:media`).
- Add Site Control, MV3 Settings Security, Inline Save/Edit, URL Validation & Live Folder Move Chips (BF-UX-018): MV3 settings tab opening via Service Worker (`BF_OPEN_SETTINGS`), inline `[⭐ Save]` button with `Ctrl+S` shortcut, dynamic folder tooltip, save pulse animation, escape clear undo shortcut (`queryRestoredToast`), edit mode with URL unlock (`#addUrlUnlockBtn`), auto-protocol completion (`https://`), live folder move chips (`[⭐ Move to Bar]`, `[📁 Move to Folder]`), mini folder picker dropdown chip (`[📁▾]`), universal toast undo with `Ctrl+Z`, visual progress bar, hover-pause, and popup layout integrity fix.
- Add Autonomous Video Trigger Authority & Motion QA Lifecycle (BF-QA-004): P0-19 operating rule granting AI assistant authority to autonomously inspect dynamic transitions (`inspect-motion-qa.mjs`), hardware frame counter (FPS Dropped-Frame Inspector) during live user journey, defect auto-artifact preservation, and auto-purge for clean runs.
- Add Autonomous DevTools, Web Guidance & Gemini API Authority (BF-GOV-011): P0-20 rule authorizing autonomous inspection of closed Shadow DOM isolation, a11y focus rings, CSS and memory leaks.
- Add Modern Web Guidance Centralized Design Tokens (`src/design-tokens.css`): Centralized gold-obsidian color tokens, OLED Black and Emerald Matrix palettes, blur, border radii, focus rings, and spring physics variables across all stylesheets.
- Add Forced-Colors High Contrast Accessibility (BF-GOV-012, BF-GOV-013): `@media (forced-colors: active)` support using system colors (`Canvas`, `CanvasText`, `Highlight`, `ButtonBorder`) across in-page bar, New Tab, Popup, Spotlight (`src/spotlight.css`), Settings (`src/settings.css`), and Onboarding (`src/onboarding.css`).
- Add Full In-Page Bar Concealment & Restore Lifecycle (`Alt+Shift+H`, BF-UX-019): Complete concealment of in-page bar with zero lingering pixels, 2s toast guidance, and instant restoration via `Alt+Shift+H`, `Alt+Shift+B`, or `Alt+Shift+K`.
- Add Single-Click Show Bar Button to Popup Site Control Card (BF-UX-020): Single-click gold-accented `[👁️ Show Bar]` action button in extension popup when the bar is hidden on active tab.
- Add Minimalist Edge Peek Restore Strip (BF-UX-021): Subtle 3px touch area at extreme right screen edge when bar is hidden, glowing on hover and restoring bar on click.
- Add Snooze Badge Indicator on Extension Icon (BF-UX-022): Temporary subtle "off" badge (`chrome.action.setBadgeText`) placed on extension toolbar icon while bar is hidden on that tab, auto-cleared on restore.
- Add Dynamic Snooze Action Tooltip & Multi-Tab Synchronization (BF-UX-023): Tab-specific tooltip (`chrome.action.setTitle`) explaining snooze status with shortcut hint, paired with `chrome.tabs.onActivated` listener ensuring seamless multi-tab synchronization.



## [0.2.1] — 2026-09-16

### Added

- Add Launcher Quick Context Menu (`.bf-context-menu`): Right-click (or keyboard `ContextMenu` / `Shift+F10`) on the floating launcher button (`.bf-mark` or `.bf-restore`) to open quick controls ("Hide Bar (Alt + Shift + H)", "Disable on this site", and "Settings").
- Add Dynamic Tab Injection on Install & Consent: Automatically inject BookmarkFlow Bar into existing open tabs upon extension update and onboarding consent completion, eliminating the need to restart the browser.
- Add Adaptive First-Run Discovery Tooltip: 5-second contextual guidance balloon ("Click or Alt + Shift + B to toggle bar") with edge-adaptive positioning (`.is-left`) and persistent one-time dismissal.
- Add Popup Page Controls Tip Badge (`#pageControlsBadge`): Golden shortcut and control reminder card in the extension popup home screen.
- Add Seamless Onboarding Workspace Transition: Direct transition to the BookmarkFlow New Tab workspace immediately upon completing initial setup.

## [0.2.0] — 2026-09-07

### Added

- Add Stash All Open Tabs to Folder (`BF_SAVE_OPEN_TABS`): Save all active window tabs into an organized timestamped bookmark session folder via New Tab action button, Popup, or Spotlight command palette (`#stash`).
- Add Offline JSON Backup & Restore (`BF_EXPORT_BACKUP`, `BF_IMPORT_BACKUP`): Export full offline backup in `bookmarkflow-backup-v1` schema and restore settings, folder colors, bookmark tags, pinned rails, reading list, and bookmark trees.
- Add Zero-Cloud Smart Auto-Tagging: Local domain and path rules automatically suggesting `#dev`, `#ai`, `#video`, `#social`, `#design`, and `#reading` tags without external network calls, with user toggle in popup settings.
- Add Offline Reading List (`bfReadingList`): Interactive sliding Reading Drawer in New Tab page with one-click "✓ Done" removal and quick page stash from Spotlight palette.
- Add New Tab Wallpapers & Ambient Themes: Support for Obsidian dark, Midnight Gradient, Emerald Aurora, and custom offline user-uploaded wallpapers.
- Add Spotlight Command Palette Quick Actions: Instant launcher actions for `#stash`, `#reading`, `#backup`, and `#health` directly from `Alt+Shift+K` search.

## [0.1.45] — 2026-09-04

### Added

- Add dedicated Health Inspector launch button in the extension popup (`src/popup.html`, `src/popup.js`, `src/popup.css`) with gold accent and direct hash navigation.
- Add Spotlight / Raycast and New Tab search command palette quick action: typing `health`, `sağlık`, `dead`, `kırık`, `duplicate`, `mükerrer`, or `#health` instantly presents a one-click action to open the Health Inspector.
- Add interactive filter tabs (`All issues`, `Dead links`, `Duplicates`) with live count badges in Bookmark Maintenance & Health Center (`src/bookmark-maintenance.html`, `src/bookmark-maintenance.js`).
- Add clickable metric summary cards enabling instant filter toggling on click.
- Add domain favicons and folder breadcrumbs to health issue rows for instant visual recognition.
- Add multi-browser installation and verification guides for Google Chrome/Chromium, Mozilla Firefox (about:debugging Gecko MV3), and Microsoft Edge in `README.md`.

### Changed

- Fix confusing "Ara" button in health inspector by replacing with unambiguous "↗ Aç" / "↗ Open" link action and standardized "🗑 Sil" / "🗑 Delete" action.
- Fix false-positive unreachable status on Cloudflare-protected domains (Perplexity, Claude, Colab) via smart GET fallback handling when HEAD requests are rejected.
- Optimize health issue list layout to eliminate excessive negative horizontal space and improve readability.

## [0.1.44] — 2026-09-04

### Added

- Add Bookmark Health & Dead Link Inspector (`src/bookmark-maintenance.html`): local, zero-telemetry, concurrency-limited (max 5 simultaneous connections, 5s timeout) link checker detecting dead URLs, DNS failures, unreachable endpoints, and duplicate bookmarks with instant inline delete and test actions.
- Add Smart Tags & Spotlight Tag Filtering (`#tag`): multi-source tag inference from folder hierarchies, domain roots, and hashtags; persistent local storage under `bfBookmarkTags`; instant `#tag` filtering in in-page Command Palette and New Tab search; theme-adaptive tag pills (`.bf-tag-pill`, `.nt-tag-pill`) matching all 4 Obsidian dark palettes.
- Add "Edit tags" context menu action to bookmarks with instant prompt-based editing and live reactive UI synchronization across all surfaces.

## [0.1.43] — 2026-09-04

### Added

- Add Spotlight / Raycast style real-time search palette in New Tab and in-page bar with arrow key cyclic navigation (`ArrowDown`/`ArrowUp`), active result highlight (`#f2c94c`), `Enter` to open in active tab, and `Ctrl+Enter` / `Meta+Enter` to open in new tab.
- Add Multi-Theme Engine featuring 4 curated dark palettes: Gold Obsidian (default deep navy/gold), OLED Midnight Black (true black `#000000` with platinum accent), Emerald Matrix (obsidian with cyber neon green `#41d17d`), and Cyber Indigo (synthwave violet with electric indigo `#818cf8`).
- Add 4-segment theme switcher in the extension popup with instant, real-time live synchronization across Popup, New Tab, and in-page bar.
- Add Cross-Browser Packaging Bridge (`scripts/package-cross-browser.mjs`) supporting Mozilla Firefox (AMO) and Microsoft Edge Add-ons with automated deterministic ZIP packaging, Gecko MV3 manifest transformation, and SHA-256 integrity digests.

## [0.1.42] — 2026-09-04

### Added

- Add a dynamic digital clock (`#clockDisplay`) above the search box in the New Tab page, synchronized to the user's local time.
- Add a localized contextual greeting (`#greetingDisplay`) above the search box with day/evening transitions in English and Turkish.
- Add an 8-item responsive Quick Shortcuts grid (`#shortcutsGrid`) below the search box, populated from the user's top safe bookmarks.
- Add interactive micro-animations with gold border glow (`#f2c94c`) and smooth lift on hover and focus.
- Add bilingual localization support for New Tab clock greetings (`greetingMorning`, `greetingAfternoon`, `greetingEvening`) and shortcuts.

## [0.1.41] — 2026-09-03

### Added

- Add a responsive centered card presentation (420px) with border and elevation when opening the extension popup in wide viewports or full tabs, eliminating unwanted negative space.
- Add a custom slim scrollbar to the popup interface.

### Fixed

- Update onboarding privacy policy link color from yellow to accessible blue (`#58a6ff`) to eliminate visual hierarchy collision with the primary agreement button.
- Optimize vertical page padding in onboarding for zero-scroll presentation on standard 720p displays.

### Changed

- Guarantee a minimum 30x30px target size for in-page bar action controls to improve touch and mouse ergonomics per WCAG 2.5.5.

## [0.1.40] — 2026-08-11

### Changed

- Collapse the in-page bar to a single "BF" logo by default; the quick actions (add bookmark, search, scroll, collapse) appear only after the logo is clicked to expand the bar.

## [0.1.39] — 2026-08-09

### Changed

- Promote the reviewed search-palette and context-action tour GIFs to README, onboarding, and future release archives.
- Lock reproducible tour capture to Playwright 1.55.0 with Chromium build 1187 and seed the folder-rail migration fixture explicitly.

## [0.1.38] — 2026-08-05

### Fixed

- Prefer the signed-in account Bookmark Bar when Chrome exposes separate account and device-local roots, and return both roots' folder-rail candidates consistently.
- Keep per-folder colors in device-local storage and migrate legacy synced colors without overwriting newer local choices.
- Apply English and Turkish casing rules according to the active Chrome UI language in bookmark search and folder matching.
- Stop intercepting Chrome, site, and operating-system `Ctrl+K` or `Alt+Space` shortcuts from page-level listeners.
- Add modal semantics, background isolation, focus trapping, Escape handling, focus restoration, and a consistent combobox/listbox model to bookmark-add and search overlays.
- Keep bookmark, page-context, preference, and search behavior fail-closed until the user accepts a prominent, versioned first-run privacy disclosure.
- Stop persisting the new-tab bookmark strip's scroll position so the extension does not retain unnecessary interaction state.

### Changed

- Change the suggested search command to `Alt+Shift+K` and show Chrome's actual assignment in popup and onboarding shortcut guides.
- Align Chrome Web Store reviewer notes, Turkish listing copy, privacy disclosures, and storage boundaries with current behavior.
- Declare on-device URL handling as Web history and page-title/search/layout handling as Website content, with all three Limited Use certifications documented for dashboard review.
- Run browser regressions in both English and Turkish and require immutable annotated release tags with an allowlisted archive contract.
- Withhold two superseded tour captures from public onboarding and release packages until their corrected crop and shortcut cue are regenerated and visually approved.
- Promote the live Chrome Web Store listing as the primary end-user installation route while keeping verified source packages available for audit and development.

## [0.1.37] — 2026-08-02

### Added

- Add public governance, roadmap, support, trademark, asset-provenance, and Developer Certificate of Origin policies.
- Add fail-closed license, contribution, provenance, and DCO validation for pull requests.

### Changed

- License the project under Apache License 2.0 while preserving a separate official-brand and trademark policy.
- Replace store and documentation artwork with reproducible, project-owned compositions that use only synthetic example content.
- Strengthen release packaging so legal notices, manifest versions, release tags, and public-tree checks remain aligned.

## [0.1.36] — 2026-08-02

### Changed

- Route new-tab web searches through Chrome's Search API so the user's existing default search provider is respected.
- Replace Google-specific new-tab labels and store disclosures with provider-neutral wording.
- Add the Chrome Web Store Limited Use statement and explicit local page-title/URL handling disclosure to the privacy policy.

## [0.1.35] — 2026-08-02

### Added

- Customizable multi-row bookmark bar for regular web pages.
- Keyboard-driven bookmark search palette.
- Folder rail with left/right placement and device-local pinning.
- Bookmark and folder context actions, reordering, colors, and safe folder merge tooling.
- BookmarkFlow new-tab workspace with Google search.
- Onboarding profiles and an animated feature tour.
- Streamer mode, per-site visibility controls, and optional sensitive-page hiding.
- Chrome-native English and Turkish localization, with English as the default locale.
- A public product page, stable privacy-policy URL, and GitHub support path.

### Changed

- Increased essential interface type and control sizes while preserving the compact power-user layout.
- Grouped context-menu actions and strengthened keyboard focus visibility.
- Added reduced-motion handling across the bookmark overlay, new-tab page, popup, onboarding, and maintenance tools.
- Clarified the project's proprietary source-available licensing terms.

### Security

- Restrict rendered bookmark protocols to `http:`, `https:`, and `mailto:`.
- Isolate the content UI inside an extension-owned closed Shadow DOM.
- Keep domain-specific visibility exclusions in local extension storage.
- Add regression coverage for security-sensitive content-script behavior.
