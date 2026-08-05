# Project Roadmap

BookmarkFlow Bar develops in small, reviewable releases shaped by real browser constraints and user feedback. The roadmap is directional rather than a promise of dates or features.

## Current priorities

### 1. Reliable public distribution

- Maintain the live Chrome Web Store listing and ship narrowly reviewed updates through the same extension ID.
- Keep store disclosures, permissions, privacy documentation, source tags, and release packages aligned.
- Verify clean installation and update behavior from the public store package.

### 2. Feedback-driven quality

- Triage reproducible reports from real browsing workflows.
- Connect maintenance releases to the issues or discussions that motivated them.
- Expand regression coverage when a defect exposes a reusable test boundary.

### 3. Accessibility and localization

- Preserve complete English and Turkish locale parity.
- Improve keyboard, focus, reduced-motion, contrast, and assistive-technology behavior.
- Add new locales only when their interface strings and ongoing maintenance have a clear owner.

### 4. Privacy and security assurance

- Keep bookmark processing local to Chrome and avoid project-operated analytics or bookmark-sync services.
- Maintain synthetic security fixtures so tests never require personal bookmarks, credentials, or browser profiles.
- Review broad browser permissions and sensitive-page behavior whenever Chrome platform capabilities change.

### 5. Contributor experience

- Keep setup dependency-light and validation reproducible.
- Break confirmed accessibility, localization, documentation, and test improvements into focused contribution opportunities.
- Document decisions and release evidence so outside contributors can review the same facts as maintainers.

## Areas under evaluation

- Compatibility boundaries for other Chromium-based browsers.
- A maintainable path for additional locales.
- Maintainer-only automation for issue triage, release notes, localization parity, and test review with mandatory human approval.

## Non-goals

BookmarkFlow does not plan to require a project account, upload bookmark libraries to a project server, sell browsing data, or add tracking solely to manufacture adoption metrics.

Use [GitHub Discussions](https://github.com/mcolaker/BookmarkFlow-Bar/discussions) for exploratory ideas and [GitHub Issues](https://github.com/mcolaker/BookmarkFlow-Bar/issues) for reproducible, scoped work.
