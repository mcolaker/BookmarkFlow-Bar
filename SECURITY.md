# Security Policy

BookmarkFlow Bar handles sensitive browser context: bookmark titles, bookmark URLs, and page-level integration. Security reports are taken seriously.

## Supported versions

Security fixes are applied to the latest version on the `main` branch. Older snapshots may not receive fixes.

## Report a vulnerability

Please do **not** open a public issue for a suspected vulnerability.

Use [GitHub Private Vulnerability Reporting](https://github.com/mcolaker/BookmarkFlow-Bar/security/advisories/new) and include:

- the affected version or commit;
- a concise description of the impact;
- reproducible steps or a minimal proof of concept;
- affected browser and operating system;
- any suggested mitigation, if known.

Do not include real personal bookmarks, credentials, tokens, browser profiles, or unrelated user data in the report. Use synthetic examples and redact sensitive values.

## Response process

The project owner will assess the report, confirm whether it is reproducible, and coordinate a fix before public disclosure when appropriate. Please allow reasonable time for investigation and remediation.

## Security boundaries

The project intentionally:

- renders only `http:`, `https:`, and `mailto:` bookmark targets;
- keeps the in-page interface in an extension-owned closed Shadow DOM;
- stores per-site exclusions locally rather than syncing them;
- avoids analytics, advertising SDKs, remote APIs, and external favicon services;
- excludes generated browser profiles and local release artifacts from the public repository.

Chrome-protected pages such as `chrome://` and the Chrome Web Store are outside the extension's content-script scope by browser policy.
