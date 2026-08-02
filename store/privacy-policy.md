# BookmarkFlow Bar Privacy Policy

Effective date: August 2, 2026

BookmarkFlow Bar is a Chrome extension by Maprins Games that shows the user's Chrome Bookmark Bar as a compact, searchable page overlay and a custom new tab page.

## Data the extension accesses

BookmarkFlow Bar requests access to Chrome bookmarks so it can display bookmark titles, URLs, folders, and favicons inside the extension UI. When the user explicitly uses BookmarkFlow's add, drag, reorder, rename, color, merge, or delete controls, the extension performs the requested bookmark operation locally.

BookmarkFlow Bar stores general display preferences using Chrome storage sync, so Chrome may synchronize those preferences between the user's signed-in browsers when browser sync is enabled. The list of sites where the user has chosen to hide the bar is stored only in Chrome's device-local storage and is not synchronized.

## Data collection and sharing

BookmarkFlow Bar does not collect, sell, rent, transfer, or share user data.

BookmarkFlow Bar does not send bookmark data, browsing data, settings, or analytics to Maprins Games. Chrome may synchronize general display preferences through the user's Chrome Sync account; BookmarkFlow Bar does not operate or receive data from that service.

Bookmark rendering and bookmark management happen locally in the browser. Per-site hide choices remain on the device; Chrome handles any optional synchronization of general display preferences.

## Search behavior

The custom new tab page includes a search box. When the user submits a search query, the browser is navigated to Google Search with that query. This only happens after the user submits the search form. BookmarkFlow Bar does not receive, store, or transmit that query to Maprins Games.

The bookmark search palette can hide default suggestions while the search field is empty. Streamer mode can also reduce visible bookmark text in the page overlay. These privacy display preferences are handled locally in the browser.

## Permissions

BookmarkFlow Bar uses these permissions:

- `bookmarks`: read the user's Bookmark Bar and bookmark folders, and create, move, or delete bookmarks only after explicit user actions.
- `storage`: save general preferences through Chrome Sync storage and keep per-site hide choices in device-local Chrome storage.
- `favicon`: show favicons for bookmark URLs.
- `<all_urls>` content script access: display the bar on regular web pages.

## Optional login and payment page hiding

BookmarkFlow Bar can optionally hide on login, banking, payment, checkout, and wallet-related hosts when the user enables this setting. Users can also manually hide or show the bar per site from the extension popup.

## Contact

For privacy or security reports that may contain sensitive details, use GitHub Private Vulnerability Reporting:

https://github.com/09mc/BookmarkFlow-Bar/security/advisories/new

For general product support, open an issue without including personal bookmarks, browsing information, or credentials:

https://github.com/09mc/BookmarkFlow-Bar/issues

## Changes

This policy may be updated when the extension behavior changes. The effective date above will be updated when material changes are made.
