const {
  FOLDER_COLOR_PRESETS,
  DATA_CONSENT_STORAGE_KEY,
  DATA_CONSENT_VERSION,
  BOOKMARK_TAGS_STORAGE_KEY,
  normalizeTag,
  normalizeTags,
  normalizeAllBookmarkTags,
  inferSmartTags,
  resolveItemTags,
  matchesTagFilter,
  areBookmarkUrlsEqual,
  isSafeBookmarkUrl,
  normalizeSettings
} = BookmarkFlowConfig;
const { getLanguage, t } = BookmarkFlowI18n;

let bookmarkTagsMap = {};

const MESSAGE_GET_CONSENT_STATUS = "BF_GET_CONSENT_STATUS";
const BOOKMARK_DRAG_THRESHOLD = 6;
const BOOKMARK_DROP_TOLERANCE = 36;
const BOOKMARK_GHOST_OFFSET = 12;
const FOLDER_MENU_GAP = 16;
const FOLDER_RAIL_PINNED_STORAGE_KEY = "bfFolderRailPinnedIds";

const elements = {
  bookmarkBar: document.getElementById("bookmarkBar"),
  consentGate: document.getElementById("consentGate"),
  newTabWorkspace: document.getElementById("newTabWorkspace"),
  openPrivacySetup: document.getElementById("openPrivacySetup"),
  bookmarkStrip: document.getElementById("bookmarkStrip"),
  addBookmark: document.getElementById("addBookmark"),
  addDialog: document.getElementById("addDialog"),
  addForm: document.getElementById("addForm"),
  addTitle: document.getElementById("addTitle"),
  addUrl: document.getElementById("addUrl"),
  addStatus: document.getElementById("addStatus"),
  addSubmit: document.getElementById("addSubmit"),
  addClose: document.getElementById("addClose"),
  addCancel: document.getElementById("addCancel"),
  addFolder: document.getElementById("addFolder"),
  folderRail: document.getElementById("folderRail"),
  folderRailList: document.getElementById("folderRailList"),
  folderMenu: document.getElementById("folderMenu"),
  contextMenu: document.getElementById("contextMenu"),
  scrollLeft: document.getElementById("scrollLeft"),
  scrollRight: document.getElementById("scrollRight"),
  main: document.querySelector(".nt-main"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  clockDisplay: document.getElementById("clockDisplay"),
  greetingDisplay: document.getElementById("greetingDisplay"),
  shortcutsWrap: document.getElementById("shortcutsWrap"),
  shortcutsGrid: document.getElementById("shortcutsGrid"),
  searchResults: document.getElementById("searchResults")
};

let appState = null;
let activeFolderId = "";
let contextMenuState = null;
let bookmarkDragState = null;
let suppressNextClick = false;
let pinnedFolderIds = [];
let addDialogReturnFocus = null;
let searchActiveIndex = -1;
let currentSearchResults = [];

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && DATA_CONSENT_STORAGE_KEY in changes) {
    window.location.reload();
  }
});
init().catch(() => {});

async function init() {
  const consent = await sendMessage({ type: MESSAGE_GET_CONSENT_STATUS });
  if (!consent?.ok || !consent.consentGranted || consent.consentVersion !== DATA_CONSENT_VERSION) {
    elements.consentGate.hidden = false;
    elements.newTabWorkspace.hidden = true;
    elements.openPrivacySetup.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding.html") });
    });
    return;
  }

  elements.consentGate.hidden = true;
  elements.newTabWorkspace.hidden = false;
  [appState, pinnedFolderIds, bookmarkTagsMap] = await Promise.all([
    getState(),
    getPinnedFolderIds(),
    loadBookmarkTags()
  ]);
  render();

  updateClockAndGreeting();
  window.setInterval(updateClockAndGreeting, 1000);

  elements.searchInput.focus();

  elements.searchForm.addEventListener("submit", handleSearchSubmit);
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.searchInput.addEventListener("keydown", handleSearchKeydown);
  document.addEventListener("click", handleSearchOutsideClick);
  elements.addBookmark.addEventListener("click", () => openAddBookmarkDialog());
  elements.addForm.addEventListener("submit", handleAddBookmarkSubmit);
  elements.addClose.addEventListener("click", closeAddBookmarkDialog);
  elements.addCancel.addEventListener("click", closeAddBookmarkDialog);
  elements.addFolder.addEventListener("click", () => createFolderFromPrompt(""));
  elements.scrollLeft.addEventListener("click", () => scrollBookmarks(-1));
  elements.scrollRight.addEventListener("click", () => scrollBookmarks(1));
  elements.bookmarkBar.addEventListener("pointerdown", handleBookmarkPointerDown);
  elements.bookmarkBar.addEventListener("contextmenu", handleBookmarkContextMenu);
  elements.bookmarkBar.addEventListener("dragstart", preventNativeBookmarkDrag);
  window.addEventListener("resize", handleWindowResize, { passive: true });
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("click", handleDocumentClick);

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "BF_STATE_CHANGED" && message.state?.ok) {
      appState = message.state;
      render();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (BOOKMARK_TAGS_STORAGE_KEY in changes) {
      bookmarkTagsMap = normalizeAllBookmarkTags(changes[BOOKMARK_TAGS_STORAGE_KEY].newValue);
      render();
    }

    if (FOLDER_RAIL_PINNED_STORAGE_KEY in changes) {
      pinnedFolderIds = normalizePinnedFolderIds(changes[FOLDER_RAIL_PINNED_STORAGE_KEY].newValue);
      render();
    }
  });
}

function getState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "BF_GET_STATE" }, (response) => {
      resolve(response?.ok ? response : { ok: false });
    });
  });
}

async function getPinnedFolderIds() {
  const localState = await chrome.storage.local.get(FOLDER_RAIL_PINNED_STORAGE_KEY);
  return normalizePinnedFolderIds(localState[FOLDER_RAIL_PINNED_STORAGE_KEY]);
}

function normalizePinnedFolderIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((id) => String(id || "")).filter(Boolean))).slice(0, 200);
}

async function loadBookmarkTags() {
  try {
    const localState = await chrome.storage.local.get(BOOKMARK_TAGS_STORAGE_KEY);
    return normalizeAllBookmarkTags(localState[BOOKMARK_TAGS_STORAGE_KEY]);
  } catch {
    return {};
  }
}

async function saveBookmarkTags(nodeId, tags) {
  try {
    const localState = await chrome.storage.local.get(BOOKMARK_TAGS_STORAGE_KEY);
    const allTags = normalizeAllBookmarkTags(localState[BOOKMARK_TAGS_STORAGE_KEY]);
    const clean = normalizeTags(tags);
    if (clean.length > 0) {
      allTags[nodeId] = clean;
    } else {
      delete allTags[nodeId];
    }
    bookmarkTagsMap = allTags;
    await chrome.storage.local.set({ [BOOKMARK_TAGS_STORAGE_KEY]: allTags });
  } catch (error) {
    console.warn("Failed to save bookmark tags", error);
  }
}

function handleWindowResize() {
  const settings = normalizeSettings(appState?.settings);
  scheduleTightenBookmarkRows(settings.streamerMode ? 1 : settings.rows);
}

