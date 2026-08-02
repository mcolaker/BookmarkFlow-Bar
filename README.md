<p align="center">
  <img src="docs/assets/bookmarkflow-hero.jpg" alt="BookmarkFlow Bar product preview showing a multi-row bookmark bar and private search workspace" width="100%">
</p>

<h1 align="center">BookmarkFlow Bar</h1>

<p align="center">
  A privacy-first Chrome extension that turns your bookmarks into a customizable multi-row bar, a keyboard-driven search palette, and an organized new-tab workspace.
</p>

<p align="center">
  <a href="https://github.com/mcolaker/BookmarkFlow-Bar/actions/workflows/validate.yml"><img alt="Validation status" src="https://github.com/mcolaker/BookmarkFlow-Bar/actions/workflows/validate.yml/badge.svg?branch=main"></a>
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white">
  <img alt="Vanilla JavaScript" src="https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=111111">
  <img alt="Version 0.1.37" src="https://img.shields.io/badge/version-0.1.37-F2C94C">
  <img alt="License: Apache 2.0" src="https://img.shields.io/badge/license-Apache--2.0-4C8BF5">
  <img alt="Privacy: local first" src="https://img.shields.io/badge/privacy-local--first-41D17D">
</p>

<p align="center">
  <strong><a href="https://github.com/mcolaker/BookmarkFlow-Bar/releases/download/v0.1.37/bookmarkflow-bar-0.1.37.zip">Download v0.1.37</a></strong> ·
  <a href="https://github.com/mcolaker/BookmarkFlow-Bar/releases/download/v0.1.37/bookmarkflow-bar-0.1.37.zip.sha256">Verify SHA-256</a> ·
  <a href="#install-from-source">Installation guide</a> ·
  <a href="https://mcolaker.github.io/BookmarkFlow-Bar/">Product website</a> ·
  <a href="https://github.com/mcolaker/BookmarkFlow-Bar/discussions">Join Discussions</a>
</p>

<p align="center">
  <sub><strong>Project status:</strong> v0.1.37 · verified release package available · Chrome Web Store review pending as of August 2, 2026 · <a href="CHANGELOG.md">Changelog</a></sub>
</p>

