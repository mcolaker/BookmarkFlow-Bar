const {
  DATA_CONSENT_VERSION,
  SETUP_PROFILES,
  getSetupProfileSettings
} = BookmarkFlowConfig;
const { t } = BookmarkFlowI18n;

const elements = {
  dataConsentGate: document.getElementById("dataConsentGate"),
  setupContent: document.getElementById("setupContent"),
  acceptDataConsent: document.getElementById("acceptDataConsent"),
  declineDataConsent: document.getElementById("declineDataConsent"),
  dataConsentStatus: document.getElementById("dataConsentStatus"),
  profileGrid: document.getElementById("profileGrid"),
  bookmarkSource: document.getElementById("bookmarkSource"),
  applyProfile: document.getElementById("applyProfile"),
  finish: document.getElementById("finish"),
  openBookmarks: document.getElementById("openBookmarks"),
  openShortcuts: document.getElementById("openShortcuts"),
  shortcutRows: Array.from(document.querySelectorAll("[data-command]")),
  status: document.getElementById("status")
};

const PROFILE_FACTS = Object.freeze({
  balanced: ["factTwoRows", "factCompact", "factNamesVisible"],
  privacy: ["factOneRow", "factIconFocused", "factEmptySearchHidden"],
  keyboard: ["factPersistentSearch", "factShortcutFocused", "factTwoRows"],
  organized: ["factLeftFolderRail", "factTwoRows", "factFolderFocused"]
});

let selectedProfile = "privacy";
let setupReady = false;

init().catch((error) => {
  renderStatus(error?.message || t("onboardingFailed"), true);
});

async function init() {
  elements.acceptDataConsent.addEventListener("click", acceptDataConsent);
  elements.declineDataConsent.addEventListener("click", declineDataConsent);

  const consent = await sendMessage({ type: "BF_GET_CONSENT_STATUS" });
  if (consent?.ok && consent.consentGranted && consent.consentVersion === DATA_CONSENT_VERSION) {
    await enableSetup();
  }
}

async function enableSetup() {
  if (setupReady) {
    return;
  }

  setupReady = true;
  elements.dataConsentGate.hidden = true;
  elements.setupContent.hidden = false;
  const localState = await chrome.storage.local.get("bfOnboardingProfile");
  selectedProfile = SETUP_PROFILES[localState.bfOnboardingProfile]
    ? localState.bfOnboardingProfile
    : selectedProfile;

  renderProfiles();
  renderBookmarkSource().catch(() => {});
  renderShortcuts().catch(() => {});

  elements.applyProfile.addEventListener("click", applySelectedProfile);
  elements.finish.addEventListener("click", finishOnboarding);
  elements.openBookmarks.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://bookmarks" }).catch(() => {});
  });
  elements.openShortcuts.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }).catch(() => {});
  });
}

async function renderShortcuts() {
  const commands = await chrome.commands.getAll();
  const shortcutsByCommand = new Map(
    commands.map((command) => [command.name, command.shortcut || ""])
  );

  elements.shortcutRows.forEach((row) => {
    row.querySelectorAll("kbd").forEach((key) => key.remove());
    const shortcut = shortcutsByCommand.get(row.dataset.command) || "";
    const parts = shortcut ? shortcut.split("+") : ["-"];
    parts.forEach((part) => {
      const key = document.createElement("kbd");
      key.textContent = part;
      row.append(key);
    });
  });
}

async function acceptDataConsent() {
  elements.acceptDataConsent.disabled = true;
  const response = await sendMessage({
    type: "BF_SET_DATA_CONSENT",
    consent: true
  });
  elements.acceptDataConsent.disabled = false;

  if (!response?.ok || !response.consentGranted) {
    renderConsentStatus(response?.error || t("onboardingFailed"), true);
    return;
  }

  renderConsentStatus(t("dataConsentAccepted"), false);
  await enableSetup();
}

async function declineDataConsent() {
  await sendMessage({
    type: "BF_SET_DATA_CONSENT",
    consent: false
  });
  renderConsentStatus(t("dataConsentDeclined"), false);
}

function renderProfiles() {
  elements.profileGrid.replaceChildren();

  Object.values(SETUP_PROFILES).forEach((profile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-card";
    button.dataset.profile = profile.id;
    button.classList.toggle("is-selected", selectedProfile === profile.id);

    const badge = document.createElement("span");
    badge.className = "profile-badge";
    badge.textContent = profile.id === "privacy" ? t("recommended") : t("profile");

    const title = document.createElement("strong");
    title.textContent = profile.label;

    const description = document.createElement("p");
    description.textContent = profile.description;

    const facts = document.createElement("div");
    facts.className = "profile-facts";
    (PROFILE_FACTS[profile.id] || []).forEach((fact) => {
      const item = document.createElement("span");
      item.textContent = t(fact);
      facts.append(item);
    });

    button.append(badge, title, description, facts);
    button.addEventListener("click", () => {
      selectedProfile = profile.id;
      renderProfiles();
      renderStatus(t("profileSelected", profile.label), false);
    });
    elements.profileGrid.append(button);
  });
}

async function renderBookmarkSource() {
  const state = await sendMessage({ type: "BF_GET_STATE" });
  const children = state?.bookmarkBar?.children || [];
  const bookmarkCount = children.filter((node) => node.url).length;
  const folderCount = children.filter((node) => !node.url).length;
  elements.bookmarkSource.textContent = t("bookmarkSourceSummary", [bookmarkCount, folderCount]);
}

async function applySelectedProfile() {
  const profile = SETUP_PROFILES[selectedProfile] || SETUP_PROFILES.privacy;
  await chrome.storage.sync.set(getSetupProfileSettings(profile.id));
  await chrome.storage.local.set({
    bfOnboardingSeen: true,
    bfOnboardingProfile: profile.id
  });
  renderStatus(t("profileApplied", profile.label), false);
}

async function finishOnboarding() {
  await chrome.storage.local.set({ bfOnboardingSeen: true });
  renderStatus(t("setupComplete"), false);
  window.setTimeout(() => {
    window.close();
  }, 250);
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

function renderStatus(message, isError) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", Boolean(isError));
  elements.status.classList.toggle("is-ok", Boolean(message) && !isError);
}

function renderConsentStatus(message, isError) {
  elements.dataConsentStatus.textContent = message;
  elements.dataConsentStatus.classList.toggle("is-error", Boolean(isError));
  elements.dataConsentStatus.classList.toggle("is-ok", Boolean(message) && !isError);
}
