# Manual QA Checklist

Run this before submitting a new Chrome Web Store package.

## Install and reload

- Open `chrome://extensions`.
- Enable Developer mode.
- Load unpacked from the local `BookmarkFlow-Bar` project folder.
- Reload the extension after every code change.
- On a fresh install, confirm `src/onboarding.html` opens automatically.
- On a fresh install, confirm the folder rail is enabled on the left by default.
- In the onboarding page, choose each profile and confirm the selected state changes.
- Apply the **Streamer / privacy** profile and confirm streamer mode, one-row compact view, and hidden empty-search suggestions are saved.
- Reopen the onboarding page from the popup and confirm it loads again.

## Normal website

- Open `https://example.com`.
- Confirm the compact control group appears without covering important page controls.
- Click `BF` and confirm the bookmark bar expands.
- Click `BF` again and confirm it collapses.
- Click the search icon and confirm the search palette opens.
- Press `Ctrl + K` and confirm the search palette opens.
- Press `Alt + Space` and confirm the search palette opens/closes.
- Press `Ctrl + Shift + E` and confirm the search palette opens.
- Press `Alt + Shift + B` and confirm the bar expands/collapses.
- Press `Alt + Shift + H` and confirm the bar hides/restores.
- Press `Alt + Shift + M` and confirm streamer mode toggles bookmark labels.
- Confirm the empty command palette does not list bookmarks when **Hide suggestions before typing** is enabled.
- Click `+`, confirm the add-bookmark dialog opens with the current page title and URL.
- Add a test bookmark and confirm it appears in the bar.
- Add a URL that already exists in the same target and confirm the dialog stays open with a readable warning.
- Click **Add anyway** after the duplicate warning and confirm a duplicate bookmark is created.
- Open a folder, click `+`, add a test URL, and confirm it is created inside that folder.
- Type a bookmark title and confirm results filter.
- Press `ArrowDown` / `ArrowUp` and confirm the active search result changes.
- Press `Enter` and confirm the active result opens.
- Right-click a bookmark and confirm the BookmarkFlow menu appears instead of Chrome's native link menu.
- Enable the folder rail, confirm folders move to the selected side and direct bookmarks remain in the horizontal bar.
- Click a folder in the folder rail and confirm its bookmarks open beside the rail.
- Right-click a folder in the folder rail and confirm add bookmark, create child folder, rename, move, and delete actions appear.
- Right-click a folder, pick a folder color, and confirm the color is applied in the horizontal bar, folder rail, and new tab.
- Right-click the same folder, choose the default/clear swatch, and confirm it returns to the default folder color.
- Drag a folder in the folder rail and confirm the yellow insertion marker and mouse-following ghost appear before release.
- Release a dragged bookmark or folder and confirm the saved Chrome bookmark order actually changes.
- Use **Move earlier** / **Move later** on a test bookmark and confirm it moves one slot.
- Use **Move to beginning** / **Move to end** on a test bookmark and confirm it moves to the edge.
- Use **Copy address** and confirm the bookmark URL is copied.
- Use **Delete bookmark** on a test bookmark and confirm it is removed from the bar after confirmation.
- Click `x` and confirm the bar becomes a small BF restore button.
- Click the small BF restore button and confirm the control group returns.

## YouTube

- Open a YouTube watch page.
- Confirm the compact control group does not cover key player controls.
- Expand with `BF`, then collapse.
- Use `x`, then restore with the small BF button.

## Fixed header and admin pages

- Open a URL containing `/wp-admin/`.
- Confirm the bar docks to the bottom when **Move below conflicting app bars** is enabled.
- Confirm editor top controls remain clickable.
- Open a fixed-header app such as TradingView.
- Confirm the expanded bar docks to the bottom instead of covering the top app surface.

## Optional login/payment auto-hide

- Open a login-like or payment-like host.
- Confirm the bar remains visible by default.
- Confirm the bar auto-hides only when **Hide on sign-in and payment pages** is enabled.

## Popup

