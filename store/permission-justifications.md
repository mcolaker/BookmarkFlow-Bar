# Permission Justifications

Use these explanations in the Chrome Web Store privacy and permission fields.

## bookmarks

Required to read the user's Chrome Bookmark Bar folder and bookmark folders so the extension can display bookmark titles, URLs, folder structure, and favicon-backed links in the BookmarkFlow UI. Also required to create, move, and delete bookmarks only after the user explicitly uses BookmarkFlow's add, drag reorder, or delete controls.

## storage

Required to save user preferences such as enabled state, setup profile choice, row count, dense view, page offset, search visibility, empty-search suggestion visibility, streamer mode, folder rail position, per-folder colors, optional login/payment page auto-hide, admin-panel docking, and per-site hidden hosts.

## favicon

Required to display favicons for bookmark URLs using Chrome's favicon API.

## content_scripts on <all_urls>

Required to show the BookmarkFlow overlay on regular web pages. The content script renders the bar locally in the page, uses closed Shadow DOM, and does not transmit page or bookmark data to external servers.

## chrome_url_overrides.newtab

Required to provide BookmarkFlow's custom new tab page. Chrome's built-in new tab page does not allow normal content scripts, so the extension supplies its own new tab page with Google search and the BookmarkFlow bookmark strip.

## Data handling statement

BookmarkFlow Bar does not collect or transmit user data to the developer. Bookmark titles, URLs, and folders are processed locally in the browser. Chrome may synchronize general display preferences through the user's Chrome Sync account, while the per-site hide list remains device-local. The only external navigation is user-initiated search from the custom new tab page to Google Search.
