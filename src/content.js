(() => {
  if (window.__bookmarkFlowBarLoaded || window.top !== window.self) {
    return;
  }

  window.__bookmarkFlowBarLoaded = true;

  const HOST_ID = "bookmarkflow-bar-root";
  const GLOBAL_STYLE_ID = "bookmarkflow-bar-page-style";
  const PAGE_OFFSET_CLASS = "bookmarkflow-page-offset";
  const PAGE_OFFSET_VAR = "--bookmarkflow-offset";
  const PAGE_OFFSET_BASE_VAR = "--bookmarkflow-base-padding-top";
  const PANEL_MARGIN = 6;
  const PANEL_POSITION_VERSION = 2;
  const PANEL_EDGE_SNAP = 12;
  const PANEL_DRAG_THRESHOLD = 4;
  const PANEL_TOP_OFFSET_THRESHOLD = 220;
  const TOP_SURFACE_CACHE_MS = 900;
  const TOP_SURFACE_SCAN_LIMIT = 1800;
  const TOP_SURFACE_MAX_TOP = 96;
  const TOP_SURFACE_MIN_BOTTOM = 34;
  const TOP_SURFACE_MIN_WIDTH = 220;
  const BOOKMARK_DRAG_THRESHOLD = 3;
  const BOOKMARK_DROP_TOLERANCE = 96;
  const BOOKMARK_GHOST_OFFSET = 12;
  const FOLDER_MENU_GAP = 16;
  const FOLDER_RAIL_PINNED_STORAGE_KEY = "bfFolderRailPinnedIds";
  const MESSAGE_GET_CONSENT_STATUS = "BF_GET_CONSENT_STATUS";
  const MESSAGE_GET_STATE = "BF_GET_STATE";
  const MESSAGE_GET_PAGE_INFO = "BF_GET_PAGE_INFO";
  const MESSAGE_MOVE_BOOKMARK = "BF_MOVE_BOOKMARK";
const MESSAGE_MOVE_TOP_LEVEL = "BF_MOVE_TOP_LEVEL";
const MESSAGE_DELETE_BOOKMARK = "BF_DELETE_BOOKMARK";
const MESSAGE_CREATE_BOOKMARK = "BF_CREATE_BOOKMARK";
const MESSAGE_CREATE_FOLDER = "BF_CREATE_FOLDER";
const MESSAGE_RENAME_BOOKMARK = "BF_RENAME_BOOKMARK";
const MESSAGE_SET_FOLDER_COLOR = "BF_SET_FOLDER_COLOR";
const MESSAGE_RUN_COMMAND = "BF_RUN_COMMAND";
  const MESSAGE_STATE_CHANGED = "BF_STATE_CHANGED";
  const {
    FOLDER_COLOR_PRESETS,
    DATA_CONSENT_STORAGE_KEY,
    DATA_CONSENT_VERSION,
    isHostDisabled,
    isSafeBookmarkUrl,
    isSensitiveHost,
    areBookmarkUrlsEqual,
    normalizeHost,
    PANEL_POSITION_STORAGE_KEY
  } = BookmarkFlowConfig;
  const { getLanguage, t } = BookmarkFlowI18n;

  let appState = null;
  let host = null;
  let shadow = null;
  let resizeObserver = null;
  let activeFolderId = "";
  let searchQuery = "";
  let isExpanded = false;
  let commandQuery = "";
  let commandActiveIndex = 0;
  let isSnoozed = false;
  let stylesReady = false;
  let panelPosition = null;
  let dragState = null;
  let bookmarkDragState = null;
  let contextMenuState = null;
  let suppressNextClick = false;
  let pinnedFolderIds = [];
  let extensionContextInvalidated = false;
  let addDialogReturnFocus = null;
  let commandDialogReturnFocus = null;
  let interfaceInitialized = false;
  let initializationPending = false;
  let topSurfaceCache = {
    checkedAt: 0,
    value: false
  };

  try {
    chrome.storage.onChanged.addListener(handleConsentStorageChanged);
  } catch (error) {
    handleExtensionContextError(error);
  }
  init().catch(() => {});

  async function init() {
    if (interfaceInitialized || initializationPending) {
      return;
    }

    initializationPending = true;
    try {
      const consent = await sendMessage({ type: MESSAGE_GET_CONSENT_STATUS });
      if (!consent?.ok || !consent.consentGranted) {
        return;
      }

      const [response, , savedPinnedFolderIds] = await Promise.all([
        sendMessage({ type: MESSAGE_GET_STATE }),
        loadPanelPosition(),
        loadPinnedFolderIds()
      ]);
      if (!response?.ok) {
        return;
      }

      injectPageStyle();
      appState = response;
      pinnedFolderIds = savedPinnedFolderIds;
      interfaceInitialized = true;
      renderFromState();

      try {
        chrome.runtime.onMessage.addListener(handleRuntimeMessage);
      } catch (error) {
        handleExtensionContextError(error);
      }

      try {
        chrome.storage.onChanged.addListener(handleSafeStorageChanged);
      } catch (error) {
        handleExtensionContextError(error);
      }
      window.addEventListener("resize", handleSafeWindowResize, { passive: true });
      document.addEventListener("pointerdown", handleSafeOutsidePointerDown, true);
      document.addEventListener("keydown", handleSafeDocumentKeydown, true);
    } finally {
      initializationPending = false;
    }
  }

  function handleConsentStorageChanged(changes, areaName) {
    if (areaName !== "local" || !(DATA_CONSENT_STORAGE_KEY in changes)) {
      return;
    }

    if (changes[DATA_CONSENT_STORAGE_KEY].newValue === DATA_CONSENT_VERSION) {
      init().catch(() => {});
      return;
    }

    deactivateInterface();
  }

  function deactivateInterface() {
    interfaceInitialized = false;
    initializationPending = false;
    appState = null;
    pinnedFolderIds = [];
    try {
      chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
      chrome.storage.onChanged.removeListener(handleSafeStorageChanged);
    } catch {}
    window.removeEventListener("resize", handleSafeWindowResize);
    document.removeEventListener("pointerdown", handleSafeOutsidePointerDown, true);
    document.removeEventListener("keydown", handleSafeDocumentKeydown, true);
    teardown();
  }

  function sendMessage(message) {
    if (!hasExtensionContext()) {
      return Promise.resolve({
        ok: false,
        error: t("extensionContextUnavailable")
      });
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            handleExtensionContextError(lastError);
            resolve({
              ok: false,
              error: lastError.message || t("extensionContextUnavailable")
            });
            return;
          }

          resolve(response);
        });
      } catch (error) {
        handleExtensionContextError(error);
        resolve({
          ok: false,
          error: error?.message || t("extensionContextUnavailable")
        });
      }
    });
  }

  function hasExtensionContext() {
    if (extensionContextInvalidated) {
      return false;
    }

    try {
      const runtime = typeof chrome === "undefined" ? null : chrome.runtime;
      return Boolean(runtime?.id);
    } catch (error) {
      handleExtensionContextError(error);
      return false;
    }
  }

  function getRuntimeUrl(path) {
    if (!hasExtensionContext()) {
      return "";
    }

    try {
      return chrome.runtime.getURL(path);
    } catch (error) {
      handleExtensionContextError(error);
      return "";
    }
  }

  function getRuntimeId() {
    if (!hasExtensionContext()) {
      return "";
    }

    try {
      return chrome.runtime.id || "";
    } catch (error) {
      handleExtensionContextError(error);
      return "";
    }
  }

  function handleExtensionContextError(error) {
    const message = String(error?.message || error || "");
    if (!/Extension context invalidated|context invalidated/i.test(message)) {
      return false;
    }

    extensionContextInvalidated = true;
    try {
      chrome?.runtime?.onMessage?.removeListener?.(handleRuntimeMessage);
    } catch {}
    try {
      chrome?.storage?.onChanged?.removeListener?.(handleSafeStorageChanged);
      chrome?.storage?.onChanged?.removeListener?.(handleConsentStorageChanged);
    } catch {}
    try {
      window.removeEventListener("resize", handleSafeWindowResize);
      document.removeEventListener("pointerdown", handleSafeOutsidePointerDown, true);
      document.removeEventListener("keydown", handleSafeDocumentKeydown, true);
    } catch {}
    try {
      teardown();
    } catch {}
    return true;
  }

  function runSafely(callback) {
    try {
      return callback();
    } catch (error) {
      handleExtensionContextError(error);
      return undefined;
    }
  }

  function createSafeEventHandler(handler) {
    return function bookmarkFlowSafeEventHandler(event) {
      if (extensionContextInvalidated) {
        return;
      }

      return runSafely(() => handler(event));
    };
  }

  function getEventTargetElement(event) {
    const target = event?.target;
    if (target instanceof Element) {
      return target;
    }

    if (target instanceof Node && target.parentElement) {
      return target.parentElement;
    }

    return null;
  }

  function handleRuntimeMessage(message, _sender, sendResponse) {
    return runSafely(() => {
      if (message?.type === MESSAGE_STATE_CHANGED && message.state?.ok) {
        appState = message.state;
        renderFromState();
      }

      if (message?.type === MESSAGE_GET_PAGE_INFO) {
        sendResponse(getPageInfo());
      }

      if (message?.type === MESSAGE_RUN_COMMAND) {
        sendResponse(runExternalCommand(message.command));
      }
    });
  }

  function handleSafeStorageChanged(changes, areaName) {
    return runSafely(() => handleStorageChanged(changes, areaName));
  }

  function handleSafeWindowResize(event) {
    return runSafely(() => handleWindowResize(event));
  }

  function handleSafeOutsidePointerDown(event) {
    return runSafely(() => handleOutsidePointerDown(event));
  }

  function handleSafeDocumentKeydown(event) {
    return runSafely(() => handleDocumentKeydown(event));
  }

  function handleSafeBookmarkPointerMove(event) {
    return runSafely(() => handleBookmarkPointerMove(event));
  }

  function handleSafeFinishBookmarkDrag(event) {
    return runSafely(() => finishBookmarkDrag(event));
  }

  function handleSafeBookmarkMouseMove(event) {
    return runSafely(() => handleBookmarkPointerMove(event, { mouseFallback: true }));
  }

  function handleSafeFinishBookmarkMouseDrag(event) {
    return runSafely(() => finishBookmarkDrag(event, { mouseFallback: true }));
  }

  function handleSafePanelPointerMove(event) {
    return runSafely(() => handlePanelPointerMove(event));
  }

  function handleSafeFinishPanelDrag(event) {
    return runSafely(() => finishPanelDrag(event));
  }

  async function loadPanelPosition() {
    try {
      const stored = await chrome.storage.local.get(PANEL_POSITION_STORAGE_KEY);
      const storedPosition = stored[PANEL_POSITION_STORAGE_KEY];
      const normalizedPosition = normalizePanelPosition(storedPosition);
      if (isLegacyCrowdedTopLeftPosition(storedPosition, normalizedPosition)) {
        panelPosition = null;
        await chrome.storage.local.remove(PANEL_POSITION_STORAGE_KEY);
        return;
      }

      panelPosition = normalizedPosition;
    } catch (error) {
      handleExtensionContextError(error);
      panelPosition = null;
    }
  }

  async function loadPinnedFolderIds() {
    try {
      const localState = await chrome.storage.local.get(FOLDER_RAIL_PINNED_STORAGE_KEY);
      return normalizePinnedFolderIds(localState[FOLDER_RAIL_PINNED_STORAGE_KEY]);
    } catch (error) {
      handleExtensionContextError(error);
      return [];
    }
  }

  function normalizePinnedFolderIds(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(new Set(value.map((id) => String(id || "")).filter(Boolean))).slice(0, 200);
  }

  function handleStorageChanged(changes, areaName) {
    if (areaName !== "local") {
      return;
    }

    if (FOLDER_RAIL_PINNED_STORAGE_KEY in changes) {
      pinnedFolderIds = normalizePinnedFolderIds(changes[FOLDER_RAIL_PINNED_STORAGE_KEY].newValue);
      renderFromState();
    }

    if (!(PANEL_POSITION_STORAGE_KEY in changes)) {
      return;
    }

    panelPosition = normalizePanelPosition(changes[PANEL_POSITION_STORAGE_KEY].newValue);
    applyPanelPlacement();
    updatePageOffsetSoon();
  }

  function handleWindowResize() {
    invalidateTopSurfaceCache();
    applyPanelPlacement();
    scheduleTightenBookmarkRows();
    updatePageOffsetSoon();
  }

  function handleOutsidePointerDown(event) {
    if ((!activeFolderId && !isContextMenuOpen()) || bookmarkDragState || !host?.isConnected) {
      return;
    }

    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    if (path.includes(host)) {
      return;
    }

    closeFolderMenu();
    closeContextMenu();
  }

  function renderFromState() {
    const modalReturnFocus = takeOpenModalReturnFocus();
    if (!shouldRenderBar()) {
      teardown();
      restoreFocusTarget(modalReturnFocus);
      return;
    }

    ensureHost();
    if (isSnoozed) {
      renderRestoreButton();
      updatePageOffsetSoon();
      restoreFocusTarget(modalReturnFocus);
      return;
    }

    render();
    updatePageOffsetSoon();
    restoreFocusTarget(modalReturnFocus);
  }

  function runExternalCommand(command) {
    if (!shouldRenderBar()) {
      return {
        ok: false,
        error: t("bookmarkFlowUnavailable")
      };
    }

    if (command === "open-search") {
      isSnoozed = false;
      renderFromState();
      requestAnimationFrame(openCommandPalette);
      return { ok: true };
    }

    if (command === "toggle-bar") {
      const returnFocus = closeModalDialogsForRender();
      closeFolderMenu();
      closeContextMenu();
      if (isSnoozed) {
        isSnoozed = false;
        isExpanded = false;
      } else {
        isExpanded = !isExpanded;
      }
      renderFromState();
      restoreFocusTarget(returnFocus);
      return { ok: true };
    }

    if (command === "hide-restore") {
      let returnFocus = null;
      if (isSnoozed) {
        isSnoozed = false;
      } else {
        isSnoozed = true;
        isExpanded = false;
        returnFocus = closeModalDialogsForRender();
        closeFolderMenu();
        closeContextMenu();
      }
      renderFromState();
      restoreFocusTarget(returnFocus);
      return { ok: true };
    }

    return {
      ok: false,
      error: t("unknownCommand")
    };
  }

  function ensureHost() {
    if (host && shadow) {
      return;
    }

    const ownedHost = document.createElement("div");
    ownedHost.id = createHostInstanceId();
    const ownedShadow = ownedHost.attachShadow({ mode: "closed" });
    host = ownedHost;
    shadow = ownedShadow;

    hideHostUntilStyles();
    applyPanelPlacement();

    if (!shadow.querySelector("link[data-bf-style]")) {
      const stylesheet = document.createElement("link");
      stylesheet.dataset.bfStyle = "true";
      stylesheet.rel = "stylesheet";
      stylesheet.addEventListener("load", showHostAfterStyles, { once: true });
      stylesheet.addEventListener("error", showHostAfterStyles, { once: true });
      const stylesheetUrl = getRuntimeUrl("src/content.css");
      if (!stylesheetUrl) {
        showHostAfterStyles();
        return;
      }
      stylesheet.href = stylesheetUrl;
      shadow.append(stylesheet);
    } else {
      showHostAfterStyles();
    }

    if (!host.isConnected) {
      document.documentElement.prepend(host);
    }

    resizeObserver = new ResizeObserver(updatePageOffsetSoon);
    resizeObserver.observe(host);
  }

  function createHostInstanceId() {
    let nonce = "";
    try {
      nonce = crypto.randomUUID();
    } catch {
      nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    return `${HOST_ID}-${getRuntimeId() || "runtime"}-${nonce}`;
  }

  function hideHostUntilStyles() {
    if (stylesReady || !host) {
      return;
    }

    host.style.position = "fixed";
    host.style.top = "0";
    host.style.left = "0";
    host.style.right = "0";
    host.style.zIndex = "2147483646";
    host.style.pointerEvents = "none";
    host.style.visibility = "hidden";
  }

  function showHostAfterStyles() {
    stylesReady = true;
    if (!host) {
      return;
    }

    host.style.visibility = "";
    host.style.pointerEvents = "";
    host.style.zIndex = "";
    applyPanelPlacement();
    updatePageOffsetSoon();
  }

  function applyPanelPlacement() {
    if (!host) {
      return;
    }

    const hasCustomPosition = Boolean(panelPosition);
    const useBottomDock = shouldUseBottomDock();
    const useFloatingPosition = hasCustomPosition && !useBottomDock && !shouldUseExpandedPanelDock();
    const useFullWidth = useFloatingPosition && shouldUseFullWidthFloatingPanel();
    host.classList.toggle("bf-floating", useFloatingPosition);
    host.classList.toggle("bf-floating-wide", useFullWidth);
    host.classList.toggle("bf-bottom", useBottomDock);

    if (useBottomDock || !useFloatingPosition) {
      host.style.left = "";
      host.style.top = "";
      host.style.right = "";
      host.style.bottom = "";
      host.style.width = "";
      return;
    }

    if (useFullWidth) {
      const position = clampPanelPosition({
        x: PANEL_MARGIN,
        y: panelPosition.y
      }, { fullWidth: true });
      host.style.left = `${PANEL_MARGIN}px`;
      host.style.top = `${position.y}px`;
      host.style.right = `${PANEL_MARGIN}px`;
      host.style.bottom = "auto";
      host.style.width = "auto";
      return;
    }

    const position = clampPanelPosition(panelPosition);
    host.style.left = `${position.x}px`;
    host.style.top = `${position.y}px`;
    host.style.right = "auto";
    host.style.bottom = "auto";
    host.style.width = "";
  }

  function shouldUseFullWidthFloatingPanel() {
    return false;
  }

  function shouldUseExpandedPanelDock() {
    return Boolean(panelPosition && isExpanded && !isSnoozed);
  }

  function shouldUseExpandedPanelBottomDock() {
    return Boolean(
      shouldUseExpandedPanelDock() &&
      panelPosition.y > window.innerHeight * 0.55
    );
  }

  function shouldOffsetFloatingPanel() {
    return Boolean(
      shouldUseFullWidthFloatingPanel() &&
      panelPosition.y <= getTopFloatingOffsetLimit()
    );
  }

  function getTopFloatingOffsetLimit() {
    return Math.min(
      280,
      Math.max(PANEL_TOP_OFFSET_THRESHOLD, window.innerHeight * 0.24)
    );
  }

  function normalizePanelPosition(value) {
    if (!value || typeof value !== "object") {
      return null;
    }

    const x = Number(value.x);
    const y = Number(value.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return { x, y };
  }

  function isLegacyCrowdedTopLeftPosition(rawPosition, normalizedPosition) {
    if (!normalizedPosition || rawPosition?.version === PANEL_POSITION_VERSION) {
      return false;
    }

    return normalizedPosition.x <= 48 && normalizedPosition.y <= 170;
  }

  function clampPanelPosition(position, options = {}) {
    const normalized = normalizePanelPosition(position) || {
      x: PANEL_MARGIN,
      y: PANEL_MARGIN
    };
    const size = getPanelSize(options);
    const maxX = options.fullWidth
      ? PANEL_MARGIN
      : Math.max(PANEL_MARGIN, window.innerWidth - size.width - PANEL_MARGIN);
    const maxY = Math.max(PANEL_MARGIN, window.innerHeight - size.height - PANEL_MARGIN);

    return {
      x: options.fullWidth ? PANEL_MARGIN : clamp(normalized.x, PANEL_MARGIN, maxX),
      y: clamp(normalized.y, PANEL_MARGIN, maxY)
    };
  }

  function snapPanelPosition(position, options = {}) {
    const clamped = clampPanelPosition(position, options);
    const size = getPanelSize(options);
    const maxX = options.fullWidth
      ? PANEL_MARGIN
      : Math.max(PANEL_MARGIN, window.innerWidth - size.width - PANEL_MARGIN);
    const maxY = Math.max(PANEL_MARGIN, window.innerHeight - size.height - PANEL_MARGIN);

    return {
      x: options.fullWidth ? PANEL_MARGIN : snapToEdge(clamped.x, PANEL_MARGIN, maxX),
      y: snapToEdge(clamped.y, PANEL_MARGIN, maxY)
    };
  }

  function getPanelSize(options = {}) {
    const rect = host?.getBoundingClientRect();
    const viewportWidth = Math.max(40, window.innerWidth - (PANEL_MARGIN * 2));
    const viewportHeight = Math.max(30, window.innerHeight - (PANEL_MARGIN * 2));

    return {
      width: options.fullWidth ? viewportWidth : Math.min(Math.max(rect?.width || 40, 40), viewportWidth),
      height: Math.min(Math.max(rect?.height || 30, 30), viewportHeight)
    };
  }

  function snapToEdge(value, min, max) {
    if (Math.abs(value - min) <= PANEL_EDGE_SNAP) {
      return min;
    }

    if (Math.abs(value - max) <= PANEL_EDGE_SNAP) {
      return max;
    }

    return value;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function renderRestoreButton() {
    applyPanelPlacement();
    shadow.querySelector(".bf-app")?.remove();

    const app = document.createElement("div");
    app.className = "bf-app is-snoozed";
    app.innerHTML = `
      <button class="bf-restore" type="button" data-bf-action="restore" data-bf-drag-handle="true" title="${escapeAttribute(t("dragOrOpen"))}" aria-label="${escapeAttribute(t("dragOrOpen"))}">BF</button>
    `;

    shadow.append(app);
    applyPanelPlacement();
    bindShadowEvents(app);
  }

  function render() {
    const settings = appState.settings;
    const bookmarkBar = appState.bookmarkBar || { children: [] };
    const children = bookmarkBar.children || [];
    const hasFolderRail = settings.folderRail !== "off";
    const folders = hasFolderRail
      ? getRenderedFolderRailFolders(children)
      : children.filter((node) => !node.url);
    const visibleBookmarks = hasFolderRail ? children.filter((node) => node.url) : children;

    applyPanelPlacement();
    shadow.querySelector(".bf-app")?.remove();

    const app = document.createElement("div");
    app.className = [
      "bf-app",
      isExpanded ? "is-expanded" : "",
      settings.streamerMode ? "is-streamer-mode" : "",
      hasFolderRail ? "has-folder-rail" : "",
      hasFolderRail ? `folder-rail-${settings.folderRail}` : ""
    ].filter(Boolean).join(" ");
    app.innerHTML = `
      <div class="bf-shell ${settings.compact ? "is-compact" : ""}" style="--bf-rows: ${settings.rows}">
        <div class="bf-layout">
          <button class="bf-mark" type="button" data-bf-action="toggle-expanded" data-bf-drag-handle="true" title="${escapeAttribute(t("dragOrExpand"))}" aria-label="${escapeAttribute(t("dragOrExpand"))}">BF</button>
          <div class="bf-main">
            <label class="bf-search" ${settings.showSearch ? "" : "hidden"}>
              <input type="search" autocomplete="off" spellcheck="false" placeholder="${escapeAttribute(t("bookmarkSearchShortPlaceholder"))}" value="${escapeAttribute(searchQuery)}">
            </label>
            <div class="bf-grid" role="navigation" aria-label="${escapeAttribute(t("bookmarks"))}"></div>
          </div>
          <div class="bf-actions">
            <button class="bf-control" type="button" data-bf-action="add-bookmark" title="${escapeAttribute(t("addBookmark"))}" aria-label="${escapeAttribute(t("addBookmark"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
            <button class="bf-control" type="button" data-bf-action="open-search" title="${escapeAttribute(t("bookmarkSearch"))}" aria-label="${escapeAttribute(t("bookmarkSearch"))}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg></button>
            <button class="bf-control" type="button" data-bf-action="scroll-left" title="${escapeAttribute(t("scrollLeft"))}" aria-label="${escapeAttribute(t("scrollLeft"))}">&lsaquo;</button>
            <button class="bf-control" type="button" data-bf-action="scroll-right" title="${escapeAttribute(t("scrollRight"))}" aria-label="${escapeAttribute(t("scrollRight"))}">&rsaquo;</button>
            <button class="bf-control" type="button" data-bf-action="hide" title="${escapeAttribute(t("collapse"))}" aria-label="${escapeAttribute(t("collapse"))}">&times;</button>
          </div>
        </div>
      </div>
      <div class="bf-folder-rail" role="navigation" aria-label="${escapeAttribute(t("folders"))}" ${hasFolderRail ? "" : "hidden"}>
        <div class="bf-folder-rail-head">
          <span>${escapeHtml(t("folders"))}</span>
          <button class="bf-folder-rail-add" type="button" data-bf-action="create-folder" title="${escapeAttribute(t("addFolder"))}" aria-label="${escapeAttribute(t("addFolder"))}">+</button>
        </div>
        <div class="bf-folder-rail-list"></div>
      </div>
      <div class="bf-menu" hidden></div>
      <div class="bf-results" hidden></div>
      <div class="bf-context-menu" hidden></div>
      <div class="bf-add" hidden>
        <form class="bf-add-panel" role="dialog" aria-modal="true" aria-labelledby="bf-add-dialog-title" tabindex="-1">
          <div class="bf-add-head">
            <strong id="bf-add-dialog-title">${escapeHtml(t("addBookmark"))}</strong>
            <button class="bf-command-close" type="button" data-bf-action="close-add-bookmark" title="${escapeAttribute(t("close"))}" aria-label="${escapeAttribute(t("close"))}">×</button>
          </div>
          <label class="bf-add-field">
            <span>${escapeHtml(t("title"))}</span>
            <input class="bf-add-title" type="text" autocomplete="off" spellcheck="false">
          </label>
          <label class="bf-add-field">
            <span>${escapeHtml(t("address"))}</span>
            <input class="bf-add-url" type="text" autocomplete="off" spellcheck="false" placeholder="https://">
          </label>
          <p class="bf-add-status" aria-live="polite"></p>
          <div class="bf-add-actions">
            <button class="bf-add-secondary" type="button" data-bf-action="close-add-bookmark">${escapeHtml(t("cancel"))}</button>
            <button class="bf-add-primary" type="submit">${escapeHtml(t("add"))}</button>
          </div>
        </form>
      </div>
      <div class="bf-command" hidden>
        <div class="bf-command-panel" role="dialog" aria-modal="true" aria-label="${escapeAttribute(t("bookmarkSearch"))}" tabindex="-1">
          <div class="bf-command-head">
            <input class="bf-command-input" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-controls="bf-command-list" aria-expanded="false" aria-label="${escapeAttribute(t("bookmarkSearch"))}" placeholder="${escapeAttribute(t("bookmarkSearchPlaceholder"))}">
            <button class="bf-command-close" type="button" data-bf-action="close-search" title="${escapeAttribute(t("close"))}" aria-label="${escapeAttribute(t("close"))}">×</button>
          </div>
          <div class="bf-command-list" id="bf-command-list" role="listbox" aria-label="${escapeAttribute(t("bookmarkSearch"))}"></div>
        </div>
      </div>
    `;

    const grid = app.querySelector(".bf-grid");
    visibleBookmarks.forEach((node) => {
      const item = createTopLevelItem(node);
      if (item) {
        grid.append(item);
      }
    });

    if (!visibleBookmarks.length) {
      const empty = document.createElement("div");
      empty.className = "bf-empty";
      empty.textContent = hasFolderRail && folders.length
        ? t("directBookmarksEmpty")
        : t("bookmarkBarEmpty");
      grid.append(empty);
    }

    const railList = app.querySelector(".bf-folder-rail-list");
    folders.forEach((folder) => {
      railList?.append(createFolderRailItem(folder));
    });
    if (hasFolderRail && railList && !folders.length) {
      const empty = document.createElement("div");
      empty.className = "bf-empty";
      empty.textContent = t("noFolders");
      railList.append(empty);
    }

    shadow.append(app);
    applyPanelPlacement();
    bindShadowEvents(app);
    scheduleTightenBookmarkRows(app);
    renderSearchResults(app);
    renderCommandResults(app);
    restoreOpenFolder(app);
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

  function scheduleTightenBookmarkRows(app = shadow?.querySelector(".bf-app")) {
    requestAnimationFrame(() => {
      tightenBookmarkRows(app);
    });
  }

  function tightenBookmarkRows(app = shadow?.querySelector(".bf-app")) {
    const shell = app?.querySelector(".bf-shell");
    const grid = app?.querySelector(".bf-grid");

    if (!shell || !grid || !app.classList.contains("is-expanded")) {
      shell?.style.removeProperty("--bf-used-rows");
      return;
    }

    const settings = appState?.settings || {};
    const maxRows = clamp(Number(settings.rows) || 1, 1, 4);
    const usedRows = getNeededBookmarkRows(grid, ".bf-item", maxRows);
    shell.style.setProperty("--bf-used-rows", String(usedRows));
    applyPanelPlacement();
    updatePageOffsetSoon();
  }

  function getNeededBookmarkRows(grid, itemSelector, maxRows) {
    const rows = Math.max(1, Math.round(maxRows));
    if (rows <= 1) {
      return 1;
    }

    const items = Array.from(grid.querySelectorAll(itemSelector))
      .filter((item) => item.getBoundingClientRect().width > 0);
    return Math.max(1, Math.min(rows, items.length || 1));
  }

  function bindShadowEvents(app) {
    app.addEventListener("pointerdown", createSafeEventHandler(handleBookmarkPointerDown));
    app.addEventListener("pointerdown", createSafeEventHandler(handlePanelPointerDown));
    app.addEventListener("contextmenu", createSafeEventHandler(handleBookmarkContextMenu));
    app.addEventListener("dragstart", createSafeEventHandler(preventNativeBookmarkDrag));

    app.addEventListener("click", createSafeEventHandler((event) => {
      const targetElement = getEventTargetElement(event);
      if (!targetElement) {
        return;
      }

      if (suppressNextClick) {
        suppressNextClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (!targetElement.closest(".bf-context-menu")) {
        closeContextMenu();
      }

      if (targetElement.classList?.contains("bf-command")) {
        closeCommandPalette();
        return;
      }

      if (targetElement.classList?.contains("bf-add")) {
        closeAddBookmarkDialog();
        return;
      }

      const actionButton = targetElement.closest("[data-bf-action]");
      if (actionButton) {
        handleAction(actionButton.dataset.bfAction);
        return;
      }

      const folderButton = targetElement.closest("[data-folder-id]");
      if (folderButton) {
        event.preventDefault();
        toggleFolder(folderButton.dataset.folderId, folderButton).catch(() => {});
      }
    }));

    app.querySelector(".bf-search input")?.addEventListener("input", createSafeEventHandler((event) => {
      searchQuery = event.target.value.trim();
      renderSearchResults(app);
    }));

    const commandInput = app.querySelector(".bf-command-input");
    commandInput?.addEventListener("input", createSafeEventHandler((event) => {
      commandQuery = event.target.value.trim();
      commandActiveIndex = 0;
      renderCommandResults(app);
    }));
    commandInput?.addEventListener("keydown", createSafeEventHandler(handleCommandKeydown));

    app.querySelector(".bf-add-panel")?.addEventListener("submit", createSafeEventHandler(handleAddBookmarkSubmit));
  }

  function handleBookmarkPointerDown(event) {
    if (!hasExtensionContext()) {
      return;
    }

    const targetElement = getEventTargetElement(event);
    if (!targetElement) {
      return;
    }

    const item = targetElement.closest("[data-bf-reorder-item]");
    if (!item || event.button !== 0) {
      return;
    }

    const list = item.closest(".bf-grid, .bf-menu, .bf-folder-rail-list");
    if (!list) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    bookmarkDragState = {
      pointerId: event.pointerId,
      item,
      eventTarget: item,
      list,
      ghost: null,
      placeholder: null,
      scope: item.dataset.bfReorderScope || "top",
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

    if (!bindBookmarkDragListeners(item)) {
      bookmarkDragState = null;
    }
  }

  function handleBookmarkPointerMove(event, options = {}) {
    return runSafely(() => handleBookmarkPointerMoveCore(event, options));
  }

  function handleBookmarkPointerMoveCore(event, options = {}) {
    if (!hasExtensionContext()) {
      unbindBookmarkDragListeners(bookmarkDragState?.eventTarget);
      bookmarkDragState = null;
      return;
    }

    if (event.__bookmarkFlowDragHandled) {
      return;
    }
    event.__bookmarkFlowDragHandled = true;

    if (!isBookmarkDragEventForState(event, options)) {
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
      closeCommandPalette();
      closeContextMenu();
      closeAddBookmarkDialog();
      if (bookmarkDragState.scope === "top") {
        closeFolderMenu();
      }
    }

    positionBookmarkDragGhost(event.clientX, event.clientY);
    autoScrollBookmarkList(event.clientX, event.clientY);
    updateBookmarkDropTarget(event.clientX, event.clientY);
  }

  function finishBookmarkDrag(event, options = {}) {
    return runSafely(() => finishBookmarkDragCore(event, options));
  }

  function finishBookmarkDragCore(event, options = {}) {
    if (!isBookmarkDragEventForState(event, options)) {
      return;
    }

    const state = bookmarkDragState;
    state.item.classList.remove("is-bookmark-dragging");
    removeBookmarkDragGhost(state);
    removeBookmarkDropPlaceholder(state);
    try {
      state.item.releasePointerCapture?.(state.pointerId);
    } catch {}
    unbindBookmarkDragListeners(state.eventTarget);
    state.list?.classList.remove("is-bookmark-reordering");
    clearBookmarkDropTarget();

    if (state.moved) {
      event.preventDefault();
      suppressNextClick = true;
      window.setTimeout(() => {
        suppressNextClick = false;
      }, 250);

      if (state.targetId && state.targetId !== state.sourceId) {
        moveBookmark(state);
      }
    }

    bookmarkDragState = null;
  }

  function isBookmarkDragEventForState(event, options = {}) {
    if (!bookmarkDragState) {
      return false;
    }

    if (options.mouseFallback === true || String(event.type || "").startsWith("mouse")) {
      return true;
    }

    return event.pointerId === bookmarkDragState.pointerId;
  }

  function bindBookmarkDragListeners(item) {
    try {
      window.addEventListener("pointermove", handleSafeBookmarkPointerMove, { passive: false, capture: true });
      window.addEventListener("pointerup", handleSafeFinishBookmarkDrag, { passive: false, capture: true });
      window.addEventListener("pointercancel", handleSafeFinishBookmarkDrag, { passive: false, capture: true });
      window.addEventListener("mousemove", handleSafeBookmarkMouseMove, { passive: false, capture: true });
      window.addEventListener("mouseup", handleSafeFinishBookmarkMouseDrag, { passive: false, capture: true });
      document.addEventListener("pointermove", handleSafeBookmarkPointerMove, { passive: false, capture: true });
      document.addEventListener("pointerup", handleSafeFinishBookmarkDrag, { passive: false, capture: true });
      document.addEventListener("pointercancel", handleSafeFinishBookmarkDrag, { passive: false, capture: true });
      document.addEventListener("mousemove", handleSafeBookmarkMouseMove, { passive: false, capture: true });
      document.addEventListener("mouseup", handleSafeFinishBookmarkMouseDrag, { passive: false, capture: true });
      item.addEventListener("pointermove", handleSafeBookmarkPointerMove, { passive: false });
      item.addEventListener("pointerup", handleSafeFinishBookmarkDrag, { passive: false });
      item.addEventListener("pointercancel", handleSafeFinishBookmarkDrag, { passive: false });
      item.addEventListener("mousemove", handleSafeBookmarkMouseMove, { passive: false });
      item.addEventListener("mouseup", handleSafeFinishBookmarkMouseDrag, { passive: false });
      return true;
    } catch (error) {
      handleExtensionContextError(error);
      return false;
    }
  }

  function unbindBookmarkDragListeners(item) {
    try {
      window.removeEventListener("pointermove", handleSafeBookmarkPointerMove, true);
      window.removeEventListener("pointerup", handleSafeFinishBookmarkDrag, true);
      window.removeEventListener("pointercancel", handleSafeFinishBookmarkDrag, true);
      window.removeEventListener("mousemove", handleSafeBookmarkMouseMove, true);
      window.removeEventListener("mouseup", handleSafeFinishBookmarkMouseDrag, true);
      document.removeEventListener("pointermove", handleSafeBookmarkPointerMove, true);
      document.removeEventListener("pointerup", handleSafeFinishBookmarkDrag, true);
      document.removeEventListener("pointercancel", handleSafeFinishBookmarkDrag, true);
      document.removeEventListener("mousemove", handleSafeBookmarkMouseMove, true);
      document.removeEventListener("mouseup", handleSafeFinishBookmarkMouseDrag, true);
      item?.removeEventListener("pointermove", handleSafeBookmarkPointerMove);
      item?.removeEventListener("pointerup", handleSafeFinishBookmarkDrag);
      item?.removeEventListener("pointercancel", handleSafeFinishBookmarkDrag);
      item?.removeEventListener("mousemove", handleSafeBookmarkMouseMove);
      item?.removeEventListener("mouseup", handleSafeFinishBookmarkMouseDrag);
      window.removeEventListener("pointermove", handleBookmarkPointerMove, true);
      window.removeEventListener("pointerup", finishBookmarkDrag, true);
      window.removeEventListener("pointercancel", finishBookmarkDrag, true);
      document.removeEventListener("pointermove", handleBookmarkPointerMove, true);
      document.removeEventListener("pointerup", finishBookmarkDrag, true);
      document.removeEventListener("pointercancel", finishBookmarkDrag, true);
      item?.removeEventListener("pointermove", handleBookmarkPointerMove);
      item?.removeEventListener("pointerup", finishBookmarkDrag);
      item?.removeEventListener("pointercancel", finishBookmarkDrag);
    } catch (error) {
      handleExtensionContextError(error);
    }
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

    const element = shadow?.elementFromPoint?.(clientX, clientY);
    const target = element?.closest?.("[data-bf-reorder-item]");
    if (isValidDropTarget(target)) {
      return target;
    }

    const items = Array.from(list.querySelectorAll("[data-bf-reorder-item]"))
      .filter(isValidDropTarget);
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

    const items = Array.from(bookmarkDragState.list.querySelectorAll("[data-bf-reorder-item]"))
      .filter((item) => item.dataset.bfReorderScope === bookmarkDragState.scope)
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

    if (target === bookmarkDragState.item || target.closest(".bf-grid, .bf-menu, .bf-folder-rail-list") !== bookmarkDragState.list) {
      return false;
    }

    if (target.dataset.bfReorderScope !== bookmarkDragState.scope) {
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
    shadow?.querySelectorAll(".is-drop-before, .is-drop-after").forEach((item) => {
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
    placeholder.className = "bf-drag-placeholder";
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
    if (!bookmarkDragState || !shadow) {
      return;
    }

    removeBookmarkDragGhost(bookmarkDragState);

    const rect = item.getBoundingClientRect();
    const ghost = item.cloneNode(true);
    ghost.classList.remove("is-bookmark-dragging", "is-drop-before", "is-drop-after");
    ghost.classList.add("bf-drag-ghost");
    ghost.removeAttribute("href");
    ghost.removeAttribute("data-bf-reorder-item");
    ghost.removeAttribute("data-bf-reorder-scope");
    ghost.removeAttribute("data-bf-top-item");
    ghost.removeAttribute("data-node-id");
    ghost.removeAttribute("data-parent-id");
    ghost.removeAttribute("title");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    shadow.append(ghost);
    bookmarkDragState.ghost = ghost;
    positionBookmarkDragGhost(clientX, clientY);
  }

  function positionBookmarkDragGhost(clientX, clientY) {
    const ghost = bookmarkDragState?.ghost;
    if (!ghost) {
      return;
    }

    const x = clamp(clientX + BOOKMARK_GHOST_OFFSET, PANEL_MARGIN, Math.max(PANEL_MARGIN, window.innerWidth - ghost.offsetWidth - PANEL_MARGIN));
    const y = clamp(clientY + BOOKMARK_GHOST_OFFSET, PANEL_MARGIN, Math.max(PANEL_MARGIN, window.innerHeight - ghost.offsetHeight - PANEL_MARGIN));
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
    return Boolean(list?.classList?.contains("bf-menu") || list?.classList?.contains("bf-folder-rail-list"));
  }

  async function moveBookmark(state) {
    const message = state.scope === "folder"
      ? {
        type: MESSAGE_MOVE_BOOKMARK,
        sourceId: state.sourceId,
        targetId: state.targetId,
        parentId: state.sourceParentId,
        placement: state.placement
      }
      : {
        type: MESSAGE_MOVE_TOP_LEVEL,
        sourceId: state.sourceId,
        targetId: state.targetId,
        placement: state.placement
      };

    const response = await sendMessage(message);
    if (!response?.ok) {
      window.alert(response?.error || t("bookmarkMoveFailed"));
      return;
    }

    appState = response;
    renderFromState();
  }

  function preventNativeBookmarkDrag(event) {
    const targetElement = getEventTargetElement(event);
    if (targetElement?.closest("[data-bf-reorder-item]")) {
      event.preventDefault();
    }
  }

  function handlePanelPointerDown(event) {
    if (!hasExtensionContext()) {
      return;
    }

    const targetElement = getEventTargetElement(event);
    if (!targetElement) {
      return;
    }

    const explicitHandle = targetElement.closest("[data-bf-drag-handle]");
    const panelSurface = targetElement.closest(".bf-shell");
    const interactiveTarget = targetElement.closest("a, button, input, label");
    const handle = explicitHandle || (!interactiveTarget && panelSurface);
    if (!handle || event.button !== 0 || !host) {
      return;
    }

    const rect = host.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      handle,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false
    };

    try {
      handle.setPointerCapture?.(event.pointerId);
    } catch {}
    try {
      handle.classList.add("is-dragging");
      bindPanelDragListeners();
    } catch (error) {
      dragState = null;
      handleExtensionContextError(error);
    }
  }

  function handlePanelPointerMove(event) {
    if (!hasExtensionContext()) {
      unbindPanelDragListeners();
      dragState = null;
      return;
    }

    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    const distanceX = event.clientX - dragState.startX;
    const distanceY = event.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(distanceX, distanceY) < PANEL_DRAG_THRESHOLD) {
      return;
    }

    event.preventDefault();

    if (!dragState.moved) {
      dragState.moved = true;
      closeCommandPalette();
      closeFolderMenu();
      closeContextMenu();
      closeAddBookmarkDialog();
    }

    if (shouldUseExpandedPanelDock()) {
      const verticalPosition = clampPanelPosition({
        x: PANEL_MARGIN,
        y: event.clientY - dragState.offsetY
      }, { fullWidth: true });
      const storedPosition = clampPanelPosition({
        x: panelPosition?.x ?? PANEL_MARGIN,
        y: verticalPosition.y
      });
      panelPosition = {
        x: storedPosition.x,
        y: verticalPosition.y
      };
    } else {
      panelPosition = clampPanelPosition({
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY
      });
    }

    applyPanelPlacement();
    updatePageOffsetSoon();
  }

  function finishPanelDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    dragState.handle?.classList.remove("is-dragging");
    try {
      dragState.handle?.releasePointerCapture?.(dragState.pointerId);
    } catch {}
    unbindPanelDragListeners();

    if (dragState.moved) {
      event.preventDefault();
      if (shouldUseExpandedPanelDock()) {
        const verticalPosition = snapPanelPosition({
          x: PANEL_MARGIN,
          y: panelPosition?.y ?? PANEL_MARGIN
        }, { fullWidth: true });
        const storedPosition = clampPanelPosition({
          x: panelPosition?.x ?? PANEL_MARGIN,
          y: verticalPosition.y
        });
        panelPosition = {
          x: storedPosition.x,
          y: verticalPosition.y
        };
      } else {
        panelPosition = snapPanelPosition(panelPosition);
      }

      applyPanelPlacement();
      savePanelPosition();
      suppressNextClick = true;
      window.setTimeout(() => {
        suppressNextClick = false;
      }, 250);
    }

    dragState = null;
  }

  function bindPanelDragListeners() {
    try {
      window.addEventListener("pointermove", handleSafePanelPointerMove, { passive: false });
      window.addEventListener("pointerup", handleSafeFinishPanelDrag, { passive: false });
      window.addEventListener("pointercancel", handleSafeFinishPanelDrag, { passive: false });
    } catch (error) {
      handleExtensionContextError(error);
      throw error;
    }
  }

  function unbindPanelDragListeners() {
    try {
      window.removeEventListener("pointermove", handleSafePanelPointerMove);
      window.removeEventListener("pointerup", handleSafeFinishPanelDrag);
      window.removeEventListener("pointercancel", handleSafeFinishPanelDrag);
      window.removeEventListener("pointermove", handlePanelPointerMove);
      window.removeEventListener("pointerup", finishPanelDrag);
      window.removeEventListener("pointercancel", finishPanelDrag);
    } catch (error) {
      handleExtensionContextError(error);
    }
  }

  function savePanelPosition() {
    if (!panelPosition || !hasExtensionContext()) {
      return;
    }

    try {
      chrome.storage.local.set({
        [PANEL_POSITION_STORAGE_KEY]: {
          ...panelPosition,
          version: PANEL_POSITION_VERSION
        }
      }).catch((error) => {
        handleExtensionContextError(error);
      });
    } catch (error) {
      handleExtensionContextError(error);
    }
  }

  function handleAction(action) {
    const grid = shadow.querySelector(".bf-grid");

    if (action === "toggle-expanded") {
      const returnFocus = closeModalDialogsForRender();
      isExpanded = !isExpanded;
      closeFolderMenu();
      closeContextMenu();
      renderFromState();
      restoreFocusTarget(returnFocus);
      return;
    }

    if (action === "open-search") {
      closeContextMenu();
      closeAddBookmarkDialog();
      openCommandPalette();
      return;
    }

    if (action === "close-search") {
      closeCommandPalette();
      return;
    }

    if (action === "add-bookmark") {
      closeCommandPalette();
      closeContextMenu();
      openAddBookmarkDialog();
      closeFolderMenu();
      return;
    }

    if (action === "close-add-bookmark") {
      closeAddBookmarkDialog();
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
      deleteContextBookmark();
      return;
    }

    if (action === "rename-bookmark") {
      renameContextBookmark();
      return;
    }

    if (action === "add-bookmark-to-folder") {
      openAddBookmarkForContextFolder();
      return;
    }

    if (action === "create-folder") {
      createFolderFromPrompt("");
      return;
    }

    if (action === "create-child-folder") {
      createFolderFromPrompt(contextMenuState?.nodeId || "");
      return;
    }

    if (action.startsWith("set-folder-color:")) {
      setContextFolderColor(action.slice("set-folder-color:".length));
      return;
    }

    if (action === "clear-folder-color") {
      setContextFolderColor("");
      return;
    }

    if (action === "move-bookmark-previous") {
      moveContextBookmarkByStep(-1);
      return;
    }

    if (action === "move-bookmark-next") {
      moveContextBookmarkByStep(1);
      return;
    }

    if (action === "move-bookmark-first") {
      moveContextBookmarkToEdge("first");
      return;
    }

    if (action === "move-bookmark-last") {
      moveContextBookmarkToEdge("last");
      return;
    }

    if (action === "restore") {
      isSnoozed = false;
      isExpanded = false;
      renderFromState();
      return;
    }

    if (action === "scroll-left") {
      grid?.scrollBy({ left: -Math.max(260, window.innerWidth * 0.35), behavior: "smooth" });
    }

    if (action === "scroll-right") {
      grid?.scrollBy({ left: Math.max(260, window.innerWidth * 0.35), behavior: "smooth" });
    }

    if (action === "hide") {
      const returnFocus = closeModalDialogsForRender();
      isSnoozed = true;
      isExpanded = false;
      closeFolderMenu();
      closeContextMenu();
      renderFromState();
      restoreFocusTarget(returnFocus);
    }
  }

  function openContextBookmarkInNewTab() {
    const url = contextMenuState?.url;
    closeContextMenu();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
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
      type: MESSAGE_DELETE_BOOKMARK,
      nodeId: state.nodeId
    });
    if (response?.ok) {
      appState = response;
      renderFromState();
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
      type: MESSAGE_RENAME_BOOKMARK,
      nodeId: state.nodeId,
      title
    });

    if (response?.ok) {
      appState = response;
      renderFromState();
      return;
    }

    window.alert(response?.error || t("bookmarkRenameFailed"));
  }

  function openAddBookmarkForContextFolder() {
    const state = contextMenuState;
    if (!state?.isFolder || !state.nodeId) {
      return;
    }

    const returnFocusElement = shadow?.querySelector(`[data-node-id="${cssEscape(state.nodeId)}"]`) || null;
    activeFolderId = state.nodeId;
    closeContextMenu();
    openAddBookmarkDialog(returnFocusElement);
  }

  async function createFolderFromPrompt(parentId = "") {
    const title = window.prompt(parentId ? t("childFolderName") : t("newFolderName"), t("newFolderDefault"));
    if (title === null) {
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      window.alert(t("folderNameRequired"));
      return;
    }

    closeContextMenu();
    const response = await sendMessage({
      type: MESSAGE_CREATE_FOLDER,
      title: trimmedTitle,
      parentId
    });

    if (response?.ok) {
      appState = response;
      if (parentId) {
        activeFolderId = parentId;
      }
      renderFromState();
      return;
    }

    window.alert(response?.error || t("folderCreateFailed"));
  }

  async function setContextFolderColor(color) {
    const state = contextMenuState;
    if (!state?.isFolder || !state.nodeId) {
      return;
    }

    closeContextMenu();
    const response = await sendMessage({
      type: MESSAGE_SET_FOLDER_COLOR,
      nodeId: state.nodeId,
      color
    });

    if (response?.ok) {
      appState = response;
      renderFromState();
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
    if (!location) {
      closeContextMenu();
      return;
    }

    const target = location.siblings[location.index + direction];
    if (!target) {
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
    const isTopLevel = location.parent?.id === appState.bookmarkBar?.id;
    const response = await sendMessage(isTopLevel
      ? {
        type: MESSAGE_MOVE_TOP_LEVEL,
        sourceId: location.node.id,
        targetId: target.id,
        placement
      }
      : {
        type: MESSAGE_MOVE_BOOKMARK,
        sourceId: location.node.id,
        targetId: target.id,
        parentId: location.parent.id,
        placement
      });

    closeContextMenu();
    closeFolderMenu();

    if (response?.ok) {
      appState = response;
      renderFromState();
      return;
    }

    window.alert(response?.error || t("bookmarkMoveFailed"));
  }

  function openAddBookmarkDialog(returnFocusElement = getActiveDialogElement()) {
    const dialog = shadow?.querySelector(".bf-add");
    const titleInput = shadow?.querySelector(".bf-add-title");
    const urlInput = shadow?.querySelector(".bf-add-url");
    const status = shadow?.querySelector(".bf-add-status");
    const submit = shadow?.querySelector(".bf-add-primary");
    if (!dialog || !titleInput || !urlInput) {
      return;
    }

    const inheritedReturnFocus = isCommandPaletteOpen()
      ? closeCommandPalette({ restoreFocus: false })
      : null;
    if (dialog.hidden) {
      addDialogReturnFocus = inheritedReturnFocus || createFocusReturnTarget(returnFocusElement);
    }

    const suggestion = getSuggestedBookmarkData();
    resetAddDuplicateState(dialog, submit);
    dialog.dataset.parentId = suggestion.parentId || "";
    titleInput.value = suggestion.title;
    urlInput.value = suggestion.url;
    if (status) {
      status.textContent = suggestion.status || (suggestion.url ? "" : t("pageAddressUnavailable"));
      status.classList.remove("is-error", "is-success");
      status.classList.toggle("is-success", Boolean(suggestion.status));
    }

    dialog.hidden = false;
    updateModalBackgroundState();
    requestAnimationFrame(() => {
      (urlInput.value ? titleInput : urlInput).focus();
      (urlInput.value ? titleInput : urlInput).select();
    });
  }

  function closeAddBookmarkDialog({ restoreFocus = true } = {}) {
    const dialog = shadow?.querySelector(".bf-add");
    const submit = shadow?.querySelector(".bf-add-primary");
    const returnFocus = addDialogReturnFocus;
    addDialogReturnFocus = null;
    if (dialog) {
      resetAddDuplicateState(dialog, submit);
      dialog.hidden = true;
    }
    updateModalBackgroundState();
    if (restoreFocus) {
      restoreFocusTarget(returnFocus);
    }
    return returnFocus;
  }

  function getActiveDialogElement() {
    return shadow?.activeElement || document.activeElement;
  }

  function createFocusReturnTarget(element) {
    if (!element || typeof element.focus !== "function") {
      return null;
    }

    return {
      element,
      action: element.dataset?.bfAction || "",
      id: element.id || ""
    };
  }

  function restoreFocusTarget(target) {
    if (!target) {
      return;
    }

    let candidate = target.element?.isConnected ? target.element : null;
    if (!candidate && target.action) {
      candidate = shadow?.querySelector(`[data-bf-action="${cssEscape(target.action)}"]`) || null;
    }
    if (!candidate && target.action) {
      candidate = shadow?.querySelector(".bf-restore, .bf-mark") || null;
    }
    if (!candidate && target.id) {
      candidate = document.getElementById(target.id);
    }
    if (!candidate || typeof candidate.focus !== "function" || candidate.disabled) {
      return;
    }

    candidate.focus({ preventScroll: true });
  }

  function takeOpenModalReturnFocus() {
    const commandOpen = isCommandPaletteOpen();
    const addOpen = Boolean(shadow?.querySelector(".bf-add:not([hidden])"));
    const returnFocus = commandOpen
      ? commandDialogReturnFocus
      : (addOpen ? addDialogReturnFocus : null);
    if (commandOpen) {
      commandDialogReturnFocus = null;
    }
    if (addOpen) {
      addDialogReturnFocus = null;
    }
    return returnFocus;
  }

  function closeModalDialogsForRender() {
    const commandReturnFocus = closeCommandPalette({ restoreFocus: false });
    const addReturnFocus = closeAddBookmarkDialog({ restoreFocus: false });
    return addReturnFocus || commandReturnFocus;
  }

  function updateModalBackgroundState() {
    const app = shadow?.querySelector(".bf-app");
    if (!app) {
      return;
    }

    const activeModal = [
      app.querySelector(".bf-command"),
      app.querySelector(".bf-add")
    ].find((element) => element && !element.hidden) || null;

    Array.from(app.children).forEach((element) => {
      element.inert = Boolean(activeModal && element !== activeModal);
    });
  }

  function getFocusableElements(container) {
    return Array.from(container?.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) || []).filter((element) => element.tabIndex >= 0 && !element.hidden && element.getAttribute("aria-hidden") !== "true");
  }

  function trapFocusWithin(event, container, activeElement = getActiveDialogElement()) {
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

  async function handleAddBookmarkSubmit(event) {
    event.preventDefault();
    if (!event.isTrusted) {
      return;
    }

    const titleInput = shadow?.querySelector(".bf-add-title");
    const urlInput = shadow?.querySelector(".bf-add-url");
    const status = shadow?.querySelector(".bf-add-status");
    const submit = shadow?.querySelector(".bf-add-primary");
    const dialog = shadow?.querySelector(".bf-add");
    const title = titleInput?.value.trim() || "";
    const url = normalizeBookmarkInputUrl(urlInput?.value || "");
    const parentId = dialog?.dataset.parentId || "";
    const allowDuplicate = Boolean(dialog?.dataset.duplicateUrl && areBookmarkUrlsEqual(dialog.dataset.duplicateUrl, url) && (dialog.dataset.duplicateParentId || "") === parentId);

    if (!url || !isSafeBookmarkUrl(url)) {
      renderAddBookmarkStatus(t("validUrlRequired"), true);
      urlInput?.focus();
      return;
    }

    if (submit) {
      submit.disabled = true;
    }
    if (status) {
      status.textContent = t("adding");
      status.classList.remove("is-error", "is-success");
    }

    const response = await sendMessage({
      type: MESSAGE_CREATE_BOOKMARK,
      title,
      url,
      parentId,
      allowDuplicate
    });

    if (submit) {
      submit.disabled = false;
    }

    if (!response?.ok) {
      renderAddBookmarkStatus(response?.error || t("bookmarkAddFailed"), true);
      return;
    }

    appState = response;
    if (response.alreadyExists) {
      markAddDuplicateState(dialog, submit, url, parentId);
      return;
    }

    resetAddDuplicateState(dialog, submit);
    renderAddBookmarkStatus(parentId ? t("bookmarkAddedToFolder") : t("bookmarkAdded"), false);
    window.setTimeout(() => {
      const returnFocus = closeAddBookmarkDialog({ restoreFocus: false });
      renderFromState();
      restoreFocusTarget(returnFocus);
    }, 900);
  }

  function markAddDuplicateState(dialog, submit, url, parentId) {
    if (dialog) {
      dialog.dataset.duplicateUrl = url;
      dialog.dataset.duplicateParentId = parentId || "";
    }
    if (submit) {
      submit.textContent = t("addAnyway");
    }
    renderAddBookmarkStatus(t("duplicateBookmarkPrompt"), false);
  }

  function resetAddDuplicateState(dialog, submit) {
    if (dialog) {
      delete dialog.dataset.duplicateUrl;
      delete dialog.dataset.duplicateParentId;
    }
    if (submit) {
      submit.textContent = t("add");
    }
  }

  function renderAddBookmarkStatus(message, isError) {
    const status = shadow?.querySelector(".bf-add-status");
    if (!status) {
      return;
    }

    status.textContent = message;
    status.classList.toggle("is-error", Boolean(isError));
    status.classList.toggle("is-success", !isError);
  }

  function getSuggestedBookmarkData() {
    const url = isSafeBookmarkUrl(window.location.href) ? window.location.href : "";
    const folder = activeFolderId ? findNodeById(getBookmarkTreeRoot(), activeFolderId) : null;
    return {
      title: document.title || (url ? getHostname(url) : ""),
      url,
      parentId: folder && !folder.url ? folder.id : "",
      status: folder && !folder.url ? t("willAddToFolder", folder.title || t("folder")) : ""
    };
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

  function createTopLevelItem(node) {
    if (node.url) {
      if (!isSafeBookmarkUrl(node.url)) {
        return null;
      }

      const link = createBookmarkLink(node, "bf-item");
      markTopLevelItem(link, node.id);
      return link;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "bf-item is-folder";
    button.dataset.folderId = node.id;
    markTopLevelItem(button, node.id);
    button.title = node.title || t("folder");
    applyFolderColor(button, node.id);
    button.append(createFolderIcon(), createTitle(node.title || t("folder")));
    return button;
  }

  function createFolderRailItem(node) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bf-folder-rail-item";
    button.dataset.folderId = node.id;
    button.dataset.nodeId = node.id;
    button.draggable = false;
    if (node.parentId === appState?.bookmarkBar?.id) {
      markTopLevelItem(button, node.id);
    }
    button.title = node.title || t("folder");
    button.classList.toggle("is-active", activeFolderId === node.id);
    applyFolderColor(button, node.id);
    button.append(createFolderIcon(), createTitle(node.title || t("folder")));
    return button;
  }

  function markTopLevelItem(element, nodeId) {
    element.dataset.bfReorderItem = "true";
    element.dataset.bfReorderScope = "top";
    element.dataset.bfTopItem = "true";
    element.dataset.nodeId = nodeId;
    element.draggable = false;
  }

  function markFolderMenuItem(element, entry) {
    element.dataset.bfReorderItem = "true";
    element.dataset.bfReorderScope = "folder";
    element.dataset.nodeId = entry.id;
    element.dataset.parentId = entry.parentId || "";
    element.draggable = false;
  }

  function createBookmarkLink(node, className) {
    const link = document.createElement("a");
    link.className = className;
    link.href = node.url;
    link.rel = "noreferrer";
    link.referrerPolicy = "no-referrer";
    link.title = `${node.title || getHostname(node.url)}\n${node.url}`;

    const favicon = document.createElement("img");
    favicon.className = "bf-favicon";
    favicon.alt = "";
    favicon.loading = "lazy";
    favicon.src = faviconUrl(node.url);

    link.append(favicon, createTitle(node.title || getHostname(node.url)));
    return link;
  }

  function createTitle(text) {
    const title = document.createElement("span");
    title.className = "bf-title";
    title.textContent = text;
    return title;
  }

  function createFolderIcon() {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "bf-folder-icon");
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

    element.style.setProperty("--bf-folder-accent", color);
    element.style.setProperty("--bf-folder-bg", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`);
    element.style.setProperty("--bf-folder-bg-hover", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24)`);
    element.style.setProperty("--bf-folder-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.58)`);
    element.style.setProperty("--bf-folder-text", "#f8fbff");
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

  async function toggleFolder(folderId, anchor) {
    if (activeFolderId === folderId) {
      closeFolderMenu();
      return;
    }

    activeFolderId = folderId;
    const response = await sendMessage({ type: MESSAGE_GET_STATE });
    if (response?.ok) {
      appState = response;
      renderFromState();
      return;
    }

    openFolderMenu(folderId, anchor);
  }

  function restoreOpenFolder(app) {
    if (!activeFolderId) {
      return;
    }

    const anchor = app.querySelector(`.bf-folder-rail [data-folder-id="${cssEscape(activeFolderId)}"], .bf-grid [data-folder-id="${cssEscape(activeFolderId)}"]`);
    if (anchor) {
      openFolderMenu(activeFolderId, anchor);
    } else {
      activeFolderId = "";
    }
  }

  function openFolderMenu(folderId, anchor) {
    const menu = shadow.querySelector(".bf-menu");
    const folder = findNodeById(getBookmarkTreeRoot(), folderId);
    if (!menu || !folder) {
      return;
    }

    const entries = getFolderMenuEntries(folder);
    menu.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "bf-empty";
      empty.textContent = t("noBookmarksInFolder");
      menu.append(empty);
    } else {
      entries.slice(0, 120).forEach((entry) => {
        menu.append(createFolderMenuLink(entry));
      });
    }

    const anchorRect = anchor.getBoundingClientRect();
    const appRect = shadow?.querySelector(".bf-app")?.getBoundingClientRect() || host?.getBoundingClientRect() || { left: 0, top: 0, bottom: 0 };
    const isRailAnchor = Boolean(anchor.closest(".bf-folder-rail"));
    const railOnRight = Boolean(anchor.closest(".folder-rail-right"));
    const railRect = isRailAnchor ? shadow?.querySelector(".bf-folder-rail")?.getBoundingClientRect() : null;
    const menuWidth = Math.min(420, window.innerWidth - 20);
    const left = isRailAnchor
      ? railOnRight
        ? clamp((railRect?.left ?? anchorRect.left) - menuWidth - FOLDER_MENU_GAP, 8, Math.max(8, window.innerWidth - menuWidth - 8))
        : clamp((railRect?.right ?? anchorRect.right) + FOLDER_MENU_GAP, 8, Math.max(8, window.innerWidth - menuWidth - 8))
      : Math.max(10, Math.min(anchorRect.left, window.innerWidth - menuWidth - 10));
    const top = isRailAnchor
      ? clamp(anchorRect.top, 8, Math.max(8, window.innerHeight - 120))
      : appRect.bottom + 10;
    menu.style.left = `${left - appRect.left}px`;
    if (!isRailAnchor && host?.classList.contains("bf-bottom")) {
      menu.style.top = "auto";
      menu.style.bottom = "calc(100% + 10px)";
    } else {
      menu.style.top = `${top - appRect.top}px`;
      menu.style.bottom = "auto";
    }
    menu.hidden = false;
    updateFolderRailSelection();
  }

  function closeFolderMenu() {
    activeFolderId = "";
    const menu = shadow?.querySelector(".bf-menu");
    if (menu) {
      menu.hidden = true;
      menu.replaceChildren();
    }
    updateFolderRailSelection();
  }

  function updateFolderRailSelection() {
    shadow?.querySelectorAll(".bf-folder-rail-item").forEach((item) => {
      item.classList.toggle("is-active", item.dataset.folderId === activeFolderId);
    });
  }

  function handleBookmarkContextMenu(event) {
    const targetElement = getEventTargetElement(event);
    if (!targetElement) {
      return;
    }

    const item = targetElement.closest("[data-node-id]");
    if (!item || item.closest(".bf-context-menu, .bf-command, .bf-control, .bf-search")) {
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
    const menu = shadow?.querySelector(".bf-context-menu");
    if (!menu) {
      return;
    }

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

    menu.replaceChildren();
    if (node.url) {
      menu.append(
        createContextMenuButton("open-bookmark-tab", t("openInNewTab")),
        createContextMenuButton("copy-bookmark-url", t("copyAddress")),
        createContextMenuButton("rename-bookmark", t("renameBookmark"))
      );
    } else {
      menu.append(
        createContextMenuButton("add-bookmark-to-folder", t("addBookmarkToFolder")),
        createContextMenuButton("create-child-folder", t("createChildFolder")),
        createContextMenuButton("rename-bookmark", t("renameFolder")),
        createFolderColorPicker(node.id)
      );
    }
    if (location?.siblings.length > 1) {
      menu.append(
        createContextMenuSeparator(),
        createContextMenuButton("move-bookmark-previous", t("movePrevious"), "", !canMovePrevious),
        createContextMenuButton("move-bookmark-next", t("moveNext"), "", !canMoveNext),
        createContextMenuButton("move-bookmark-first", t("moveFirst"), "", !canMovePrevious),
        createContextMenuButton("move-bookmark-last", t("moveLast"), "", !canMoveNext)
      );
    }
    menu.append(
      createContextMenuSeparator(),
      createContextMenuButton("delete-bookmark", isFolder ? t("deleteFolder") : t("deleteBookmark"), "is-danger")
    );

    menu.style.left = `${clientX}px`;
    menu.style.top = `${clientY}px`;
    menu.hidden = false;

    const left = clamp(clientX, 8, Math.max(8, window.innerWidth - menu.offsetWidth - 8));
    const top = clamp(clientY, 8, Math.max(8, window.innerHeight - menu.offsetHeight - 8));
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function createContextMenuButton(action, label, className = "", disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = ["bf-context-action", className].filter(Boolean).join(" ");
    button.dataset.bfAction = action;
    button.textContent = label;
    button.disabled = disabled;
    return button;
  }

  function createContextMenuSeparator() {
    const separator = document.createElement("div");
    separator.className = "bf-context-separator";
    separator.setAttribute("role", "separator");
    return separator;
  }

  function createFolderColorPicker(nodeId) {
    const currentColor = getFolderColor(nodeId);
    const section = document.createElement("div");
    section.className = "bf-context-colors";

    const label = document.createElement("span");
    label.className = "bf-context-colors-label";
    label.textContent = t("color");
    section.append(label);

    const swatches = document.createElement("div");
    swatches.className = "bf-context-swatches";

    FOLDER_COLOR_PRESETS.forEach((preset) => {
      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "bf-context-swatch";
      swatch.dataset.bfAction = `set-folder-color:${preset.value}`;
      swatch.style.setProperty("--bf-swatch-color", preset.value);
      swatch.title = preset.label;
      swatch.setAttribute("aria-label", t("folderColorAria", preset.label));
      swatch.classList.toggle("is-selected", currentColor === preset.value);
      swatches.append(swatch);
    });

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "bf-context-swatch is-clear";
    clear.dataset.bfAction = "clear-folder-color";
    clear.title = t("clearColor");
    clear.setAttribute("aria-label", t("clearColor"));
    clear.classList.toggle("is-selected", !currentColor);
    swatches.append(clear);

    section.append(swatches);
    return section;
  }

  function closeContextMenu() {
    contextMenuState = null;
    const menu = shadow?.querySelector(".bf-context-menu");
    if (menu) {
      menu.hidden = true;
      menu.replaceChildren();
    }
  }

  function isContextMenuOpen() {
    const menu = shadow?.querySelector(".bf-context-menu");
    return Boolean(menu && !menu.hidden);
  }

  function renderSearchResults(app) {
    const panel = app.querySelector(".bf-results");
    if (!panel) {
      return;
    }

    panel.replaceChildren();

    if (!searchQuery) {
      panel.hidden = true;
      return;
    }

    const query = normalizeText(searchQuery);
    const entries = getAllBookmarkEntries()
      .filter((entry) => {
        return matchesBookmarkSearch(entry, query);
      })
      .slice(0, 80);

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "bf-empty";
      empty.textContent = t("noResults");
      panel.append(empty);
    } else {
      entries.forEach((entry) => panel.append(createResultLink(entry)));
    }

    panel.hidden = false;
  }

  function openCommandPalette() {
    const command = shadow?.querySelector(".bf-command");
    const input = shadow?.querySelector(".bf-command-input");
    if (!command || !input) {
      return;
    }

    const addOpen = Boolean(shadow?.querySelector(".bf-add:not([hidden])"));
    const inheritedReturnFocus = addOpen
      ? closeAddBookmarkDialog({ restoreFocus: false })
      : null;
    if (command.hidden) {
      commandDialogReturnFocus = inheritedReturnFocus || createFocusReturnTarget(getActiveDialogElement());
    }

    command.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.value = commandQuery;
    commandActiveIndex = 0;
    renderCommandResults(shadow.querySelector(".bf-app"));
    updateModalBackgroundState();
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function isCommandPaletteOpen() {
    const command = shadow?.querySelector(".bf-command");
    return Boolean(command && !command.hidden);
  }

  function closeCommandPalette({ restoreFocus = true } = {}) {
    const command = shadow?.querySelector(".bf-command");
    const input = shadow?.querySelector(".bf-command-input");
    const returnFocus = commandDialogReturnFocus;
    commandDialogReturnFocus = null;
    if (command) {
      command.hidden = true;
    }
    input?.setAttribute("aria-expanded", "false");
    input?.removeAttribute("aria-activedescendant");
    updateModalBackgroundState();
    if (restoreFocus) {
      restoreFocusTarget(returnFocus);
    }
    return returnFocus;
  }

  function renderCommandResults(app) {
    const list = app?.querySelector(".bf-command-list");
    if (!list) {
      return;
    }

    list.replaceChildren();

    const query = normalizeText(commandQuery);
    if (!query && shouldHideEmptyCommandSuggestions()) {
      commandActiveIndex = -1;
      app?.querySelector(".bf-command-input")?.removeAttribute("aria-activedescendant");
      const empty = document.createElement("div");
      empty.className = "bf-command-empty";
      empty.textContent = t("searchEmptyPrivacy");
      list.append(empty);
      return;
    }

    const entries = getAllBookmarkEntries()
      .filter((entry) => {
        if (!query) {
          return true;
        }

        return matchesBookmarkSearch(entry, query);
      })
      .slice(0, query ? 40 : 14);

    if (!entries.length) {
      commandActiveIndex = -1;
      app?.querySelector(".bf-command-input")?.removeAttribute("aria-activedescendant");
      const empty = document.createElement("div");
      empty.className = "bf-command-empty";
      empty.textContent = t("noResults");
      list.append(empty);
      return;
    }

    commandActiveIndex = clamp(commandActiveIndex, 0, entries.length - 1);
    entries.forEach((entry, index) => {
      list.append(createCommandLink(entry, index));
    });
    syncActiveCommandItem(list, { scroll: false });
  }

  function shouldHideEmptyCommandSuggestions() {
    const settings = appState?.settings || {};
    return Boolean(settings.streamerMode || settings.hideEmptySearchSuggestions);
  }

  function createCommandLink(entry, index) {
    const link = createResultLink(entry);
    link.classList.add("bf-command-item");
    link.id = `bf-command-option-${index}`;
    link.dataset.commandIndex = String(index);
    link.tabIndex = -1;
    link.setAttribute("role", "option");
    link.setAttribute("aria-selected", index === commandActiveIndex ? "true" : "false");
    if (index === commandActiveIndex) {
      link.classList.add("is-command-active");
    }
    return link;
  }

  function createFolderMenuLink(entry) {
    const link = createResultLink(entry);
    markFolderMenuItem(link, entry);
    return link;
  }

  function handleCommandKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCommandPalette();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCommandSelection(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCommandSelection(-1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveCommandIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveCommandIndex(getCommandItems().length - 1);
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    const activeLink = getActiveCommandItem();
    if (!activeLink) {
      return;
    }

    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      window.open(activeLink.href, "_blank");
    } else {
      activeLink.click();
    }
  }

  function moveCommandSelection(direction) {
    const items = getCommandItems();
    if (!items.length) {
      commandActiveIndex = -1;
      return;
    }

    const startIndex = commandActiveIndex < 0 ? 0 : commandActiveIndex;
    const nextIndex = (startIndex + direction + items.length) % items.length;
    setActiveCommandIndex(nextIndex);
  }

  function setActiveCommandIndex(index, options = {}) {
    const items = getCommandItems();
    if (!items.length) {
      commandActiveIndex = -1;
      return;
    }

    commandActiveIndex = clamp(index, 0, items.length - 1);
    syncActiveCommandItem(shadow?.querySelector(".bf-command-list"), {
      scroll: options.scroll !== false
    });
  }

  function syncActiveCommandItem(list, options = {}) {
    const items = Array.from(list?.querySelectorAll(".bf-command-item") || []);
    let activeItem = null;
    items.forEach((item, index) => {
      const isActive = index === commandActiveIndex;
      item.classList.toggle("is-command-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive) {
        activeItem = item;
      }
      if (isActive && options.scroll !== false) {
        item.scrollIntoView({ block: "nearest" });
      }
    });

    const input = shadow?.querySelector(".bf-command-input");
    if (input && activeItem && isCommandPaletteOpen()) {
      input.setAttribute("aria-activedescendant", activeItem.id);
    } else {
      input?.removeAttribute("aria-activedescendant");
    }
  }

  function getCommandItems() {
    return Array.from(shadow?.querySelectorAll(".bf-command-list .bf-command-item") || []);
  }

  function getActiveCommandItem() {
    const items = getCommandItems();
    if (!items.length) {
      return null;
    }

    return items[clamp(commandActiveIndex, 0, items.length - 1)] || items[0];
  }

  function createResultLink(entry) {
    const link = document.createElement("a");
    link.className = "bf-result";
    link.dataset.nodeId = entry.id;
    link.href = entry.url;
    link.rel = "noreferrer";
    link.referrerPolicy = "no-referrer";
    link.title = `${entry.title}\n${entry.url}`;

    const favicon = document.createElement("img");
    favicon.className = "bf-favicon";
    favicon.alt = "";
    favicon.loading = "lazy";
    favicon.src = faviconUrl(entry.url);

    const copy = document.createElement("span");
    copy.className = "bf-result-copy";

    const title = document.createElement("span");
    title.className = "bf-result-title";
    title.textContent = entry.title || getHostname(entry.url);

    const path = document.createElement("span");
    path.className = "bf-result-path";
    path.textContent = entry.path || getHostname(entry.url);

    copy.append(title, path);
    link.append(favicon, copy);
    return link;
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

  function getAllBookmarkEntries() {
    const root = getBookmarkTreeRoot();
    return dedupeBookmarkEntries(flattenBookmarks(root?.children || [], "", root?.id || ""));
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

  function findNodeLocation(root, nodeId, parent = null) {
    if (!root) {
      return null;
    }

    const children = root.children || [];
    const index = children.findIndex((child) => child.id === nodeId);
    if (index >= 0) {
      return {
        node: children[index],
        parent: root,
        index,
        siblings: children
      };
    }

    for (const child of children) {
      const found = findNodeLocation(child, nodeId, root);
      if (found) {
        return found;
      }
    }

    return parent && root.id === nodeId
      ? {
        node: root,
        parent,
        index: (parent.children || []).findIndex((child) => child.id === nodeId),
        siblings: parent.children || []
      }
      : null;
  }

  function faviconUrl(pageUrl) {
    const faviconBaseUrl = getRuntimeUrl("/_favicon/");
    if (!faviconBaseUrl) {
      return "";
    }

    const url = new URL(faviconBaseUrl);
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

  function normalizeText(value) {
    return String(value || "").toLocaleLowerCase(getTextLocale());
  }

  function getTextLocale() {
    return getLanguage() === "tr" ? "tr-TR" : "en-US";
  }

  function matchesBookmarkSearch(entry, query) {
    const haystack = normalizeText(`${entry.title} ${entry.url} ${entry.path} ${getHostname(entry.url)}`);
    return haystack.includes(query) || matchesCurrentPageTitle(entry, query);
  }

  function matchesCurrentPageTitle(entry, query) {
    if (!query || !entry?.url || !isSafeBookmarkUrl(window.location.href) || !areBookmarkUrlsEqual(entry.url, window.location.href)) {
      return false;
    }

    const currentPageText = normalizeText(`${document.title} ${window.location.href} ${getHostname(window.location.href)}`);
    return currentPageText.includes(query);
  }

  function shouldRenderBar() {
    const settings = appState?.settings;
    const currentHost = getCurrentHost();

    if (!settings?.enabled || !settings.showOnSites) {
      return false;
    }

    if (isHostDisabled(settings.disabledHosts, currentHost)) {
      return false;
    }

    return !(settings.autoHideSensitiveSites && isSensitiveHost(currentHost));
  }

  function getPageInfo() {
    const hostName = getCurrentHost();
    const settings = appState?.settings || {};
    const renderedApp = shadow?.querySelector(".bf-app");
    const command = shadow?.querySelector(".bf-command");
    const folderMenu = shadow?.querySelector(".bf-menu");
    const folderRail = shadow?.querySelector(".bf-folder-rail");
    const contextMenu = shadow?.querySelector(".bf-context-menu");
    const commandResults = shadow?.querySelectorAll(".bf-command-item")?.length || 0;
    const renderedAppBounds = getVisibleElementBounds(renderedApp);
    const renderedAppVisible = Boolean(
      renderedAppBounds
      && renderedAppBounds.width > 0
      && renderedAppBounds.height > 0
    );
    const renderedFolderRail = Boolean(
      folderRail
      && !folderRail.hidden
      && renderedApp?.classList.contains("is-expanded")
      && window.getComputedStyle(folderRail).display !== "none"
    );

    return {
      ok: true,
      canControlSite: Boolean(hostName) && /^https?:$/.test(window.location.protocol),
      host: hostName,
      disabledByUser: isHostDisabled(settings.disabledHosts, hostName),
      sensitiveHost: isSensitiveHost(hostName),
      hiddenOnSites: settings.showOnSites === false,
      autoHiddenSensitive: Boolean(settings.autoHideSensitiveSites && isSensitiveHost(hostName)),
      dockedBottom: shouldUseBottomDock(),
      expanded: isExpanded,
      renderedAppExpanded: Boolean(renderedApp?.classList.contains("is-expanded")),
      renderedAppVisible,
      renderedAppBounds,
      searchOpen: Boolean(command && !command.hidden),
      commandResults,
      commandActiveIndex,
      commandBounds: getVisibleElementBounds(command),
      folderMenuOpen: Boolean(folderMenu && !folderMenu.hidden),
      folderMenuBounds: getVisibleElementBounds(folderMenu),
      contextMenuOpen: isContextMenuOpen(),
      contextMenuBounds: getVisibleElementBounds(contextMenu),
      streamerMode: Boolean(settings.streamerMode),
      folderRail: settings.folderRail || "off",
      renderedFolderRail,
      renderedFolderRailItems: renderedFolderRail
        ? shadow?.querySelectorAll(".bf-folder-rail-item")?.length || 0
        : 0,
      renderedFolderRailBounds: renderedFolderRail ? getVisibleElementBounds(folderRail) : null,
      renderedStreamerMode: Boolean(renderedApp?.classList.contains("is-streamer-mode"))
    };
  }

  function getVisibleElementBounds(element) {
    if (!element || element.hidden) return null;
    const computedStyle = window.getComputedStyle(element);
    if (
      computedStyle.display === "none"
      || computedStyle.visibility === "hidden"
      || computedStyle.visibility === "collapse"
      || Number(computedStyle.opacity) === 0
    ) return null;
    const bounds = element.getBoundingClientRect();
    return {
      left: Math.round(bounds.left * 100) / 100,
      top: Math.round(bounds.top * 100) / 100,
      right: Math.round(bounds.right * 100) / 100,
      bottom: Math.round(bounds.bottom * 100) / 100,
      width: Math.round(bounds.width * 100) / 100,
      height: Math.round(bounds.height * 100) / 100
    };
  }

  function getCurrentHost() {
    return normalizeHost(window.location.hostname);
  }

  function shouldUseBottomDock() {
    if (shouldUseExpandedPanelBottomDock()) {
      return true;
    }

    if (!appState?.settings?.avoidAppTopBars) {
      return false;
    }

    if (isAdminLikePage()) {
      return true;
    }

    return shouldDockExpandedAwayFromTop();
  }

  function shouldDockExpandedAwayFromTop() {
    if (!isExpanded || isSnoozed || !hasLikelyFixedTopSurface()) {
      return false;
    }

    if (!panelPosition) {
      return true;
    }

    return panelPosition.y <= getTopFloatingOffsetLimit();
  }

  function hasLikelyFixedTopSurface() {
    const now = Date.now();
    if (now - topSurfaceCache.checkedAt < TOP_SURFACE_CACHE_MS) {
      return topSurfaceCache.value;
    }

    const value = detectLikelyFixedTopSurface();
    topSurfaceCache = {
      checkedAt: now,
      value
    };
    return value;
  }

  function invalidateTopSurfaceCache() {
    topSurfaceCache.checkedAt = 0;
  }

  function detectLikelyFixedTopSurface() {
    const nodes = Array.from(document.body?.querySelectorAll("*") || []);
    const max = Math.min(nodes.length, TOP_SURFACE_SCAN_LIMIT);

    for (let index = 0; index < max; index += 1) {
      const node = nodes[index];
      if (!(node instanceof Element) || node === host || host?.contains(node)) {
        continue;
      }

      const rect = node.getBoundingClientRect();
      if (
        rect.width < TOP_SURFACE_MIN_WIDTH ||
        rect.bottom < TOP_SURFACE_MIN_BOTTOM ||
        rect.top > TOP_SURFACE_MAX_TOP ||
        rect.right <= 0 ||
        rect.left >= window.innerWidth
      ) {
        continue;
      }

      const style = window.getComputedStyle(node);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      ) {
        continue;
      }

      if (style.position === "fixed" || style.position === "sticky") {
        return true;
      }
    }

    return false;
  }

  function isAdminLikePage() {
    const path = window.location.pathname.toLocaleLowerCase("en-US");

    return (
      path.includes("/wp-admin/") ||
      path.endsWith("/wp-login.php") ||
      document.body?.classList.contains("wp-admin") ||
      document.body?.classList.contains("block-editor-page")
    );
  }

  function escapeAttribute(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeHtml(value) {
    return escapeAttribute(value);
  }

  function cssEscape(value) {
    if (window.CSS?.escape) {
      return window.CSS.escape(value);
    }

    return String(value).replace(/"/g, '\\"');
  }

  function handleDocumentKeydown(event) {
    const commandPanel = isCommandPaletteOpen()
      ? shadow?.querySelector(".bf-command-panel")
      : null;
    const addPanel = shadow?.querySelector(".bf-add:not([hidden]) .bf-add-panel");
    const activeModalPanel = commandPanel || addPanel;
    if (event.key === "Tab" && activeModalPanel) {
      event.stopPropagation();
      trapFocusWithin(event, activeModalPanel);
      return;
    }

    if (event.key === "Escape") {
      if (commandPanel) {
        event.preventDefault();
        event.stopPropagation();
        closeCommandPalette();
        return;
      }
      if (addPanel) {
        event.preventDefault();
        event.stopPropagation();
        closeAddBookmarkDialog();
        return;
      }

      closeCommandPalette();
      closeFolderMenu();
      closeContextMenu();
      closeAddBookmarkDialog();
      const panel = shadow?.querySelector(".bf-results");
      if (panel) {
        panel.hidden = true;
      }
    }
  }

  function injectPageStyle() {
    if (document.getElementById(GLOBAL_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = GLOBAL_STYLE_ID;
    style.textContent = `
      html.${PAGE_OFFSET_CLASS} {
        scroll-padding-top: var(${PAGE_OFFSET_VAR}, 0px) !important;
      }

      html.${PAGE_OFFSET_CLASS} body {
        padding-top: calc(var(${PAGE_OFFSET_BASE_VAR}, 0px) + var(${PAGE_OFFSET_VAR}, 0px)) !important;
      }
    `;
    document.documentElement.append(style);
  }

  function updatePageOffsetSoon() {
    requestAnimationFrame(updatePageOffset);
  }

  function updatePageOffset() {
    const settings = appState?.settings;
    const expandedCustomTopDock = Boolean(panelPosition && shouldUseExpandedPanelDock() && !shouldUseBottomDock());

    if (!settings?.enabled || !settings.offsetPage || !host?.isConnected || shouldUseBottomDock() || isSnoozed || !isExpanded || (panelPosition && !expandedCustomTopDock && !shouldOffsetFloatingPanel())) {
      clearPageOffset();
      return;
    }

    const rect = host.getBoundingClientRect();
    const offset = panelPosition
      ? Math.ceil(Math.max(rect.height, rect.bottom))
      : Math.ceil(rect.height);
    applyPageOffset(offset);
  }

  function applyPageOffset(offset) {
    const root = document.documentElement;
    if (!root.classList.contains(PAGE_OFFSET_CLASS)) {
      const basePadding = document.body ? window.getComputedStyle(document.body).paddingTop : "0px";
      root.style.setProperty(PAGE_OFFSET_BASE_VAR, basePadding || "0px");
    }

    root.style.setProperty(PAGE_OFFSET_VAR, `${offset}px`);
    root.classList.add(PAGE_OFFSET_CLASS);
  }

  function clearPageOffset() {
    document.documentElement.classList.remove(PAGE_OFFSET_CLASS);
    document.documentElement.style.removeProperty(PAGE_OFFSET_VAR);
    document.documentElement.style.removeProperty(PAGE_OFFSET_BASE_VAR);
  }

  function teardown() {
    if (bookmarkDragState) {
      bookmarkDragState.item?.classList.remove("is-bookmark-dragging");
      removeBookmarkDragGhost(bookmarkDragState);
      removeBookmarkDropPlaceholder(bookmarkDragState);
      unbindBookmarkDragListeners(bookmarkDragState.eventTarget);
      clearBookmarkDropTarget();
      bookmarkDragState = null;
    }

    if (dragState) {
      dragState.handle?.classList.remove("is-dragging");
      unbindPanelDragListeners();
      dragState = null;
    }

    resizeObserver?.disconnect();
    resizeObserver = null;
    closeFolderMenu();
    closeContextMenu();
    closeCommandPalette({ restoreFocus: false });
    closeAddBookmarkDialog({ restoreFocus: false });
    host?.remove();
    host = null;
    shadow = null;
    stylesReady = false;
    clearPageOffset();
    document.getElementById(GLOBAL_STYLE_ID)?.remove();
  }
})();
