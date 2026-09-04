# Changelog

All notable public changes to BookmarkFlow Bar are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project does not currently claim Semantic Versioning compatibility.

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
