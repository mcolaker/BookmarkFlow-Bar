# BookmarkFlow Bar v0.1.44 Community Launch Kit

This kit contains ready-to-use, optimized launch copy for Hacker News (Show HN), Product Hunt, and Reddit communities. All copy is in 100% English, highlights BookmarkFlow's local-first privacy architecture, and showcases the new v0.1.44 features (Bookmark Health & Dead Link Inspector, Smart Tags & `#tag` Spotlight Filtering, Multi-Theme Engine, and Cross-Browser Support).

---

## 1. Hacker News (Show HN)

### Post Title
```
Show HN: BookmarkFlow – Local-first multi-row bookmark bar and Spotlight search
```

### Post Body
```markdown
Hi HN,

I built BookmarkFlow Bar (https://github.com/mcolaker/BookmarkFlow-Bar) because Chrome’s default bookmark bar has been stuck on a single cramped row for over a decade.

Most third-party bookmark extensions either force you into a proprietary cloud dashboard or harvest browsing metadata through analytics SDKs. BookmarkFlow takes the opposite approach: it is 100% local-first, requires no external account, makes zero telemetry calls, and works directly with the native browser bookmark tree already on your machine.

Key features in v0.1.44:

1. **Multi-Row In-Page Bar**: Expands into 1 to 4 rows on demand, complete with density controls, folder rails, streamer mode (icon-only), and automatic suppression on sensitive hosts (banking, payment, auth).
2. **Spotlight Search Palette**: A Raycast-style keyboard palette (Alt+Shift+K) with cyclic arrow navigation, instant suggestions, and `#tag` filtering.
3. **Local Bookmark Health & Dead Link Inspector**: A zero-telemetry scanner that audits your bookmark tree for dropped domains, unreachable servers, and duplicate URLs. Pings run locally via concurrency-limited (max 5 simultaneous connections) HEAD requests with strict 5-second AbortController timeouts to prevent network congestion.
4. **Smart Tags & `#tag` Filtering**: Automatically infers tags from your folder hierarchy (e.g., `Work / Dev Tools` -> `#work`, `#dev`, `#tools`) and domain roots, while letting you add custom tags via right-click.
5. **Multi-Theme Engine**: 4 handcrafted dark palettes (Gold Obsidian, OLED Midnight Black, Emerald Matrix, and Cyber Indigo) synchronized live across popup, new tab, and page bar.
6. **Cross-Browser Support**: Manifest V3 compliant packages for Chrome, Mozilla Firefox (AMO-ready), and Microsoft Edge.

Under the hood:
- Written in vanilla ES modules with closed Shadow DOM isolation (no CSS bleed into pages).
- Deterministic test suite with 58 unit/contract tests and automated dual-locale (English/Turkish) Playwright regression gates.
- Licensed under Apache 2.0.

GitHub: https://github.com/mcolaker/BookmarkFlow-Bar
Chrome Web Store: https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf
Product Page: https://mcolaker.github.io/BookmarkFlow-Bar/

I'd love to hear your feedback on the architecture, UX, or features you'd like to see next!
```

---

## 2. Product Hunt

### Tagline
```
A private, local-first multi-row bookmark bar and Spotlight search
```

### Short Description (60 characters)
```
Turn Chrome & Firefox bookmarks into a fast power-user workspace
```

### Topics
`Productivity`, `Open Source`, `Browser Extensions`, `Privacy`, `Developer Tools`

### Maker Comment / First Comment
```markdown
Hey Product Hunt community! 👋

We’ve all got hundreds—maybe thousands—of bookmarks buried inside nested browser menus that we never look at again. Cloud bookmark managers solve this by asking you to export your data into yet another proprietary SaaS.

BookmarkFlow Bar takes a fundamentally different path: **Privacy-First & Local-First**.

It transforms your existing native browser bookmark library into:
✨ **Multi-Row Bar**: Expand to 1-4 rows right on top of web pages when you need it.
⚡ **Spotlight Search Palette**: Press `Alt+Shift+K` to search bookmarks and web instantly with arrow key cyclic navigation.
🏷️ **Smart Tags**: Type `#tag` to filter bookmarks. Tags are automatically inferred from your folders and domains, or customized via right-click.
🩺 **Bookmark Health Inspector**: A 100% local, zero-telemetry tool that cleans out dead links, unreachable servers, and duplicate bookmarks.
🎨 **4 Obsidian Themes**: Gold Obsidian, OLED Midnight Black, Emerald Matrix, and Cyber Indigo.
🦊 **Cross-Browser**: Available for Chrome, Mozilla Firefox, and Edge.

