const {
  DEFAULT_SETTINGS,
  LOCAL_SETTINGS_DEFAULTS,
  PANEL_POSITION_STORAGE_KEY,
  SYNC_DEFAULT_SETTINGS,
  addDisabledHost,
  isHostDisabled,
  normalizeSettings,
  removeDisabledHost
} = BookmarkFlowConfig;
const { t } = BookmarkFlowI18n;

const SHORTCUT_NUDGE_STORAGE_KEY = "bfShortcutNudgeSeen";

const controls = {
  enabled: document.getElementById("enabled"),
  showOnSites: document.getElementById("showOnSites"),
  compact: document.getElementById("compact"),
  offsetPage: document.getElementById("offsetPage"),
  showSearch: document.getElementById("showSearch"),
  hideEmptySearchSuggestions: document.getElementById("hideEmptySearchSuggestions"),
  streamerMode: document.getElementById("streamerMode"),
  autoHideSensitiveSites: document.getElementById("autoHideSensitiveSites"),
  avoidAppTopBars: document.getElementById("avoidAppTopBars"),
  openOnboarding: document.getElementById("openOnboarding"),
  openBookmarkMaintenance: document.getElementById("openBookmarkMaintenance"),
  manageShortcuts: document.getElementById("manageShortcuts"),
  resetPosition: document.getElementById("resetPosition"),
  folderRail: Array.from(document.querySelectorAll("[data-folder-rail]")),
  rows: Array.from(document.querySelectorAll("[data-rows]")),
  shortcutRows: Array.from(document.querySelectorAll("[data-command]")),
  siteControl: document.getElementById("siteControl"),
  siteHost: document.getElementById("siteHost"),
  siteStatus: document.getElementById("siteStatus"),
  toggleSite: document.getElementById("toggleSite")
};

let currentSettings = { ...DEFAULT_SETTINGS };
let activePage = {
  ok: false,
  canControlSite: false,
  host: "",
  disabledByUser: false,
  sensitiveHost: false,
  hiddenOnSites: false,
  dockedBottom: false,
  autoHiddenSensitive: false
};

init().catch(() => {});

async function init() {
  const [syncedSettings, localState, pageInfo] = await Promise.all([
    chrome.storage.sync.get(SYNC_DEFAULT_SETTINGS),
    chrome.storage.local.get({
      ...LOCAL_SETTINGS_DEFAULTS,
      [SHORTCUT_NUDGE_STORAGE_KEY]: false
    }),
    getActivePageInfo(),
  ]);

  currentSettings = normalizeSettings({ ...syncedSettings, ...localState });
  activePage = pageInfo;
  render(currentSettings);
  renderShortcuts().catch(() => {});
  renderShortcutNudge(localState[SHORTCUT_NUDGE_STORAGE_KEY] === true);

  controls.enabled.addEventListener("change", () => {
    chrome.storage.sync.set({ enabled: controls.enabled.checked });
  });

  controls.showOnSites.addEventListener("change", () => {
    chrome.storage.sync.set({ showOnSites: controls.showOnSites.checked });
  });

  controls.compact.addEventListener("change", () => {
    chrome.storage.sync.set({ compact: controls.compact.checked });
  });

  controls.offsetPage.addEventListener("change", () => {
    chrome.storage.sync.set({ offsetPage: controls.offsetPage.checked });
  });

  controls.showSearch.addEventListener("change", () => {
    chrome.storage.sync.set({ showSearch: controls.showSearch.checked });
  });

  controls.hideEmptySearchSuggestions.addEventListener("change", () => {
    chrome.storage.sync.set({
      hideEmptySearchSuggestions: controls.hideEmptySearchSuggestions.checked
    });
  });

  controls.streamerMode.addEventListener("change", () => {
    chrome.storage.sync.set({
      streamerMode: controls.streamerMode.checked
    });
  });

  controls.folderRail.forEach((button) => {
    button.addEventListener("click", () => {
      chrome.storage.sync.set({ folderRail: button.dataset.folderRail });
    });
  });

  controls.autoHideSensitiveSites.addEventListener("change", () => {
    chrome.storage.sync.set({
      autoHideSensitiveSites: controls.autoHideSensitiveSites.checked
    });
  });

  controls.avoidAppTopBars.addEventListener("change", () => {
    chrome.storage.sync.set({
      avoidAppTopBars: controls.avoidAppTopBars.checked
    });
  });

  controls.rows.forEach((button) => {
    button.addEventListener("click", () => {
      chrome.storage.sync.set({ rows: Number(button.dataset.rows) });
    });
  });

  controls.toggleSite.addEventListener("click", () => {
    if (!activePage.canControlSite || !activePage.host) {
      return;
    }

    const disabledHosts = isHostDisabled(currentSettings.disabledHosts, activePage.host)
      ? removeDisabledHost(currentSettings.disabledHosts, activePage.host)
      : addDisabledHost(currentSettings.disabledHosts, activePage.host);

    chrome.storage.local.set({ disabledHosts });
  });

  controls.manageShortcuts.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });

  controls.openOnboarding.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding.html") });
  });

  controls.openBookmarkMaintenance.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/bookmark-maintenance.html") });
  });

  controls.resetPosition.addEventListener("click", () => {
    chrome.storage.local.remove(PANEL_POSITION_STORAGE_KEY).catch(() => {});
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    const relevantChanges = areaName === "sync"
      ? Object.fromEntries(Object.entries(changes).filter(([key]) => key in SYNC_DEFAULT_SETTINGS))
      : areaName === "local" && "disabledHosts" in changes
        ? { disabledHosts: changes.disabledHosts }
        : {};

    if (Object.keys(relevantChanges).length === 0) {
      return;
    }

    const nextSettings = Object.fromEntries(
      Object.entries(relevantChanges).map(([key, change]) => [key, change.newValue])
    );
    currentSettings = normalizeSettings({ ...currentSettings, ...nextSettings });
    activePage = {
      ...activePage,
      disabledByUser: isHostDisabled(currentSettings.disabledHosts, activePage.host),
      autoHiddenSensitive: currentSettings.autoHideSensitiveSites && activePage.sensitiveHost
    };
    render(currentSettings);
  });
}

