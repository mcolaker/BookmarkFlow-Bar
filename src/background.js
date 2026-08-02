importScripts("i18n.js", "settings.js");

const {
  DEFAULT_SETTINGS,
  LOCAL_SETTINGS_DEFAULTS,
  SYNC_DEFAULT_SETTINGS,
  areBookmarkUrlsEqual,
  isSafeBookmarkUrl,
  normalizeFolderColor,
  normalizeFolderColors,
  normalizeHosts,
  normalizeSettings,
  normalizeSyncedSettings
} = BookmarkFlowConfig;
const { t } = BookmarkFlowI18n;

const MESSAGE_GET_STATE = "BF_GET_STATE";
const MESSAGE_MOVE_BOOKMARK = "BF_MOVE_BOOKMARK";
const MESSAGE_MOVE_TOP_LEVEL = "BF_MOVE_TOP_LEVEL";
const MESSAGE_DELETE_BOOKMARK = "BF_DELETE_BOOKMARK";
const MESSAGE_CREATE_BOOKMARK = "BF_CREATE_BOOKMARK";
const MESSAGE_CREATE_FOLDER = "BF_CREATE_FOLDER";
const MESSAGE_RENAME_BOOKMARK = "BF_RENAME_BOOKMARK";
const MESSAGE_SET_FOLDER_COLOR = "BF_SET_FOLDER_COLOR";
const MESSAGE_RUN_COMMAND = "BF_RUN_COMMAND";
const FOLDER_RAIL_DEFAULT_MIGRATION_KEY = "bfFolderRailDefaultLeftV1";
const FOLDER_RAIL_PINNED_STORAGE_KEY = "bfFolderRailPinnedIds";
const DISABLED_HOSTS_MIGRATION_KEY = "bfDisabledHostsLocalV1";
const CONTENT_COMMANDS = new Set([
  "hide-restore",
  "open-search",
  "toggle-bar"
]);

const settingsMigrationReady = Promise.all([
  ensureDefaultFolderRailEnabled(),
  migrateDisabledHostsToLocal()
]).catch(() => {});

chrome.runtime.onInstalled.addListener(async (details) => {
  await settingsMigrationReady;
  const existing = await chrome.storage.sync.get(SYNC_DEFAULT_SETTINGS);
  await chrome.storage.sync.set(normalizeSyncedSettings(existing));

  if (details?.reason === "install") {
    await chrome.storage.local.set({ bfOnboardingSeen: false });
    chrome.tabs.create({
      url: chrome.runtime.getURL("src/onboarding.html")
    }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const task = message?.type === MESSAGE_GET_STATE
    ? getState()
    : message?.type === MESSAGE_MOVE_BOOKMARK
      ? moveBookmarkWithinParent(message)
    : message?.type === MESSAGE_MOVE_TOP_LEVEL
      ? moveTopLevelBookmark(message)
    : message?.type === MESSAGE_DELETE_BOOKMARK
      ? deleteBookmark(message)
    : message?.type === MESSAGE_CREATE_BOOKMARK
      ? createBookmark(message)
    : message?.type === MESSAGE_CREATE_FOLDER
      ? createFolder(message)
    : message?.type === MESSAGE_RENAME_BOOKMARK
      ? renameBookmark(message)
    : message?.type === MESSAGE_SET_FOLDER_COLOR
      ? setFolderColor(message)
      : null;

  if (!task) {
    return false;
  }

  task
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error?.message || String(error)
      });
    });

  return true;
});

chrome.commands.onCommand.addListener((command) => {
  runCommand(command).catch(() => {});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && Object.keys(changes).some((key) => key in SYNC_DEFAULT_SETTINGS)) {
    scheduleBroadcast();
    return;
  }

  if (areaName === "local" && (
    FOLDER_RAIL_PINNED_STORAGE_KEY in changes ||
    "disabledHosts" in changes
  )) {
    scheduleBroadcast();
  }
});

[
  "onCreated",
  "onRemoved",
  "onChanged",
  "onMoved",
  "onChildrenReordered",
  "onImportEnded"
].forEach((eventName) => {
  chrome.bookmarks[eventName]?.addListener(scheduleBroadcast);
});

