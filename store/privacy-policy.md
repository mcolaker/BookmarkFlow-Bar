# BookmarkFlow Bar Privacy Policy

Effective date: August 5, 2026

BookmarkFlow Bar is a Chrome extension by Maprins Games that shows the user's Chrome Bookmark Bar as a compact, searchable page overlay and a custom new tab page.

## Data the extension accesses

BookmarkFlow Bar requests access to Chrome bookmarks so it can display bookmark titles, URLs, folders, and favicons inside the extension UI. When the user explicitly uses BookmarkFlow's add, drag, reorder, rename, color, merge, or delete controls, the extension performs the requested bookmark operation locally.

On first use after installation or this privacy update, BookmarkFlow keeps bookmark, page-context, preference, and search features off. The setup page presents the data types and purposes described in this policy and enables those features only after the user selects **I agree — enable bookmark and page access**. Choosing **Not now** leaves data access disabled.

On regular web pages, BookmarkFlow Bar processes the current page URL, hostname, path, and title locally for current-page bookmark matching, per-site visibility, optional sensitive-site hiding, admin-page docking, and to prefill the add-bookmark form when the user opens it. The content script also performs a bounded local inspection of element geometry, computed positioning styles, and selected body classes so the expanded bar can avoid covering fixed top navigation. This page information is not sent to Maprins Games and is not saved as a bookmark unless the user confirms the add action.

BookmarkFlow Bar stores general display preferences using Chrome storage sync, so Chrome may synchronize those preferences between the user's signed-in browsers when browser sync is enabled. Per-site hide choices, pinned-folder choices, and per-folder colors are stored only in Chrome's device-local storage and are not synchronized because Chrome bookmark IDs are profile-specific.

## Data collection and sharing

Maprins Games does not collect, receive, sell, rent, or share extension user data. BookmarkFlow Bar handles the bookmark, page, preference, and search data described above only to provide its user-facing features.

BookmarkFlow Bar does not send bookmark data, browsing data, settings, or analytics to Maprins Games. Chrome may synchronize general display preferences through the user's Chrome Sync account; BookmarkFlow Bar does not operate or receive data from that service.

Bookmark rendering and bookmark management happen locally in the browser. Per-site hide choices, pinned-folder choices, and per-folder colors remain on the device; Chrome handles any optional synchronization of general display preferences.

BookmarkFlow does not persist click counts, mouse position, keystrokes, or scroll position.

## Limited Use compliance

The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

User data is used only to provide BookmarkFlow Bar's disclosed bookmark workspace and search features. It is not sold or transferred outside approved use cases, used or transferred for unrelated purposes, used for personalized advertising or profiling, or used to determine creditworthiness or for lending. Maprins Games personnel do not receive or read users' bookmark, page, preference, or search data.

## Search behavior

The custom new tab page includes a search box that uses Chrome's Search API. When the user submits a search query, Chrome sends it to the default search provider already selected by the user. BookmarkFlow Bar does not choose or replace that provider and does not receive or store the query.

The bookmark search palette can hide default suggestions while the search field is empty. Streamer mode can also reduce visible bookmark text in the page overlay. These privacy display preferences are handled locally in the browser.

## Permissions

BookmarkFlow Bar uses these permissions:

- `bookmarks`: read the user's Bookmark Bar and bookmark folders, and create, move, or delete bookmarks only after explicit user actions.
- `storage`: save general preferences through Chrome Sync storage and keep per-site hide choices, pinned-folder choices, and per-folder colors in device-local Chrome storage.
- `favicon`: show favicons for bookmark URLs.
- `search`: send user-submitted new-tab searches to the default search provider already selected in Chrome.
- `<all_urls>` content script access: display the bar on regular web pages and locally evaluate the limited page context needed for current-page matching, visibility rules, and non-overlapping placement.

## Optional login and payment page hiding

BookmarkFlow Bar can optionally hide on login, banking, payment, checkout, and wallet-related hosts when the user enables this setting. Users can also manually hide or show the bar per site from the extension popup.

## Contact

For privacy or security reports that may contain sensitive details, use GitHub Private Vulnerability Reporting:

https://github.com/mcolaker/BookmarkFlow-Bar/security/advisories/new

For general product support, open an issue without including personal bookmarks, browsing information, or credentials:

https://github.com/mcolaker/BookmarkFlow-Bar/issues

## Changes

This policy may be updated when the extension behavior changes. The effective date above will be updated when material changes are made.