function render() {
  const settings = normalizeSettings(appState?.settings);
  const children = appState?.bookmarkBar?.children || [];
  const hasFolderRail = settings.folderRail !== "off";
  const folders = hasFolderRail
    ? getRenderedFolderRailFolders(children)
    : children.filter((node) => !node.url);
  const visibleBookmarks = hasFolderRail ? children.filter((node) => node.url) : children;
  const folderToRestore = activeFolderId;

  document.documentElement.dataset.theme = settings.theme || "gold-obsidian";

  elements.bookmarkBar.hidden = !settings.enabled;
  elements.bookmarkBar.style.setProperty("--nt-rows", String(settings.rows));
  elements.bookmarkBar.style.removeProperty("--nt-used-rows");
  elements.bookmarkBar.classList.toggle("is-streamer-mode", settings.streamerMode);
  elements.bookmarkBar.classList.toggle("has-folder-rail", hasFolderRail);
  elements.bookmarkBar.classList.toggle("folder-rail-left", hasFolderRail && settings.folderRail === "left");
  elements.bookmarkBar.classList.toggle("folder-rail-right", hasFolderRail && settings.folderRail === "right");
  elements.folderRail.hidden = !hasFolderRail;
  elements.bookmarkStrip.replaceChildren();
  elements.folderRailList.replaceChildren();
  closeContextMenu();
  elements.folderMenu.hidden = true;
  elements.folderMenu.replaceChildren();

  if (!settings.enabled) {
    activeFolderId = "";
    updateFolderRailSelection();
    return;
  }

  visibleBookmarks.forEach((node) => {
    const item = createTopLevelItem(node);
    if (item) {
      elements.bookmarkStrip.append(item);
    }
  });

  if (!elements.bookmarkStrip.children.length) {
    const empty = document.createElement("div");
    empty.className = "nt-empty";
    empty.textContent = hasFolderRail && folders.length
      ? t("directBookmarksEmpty")
      : t("bookmarkBarEmpty");
    elements.bookmarkStrip.append(empty);
  }

  folders.forEach((folder) => {
    elements.folderRailList.append(createFolderRailItem(folder));
  });
  if (hasFolderRail && !folders.length) {
    const empty = document.createElement("div");
    empty.className = "nt-empty";
    empty.textContent = t("noFolders");
    elements.folderRailList.append(empty);
  }

  scheduleTightenBookmarkRows(settings.streamerMode ? 1 : settings.rows);
  restoreActiveFolderMenu(folderToRestore);
  renderShortcuts();
}

function updateClockAndGreeting() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  if (elements.clockDisplay) {
    elements.clockDisplay.textContent = `${hours}:${minutes}`;
  }

  const h = now.getHours();
  let greetingKey = "greetingMorning";
  if (h >= 12 && h < 18) {
    greetingKey = "greetingAfternoon";
  } else if (h >= 18 || h < 5) {
    greetingKey = "greetingEvening";
  }

  if (elements.greetingDisplay) {
    elements.greetingDisplay.textContent = t(greetingKey);
  }
}

function collectTopBookmarks(children, max = 8) {
  const links = [];
  const queue = Array.isArray(children) ? [...children] : [];
  while (queue.length && links.length < max) {
    const node = queue.shift();
    if (!node) {
      continue;
    }

    if (node.url && isSafeBookmarkUrl(node.url)) {
      if (!links.some((existing) => existing.url === node.url)) {
        links.push(node);
      }
    } else if (Array.isArray(node.children)) {
      queue.push(...node.children);
    }
  }

  return links.slice(0, max);
}

function renderShortcuts() {
  if (!elements.shortcutsWrap || !elements.shortcutsGrid) {
    return;
  }

  const children = appState?.bookmarkBar?.children || [];
  const shortcuts = collectTopBookmarks(children, 8);
  if (!shortcuts.length) {
    elements.shortcutsWrap.hidden = true;
    elements.shortcutsGrid.replaceChildren();
    return;
  }

  elements.shortcutsWrap.hidden = false;
  elements.shortcutsGrid.replaceChildren();

  shortcuts.forEach((bookmark) => {
    const card = document.createElement("a");
    card.className = "nt-shortcut-card";
    card.href = bookmark.url;
    card.title = `${bookmark.title || ""} (${bookmark.url})`;

    const iconBox = document.createElement("div");
    iconBox.className = "nt-shortcut-icon-box";

    const icon = document.createElement("img");
    icon.className = "nt-shortcut-icon";
    icon.src = faviconUrl(bookmark.url);
    icon.alt = "";
    icon.loading = "lazy";
    icon.onerror = () => {
      icon.remove();
      const fallback = document.createElement("span");
      fallback.className = "nt-shortcut-initial";
      fallback.textContent = (bookmark.title || bookmark.url || "?").trim().charAt(0);
      iconBox.appendChild(fallback);
    };
    iconBox.appendChild(icon);

    const title = document.createElement("span");
    title.className = "nt-shortcut-title";
    title.textContent = bookmark.title || getHostname(bookmark.url);

    card.appendChild(iconBox);
    card.appendChild(title);
    elements.shortcutsGrid.appendChild(card);
  });
}

function getRenderedFolderRailFolders(bookmarkBarChildren) {
  const folders = [];
  const seenTitles = new Set();
  const appendFolder = (node) => {
    if (!node || node.url) {
      return;
    }

    const titleKey = normalizeFolderTitle(node.title);
    if (!titleKey || seenTitles.has(titleKey)) {
      return;
    }

    seenTitles.add(titleKey);
    folders.push(node);
  };

  pinnedFolderIds.forEach((folderId) => {
    appendFolder(findNodeById(getBookmarkTreeRoot(), folderId));
  });
  (appState?.folderRailFolders || []).forEach(appendFolder);
  (bookmarkBarChildren || []).filter((node) => !node.url).forEach(appendFolder);
  return folders;
}

function restoreActiveFolderMenu(folderId) {
  if (!folderId || !findNodeById(getBookmarkTreeRoot(), folderId)) {
    activeFolderId = "";
    updateFolderRailSelection();
    return;
  }

  const anchor = elements.bookmarkBar.querySelector(`[data-folder-id="${folderId}"]`);
  if (!anchor) {
    activeFolderId = "";
    updateFolderRailSelection();
    return;
  }

  activeFolderId = folderId;
  requestAnimationFrame(() => {
    openFolderMenu(folderId, anchor);
  });
}

function scheduleTightenBookmarkRows(maxRows) {
  const tighten = () => {
    tightenBookmarkRows(maxRows);
  };
  requestAnimationFrame(tighten);
  window.setTimeout(tighten, 80);
}

function tightenBookmarkRows(maxRows) {
  const rows = Math.max(1, Math.min(4, Math.round(Number(maxRows) || 1)));
  if (rows <= 1) {
    elements.bookmarkBar.style.setProperty("--nt-used-rows", "1");
    return;
  }

  const items = Array.from(elements.bookmarkStrip.querySelectorAll(".nt-bookmark"))
    .filter((item) => item.getBoundingClientRect().width > 0);
  elements.bookmarkBar.style.setProperty("--nt-used-rows", String(Math.max(1, Math.min(rows, items.length || 1))));
}

async function handleSearchSubmit(event) {
  event.preventDefault();
  const value = elements.searchInput.value.trim();
  elements.searchInput.setCustomValidity("");

  if (!value) {
    return;
  }

  const directTarget = resolveDirectNavigationTarget(value);
  if (directTarget) {
    window.location.href = directTarget;
    return;
  }

  try {
    await chrome.search.query({
      text: value,
      disposition: "CURRENT_TAB"
    });
  } catch {
    elements.searchInput.setCustomValidity(t("webSearchUnavailable"));
    elements.searchInput.reportValidity();
  }
}

function resolveDirectNavigationTarget(value) {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    return value;
  }

  if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/i.test(value)) {
    return `https://${value}`;
  }

  return "";
}

