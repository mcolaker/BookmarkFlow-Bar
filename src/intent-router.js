(function () {
  "use strict";

  const INTENT_URL = "url";
  const INTENT_COMMAND = "command";
  const INTENT_TAG = "tag";
  const INTENT_FOLDER = "folder";
  const INTENT_TAB = "open_tab";
  const INTENT_SEARCH = "search";

  const COMMAND_PATTERNS = [
    { id: "health", regex: /^(?:#health|health|sa[gğ]l[iı]k|k[iı]r[iı]k|dead|broken|duplicate|m[uü]kerrer|bak[iı]m|maintenance)\b/i, icon: "🩺", action: "openHealthInspector" },
    { id: "stash", regex: /^(?:#stash|#tabs|stash|tabs|sekmeler|sakla|save tabs)\b/i, icon: "📥", action: "saveOpenTabs" },
    { id: "reading", regex: /^(?:#reading|#later|reading|read|oku|later|liste)\b/i, icon: "📖", action: "openReadingList" },
    { id: "backup", regex: /^(?:#backup|backup|yedek|export|restore)\b/i, icon: "💾", action: "exportBackup" },
    { id: "settings", regex: /^(?:#settings|settings|ayarlar|options|yap[iı]land[iı]rma)\b/i, icon: "⚙️", action: "openSettings" }
  ];

  const PROTOCOL_REGEX = /^(https?|ftp|file):\/\//i;
  const DOMAIN_REGEX = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?(?:\/.*)?$/;
  const LOCALHOST_REGEX = /^localhost(?::\d+)?(?:\/.*)?$/i;

  function isLikelyUrl(text) {
    if (!text || typeof text !== "string") return false;
    const trimmed = text.trim();
    if (trimmed.includes(" ") && !trimmed.startsWith("http")) return false;
    return PROTOCOL_REGEX.test(trimmed) || DOMAIN_REGEX.test(trimmed) || LOCALHOST_REGEX.test(trimmed);
  }

  function resolveTargetUrl(text) {
    const trimmed = text.trim();
    if (PROTOCOL_REGEX.test(trimmed)) return trimmed;
    if (DOMAIN_REGEX.test(trimmed) || LOCALHOST_REGEX.test(trimmed)) return `https://${trimmed}`;
    return null;
  }

  function detectUserIntent(rawQuery, context = {}) {
    const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
    if (!query) {
      return {
        intent: INTENT_SEARCH,
        rawQuery: "",
        badge: null
      };
    }

    // 1. URL / Link Capture Intent
    if (isLikelyUrl(query)) {
      const targetUrl = resolveTargetUrl(query);
      return {
        intent: INTENT_URL,
        rawQuery: query,
        targetUrl,
        badge: {
          key: "intentLinkMode",
          icon: "🌐",
          label: "Bağlantı Modu",
          className: "is-url"
        }
      };
    }

    // 2. Command Palette Action Intent (#stash, #health, #backup, etc.)
    const matchedCommand = COMMAND_PATTERNS.find(cmd => cmd.regex.test(query));
    if (matchedCommand) {
      return {
        intent: INTENT_COMMAND,
        rawQuery: query,
        commandId: matchedCommand.id,
        action: matchedCommand.action,
        badge: {
          key: "intentCommandMode",
          icon: matchedCommand.icon || "⚡",
          label: "Komut Modu",
          className: "is-command"
        }
      };
    }

    // 3. Tag Filter Intent (#dev, #ai, #video, etc.)
    if (query.startsWith("#") && query.length > 1) {
      const tagValue = query.slice(1).trim();
      return {
        intent: INTENT_TAG,
        rawQuery: query,
        tagValue,
        badge: {
          key: "intentTagMode",
          icon: "🏷️",
          label: "Etiket Modu",
          className: "is-tag"
        }
      };
    }

    // 4. Folder Navigation Intent (folder:iş, klasör:projeler, or direct matching folder)
    const folderPrefixMatch = query.match(/^(?:folder|klas[oö]r|dir):(.*)$/i);
    if (folderPrefixMatch) {
      const folderQuery = folderPrefixMatch[1].trim();
      return {
        intent: INTENT_FOLDER,
        rawQuery: query,
        folderQuery,
        badge: {
          key: "intentFolderMode",
          icon: "📁",
          label: "Klasör Modu",
          className: "is-folder"
        }
      };
    }

    if (Array.isArray(context.folders) && query.length >= 2) {
      const lower = query.toLowerCase();
      const matchedFolder = context.folders.find(f => (f.title || "").toLowerCase() === lower);
      if (matchedFolder) {
        return {
          intent: INTENT_FOLDER,
          rawQuery: query,
          folderId: matchedFolder.id,
          folderTitle: matchedFolder.title,
          badge: {
            key: "intentFolderMode",
            icon: "📁",
            label: "Klasör Modu",
            className: "is-folder"
          }
        };
      }
    }

    // 5. Open Tab Switch Intent (tab:github, sekme:youtube)
    const tabPrefixMatch = query.match(/^(?:tab|sekme):(.*)$/i);
    if (tabPrefixMatch) {
      const tabQuery = tabPrefixMatch[1].trim();
      return {
        intent: INTENT_TAB,
        rawQuery: query,
        tabQuery,
        badge: {
          key: "intentTabMode",
          icon: "🗂️",
          label: "Sekme Modu",
          className: "is-tab"
        }
      };
    }

    // 6. Default: Smart Search Mode
    return {
      intent: INTENT_SEARCH,
      rawQuery: query,
      badge: {
        key: "intentSearchMode",
        icon: "🔍",
        label: "Akıllı Arama",
        className: "is-search"
      }
    };
  }

  const BookmarkIntentRoutingEngine = Object.freeze({
    detectUserIntent,
    isLikelyUrl,
    resolveTargetUrl,
    INTENT_URL,
    INTENT_COMMAND,
    INTENT_TAG,
    INTENT_FOLDER,
    INTENT_TAB,
    INTENT_SEARCH
  });

  globalThis.BookmarkIntentRoutingEngine = BookmarkIntentRoutingEngine;
})();
