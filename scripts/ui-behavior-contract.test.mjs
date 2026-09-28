import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentSource = readFileSync(path.join(root, "src/content.js"), "utf8");
const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
const newTabSource = readFileSync(path.join(root, "src/newtab.js"), "utf8");
const newTabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
const onboardingSource = readFileSync(path.join(root, "src/onboarding.js"), "utf8");
const onboardingHtml = readFileSync(path.join(root, "src/onboarding.html"), "utf8");
const popupSource = readFileSync(path.join(root, "src/popup.js"), "utf8");
const maintenanceSource = readFileSync(path.join(root, "src/bookmark-maintenance.js"), "utf8");
const maintenanceHtml = readFileSync(path.join(root, "src/bookmark-maintenance.html"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", start);
  assert.notEqual(bodyStart, -1, `${name} must have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  throw new Error(`${name} body is incomplete`);
}

function loadNormalizer(source, functionName, language) {
  const getTextLocale = extractFunction(source, "getTextLocale");
  const normalize = extractFunction(source, functionName);
  return Function(
    "getLanguage",
    `"use strict";\n${getTextLocale}\n${normalize}\nreturn ${functionName};`
  )(() => language);
}

function loadSettingsModule() {
  const settingsSource = readFileSync(path.join(root, "src/settings.js"), "utf8");
  const scope = { BookmarkFlowI18n: { t: (k) => k } };
  Function("globalThis", "BookmarkFlowI18n", `"use strict";\n${settingsSource}`)(scope, scope.BookmarkFlowI18n);
  return scope;
}

function loadFocusTrap(source) {
  const getFocusableElements = extractFunction(source, "getFocusableElements");
  const trapFocusWithin = extractFunction(source, "trapFocusWithin");
  return Function(
    "document",
    `"use strict";\n${getFocusableElements}\n${trapFocusWithin}\nreturn trapFocusWithin;`
  )({ activeElement: null });
}

function createFocusable(name, focusLog) {
  return {
    name,
    tabIndex: 0,
    hidden: false,
    getAttribute: () => null,
    focus: () => focusLog.push(name)
  };
}

for (const [surface, source] of [["content", contentSource], ["new tab", newTabSource]]) {
  test(`${surface} folder normalization follows the active English and Turkish locale`, () => {
    const normalizeEnglish = loadNormalizer(source, "normalizeFolderTitle", "en");
    const normalizeTurkish = loadNormalizer(source, "normalizeFolderTitle", "tr");

    assert.equal(normalizeEnglish("  INDEX I  "), "index i");
    assert.equal(normalizeEnglish("ISTANBUL"), "istanbul");
    assert.equal(normalizeTurkish("  İÇERİK  "), "içerik");
    assert.equal(normalizeTurkish("IŞIK"), "ışık");
    assert.notEqual(normalizeEnglish("I"), normalizeTurkish("I"));
  });

  test(`${surface} modal focus trap wraps in both directions`, () => {
    const trapFocusWithin = loadFocusTrap(source);
    const focusLog = [];
    const first = createFocusable("first", focusLog);
    const last = createFocusable("last", focusLog);
    const container = {
      querySelectorAll: () => [first, last],
      contains: (element) => element === first || element === last,
      focus: () => focusLog.push("container")
    };

    let prevented = false;
    assert.equal(trapFocusWithin({ key: "Tab", shiftKey: false, preventDefault: () => { prevented = true; } }, container, last), true);
    assert.equal(prevented, true);
    assert.deepEqual(focusLog, ["first"]);

    prevented = false;
    focusLog.length = 0;
    assert.equal(trapFocusWithin({ key: "Tab", shiftKey: true, preventDefault: () => { prevented = true; } }, container, first), true);
    assert.equal(prevented, true);
    assert.deepEqual(focusLog, ["last"]);
  });
}

test("content search normalization also follows the active locale", () => {
  const normalizeEnglish = loadNormalizer(contentSource, "normalizeText", "en");
  const normalizeTurkish = loadNormalizer(contentSource, "normalizeText", "tr");

  assert.equal(normalizeEnglish("DESIGN INDEX"), "design index");
  assert.equal(normalizeTurkish("İÇERİK IŞIK"), "içerik ışık");
});

test("document key handlers do not consume Ctrl+K or Alt+Space aliases", () => {
  const contentKeyHandler = extractFunction(contentSource, "handleDocumentKeydown");
  const newTabKeyHandler = extractFunction(newTabSource, "handleKeydown");

  for (const handler of [contentKeyHandler, newTabKeyHandler]) {
    assert.doesNotMatch(handler, /ctrlKey|metaKey|altKey/u);
    assert.doesNotMatch(handler, /spacebar|code\s*===\s*["']Space["']/iu);
    assert.doesNotMatch(handler, /key\s*===\s*["']k["']/iu);
  }
  assert.doesNotMatch(contentSource, /function\s+isCommandPaletteShortcut\s*\(/u);
});

test("new-tab add overlay exposes modal semantics and focus lifecycle", () => {
  assert.match(newTabHtml, /id="addForm"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="addDialogTitle"/u);
  assert.match(newTabHtml, /id="addDialogTitle"/u);
  assert.match(newTabSource, /setNewTabModalBackground\(true\)/u);
  assert.match(newTabSource, /restoreFocusTarget\(returnFocus\)/u);
});

test("content dialogs and combobox use one consistent accessibility model", () => {
  assert.match(contentSource, /class="bf-add-panel"[^>]*role="dialog"[^>]*aria-modal="true"/u);
  assert.match(contentSource, /class="bf-command-panel"[^>]*role="dialog"[^>]*aria-modal="true"/u);
  assert.match(contentSource, /class="bf-command-input"[^>]*role="combobox"[^>]*aria-controls="bf-command-list"/u);
  assert.match(contentSource, /id="bf-command-list"[^>]*role="listbox"/u);
  assert.match(contentSource, /link\.tabIndex\s*=\s*-1/u);
  assert.match(contentSource, /link\.setAttribute\("role",\s*"option"\)/u);
  assert.match(contentSource, /aria-activedescendant/u);
  assert.match(contentSource, /updateModalBackgroundState\(\)/u);
  assert.match(extractFunction(contentSource, "openAddBookmarkDialog"), /closeCommandPalette\(\{\s*restoreFocus:\s*false\s*\}\)/u);
  assert.match(extractFunction(contentSource, "openCommandPalette"), /closeAddBookmarkDialog\(\{\s*restoreFocus:\s*false\s*\}\)/u);
});

test("first-run disclosure is explicit and setup data stays hidden until affirmative consent", () => {
  assert.match(onboardingHtml, /id="dataConsentGate"[^>]*aria-labelledby="dataConsentTitle"/u);
  assert.match(onboardingHtml, /id="acceptDataConsent"[^>]*data-i18n="dataConsentAgree"/u);
  assert.match(onboardingHtml, /id="declineDataConsent"[^>]*data-i18n="notNow"/u);
  assert.match(onboardingHtml, /id="setupContent"[^>]*hidden/u);
  assert.match(onboardingHtml, /href="https:\/\/mcolaker\.github\.io\/BookmarkFlow-Bar\/privacy\/"/u);

  const init = extractFunction(onboardingSource, "init");
  const enableSetup = extractFunction(onboardingSource, "enableSetup");
  const accept = extractFunction(onboardingSource, "acceptDataConsent");
  assert.doesNotMatch(init, /BF_GET_STATE|storage\.sync|get\("bfOnboardingProfile"/u);
  assert.match(init, /BF_GET_CONSENT_STATUS/u);
  assert.match(accept, /BF_SET_DATA_CONSENT/u);
  assert.match(accept, /consent:\s*true/u);
  assert.match(enableSetup, /renderBookmarkSource/u);
});

test("all bookmark and page surfaces gate data access before initialization", () => {
  const contentInit = extractFunction(contentSource, "init");
  const contentConsentIndex = contentInit.indexOf("MESSAGE_GET_CONSENT_STATUS");
  assert.ok(contentConsentIndex >= 0);
  assert.ok(contentConsentIndex < contentInit.indexOf("injectPageStyle"));
  assert.ok(contentConsentIndex < contentInit.indexOf("loadPanelPosition"));

  const newTabInit = extractFunction(newTabSource, "init");
  assert.ok(newTabInit.indexOf("MESSAGE_GET_CONSENT_STATUS") < newTabInit.indexOf("getState()"));
  assert.match(newTabHtml, /id="consentGate"[^>]*hidden/u);
  assert.match(newTabHtml, /id="newTabWorkspace"[^>]*hidden/u);
  assert.doesNotMatch(newTabSource, /bfNewTabScrollLeft|handleBookmarkStripScroll|getSavedBookmarkScrollLeft/u);

  const popupInit = extractFunction(popupSource, "init");
  assert.ok(popupInit.indexOf("BF_GET_CONSENT_STATUS") < popupInit.indexOf("chrome.storage.sync.get"));
  assert.ok(popupInit.indexOf("BF_GET_CONSENT_STATUS") < popupInit.indexOf("getActivePageInfo"));

  const maintenanceInit = extractFunction(maintenanceSource, "init");
  assert.ok(maintenanceInit.indexOf("BF_GET_CONSENT_STATUS") < maintenanceInit.indexOf("loadDuplicateGroups"));
  assert.match(maintenanceSource, /async function requireDataConsent/u);
  assert.match(maintenanceHtml, /id="maintenanceConsentGate"[^>]*hidden/u);
});

test("collapsed bar hides actions and narrows to single mark column by default", () => {
  assert.match(contentCss, /\.bf-app:not\(\.is-expanded\):not\(\.is-snoozed\)\s+\.bf-layout\s*\{\s*grid-template-columns:\s*auto;/u);
  assert.match(contentCss, /\.bf-app:not\(\.is-expanded\):not\(\.is-snoozed\)\s+\.bf-actions/u);
});

test("multi-theme engine contract is supported across settings, popup, new tab, and content bar", () => {
  const settingsSource = readFileSync(path.join(root, "src/settings.js"), "utf8");
  const popupHtml = readFileSync(path.join(root, "src/popup.html"), "utf8");
  const popupCss = readFileSync(path.join(root, "src/popup.css"), "utf8");
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");

  const supportedThemes = ["gold-obsidian", "oled-black", "emerald-matrix", "cyber-indigo"];

  for (const theme of supportedThemes) {
    assert.match(settingsSource, new RegExp(`"${theme}"`, "u"));
    assert.match(popupHtml, new RegExp(`data-theme="${theme}"`, "u"));
    if (theme !== "gold-obsidian") {
      assert.match(popupCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
      assert.match(newTabCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
      assert.match(contentCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
    }
  }

  assert.match(popupSource, /document\.documentElement\.dataset\.theme\s*=/u);
  assert.match(newTabSource, /document\.documentElement\.dataset\.theme\s*=/u);
  assert.match(contentSource, /host\.dataset\.theme\s*=/u);
  assert.match(contentSource, /app\.dataset\.theme\s*=/u);
});

test("bookmark health inspection contract is implemented in bookmark-maintenance", () => {
  const maintenanceHtml = readFileSync(path.join(root, "src/bookmark-maintenance.html"), "utf8");
  const maintenanceJs = readFileSync(path.join(root, "src/bookmark-maintenance.js"), "utf8");
  const maintenanceCss = readFileSync(path.join(root, "src/bookmark-maintenance.css"), "utf8");

  assert.match(maintenanceHtml, /id="startHealthCheck"/u);
  assert.match(maintenanceHtml, /id="stopHealthCheck"/u);
  assert.match(maintenanceHtml, /id="healthMetrics"/u);
  assert.match(maintenanceHtml, /id="metricDead"/u);
  assert.match(maintenanceHtml, /id="healthIssuesList"/u);

  assert.match(maintenanceJs, /async\s+function\s+startHealthScan\s*\(/u);
  assert.match(maintenanceJs, /function\s+stopHealthScan\s*\(/u);
  assert.match(maintenanceJs, /async\s+function\s+pingUrl\s*\(/u);
  assert.match(maintenanceJs, /collectLeafBookmarks\s*\(/u);

  assert.match(maintenanceCss, /\.health-section/u);
  assert.match(maintenanceCss, /\.health-metric-card/u);
  assert.match(maintenanceCss, /\.issue-badge/u);
});

test("bookmark tagging and smart tag normalization contract is supported in settings", () => {
  const settingsSource = readFileSync(path.join(root, "src/settings.js"), "utf8");
  const vm = loadSettingsModule();
  const {
    normalizeTag,
    normalizeTags,
    normalizeAllBookmarkTags,
    inferSmartTags,
    resolveItemTags,
    matchesTagFilter,
    BOOKMARK_TAGS_STORAGE_KEY
  } = vm.BookmarkFlowConfig;

  assert.strictEqual(BOOKMARK_TAGS_STORAGE_KEY, "bfBookmarkTags");
  assert.strictEqual(normalizeTag("#Dev"), "dev");
  assert.strictEqual(normalizeTag("  ###typescript  "), "typescript");
  assert.deepStrictEqual(normalizeTags(["#Dev", "dev", "react", "invalid tag!"]), ["dev", "react"]);
  assert.deepStrictEqual(
    normalizeAllBookmarkTags({ "1": ["#AI", "tools"], "2": ["invalid space"] }),
    { "1": ["ai", "tools"] }
  );
  assert.match(settingsSource, /BOOKMARK_TAGS_STORAGE_KEY/u);

  // Smart tag inference
  const inferred = inferSmartTags("My Dashboard #analytics", "https://github.com/mcolaker/BookmarkFlow-Bar", "Work / Dev Tools");
  assert.ok(inferred.includes("analytics"), "should extract title hashtag");
  assert.ok(inferred.includes("github"), "should extract domain root");
  assert.ok(inferred.includes("work"), "should extract path folder");

  // Tag resolution: explicit vs smart
  const explicit = resolveItemTags({ id: "bm1" }, { "bm1": ["custom", "tag"] });
  assert.deepStrictEqual(explicit, ["custom", "tag"]);

  // Tag filtering
  assert.strictEqual(matchesTagFilter("#dev", ["dev", "web"], { title: "Test", url: "https://example.com" }), true);
  assert.strictEqual(matchesTagFilter("#python", ["dev", "web"], { title: "Test", url: "https://example.com" }), false);
  assert.strictEqual(matchesTagFilter("#", ["dev"], { title: "Test", url: "https://example.com" }), true);
  assert.strictEqual(matchesTagFilter("#", [], { title: "Test", url: "https://example.com" }), false);
  assert.strictEqual(matchesTagFilter("#dev test", ["dev"], { title: "Test App", url: "https://example.com" }), true);
});

test("smart tag UI and spotlight filtering integration contract", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  const newTabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");

  assert.match(contentJs, /edit-bookmark-tags/u);
  assert.match(contentJs, /editContextBookmarkTags/u);
  assert.match(contentJs, /bf-tag-pill/u);
  assert.match(contentCss, /\.bf-tag-pill/u);
  assert.match(contentCss, /\.bf-tag-list/u);

  assert.match(newTabJs, /edit-bookmark-tags/u);
  assert.match(newTabJs, /editContextBookmarkTags/u);
  assert.match(newTabJs, /nt-tag-pill/u);
  assert.match(newTabCss, /\.nt-tag-pill/u);
  assert.match(newTabCss, /\.nt-tag-list/u);
});

test("health inspector UI overhaul and spotlight action contract", () => {
  const popupHtml = readFileSync(path.join(root, "src/popup.html"), "utf8");
  const popupJs = readFileSync(path.join(root, "src/popup.js"), "utf8");
  const maintenanceHtml = readFileSync(path.join(root, "src/bookmark-maintenance.html"), "utf8");
  const maintenanceJs = readFileSync(path.join(root, "src/bookmark-maintenance.js"), "utf8");
  const maintenanceCss = readFileSync(path.join(root, "src/bookmark-maintenance.css"), "utf8");
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const newTabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");

  // Popup dedicated button
  assert.match(popupHtml, /id="openHealthInspector"/u);
  assert.match(popupJs, /openHealthInspector/u);

  // Maintenance navigation & filter tabs
  assert.match(maintenanceHtml, /class="maintenance-nav"/u);
  assert.match(maintenanceHtml, /id="healthFilters"/u);
  assert.match(maintenanceHtml, /class="health-filter-btn/u);
  assert.match(maintenanceJs, /applyIssueFilter/u);
  assert.match(maintenanceJs, /handleHashNavigation/u);
  assert.match(maintenanceCss, /\.health-filters/u);
  assert.match(maintenanceCss, /\.maintenance-nav/u);

  // Spotlight quick action integration
  assert.match(contentJs, /isHealthQuery/u);
  assert.match(contentJs, /bf-action-health/u);
  assert.match(newTabJs, /isHealthQuery/u);
  assert.match(newTabJs, /openHealthInspector/u);
});

test("power suite: stash tabs, backup & restore, auto-tagging, reading list, newtab backgrounds contract", () => {
  const vm = loadSettingsModule();
  const {
    getAutoTagsForUrl,
    AUTO_TAG_RULES,
    SUPPORTED_NEWTAB_BACKGROUNDS,
    normalizeNewTabBackground,
    READING_LIST_STORAGE_KEY,
    CUSTOM_WALLPAPER_STORAGE_KEY,
    DEFAULT_SETTINGS
  } = vm.BookmarkFlowConfig;

  // Settings contract
  assert.strictEqual(DEFAULT_SETTINGS.autoTagging, true);
  assert.strictEqual(DEFAULT_SETTINGS.newTabBackground, "obsidian");
  assert.strictEqual(READING_LIST_STORAGE_KEY, "bfReadingList");
  assert.strictEqual(CUSTOM_WALLPAPER_STORAGE_KEY, "bfCustomWallpaper");
  assert.deepStrictEqual(
    SUPPORTED_NEWTAB_BACKGROUNDS,
    ["obsidian", "midnight-gradient", "emerald-aurora", "custom"]
  );
  assert.strictEqual(normalizeNewTabBackground("midnight-gradient"), "midnight-gradient");
  assert.strictEqual(normalizeNewTabBackground("invalid"), "obsidian");

  // Zero-cloud smart auto-tagging
  assert.ok(Array.isArray(AUTO_TAG_RULES) && AUTO_TAG_RULES.length >= 6);
  assert.deepStrictEqual(getAutoTagsForUrl("https://github.com/mcolaker/BookmarkFlow-Bar"), ["dev"]);
  assert.deepStrictEqual(getAutoTagsForUrl("https://chatgpt.com/"), ["ai"]);
  assert.deepStrictEqual(getAutoTagsForUrl("https://www.youtube.com/watch?v=123"), ["video"]);
  assert.deepStrictEqual(getAutoTagsForUrl("https://x.com/explore"), ["social"]);
  assert.deepStrictEqual(getAutoTagsForUrl("https://figma.com/design"), ["design"]);
  assert.deepStrictEqual(getAutoTagsForUrl("https://medium.com/story"), ["reading"]);

  // Background service worker contract
  const backgroundJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(backgroundJs, /BF_SAVE_OPEN_TABS/u);
  assert.match(backgroundJs, /BF_EXPORT_BACKUP/u);
  assert.match(backgroundJs, /BF_IMPORT_BACKUP/u);
  assert.match(backgroundJs, /BF_GET_READING_LIST/u);
  assert.match(backgroundJs, /BF_ADD_READING_LIST/u);
  assert.match(backgroundJs, /BF_REMOVE_READING_LIST/u);

  // Manifest permission
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.ok(manifest.permissions.includes("tabs"), "manifest must include tabs permission for stash open tabs");

  // Popup UI contract
  const popupHtml = readFileSync(path.join(root, "src/popup.html"), "utf8");
  const popupJs = readFileSync(path.join(root, "src/popup.js"), "utf8");
  assert.match(popupHtml, /id="autoTagging"/u);
  assert.match(popupHtml, /data-bg="midnight-gradient"/u);
  assert.match(popupHtml, /id="saveOpenTabsBtn"/u);
  assert.match(popupHtml, /id="exportBackupBtn"/u);
  assert.match(popupHtml, /id="importBackupBtn"/u);
  assert.match(popupJs, /BF_SAVE_OPEN_TABS/u);
  assert.match(popupJs, /BF_EXPORT_BACKUP/u);
  assert.match(popupJs, /BF_IMPORT_BACKUP/u);

  // New tab UI contract
  const newTabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  const newTabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newTabHtml, /id="saveOpenTabs"/u);
  assert.match(newTabHtml, /id="readingListBtn"/u);
  assert.match(newTabHtml, /id="readingDrawer"/u);
  assert.match(newTabJs, /handleSaveOpenTabs/u);
  assert.match(newTabJs, /toggleReadingDrawer/u);
  assert.match(newTabJs, /applyBackgroundSettings/u);
  assert.match(newTabCss, /body\[data-bg="midnight-gradient"\]/u);
  assert.match(newTabCss, /\.nt-reading-drawer/u);

  // Content script Spotlight quick actions contract
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /isSaveTabsQuery/u);
  assert.match(contentJs, /isReadingQuery/u);
  assert.match(contentJs, /isBackupQuery/u);
});

test("3-layer living discovery: interactive sandbox, first-run tooltip, and quick tips widget contract", () => {
  // Layer 1: Interactive Sandbox in Onboarding
  const onboardingHtml = readFileSync(path.join(root, "src/onboarding.html"), "utf8");
  const onboardingJs = readFileSync(path.join(root, "src/onboarding.js"), "utf8");
  const onboardingCss = readFileSync(path.join(root, "src/onboarding.css"), "utf8");

  assert.match(onboardingHtml, /id="interactiveSandbox"/u);
  assert.match(onboardingHtml, /id="sandboxTerminal"/u);
  assert.match(onboardingHtml, /id="sandboxCommand"/u);
  assert.match(onboardingHtml, /id="sandboxFeedback"/u);
  assert.match(onboardingJs, /initSandbox/u);
  assert.match(onboardingCss, /\.interactive-sandbox/u);
  assert.match(onboardingCss, /\.sandbox-terminal/u);

  // Layer 2: First-Run Gold Micro-Tooltip on web pages
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");

  assert.match(contentJs, /bfFirstRunTooltipSeen/u);
  assert.match(contentJs, /dismissFirstRunTooltip/u);
  assert.match(contentJs, /bf-intro-tooltip/u);
  assert.match(contentCss, /\.bf-intro-tooltip/u);
  assert.match(contentCss, /\.bf-intro-arrow/u);

  // Layer 3: Living Quick Tips in New Tab
  const newTabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  const newTabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");

  assert.match(newTabHtml, /id="quickTipsWidget"/u);
  assert.match(newTabHtml, /id="quickGuideBtn"/u);
  assert.match(newTabHtml, /id="dismissQuickTips"/u);
  assert.match(newTabJs, /quickGuideBtn/u);
  assert.match(newTabJs, /quickTipsWidget/u);
  assert.match(newTabJs, /bfQuickTipsDismissed/u);
  assert.match(newTabCss, /\.nt-quick-tips/u);
  assert.match(newTabCss, /\.nt-quick-tips-head/u);
  assert.match(newTabCss, /\.nt-tip-item/u);

  // Localization keys contract in both en and tr
  const en = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const tr = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  const requiredKeys = [
    "sandboxBadge",
    "sandboxHeading",
    "sandboxPrompt",
    "sandboxSuccess",
    "sandboxTryAction",
    "firstRunTooltipText",
    "quickTips",
    "quickTipsTitle",
    "quickTipsSubtitle",
    "tipSpotlightTitle",
    "tipSpotlightDesc",
    "tipStashTitle",
    "tipStashDesc",
    "tipReadingTitle",
    "tipReadingDesc",
    "tipHealthTitle",
    "tipHealthDesc",
    "quickGuide",
    "dismiss",
    "quickMenuHideBar",
    "quickMenuRestoreBar",
    "quickMenuDisableSite",
    "quickMenuSettings",
    "pageControlsTip"
  ];

  for (const key of requiredKeys) {
    assert.ok(en[key]?.message, `Missing en message key: ${key}`);
    assert.ok(tr[key]?.message, `Missing tr message key: ${key}`);
  }
});

test("dynamic tab injection on consent and onboarding completion workspace transition contract", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.ok(manifest.permissions.includes("scripting"), "manifest must include scripting permission for dynamic tab injection");

  const backgroundJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(backgroundJs, /async function injectContentScriptsIntoExistingTabs\(\)/u, "background.js must implement injectContentScriptsIntoExistingTabs");
  assert.match(backgroundJs, /injectContentScriptsIntoExistingTabs\(\)\.catch/u, "background.js must trigger dynamic injection");

  const onboardingJs = readFileSync(path.join(root, "src/onboarding.js"), "utf8");
  assert.match(onboardingJs, /chrome\.tabs\.create\(\{\}\)/u, "onboarding.js must open new tab workspace on finish");

  const reviewerNotes = readFileSync(path.join(root, "store/reviewer-notes.md"), "utf8");
  assert.match(reviewerNotes, /`scripting`/u, "reviewer-notes.md must document scripting permission");
});

test("launcher quick context menu and adaptive discovery contract (BF-UX-012)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /function openLauncherContextMenu\(/u, "content.js must define openLauncherContextMenu");
  assert.match(contentJs, /closest\("\.bf-mark, \.bf-restore"\)/u, "content.js must handle contextmenu on launcher mark and restore");
  assert.match(contentJs, /quick-hide-bar/u, "content.js must support quick-hide-bar action");
  assert.match(contentJs, /quick-restore-bar/u, "content.js must support quick-restore-bar action");
  assert.match(contentJs, /quick-disable-site/u, "content.js must support quick-disable-site action");
  assert.match(contentJs, /quick-open-settings/u, "content.js must support quick-open-settings action");
  assert.match(contentJs, /"is-left"/u, "content.js must adapt tooltip orientation near edge");
  assert.match(contentJs, /setTimeout\(dismissFirstRunTooltip, 5000\)/u, "content.js must dismiss first-run tooltip after 5000ms");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-intro-tooltip\.is-left/u, "content.css must style adaptive is-left tooltip");

  const popupHtml = readFileSync(path.join(root, "src/popup.html"), "utf8");
  assert.match(popupHtml, /id="pageControlsBadge"/u, "popup.html must contain pageControlsBadge element");
  assert.match(popupHtml, /data-i18n="pageControlsTip"/u, "popup.html must reference pageControlsTip translation");
});

test("link capture and quick folder selector contract (BF-UX-013)", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.omnibox?.keyword, "bf", "manifest must configure omnibox keyword 'bf'");

  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(newtabHtml, /id="addFolderSelect"/u, "newtab.html must contain addFolderSelect dropdown");
  assert.match(newtabHtml, /data-i18n="targetFolder"/u, "newtab.html must reference targetFolder localization");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /function populateFolderSelect\(/u, "newtab.js must implement populateFolderSelect");
  assert.match(newtabJs, /captureUrlToBookmark/u, "newtab.js must support captureUrlToBookmark action");
  assert.match(newtabJs, /openDirectUrl/u, "newtab.js must support openDirectUrl action");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /class="bf-add-select"/u, "content.js template must contain bf-add-select");
  assert.match(contentJs, /function populateContentFolderSelect\(/u, "content.js must implement populateContentFolderSelect");
  assert.match(contentJs, /bf-action-capture-url/u, "content.js command palette must support bf-action-capture-url");

  const backgroundJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(backgroundJs, /chrome\.omnibox\.onInputChanged\.addListener/u, "background.js must handle omnibox input changed");
  assert.match(backgroundJs, /chrome\.omnibox\.onInputEntered\.addListener/u, "background.js must handle omnibox input entered");
  assert.match(backgroundJs, /bfLastUsedFolderId/u, "background.js omnibox must support last used folder ID");

  assert.match(newtabJs, /bfLastUsedFolderId/u, "newtab.js must support last used folder memory");
  assert.match(contentJs, /bfLastUsedFolderId/u, "content.js must support last used folder memory");

  const en = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const tr = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  const requiredKeys = ["addBookmarkToTarget", "addBookmarkToTargetDesc", "openInBrowser", "openInBrowserDesc", "targetFolder", "selectFolder", "omniboxDefaultSuggestion", "omniboxAddToBar", "omniboxAddToFolder", "bookmarkAddedNotification", "bookmarksBar"];
  for (const k of requiredKeys) {
    assert.ok(en[k]?.message, `Missing en message key: ${k}`);
    assert.ok(tr[k]?.message, `Missing tr message key: ${k}`);
  }
});

test("quick folder chips contract (BF-UX-014)", () => {
  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(newtabHtml, /id="addFolderChips"/u, "newtab.html must contain addFolderChips container");

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newtabCss, /\.nt-folder-chips/u, "newtab.css must style .nt-folder-chips");
  assert.match(newtabCss, /\.nt-folder-chip/u, "newtab.css must style .nt-folder-chip");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /function renderFolderChips\(/u, "newtab.js must define renderFolderChips");
  assert.match(newtabJs, /function updateFolderChipsActive\(/u, "newtab.js must define updateFolderChipsActive");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /class="bf-folder-chips"/u, "content.js template must contain bf-folder-chips");
  assert.match(contentJs, /function renderContentFolderChips\(/u, "content.js must define renderContentFolderChips");
  assert.match(contentJs, /function updateContentFolderChipsActive\(/u, "content.js must define updateContentFolderChipsActive");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-folder-chips/u, "content.css must style .bf-folder-chips");
  assert.match(contentCss, /\.bf-folder-chip/u, "content.css must style .bf-folder-chip");

  const en = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const tr = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  assert.ok(en.quickFolders?.message, "Missing en quickFolders message");
  assert.ok(tr.quickFolders?.message, "Missing tr quickFolders message");
});

test("search live card instant folder chips contract (BF-UX-015)", () => {
  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newtabCss, /\.nt-search-action-chips/u, "newtab.css must style .nt-search-action-chips");
  assert.match(newtabCss, /\.nt-search-action-chip/u, "newtab.css must style .nt-search-action-chip");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /nt-search-action-chips/u, "newtab.js must render nt-search-action-chips in capture card");
  assert.match(newtabJs, /async function handleDirectSaveBookmark\(/u, "newtab.js must define handleDirectSaveBookmark");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-command-action-chips/u, "content.css must style .bf-command-action-chips");
  assert.match(contentCss, /\.bf-command-action-chip/u, "content.css must style .bf-command-action-chip");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /bf-command-action-chips/u, "content.js must render bf-command-action-chips in capture card");
  assert.match(contentJs, /async function handleDirectSaveBookmark\(/u, "content.js must define handleDirectSaveBookmark");

  const en = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const tr = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  assert.ok(en.saveToBar?.message, "Missing en saveToBar message");
  assert.ok(tr.saveToBar?.message, "Missing tr saveToBar message");
  assert.ok(en.saveToFolder?.message, "Missing en saveToFolder message");
  assert.ok(tr.saveToFolder?.message, "Missing tr saveToFolder message");
});

test("instant toast feedback contract (BF-UX-016)", () => {
  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(newtabHtml, /id="toastNotification"/u, "newtab.html must contain toastNotification element");
  assert.match(newtabHtml, /class="nt-toast"/u, "newtab.html must contain nt-toast class");

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newtabCss, /\.nt-toast\b/u, "newtab.css must style .nt-toast");
  assert.match(newtabCss, /\.nt-toast\.is-leaving\b/u, "newtab.css must style .nt-toast.is-leaving");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /function showToastNotification\(/u, "newtab.js must define showToastNotification");
  assert.match(newtabJs, /showToastNotification\(toastMsg/u, "newtab.js must trigger toast on direct save");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /class="bf-toast"/u, "content.js template must contain bf-toast");
  assert.match(contentJs, /function showContentToastNotification\(/u, "content.js must define showContentToastNotification");
  assert.match(contentJs, /showContentToastNotification\(toastMsg/u, "content.js must trigger toast on direct save");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-toast\b/u, "content.css must style .bf-toast");
  assert.match(contentCss, /\.bf-toast\.is-leaving\b/u, "content.css must style .bf-toast.is-leaving");

  const en = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const tr = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  assert.ok(en.bookmarkSavedToBarToast?.message, "Missing en bookmarkSavedToBarToast message");
  assert.ok(tr.bookmarkSavedToBarToast?.message, "Missing tr bookmarkSavedToBarToast message");
  assert.ok(en.bookmarkSavedToFolderToast?.message, "Missing en bookmarkSavedToFolderToast message");
  assert.ok(tr.bookmarkSavedToFolderToast?.message, "Missing tr bookmarkSavedToFolderToast message");
});

test("smart intent router and routing badges contract (BF-UX-017)", () => {
  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.ok(
    manifest.content_scripts?.[0]?.js?.includes("src/intent-router.js"),
    "manifest content_scripts must include src/intent-router.js"
  );

  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(newtabHtml, /id="searchIntentBadge"/u, "newtab.html must contain searchIntentBadge element");
  assert.match(newtabHtml, /src="intent-router\.js"/u, "newtab.html must include intent-router.js");

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newtabCss, /\.nt-intent-badge\b/u, "newtab.css must style .nt-intent-badge");
  assert.match(newtabCss, /\.nt-intent-badge\.is-url\b/u, "newtab.css must style .nt-intent-badge.is-url");
  assert.match(newtabCss, /\.nt-intent-badge\.is-command\b/u, "newtab.css must style .nt-intent-badge.is-command");
  assert.match(newtabCss, /\.nt-intent-badge\.is-tag\b/u, "newtab.css must style .nt-intent-badge.is-tag");
  assert.match(newtabCss, /\.nt-intent-badge\.is-folder\b/u, "newtab.css must style .nt-intent-badge.is-folder");
  assert.match(newtabCss, /\.nt-intent-badge\.is-tab\b/u, "newtab.css must style .nt-intent-badge.is-tab");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /searchIntentBadge:\s*document\.getElementById\("searchIntentBadge"\)/u, "newtab.js must reference searchIntentBadge");
  assert.match(newtabJs, /function updateSearchIntentBadge\(/u, "newtab.js must define updateSearchIntentBadge");
  assert.match(newtabJs, /BookmarkIntentRoutingEngine\.detectUserIntent\(/u, "newtab.js must call BookmarkIntentRoutingEngine.detectUserIntent");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /class="bf-intent-badge"/u, "content.js template must contain bf-intent-badge");
  assert.match(contentJs, /function updateCommandIntentBadge\(/u, "content.js must define updateCommandIntentBadge");
  assert.match(contentJs, /BookmarkIntentRoutingEngine\.detectUserIntent\(/u, "content.js must call BookmarkIntentRoutingEngine.detectUserIntent");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-intent-badge\b/u, "content.css must style .bf-intent-badge");

  const en = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const tr = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  const requiredKeys = [
    "intentLinkMode",
    "intentCommandMode",
    "intentTagMode",
    "intentFolderMode",
    "intentTabMode",
    "intentSearchMode"
  ];
  for (const key of requiredKeys) {
    assert.ok(en[key]?.message, `Missing en ${key} message`);
    assert.ok(tr[key]?.message, `Missing tr ${key} message`);
  }
});

test("site control, settings navigation, and popup layout integrity contract (BF-UX-018)", () => {
  const root = path.resolve(".");

  // 1. content.js & background.js MV3 settings navigation contract
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.ok(
    !contentJs.includes('window.open(chrome.runtime.getURL("src/bookmark-maintenance.html")'),
    "content.js must not call window.open on bookmark-maintenance.html (triggers MV3 ERR_BLOCKED_BY_CLIENT)"
  );
  assert.match(
    contentJs,
    /type:\s*["']BF_OPEN_SETTINGS["']/u,
    "content.js must dispatch BF_OPEN_SETTINGS message to background service worker"
  );
  assert.match(
    contentJs,
    /showContentToastNotification\(t\(["']siteDisabledToast["']\)/u,
    "content.js must display siteDisabledToast when site is disabled"
  );

  const backgroundJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(
    backgroundJs,
    /const MESSAGE_OPEN_SETTINGS = ["']BF_OPEN_SETTINGS["']/u,
    "background.js must define MESSAGE_OPEN_SETTINGS constant"
  );
  assert.match(
    backgroundJs,
    /message\?\.type === MESSAGE_OPEN_SETTINGS/u,
    "background.js must route MESSAGE_OPEN_SETTINGS to chrome.tabs.create"
  );

  // 2. popup.html & popup.css layout integrity contract
  const popupHtml = readFileSync(path.join(root, "src/popup.html"), "utf8");
  assert.match(
    popupHtml,
    /<section id="siteControl" class="site-control" hidden>/u,
    "popup.html must contain siteControl section"
  );
  const siteControlIndex = popupHtml.indexOf('id="siteControl"');
  const consentGateIndex = popupHtml.indexOf('id="popupConsentGate"');
  assert.ok(
    siteControlIndex < consentGateIndex,
    "siteControl must appear at the top of popup before general settings"
  );
  assert.match(
    popupHtml,
    /<div class="backup-row">[\s\S]*?<\/div>\s*<p id="backupStatus"/u,
    "popup.html .backup-row must be properly closed and not swallow subsequent elements"
  );

  // 3. bookmark-maintenance.html & bookmark-maintenance.js disabled sites management
  const maintHtml = readFileSync(path.join(root, "src/bookmark-maintenance.html"), "utf8");
  assert.match(
    maintHtml,
    /id="navSitesLink"/u,
    "bookmark-maintenance.html must include navSitesLink"
  );
  assert.match(
    maintHtml,
    /id="disabledSitesList"/u,
    "bookmark-maintenance.html must include disabledSitesList"
  );
  assert.match(
    maintHtml,
    /id="addDisabledHostBtn"/u,
    "bookmark-maintenance.html must include addDisabledHostBtn"
  );

  const maintJs = readFileSync(path.join(root, "src/bookmark-maintenance.js"), "utf8");
  assert.match(
    maintJs,
    /function loadDisabledSites\(/u,
    "bookmark-maintenance.js must define loadDisabledSites"
  );
  assert.match(
    maintJs,
    /function removeSiteFromDisabled\(/u,
    "bookmark-maintenance.js must define removeSiteFromDisabled"
  );
  assert.match(
    maintJs,
    /function handleAddDisabledHost\(/u,
    "bookmark-maintenance.js must define handleAddDisabledHost"
  );

  // 4. i18n locale parity
  const en = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const tr = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  const newKeys = [
    "siteDisabledToast",
    "navSites",
    "disabledSitesHeading",
    "disabledSitesDescription",
    "addDisabledHost",
    "addSitePlaceholder",
    "disabledSitesEmpty",
    "removeDisabledHost",
    "hostAddedSuccess",
    "hostRemovedSuccess",
    "invalidHostError",
    "disabledWebsitesAria",
    "undo",
    "bookmarkDeletedToast"
  ];
  for (const key of newKeys) {
    assert.ok(en[key]?.message, `Missing en message for key: ${key}`);
    assert.ok(tr[key]?.message, `Missing tr message for key: ${key}`);
  }

  // 5. Toast undo and live journey menu interaction contract
  assert.match(
    contentJs,
    /bf-toast-action-btn/u,
    "content.js must create .bf-toast-action-btn for undo interaction"
  );
  assert.match(
    contentJs,
    /removeDisabledHost\(currentDisabled,\s*currentHost\)/u,
    "content.js undo handler must call removeDisabledHost"
  );
  assert.match(
    contentJs,
    /contentToastKeydownHandler/u,
    "content.js must support Ctrl+Z keydown handler for toast undo"
  );
  assert.match(
    contentJs,
    /type:\s*MESSAGE_DELETE_BOOKMARK/u,
    "content.js handleDirectSaveBookmark undo must dispatch MESSAGE_DELETE_BOOKMARK"
  );

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(
    contentCss,
    /\.bf-toast-action-btn\b/u,
    "content.css must style .bf-toast-action-btn"
  );
  assert.match(
    contentCss,
    /\.bf-toast-progress\b/u,
    "content.css must style .bf-toast-progress"
  );
  assert.match(
    contentCss,
    /\.bf-toast:hover \.bf-toast-progress\b/u,
    "content.css must pause progress animation on hover"
  );
  assert.match(
    contentJs,
    /bf-toast-progress/u,
    "content.js must append .bf-toast-progress element"
  );
  assert.match(
    contentJs,
    /toast\.addEventListener\("mouseenter"/u,
    "content.js must support pause on hover (mouseenter)"
  );

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(
    newtabJs,
    /nt-toast-action-btn/u,
    "newtab.js must create .nt-toast-action-btn for undo interaction"
  );
  assert.match(
    newtabJs,
    /toastKeydownHandler/u,
    "newtab.js must support Ctrl+Z keydown handler for toast undo"
  );
  assert.match(
    newtabJs,
    /type:\s*["']BF_DELETE_BOOKMARK["']/u,
    "newtab.js handleDirectSaveBookmark undo must dispatch BF_DELETE_BOOKMARK"
  );
  assert.match(
    newtabJs,
    /nt-toast-progress/u,
    "newtab.js must append .nt-toast-progress element"
  );
  assert.match(
    newtabJs,
    /elements\.toastNotification\.addEventListener\("mouseenter"/u,
    "newtab.js must support pause on hover (mouseenter)"
  );

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(
    newtabCss,
    /\.nt-toast-action-btn\b/u,
    "newtab.css must style .nt-toast-action-btn"
  );
  assert.match(
    newtabCss,
    /\.nt-toast-progress\b/u,
    "newtab.css must style .nt-toast-progress"
  );
  assert.match(
    newtabCss,
    /\.nt-toast:hover \.nt-toast-progress\b/u,
    "newtab.css must pause progress animation on hover"
  );

  const journeyJs = readFileSync(path.join(root, "scripts/user-journey-live-qa.mjs"), "utf8");
  assert.match(
    journeyJs,
    /rightClickElementByClass/u,
    "user-journey-live-qa.mjs must define rightClickElementByClass"
  );
  assert.match(
    journeyJs,
    /clickElementByAttribute/u,
    "user-journey-live-qa.mjs must define clickElementByAttribute"
  );
});

test("search inline save button and green undone toast feedback contract (BF-UX-018)", () => {
  const enLocales = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trLocales = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  assert.ok(enLocales.quickSaveBookmark, "en messages must have quickSaveBookmark");
  assert.ok(trLocales.quickSaveBookmark, "tr messages must have quickSaveBookmark");

  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(
    newtabHtml,
    /id="searchInlineSaveBtn"/u,
    "newtab.html must define #searchInlineSaveBtn"
  );

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(
    newtabCss,
    /\.nt-inline-save-btn\b/u,
    "newtab.css must style .nt-inline-save-btn"
  );
  assert.match(
    newtabCss,
    /\.nt-toast\.is-undone\b/u,
    "newtab.css must style .nt-toast.is-undone"
  );

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(
    contentCss,
    /\.bf-command-inline-save\b/u,
    "content.css must style .bf-command-inline-save"
  );
  assert.match(
    contentCss,
    /\.bf-toast\.is-undone\b/u,
    "content.css must style .bf-toast.is-undone"
  );

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(
    newtabJs,
    /searchInlineSaveBtn:\s*document\.getElementById\("searchInlineSaveBtn"\)/u,
    "newtab.js must resolve searchInlineSaveBtn element"
  );
  assert.match(
    newtabJs,
    /showToastNotification\([\s\S]*?["']is-undone["']\)/u,
    "newtab.js must invoke showToastNotification with is-undone on bookmark undo"
  );

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(
    contentJs,
    /class="bf-command-inline-save"/u,
    "content.js template must include bf-command-inline-save button"
  );
  assert.match(
    contentJs,
    /action\s*===\s*["']inline-save-search["']/u,
    "content.js must handle inline-save-search action"
  );
  assert.match(
    contentJs,
    /showContentToastNotification\([\s\S]*?["']is-undone["']\)/u,
    "content.js must invoke showContentToastNotification with is-undone on undo"
  );
});