function handleSearchInput() {
  const query = elements.searchInput.value.trim();
  elements.searchInput.setCustomValidity("");

  if (!query) {
    hideSearchResults();
    return;
  }

  const allBookmarks = collectSearchableBookmarks(appState?.bookmarkBar);

  const matchedBookmarks = allBookmarks
    .filter((b) => {
      const itemTags = resolveItemTags(b, bookmarkTagsMap);
      return matchesTagFilter(query, itemTags, b, getTextLocale());
    })
    .slice(0, 8);

  const results = matchedBookmarks.map((b) => ({
    type: "bookmark",
    id: b.id,
    title: b.title,
    url: b.url,
    path: b.path
  }));

  const isHealthQuery = /^(health|sa[gğ]l[iı]k|k[iı]r[iı]k|dead|broken|duplicate|m[uü]kerrer|bak[iı]m|maintenance|#health)/i.test(query.toLowerCase());
  if (isHealthQuery) {
    results.unshift({
      type: "action",
      action: "openHealthInspector",
      title: t("quickActionOpenHealth"),
      url: "src/bookmark-maintenance.html#health"
    });
  }

  results.push({
    type: "webSearch",
    title: `${t("webSearch") || "Web Search"}: "${query}"`,
    url: query
  });

  currentSearchResults = results;
  searchActiveIndex = 0;
  renderSearchResults();
}

function handleSearchKeydown(event) {
  if (!currentSearchResults.length || elements.searchResults.hidden) {
    return;
  }

  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSearchSelection(1);
    return;
  }

  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSearchSelection(-1);
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    hideSearchResults();
    elements.searchInput.value = "";
    return;
  }

  if (event.key === "Enter") {
    if (searchActiveIndex >= 0 && searchActiveIndex < currentSearchResults.length) {
      event.preventDefault();
      openSearchResult(currentSearchResults[searchActiveIndex], event);
    }
  }
}

function moveSearchSelection(direction) {
  if (!currentSearchResults.length) return;
  const count = currentSearchResults.length;
  searchActiveIndex = (searchActiveIndex + direction + count) % count;
  updateActiveSearchResult();
}

function updateActiveSearchResult() {
  const items = elements.searchResults.querySelectorAll(".nt-search-item");
  items.forEach((item, idx) => {
    const isActive = idx === searchActiveIndex;
    item.classList.toggle("is-active-result", isActive);
    item.setAttribute("aria-selected", isActive ? "true" : "false");
    if (isActive) {
      item.scrollIntoView({ block: "nearest" });
      elements.searchInput.setAttribute("aria-activedescendant", item.id);
    }
  });
}

function renderSearchResults() {
  elements.searchResults.innerHTML = "";

  if (!currentSearchResults.length) {
    hideSearchResults();
    return;
  }

  currentSearchResults.forEach((item, index) => {
    const card = document.createElement("a");
    card.className = `nt-search-item${index === searchActiveIndex ? " is-active-result" : ""}`;
    card.id = `ntSearchOption_${index}`;
    card.setAttribute("role", "option");
    card.setAttribute("aria-selected", index === searchActiveIndex ? "true" : "false");
    card.tabIndex = -1;

    const iconBox = document.createElement("div");
    iconBox.className = "nt-search-item-icon";

    if (item.type === "action") {
      card.href = "#";
      iconBox.textContent = "🩺";
    } else if (item.type === "bookmark") {
      card.href = item.url;
      const favicon = document.createElement("img");
      favicon.src = faviconUrl(item.url);
      favicon.alt = "";
      favicon.loading = "lazy";
      favicon.referrerPolicy = "no-referrer";
      favicon.addEventListener("error", () => {
        favicon.remove();
        iconBox.textContent = (item.title || "B").charAt(0).toUpperCase();
      });
      iconBox.append(favicon);
    } else {
      card.href = "#";
      iconBox.textContent = "🔍";
    }

    const info = document.createElement("div");
    info.className = "nt-search-item-info";

    const titleEl = document.createElement("div");
    titleEl.className = "nt-search-item-title";
    titleEl.textContent = item.title;

    const urlEl = document.createElement("div");
    urlEl.className = "nt-search-item-url";
    urlEl.textContent = item.type === "action"
      ? t("quickActionOpenHealthDesc")
      : (item.type === "bookmark" ? item.url : (t("webSearch") || "Search"));

    info.append(titleEl, urlEl);

    if (item.type === "bookmark") {
      const itemTags = resolveItemTags(item, bookmarkTagsMap);
      if (itemTags.length > 0) {
        const tagContainer = document.createElement("div");
        tagContainer.className = "nt-tag-list";
        itemTags.slice(0, 4).forEach((tag) => {
          const pill = document.createElement("span");
          pill.className = "nt-tag-pill";
          pill.textContent = `#${tag}`;
          tagContainer.append(pill);
        });
        info.append(tagContainer);
      }
    }

    const badge = document.createElement("span");
    badge.className = "nt-search-item-badge";
    badge.textContent = "↵";

    card.append(iconBox, info, badge);

    card.addEventListener("click", (e) => {
      e.preventDefault();
      openSearchResult(item, e);
    });

    card.addEventListener("mouseenter", () => {
      searchActiveIndex = index;
      updateActiveSearchResult();
    });

    elements.searchResults.append(card);
  });

  elements.searchResults.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");
  if (searchActiveIndex >= 0) {
    elements.searchInput.setAttribute("aria-activedescendant", `ntSearchOption_${searchActiveIndex}`);
  }
}

function openSearchResult(item, event) {
  const isNewTab = event.ctrlKey || event.metaKey;

  if (item.type === "action" && item.action === "openHealthInspector") {
    hideSearchResults();
    chrome.tabs.create({ url: chrome.runtime.getURL("src/bookmark-maintenance.html#health") });
    return;
  }

  if (item.type === "webSearch") {
    triggerWebSearch(item.url, isNewTab ? "NEW_TAB" : "CURRENT_TAB");
    hideSearchResults();
    return;
  }

  hideSearchResults();
  if (isNewTab) {
    window.open(item.url, "_blank");
  } else {
    window.location.href = item.url;
  }
}

async function triggerWebSearch(query, disposition = "CURRENT_TAB") {
  const directTarget = resolveDirectNavigationTarget(query);
  if (directTarget) {
    if (disposition === "NEW_TAB") {
      window.open(directTarget, "_blank");
    } else {
      window.location.href = directTarget;
    }
    return;
  }

  try {
    await chrome.search.query({
      text: query,
      disposition
    });
  } catch {
    elements.searchInput.setCustomValidity(t("webSearchUnavailable"));
    elements.searchInput.reportValidity();
  }
}

function hideSearchResults() {
  elements.searchResults.hidden = true;
  elements.searchResults.innerHTML = "";
  elements.searchInput.setAttribute("aria-expanded", "false");
  elements.searchInput.removeAttribute("aria-activedescendant");
  currentSearchResults = [];
  searchActiveIndex = -1;
}

function handleSearchOutsideClick(event) {
  if (!elements.searchResults.hidden && !elements.searchForm.contains(event.target)) {
    hideSearchResults();
  }
}

function collectSearchableBookmarks(node, results = [], path = "") {
  if (!node) return results;
  const currentPath = path ? (node.title ? `${path} / ${node.title}` : path) : (node.title || "");
  if (node.url && isSafeBookmarkUrl(node.url)) {
    results.push({
      id: node.id,
      title: node.title || node.url,
      url: node.url,
      path: path
    });
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectSearchableBookmarks(child, results, currentPath);
    }
  }
  return results;
}

function openAddBookmarkDialog(returnFocusElement = document.activeElement) {
  if (elements.addDialog.hidden) {
    addDialogReturnFocus = createFocusReturnTarget(returnFocusElement);
  }
  const suggestion = getAddBookmarkSuggestion();
  resetAddDuplicateState();
  elements.addDialog.dataset.parentId = suggestion.parentId || "";
  elements.addTitle.value = suggestion.title;
  elements.addUrl.value = suggestion.url;
  renderAddBookmarkStatus(suggestion.status || (suggestion.url ? "" : t("enterAddressToAdd")), false);
  elements.addDialog.hidden = false;
  setNewTabModalBackground(true);
  requestAnimationFrame(() => {
    (elements.addUrl.value ? elements.addTitle : elements.addUrl).focus();
    (elements.addUrl.value ? elements.addTitle : elements.addUrl).select();
  });
}