let broadcastTimer = 0;

function scheduleBroadcast() {
  clearTimeout(broadcastTimer);
  broadcastTimer = setTimeout(() => {
    broadcastState().catch(() => {});
  }, 150);
}

async function runCommand(command) {
  if (command === "toggle-streamer-mode") {
    const settings = await getSettings();
    await chrome.storage.sync.set({
      streamerMode: !settings.streamerMode
    });
    return;
  }

  if (!CONTENT_COMMANDS.has(command)) {
    return;
  }

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (typeof tab?.id !== "number") {
    return;
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: MESSAGE_RUN_COMMAND,
    command
  });
}

async function broadcastState() {
  const state = await getState();
  const tabs = await chrome.tabs.query({});
  chrome.runtime.sendMessage({
    type: "BF_STATE_CHANGED",
    state
  }).catch(() => {});

  await Promise.allSettled(
    tabs
      .filter((tab) => typeof tab.id === "number")
      .map((tab) => chrome.tabs.sendMessage(tab.id, {
        type: "BF_STATE_CHANGED",
        state
      }))
  );
}

async function getState() {
  const [settings, bookmarks] = await Promise.all([
    getSettings(),
    getBookmarkData()
  ]);

  return {
    ok: true,
    settings,
    bookmarkBar: bookmarks.bookmarkBar,
    bookmarkTree: bookmarks.bookmarkTree
  };
}

async function getSettings() {
  await settingsMigrationReady;
  const [syncedSettings, localSettings] = await Promise.all([
    chrome.storage.sync.get(SYNC_DEFAULT_SETTINGS),
    chrome.storage.local.get(LOCAL_SETTINGS_DEFAULTS)
  ]);
  return normalizeSettings({ ...syncedSettings, ...localSettings });
}

async function ensureDefaultFolderRailEnabled() {
  const [localState, syncState] = await Promise.all([
    chrome.storage.local.get(FOLDER_RAIL_DEFAULT_MIGRATION_KEY),
    chrome.storage.sync.get("folderRail")
  ]);

  if (localState[FOLDER_RAIL_DEFAULT_MIGRATION_KEY] === true) {
    return;
  }

  if (syncState.folderRail !== "left") {
    await chrome.storage.sync.set({ folderRail: "left" });
  }

  await chrome.storage.local.set({
    [FOLDER_RAIL_DEFAULT_MIGRATION_KEY]: true
  });
}

async function migrateDisabledHostsToLocal() {
  const [localState, syncState] = await Promise.all([
    chrome.storage.local.get(["disabledHosts", DISABLED_HOSTS_MIGRATION_KEY]),
    chrome.storage.sync.get("disabledHosts")
  ]);
  const localHosts = normalizeHosts(localState.disabledHosts);
  const syncedHosts = normalizeHosts(syncState.disabledHosts);
  const mergedHosts = normalizeHosts([...localHosts, ...syncedHosts]);

  if (
    localState[DISABLED_HOSTS_MIGRATION_KEY] !== true ||
    JSON.stringify(localHosts) !== JSON.stringify(mergedHosts)
  ) {
    await chrome.storage.local.set({
      disabledHosts: mergedHosts,
      [DISABLED_HOSTS_MIGRATION_KEY]: true
    });
  }

  if (Object.prototype.hasOwnProperty.call(syncState, "disabledHosts")) {
    await chrome.storage.sync.remove("disabledHosts");
  }
}

async function getBookmarkData() {
  const [root, localState] = await Promise.all([
    getBookmarkTreeRoot(),
    chrome.storage.local.get(FOLDER_RAIL_PINNED_STORAGE_KEY)
  ]);
  const bookmarkBar = selectBookmarkBarNode(root);
  return {
    bookmarkBar: sanitizeNode(bookmarkBar),
    folderRailFolders: getFolderRailFolders(
      root,
      normalizePinnedFolderIds(localState[FOLDER_RAIL_PINNED_STORAGE_KEY])
    ),
    bookmarkTree: sanitizeNode(root)
  };
}

