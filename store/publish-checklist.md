# Publish Checklist

## Before upload

- Run all local syntax checks.
- Run the manual QA checklist.
- Reload the extension in Chrome and test the final package.
- Confirm `manifest.json` version is correct.
- Confirm no private files are included in the upload zip.
- Confirm `store/privacy-policy.html` is published at a public URL.

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
- Category: Productivity
- Language: Turkish
- Short description: use `store/listing-tr.md`
- Detailed description: use `store/listing-tr.md`
- Privacy policy URL: publish `store/privacy-policy.html` online first
- Suggested privacy policy URL: `https://maprins.games/privacy-policy`
- Reviewer notes: use `store/reviewer-notes.md`
- Permission justifications: use `store/permission-justifications.md`

## Final package

Upload:

`dist/bookmarkflow-bar-0.1.35.zip`