async function getActivePageInfo() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab?.id) {
    return activePage;
  }

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, { type: "BF_GET_PAGE_INFO" }, (response) => {
      if (chrome.runtime.lastError || !response?.ok) {
        resolve(activePage);
        return;
      }

      resolve(response);
    });
  });
}

function render(settings) {
  const normalized = normalizeSettings(settings);

  controls.enabled.checked = normalized.enabled;
  controls.showOnSites.checked = normalized.showOnSites;
  controls.compact.checked = normalized.compact;
  controls.offsetPage.checked = normalized.offsetPage;
  controls.showSearch.checked = normalized.showSearch;
  controls.hideEmptySearchSuggestions.checked = normalized.hideEmptySearchSuggestions;
  controls.streamerMode.checked = normalized.streamerMode;
  controls.autoHideSensitiveSites.checked = normalized.autoHideSensitiveSites;
  controls.avoidAppTopBars.checked = normalized.avoidAppTopBars;

  controls.folderRail.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.folderRail === normalized.folderRail);
  });

  controls.rows.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.rows) === normalized.rows);
  });

  renderSiteControl(normalized);
}

async function renderShortcuts() {
  const commands = await chrome.commands.getAll();
  const shortcutsByCommand = new Map(
    commands.map((command) => [command.name, command.shortcut || ""])
  );

  controls.shortcutRows.forEach((row) => {
    const shortcut = shortcutsByCommand.get(row.dataset.command) || "";
    const cell = row.querySelector("dd");
    if (!cell) {
      return;
    }

    cell.replaceChildren(...createShortcutNodes(shortcut));
  });
}

function createShortcutNodes(shortcut) {
  if (!shortcut) {
    const empty = document.createElement("span");
    empty.className = "shortcut-muted";
    empty.textContent = "-";
    return [empty];
  }

  return shortcut.split("+").map((part) => {
    const key = document.createElement("kbd");
    key.textContent = part.trim();
    return key;
  });
}

function renderShortcutNudge(hasSeenNudge) {
  if (hasSeenNudge || !controls.manageShortcuts) {
    return;
  }

  controls.manageShortcuts.classList.add("is-nudged");
  chrome.storage.local.set({ [SHORTCUT_NUDGE_STORAGE_KEY]: true }).catch(() => {});
  window.setTimeout(() => {
    controls.manageShortcuts.classList.remove("is-nudged");
  }, 2200);
}

function renderSiteControl(settings) {
  if (!activePage.canControlSite || !activePage.host) {
    controls.siteControl.hidden = true;
    return;
  }

  const disabledByUser = isHostDisabled(settings.disabledHosts, activePage.host);
  const autoHiddenSensitive = settings.autoHideSensitiveSites && activePage.sensitiveHost;

  controls.siteControl.hidden = false;
  controls.siteHost.textContent = activePage.host;
  controls.toggleSite.disabled = !settings.showOnSites;
  controls.toggleSite.textContent = !settings.showOnSites
    ? t("websitesDisabled")
    : disabledByUser
      ? t("showOnThisSite")
      : t("hideOnThisSite");

  if (!settings.showOnSites) {
    controls.siteStatus.textContent = t("siteStatusWebsitesHidden");
  } else if (disabledByUser) {
    controls.siteStatus.textContent = t("siteStatusManuallyHidden");
  } else if (autoHiddenSensitive) {
    controls.siteStatus.textContent = t("siteStatusSensitiveHidden");
  } else if (activePage.dockedBottom) {
    controls.siteStatus.textContent = t("siteStatusDockedBottom");
  } else {
    controls.siteStatus.textContent = t("siteStatusVisible");
  }
}