function closeAddBookmarkDialog({ restoreFocus = true } = {}) {
  const returnFocus = addDialogReturnFocus;
  addDialogReturnFocus = null;
  resetAddDuplicateState();
  elements.addDialog.hidden = true;
  setNewTabModalBackground(false);
  if (restoreFocus) {
    restoreFocusTarget(returnFocus);
  }
  return returnFocus;
}

async function handleAddBookmarkSubmit(event) {
  event.preventDefault();

  const title = elements.addTitle.value.trim();
  const url = normalizeBookmarkInputUrl(elements.addUrl.value);
  const parentId = elements.addDialog.dataset.parentId || "";
  const allowDuplicate = Boolean(elements.addDialog.dataset.duplicateUrl && areBookmarkUrlsEqual(elements.addDialog.dataset.duplicateUrl, url) && (elements.addDialog.dataset.duplicateParentId || "") === parentId);
  if (!url || !isSafeBookmarkUrl(url)) {
    renderAddBookmarkStatus(t("validUrlRequired"), true);
    elements.addUrl.focus();
    return;
  }

  elements.addSubmit.disabled = true;
  renderAddBookmarkStatus(t("adding"), false);

  const response = await sendMessage({
    type: "BF_CREATE_BOOKMARK",
    title,
    url,
    parentId,
    allowDuplicate
  });

  elements.addSubmit.disabled = false;

  if (!response?.ok) {
    renderAddBookmarkStatus(response?.error || t("bookmarkAddFailed"), true);
    return;
  }

  appState = response;
  if (response.alreadyExists) {
    markAddDuplicateState(url, parentId);
    return;
  }

  resetAddDuplicateState();
  renderAddBookmarkStatus(parentId ? t("bookmarkAddedToFolder") : t("bookmarkAdded"), false);
  window.setTimeout(() => {
    const returnFocus = closeAddBookmarkDialog({ restoreFocus: false });
    render();
    restoreFocusTarget(returnFocus);
  }, 900);
}

function setNewTabModalBackground(isModalOpen) {
  elements.bookmarkBar.inert = isModalOpen;
  elements.main.inert = isModalOpen;
}

function createFocusReturnTarget(element) {
  if (!element || typeof element.focus !== "function") {
    return null;
  }

  return {
    element,
    id: element.id || ""
  };
}

function restoreFocusTarget(target) {
  if (!target) {
    return;
  }

  const candidate = target.element?.isConnected
    ? target.element
    : (target.id ? document.getElementById(target.id) : null);
  if (!candidate || typeof candidate.focus !== "function" || candidate.disabled) {
    return;
  }

  candidate.focus({ preventScroll: true });
}

function getFocusableElements(container) {
  return Array.from(container?.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) || []).filter((element) => element.tabIndex >= 0 && !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

function trapFocusWithin(event, container, activeElement = document.activeElement) {
  if (event.key !== "Tab" || !container) {
    return false;
  }

  const focusable = getFocusableElements(container);
  if (!focusable.length) {
    event.preventDefault();
    container.focus({ preventScroll: true });
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (activeElement === first || !container.contains(activeElement))) {
    event.preventDefault();
    last.focus({ preventScroll: true });
    return true;
  }

  if (!event.shiftKey && (activeElement === last || !container.contains(activeElement))) {
    event.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }

  return false;
}

function getAddBookmarkSuggestion() {
  const value = elements.searchInput.value.trim();
  const url = normalizeBookmarkInputUrl(value);
  const folder = activeFolderId ? findNodeById(getBookmarkTreeRoot(), activeFolderId) : null;
  return {
    title: url ? getHostname(url) : "",
    url: url && isSafeBookmarkUrl(url) ? url : "",
    parentId: folder && !folder.url ? folder.id : "",
    status: folder && !folder.url ? t("willAddToFolder", folder.title || t("folder")) : ""
  };
}

function markAddDuplicateState(url, parentId) {
  elements.addDialog.dataset.duplicateUrl = url;
  elements.addDialog.dataset.duplicateParentId = parentId || "";
  elements.addSubmit.textContent = t("addAnyway");
  renderAddBookmarkStatus(t("duplicateBookmarkPrompt"), false);
}

function resetAddDuplicateState() {
  delete elements.addDialog.dataset.duplicateUrl;
  delete elements.addDialog.dataset.duplicateParentId;
  elements.addSubmit.textContent = t("add");
}

function renderAddBookmarkStatus(message, isError) {
  elements.addStatus.textContent = message;
  elements.addStatus.classList.toggle("is-error", Boolean(isError));
  elements.addStatus.classList.toggle("is-success", Boolean(message) && !isError);
}

function normalizeBookmarkInputUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return trimmed;
  }

  if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

function createTopLevelItem(node) {
  if (node.url) {
    if (!isSafeBookmarkUrl(node.url)) {
      return null;
    }

    return createBookmarkLink(node, "nt-bookmark");
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "nt-bookmark is-folder";
  button.dataset.folderId = node.id;
  button.dataset.nodeId = node.id;
  button.dataset.ntReorderItem = "true";
  button.dataset.ntReorderScope = "top";
  button.title = node.title || t("folder");
  applyFolderColor(button, node.id);
  button.append(createFolderIcon(), createTitle(node.title || t("folder")));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFolder(node.id, button).catch(() => {});
  });
  return button;
}

function createFolderRailItem(node) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nt-folder-rail-item";
  button.dataset.folderId = node.id;
  button.dataset.nodeId = node.id;
  if (node.parentId === appState?.bookmarkBar?.id) {
    button.dataset.ntReorderItem = "true";
    button.dataset.ntReorderScope = "top";
  }
  button.title = node.title || t("folder");
  button.classList.toggle("is-active", activeFolderId === node.id);
  applyFolderColor(button, node.id);
  button.append(createFolderIcon(), createTitle(node.title || t("folder")));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFolder(node.id, button).catch(() => {});
  });
  return button;
}

function createBookmarkLink(node, className) {
  const link = document.createElement("a");
  link.className = className;
  link.href = node.url;
  link.rel = "noreferrer";
  link.referrerPolicy = "no-referrer";
  link.title = `${node.title || getHostname(node.url)}\n${node.url}`;
  link.dataset.nodeId = node.id;
  link.dataset.ntReorderItem = "true";
  link.dataset.ntReorderScope = "top";

  const favicon = document.createElement("img");
  favicon.className = "nt-favicon";
  favicon.alt = "";
  favicon.loading = "lazy";
  favicon.src = faviconUrl(node.url);

  link.append(favicon, createTitle(node.title || getHostname(node.url)));
  return link;
}

function createResultLink(entry) {
  const link = document.createElement("a");
  link.className = "nt-result";
  link.href = entry.url;
  link.rel = "noreferrer";
  link.referrerPolicy = "no-referrer";
  link.title = `${entry.title}\n${entry.url}`;
  link.dataset.nodeId = entry.id;
  link.dataset.parentId = entry.parentId || "";
  link.dataset.ntReorderItem = "true";
  link.dataset.ntReorderScope = "folder";

  const favicon = document.createElement("img");
  favicon.className = "nt-favicon";
  favicon.alt = "";
  favicon.loading = "lazy";
  favicon.src = faviconUrl(entry.url);

  const copy = document.createElement("span");
  copy.className = "nt-result-copy";

  const title = document.createElement("span");
  title.className = "nt-result-title";
  title.textContent = entry.title || getHostname(entry.url);

  const path = document.createElement("span");
  path.className = "nt-result-path";
  path.textContent = entry.path || getHostname(entry.url);

  copy.append(title, path);
  link.append(favicon, copy);
  return link;
}

