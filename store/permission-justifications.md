# Permission Justifications

Use these explanations in the Chrome Web Store privacy and permission fields.

## bookmarks

Required to read the user's Chrome Bookmark Bar folder and bookmark folders so the extension can display bookmark titles, URLs, folder structure, and favicon-backed links in the BookmarkFlow UI. Also required to create, move, and delete bookmarks only after the user explicitly uses BookmarkFlow's add, drag reorder, or delete controls.

Bookmark access remains fail-closed until the user accepts the prominent first-run privacy disclosure. Choosing **Not now** leaves bookmark access disabled.

## storage

Required to save user preferences such as enabled state, setup profile choice, row count, dense view, page offset, search visibility, empty-search suggestion visibility, streamer mode, folder rail position, per-folder colors, optional login/payment page auto-hide, admin-panel docking, and per-site hidden hosts.

Before consent, only the local, versioned privacy-choice marker is read or written. Preference migration and normal settings access begin only after consent.

## favicon

Required to display favicons for bookmark URLs using Chrome's favicon API.

## search

Required to send web searches submitted from the custom new tab page to the default search provider already selected by the user in Chrome. BookmarkFlow Bar does not choose or replace that provider and does not receive or store the query.

## content_scripts on <all_urls>

Required to show the BookmarkFlow overlay on regular web pages. The content script renders the bar locally in closed Shadow DOM. It uses the current page URL, hostname, path, and title for the user-opened add-bookmark form, current-page bookmark matching, per-site visibility, optional sensitive-site hiding, and admin-page docking. It also performs a bounded local inspection of element geometry, computed positioning styles, and selected body classes so the expanded bar can avoid covering fixed top navigation. It does not transmit page or bookmark data to external servers.

## chrome_url_overrides.newtab

Required to provide BookmarkFlow's custom new tab page. Chrome's built-in new tab page does not allow normal content scripts, so the extension supplies its own new tab page with default-provider web search and the BookmarkFlow bookmark strip.

## Data handling statement

BookmarkFlow Bar does not collect or transmit user data to the developer. Bookmark titles, URLs, and folders are processed locally in the browser. Chrome may synchronize general display preferences through the user's Chrome Sync account, while per-site hide choices, pinned-folder choices, and per-folder colors remain device-local. A web query leaves the extension only after the user submits the new-tab search form, and Chrome sends it to the user's existing default search provider.
