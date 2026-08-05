# Chrome Web Store Privacy Dashboard Draft

Use this as a draft while filling the Chrome Web Store Developer Dashboard.

## Single purpose

BookmarkFlow Bar displays the user's Chrome Bookmark Bar in a compact, searchable overlay and provides a custom new tab page for faster bookmark access.
It includes privacy display options such as the first-run privacy profile, hiding empty-search suggestions, and streamer mode for reducing visible bookmark text during recording or presenting.

## Data usage

The extension accesses bookmark data only to display the user's own bookmarks and to perform bookmark changes that the user explicitly requests through the extension UI, such as adding, moving, renaming, merging, coloring, or deleting an item.

The extension stores settings only to preserve user preferences.

On installation or after a material privacy update, BookmarkFlow keeps bookmark, page-context, preference, and search features off until the user reviews a prominent first-run disclosure and affirmatively selects **I agree — enable bookmark and page access**. Selecting **Not now** keeps those features disabled.

Maprins Games does not collect, receive, sell, or share extension user data. When the user intentionally submits a new-tab search, Chrome's Search API sends the query to the default search provider already selected by the user; BookmarkFlow Bar and Maprins Games do not receive or store that query.

## User data categories

Recommended dashboard selections (local handling must still be disclosed):

- **Web history: select.** BookmarkFlow handles bookmark URLs and the current page URL, hostname, and path locally for bookmark matching, per-site visibility, sensitive-site hiding when enabled, admin-page docking, and the user-opened add-bookmark form. This data is not sent to the developer.
- **Website content: select.** BookmarkFlow handles bookmark titles, the current page title used for bookmark matching and to prefill the user-opened add form, and text intentionally submitted through the new-tab search field. The content script also performs a bounded local inspection of element geometry, computed positioning styles, and selected body classes to keep the expanded bar from covering fixed top navigation. Page and bookmark content stays local; a submitted search is sent by Chrome to the user's existing default search provider.
- **User activity: leave unselected.** BookmarkFlow does not persist click counts, mouse position, scrolling, network monitoring, or keystroke logs. New-tab scroll position is not stored.
- Personal communications: not collected by the developer.
- Location: not collected.
- Authentication information: not collected.
- Personally identifiable information: not collected.

Bookmark titles and URLs are accessed locally through the Chrome bookmarks permission. They are not transmitted to the developer.

These selections intentionally describe data handled on-device as well as the user-initiated Search API transfer. They must match the current Chrome Web Store dashboard, privacy policy, and shipped behavior before every submission.

## Limited use certification

BookmarkFlow Bar uses accessed data only to provide the visible bookmark bar, user-initiated bookmark management, bookmark search, per-site visibility settings, and custom new tab experience.

BookmarkFlow Bar does not transfer user data to the developer or unrelated third parties. When the user intentionally submits a query from the new tab page, Chrome's Search API sends it to the default search provider already selected by the user.

Confirm all three dashboard certifications:

- User data is not sold or transferred to third parties outside the approved use cases. Chrome Sync and the user-initiated Search API transfer exist only to provide the disclosed extension features.
- User data is not used or transferred for purposes unrelated to BookmarkFlow Bar's single purpose.
- User data is not used or transferred to determine creditworthiness or for lending purposes.

BookmarkFlow Bar does not use user data for personalized advertising or profiling, and Maprins Games personnel do not receive or read users' bookmark, page, preference, or search data.

## Privacy policy URL

https://mcolaker.github.io/BookmarkFlow-Bar/privacy/