function createTitle(text) {
  const title = document.createElement("span");
  title.className = "nt-title";
  title.textContent = text;
  return title;
}

function createFolderIcon() {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "nt-folder-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = '<path fill="currentColor" d="M3 6.75A2.75 2.75 0 0 1 5.75 4h4.1c.73 0 1.43.29 1.94.8l1.2 1.2h5.26A2.75 2.75 0 0 1 21 8.75v8.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25V6.75Z"/>';
  return icon;
}

function applyFolderColor(element, nodeId) {
  const color = getFolderColor(nodeId);
  if (!color) {
    return;
  }

  const rgb = hexToRgb(color);
  if (!rgb) {
    return;
  }

  element.style.setProperty("--nt-folder-accent", color);
  element.style.setProperty("--nt-folder-bg", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
  element.style.setProperty("--nt-folder-bg-hover", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24)`);
  element.style.setProperty("--nt-folder-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.58)`);
  element.style.setProperty("--nt-folder-text", "#f8fbff");
}

function getFolderColor(nodeId) {
  const colors = appState?.settings?.folderColors || {};
  return String(colors[nodeId] || "");
}

function hexToRgb(color) {
  const match = String(color || "").match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1], 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function handleBookmarkContextMenu(event) {
  const item = event.target?.closest?.("[data-node-id]");
  if (!item || item.closest(".nt-context-menu, .nt-actions, .nt-add")) {
    return;
  }

  const node = findNodeById(getBookmarkTreeRoot(), item.dataset.nodeId);
  if (!node) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  openBookmarkContextMenu(node, event.clientX, event.clientY);
}

function openBookmarkContextMenu(node, clientX, clientY) {
  const isFolder = !node.url;
  const location = findNodeLocation(getBookmarkTreeRoot(), node.id);
  const canMovePrevious = Boolean(location && location.index > 0);
  const canMoveNext = Boolean(location && location.index < location.siblings.length - 1);
  contextMenuState = {
    nodeId: node.id,
    title: node.title || (node.url ? getHostname(node.url) : t("folder")),
    url: node.url || "",
    isFolder
  };

  elements.contextMenu.replaceChildren();
  if (node.url) {
    elements.contextMenu.append(
      createContextMenuButton("open-bookmark-tab", t("openInNewTab")),
      createContextMenuButton("copy-bookmark-url", t("copyAddress")),
      createContextMenuButton("rename-bookmark", t("renameBookmark")),
      createContextMenuButton("edit-bookmark-tags", t("editTags"))
    );
  } else {
    elements.contextMenu.append(
      createContextMenuButton("add-bookmark-to-folder", t("addBookmarkToFolder")),
      createContextMenuButton("create-child-folder", t("createChildFolder")),
      createContextMenuButton("rename-bookmark", t("renameFolder")),
      createFolderColorPicker(node.id)
    );
  }

  if (location?.siblings.length > 1) {
    elements.contextMenu.append(
      createContextMenuSeparator(),
      createContextMenuButton("move-bookmark-previous", t("movePrevious"), "", !canMovePrevious),
      createContextMenuButton("move-bookmark-next", t("moveNext"), "", !canMoveNext),
      createContextMenuButton("move-bookmark-first", t("moveFirst"), "", !canMovePrevious),
      createContextMenuButton("move-bookmark-last", t("moveLast"), "", !canMoveNext)
    );
  }

  elements.contextMenu.append(
    createContextMenuSeparator(),
    createContextMenuButton("delete-bookmark", isFolder ? t("deleteFolder") : t("deleteBookmark"), "is-danger")
  );
  elements.contextMenu.style.left = `${clientX}px`;
  elements.contextMenu.style.top = `${clientY}px`;
  elements.contextMenu.hidden = false;

  const left = clamp(clientX, 8, Math.max(8, window.innerWidth - elements.contextMenu.offsetWidth - 8));
  const top = clamp(clientY, 8, Math.max(8, window.innerHeight - elements.contextMenu.offsetHeight - 8));
  elements.contextMenu.style.left = `${left}px`;
  elements.contextMenu.style.top = `${top}px`;
}

function createContextMenuButton(action, label, className = "", disabled = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["nt-context-action", className].filter(Boolean).join(" ");
  button.dataset.ntAction = action;
  button.textContent = label;
  button.disabled = disabled;
  return button;
}

function createContextMenuSeparator() {
  const separator = document.createElement("div");
  separator.className = "nt-context-separator";
  separator.setAttribute("role", "separator");
  return separator;
}

function createFolderColorPicker(nodeId) {
  const currentColor = getFolderColor(nodeId);
  const section = document.createElement("div");
  section.className = "nt-context-colors";

  const label = document.createElement("span");
  label.className = "nt-context-colors-label";
  label.textContent = t("color");
  section.append(label);

  const swatches = document.createElement("div");
  swatches.className = "nt-context-swatches";

  FOLDER_COLOR_PRESETS.forEach((preset) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "nt-context-swatch";
    swatch.dataset.ntAction = `set-folder-color:${preset.value}`;
    swatch.style.setProperty("--nt-swatch-color", preset.value);
    swatch.title = preset.label;
    swatch.setAttribute("aria-label", t("folderColorAria", preset.label));
    swatch.classList.toggle("is-selected", currentColor === preset.value);
    swatches.append(swatch);
  });

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "nt-context-swatch is-clear";
  clear.dataset.ntAction = "clear-folder-color";
  clear.title = t("clearColor");
  clear.setAttribute("aria-label", t("clearColor"));
  clear.classList.toggle("is-selected", !currentColor);
  swatches.append(clear);

  section.append(swatches);
  return section;
}

function closeContextMenu() {
  contextMenuState = null;
  elements.contextMenu.hidden = true;
  elements.contextMenu.replaceChildren();
}

async function handleContextAction(action) {
  if (!action) {
    return;
  }

  if (action === "open-bookmark-tab") {
    openContextBookmarkInNewTab();
    return;
  }

  if (action === "copy-bookmark-url") {
    copyContextBookmarkUrl();
    return;
  }

  if (action === "delete-bookmark") {
    await deleteContextBookmark();
    return;
  }

  if (action === "rename-bookmark") {
    await renameContextBookmark();
    return;
  }

  if (action === "edit-bookmark-tags") {
    await editContextBookmarkTags();
    return;
  }

  if (action === "add-bookmark-to-folder") {
    openAddBookmarkForContextFolder();
    return;
  }

  if (action === "create-child-folder") {
    await createFolderFromPrompt(contextMenuState?.nodeId || "");
    return;
  }

  if (action.startsWith("set-folder-color:")) {
    await setContextFolderColor(action.slice("set-folder-color:".length));
    return;
  }

  if (action === "clear-folder-color") {
    await setContextFolderColor("");
    return;
  }

  if (action === "move-bookmark-previous") {
    await moveContextBookmarkByStep(-1);
    return;
  }

  if (action === "move-bookmark-next") {
    await moveContextBookmarkByStep(1);
    return;
  }

  if (action === "move-bookmark-first") {
    await moveContextBookmarkToEdge("first");
    return;
  }

  if (action === "move-bookmark-last") {
    await moveContextBookmarkToEdge("last");
  }
}

