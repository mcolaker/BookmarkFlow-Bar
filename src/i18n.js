(function (scope) {
  const ENGLISH_FALLBACKS = Object.freeze({
    appName: "BookmarkFlow Bar",
    extensionContextUnavailable: "Extension context unavailable.",
    bookmarkAdded: "Bookmark added.",
    bookmarkAddedToFolder: "Bookmark added to the folder.",
    folderCreated: "Folder created.",
    genericOperationFailed: "The operation could not be completed."
  });

  function normalizeSubstitutions(substitutions) {
    if (substitutions === undefined || substitutions === null) {
      return [];
    }

    return (Array.isArray(substitutions) ? substitutions : [substitutions]).map((value) => String(value));
  }

  function interpolate(message, substitutions) {
    return normalizeSubstitutions(substitutions).reduce((result, value, index) => {
      return result.replaceAll(`$${index + 1}`, value);
    }, message);
  }

  function t(key, substitutions) {
    const normalized = normalizeSubstitutions(substitutions);
    try {
      const localized = chrome?.i18n?.getMessage?.(key, normalized);
      if (localized) {
        return localized;
      }
    } catch {}

    return interpolate(ENGLISH_FALLBACKS[key] || key, normalized);
  }

  function getLanguage() {
    try {
      const language = chrome?.i18n?.getUILanguage?.() || "en";
      return language.toLowerCase().startsWith("tr") ? "tr" : "en";
    } catch {
      return "en";
    }
  }

  function localizeDocument(root = document) {
    if (!root?.querySelectorAll) {
      return;
    }

    if (root.documentElement) {
      root.documentElement.lang = getLanguage();
      root.documentElement.dir = "ltr";
    }

    root.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-html]").forEach((element) => {
      element.innerHTML = t(element.dataset.i18nHtml);
    });

    ["title", "aria-label", "placeholder", "alt"].forEach((attribute) => {
      const datasetKey = `i18n${attribute.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join("")}`;
      root.querySelectorAll(`[data-${datasetKey.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}]`).forEach((element) => {
        element.setAttribute(attribute, t(element.dataset[datasetKey]));
      });
    });
  }

  scope.BookmarkFlowI18n = Object.freeze({
    getLanguage,
    localizeDocument,
    t
  });

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => localizeDocument(document), { once: true });
    } else {
      localizeDocument(document);
    }
  }
})(globalThis);
