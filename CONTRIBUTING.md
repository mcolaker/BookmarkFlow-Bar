# Contributing to BookmarkFlow Bar

Thank you for helping improve BookmarkFlow Bar. Clear, focused contributions are the easiest to review and maintain.

## Before you begin

- Search existing issues before creating a new one.
- Use the bug report template for defects and include exact reproduction steps.
- Use the feature request template to explain the user problem before proposing an implementation.
- Report security vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## Local setup

1. Fork and clone the repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the repository root.
5. After a code change, use the extension card's **Reload** button and refresh the page under test.

No package installation or build step is required.

## Validation

Run these checks before opening a pull request:

```bash
node scripts/validate-project.mjs
node scripts/verify-public-tree.mjs
node scripts/security-regression.mjs
```

The browser regression check requires a locally installed Chromium-based browser. If it cannot run in your environment, state that clearly in the pull request.

Also verify the affected flow manually in Chrome, including keyboard behavior and both light and dark page backgrounds when relevant.

## Pull request guidelines

- Keep each pull request focused on one problem.
- Describe what changed, why it changed, and how it was tested.
- Include screenshots or a short recording for visible interface changes.
- Do not commit browser profiles, local extension data, packaged releases, secrets, personal bookmarks, or browsing history.
- Preserve accessibility labels, keyboard navigation, safe URL handling, and the closed Shadow DOM boundary.
- Avoid adding runtime dependencies unless the tradeoff is documented and justified.

By submitting a contribution, you confirm that you have the right to submit the work. Public visibility of this repository does not grant a license for unrelated reuse or redistribution.
