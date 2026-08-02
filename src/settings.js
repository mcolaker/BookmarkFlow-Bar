(function () {
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
    folderColors: {},
    autoHideSensitiveSites: false,
    avoidAppTopBars: true,
    disabledHosts: []
  });

  const SYNC_DEFAULT_SETTINGS = Object.freeze(Object.fromEntries(
    Object.entries(DEFAULT_SETTINGS).filter(([key]) => key !== "disabledHosts")
  ));

  const LOCAL_SETTINGS_DEFAULTS = Object.freeze({
    disabledHosts: []
  });

  const PANEL_POSITION_STORAGE_KEY = "bfPanelPosition";

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
    { label: "Sari", value: "#f2c94c" },
    { label: "Mavi", value: "#4ea1ff" },
    { label: "Yesil", value: "#41d17d" },
    { label: "Mor", value: "#a78bfa" },
    { label: "Kirmizi", value: "#ff6b6b" },
    { label: "Turuncu", value: "#ff9f43" },
    { label: "Camgobegi", value: "#22d3ee" },
    { label: "Gri", value: "#94a3b8" }
  ]);

  const FOLDER_COLOR_VALUES = Object.freeze(FOLDER_COLOR_PRESETS.map((preset) => preset.value));

  const SETUP_PROFILES = Object.freeze({
    balanced: Object.freeze({
      id: "balanced",
      label: "Dengeli",
      description: "Gunluk kullanim icin iki satirli, okunabilir ve sakin varsayilan.",
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
      label: "Yayinci / gizlilik",
      description: "Video, sunum ve musteri gorusmelerinde isimleri azaltan ikon odakli profil.",
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
      label: "Klavye odakli",
      description: "Arama kalici acik, kisa yollar ve hizli gecisler onde.",
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
      label: "Klasor rayi",
      description: "Direkt yer imleri yatayda kalir, klasorler solda ayrilir.",
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
      folderColors: normalizeFolderColors(merged.folderColors),
      autoHideSensitiveSites: merged.autoHideSensitiveSites === true,
      avoidAppTopBars: merged.avoidAppTopBars !== false,
      disabledHosts: normalizeHosts(merged.disabledHosts)
    };
  }

  function normalizeSyncedSettings(settings) {
    const { disabledHosts: _disabledHosts, ...syncedSettings } = normalizeSettings(settings);
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
    removeDisabledHost
  });
})();