function openContextBookmarkInNewTab() {
  const url = contextMenuState?.url;
  closeContextMenu();
  if (url) {
    chrome.tabs.create({ url }).catch(() => {
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }
}

function copyContextBookmarkUrl() {
  const url = contextMenuState?.url;
  closeContextMenu();
  if (url) {
    navigator.clipboard?.writeText(url).catch(() => {});
  }
}

async function deleteContextBookmark() {
  const state = contextMenuState;
  if (!state?.nodeId) {
    return;
  }

  const message = state.isFolder
    ? t("confirmDeleteFolder", state.title)
    : t("confirmDeleteBookmark", state.title);
  if (!window.confirm(message)) {
    return;
  }

  closeContextMenu();
  closeFolderMenu();
  const response = await sendMessage({
    type: "BF_DELETE_BOOKMARK",
    nodeId: state.nodeId
  });

  if (response?.ok) {
    appState = response;
    render();
    return;
  }

  window.alert(response?.error || t("bookmarkDeleteFailed"));
}

async function renameContextBookmark() {
  const state = contextMenuState;
  if (!state?.nodeId) {
    return;
  }

  const nextTitle = window.prompt(state.isFolder ? t("folderName") : t("bookmarkName"), state.title || "");
  if (nextTitle === null) {
    return;
  }

  const title = nextTitle.trim();
  if (!title) {
    window.alert(t("nameRequired"));
    return;
  }

  closeContextMenu();
  const response = await sendMessage({
    type: "BF_RENAME_BOOKMARK",
    nodeId: state.nodeId,
    title
  });

  if (response?.ok) {
    appState = response;
    render();
    return;
  }

  window.alert(response?.error || t("bookmarkRenameFailed"));
}

async function editContextBookmarkTags() {
  const state = contextMenuState;
  if (!state?.nodeId) {
    return;
  }

  const currentTags = resolveItemTags({ id: state.nodeId, title: state.title, url: state.url }, bookmarkTagsMap);
  const initialText = currentTags.map((t) => `#${t}`).join(" ");
  const nextText = window.prompt(t("editTagsPrompt"), initialText);
  if (nextText === null) {
    return;
  }

  closeContextMenu();
  const rawTokens = nextText.split(/[\s,]+/);
  const cleanTags = normalizeTags(rawTokens);
  await saveBookmarkTags(state.nodeId, cleanTags);
  render();
}

function openAddBookmarkForContextFolder() {
  const state = contextMenuState;
  if (!state?.isFolder || !state.nodeId) {
    return;
  }

  const returnFocusElement = Array.from(document.querySelectorAll("[data-node-id]"))
    .find((element) => element.dataset.nodeId === state.nodeId) || null;
  activeFolderId = state.nodeId;
  closeContextMenu();
  openAddBookmarkDialog(returnFocusElement);
}

async function setContextFolderColor(color) {
  const state = contextMenuState;
  if (!state?.isFolder || !state.nodeId) {
    return;
  }

  closeContextMenu();
  const response = await sendMessage({
    type: "BF_SET_FOLDER_COLOR",
    nodeId: state.nodeId,
    color
  });

  if (response?.ok) {
    appState = response;
    render();
    return;
  }

  window.alert(response?.error || t("folderColorFailed"));
}

async function moveContextBookmarkByStep(direction) {
  const state = contextMenuState;
  if (!state?.nodeId) {
    return;
  }

  const location = findNodeLocation(getBookmarkTreeRoot(), state.nodeId);
  const target = location?.siblings?.[location.index + direction];
  if (!location || !target) {
    return;
  }

  await moveContextBookmark(location, target, direction < 0 ? "before" : "after");
}

async function moveContextBookmarkToEdge(edge) {
  const state = contextMenuState;
  if (!state?.nodeId) {
    return;
  }

  const location = findNodeLocation(getBookmarkTreeRoot(), state.nodeId);
  if (!location || location.siblings.length < 2) {
    closeContextMenu();
    return;
  }

  const target = edge === "first"
    ? location.siblings[0]
    : location.siblings[location.siblings.length - 1];
  if (!target || target.id === location.node.id) {
    return;
  }

  await moveContextBookmark(location, target, edge === "first" ? "before" : "after");
}

async function moveContextBookmark(location, target, placement) {
  const isTopLevel = location.parent?.id === appState?.bookmarkBar?.id;
  closeContextMenu();
  closeFolderMenu();

  const response = await sendMessage(isTopLevel
    ? {
      type: "BF_MOVE_TOP_LEVEL",
      sourceId: location.node.id,
      targetId: target.id,
      placement
    }
    : {
      type: "BF_MOVE_BOOKMARK",
      sourceId: location.node.id,
      targetId: target.id,
      parentId: location.parent.id,
      placement
    });

  if (response?.ok) {
    appState = response;
    render();
    return;
  }

  window.alert(response?.error || t("bookmarkMoveFailed"));
}

function handleBookmarkPointerDown(event) {
  const item = event.target?.closest?.("[data-nt-reorder-item]");
  if (!item || event.button !== 0 || item.closest(".nt-context-menu, .nt-add")) {
    return;
  }

  const list = item.closest(".nt-strip, .nt-menu, .nt-folder-rail-list");
  if (!list) {
    return;
  }

  bookmarkDragState = {
    pointerId: event.pointerId,
    item,
    list,
    ghost: null,
    placeholder: null,
    scope: item.dataset.ntReorderScope || "top",
    sourceId: item.dataset.nodeId,
    sourceParentId: item.dataset.parentId || "",
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    targetId: "",
    placement: "before"
  };

  try {
    item.setPointerCapture?.(event.pointerId);
  } catch {}

  window.addEventListener("pointermove", handleBookmarkPointerMove, { passive: false, capture: true });
  window.addEventListener("pointerup", finishBookmarkDrag, { passive: false, capture: true });
  window.addEventListener("pointercancel", finishBookmarkDrag, { passive: false, capture: true });
}

function handleBookmarkPointerMove(event) {
  if (!bookmarkDragState || event.pointerId !== bookmarkDragState.pointerId) {
    return;
  }

  const distanceX = event.clientX - bookmarkDragState.startX;
  const distanceY = event.clientY - bookmarkDragState.startY;
  if (!bookmarkDragState.moved && Math.hypot(distanceX, distanceY) < BOOKMARK_DRAG_THRESHOLD) {
    return;
  }

  event.preventDefault();

  if (!bookmarkDragState.moved) {
    bookmarkDragState.moved = true;
    bookmarkDragState.item.classList.add("is-bookmark-dragging");
    bookmarkDragState.list.classList.add("is-bookmark-reordering");
    createBookmarkDragGhost(bookmarkDragState.item, event.clientX, event.clientY);
    createBookmarkDropPlaceholder(bookmarkDragState.item);
    closeContextMenu();
  }

  positionBookmarkDragGhost(event.clientX, event.clientY);
  autoScrollBookmarkList(event.clientX, event.clientY);
  updateBookmarkDropTarget(event.clientX, event.clientY);
}

function finishBookmarkDrag(event) {
  if (!bookmarkDragState || event.pointerId !== bookmarkDragState.pointerId) {
    return;
  }

  const state = bookmarkDragState;
  state.item.classList.remove("is-bookmark-dragging");
  state.list?.classList.remove("is-bookmark-reordering");
  removeBookmarkDragGhost(state);
  removeBookmarkDropPlaceholder(state);
  clearBookmarkDropTarget();

  try {
    state.item.releasePointerCapture?.(state.pointerId);
  } catch {}

  window.removeEventListener("pointermove", handleBookmarkPointerMove, true);
  window.removeEventListener("pointerup", finishBookmarkDrag, true);
  window.removeEventListener("pointercancel", finishBookmarkDrag, true);

  if (state.moved) {
    event.preventDefault();
    suppressNextClick = true;
    window.setTimeout(() => {
      suppressNextClick = false;
    }, 250);

    if (state.targetId && state.targetId !== state.sourceId) {
      moveBookmark(state).catch((error) => {
        window.alert(error?.message || t("bookmarkMoveFailed"));
      });
    }
  }

  bookmarkDragState = null;
}

function updateBookmarkDropTarget(clientX, clientY) {
  if (!bookmarkDragState) {
    return;
  }

  const target = getDropTargetItem(clientX, clientY);
  if (!target || target.dataset.nodeId === bookmarkDragState.sourceId) {
    bookmarkDragState.targetId = "";
    clearBookmarkDropTarget();
    return;
  }

  const placement = getAdjustedDropPlacement(target, getDropPlacement(target, clientX, clientY));
  bookmarkDragState.targetId = target.dataset.nodeId || "";
  bookmarkDragState.placement = placement;
  renderBookmarkDropTarget(target, placement);
  moveBookmarkDropPlaceholder(target, placement);
}

function getDropTargetItem(clientX, clientY) {
  const list = bookmarkDragState?.list;
  const listRect = list?.getBoundingClientRect();
  if (!listRect || !isPointNearRect(clientX, clientY, listRect, BOOKMARK_DROP_TOLERANCE)) {
    return null;
  }

  const target = document.elementFromPoint(clientX, clientY)?.closest?.("[data-nt-reorder-item]");
  if (isValidDropTarget(target)) {
    return target;
  }

  const items = Array.from(list.querySelectorAll("[data-nt-reorder-item]")).filter(isValidDropTarget);
  return findNearestDropTarget(items, clientX, clientY);
}

function findNearestDropTarget(items, clientX, clientY) {
  let nearest = null;
  let nearestScore = Number.POSITIVE_INFINITY;

  items.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const dx = clientX < rect.left
      ? rect.left - clientX
      : clientX > rect.right
        ? clientX - rect.right
        : 0;
    const dy = clientY < rect.top
      ? rect.top - clientY
      : clientY > rect.bottom
        ? clientY - rect.bottom
        : 0;
    const score = (dx * dx) + (dy * dy);
    if (score < nearestScore) {
      nearest = item;
      nearestScore = score;
    }
  });

  return nearest;
}

