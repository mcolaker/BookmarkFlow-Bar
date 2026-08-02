const {
  SETUP_PROFILES,
  getSetupProfileSettings
} = BookmarkFlowConfig;
const { t } = BookmarkFlowI18n;

const elements = {
  profileGrid: document.getElementById("profileGrid"),
  bookmarkSource: document.getElementById("bookmarkSource"),
  applyProfile: document.getElementById("applyProfile"),
  finish: document.getElementById("finish"),
  openBookmarks: document.getElementById("openBookmarks"),
  openShortcuts: document.getElementById("openShortcuts"),
  status: document.getElementById("status")
};

const PROFILE_FACTS = Object.freeze({
  balanced: ["factTwoRows", "factCompact", "factNamesVisible"],
  privacy: ["factOneRow", "factIconFocused", "factEmptySearchHidden"],
  keyboard: ["factPersistentSearch", "factShortcutFocused", "factTwoRows"],
  organized: ["factLeftFolderRail", "factTwoRows", "factFolderFocused"]
});

let selectedProfile = "privacy";

init().catch((error) => {
  renderStatus(error?.message || t("onboardingFailed"), true);
});

async function init() {
  const localState = await chrome.storage.local.get("bfOnboardingProfile");
  selectedProfile = SETUP_PROFILES[localState.bfOnboardingProfile]
    ? localState.bfOnboardingProfile
    : selectedProfile;

  renderProfiles();
  renderBookmarkSource().catch(() => {});

  elements.applyProfile.addEventListener("click", applySelectedProfile);
  elements.finish.addEventListener("click", finishOnboarding);
  elements.openBookmarks.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://bookmarks" }).catch(() => {});
  });
  elements.openShortcuts.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" }).catch(() => {});
  });
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
