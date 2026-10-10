import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  const designTokensCss = readFileSync(path.join(root, "src/design-tokens.css"), "utf8");
  const spotlightCss = readFileSync(path.join(root, "src/spotlight.css"), "utf8");
  const settingsCss = readFileSync(path.join(root, "src/settings.css"), "utf8");

  const supportedThemes = ["gold-obsidian", "oled-black", "emerald-matrix", "cyber-indigo", "turquoise-glow"];

  for (const theme of supportedThemes) {
    assert.match(settingsSource, new RegExp(`"${theme}"`, "u"));
    assert.match(popupHtml, new RegExp(`data-theme="${theme}"`, "u"));
    if (theme !== "gold-obsidian") {
      assert.match(popupCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
      assert.match(newTabCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
      assert.match(contentCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
      assert.match(designTokensCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
      assert.match(spotlightCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
      assert.match(settingsCss, new RegExp(`\\[data-theme="${theme}"\\]`, "u"));
    }
  }

  assert.match(popupSource, /document\.documentElement\.dataset\.theme\s*=/u);
  assert.match(newTabSource, /document\.documentElement\.dataset\.theme\s*=/u);
  assert.match(contentSource, /host\.dataset\.theme\s*=/u);
  assert.match(contentSource, /app\.dataset\.theme\s*=/u);
  assert.match(popupHtml, /data-bg="turquoise-abyss"/u);
  assert.match(newTabCss, /body\[data-bg="turquoise-abyss"\]/u);
  assert.match(newTabCss, /--nt-folder-accent:\s*#22d3ee/u);
  assert.match(contentCss, /--bf-folder-accent:\s*#22d3ee/u);
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
    ["obsidian", "midnight-gradient", "emerald-aurora", "turquoise-abyss", "custom"]
  );
  assert.strictEqual(normalizeNewTabBackground("midnight-gradient"), "midnight-gradient");
  assert.strictEqual(normalizeNewTabBackground("turquoise-abyss"), "turquoise-abyss");
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
  assert.ok(enLocales.quickSaveToBar, "en messages must have quickSaveToBar");
  assert.ok(trLocales.quickSaveToBar, "tr messages must have quickSaveToBar");
  assert.ok(enLocales.quickSaveToFolder, "en messages must have quickSaveToFolder");
  assert.ok(trLocales.quickSaveToFolder, "tr messages must have quickSaveToFolder");
  assert.ok(enLocales.undoWithShortcut, "en messages must have undoWithShortcut");
  assert.ok(trLocales.undoWithShortcut, "tr messages must have undoWithShortcut");

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
    /\.nt-inline-save-btn\.is-leaving\b/u,
    "newtab.css must style .nt-inline-save-btn.is-leaving for smooth exit"
  );
  assert.match(
    newtabCss,
    /@keyframes\s+ntInlineSaveEnter\b/u,
    "newtab.css must define @keyframes ntInlineSaveEnter"
  );
  assert.match(
    newtabCss,
    /\.nt-toast\.is-undone\b/u,
    "newtab.css must style .nt-toast.is-undone"
  );
  assert.match(
    newtabCss,
    /\.nt-search-box\.is-saved-flash\b/u,
    "newtab.css must style .nt-search-box.is-saved-flash"
  );
  assert.match(
    newtabCss,
    /\.nt-search-box\.is-restored\b/u,
    "newtab.css must style .nt-search-box.is-restored"
  );
  assert.match(
    newtabCss,
    /@keyframes\s+ntSearchRestoredFlash\b/u,
    "newtab.css must define @keyframes ntSearchRestoredFlash"
  );

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(
    contentCss,
    /\.bf-command-inline-save\b/u,
    "content.css must style .bf-command-inline-save"
  );
  assert.match(
    contentCss,
    /\.bf-command-inline-save\.is-leaving\b/u,
    "content.css must style .bf-command-inline-save.is-leaving for smooth exit"
  );
  assert.match(
    contentCss,
    /@keyframes\s+bfCommandInlineSaveEnter\b/u,
    "content.css must define @keyframes bfCommandInlineSaveEnter"
  );
  assert.match(
    contentCss,
    /\.bf-toast\.is-undone\b/u,
    "content.css must style .bf-toast.is-undone"
  );
  assert.match(
    contentCss,
    /\.bf-command-head\.is-saved-flash\b/u,
    "content.css must style .bf-command-head.is-saved-flash"
  );
  assert.match(
    contentCss,
    /\.bf-command-head\.is-restored\b/u,
    "content.css must style .bf-command-head.is-restored"
  );
  assert.match(
    contentCss,
    /@keyframes\s+bfCommandRestoredFlash\b/u,
    "content.css must define @keyframes bfCommandRestoredFlash"
  );

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(
    newtabJs,
    /searchInlineSaveBtn:\s*document\.getElementById\("searchInlineSaveBtn"\)/u,
    "newtab.js must resolve searchInlineSaveBtn element"
  );
  assert.match(
    newtabJs,
    /getQuickSaveTargetInfo\s*\(/u,
    "newtab.js must define getQuickSaveTargetInfo for dynamic tooltip"
  );
  assert.match(
    newtabJs,
    /triggerSearchSaveFlash\s*\(/u,
    "newtab.js must define triggerSearchSaveFlash"
  );
  assert.match(
    newtabJs,
    /triggerSearchRestoredFlash\s*\(/u,
    "newtab.js must define triggerSearchRestoredFlash"
  );
  assert.match(
    newtabJs,
    /hideInlineSaveBtnSmoothly\s*\(/u,
    "newtab.js must define hideInlineSaveBtnSmoothly for smooth button fade out"
  );
  assert.match(
    newtabJs,
    /lastDirectSavedUrl/u,
    "newtab.js must track lastDirectSavedUrl"
  );
  assert.match(
    newtabJs,
    /lastEscapeClearedSearchText/u,
    "newtab.js must track lastEscapeClearedSearchText"
  );
  assert.match(
    newtabJs,
    /elements\.searchInput\.value\s*=\s*lastDirectSavedUrl/u,
    "newtab.js must restore lastDirectSavedUrl to searchInput on undo"
  );
  assert.match(
    newtabJs,
    /elements\.searchInput\.value\s*=\s*lastEscapeClearedSearchText/u,
    "newtab.js must restore lastEscapeClearedSearchText on Ctrl+Z"
  );
  assert.match(
    newtabJs,
    /\(event\.key\s*===\s*["']s["']\s*\|\|\s*event\.key\s*===\s*["']S["']\)[\s\S]*?searchInlineSaveBtn/u,
    "newtab.js must support Ctrl+S / Cmd+S shortcut to trigger inline save"
  );
  assert.match(
    newtabJs,
    /showToastNotification\([\s\S]*?["']is-undone["']\)/u,
    "newtab.js must invoke showToastNotification with is-undone on bookmark undo"
  );
  assert.match(
    newtabJs,
    /undoWithShortcut/u,
    "newtab.js must use undoWithShortcut key in toast action"
  );

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(
    contentJs,
    /class="bf-command-inline-save"/u,
    "content.js template must include bf-command-inline-save button"
  );
  assert.match(
    contentJs,
    /getContentQuickSaveTargetInfo\s*\(/u,
    "content.js must define getContentQuickSaveTargetInfo for dynamic tooltip"
  );
  assert.match(
    contentJs,
    /triggerCommandSaveFlash\s*\(/u,
    "content.js must define triggerCommandSaveFlash"
  );
  assert.match(
    contentJs,
    /triggerCommandRestoredFlash\s*\(/u,
    "content.js must define triggerCommandRestoredFlash"
  );
  assert.match(
    contentJs,
    /hideCommandInlineSaveBtnSmoothly\s*\(/u,
    "content.js must define hideCommandInlineSaveBtnSmoothly for smooth button fade out"
  );
  assert.match(
    contentJs,
    /lastCommandDirectSavedUrl/u,
    "content.js must track lastCommandDirectSavedUrl"
  );
  assert.match(
    contentJs,
    /lastEscapeClearedCommandText/u,
    "content.js must track lastEscapeClearedCommandText"
  );
  assert.match(
    contentJs,
    /commandQuery\s*=\s*lastCommandDirectSavedUrl/u,
    "content.js must restore lastCommandDirectSavedUrl on undo"
  );
  assert.match(
    contentJs,
    /input\.value\s*=\s*lastEscapeClearedCommandText/u,
    "content.js must restore lastEscapeClearedCommandText on Ctrl+Z"
  );
  assert.match(
    contentJs,
    /\(event\.key\s*===\s*["']s["']\s*\|\|\s*event\.key\s*===\s*["']S["']\)[\s\S]*?bf-command-inline-save/u,
    "content.js must support Ctrl+S / Cmd+S shortcut to trigger inline save"
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
  assert.match(
    contentJs,
    /undoWithShortcut/u,
    "content.js must use undoWithShortcut key in toast action"
  );
});

test("text restore toast and live existing bookmark title preview contract (BF-UX-018)", () => {
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  assert.ok(enMessages.queryRestoredToast, "EN must define queryRestoredToast");
  assert.ok(trMessages.queryRestoredToast, "TR must define queryRestoredToast");
  assert.ok(enMessages.existingBookmarkNotice, "EN must define existingBookmarkNotice");
  assert.ok(trMessages.existingBookmarkNotice, "TR must define existingBookmarkNotice");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(
    newtabJs,
    /function\s+findExistingBookmarkByUrl\s*\(/u,
    "newtab.js must define findExistingBookmarkByUrl"
  );
  assert.match(
    newtabJs,
    /function\s+normalizeUrlForMatch\s*\(/u,
    "newtab.js must define normalizeUrlForMatch"
  );
  assert.match(
    newtabJs,
    /existingBookmarkNotice/u,
    "newtab.js must use existingBookmarkNotice"
  );
  assert.match(
    newtabJs,
    /showToastNotification\([\s\S]*?queryRestoredToast[\s\S]*?["']is-undone["']\)/u,
    "newtab.js must invoke showToastNotification with queryRestoredToast on Ctrl+Z restore"
  );

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(
    contentJs,
    /function\s+findExistingBookmarkByUrl\s*\(/u,
    "content.js must define findExistingBookmarkByUrl"
  );
  assert.match(
    contentJs,
    /function\s+normalizeUrlForMatch\s*\(/u,
    "content.js must define normalizeUrlForMatch"
  );
  assert.match(
    contentJs,
    /existingBookmarkNotice/u,
    "content.js must use existingBookmarkNotice"
  );
  assert.match(
    contentJs,
    /showContentToastNotification\([\s\S]*?queryRestoredToast[\s\S]*?["']is-undone["']\)/u,
    "content.js must invoke showContentToastNotification with queryRestoredToast on Ctrl+Z restore"
  );
});

test("existing bookmark edit mode and smooth toast switching contract (BF-UX-018)", () => {
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  assert.ok(enMessages.editBookmark, "EN must define editBookmark");
  assert.ok(trMessages.editBookmark, "TR must define editBookmark");
  assert.ok(enMessages.quickEditExistingBookmark, "EN must define quickEditExistingBookmark");
  assert.ok(trMessages.quickEditExistingBookmark, "TR must define quickEditExistingBookmark");
  assert.ok(enMessages.bookmarkUpdatedToast, "EN must define bookmarkUpdatedToast");
  assert.ok(trMessages.bookmarkUpdatedToast, "TR must define bookmarkUpdatedToast");

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newtabCss, /\.nt-inline-save-btn\.is-edit-mode/u, "newtab.css must style .nt-inline-save-btn.is-edit-mode");
  assert.match(newtabCss, /\.nt-toast\.is-switching/u, "newtab.css must style .nt-toast.is-switching");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-command-inline-save\.is-edit-mode/u, "content.css must style .bf-command-inline-save.is-edit-mode");
  assert.match(contentCss, /\.bf-toast\.is-switching/u, "content.css must style .bf-toast.is-switching");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /is-edit-mode/u, "newtab.js must use is-edit-mode");
  assert.match(newtabJs, /is-switching/u, "newtab.js must trigger is-switching on toast switch");
  assert.match(newtabJs, /dataset\.editNodeId/u, "newtab.js must handle editNodeId in add dialog");
  assert.match(newtabJs, /quickEditExistingBookmark/u, "newtab.js must use quickEditExistingBookmark key");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /is-edit-mode/u, "content.js must use is-edit-mode");
  assert.match(contentJs, /is-switching/u, "content.js must trigger is-switching on toast switch");
  assert.match(contentJs, /dataset\.editNodeId/u, "content.js must handle editNodeId in add dialog");
  assert.match(contentJs, /quickEditExistingBookmark/u, "content.js must use quickEditExistingBookmark key");
});

test("edit mode url unlock and live folder move chips contract (BF-UX-018)", () => {
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  assert.ok(enMessages.unlockUrl, "EN must define unlockUrl");
  assert.ok(trMessages.unlockUrl, "TR must define unlockUrl");
  assert.ok(enMessages.lockUrl, "EN must define lockUrl");
  assert.ok(trMessages.lockUrl, "TR must define lockUrl");
  assert.ok(enMessages.moveToBar, "EN must define moveToBar");
  assert.ok(trMessages.moveToBar, "TR must define moveToBar");
  assert.ok(enMessages.moveToFolder, "EN must define moveToFolder");
  assert.ok(trMessages.moveToFolder, "TR must define moveToFolder");
  assert.ok(enMessages.bookmarkMovedToFolderToast, "EN must define bookmarkMovedToFolderToast");
  assert.ok(trMessages.bookmarkMovedToFolderToast, "TR must define bookmarkMovedToFolderToast");
  assert.ok(enMessages.bookmarkMovedBackToast, "EN must define bookmarkMovedBackToast");
  assert.ok(trMessages.bookmarkMovedBackToast, "TR must define bookmarkMovedBackToast");
  assert.ok(enMessages.existingBookmarkWithFolderNotice, "EN must define existingBookmarkWithFolderNotice");
  assert.ok(trMessages.existingBookmarkWithFolderNotice, "TR must define existingBookmarkWithFolderNotice");

  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(newtabHtml, /id="addUrlUnlockBtn"/u, "newtab.html must define addUrlUnlockBtn");
  assert.match(newtabHtml, /class="nt-url-input-wrap"/u, "newtab.html must define nt-url-input-wrap");

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newtabCss, /\.nt-url-input-wrap/u, "newtab.css must style .nt-url-input-wrap");
  assert.match(newtabCss, /\.nt-url-unlock-btn/u, "newtab.css must style .nt-url-unlock-btn");
  assert.match(newtabCss, /\.nt-search-action-chip\.is-move-chip/u, "newtab.css must style .nt-search-action-chip.is-move-chip");

  const contentHtml = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentHtml, /bf-url-unlock-btn/u, "content.js must template bf-url-unlock-btn");
  assert.match(contentHtml, /bf-url-input-wrap/u, "content.js must template bf-url-input-wrap");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-url-input-wrap/u, "content.css must style .bf-url-input-wrap");
  assert.match(contentCss, /\.bf-url-unlock-btn/u, "content.css must style .bf-url-unlock-btn");
  assert.match(contentCss, /\.bf-command-action-chip\.is-move-chip/u, "content.css must style .bf-command-action-chip.is-move-chip");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /addUrlUnlockBtn/u, "newtab.js must wire addUrlUnlockBtn");
  assert.match(newtabJs, /handleMoveBookmarkToFolder/u, "newtab.js must define handleMoveBookmarkToFolder");
  assert.match(newtabJs, /is-move-chip/u, "newtab.js must create is-move-chip for folder move");
  assert.match(newtabJs, /BF_MOVE_TO_FOLDER/u, "newtab.js must dispatch BF_MOVE_TO_FOLDER");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /handleContentMoveBookmarkToFolder/u, "content.js must define handleContentMoveBookmarkToFolder");
  assert.match(contentJs, /is-move-chip/u, "content.js must create is-move-chip for folder move");
  assert.match(contentJs, /MESSAGE_MOVE_TO_FOLDER/u, "content.js must define MESSAGE_MOVE_TO_FOLDER");

  const bgJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(bgJs, /MESSAGE_MOVE_TO_FOLDER/u, "background.js must define MESSAGE_MOVE_TO_FOLDER");
  assert.match(bgJs, /function\s+moveBookmarkToFolder\s*\(/u, "background.js must define moveBookmarkToFolder");
});

test("url auto-complete https and folder picker dropdown chip contract (BF-UX-018)", () => {
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  assert.ok(enMessages.otherFolders, "EN must define otherFolders");
  assert.ok(trMessages.otherFolders, "TR must define otherFolders");
  assert.ok(enMessages.chooseFolderToMove, "EN must define chooseFolderToMove");
  assert.ok(trMessages.chooseFolderToMove, "TR must define chooseFolderToMove");
  assert.ok(enMessages.currentFolderTag, "EN must define currentFolderTag");
  assert.ok(trMessages.currentFolderTag, "TR must define currentFolderTag");
  assert.ok(enMessages.urlAutoCompletedHttps, "EN must define urlAutoCompletedHttps");
  assert.ok(trMessages.urlAutoCompletedHttps, "TR must define urlAutoCompletedHttps");

  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  assert.match(newtabCss, /\.nt-url-input-wrap\s+input\.is-invalid-url/u, "newtab.css must style input.is-invalid-url");
  assert.match(newtabCss, /\.nt-search-action-chip\.is-folder-picker-chip/u, "newtab.css must style is-folder-picker-chip");
  assert.match(newtabCss, /\.nt-folder-picker-menu/u, "newtab.css must style nt-folder-picker-menu");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-url-input-wrap\s+input\.is-invalid-url/u, "content.css must style input.is-invalid-url");
  assert.match(contentCss, /\.bf-command-action-chip\.is-folder-picker-chip/u, "content.css must style is-folder-picker-chip");
  assert.match(contentCss, /\.bf-folder-picker-menu/u, "content.css must style bf-folder-picker-menu");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /is-invalid-url/u, "newtab.js must handle is-invalid-url");
  assert.match(newtabJs, /is-folder-picker-chip/u, "newtab.js must create is-folder-picker-chip");
  assert.match(newtabJs, /showFolderPickerMenu/u, "newtab.js must define showFolderPickerMenu");
  assert.match(newtabJs, /closeFolderPickerMenu/u, "newtab.js must define closeFolderPickerMenu");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /is-invalid-url/u, "content.js must handle is-invalid-url");
  assert.match(contentJs, /is-folder-picker-chip/u, "content.js must create is-folder-picker-chip");
  assert.match(contentJs, /showContentFolderPickerMenu/u, "content.js must define showContentFolderPickerMenu");
  assert.match(contentJs, /closeContentFolderPickerMenu/u, "content.js must define closeContentFolderPickerMenu");
});

test("autonomous video trigger authority and lifecycle contract (BF-QA-004)", () => {
  const inspectMotion = readFileSync(path.join(root, "scripts/inspect-motion-qa.mjs"), "utf8");
  assert.match(inspectMotion, /function getArtifactDirectory/u, "inspect-motion-qa.mjs must define getArtifactDirectory");
  assert.match(inspectMotion, /function detectAutonomousSurfaces/u, "inspect-motion-qa.mjs must define detectAutonomousSurfaces");
  assert.match(inspectMotion, /inspectSingleSurface/u, "inspect-motion-qa.mjs must define inspectSingleSurface");
  assert.match(inspectMotion, /--autonomous/u, "inspect-motion-qa.mjs must support autonomous flag");
  assert.match(inspectMotion, /_issue\.webm/u, "inspect-motion-qa.mjs must auto-preserve issue video with _issue suffix");
  assert.match(inspectMotion, /\[ARTIFACT:\s+/u, "inspect-motion-qa.mjs must emit ARTIFACT token on issue or trace");
  assert.match(inspectMotion, /Auto-Purge/u, "inspect-motion-qa.mjs must declare Auto-Purge lifecycle");

  const agents = readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /Otonom Video İnisiyatifi/u, "AGENTS.md must declare Autonomous Video Trigger Authority");

  const uiPlaybook = readFileSync(path.join(root, "docs/agent-playbooks/ui_accessibility.md"), "utf8");
  assert.match(uiPlaybook, /Yapay Zeka Otonom İnisiyatifi/u, "ui_accessibility.md must detail autonomous video authority");
  assert.match(uiPlaybook, /Statik Yüzeyler/u, "ui_accessibility.md must separate static surfaces");
  assert.match(uiPlaybook, /Dinamik \/ Hareketli Yüzeyler/u, "ui_accessibility.md must separate dynamic surfaces");
  assert.match(uiPlaybook, /Otomatik Kusur Saklama/u, "ui_accessibility.md must define auto artifact preservation");
  assert.match(uiPlaybook, /Otomatik Yaşam Döngüsü/u, "ui_accessibility.md must define auto-purge lifecycle");

  const journeyJs = readFileSync(path.join(root, "scripts/user-journey-live-qa.mjs"), "utf8");
  assert.match(journeyJs, /startFpsTracker/u, "user-journey-live-qa.mjs must define startFpsTracker");
  assert.match(journeyJs, /stopFpsTracker/u, "user-journey-live-qa.mjs must define stopFpsTracker");
  assert.match(journeyJs, /evaluateAndTriggerMotionQa/u, "user-journey-live-qa.mjs must define evaluateAndTriggerMotionQa");
  assert.match(journeyJs, /jankThreshold/u, "user-journey-live-qa.mjs must support jankThreshold option");
  assert.match(journeyJs, /Performance\.enable/u, "user-journey-live-qa.mjs must enable Performance domain");
  assert.match(journeyJs, /Animation\.enable/u, "user-journey-live-qa.mjs must enable Animation domain");
});

test("autonomous devtools shadow DOM isolation, a11y focus ring and design tokens contract (BF-GOV-011)", () => {
  const designTokensPath = path.join(root, "src/design-tokens.css");
  assert.ok(existsSync(designTokensPath), "src/design-tokens.css must exist");

  const designTokens = readFileSync(designTokensPath, "utf8");
  assert.match(designTokens, /--bf-token-gold-primary/u, "design-tokens.css must define gold primary token");
  assert.match(designTokens, /--bf-token-bg-base/u, "design-tokens.css must define base background token");
  assert.match(designTokens, /--bf-token-focus-outline/u, "design-tokens.css must define focus outline token");
  assert.match(designTokens, /--bf-token-focus-shadow/u, "design-tokens.css must define focus shadow token");
  assert.match(designTokens, /--bf-token-blur-modal/u, "design-tokens.css must define blur token");
  assert.match(designTokens, /prefers-reduced-motion/u, "design-tokens.css must support reduced-motion");

  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  const webResources = manifest.web_accessible_resources?.[0]?.resources || [];
  assert.ok(webResources.includes("src/design-tokens.css"), "manifest.json must declare src/design-tokens.css as web_accessible_resource");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /BF_INSPECT_ISOLATION/u, "content.js must handle BF_INSPECT_ISOLATION message");
  assert.match(contentJs, /shadowModeClosed/u, "content.js must verify shadowModeClosed in isolation check");
  assert.match(contentJs, /hasFocusRing/u, "content.js must verify a11y focus ring in isolation check");

  const journeyJs = readFileSync(path.join(root, "scripts/user-journey-live-qa.mjs"), "utf8");
  assert.match(journeyJs, /BF_INSPECT_ISOLATION/u, "user-journey-live-qa.mjs must trigger BF_INSPECT_ISOLATION");
  assert.match(journeyJs, /aggressive-host-styles/u, "user-journey-live-qa.mjs must inject aggressive styles to test isolation");
  assert.match(journeyJs, /Comic Sans MS/u, "user-journey-live-qa.mjs must test font isolation against Comic Sans");
});

test("high contrast forced-colors mode and global design tokens propagation contract across spotlight and settings (BF-GOV-012)", () => {
  const designTokensPath = path.join(root, "src/design-tokens.css");
  const designTokens = readFileSync(designTokensPath, "utf8");
  assert.match(designTokens, /forced-colors:\s*active/u, "design-tokens.css must support forced-colors high contrast");
  assert.match(designTokens, /Highlight/u, "design-tokens.css must use system Highlight in forced-colors mode");
  assert.match(designTokens, /CanvasText/u, "design-tokens.css must use system CanvasText in forced-colors mode");

  const spotlightPath = path.join(root, "src/spotlight.css");
  assert.ok(existsSync(spotlightPath), "src/spotlight.css must exist");
  const spotlightCss = readFileSync(spotlightPath, "utf8");
  assert.match(spotlightCss, /@import\s+["']\.\/design-tokens\.css["']/u, "spotlight.css must import design-tokens.css");
  assert.match(spotlightCss, /--bf-spotlight-/u, "spotlight.css must define spotlight component tokens");
  assert.match(spotlightCss, /\.bf-command\b/u, "spotlight.css must style .bf-command");
  assert.match(spotlightCss, /prefers-reduced-motion/u, "spotlight.css must support reduced-motion");
  assert.match(spotlightCss, /forced-colors:\s*active/u, "spotlight.css must support forced-colors");

  const settingsPath = path.join(root, "src/settings.css");
  assert.ok(existsSync(settingsPath), "src/settings.css must exist");
  const settingsCss = readFileSync(settingsPath, "utf8");
  assert.match(settingsCss, /@import\s+["']\.\/design-tokens\.css["']/u, "settings.css must import design-tokens.css");
  assert.match(settingsCss, /--settings-/u, "settings.css must define settings component tokens");
  assert.match(settingsCss, /\.maintenance\b/u, "settings.css must style .maintenance");
  assert.match(settingsCss, /prefers-reduced-motion/u, "settings.css must support reduced-motion");
  assert.match(settingsCss, /forced-colors:\s*active/u, "settings.css must support forced-colors");

  const maintenanceCss = readFileSync(path.join(root, "src/bookmark-maintenance.css"), "utf8");
  assert.match(maintenanceCss, /@import\s+["']\.\/design-tokens\.css["']/u, "bookmark-maintenance.css must import design-tokens.css");
  assert.match(maintenanceCss, /@import\s+["']\.\/settings\.css["']/u, "bookmark-maintenance.css must import settings.css");

  const popupCss = readFileSync(path.join(root, "src/popup.css"), "utf8");
  assert.match(popupCss, /@import\s+["']\.\/design-tokens\.css["']/u, "popup.css must import design-tokens.css");

  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /@import\s+["']\.\/spotlight\.css["']/u, "content.css must import spotlight.css");

  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  const webResources = manifest.web_accessible_resources?.[0]?.resources || [];
  assert.ok(webResources.includes("src/spotlight.css"), "manifest.json must declare src/spotlight.css in web_accessible_resources");
  assert.ok(webResources.includes("src/settings.css"), "manifest.json must declare src/settings.css in web_accessible_resources");

  const onboardingCss = readFileSync(path.join(root, "src/onboarding.css"), "utf8");
  assert.match(onboardingCss, /@import\s+["']\.\/design-tokens\.css["']/u, "onboarding.css must import design-tokens.css");
  assert.match(onboardingCss, /--ob-theme-/u, "onboarding.css must define onboarding component tokens");
  assert.match(onboardingCss, /forced-colors:\s*active/u, "onboarding.css must support forced-colors high contrast");

  const onboardingHtml = readFileSync(path.join(root, "src/onboarding.html"), "utf8");
  assert.match(onboardingHtml, /href="design-tokens\.css"/u, "onboarding.html must link design-tokens.css");
});

test("bar hide and restore full concealment lifecycle contract (BF-UX-019)", () => {
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /:host\(\[hidden\]\)/u, "content.css must define :host([hidden]) display none");
  assert.match(contentCss, /:host\(\.is-snoozed/u, "content.css must define :host(.is-snoozed) display none");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /host\.classList\.add\("is-snoozed"\)/u, "content.js must mark host as snoozed");
  assert.match(contentJs, /host\.classList\.remove\("is-snoozed"\)/u, "content.js must unmark host when restored");
  assert.match(contentJs, /barHiddenToast/u, "content.js must display barHiddenToast feedback");
  assert.match(contentJs, /barRestoredToast/u, "content.js must display barRestoredToast feedback");
  assert.match(contentJs, /snoozed:\s*isSnoozed/u, "getPageInfo must expose snoozed state");

  const popupJs = readFileSync(path.join(root, "src/popup.js"), "utf8");
  assert.match(popupJs, /activePage\.snoozed/u, "popup.js must detect active tab snoozed state");
  assert.match(popupJs, /siteStatusSnoozed/u, "popup.js must use siteStatusSnoozed message");

  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  assert.ok(trMessages.barHiddenToast?.message, "tr messages must define barHiddenToast");
  assert.ok(enMessages.barHiddenToast?.message, "en messages must define barHiddenToast");
  assert.ok(trMessages.barRestoredToast?.message, "tr messages must define barRestoredToast");
  assert.ok(trMessages.siteStatusSnoozed?.message, "tr messages must define siteStatusSnoozed");
  assert.ok(enMessages.siteStatusSnoozed?.message, "en messages must define siteStatusSnoozed");
});

test("popup site control restore bar button contract (BF-UX-020)", () => {
  const popupHtml = readFileSync(path.join(root, "src/popup.html"), "utf8");
  assert.match(popupHtml, /id="restoreBarBtn"/u, "popup.html must define restoreBarBtn");
  assert.match(popupHtml, /class="[^"]*site-restore-btn[^"]*"/u, "popup.html must style restoreBarBtn with site-restore-btn");
  assert.match(popupHtml, /data-i18n="restoreBar"/u, "popup.html must localize restoreBarBtn with restoreBar");
  assert.match(popupHtml, /class="site-status-row"/u, "popup.html must wrap status and button in site-status-row");

  const popupJs = readFileSync(path.join(root, "src/popup.js"), "utf8");
  assert.match(popupJs, /restoreBarBtn:\s*document\.getElementById\("restoreBarBtn"\)/u, "popup.js must register restoreBarBtn");
  assert.match(popupJs, /controls\.restoreBarBtn\.addEventListener\("click"/u, "popup.js must bind click listener to restoreBarBtn");
  assert.match(popupJs, /command:\s*"hide-restore"/u, "restoreBarBtn click must send hide-restore command");
  assert.match(popupJs, /controls\.restoreBarBtn\.hidden\s*=/u, "popup.js must toggle restoreBarBtn hidden state");

  const popupCss = readFileSync(path.join(root, "src/popup.css"), "utf8");
  assert.match(popupCss, /\.site-status-row\b/u, "popup.css must define .site-status-row");
  assert.match(popupCss, /\.site-restore-btn\b/u, "popup.css must define .site-restore-btn");
  assert.match(popupCss, /forced-colors:\s*active/u, "popup.css must support forced-colors for restore button");

  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  assert.ok(trMessages.restoreBar?.message, "tr messages must define restoreBar");
  assert.ok(enMessages.restoreBar?.message, "en messages must define restoreBar");
});

test("edge peek restore strip contract (BF-UX-021)", () => {
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  assert.match(contentCss, /\.bf-edge-restore\b/u, "content.css must define .bf-edge-restore");
  assert.match(contentCss, /:host\(\.is-snoozed\)\s+\.bf-edge-restore/u, "content.css must enable pointer-events for .bf-edge-restore under snoozed host");
  assert.match(contentCss, /\.bf-edge-restore:hover/u, "content.css must style .bf-edge-restore on hover");
  assert.match(contentCss, /forced-colors:\s*active/u, "content.css must support forced-colors for .bf-edge-restore");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /function renderEdgeRestoreStrip/u, "content.js must define renderEdgeRestoreStrip");
  assert.match(contentJs, /function removeEdgeRestoreStrip/u, "content.js must define removeEdgeRestoreStrip");
  assert.match(contentJs, /strip\.className\s*=\s*"bf-edge-restore"/u, "content.js must set bf-edge-restore class");
  assert.match(contentJs, /runExternalCommand\("hide-restore"\)/u, "content.js must trigger hide-restore on strip click");
  assert.match(contentJs, /edgeRestoreActive:/u, "getPageInfo must expose edgeRestoreActive state");
});

test("snooze badge indicator contract (BF-UX-022)", () => {
  const bgJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(bgJs, /MESSAGE_SET_TAB_SNOOZED/u, "background.js must define MESSAGE_SET_TAB_SNOOZED constant");
  assert.match(bgJs, /chrome\.action\.setBadgeText\(\{\s*text:\s*"off"/u, "background.js must set badge text to off on snooze");
  assert.match(bgJs, /chrome\.action\.setBadgeText\(\{\s*text:\s*""/u, "background.js must clear badge text on restore");
  assert.match(bgJs, /setBadgeBackgroundColor/u, "background.js must set badge background color");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /function notifyTabSnoozeState/u, "content.js must define notifyTabSnoozeState");
  assert.match(contentJs, /BF_SET_TAB_SNOOZED/u, "content.js must send BF_SET_TAB_SNOOZED message");
  assert.match(contentJs, /notifyTabSnoozeState\(true\)/u, "content.js must notify snooze on hide");
  assert.match(contentJs, /notifyTabSnoozeState\(false\)/u, "content.js must notify unsnooze on restore");

  const popupJs = readFileSync(path.join(root, "src/popup.js"), "utf8");
  assert.match(popupJs, /BF_SET_TAB_SNOOZED/u, "popup.js must send BF_SET_TAB_SNOOZED on restore click");

  const journeyJs = readFileSync(path.join(root, "scripts/user-journey-live-qa.mjs"), "utf8");
  assert.match(journeyJs, /chrome\.action\.getBadgeText/u, "user-journey-live-qa.mjs must inspect badge text via getBadgeText");
  assert.match(journeyJs, /BF-UX-022/u, "user-journey-live-qa.mjs must reference BF-UX-022");
});

test("snooze action tooltip and tabs synchronization contract (BF-UX-023)", () => {
  const bgJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(bgJs, /const\s+snoozedTabIds\s*=\s*new\s+Set\(\)/u, "background.js must maintain snoozedTabIds Set");
  assert.match(bgJs, /chrome\.action\.setTitle\(\{\s*title:\s*snoozedTitle/u, "background.js must set snoozed title via chrome.action.setTitle");
  assert.match(bgJs, /chrome\.action\.setTitle\(\{\s*title:\s*""/u, "background.js must reset title on restore via chrome.action.setTitle");
  assert.match(bgJs, /chrome\.tabs\?\.onActivated\?\.addListener/u, "background.js must register chrome.tabs.onActivated listener for tab synchronization");
  assert.match(bgJs, /chrome\.tabs\?\.onRemoved\?\.addListener/u, "background.js must register chrome.tabs.onRemoved listener to cleanup closed tabs");
  assert.match(bgJs, /chrome\.tabs\?\.onUpdated\?\.addListener/u, "background.js must register chrome.tabs.onUpdated listener for tab reloads");

  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));
  assert.ok(enMessages.actionTitleSnoozed?.message, "en messages must define actionTitleSnoozed");
  assert.ok(trMessages.actionTitleSnoozed?.message, "tr messages must define actionTitleSnoozed");
  assert.match(enMessages.actionTitleSnoozed.message, /Alt\+Shift\+H/u, "en actionTitleSnoozed must mention Alt+Shift+H");
  assert.match(trMessages.actionTitleSnoozed.message, /Alt\+Shift\+H/u, "tr actionTitleSnoozed must mention Alt+Shift+H");

  const journeyJs = readFileSync(path.join(root, "scripts/user-journey-live-qa.mjs"), "utf8");
  assert.match(journeyJs, /chrome\.action\.getTitle/u, "user-journey-live-qa.mjs must inspect tooltip title via getTitle");
  assert.match(journeyJs, /BF-UX-023/u, "user-journey-live-qa.mjs must reference BF-UX-023");
});

test("turquoise glow edge peek and search action accents contract (BF-UX-026)", () => {
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  const spotlightCss = readFileSync(path.join(root, "src/spotlight.css"), "utf8");
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");

  // Edge peek turquoise glow
  assert.match(contentCss, /:host\(\[data-theme="turquoise-glow"\]\)\s+\.bf-edge-restore:hover/u, "content.css must define turquoise glow hover for .bf-edge-restore");
  assert.match(contentCss, /:host\(\[data-theme="turquoise-glow"\]\)\s+\.bf-edge-restore:active/u, "content.css must define turquoise glow active for .bf-edge-restore");

  // Content command action chips
  assert.match(contentCss, /:host\(\[data-theme="turquoise-glow"\]\)\s+\.bf-command-action-chip:hover/u, "content.css must style action chips for turquoise-glow");

  // Spotlight command action chips
  assert.match(spotlightCss, /\[data-theme="turquoise-glow"\]\s+\.bf-command-action-chip:hover/u, "spotlight.css must style action chips for turquoise-glow");

  // New tab search action chips and inline save button
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+\.nt-search-action-chip:hover/u, "newtab.css must style action chips for turquoise-glow");
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+\.nt-inline-save-btn:hover/u, "newtab.css must style inline save button for turquoise-glow");
});

test("turquoise glow toast progress and search focus ring contract (BF-UX-027)", () => {
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  const spotlightCss = readFileSync(path.join(root, "src/spotlight.css"), "utf8");
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");

  // Content command input focus ring and toast progress
  assert.match(contentCss, /:host\(\[data-theme="turquoise-glow"\]\)\s+\.bf-command-input:focus/u, "content.css must define turquoise focus for .bf-command-input");
  assert.match(contentCss, /:host\(\[data-theme="turquoise-glow"\]\)\s+\.bf-toast:not\(\.is-undone\)\s+\.bf-toast-progress/u, "content.css must style turquoise toast progress");

  // Spotlight command input focus ring
  assert.match(spotlightCss, /\[data-theme="turquoise-glow"\]\s+\.bf-command-input:focus/u, "spotlight.css must style turquoise focus for .bf-command-input");

  // New tab search box focus-within and toast progress
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+\.nt-search-box:focus-within/u, "newtab.css must style turquoise focus-within for .nt-search-box");
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+\.nt-toast:not\(\.is-undone\)\s+\.nt-toast-progress/u, "newtab.css must style turquoise toast progress");
});

test("turquoise glow shortcuts grid and health inspector metrics contract (BF-UX-028)", () => {
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  const maintCss = readFileSync(path.join(root, "src/bookmark-maintenance.css"), "utf8");
  const maintJs = readFileSync(path.join(root, "src/bookmark-maintenance.js"), "utf8");

  // New tab shortcut card turquoise hover/focus and initial
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+\.nt-shortcut-card:hover/u, "newtab.css must style turquoise shortcut card hover");
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+\.nt-shortcut-card:hover\s+\.nt-shortcut-icon-box/u, "newtab.css must style turquoise shortcut icon box");
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+\.nt-shortcut-initial/u, "newtab.css must style turquoise shortcut initial");

  // Maintenance health inspector metrics and active filter
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+\.health-metric-card\[role="button"\]:hover/u, "bookmark-maintenance.css must style turquoise health metric hover");
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+\.health-metric-card\.is-selected/u, "bookmark-maintenance.css must style turquoise selected metric card");
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+\.health-metric-card\.healthy\s+\.metric-num/u, "bookmark-maintenance.css must style turquoise healthy counter");
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+\.health-filter-btn\.is-active/u, "bookmark-maintenance.css must style turquoise active filter button");

  // Maintenance JS loads and sets theme
  assert.match(maintJs, /document\.documentElement\.dataset\.theme\s*=\s*settings\.theme/u, "bookmark-maintenance.js must sync theme from settings");
});

test("turquoise glow clock greeting and folder merge button contract (BF-UX-029)", () => {
  const newTabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  const maintCss = readFileSync(path.join(root, "src/bookmark-maintenance.css"), "utf8");

  // New tab clock and greeting gradient styles
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+#clockDisplay/u, "newtab.css must style #clockDisplay for turquoise-glow");
  assert.match(newTabCss, /\[data-theme="turquoise-glow"\]\s+#greetingDisplay/u, "newtab.css must style #greetingDisplay for turquoise-glow");
  assert.match(newTabCss, /-webkit-background-clip:\s*text/u, "newtab.css must use -webkit-background-clip: text");
  assert.match(newTabCss, /-webkit-text-fill-color:\s*transparent/u, "newtab.css must use -webkit-text-fill-color: transparent");

  // Maintenance merge folders button turquoise action styling
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+#merge\.primary/u, "bookmark-maintenance.css must style #merge.primary for turquoise-glow");
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+#merge\.primary:hover:not\(:disabled\)/u, "bookmark-maintenance.css must style #merge.primary hover");
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+#merge\.primary:active:not\(:disabled\)/u, "bookmark-maintenance.css must style #merge.primary active");
  assert.match(maintCss, /\[data-theme="turquoise-glow"\]\s+button:focus-visible/u, "bookmark-maintenance.css must style button:focus-visible for turquoise-glow");
});

test("folder menu keyboard navigation, escape restore focus, and in-menu filter contract (BF-UX-031)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");

  // Keyboard navigation handler and keys
  assert.match(contentJs, /function handleFolderMenuKeydown\s*\(/u, "content.js must define handleFolderMenuKeydown");
  assert.match(contentJs, /event\.key === "ArrowDown"/u, "handleFolderMenuKeydown must handle ArrowDown");
  assert.match(contentJs, /event\.key === "ArrowUp"/u, "handleFolderMenuKeydown must handle ArrowUp");
  assert.match(contentJs, /event\.key === "Enter"/u, "handleFolderMenuKeydown must handle Enter");
  assert.match(contentJs, /event\.key === "Escape"/u, "handleFolderMenuKeydown must handle Escape");

  // In-menu filter input when folder has >= 15 items
  assert.match(contentJs, /entries\.length >= 15/u, "openFolderMenu must render filter input for folders with >= 15 bookmarks");
  assert.match(contentJs, /bf-menu-filter/u, "openFolderMenu must create .bf-menu-filter input");
  assert.match(contentJs, /filterInFolderPlaceholder/u, "openFolderMenu must use localized placeholder");

  // Restore focus to folder anchor on close
  assert.match(contentJs, /lastFolderAnchor\s*=\s*anchor/u, "openFolderMenu must save lastFolderAnchor");
  assert.match(contentJs, /lastFolderAnchor\.focus\(\)/u, "closeFolderMenu must restore focus to lastFolderAnchor");

  // Mouse hover resets keyboard active indicator
  assert.match(contentJs, /el\.classList\.remove\("is-keyboard-active"\)/u, "createFolderMenuLink must clear keyboard active on mouseenter");
});

test("folder menu spring physics motion and appearance keyframes contract (BF-UX-032)", () => {
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");

  // Spring physics keyframes and cubic-bezier motion
  assert.match(contentCss, /@keyframes bfMenuAppear\b/u, "content.css must define bfMenuAppear keyframe");
  assert.match(contentCss, /@keyframes bfMenuAppearBottom\b/u, "content.css must define bfMenuAppearBottom keyframe");
  assert.match(contentCss, /cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/u, "content.css must use spring cubic-bezier curve");
  assert.match(contentCss, /\.bf-menu:not\(\[hidden\]\)\s*\{[^}]*animation:\s*bfMenuAppear/u, "content.css must animate .bf-menu on open");
  assert.match(contentCss, /:host\(\.bf-bottom\)\s+\.bf-menu:not\(\[hidden\]\)\s*\{[^}]*animation:\s*bfMenuAppearBottom/u, "content.css must animate bottom menu");

  // Filter input and empty state styles
  assert.match(contentCss, /\.bf-menu-filter-wrap\b/u, "content.css must style .bf-menu-filter-wrap");
  assert.match(contentCss, /\.bf-menu-filter\b/u, "content.css must style .bf-menu-filter");
  assert.match(contentCss, /\.bf-menu-filter:focus\b/u, "content.css must style .bf-menu-filter:focus");
  assert.match(contentCss, /\.bf-menu-filter-empty\b/u, "content.css must style .bf-menu-filter-empty");

  // Keyboard active focus ring
  assert.match(contentCss, /\.bf-menu\s+\.bf-result\.is-keyboard-active\b/u, "content.css must style .is-keyboard-active");
});

test("folder menu quick clear filter micro action contract (BF-UX-033)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  // Localization keys
  assert.ok(enMessages.clearText?.message, "en messages must define clearText");
  assert.ok(trMessages.clearText?.message, "tr messages must define clearText");

  // Filter clear button creation and DOM binding
  assert.match(contentJs, /bf-menu-filter-clear/u, "content.js must create .bf-menu-filter-clear button");
  assert.match(contentJs, /filterClearBtn\.textContent\s*=\s*"×"/u, "filterClearBtn must render × character");
  assert.match(contentJs, /t\("clearText"\)/u, "filterClearBtn must use localized clearText aria-label");
  assert.match(contentJs, /filterClearBtn\.hidden\s*=\s*!filterInput\.value/u, "filterClearBtn visibility must reflect filterInput.value");

  // Click behavior: clear text, re-filter, restore focus
  assert.match(contentJs, /filterInput\.value\s*=\s*""[^;]*;\s*updateFilter\(\)/u, "filterClearBtn click must clear input and re-filter");
  assert.match(contentJs, /filterInput\.focus\(\)/u, "filterClearBtn click must return focus to input");

  // CSS styling: absolute position, padding clearance, hover and focus-visible
  assert.match(contentCss, /\.bf-menu-filter\s*\{[^}]*padding:\s*0\s+28px\s+0\s+10px/u, "content.css must pad .bf-menu-filter to prevent text overlap with clear button");
  assert.match(contentCss, /\.bf-menu-filter-clear\s*\{[^}]*position:\s*absolute/u, "content.css must position .bf-menu-filter-clear absolutely");
  assert.match(contentCss, /\.bf-menu-filter-clear\s*\{[^}]*right:\s*6px/u, "content.css must position .bf-menu-filter-clear at right: 6px");
  assert.match(contentCss, /\.bf-menu-filter-clear:focus-visible/u, "content.css must provide visible focus outline for .bf-menu-filter-clear");
});

test("folder menu item right click context menu and incognito/copy action contract (BF-UX-034)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const backgroundJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  const enMessages = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trMessages = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  // Localization keys
  assert.ok(enMessages.openInIncognitoWindow?.message, "en messages must define openInIncognitoWindow");
  assert.ok(trMessages.openInIncognitoWindow?.message, "tr messages must define openInIncognitoWindow");
  assert.ok(enMessages.addressCopiedToast?.message, "en messages must define addressCopiedToast");
  assert.ok(trMessages.addressCopiedToast?.message, "tr messages must define addressCopiedToast");

  // Folder menu item right-click context menu attachment
  assert.match(contentJs, /link\.addEventListener\("contextmenu",\s*\(event\)\s*=>/u, "createFolderMenuLink must attach contextmenu event");
  assert.match(contentJs, /openBookmarkContextMenu\(node,\s*event\.clientX,\s*event\.clientY\)/u, "folder menu link contextmenu must open context menu with coords");

  // Context menu incognito option
  assert.match(contentJs, /createContextMenuButton\("open-bookmark-incognito",\s*t\("openInIncognitoWindow"\)\)/u, "openBookmarkContextMenu must include incognito button");
  assert.match(contentJs, /action === "open-bookmark-incognito"/u, "handleAction must route open-bookmark-incognito");
  assert.match(contentJs, /function openContextBookmarkInIncognito\s*\(/u, "content.js must define openContextBookmarkInIncognito");
  assert.match(contentJs, /type:\s*"BF_OPEN_INCOGNITO"/u, "openContextBookmarkInIncognito must send BF_OPEN_INCOGNITO message");

  // Background incognito routing
  assert.match(backgroundJs, /message\?\.type === "BF_OPEN_INCOGNITO"/u, "background.js must handle BF_OPEN_INCOGNITO");
  assert.match(backgroundJs, /chrome\.windows\.create\(\{\s*incognito:\s*true/u, "background.js must create incognito window");

  // Copy address toast feedback
  assert.match(contentJs, /showContentToastNotification\(t\("addressCopiedToast"\)/u, "copyContextBookmarkUrl must show addressCopiedToast notification");
});

test("folder menu auxclick middle-click background tab contract (BF-UX-035)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const backgroundJs = readFileSync(path.join(root, "src/background.js"), "utf8");

  // Middle-click auxclick listener on folder menu link
  assert.match(contentJs, /link\.addEventListener\("auxclick",\s*\(event\)\s*=>/u, "createFolderMenuLink must attach auxclick listener");
  assert.match(contentJs, /event\.button === 1/u, "auxclick listener must check for middle mouse button (button === 1)");
  assert.match(contentJs, /type:\s*"BF_OPEN_BACKGROUND_TAB"/u, "auxclick must dispatch BF_OPEN_BACKGROUND_TAB message");

  // Background message handler
  assert.match(backgroundJs, /message\?\.type === "BF_OPEN_BACKGROUND_TAB"/u, "background.js must handle BF_OPEN_BACKGROUND_TAB");
  assert.match(backgroundJs, /chrome\.tabs\.create\(\{\s*url,\s*active:\s*false\s*\}\)/u, "background.js must create tab with active: false for background opening");
});

test("folder menu filter matching substring highlight contract (BF-UX-036)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");

  // Helper and safe DOM highlight implementation
  assert.match(contentJs, /function highlightMatchingText\s*\(/u, "content.js must define highlightMatchingText");
  assert.match(contentJs, /document\.createElement\("mark"\)/u, "highlightMatchingText must create safe <mark> element");
  assert.match(contentJs, /mark\.className\s*=\s*"bf-highlight"/u, "highlight mark element must have bf-highlight class");

  // Filter integration and raw title storage
  assert.match(contentJs, /highlightMatchingText\(titleEl,\s*rawTitle,\s*query\)/u, "updateFilter must call highlightMatchingText with query for matches");
  assert.match(contentJs, /title\.dataset\.rawTitle\s*=\s*rawTitle/u, "createResultLink must preserve original title in dataset.rawTitle");

  // CSS styling
  assert.match(contentCss, /\.bf-highlight\s*\{[^}]*background:\s*var\(--bf-theme-accent-glow/u, "content.css must style .bf-highlight background with accent glow");
  assert.match(contentCss, /\.bf-highlight\s*\{[^}]*color:\s*var\(--bf-theme-accent/u, "content.css must style .bf-highlight text color with accent");
  assert.match(contentCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-highlight\s*\{[^}]*background:\s*Highlight/u, "content.css must style .bf-highlight in forced-colors mode");
});

test("spotlight command palette and new tab search substring highlight contract (BF-UX-037)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const spotlightCss = readFileSync(path.join(root, "src/spotlight.css"), "utf8");
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");

  // Content.js Spotlight & in-bar search highlighting
  assert.match(contentJs, /highlightMatchingText\(titleEl,\s*titleEl\.dataset\.rawTitle[\s\S]*?query\)/u, "content.js must call highlightMatchingText in search or command results");
  assert.match(contentJs, /renderCommandResults[\s\S]*?highlightMatchingText\(titleEl/u, "renderCommandResults must highlight titleEl for matching search results");
  assert.match(contentJs, /renderSearchResults[\s\S]*?highlightMatchingText\(titleEl/u, "renderSearchResults must highlight titleEl for in-bar search results");

  // Spotlight.css theme tokens and forced-colors
  assert.match(spotlightCss, /\.bf-highlight\s*\{[^}]*color:\s*var\(--bf-spotlight-accent/u, "spotlight.css must style .bf-highlight color with spotlight accent");
  assert.match(spotlightCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-highlight\s*\{[^}]*background:\s*Highlight/u, "spotlight.css must style .bf-highlight in forced-colors mode");

  // New Tab search highlighting & CSS
  assert.match(newtabJs, /function highlightMatchingText\s*\(/u, "newtab.js must define highlightMatchingText helper");
  assert.match(newtabJs, /highlightMatchingText\(titleEl,\s*item\.title,\s*currentSearchQuery,\s*"nt-highlight"\)/u, "newtab.js renderSearchResults must call highlightMatchingText on bookmark items");
  assert.match(newtabCss, /\.nt-highlight,\s*\.bf-highlight\s*\{[^}]*background:\s*var\(--nt-theme-accent-glow/u, "newtab.css must style .nt-highlight with theme accent glow");
  assert.match(newtabCss, /\.nt-highlight,\s*\.bf-highlight\s*\{[^}]*color:\s*var\(--nt-theme-accent/u, "newtab.css must style .nt-highlight with theme accent");
  assert.match(newtabCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.nt-highlight,\s*\.bf-highlight\s*\{[^}]*background:\s*Highlight/u, "newtab.css must style highlight in forced-colors mode");
});

test("folder menu live filter smart tag filtering and pill glow contract (BF-UX-038)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");

  // Tag filter logic in updateFilter
  assert.match(contentJs, /isTagQuery\s*=\s*query\.startsWith\(["']#["']\)/u, "updateFilter must detect #tag query prefix");
  assert.match(contentJs, /tagPills\.some\([\s\S]*?cleanTag[\s\S]*?includes\(tagFilter\)\)/u, "updateFilter must filter items by matched tag when isTagQuery is true");
  assert.match(contentJs, /p\.classList\.toggle\(["']is-tag-matched["'],\s*cleanTag\.includes\(tagFilter\)\)/u, "updateFilter must toggle is-tag-matched on tag pills");

  // CSS styling for matched tag pill
  assert.match(contentCss, /\.bf-tag-pill\.is-tag-matched\s*\{[^}]*background:\s*var\(--bf-theme-accent/u, "content.css must style .is-tag-matched with theme accent");
  assert.match(contentCss, /\.bf-tag-pill\.is-tag-matched\s*\{[^}]*box-shadow:\s*0 0 8px/u, "content.css must add glow box-shadow to .is-tag-matched");
  assert.match(contentCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-tag-pill\.is-tag-matched/u, "content.css must support forced-colors for .is-tag-matched");
});

test("folder menu and context menu open all in tabs batch action contract (BF-UX-039)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const backgroundJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  const enLocales = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trLocales = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  // Locales
  assert.ok(enLocales.openAllInTabs, "en messages must have openAllInTabs");
  assert.ok(trLocales.openAllInTabs, "tr messages must have openAllInTabs");
  assert.ok(enLocales.openAllConfirm, "en messages must have openAllConfirm");
  assert.ok(trLocales.openAllConfirm, "tr messages must have openAllConfirm");
  assert.ok(enLocales.openAllSuccessToast, "en messages must have openAllSuccessToast");
  assert.ok(trLocales.openAllSuccessToast, "tr messages must have openAllSuccessToast");

  // Background handler
  assert.match(backgroundJs, /message\?\.type\s*===\s*["']BF_OPEN_BACKGROUND_TABS["']/u, "background.js must handle BF_OPEN_BACKGROUND_TABS");
  assert.match(backgroundJs, /chrome\.tabs\.create\(\{\s*url,\s*active:\s*false\s*\}\)/u, "background.js must open tabs with active: false");

  // Content.js header button and context menu
  assert.match(contentJs, /openFolderBookmarksInTabs\s*\(/u, "content.js must define openFolderBookmarksInTabs helper");
  assert.match(contentJs, /openAllBtn\.className\s*=\s*["']bf-menu-open-all-btn["']/u, "openFolderMenu must create .bf-menu-open-all-btn");
  assert.match(contentJs, /open-folder-all-tabs/u, "context menu must support open-folder-all-tabs action");
  assert.match(contentJs, /targetUrls\.length\s*>\s*15[\s\S]*?openAllConfirm/u, "openFolderBookmarksInTabs must confirm when opening more than 15 tabs");

  // CSS styling
  assert.match(contentCss, /\.bf-menu-open-all-btn\s*\{/u, "content.css must define .bf-menu-open-all-btn");
  assert.match(contentCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-menu-open-all-btn/u, "content.css must define forced-colors for .bf-menu-open-all-btn");
});

test("spotlight and new tab search results tag pill match highlight contract (BF-UX-040)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const spotlightCss = readFileSync(path.join(root, "src/spotlight.css"), "utf8");
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");

  // Content.js highlightMatchingTagPills
  assert.match(contentJs, /function highlightMatchingTagPills\s*\(/u, "content.js must define highlightMatchingTagPills helper");
  assert.match(contentJs, /renderSearchResults[\s\S]*?highlightMatchingTagPills\(link,\s*query\)/u, "renderSearchResults must call highlightMatchingTagPills");
  assert.match(contentJs, /renderCommandResults[\s\S]*?highlightMatchingTagPills\(link,\s*query\)/u, "renderCommandResults must call highlightMatchingTagPills");

  // Spotlight.css tag pill highlight
  assert.match(spotlightCss, /\.bf-tag-pill\.is-tag-matched\s*\{[^}]*background:\s*var\(--bf-spotlight-accent/u, "spotlight.css must style .bf-tag-pill.is-tag-matched with spotlight accent");
  assert.match(spotlightCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-tag-pill\.is-tag-matched/u, "spotlight.css must style .bf-tag-pill.is-tag-matched in forced-colors mode");

  // Newtab.js & newtab.css tag pill highlight
  assert.match(newtabJs, /tagQuery\s*&&[\s\S]*?tag\.toLowerCase\(\)\.includes\(tagQuery\)[\s\S]*?is-tag-matched/u, "newtab.js renderSearchResults must add is-tag-matched for matching tags");
  assert.match(newtabCss, /\.nt-tag-pill\.is-tag-matched\s*\{[^}]*background:\s*var\(--nt-theme-accent/u, "newtab.css must style .nt-tag-pill.is-tag-matched with theme accent");
  assert.match(newtabCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.nt-tag-pill\.is-tag-matched/u, "newtab.css must style .nt-tag-pill.is-tag-matched in forced-colors mode");
});

test("folder menu header quick add bookmark and child folder popover contract (BF-UX-041)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  const enLocales = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trLocales = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  // Locales
  assert.ok(enLocales.addBookmarkOrFolder, "en messages must have addBookmarkOrFolder");
  assert.ok(trLocales.addBookmarkOrFolder, "tr messages must have addBookmarkOrFolder");

  // Content.js header button and popover
  assert.match(contentJs, /addBtn\.className\s*=\s*["']bf-menu-add-btn["']/u, "openFolderMenu must create .bf-menu-add-btn");
  assert.match(contentJs, /addPopover\.className\s*=\s*["']bf-menu-add-popover["']/u, "openFolderMenu must create .bf-menu-add-popover");
  assert.match(contentJs, /openAddBookmarkDialog\(lastFolderAnchor,\s*\{\s*parentId:\s*folder\.id\s*\}\)/u, "addBookmarkItem must open dialog with target folder id");
  assert.match(contentJs, /createFolderFromPrompt\(folder\.id\)/u, "addChildFolderItem must prompt create child folder with folder id");
  assert.match(contentJs, /e\.key\s*===\s*["']Escape["'][\s\S]*?addPopover\.hidden\s*=\s*true/u, "addPopover must close on Escape key");

  // CSS styling
  assert.match(contentCss, /\.bf-menu-add-btn\s*\{/u, "content.css must define .bf-menu-add-btn");
  assert.match(contentCss, /\.bf-menu-add-popover\s*\{/u, "content.css must define .bf-menu-add-popover");
  assert.match(contentCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-menu-add-btn/u, "content.css must define forced-colors for .bf-menu-add-btn");
  assert.match(contentCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-menu-add-popover/u, "content.css must define forced-colors for .bf-menu-add-popover");
});

test("spotlight and new tab search smart filter chips contract (BF-UX-042)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const spotlightCss = readFileSync(path.join(root, "src/spotlight.css"), "utf8");
  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const newtabCss = readFileSync(path.join(root, "src/newtab.css"), "utf8");
  const enLocales = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trLocales = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  // 1. Locales
  assert.ok(enLocales.filterChipAll, "en messages must have filterChipAll");
  assert.ok(trLocales.filterChipAll, "tr messages must have filterChipAll");
  assert.ok(enLocales.filterChipFolders, "en messages must have filterChipFolders");
  assert.ok(trLocales.filterChipFolders, "tr messages must have filterChipFolders");
  assert.ok(enLocales.filterChipTags, "en messages must have filterChipTags");
  assert.ok(trLocales.filterChipTags, "tr messages must have filterChipTags");
  assert.ok(enLocales.filterChipReadingList, "en messages must have filterChipReadingList");
  assert.ok(trLocales.filterChipReadingList, "tr messages must have filterChipReadingList");

  // 2. Spotlight command palette filter chips in content.js and spotlight.css
  assert.match(contentJs, /class="bf-command-chips"/u, "content.js must create .bf-command-chips container");
  assert.match(contentJs, /data-chip="folders"/u, "content.js must render folders chip");
  assert.match(contentJs, /data-chip="tags"/u, "content.js must render tags chip");
  assert.match(contentJs, /data-chip="reading_list"/u, "content.js must render reading_list chip");
  assert.match(contentJs, /commandFilterCategory\s*===\s*["']folders["']/u, "renderCommandResults must handle folders category");
  assert.match(contentJs, /commandFilterCategory\s*===\s*["']tags["']/u, "renderCommandResults must handle tags category");
  assert.match(contentJs, /commandFilterCategory\s*===\s*["']reading_list["']/u, "renderCommandResults must handle reading_list category");
  assert.match(spotlightCss, /\.bf-command-chips\s*\{/u, "spotlight.css must style .bf-command-chips");
  assert.match(spotlightCss, /\.bf-filter-chip\s*\{/u, "spotlight.css must style .bf-filter-chip");
  assert.match(spotlightCss, /\.bf-filter-chip\.is-active\s*\{/u, "spotlight.css must style active .bf-filter-chip");
  assert.match(spotlightCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-filter-chip/u, "spotlight.css must support forced-colors for .bf-filter-chip");

  // 3. New Tab search filter chips in newtab.html, newtab.js, and newtab.css
  assert.match(newtabHtml, /id="searchChips"/u, "newtab.html must contain searchChips container");
  assert.match(newtabHtml, /data-chip="folders"/u, "newtab.html must contain folders chip");
  assert.match(newtabHtml, /data-chip="tags"/u, "newtab.html must contain tags chip");
  assert.match(newtabHtml, /data-chip="reading_list"/u, "newtab.html must contain reading_list chip");
  assert.match(newtabJs, /newtabFilterCategory\s*===\s*["']folders["']/u, "newtab.js must handle folders category");
  assert.match(newtabJs, /newtabFilterCategory\s*===\s*["']tags["']/u, "newtab.js must handle tags category");
  assert.match(newtabJs, /newtabFilterCategory\s*===\s*["']reading_list["']/u, "newtab.js must handle reading_list category");
  assert.match(newtabCss, /\.nt-search-chips\s*\{/u, "newtab.css must style .nt-search-chips");
  assert.match(newtabCss, /\.nt-filter-chip\s*\{/u, "newtab.css must style .nt-filter-chip");
  assert.match(newtabCss, /\.nt-filter-chip\.is-active\s*\{/u, "newtab.css must style active .nt-filter-chip");
  assert.match(newtabCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.nt-filter-chip/u, "newtab.css must support forced-colors for .nt-filter-chip");
});

test("folder menu sort modes contract (BF-UX-043)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const contentCss = readFileSync(path.join(root, "src/content.css"), "utf8");
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const enLocales = JSON.parse(readFileSync(path.join(root, "_locales/en/messages.json"), "utf8"));
  const trLocales = JSON.parse(readFileSync(path.join(root, "_locales/tr/messages.json"), "utf8"));

  // 1. Locales
  assert.ok(enLocales.sortModeDefault, "en messages must have sortModeDefault");
  assert.ok(trLocales.sortModeDefault, "tr messages must have sortModeDefault");
  assert.ok(enLocales.sortModeAz, "en messages must have sortModeAz");
  assert.ok(trLocales.sortModeAz, "tr messages must have sortModeAz");
  assert.ok(enLocales.sortModeNewest, "en messages must have sortModeNewest");
  assert.ok(trLocales.sortModeNewest, "tr messages must have sortModeNewest");
  assert.ok(enLocales.sortModeFrequent, "en messages must have sortModeFrequent");
  assert.ok(trLocales.sortModeFrequent, "tr messages must have sortModeFrequent");
  assert.ok(enLocales.sortModeCycleTooltip, "en messages must have sortModeCycleTooltip");
  assert.ok(trLocales.sortModeCycleTooltip, "tr messages must have sortModeCycleTooltip");

  // 2. Sort button and sorting logic in content.js
  assert.match(contentJs, /bf-menu-sort-btn/u, "content.js must create .bf-menu-sort-btn element");
  assert.match(contentJs, /BOOKMARK_VISITS_STORAGE_KEY/u, "content.js must define BOOKMARK_VISITS_STORAGE_KEY");
  assert.match(contentJs, /function recordBookmarkVisit\(/u, "content.js must define recordBookmarkVisit");
  assert.match(contentJs, /folderSortMode\s*===\s*["']az["']/u, "content.js must support az sort mode");
  assert.match(contentJs, /folderSortMode\s*===\s*["']newest["']/u, "content.js must support newest sort mode");
  assert.match(contentJs, /folderSortMode\s*===\s*["']frequent["']/u, "content.js must support frequent sort mode");
  assert.match(contentJs, /function applySorting\(\)/u, "content.js must define applySorting function");
  assert.match(contentJs, /dateAdded:\s*node\.dateAdded\s*\|\|\s*0/u, "content.js flattenBookmarks must pass dateAdded");

  // 3. CSS styles and forced-colors in content.css
  assert.match(contentCss, /\.bf-menu-sort-btn\s*\{/u, "content.css must style .bf-menu-sort-btn");
  assert.match(contentCss, /\.bf-menu-sort-btn:hover/u, "content.css must style .bf-menu-sort-btn:hover");
  assert.match(contentCss, /@media\s*\(forced-colors:\s*active\)[\s\S]*?\.bf-menu-sort-btn/u, "content.css must support forced-colors for .bf-menu-sort-btn");

  // 4. newtab.js consistency
  assert.match(newtabJs, /dateAdded:\s*node\.dateAdded\s*\|\|\s*0/u, "newtab.js flattenBookmarks must pass dateAdded");
});

test("spotlight and new tab filter chips W3C tablist keyboard navigation contract (BF-UX-045)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");

  // 1. Content script spotlight filter chips keyboard navigation
  assert.match(contentJs, /function handleCommandChipsKeydown\s*\(/u, "content.js must define handleCommandChipsKeydown");
  assert.match(contentJs, /commandChips\?\.addEventListener\("keydown",\s*createSafeEventHandler\(handleCommandChipsKeydown\)\)/u, "content.js must bind keydown on commandChips");
  assert.match(contentJs, /event\.key\s*===\s*["']ArrowRight["']/u, "handleCommandChipsKeydown must handle ArrowRight");
  assert.match(contentJs, /event\.key\s*===\s*["']ArrowLeft["']/u, "handleCommandChipsKeydown must handle ArrowLeft");
  assert.match(contentJs, /event\.key\s*===\s*["']Home["']/u, "handleCommandChipsKeydown must handle Home");
  assert.match(contentJs, /event\.key\s*===\s*["']End["']/u, "handleCommandChipsKeydown must handle End");
  assert.match(contentJs, /tabindex="0"/u, "content.js initial HTML must assign tabindex=0 to active chip");
  assert.match(contentJs, /tabindex="-1"/u, "content.js initial HTML must assign tabindex=-1 to inactive chips");

  // 2. New Tab search filter chips keyboard navigation
  assert.match(newtabJs, /function handleSearchChipsKeydown\s*\(/u, "newtab.js must define handleSearchChipsKeydown");
  assert.match(newtabJs, /elements\.searchChips\?\.addEventListener\("keydown",\s*handleSearchChipsKeydown\)/u, "newtab.js must bind keydown on searchChips");
  assert.match(newtabJs, /event\.key\s*===\s*["']ArrowRight["']/u, "handleSearchChipsKeydown must handle ArrowRight");
  assert.match(newtabJs, /event\.key\s*===\s*["']ArrowLeft["']/u, "handleSearchChipsKeydown must handle ArrowLeft");
  assert.match(newtabJs, /event\.key\s*===\s*["']Home["']/u, "handleSearchChipsKeydown must handle Home");
  assert.match(newtabJs, /event\.key\s*===\s*["']End["']/u, "handleSearchChipsKeydown must handle End");
  assert.match(newtabHtml, /tabindex="0"/u, "newtab.html must assign tabindex=0 to active chip");
  assert.match(newtabHtml, /tabindex="-1"/u, "newtab.html must assign tabindex=-1 to inactive chips");
});

test("folder menu persistent sort preferences contract (BF-UX-046)", () => {
  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");

  // 1. Storage key and constant declaration
  assert.match(contentJs, /FOLDER_SORT_MODES_STORAGE_KEY\s*=\s*["']bfFolderSortModes["']/u, "content.js must define FOLDER_SORT_MODES_STORAGE_KEY");
  assert.match(contentJs, /FOLDER_SORT_MODES\s*=\s*\[["']default["'],\s*["']az["'],\s*["']newest["'],\s*["']frequent["']\]/u, "content.js must define FOLDER_SORT_MODES array");

  // 2. Storage helper functions
  assert.match(contentJs, /function normalizeFolderSortModes\s*\(/u, "content.js must define normalizeFolderSortModes");
  assert.match(contentJs, /async function loadFolderSortModes\s*\(/u, "content.js must define loadFolderSortModes");
  assert.match(contentJs, /function saveFolderSortMode\s*\(/u, "content.js must define saveFolderSortMode");

  // 3. Storage changed listener and init
  assert.match(contentJs, /FOLDER_SORT_MODES_STORAGE_KEY in changes/u, "handleStorageChanged must handle FOLDER_SORT_MODES_STORAGE_KEY");
  assert.match(contentJs, /loadFolderSortModes\(\)/u, "init() Promise.all must load folder sort modes");

  // 4. openFolderMenu integration and pre-sorted rendering
  assert.match(contentJs, /folderSortModesMap\[folder\.id\]/u, "openFolderMenu must read folder-specific sort preference");
  assert.match(contentJs, /saveFolderSortMode\(folder\.id,\s*folderSortMode\)/u, "sortBtn click listener must persist folderSortMode");
  assert.match(contentJs, /const initialSorted = getSortedEntries\(\)/u, "openFolderMenu must render initial items pre-sorted");
});