Everything runs 100% locally in your browser. No telemetry, no analytics, no external accounts, completely open-source under Apache 2.0.

Try it out on Chrome Web Store or download the offline release on GitHub:
👉 https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf
👉 https://github.com/mcolaker/BookmarkFlow-Bar

Looking forward to your feedback and ideas! 🚀
```

---

## 3. Reddit Post Templates

### A. For `r/browsers`
**Title**: `BookmarkFlow Bar: Open-source multi-row bookmark bar, Spotlight search, and dead link inspector for Chrome & Firefox`

```markdown
Hey r/browsers,

If you’ve ever wished Chrome or Firefox had a true multi-row bookmark bar without installing bloated SaaS apps, I built BookmarkFlow Bar:
https://github.com/mcolaker/BookmarkFlow-Bar

Highlights:
- **1-4 Rows In-Page Bar**: Sits neatly at the top or bottom of web pages, expands with `Alt+Shift+B`, and collapses to a discrete pill.
- **Spotlight Search Palette**: `Alt+Shift+K` opens a Raycast-style keyboard palette.
- **Smart Tags & `#tag` Queries**: Search `#dev` or `#tools` to find bookmarks grouped by topic, auto-inferred from folders or custom-tagged.
- **Local Dead Link Cleaner**: Finds dead bookmarks and duplicates using concurrency-limited safe local pings (5s timeout, max 5 parallel requests). Zero data sent to any third party.
- **4 Obsidian Dark Themes**: Pure OLED black, deep navy/gold, cyber green, and synthwave indigo.
- **Clean MV3 Architecture**: Vanilla JS, closed Shadow DOM, strict CSP, Apache 2.0 licensed.

Direct download and Chrome Web Store links:
- Chrome Web Store: https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf
- GitHub Releases (Chrome, Firefox & Edge ZIPs): https://github.com/mcolaker/BookmarkFlow-Bar/releases

Feedback and feature suggestions are very welcome!
```

### B. For `r/Productivity`
**Title**: `I built a zero-telemetry tool that turns messy browser bookmarks into a Spotlight command palette and multi-row workspace`

```markdown
Hi everyone,

Like many of you, my bookmark library had become a graveyard of forgotten links, broken domains, and duplicates spread across dozens of folders.

I built BookmarkFlow Bar to fix this with zero privacy trade-offs:

1. **Spotlight Keyboard Palette (`Alt+Shift+K`)**: Search your entire bookmark collection in milliseconds.
2. **Smart Tags (`#tag`)**: You don't have to manually reorganize everything. BookmarkFlow infers tags from your existing folder paths and domain names, letting you search `#dev`, `#finance`, or `#reading`.
3. **Local Health & Broken Link Inspector**: Audits your library locally, checks for 404s and unreachable servers without sending your URLs anywhere, and lets you delete dead links with one click.
4. **Focused New Tab**: Minimalist dashboard with an ambient local-time clock, contextual greetings, and quick shortcuts.

It’s completely open-source (Apache 2.0), works offline, has no analytics or tracking SDKs, and runs on Chrome, Firefox, and Edge.

Check it out: https://github.com/mcolaker/BookmarkFlow-Bar
Store link: https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf
```

### C. For `r/selfhosted` / `r/privacy`
**Title**: `BookmarkFlow Bar: A 100% local-first, zero-telemetry bookmark workspace with built-in dead link scanner (Chrome & Firefox)`

```markdown
Hey everyone,

For those who want power-user bookmark management without hosting a separate Linkwarden/Shiori instance or trusting proprietary browser add-ons with full browsing history:

BookmarkFlow Bar is an Apache 2.0 extension that keeps all bookmark processing 100% inside your browser's local sandbox.

Privacy & Security Architecture:
- **Zero Network Calls**: No analytics, telemetry, crash reporting, or external API endpoints.
- **Local Link Health Checker**: The link scanner runs strictly via local `fetch(url, { method: "HEAD", mode: "no-cors" })` calls with 5s timeouts and max 5 concurrent requests. No URL is ever transmitted to an external checker service.
- **Closed Shadow DOM**: In-page bar elements live in a closed Shadow DOM root, preventing page scripts from reading bookmark data or injecting rogue styles.
- **Fail-Closed Consent**: Data access remains completely disabled until affirmative user consent.
- **Sensitive Host Protection**: Automatically disables itself on login, banking, and payment sites.

GitHub: https://github.com/mcolaker/BookmarkFlow-Bar
```
