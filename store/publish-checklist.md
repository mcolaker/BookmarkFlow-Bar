# Publish Checklist

## Before upload

- Run all local syntax checks.
- Run the manual QA checklist.
- Reload the extension in Chrome and test the final package.
- Confirm `manifest.json` version is correct and the release tag is exactly `v<manifest version>`.
- Confirm the release tag points to the reviewed source commit and the working tree has no uncommitted release changes.
- Confirm no private files are included in the upload zip.
- Confirm every store image and bundled binary has a current entry in `docs/ASSET_PROVENANCE.md`; do not use personal bookmark data or undocumented third-party assets.
- Confirm `LICENSE.md`, `NOTICE`, and `TRADEMARKS.md` are present in the final ZIP and describe Apache-2.0 code rights separately from project-brand rights.
- Confirm maintainer-only files such as `DCO`, `GOVERNANCE.md`, `ROADMAP.md`, `SUPPORT.md`, and `CODE_OF_CONDUCT.md` are not bundled in the Chrome ZIP.
- Confirm pending `src/assets/tour/search-palette.gif` and `src/assets/tour/context-actions.gif` captures are excluded until their corrected versions pass original-resolution visual review.
- Confirm `https://mcolaker.github.io/BookmarkFlow-Bar/privacy/` is publicly reachable.

## Chrome Web Store assets

Required:

- Extension icon: `icons/icon128.png`
- Small promotional image: `store/assets/promo-440x280.png`
- Five English screenshots:
  - `store/assets/screenshot-newtab-1280x800.png`
  - `store/assets/screenshot-overlay-1280x800.png`
  - `store/assets/screenshot-palette-1280x800.png`
  - `store/assets/screenshot-folder-rail-1280x800.png`
  - `store/assets/screenshot-streamer-1280x800.png`

Recommended:

- English marquee: `store/assets/marquee-1400x560.png`
- Turkish promo, marquee, and the same five screenshot names under `store/assets/tr/`
- Verify each localized asset visually in its matching Chrome Web Store language entry; do not upload the Turkish set to the English listing or vice versa.

## Dashboard fields

- Existing item: `https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf`
- Extension ID: `iaikobkolclhhpcogacjkenijlfaibpf`
- Name: BookmarkFlow Bar
- Category: Workflow & Planning (İş Akışı ve Planlama)
- Primary language: English
- Additional language: Turkish
- English description: use `store/listing-en.md`
- Turkish description: use `store/listing-tr.md`
- Privacy policy URL: `https://mcolaker.github.io/BookmarkFlow-Bar/privacy/`
- Support URL: `https://github.com/mcolaker/BookmarkFlow-Bar/issues`
- Reviewer notes: use `store/reviewer-notes.md`
- Permission justifications: use `store/permission-justifications.md`
- Privacy data types: select **Web history** and **Website content** as documented in `store/privacy-dashboard-answers.md`; leave the other categories unselected unless shipped behavior changes.
- Limited Use: confirm all three certification statements only after comparing the current package with the privacy policy and dashboard draft.
- Prominent disclosure: confirm the packaged onboarding page keeps bookmark, page-context, preference, and search features off until the user selects **I agree — enable bookmark and page access**.

## Final package

Create the release package from the final `v<manifest version>` tag. Do not package a moving branch or an untagged working tree:

```bash
node scripts/package-release.mjs v<manifest-version>
```

Before upload, inspect the ZIP file list and confirm its manifest version matches the tag and filename. Recompute SHA-256 and confirm it equals the generated checksum file. Upload only the extension ZIP to the Chrome Web Store dashboard:

`dist/bookmarkflow-bar-<manifest-version>.zip`

Keep `dist/bookmarkflow-bar-<manifest-version>.zip.sha256` with the GitHub release and release evidence; it is not a second Chrome Web Store upload.

Record the immutable source tag, commit SHA, archive filename, and SHA-256 digest together in the release notes and store submission evidence.
