# Chrome Web Store Listing — English

## Product name

BookmarkFlow Bar

## Short description

Turn Chrome bookmarks into a multi-row bar, searchable command palette, and organized new-tab workspace.

## Detailed description

Your bookmarks already contain the tools, references, and destinations you use every day. BookmarkFlow Bar makes them faster to reach without moving them into another service.

Add a customizable multi-row bookmark bar to ordinary web pages, search your bookmark library from the keyboard, pin important folders to a side rail, and use a focused BookmarkFlow new-tab workspace.

HIGHLIGHTS

• Multi-row bookmark bar with favicons, titles, compact density, and horizontal scrolling
• Fast command palette with keyboard navigation
• Optional left or right folder rail with device-local pinned folders
• Context actions for opening, copying, renaming, adding, deleting, coloring, and reordering
• Streamer mode for a cleaner icon-focused presentation during screen sharing
• Per-site visibility controls and optional hiding on login, payment, and banking pages
• Built-in onboarding profiles and an animated feature tour
• No BookmarkFlow account, analytics, advertising SDK, or external bookmark server

PRIVACY-FIRST BY DESIGN

BookmarkFlow works with the bookmark data already managed by Chrome. It does not upload your bookmark library to a BookmarkFlow server. General display preferences may use Chrome Sync when available, while per-site exclusions and pinned folder choices stay on the current device.

Only HTTP, HTTPS, and mailto bookmark targets are rendered or opened. The interface shown inside websites runs in an extension-owned closed Shadow DOM to reduce interference from page scripts and styles.

HOW IT WORKS

After installation, follow the built-in setup tour, choose a starting layout, and optionally hide Chrome's native bookmark bar. Expand BookmarkFlow with the compact BF control, open search with Ctrl+Shift+E, and adjust shortcuts at chrome://extensions/shortcuts.

IMPORTANT LIMITATIONS

Chrome does not allow extensions to place content scripts on protected pages such as chrome:// pages or the Chrome Web Store. BookmarkFlow uses its own extension page for the new-tab experience.

## Suggested category

Productivity

## Language

English

## Support URL

https://github.com/09mc/BookmarkFlow-Bar/issues

## Privacy policy URL

https://09mc.github.io/BookmarkFlow-Bar/privacy/

## Single purpose statement

BookmarkFlow Bar improves access to and organization of the user's existing Chrome bookmarks through a customizable in-page bar, searchable palette, folder rail, and new-tab workspace.

## Permission rationale

- `bookmarks`: Reads and manages the user's bookmark tree for display, search, folders, and user-initiated bookmark actions.
- `storage`: Saves layout, appearance, onboarding, visibility, and local folder/site preferences.
- `favicon`: Displays Chrome-managed bookmark favicons without using an external icon service.
- `<all_urls>`: Shows the optional bookmark interface on ordinary websites selected by the user; Chrome-protected pages remain inaccessible.