> [!NOTE]
> **Privacy at a glance:** Your bookmark library stays in Chrome. BookmarkFlow has no analytics SDK or developer-operated server. The `<all_urls>` access exists only to render the optional in-page bar on ordinary websites. See [Privacy](#privacy-by-design) and [Permissions](#permissions) for the complete explanation.

<p align="center">
  <a href="#why-bookmarkflow">Why BookmarkFlow</a> ·
  <a href="#feature-tour">Feature tour</a> ·
  <a href="#install-from-source">Install</a> ·
  <a href="#privacy-by-design">Privacy</a> ·
  <a href="ROADMAP.md">Roadmap</a> ·
  <a href="GOVERNANCE.md">Governance</a> ·
  <a href="#how-to-support">Support</a> ·
  <a href="https://mcolaker.github.io/BookmarkFlow-Bar/">Website</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

## Why BookmarkFlow

Chrome's native bookmarks bar is intentionally simple, but it cannot become a true multi-row workspace. BookmarkFlow adds a compact interface on top of regular web pages and replaces the new-tab page with a focused bookmark dashboard—without moving your bookmarks into a separate service.

- **See more at once.** Use multiple rows, compact density, horizontal scrolling, favicons, and readable titles.
- **Find anything fast.** Open the command palette from the mouse or keyboard and navigate results without leaving the keyboard.
- **Organize without duplication.** Work with the folders already stored in Chrome and pin important folders to a left or right rail.
- **Stay presentation-ready.** Streamer mode reduces bookmark labels to icons when you share your screen.
- **Adapt it per site.** Hide BookmarkFlow on selected domains or automatically suppress it on login, payment, and banking pages.
- **Keep control of your data.** No analytics, external account, or BookmarkFlow cloud service is required.

## Feature tour

### A bookmark bar that fits your workflow

Expand the compact `BF` control only when you need it. Choose the number of rows, visual density, page spacing behavior, and whether the bar appears on regular websites.

<p align="center">
  <img src="src/assets/tour/bar-open-close.gif" alt="Opening and closing the BookmarkFlow bar" width="760">
</p>

### Search from anywhere

Open the bookmark palette with the search button or a keyboard shortcut. Use the arrow keys to move through results and press `Enter` to open the selected bookmark.

<p align="center">
  <img src="src/assets/tour/search-palette.gif" alt="Searching Chrome bookmarks with BookmarkFlow" width="760">
</p>

### Pin the folders that matter

The optional folder rail can sit on the left or right. Pinned folders are stored by Chrome bookmark ID, so they remain selected independently of their position in the bookmark tree.

<p align="center">
  <img src="src/assets/tour/folder-rail.gif" alt="Using the BookmarkFlow folder rail" width="760">
</p>

### Manage bookmarks in context

Right-click a bookmark or folder to open, copy, rename, add, delete, reorder, or assign a color—without interrupting the page you are viewing.

<p align="center">
  <img src="src/assets/tour/context-actions.gif" alt="BookmarkFlow context actions" width="760">
</p>

### Share your screen with less visual noise

Streamer mode switches bookmark labels to an icon-focused presentation in the bar and folder menus.

<p align="center">
  <img src="src/assets/tour/streamer-mode.gif" alt="BookmarkFlow streamer mode" width="760">
</p>

## Install from source

BookmarkFlow is currently distributed as an unpacked Chrome extension. Use a versioned release package for the most predictable installation.

1. Download the verified [`bookmarkflow-bar-0.1.37.zip`](https://github.com/mcolaker/BookmarkFlow-Bar/releases/download/v0.1.37/bookmarkflow-bar-0.1.37.zip) package and extract it. Its published [SHA-256 checksum](https://github.com/mcolaker/BookmarkFlow-Bar/releases/download/v0.1.37/bookmarkflow-bar-0.1.37.zip.sha256) is available for integrity verification. Contributors can clone the repository instead:

   ```bash
   git clone https://github.com/mcolaker/BookmarkFlow-Bar.git
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** in the top-right corner.
4. Select **Load unpacked** and choose the repository folder containing `manifest.json`.
5. Follow the built-in onboarding tour.

For the cleanest experience, hide Chrome's native bookmarks bar with `Ctrl + Shift + B`. This only changes its visibility; it does not delete bookmarks. BookmarkFlow continues to read the same Chrome bookmark data.

## Keyboard shortcuts

| Action | Default shortcut |
| --- | --- |
| Open or close search | `Ctrl + Shift + E` |
| Expand or collapse the bar | `Alt + Shift + B` |
| Hide or restore BookmarkFlow | `Alt + Shift + H` |
| Toggle streamer mode | `Alt + Shift + M` |

Shortcuts can be reassigned at `chrome://extensions/shortcuts`. `Ctrl + K` and `Alt + Space` also open the palette when the current page does not reserve those combinations.

## Privacy by design

BookmarkFlow is designed to work with Chrome's existing bookmark system rather than copying your library to an external service.

- Bookmark titles, URLs, and folders remain in Chrome's bookmark storage.
- BookmarkFlow has no analytics SDK, advertising SDK, remote API, or project-operated server.
- General display preferences may follow the browser through Chrome Sync when sync is enabled.
- The per-site hide list and pinned folder selections are stored locally on the device.
- Only `http:`, `https:`, and `mailto:` bookmark URLs are rendered or opened.
- The in-page interface runs inside a closed Shadow DOM to reduce interference from page styles and scripts.

See the public [privacy policy](https://mcolaker.github.io/BookmarkFlow-Bar/privacy/), repository [privacy source](store/privacy-policy.md), and [security policy](SECURITY.md).

## Languages and accessibility

BookmarkFlow uses Chrome's native extension localization system. English is the default interface language, and Turkish is included as a complete additional locale. The interface follows the browser's UI language automatically.

Keyboard navigation, visible focus states, reduced-motion preferences, semantic labels, and privacy-conscious empty search states are built into the main surfaces. Accessibility is treated as an ongoing product requirement; report a reproducible issue through [GitHub Issues](https://github.com/mcolaker/BookmarkFlow-Bar/issues).

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `bookmarks` | Read and manage the user's Chrome bookmark tree for the bar, search, folders, and context actions. |
| `storage` | Save layout, appearance, onboarding, local site exclusions, and other extension preferences. |
| `favicon` | Display Chrome-managed favicons beside bookmarks without contacting a third-party icon service. |
| `search` | Send user-submitted new-tab web searches to the search provider already selected in Chrome. |
| `<all_urls>` | Place the optional in-page bookmark interface on ordinary websites. Chrome-protected pages remain inaccessible to extensions. |

## Built with a small, auditable stack

BookmarkFlow uses Manifest V3, semantic HTML, CSS, and vanilla JavaScript. It has no runtime package dependencies and no build step.

```text
BookmarkFlow-Bar/
├── _locales/                 English and Turkish Chrome translations
├── manifest.json              Extension entry point and permissions
├── icons/                     BF application icons
├── src/                       Popup, new tab, onboarding, and content UI
├── scripts/                   Local validation and regression checks
├── store/                     Store listing, privacy, and QA materials
└── docs/                      Public product and privacy pages
```

## Local validation

With Node.js 20 or newer installed:

```bash
node scripts/validate-backlog.mjs
node --test scripts/backlog-contract.test.mjs
node scripts/validate-open-source.mjs
node --test scripts/open-source-contract.test.mjs scripts/dco-contract.test.mjs
node scripts/validate-project.mjs
node scripts/verify-public-tree.mjs
node scripts/security-regression.mjs
```

The backlog, open-source, DCO, project, and public-tree checks are platform-independent. The browser regression check additionally requires a locally installed Chromium-based browser.

Maintainers can create a versioned extension ZIP and SHA-256 checksum from a release tag with `node scripts/package-release.mjs v0.1.37`.

## Browser limitations

- Content scripts cannot run on `chrome://` pages, the Chrome Web Store, and other browser-protected surfaces.
- The new-tab experience uses a dedicated extension page because Chrome's default new tab is protected.
- BookmarkFlow is an in-page overlay, not a modification of Chrome's native toolbar.
- Sites with complex fixed headers may require the **Push page content** or **Place below overlapping headers** setting.
- Folder merge detection uses bookmark synchronization metadata available in Chrome 134 and later.

## How to support

If BookmarkFlow improves your daily browsing, choose the route that matches how you want to help.

### Try it

- **Download the [verified v0.1.37 release](https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/v0.1.37)** and follow the [installation guide](#install-from-source).
- **Read the [product website](https://mcolaker.github.io/BookmarkFlow-Bar/)** and privacy documentation before installing.

### Support the project

- **Star the repository** to help more Chrome users discover the project.
- **Watch releases** to follow verified packages and important product updates.
- **Join [GitHub Discussions](https://github.com/mcolaker/BookmarkFlow-Bar/discussions)** to ask questions, share workflows, suggest ideas, and help other users.
- **Share BookmarkFlow** with people who want faster bookmark access without moving their library to a separate service.

### Contribute

- **Report reproducible bugs or focused feature requests** through [GitHub Issues](https://github.com/mcolaker/BookmarkFlow-Bar/issues).
- **Start with a [`good first issue`](https://github.com/mcolaker/BookmarkFlow-Bar/labels/good%20first%20issue)** or a [`help wanted`](https://github.com/mcolaker/BookmarkFlow-Bar/labels/help%20wanted) task.
- **Test new releases** or contribute accessibility, localization, documentation, and narrowly scoped code improvements.

For additional support routes, see [SUPPORT.md](SUPPORT.md). For security vulnerabilities, do not open a public issue or discussion; follow the private reporting process in [SECURITY.md](SECURITY.md).

The source code is available under Apache License 2.0, including the rights to use, modify, and redistribute it under that license. Publicly distributed forks must use a distinct product identity and must not imply that they are official BookmarkFlow Bar builds; see [TRADEMARKS.md](TRADEMARKS.md).

## Contributing

Bug reports and focused improvements are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), the [Code of Conduct](CODE_OF_CONDUCT.md), and the [project governance](GOVERNANCE.md) before participating. Contributions use the [Developer Certificate of Origin](DCO). Use the repository's issue templates for reproducible bugs and feature proposals. Please report security concerns privately as described in [SECURITY.md](SECURITY.md).

## License

BookmarkFlow Bar is open-source software licensed under [Apache License 2.0](LICENSE.md). Attribution information is in [NOTICE](NOTICE). The software license does not grant rights to the BookmarkFlow Bar, BF, or Maprins Games marks; see [TRADEMARKS.md](TRADEMARKS.md) for the official-build and brand policy.
