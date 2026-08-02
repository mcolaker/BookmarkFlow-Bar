# Publish Checklist

## Before upload

- Run all local syntax checks.
- Run the manual QA checklist.
- Reload the extension in Chrome and test the final package.
- Confirm `manifest.json` version is correct.
- Confirm no private files are included in the upload zip.
- Confirm `https://mcolaker.github.io/BookmarkFlow-Bar/privacy/` is publicly reachable.

## Chrome Web Store assets

Required:

- Extension icon: `icons/icon128.png`
- Small promotional image: `store/assets/promo-440x280.png`
- At least one screenshot: `store/assets/screenshot-newtab-1280x800.png`

Recommended:

- `store/assets/screenshot-overlay-1280x800.png`
- `store/assets/screenshot-palette-1280x800.png`

## Dashboard fields

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

## Final package

Create the release package from the final tag:

```bash
node scripts/package-release.mjs v0.1.36
```

Upload both generated files:

`dist/bookmarkflow-bar-0.1.36.zip`

`dist/bookmarkflow-bar-0.1.36.zip.sha256`