async function getBookmarkTreeRoot() {
  const [root] = await chrome.bookmarks.getTree();
  return root;
}

function selectBookmarkBarNode(root) {
  const topLevelFolders = root?.children || [];
  return (
    topLevelFolders.find((node) => node.folderType === "bookmarks-bar") ||
    topLevelFolders.find((node) => node.id === "1") ||
    topLevelFolders[0] ||
    root
  );
}

function getFolderRailFolders(root, pinnedFolderIds = []) {
  const topLevelFolders = root?.children || [];
  const bookmarkBars = topLevelFolders.filter((node) => node.folderType === "bookmarks-bar");
  const sourceBars = bookmarkBars.length
    ? [...bookmarkBars].sort((left, right) => Number(right.syncing === true) - Number(left.syncing === true))
    : [selectBookmarkBarNode(root)];
  const foldersByTitle = new Map();
  const pinnedTitleKeys = new Set();

  pinnedFolderIds.forEach((folderId) => {
    const node = findBookmarkNodeById(root, folderId);
    if (!node || node.url || node.folderType) {
      return;
    }

    const titleKey = normalizeFolderTitle(node.title);
    if (!titleKey || pinnedTitleKeys.has(titleKey)) {
      return;
    }

    foldersByTitle.set(titleKey, node);
    pinnedTitleKeys.add(titleKey);
  });

  collectSyncedFolderRailCandidates(root).forEach((node) => {
    addFolderRailCandidate(foldersByTitle, node, pinnedTitleKeys);
  });

  sourceBars.forEach((bar) => {
    (bar?.children || []).forEach((node) => {
      if (node.url) {
        return;
      }

      addFolderRailCandidate(foldersByTitle, node, pinnedTitleKeys);
    });
  });

  return Array.from(foldersByTitle.values()).map(sanitizeNode).filter(Boolean);
}

function normalizePinnedFolderIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((id) => String(id || "")).filter(Boolean))).slice(0, 200);
}

function findBookmarkNodeById(node, nodeId) {
  if (!node) {
    return null;
  }

  if (node.id === nodeId) {
    return node;
  }

  for (const child of node.children || []) {
    const found = findBookmarkNodeById(child, nodeId);
    if (found) {
      return found;
    }
  }

  return null;
}

function collectSyncedFolderRailCandidates(root) {
  const folders = [];

  const visit = (node) => {
    if (!node || node.url) {
      return;
    }

    const children = node.children || [];
    const isUserFolder = Boolean(node.parentId && !node.folderType && node.title);
    const hasDirectBookmark = children.some((child) => Boolean(child.url));
    if (isUserFolder && node.syncing === true && hasDirectBookmark) {
      folders.push(node);
    }

    children.forEach(visit);
  };

  visit(root);
  return folders;
}

function addFolderRailCandidate(foldersByTitle, node, protectedTitleKeys = new Set()) {
  const titleKey = normalizeFolderTitle(node?.title);
  if (!titleKey || protectedTitleKeys.has(titleKey)) {
    return;
  }

  const existing = foldersByTitle.get(titleKey);
  if (!existing || (node.syncing === true && existing.syncing !== true)) {
    foldersByTitle.set(titleKey, node);
  }
}