function isPointNearRect(clientX, clientY, rect, tolerance) {
  return clientX >= rect.left - tolerance &&
    clientX <= rect.right + tolerance &&
    clientY >= rect.top - tolerance &&
    clientY <= rect.bottom + tolerance;
}

function getDropPlacement(target, clientX, clientY) {
  const rect = target.getBoundingClientRect();
  const midX = rect.left + (rect.width / 2);
  const midY = rect.top + (rect.height / 2);

  if (isVerticalReorderList(bookmarkDragState?.list)) {
    return clientY < midY ? "before" : "after";
  }

  return Math.abs(clientX - midX) >= Math.abs(clientY - midY)
    ? clientX < midX ? "before" : "after"
    : clientY < midY ? "before" : "after";
}

function getAdjustedDropPlacement(target, placement) {
  if (!bookmarkDragState) {
    return placement;
  }

  const items = Array.from(bookmarkDragState.list.querySelectorAll("[data-nt-reorder-item]"))
    .filter((item) => item.dataset.ntReorderScope === bookmarkDragState.scope)
    .filter((item) => bookmarkDragState.scope !== "folder" || item.dataset.parentId === bookmarkDragState.sourceParentId);
  const sourceIndex = items.findIndex((item) => item.dataset.nodeId === bookmarkDragState.sourceId);
  const targetIndex = items.findIndex((item) => item.dataset.nodeId === target.dataset.nodeId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return placement;
  }

  if (targetIndex === sourceIndex + 1 && placement === "before") {
    return "after";
  }

  if (targetIndex === sourceIndex - 1 && placement === "after") {
    return "before";
  }

  return placement;
}

function isValidDropTarget(target) {
  if (!target || !bookmarkDragState) {
    return false;
  }

  if (target === bookmarkDragState.item || target.closest(".nt-strip, .nt-menu, .nt-folder-rail-list") !== bookmarkDragState.list) {
    return false;
  }

  if (target.dataset.ntReorderScope !== bookmarkDragState.scope) {
    return false;
  }

  if (bookmarkDragState.scope === "folder" && target.dataset.parentId !== bookmarkDragState.sourceParentId) {
    return false;
  }

  return true;
}

function renderBookmarkDropTarget(target, placement) {
  clearBookmarkDropTarget(target);
  target.classList.toggle("is-drop-before", placement === "before");
  target.classList.toggle("is-drop-after", placement === "after");
}

function clearBookmarkDropTarget(except = null) {
  document.querySelectorAll(".is-drop-before, .is-drop-after").forEach((item) => {
    if (item === except) {
      return;
    }

    item.classList.remove("is-drop-before", "is-drop-after");
  });
}

function createBookmarkDropPlaceholder(item) {
  if (!bookmarkDragState || bookmarkDragState.placeholder) {
    return;
  }

  const rect = item.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.className = "nt-drag-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.style.width = `${Math.max(28, Math.round(rect.width))}px`;
  placeholder.style.height = `${Math.max(24, Math.round(rect.height))}px`;
  item.after(placeholder);
  bookmarkDragState.placeholder = placeholder;
}

function moveBookmarkDropPlaceholder(target, placement) {
  const placeholder = bookmarkDragState?.placeholder;
  if (!placeholder || !target || target === placeholder) {
    return;
  }

  if (placement === "after") {
    target.after(placeholder);
  } else {
    target.before(placeholder);
  }
}

function removeBookmarkDropPlaceholder(state = bookmarkDragState) {
  state?.placeholder?.remove();
  if (state) {
    state.placeholder = null;
  }
}

function createBookmarkDragGhost(item, clientX, clientY) {
  if (!bookmarkDragState) {
    return;
  }

  removeBookmarkDragGhost(bookmarkDragState);

  const rect = item.getBoundingClientRect();
  const ghost = item.cloneNode(true);
  ghost.classList.remove("is-bookmark-dragging", "is-drop-before", "is-drop-after");
  ghost.classList.add("nt-drag-ghost");
  ghost.removeAttribute("href");
  ghost.removeAttribute("data-nt-reorder-item");
  ghost.removeAttribute("data-nt-reorder-scope");
  ghost.removeAttribute("data-node-id");
  ghost.removeAttribute("data-parent-id");
  ghost.removeAttribute("title");
  ghost.setAttribute("aria-hidden", "true");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.append(ghost);
  bookmarkDragState.ghost = ghost;
  positionBookmarkDragGhost(clientX, clientY);
}

