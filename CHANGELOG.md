# Changelog

All notable public changes to BookmarkFlow Bar are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project does not currently claim Semantic Versioning compatibility.

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