function normalizeFolderTitle(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

async function moveTopLevelBookmark(message) {
  const sourceId = String(message?.sourceId || "");
  const targetId = String(message?.targetId || "");
  const placement = message?.placement === "after" ? "after" : "before";
  const root = await getBookmarkTreeRoot();
  const bookmarkBar = selectBookmarkBarNode(root);
  const children = bookmarkBar?.children || [];
  const sourceIndex = children.findIndex((node) => node.id === sourceId);
  const targetIndex = children.findIndex((node) => node.id === targetId);

  if (!sourceId || !targetId || sourceId === targetId || sourceIndex < 0 || targetIndex < 0) {
    return {
      ok: false,
      error: t("bookmarkMoveInvalid")
    };
  }

  const destinationIndex = getBookmarkMoveIndex(sourceIndex, targetIndex, placement, children.length);
  const moved = destinationIndex !== null;
  if (moved) {
    await chrome.bookmarks.move(sourceId, {
      parentId: bookmarkBar.id,
      index: destinationIndex
    });
  }

  scheduleBroadcast();
  return {
    ...(await getState()),
    moved
  };
}

async function moveBookmarkWithinParent(message) {
  const sourceId = String(message?.sourceId || "");
  const targetId = String(message?.targetId || "");
  const parentId = String(message?.parentId || "");
  const placement = message?.placement === "after" ? "after" : "before";
  const root = await getBookmarkTreeRoot();
  const source = findNodeWithParent(root, sourceId);
  const target = findNodeWithParent(root, targetId);

  if (!sourceId || !targetId || sourceId === targetId || !source || !target || source.parent !== target.parent) {
    return {
      ok: false,
      error: t("bookmarkMoveInvalid")
    };
  }

  if (parentId && source.parent.id !== parentId) {
    return {
      ok: false,
      error: t("bookmarkParentInvalid")
    };
  }

  const children = source.parent.children || [];
  const sourceIndex = children.findIndex((node) => node.id === sourceId);
  const targetIndex = children.findIndex((node) => node.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return {
      ok: false,
      error: t("bookmarkIndexInvalid")
    };
  }

  const destinationIndex = getBookmarkMoveIndex(sourceIndex, targetIndex, placement, children.length);
  const moved = destinationIndex !== null;
  if (moved) {
    await chrome.bookmarks.move(sourceId, {
      parentId: source.parent.id,
      index: destinationIndex
    });
  }

  scheduleBroadcast();
  return {
    ...(await getState()),
    moved
  };
}

function getBookmarkMoveIndex(sourceIndex, targetIndex, placement, siblingCount) {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return null;
  }

  if (placement === "before" && sourceIndex === targetIndex - 1) {
    return null;
  }

  if (placement === "after" && sourceIndex === targetIndex + 1) {
    return null;
  }

  const rawIndex = placement === "after" ? targetIndex + 1 : targetIndex;
  return Math.max(0, Math.min(rawIndex, siblingCount));
}

async function deleteBookmark(message) {
  const nodeId = String(message?.nodeId || "");
  const root = await getBookmarkTreeRoot();
  const target = findNodeWithParent(root, nodeId);

  if (!nodeId || !target) {
    return {
      ok: false,
      error: t("bookmarkDeleteTargetMissing")
    };
  }

  if (target.node.url) {
    await chrome.bookmarks.remove(nodeId);
  } else {
    await chrome.bookmarks.removeTree(nodeId);
  }

  scheduleBroadcast();
  return getState();
}

async function createBookmark(message) {
  const title = String(message?.title || "").trim();
  const rawUrl = String(message?.url || "").trim();
  const requestedParentId = String(message?.parentId || "");
  const allowDuplicate = message?.allowDuplicate === true;
  const url = normalizeBookmarkUrl(rawUrl);

  if (!url || !isSafeBookmarkUrl(url)) {
    return {
      ok: false,
      error: t("validUrlRequired")
    };
  }

  const root = await getBookmarkTreeRoot();
  const bookmarkBar = selectBookmarkBarNode(root);
  const createParent = getBookmarkCreateParent(root, bookmarkBar, requestedParentId);
  if (!createParent) {
    return {
      ok: false,
      error: t("bookmarkTargetFolderMissing")
    };
  }

  const existing = findDirectBookmarkByUrl(createParent, url);
  if (existing && !allowDuplicate) {
    return {
      ...(await getState()),
      alreadyExists: true,
      createdId: existing.id,
      existingBookmark: findBookmarkEntryById(root, existing.id),
      parentId: createParent.id
    };
  }

  const created = await chrome.bookmarks.create({
    parentId: createParent.id,
    title: title || getHostname(url),
    url
  });

  scheduleBroadcast();
  return {
    ...(await getState()),
    createdId: created.id
  };
}

