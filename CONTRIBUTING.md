# Contributing to BookmarkFlow Bar

Thank you for helping improve BookmarkFlow Bar. Clear, focused contributions are the easiest to review and maintain.

## Before you begin

- Search existing issues before creating a new one.
- Read and follow the project [Code of Conduct](CODE_OF_CONDUCT.md).
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

## License and Developer Certificate of Origin

BookmarkFlow Bar accepts contributions only under [Apache License 2.0](LICENSE.md), without additional or different terms. Consistent with section 5 of that license, every contribution intentionally submitted for inclusion in the project is licensed to the project under Apache-2.0.

Every commit in a pull request must include a Developer Certificate of Origin sign-off. Read the repository's [DCO](DCO), then create signed-off commits with:

```bash
git commit -s
```

The resulting commit message must contain a line in this form:

```text
Signed-off-by: Your Name <your-email@example.com>
```

The sign-off certifies the contribution's origin and your right to submit it. It is not a separate license; Apache License 2.0 section 5 governs intentionally submitted contributions. The name and email in the sign-off become part of the permanent public Git history, as described by the DCO.

## Interface copy and localization

English is the default UI language and Turkish is the maintained additional locale. Put user-facing interface copy in Chrome localization messages rather than hard-coding it in HTML or JavaScript.

- Add every message key to both `_locales/en/messages.json` and `_locales/tr/messages.json`.
- Use `data-i18n` attributes for static HTML copy and `BookmarkFlowI18n.t()` for dynamic copy.
- Preserve localized ARIA labels, titles, placeholders, status messages, confirmations, and errors—not only visible labels.
- Run `node scripts/validate-project.mjs`; it rejects mismatched locale key sets and undefined message references.

## Validation

Run these checks before opening a pull request:

```bash
node scripts/validate-backlog.mjs
node --test scripts/backlog-contract.test.mjs
node scripts/validate-open-source.mjs
node --test scripts/open-source-contract.test.mjs scripts/dco-contract.test.mjs
node scripts/validate-project.mjs
node scripts/verify-public-tree.mjs
node scripts/security-regression.mjs
```

The browser regression check requires a locally installed Chromium-based browser. If it cannot run in your environment, state that clearly in the pull request.

Also verify the affected flow manually in Chrome, including keyboard behavior and both light and dark page backgrounds when relevant.

## Pull request guidelines

- Keep each pull request focused on one problem.
- Describe what changed, why it changed, and how it was tested.
- Sign off every commit according to the DCO; a pull-request checkbox is not a substitute for the commit trailer.
- Include screenshots or a short recording for visible interface changes.
- Do not commit browser profiles, local extension data, packaged releases, secrets, personal bookmarks, or browsing history.
- Preserve accessibility labels, keyboard navigation, safe URL handling, and the closed Shadow DOM boundary.
- Avoid adding runtime dependencies unless the tradeoff is documented and justified.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md), [project governance](GOVERNANCE.md), Apache License 2.0, and the DCO. The software license does not grant rights to present a fork or redistributed build as an official BookmarkFlow Bar product; see [TRADEMARKS.md](TRADEMARKS.md).
