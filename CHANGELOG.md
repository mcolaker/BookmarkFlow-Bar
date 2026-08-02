# Changelog

All notable public changes to BookmarkFlow Bar are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project does not currently claim Semantic Versioning compatibility.

## [0.1.35] — 2026-08-02

### Added

- Customizable multi-row bookmark bar for regular web pages.
- Keyboard-driven bookmark search palette.
- Folder rail with left/right placement and device-local pinning.
- Bookmark and folder context actions, reordering, colors, and safe folder merge tooling.
- BookmarkFlow new-tab workspace with Google search.
- Onboarding profiles and an animated feature tour.
- Streamer mode, per-site visibility controls, and optional sensitive-page hiding.

### Security

- Restrict rendered bookmark protocols to `http:`, `https:`, and `mailto:`.
- Isolate the content UI inside an extension-owned closed Shadow DOM.
- Keep domain-specific visibility exclusions in local extension storage.
- Add regression coverage for security-sensitive content-script behavior.
