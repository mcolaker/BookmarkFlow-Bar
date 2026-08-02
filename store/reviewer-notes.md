# Chrome Web Store Reviewer Notes

BookmarkFlow Bar is a bookmark productivity extension.

## Core behavior

The extension reads the user's Chrome Bookmark Bar and shows those bookmarks in a compact overlay on regular web pages. On first install it opens a setup guide where the user can choose a display/privacy profile. The overlay starts in a small control state. Clicking the BF button or pressing Alt + Shift + B expands the bookmark bar. Clicking the search icon, pressing Alt + Space, pressing Ctrl + Shift + E, or pressing Ctrl + K opens/closes the bookmark search palette. Alt + Shift + M toggles streamer mode, which can reduce visible bookmark text for recording or presenting. The search palette supports keyboard navigation with Arrow Up, Arrow Down, Home, End, and Enter.

The extension also overrides Chrome's new tab page with a local extension page that includes a web search field and the user's BookmarkFlow bookmark strip. The search field uses Chrome's Search API and respects the default search provider already selected by the user. The new tab bookmark strip remembers its horizontal scroll position locally.

The plus button opens a local add-bookmark form. On regular web pages it pre-fills the current page title and URL; on the custom new tab page the user can type a URL manually. New bookmarks are created in Chrome's Bookmark Bar and duplicate exact URLs are not added twice.

## Privacy behavior

BookmarkFlow Bar does not send bookmark data, browsing data, settings, or analytics to the developer. Chrome may synchronize general display preferences through the user's Chrome Sync account when browser sync is enabled.

Bookmark data is processed locally in the browser. General display preferences use Chrome Sync storage, while the per-site hide list remains in device-local Chrome storage.

The custom new tab search field calls Chrome's Search API only when the user submits a query. BookmarkFlow Bar does not choose or replace the user's search provider.

The bookmark search palette hides empty-query suggestions by default, and streamer mode can hide bookmark labels in the page overlay. Chrome may synchronize these general display preferences between the user's signed-in browsers.

Right-clicking a BookmarkFlow bookmark opens a local extension menu for opening the link, copying its URL, moving the bookmark within the same Chrome bookmark folder, or deleting the bookmark from Chrome bookmarks after confirmation.

## How to test

1. Load the unpacked extension.
2. Open a normal website such as `https://example.com`.
3. Confirm the small BookmarkFlow control group appears.
4. Click `BF` to expand the bookmark bar.
5. Click the search icon, press `Alt + Space`, press `Ctrl + Shift + E`, or press `Ctrl + K` to open bookmark search.
6. Click the plus button, add a test bookmark, and confirm it appears in the Bookmark Bar.
7. Right-click a test bookmark and confirm the local menu can copy, move, or delete it after confirmation.
8. Open a new tab and confirm the custom new tab page appears.
9. Change row count in the popup and confirm the new tab bookmark strip follows it. Scroll the strip horizontally, open another new tab, and confirm the same horizontal position is restored.
10. Open a WordPress admin URL containing `/wp-admin/` and confirm the bar docks to the bottom. Fixed-header apps such as TradingView can also dock the expanded bar to the bottom to avoid covering top app controls.
11. Open a login/payment/banking-like host and confirm the bar stays visible by default, then auto-hides only after optional login/payment page hiding is enabled.
12. Use the extension popup to hide and show the current site.

## Permissions

The extension uses only `bookmarks`, `storage`, and `favicon` permissions plus a content script on regular web pages.

`bookmarks` is required to render bookmarks and to create, move, or delete bookmarks only after explicit user actions. `storage` is required for preferences. `favicon` is required for bookmark favicons. `search` is required to submit new-tab web searches through the user's existing default search provider. The content script is required to render the overlay on websites.
