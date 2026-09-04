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