function positionBookmarkDragGhost(clientX, clientY) {
  const ghost = bookmarkDragState?.ghost;
  if (!ghost) {
    return;
  }

  const x = clamp(clientX + BOOKMARK_GHOST_OFFSET, 8, Math.max(8, window.innerWidth - ghost.offsetWidth - 8));
  const y = clamp(clientY + BOOKMARK_GHOST_OFFSET, 8, Math.max(8, window.innerHeight - ghost.offsetHeight - 8));
  ghost.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function removeBookmarkDragGhost(state = bookmarkDragState) {
  state?.ghost?.remove();
  if (state) {
    state.ghost = null;
  }
}

function autoScrollBookmarkList(clientX, clientY) {
  const list = bookmarkDragState?.list;
  if (!list) {
    return;
  }

  const rect = list.getBoundingClientRect();
  const edgeSize = 48;

  if (isVerticalReorderList(list)) {
    if (clientY < rect.top + edgeSize) {
      list.scrollBy({ top: -16, behavior: "auto" });
    } else if (clientY > rect.bottom - edgeSize) {
      list.scrollBy({ top: 16, behavior: "auto" });
    }
    return;
  }

  if (clientX < rect.left + edgeSize) {
    list.scrollBy({ left: -14, behavior: "auto" });
  } else if (clientX > rect.right - edgeSize) {
    list.scrollBy({ left: 14, behavior: "auto" });
  }
}

function isVerticalReorderList(list) {
  return Boolean(list?.classList?.contains("nt-menu") || list?.classList?.contains("nt-folder-rail-list"));
}

async function moveBookmark(state) {
  const response = await sendMessage(state.scope === "folder"
    ? {
      type: "BF_MOVE_BOOKMARK",
      sourceId: state.sourceId,
      targetId: state.targetId,
      parentId: state.sourceParentId,
      placement: state.placement
    }
    : {
      type: "BF_MOVE_TOP_LEVEL",
      sourceId: state.sourceId,
      targetId: state.targetId,
      placement: state.placement
    });

  if (!response?.ok) {
    window.alert(response?.error || t("bookmarkMoveFailed"));
    return;
  }

  appState = response;
  render();
}

function preventNativeBookmarkDrag(event) {
  if (event.target?.closest?.("[data-nt-reorder-item]")) {
    event.preventDefault();
  }
}

async function toggleFolder(folderId, anchor) {
  if (activeFolderId === folderId) {
    closeFolderMenu();
    return;
  }

  activeFolderId = folderId;
  const response = await getState();
  if (response?.ok) {
    appState = response;
    render();
    return;
  }

  openFolderMenu(folderId, anchor);
}

function openFolderMenu(folderId, anchor) {
  const folder = findNodeById(getBookmarkTreeRoot(), folderId);
  if (!folder) {
    return;
  }

  const entries = getFolderMenuEntries(folder);
  elements.folderMenu.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "nt-empty";
    empty.textContent = t("noBookmarksInFolder");
    elements.folderMenu.append(empty);
  } else {
    entries.slice(0, 120).forEach((entry) => {
      elements.folderMenu.append(createResultLink(entry));
    });
  }

  const rect = anchor.getBoundingClientRect();
  const isRailAnchor = Boolean(anchor.closest(".nt-folder-rail"));
  const railOnRight = Boolean(anchor.closest(".folder-rail-right"));
  const railRect = isRailAnchor ? elements.folderRail.getBoundingClientRect() : null;
  const menuWidth = Math.min(420, window.innerWidth - 20);
  const left = isRailAnchor
    ? railOnRight
      ? clamp((railRect?.left ?? rect.left) - menuWidth - FOLDER_MENU_GAP, 8, Math.max(8, window.innerWidth - menuWidth - 8))
      : clamp((railRect?.right ?? rect.right) + FOLDER_MENU_GAP, 8, Math.max(8, window.innerWidth - menuWidth - 8))
    : clamp(rect.left, 10, Math.max(10, window.innerWidth - menuWidth - 10));
  const top = isRailAnchor
    ? clamp(rect.top, 8, Math.max(8, window.innerHeight - 120))
    : elements.bookmarkBar.getBoundingClientRect().bottom + 10;
  elements.folderMenu.style.left = `${left}px`;
  elements.folderMenu.style.top = `${top}px`;
  elements.folderMenu.hidden = false;
  updateFolderRailSelection();
}

function closeFolderMenu() {
  activeFolderId = "";
  elements.folderMenu.hidden = true;
  elements.folderMenu.replaceChildren();
  updateFolderRailSelection();
}

function updateFolderRailSelection() {
  elements.folderRailList.querySelectorAll(".nt-folder-rail-item").forEach((item) => {
    item.classList.toggle("is-active", item.dataset.folderId === activeFolderId);
  });
}

function flattenBookmarks(nodes, path, parentId = "") {
  return (nodes || []).flatMap((node) => {
    if (node.url) {
      if (!isSafeBookmarkUrl(node.url)) {
        return [];
      }

      return [{
        id: node.id,
        title: node.title || getHostname(node.url),
        url: node.url,
        path,
        parentId
      }];
    }

    const nextPath = [path, node.title].filter(Boolean).join(" / ");
    return flattenBookmarks(node.children || [], nextPath, node.id);
  });
}

function getFolderMenuEntries(folder) {
  const directEntries = flattenBookmarks(folder.children || [], folder.title || "", folder.id);
  const sameTitleEntries = findSameTitleFolderEntries(folder);
  return dedupeBookmarkEntries([...directEntries, ...sameTitleEntries]);
}

function findSameTitleFolderEntries(folder) {
  const titleKey = normalizeFolderTitle(folder?.title);
  const root = appState?.bookmarkTree;
  if (!titleKey || !root) {
    return [];
  }

  return findFoldersByTitle(root, titleKey)
    .filter((match) => match.folder.id !== folder.id)
    .flatMap((match) => flattenBookmarks(
      match.folder.children || [],
      match.path || match.folder.title || "",
      match.folder.id
    ));
}

function findFoldersByTitle(node, titleKey, path = "") {
  if (!node) {
    return [];
  }

  return (node.children || []).flatMap((child) => {
    if (child.url) {
      return [];
    }

    const nextPath = [path, child.title].filter(Boolean).join(" / ");
    const self = normalizeFolderTitle(child.title) === titleKey
      ? [{ folder: child, path: nextPath }]
      : [];
    return [
      ...self,
      ...findFoldersByTitle(child, titleKey, nextPath)
    ];
  });
}

function dedupeBookmarkEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = String(entry?.id || "");
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeFolderTitle(value) {
  return String(value || "").trim().toLocaleLowerCase(getTextLocale());
}

function getTextLocale() {
  return getLanguage() === "tr" ? "tr-TR" : "en-US";
}

function getBookmarkTreeRoot() {
  return appState?.bookmarkTree || appState?.bookmarkBar || null;
}

function findNodeById(node, id) {
  if (!node) {
    return null;
  }

  if (node.id === id) {
    return node;
  }

  for (const child of node.children || []) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }

  return null;
}

function findNodeLocation(node, nodeId) {
  if (!node) {
    return null;
  }

  const children = node.children || [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.id === nodeId) {
      return {
        node: child,
        parent: node,
        index,
        siblings: children
      };
    }

    const found = findNodeLocation(child, nodeId);
    if (found) {
      return found;
    }
  }

  return null;
}

function scrollBookmarks(direction) {
  elements.bookmarkStrip.scrollBy({
    left: direction * Math.max(260, window.innerWidth * 0.35),
    behavior: "smooth"
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function createFolderFromPrompt(parentId = "") {
  closeContextMenu();
  const title = window.prompt(parentId ? t("childFolderName") : t("newFolderName"), t("newFolderDefault"));
  if (title === null) {
    return;
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    window.alert(t("folderNameRequired"));
    return;
  }

  const response = await sendMessage({
    type: "BF_CREATE_FOLDER",
    title: trimmedTitle,
    parentId
  });
  if (!response?.ok) {
    window.alert(response?.error || t("folderCreateFailed"));
    return;
  }

  appState = response;
  if (parentId) {
    activeFolderId = parentId;
  }
  render();
}

function faviconUrl(pageUrl) {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", "32");
  return url.toString();
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function handleKeydown(event) {
  if (event.key === "Tab" && !elements.addDialog.hidden) {
    event.stopPropagation();
    trapFocusWithin(event, elements.addForm);
    return;
  }

  if (event.key === "Escape") {
    if (!elements.addDialog.hidden) {
      event.preventDefault();
      event.stopPropagation();
      closeAddBookmarkDialog();
      return;
    }

    closeContextMenu();
    closeFolderMenu();
  }
}

function handleDocumentClick(event) {
  if (suppressNextClick) {
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  const actionButton = event.target?.closest?.("[data-nt-action]");
  if (actionButton) {
    event.preventDefault();
    event.stopPropagation();
    handleContextAction(actionButton.dataset.ntAction).catch((error) => {
      window.alert(error?.message || t("genericOperationFailed"));
    });
    return;
  }

  if (!elements.contextMenu.hidden && !elements.contextMenu.contains(event.target)) {
    closeContextMenu();
  }

  if (!elements.addDialog.hidden && event.target === elements.addDialog) {
    closeAddBookmarkDialog();
  }

  if (!elements.folderMenu.hidden && !elements.folderMenu.contains(event.target) && !elements.contextMenu.contains(event.target)) {
    closeFolderMenu();
  }
}
