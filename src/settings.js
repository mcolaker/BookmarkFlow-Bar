(function () {
  const { t } = BookmarkFlowI18n;
  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true,
    showOnSites: true,
    rows: 2,
    compact: true,
    offsetPage: true,
    showSearch: false,
    hideEmptySearchSuggestions: true,
    streamerMode: false,
    folderRail: "left",
    theme: "gold-obsidian",
    folderColors: {},
    autoHideSensitiveSites: false,
    avoidAppTopBars: true,
    disabledHosts: []
  });

  const SUPPORTED_THEMES = Object.freeze([
    "gold-obsidian",
    "oled-black",
    "emerald-matrix",
    "cyber-indigo"
  ]);

  function normalizeTheme(theme) {
    return SUPPORTED_THEMES.includes(theme) ? theme : "gold-obsidian";
  }

  const PROFILE_LOCAL_SETTING_KEYS = Object.freeze(new Set([
    "disabledHosts",
    "folderColors"
  ]));

  const SYNC_DEFAULT_SETTINGS = Object.freeze(Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).filter(([key]) => !PROFILE_LOCAL_SETTING_KEYS.has(key))
  ));

  const LOCAL_SETTINGS_DEFAULTS = Object.freeze({
    disabledHosts: [],
    folderColors: {}
  });

  const PANEL_POSITION_STORAGE_KEY = "bfPanelPosition";
  const DATA_CONSENT_STORAGE_KEY = "bfDataConsentVersion";
  const DATA_CONSENT_VERSION = 1;
  const BOOKMARK_TAGS_STORAGE_KEY = "bfBookmarkTags";

  function normalizeTag(tag) {
    if (!tag || typeof tag !== "string") {
      return "";
    }
    return tag.trim().toLowerCase().replace(/^#+/, "").slice(0, 32);
  }

  function normalizeTags(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }
    return [...new Set(
      tags
        .map(normalizeTag)
        .filter((tag) => Boolean(tag) && /^[a-z0-9_\-\.]+$/i.test(tag))
    )].slice(0, 12);
  }

  function normalizeAllBookmarkTags(raw) {
    if (!raw || typeof raw !== "object") {
      return {};
    }
    const result = {};
    for (const [id, tags] of Object.entries(raw)) {
      const clean = normalizeTags(tags);
      if (clean.length > 0) {
        result[id] = clean;
      }
    }
    return result;
  }


  const SAFE_BOOKMARK_PROTOCOLS = Object.freeze([
    "http:",
    "https:",
    "mailto:"
  ]);

  const SENSITIVE_HOST_KEYWORDS = Object.freeze([
    "auth",
    "bank",
    "banka",
    "banking",
    "checkout",
    "login",
    "payment",
    "signin",
    "stripe",
    "wallet"
  ]);

  const SENSITIVE_HOSTS = Object.freeze([
    "paypal.com",
    "pay.google.com"
  ]);

  const FOLDER_COLOR_PRESETS = Object.freeze([
    { label: t("colorYellow"), value: "#f2c94c" },
    { label: t("colorBlue"), value: "#4ea1ff" },
    { label: t("colorGreen"), value: "#41d17d" },
    { label: t("colorPurple"), value: "#a78bfa" },
    { label: t("colorRed"), value: "#ff6b6b" },
    { label: t("colorOrange"), value: "#ff9f43" },
    { label: t("colorCyan"), value: "#22d3ee" },
    { label: t("colorGray"), value: "#94a3b8" }
  ]);

  const FOLDER_COLOR_VALUES = Object.freeze(FOLDER_COLOR_PRESETS.map((preset) => preset.value));

  const SETUP_PROFILES = Object.freeze({
    balanced: Object.freeze({
      id: "balanced",
      label: t("profileBalanced"),
      description: t("profileBalancedDescription"),
      settings: Object.freeze({
        enabled: true,
        showOnSites: true,
        rows: 2,
        compact: true,
        offsetPage: true,
        showSearch: false,
        hideEmptySearchSuggestions: true,
        streamerMode: false,
        folderRail: "left",
        autoHideSensitiveSites: false,
        avoidAppTopBars: true
      })
    }),
    privacy: Object.freeze({
      id: "privacy",
      label: t("profilePrivacy"),
      description: t("profilePrivacyDescription"),
      settings: Object.freeze({
        enabled: true,
        showOnSites: true,
        rows: 1,
        compact: true,
        offsetPage: false,
        showSearch: false,
        hideEmptySearchSuggestions: true,
        streamerMode: true,
        folderRail: "left",
        autoHideSensitiveSites: false,
        avoidAppTopBars: true
      })
    }),
    keyboard: Object.freeze({
      id: "keyboard",
      label: t("profileKeyboard"),
      description: t("profileKeyboardDescription"),
      settings: Object.freeze({
        enabled: true,
        showOnSites: true,
        rows: 2,
        compact: true,
        offsetPage: true,
        showSearch: true,
        hideEmptySearchSuggestions: true,
        streamerMode: false,
        folderRail: "left",
        autoHideSensitiveSites: false,
        avoidAppTopBars: true
      })
    }),
    organized: Object.freeze({
      id: "organized",
      label: t("profileOrganized"),
      description: t("profileOrganizedDescription"),
      settings: Object.freeze({
        enabled: true,
        showOnSites: true,
        rows: 2,
        compact: true,
        offsetPage: true,
        showSearch: false,
        hideEmptySearchSuggestions: true,
        streamerMode: false,
        folderRail: "left",
        autoHideSensitiveSites: false,
        avoidAppTopBars: true
      })
    })
  });

  function normalizeSettings(settings) {
    const merged = {
      ...DEFAULT_SETTINGS,
      ...(settings || {})
    };
    const rows = Number(merged.rows);

    return {
      enabled: merged.enabled !== false,
      showOnSites: merged.showOnSites !== false,
      rows: Number.isFinite(rows) ? Math.min(4, Math.max(1, Math.round(rows))) : DEFAULT_SETTINGS.rows,
      compact: merged.compact !== false,
      offsetPage: merged.offsetPage !== false,
      showSearch: merged.showSearch === true,
      hideEmptySearchSuggestions: merged.hideEmptySearchSuggestions !== false,
      streamerMode: merged.streamerMode === true,
      folderRail: normalizeFolderRail(merged.folderRail),
      theme: normalizeTheme(merged.theme),
      folderColors: normalizeFolderColors(merged.folderColors),
      autoHideSensitiveSites: merged.autoHideSensitiveSites === true,
      avoidAppTopBars: merged.avoidAppTopBars !== false,
      disabledHosts: normalizeHosts(merged.disabledHosts)
    };
  }

  function normalizeSyncedSettings(settings) {
    const {
      disabledHosts: _disabledHosts,
      folderColors: _folderColors,
      ...syncedSettings
    } = normalizeSettings(settings);
    return syncedSettings;
  }

  function normalizeHosts(hosts) {
    if (!Array.isArray(hosts)) {
      return [];
    }

    return Array.from(
      new Set(
        hosts
          .map(normalizeHost)
          .filter(Boolean)
      )
    ).slice(0, 300);
  }

  function normalizeFolderRail(value) {
    return ["off", "left", "right"].includes(value) ? value : DEFAULT_SETTINGS.folderRail;
  }

  function normalizeFolderColor(value) {
    const color = String(value || "").trim().toLocaleLowerCase("en-US");
    return FOLDER_COLOR_VALUES.includes(color) ? color : "";
  }

  function normalizeFolderColors(folderColors) {
    if (!folderColors || typeof folderColors !== "object" || Array.isArray(folderColors)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(folderColors)
        .map(([nodeId, color]) => [String(nodeId || "").trim(), normalizeFolderColor(color)])
        .filter(([nodeId, color]) => nodeId && color)
        .slice(0, 600)
    );
  }

  function normalizeHost(host) {
    return String(host || "")
      .trim()
      .toLocaleLowerCase("en-US")
      .replace(/^www\./, "");
  }

  function getUrlProtocol(url) {
    try {
      return new URL(url).protocol;
    } catch {
      return "";
    }
  }

  function isSafeBookmarkUrl(url) {
    return SAFE_BOOKMARK_PROTOCOLS.includes(getUrlProtocol(url));
  }

  function normalizeComparableBookmarkUrl(url) {
    const value = String(url || "").trim();
    if (!value) {
      return "";
    }

    try {
      const parsed = new URL(value);
      if (!SAFE_BOOKMARK_PROTOCOLS.includes(parsed.protocol)) {
        return value;
      }

      parsed.hash = "";
      parsed.hostname = normalizeHost(parsed.hostname);
      if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
        parsed.port = "";
      }

      if (parsed.pathname !== "/") {
        parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
      }

      return parsed.toString();
    } catch {
      return value;
    }
  }

  function areBookmarkUrlsEqual(left, right) {
    return normalizeComparableBookmarkUrl(left) === normalizeComparableBookmarkUrl(right);
  }

  function isHostDisabled(disabledHosts, host) {
    const normalizedHost = normalizeHost(host);
    if (!normalizedHost) {
      return false;
    }

    return normalizeHosts(disabledHosts).some((disabledHost) => (
      normalizedHost === disabledHost || normalizedHost.endsWith(`.${disabledHost}`)
    ));
  }

  function isSensitiveHost(host) {
    const normalizedHost = normalizeHost(host);
    if (!normalizedHost) {
      return false;
    }

    if (SENSITIVE_HOSTS.some((sensitiveHost) => (
      normalizedHost === sensitiveHost || normalizedHost.endsWith(`.${sensitiveHost}`)
    ))) {
      return true;
    }

    return SENSITIVE_HOST_KEYWORDS.some((keyword) => normalizedHost.includes(keyword));
  }

  function addDisabledHost(disabledHosts, host) {
    return normalizeHosts([...normalizeHosts(disabledHosts), normalizeHost(host)]);
  }

  function removeDisabledHost(disabledHosts, host) {
    const normalizedHost = normalizeHost(host);
    return normalizeHosts(disabledHosts).filter((disabledHost) => disabledHost !== normalizedHost);
  }

  function getSetupProfile(profileId) {
    return SETUP_PROFILES[profileId] || SETUP_PROFILES.balanced;
  }

  function getSetupProfileSettings(profileId) {
    return {
      ...getSetupProfile(profileId).settings
    };
  }

  globalThis.BookmarkFlowConfig = Object.freeze({
    DEFAULT_SETTINGS,
    LOCAL_SETTINGS_DEFAULTS,
    SYNC_DEFAULT_SETTINGS,
    FOLDER_COLOR_PRESETS,
    SETUP_PROFILES,
    PANEL_POSITION_STORAGE_KEY,
    DATA_CONSENT_STORAGE_KEY,
    DATA_CONSENT_VERSION,
    BOOKMARK_TAGS_STORAGE_KEY,
    normalizeTag,
    normalizeTags,
    normalizeAllBookmarkTags,
    SAFE_BOOKMARK_PROTOCOLS,
    SENSITIVE_HOST_KEYWORDS,
    SENSITIVE_HOSTS,
    addDisabledHost,
    areBookmarkUrlsEqual,
    isHostDisabled,
    isSafeBookmarkUrl,
    isSensitiveHost,
    normalizeComparableBookmarkUrl,
    normalizeFolderColor,
    normalizeFolderColors,
    normalizeFolderRail,
    normalizeHost,
    normalizeHosts,
    normalizeSettings,
    normalizeSyncedSettings,
    getSetupProfile,
    getSetupProfileSettings,
    removeDisabledHost,
    SUPPORTED_THEMES,
    normalizeTheme
  });
})();