- Confirm global enable/disable works.
- Confirm **Setup guide** opens the onboarding page.
- Confirm row count changes expanded bar height.
- Confirm dense view works.
- Confirm folder rail switches between Off, Left, and Right.
- Confirm streamer mode hides bookmark labels in the bar and folder menus.
- Confirm empty-search suggestions can be hidden/shown.
- Confirm **Move page content down** works on regular pages.
- Confirm **Hide on this site** hides the current site.
- Confirm **Show on this site** restores the current site.
- Confirm the shortcut guide appears and **Edit** opens `chrome://extensions/shortcuts`.
- Confirm unassigned shortcuts display `-` instead of action-looking text.
- Confirm **Merge duplicate folders** opens the maintenance page.
- With test folders of the same title in account and local bookmark storage, confirm both paths and item counts are shown before any write.
- Confirm an unchecked duplicate group cannot be merged.
- Merge a selected test group and confirm all children move to the account-synced target.
- Confirm the local source folder is removed only after `chrome.bookmarks.getChildren()` reports it empty.
- Confirm cancelling the final confirmation leaves both folders unchanged.
- Search for a deeply nested account folder in the maintenance picker, pin it to the rail, and confirm it appears without moving any bookmarks.
- Unpin the same folder and confirm the explicit rail entry disappears while the Chrome folder and its children remain unchanged.
- Save a pinned folder while a BookmarkFlow new tab is open and confirm that page redraws the rail directly from local storage without waiting for a background state broadcast.
- Complete a same-title merge and confirm the account target is automatically pinned before the local source is removed.
- Confirm icon-only rows shrink to the actual number of used rows instead of leaving empty vertical space.
- Confirm adding an already-saved page opens search on the existing bookmark instead of leaving the user stranded.
- Confirm searching the current page title can surface the existing bookmark for the current URL.
- Confirm a dragged compact panel does not make the expanded bar open across the middle of every page.
- Confirm bookmark drag shows a mouse-following ghost plus a yellow insertion placeholder before release.
- Confirm dropping after moving across multiple bookmark items uses the final mouse position, not an earlier highlighted item.
- Confirm compact mode keeps the expanded top bar to one bookmark row with horizontal scroll and no empty lower row.
- Confirm compact expanded bar still uses one row even when the saved row setting is 2, 3, or 4.
- Reload the extension while an old page is still open, then interact with the old page and confirm no `Extension context invalidated` error is recorded.
- After reloading the extension, try dragging the old page's BookmarkFlow control and confirm no stale `pointercancel`/panel drag error is recorded.
- After reloading the extension, click or drag the old page's BookmarkFlow control and confirm no stale `handlePanelPointerDown` invalid-context error is recorded.
- After reloading the extension during a bookmark drag, move the pointer over the old page and confirm no stale `autoScrollBookmarkList` invalid-context error is recorded.
- After reloading the extension during a bookmark drag, continue the drag until the ghost would be created and confirm no stale `createBookmarkDragGhost` invalid-context error is recorded.

## New tab

- Open a new tab.
- Confirm the BookmarkFlow new tab page appears.
- Confirm streamer mode hides bookmark labels on the new tab bookmark strip.
- Confirm streamer/icon-only mode keeps the new tab bookmark strip to one row with horizontal scroll and no empty lower row.
- Confirm row count changes the new tab bookmark strip row count.
- Scroll the new tab bookmark strip, open another new tab, and confirm the strip restores the same horizontal position.
- Confirm the new tab bookmark strip scrollbar does not shift the layout when hovered.
- Enable the folder rail and confirm the new tab page shows direct bookmarks in the strip and folders in the selected side rail.
- With separate account-synced and local-only Bookmarks Bar roots, confirm the folder rail lists folders from both roots.
- Create same-title folders in the account and local Bookmarks Bar roots and confirm the rail shows one entry backed by the account-synced folder.
- After merging and removing the local copy, confirm the surviving account folder remains visible in the rail.
- Confirm an account-synced folder with direct bookmarks remains visible even when it is nested outside the selected Bookmarks Bar root.
- Click `+`, enter a URL, and confirm it is added to Bookmark Bar.
- With a folder menu open, click `+`, enter a URL, and confirm it is added to that folder.
- Set a non-Google default search provider, submit a query from the new-tab page, and confirm Chrome's Search API uses that provider without changing the preference.
- Confirm bookmark strip appears.
- Confirm folder menus open.

## Localization and accessibility

- Set Chrome's UI language to English, reload the extension, and confirm the manifest, popup, onboarding, new tab, overlay, dialogs, statuses, context actions, confirmations, errors, and ARIA labels are English.
- Set Chrome's UI language to Turkish, reload the extension, and confirm the same surfaces are Turkish with correct Turkish characters.
- Navigate every interactive surface using only the keyboard and confirm focus order is logical and the gold focus ring is always visible.
- Test at 200% browser zoom and confirm primary actions, dialog controls, bookmark titles, folder rails, and status messages remain usable without two-dimensional page scrolling.
- Enable reduced motion in the operating system and confirm scroll/transition/animation effects are suppressed without hiding state changes.
- Check essential text and controls against WCAG AA contrast targets; do not approve the package based on visual inspection alone.
- Confirm context-menu separators are announced as separators and disabled reordering actions cannot receive pointer or keyboard activation.

## Privacy and package

- Confirm no external analytics, tracking, or network calls were added.
- Confirm `manifest.json` has only needed permissions.
- Confirm the upload zip excludes `dist`, `store`, and any `.git` backup folders.
- Confirm the source tag is exactly `v<manifest version>` and resolves to the reviewed commit used to create the package.
- Confirm the manifest version, source tag, ZIP filename, release notes, and Chrome Web Store version are identical.
- Confirm the ZIP contains `LICENSE.md`, `NOTICE`, and `TRADEMARKS.md`, while `DCO`, governance, roadmap, support, code-of-conduct, source documentation, and build scripts remain outside the runtime package.
- Confirm Apache-2.0 code rights and the separate BookmarkFlow/Maprins Games trademark boundary are readable from the extracted package.
- Confirm every shipped icon, tour image, and store/promotional image is covered by `docs/ASSET_PROVENANCE.md` and contains only synthetic test content or documented assets.
- Confirm the extracted package contains no personal bookmark titles, URLs, profiles, credentials, tokens, local paths, or generated test output.
- Recompute the ZIP SHA-256 digest and confirm it matches the `.sha256` file and the digest recorded for the immutable release tag.