async function createFolder(message) {
  const title = String(message?.title || "").trim();
  const requestedParentId = String(message?.parentId || "");

  if (!title) {
    return {
      ok: false,
      error: t("folderNameRequired")
    };
  }

  const root = await getBookmarkTreeRoot();
  const bookmarkBar = selectBookmarkBarNode(root);
  const createParent = getBookmarkCreateParent(root, bookmarkBar, requestedParentId);
  if (!createParent) {
    return {
      ok: false,
      error: t("folderTargetMissing")
    };
  }

  const created = await chrome.bookmarks.create({
    parentId: createParent.id,
    title
  });

  scheduleBroadcast();
  return {
    ...(await getState()),
    createdId: created.id
  };
}

async function renameBookmark(message) {
  const nodeId = String(message?.nodeId || "");
  const title = String(message?.title || "").trim();
  const root = await getBookmarkTreeRoot();
  const target = findNodeWithParent(root, nodeId);

  if (!nodeId || !target) {
    return {
      ok: false,
      error: t("renameTargetMissing")
    };
  }

  if (!title) {
    return {
      ok: false,
      error: t("nameRequired")
    };
  }

  await chrome.bookmarks.update(nodeId, { title });
  scheduleBroadcast();
  return getState();
}

async function setFolderColor(message) {
  const nodeId = String(message?.nodeId || "");
  const color = normalizeFolderColor(message?.color || "");
  const root = await getBookmarkTreeRoot();
  const target = findNodeWithParent(root, nodeId);

  if (!nodeId || !target || target.node.url) {
    return {
      ok: false,
      error: t("folderColorTargetMissing")
    };
  }

  const settings = await getSettings();
  const folderColors = {
    ...settings.folderColors
  };

  if (color) {
    folderColors[nodeId] = color;
  } else {
    delete folderColors[nodeId];
  }

  await chrome.storage.sync.set({
    folderColors: normalizeFolderColors(folderColors)
  });

  scheduleBroadcast();
  return getState();
}

function getBookmarkCreateParent(root, bookmarkBar, requestedParentId) {
  if (!requestedParentId || requestedParentId === bookmarkBar.id) {
    return bookmarkBar;
  }

  const location = findNodeWithParent(root, requestedParentId);
  if (!location?.node || location.node.url) {
    return null;
  }

  return location.node;
}

function normalizeBookmarkUrl(value) {
  if (!value) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return value;
  }

  if (/^[^\s]+\.[^\s]{2,}(\/.*)?$/i.test(value)) {
    return `https://${value}`;
  }

  return value;
}

function findBookmarkByUrl(node, url) {
  if (!node) {
    return null;
  }

  if (node.url && areBookmarkUrlsEqual(node.url, url)) {
    return node;
  }

  for (const child of node.children || []) {
    const found = findBookmarkByUrl(child, url);
    if (found) {
      return found;
    }
  }

  return null;
}

function findDirectBookmarkByUrl(node, url) {
  return (node?.children || []).find((child) => child.url && areBookmarkUrlsEqual(child.url, url)) || null;
}

function findBookmarkEntryById(root, nodeId, path = "") {
  if (!root) {
    return null;
  }

  for (const child of root.children || []) {
    if (child.id === nodeId && child.url) {
      return {
        id: child.id,
        title: child.title || getHostname(child.url),
        url: child.url,
        path,
        parentId: root.id || ""
      };
    }

    if (!child.url) {
      const nextPath = [path, child.title].filter(Boolean).join(" / ");
      const found = findBookmarkEntryById(child, nodeId, nextPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

function findNodeWithParent(parent, nodeId) {
  for (const child of parent?.children || []) {
    if (child.id === nodeId) {
      return {
        node: child,
        parent
      };
    }

    const found = findNodeWithParent(child, nodeId);
    if (found) {
      return found;
    }
  }

  return null;
}

function sanitizeNode(node) {
  if (node.url && !isSafeBookmarkUrl(node.url)) {
    return null;
  }

  return {
    id: node.id,
    parentId: node.parentId || "",
    title: node.title || "",
    url: node.url || "",
    syncing: node.syncing === true,
    folderType: node.folderType || "",
    children: Array.isArray(node.children) ? node.children.map(sanitizeNode).filter(Boolean) : []
  };
}
