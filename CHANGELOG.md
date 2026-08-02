# Changelog

All notable public changes to BookmarkFlow Bar are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project does not currently claim Semantic Versioning compatibility.

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
