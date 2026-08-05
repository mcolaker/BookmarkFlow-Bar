import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const markerUrl = "https://private.example/bookmarkflow-security-marker";
const injectedUrl = "https://attacker.example/bookmarkflow-synthetic-create";
const localOnlyHost = "private-console.example";
const overlayLegitimateUrl = "https://legitimate.example/bookmarkflow-overlay";
const requestedLanguage = (process.env.BOOKMARKFLOW_CHROME_LANG || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
const expectedOnboardingHeading = {
  en: "Set up your workspace in one minute",
  tr: "Çalışma alanınızı bir dakikada kurun"
};

async function main() {
const tourGeneratorSource = await fs.readFile(path.join(projectRoot, "scripts", "generate-tour-gifs.mjs"), "utf8");
assert.match(tourGeneratorSource, /fs\.mkdtemp\(path\.join\(os\.tmpdir\(\), "bookmarkflow-tour-"\)\)/, "Tour generation does not use an OS-temporary browser profile");
assert.doesNotMatch(tourGeneratorSource, /profileDir\s*=\s*path\.join\(outputRoot/, "Tour generation still stores a browser profile under the project output directory");

const chromePath = await findChrome();
const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-security-"));
const server = await startHostileServer();
const debugPort = await getFreePort();
const chromeEnvironment = { ...process.env };
if (process.platform === "linux") {
  chromeEnvironment.LANGUAGE = requestedLanguage;
  delete chromeEnvironment.LC_ALL;
  delete chromeEnvironment.LC_MESSAGES;
}
const chrome = spawn(chromePath, [
  ...(process.env.BOOKMARKFLOW_HEADLESS === "0" ? [] : ["--headless=new"]),
  ...(process.platform === "linux" ? ["--no-sandbox", "--disable-dev-shm-usage"] : []),
  "--disable-gpu",
  "--disable-sync",
  `--lang=${requestedLanguage}`,
  "--no-default-browser-check",
  "--no-first-run",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDir}`,
  `--host-resolver-rules=MAP payment.example 127.0.0.1`,
  `--disable-extensions-except=${projectRoot}`,
  `--load-extension=${projectRoot}`,
  "about:blank"
], {
  env: chromeEnvironment,
  stdio: ["ignore", "ignore", "pipe"],
  windowsHide: true
});
let chromeStderr = "";
chrome.stderr?.on("data", (chunk) => {
  chromeStderr = `${chromeStderr}${chunk}`.slice(-4000);
});

let cdp;

try {
  const browserSocket = await waitForDebugger(debugPort, () => ({
    exitCode: chrome.exitCode,
    stderr: chromeStderr.trim()
  }));
  cdp = await CdpClient.connect(browserSocket);

  const hostilePage = await createPage(cdp, server.url);
  const worker = await waitForExtensionWorker(cdp);
  const extensionId = worker.url.split("/")[2];
  const workerSession = await attach(cdp, worker.targetId);
  await waitFor(cdp, workerSession, `
    typeof chrome !== "undefined" &&
    Boolean(chrome.bookmarks && chrome.storage) &&
    chrome.i18n.getMessage("appName") === "BookmarkFlow Bar" &&
    typeof getState === "function"
  `);
  const locale = await evaluate(cdp, workerSession, `({
    language: chrome.i18n.getUILanguage().toLowerCase().startsWith("tr") ? "tr" : "en",
    onboardingHeading: chrome.i18n.getMessage("onboardingHeading")
  })`);
  assert.equal(locale.language, requestedLanguage, `Chrome locale mismatch: requested ${requestedLanguage}, got ${locale.language}`);
  assert.equal(locale.onboardingHeading, expectedOnboardingHeading[requestedLanguage], "Chrome i18n message does not match the requested locale");

  const onboarding = await createPage(cdp, `chrome-extension://${extensionId}/src/onboarding.html`);
  await waitFor(cdp, onboarding, "document.readyState === 'complete' && document.querySelector('[data-i18n=\"onboardingHeading\"]')?.textContent");
  const onboardingLocale = await evaluate(cdp, onboarding, `({
    language: document.documentElement.lang,
    heading: document.querySelector('[data-i18n="onboardingHeading"]')?.textContent,
    consentGateHidden: document.querySelector('#dataConsentGate')?.hidden,
    setupContentHidden: document.querySelector('#setupContent')?.hidden,
    privacyPolicyUrl: document.querySelector('.privacy-link')?.href
  })`);
  assert.equal(onboardingLocale.language, requestedLanguage, "Onboarding document language was not localized");
  assert.equal(onboardingLocale.heading, expectedOnboardingHeading[requestedLanguage], "Onboarding visible heading was not localized");
  assert.equal(onboardingLocale.consentGateHidden, false, "First-run privacy disclosure was hidden before consent");
  assert.equal(onboardingLocale.setupContentHidden, true, "Bookmark setup content was exposed before consent");
  assert.equal(onboardingLocale.privacyPolicyUrl, "https://mcolaker.github.io/BookmarkFlow-Bar/privacy/", "First-run disclosure did not link to the public privacy policy");

  const preConsentState = await evaluate(cdp, workerSession, `routeMessage({ type: "BF_GET_STATE" }, {})`);
  assert.equal(preConsentState.ok, false, "State access unexpectedly succeeded before consent");
  assert.equal(preConsentState.consentRequired, true, "State access did not fail closed with a consent-required response");
  await delay(500);
  const preConsentPage = await evaluate(cdp, hostilePage, `({
    hostCount: document.querySelectorAll('[id^="bookmarkflow-bar-root"]').length,
    hasExtensionStyle: Boolean(document.getElementById("bookmarkflow-bar-page-style"))
  })`);
  assert.equal(preConsentPage.hostCount, 1, "The content script inserted a host before consent");
  assert.equal(preConsentPage.hasExtensionStyle, false, "The content script inserted page styles before consent");

  const newTab = await createPage(cdp, `chrome-extension://${extensionId}/src/newtab.html`);
  const popup = await createPage(cdp, `chrome-extension://${extensionId}/src/popup.html`);
  const maintenance = await createPage(cdp, `chrome-extension://${extensionId}/src/bookmark-maintenance.html`);
  const preConsentSurfaces = {
    newTab: await evaluate(cdp, newTab, `({
      consentGateVisible: !document.querySelector('#consentGate').hidden,
      workspaceHidden: document.querySelector('#newTabWorkspace').hidden
    })`),
    popup: await evaluate(cdp, popup, `({
      consentGateVisible: !document.querySelector('#popupConsentGate').hidden,
      settingsDisabled: document.querySelector('#enabled').disabled,
      setupEnabled: !document.querySelector('#openOnboarding').disabled
    })`),
    maintenance: await evaluate(cdp, maintenance, `({
      consentGateVisible: !document.querySelector('#maintenanceConsentGate').hidden,
      controlsDisabled: document.querySelector('#folderFilter').disabled,
      setupEnabled: !document.querySelector('#openPrivacySetup').disabled
    })`)
  };
  assert.deepEqual(preConsentSurfaces.newTab, { consentGateVisible: true, workspaceHidden: true }, "New tab was not inert before consent");
  assert.deepEqual(preConsentSurfaces.popup, { consentGateVisible: true, settingsDisabled: true, setupEnabled: true }, "Popup was not inert before consent");
  assert.deepEqual(preConsentSurfaces.maintenance, { consentGateVisible: true, controlsDisabled: true, setupEnabled: true }, "Maintenance page was not inert before consent");

  await trustedClick(cdp, onboarding, "#acceptDataConsent");
  await waitFor(cdp, onboarding, "document.querySelector('#dataConsentGate').hidden && !document.querySelector('#setupContent').hidden");
  await waitFor(cdp, workerSession, `(async () => (
    await chrome.storage.local.get("bfDataConsentVersion")
  ).bfDataConsentVersion === 1)()`);
  await waitFor(cdp, newTab, "document.querySelector('#consentGate').hidden && !document.querySelector('#newTabWorkspace').hidden");
  await waitFor(cdp, popup, "document.querySelector('#popupConsentGate').hidden && !document.querySelector('#enabled').disabled");
  await waitFor(cdp, maintenance, "document.querySelector('#maintenanceConsentGate').hidden && !document.querySelector('#folderFilter').disabled");

  const multiBarContract = await evaluate(cdp, workerSession, `
    (async () => {
      const syntheticRoot = {
        id: "synthetic-root",
        title: "",
        children: [
          {
            id: "synthetic-local-bar",
            title: "Bookmarks bar",
            folderType: "bookmarks-bar",
            syncing: false,
            children: [{
              id: "synthetic-local-folder",
              parentId: "synthetic-local-bar",
              title: "Local Folder",
              syncing: false,
              children: []
            }]
          },
          {
            id: "synthetic-account-bar",
            title: "Bookmarks bar",
            folderType: "bookmarks-bar",
            syncing: true,
            children: [{
              id: "synthetic-account-folder",
              parentId: "synthetic-account-bar",
              title: "Account Folder",
              syncing: true,
              children: [{
                id: "synthetic-account-bookmark",
                parentId: "synthetic-account-folder",
                title: "Account Bookmark",
                url: "https://account.example/",
                syncing: true
              }]
            }]
          }
        ]
      };
      const state = await getState();
      return {
        selectedId: selectBookmarkBarNode(syntheticRoot).id,
        folderRailTitles: getFolderRailFolders(syntheticRoot).map((node) => node.title),
        stateHasFolderRailFolders: Array.isArray(state.folderRailFolders)
      };
    })()
  `);
  assert.equal(multiBarContract.selectedId, "synthetic-account-bar", "Account bookmark bar was not preferred over the local-only bar");
  assert.deepEqual(multiBarContract.folderRailTitles, ["Account Folder", "Local Folder"], "Multi-bar folder rail candidates were not deterministic");
  assert.equal(multiBarContract.stateHasFolderRailFolders, true, "Runtime state omitted folder rail folders");

  const folderColorMigration = await evaluate(cdp, workerSession, `
    (async () => {
      await chrome.storage.local.remove("bfFolderColorsLocalV1");
      await chrome.storage.local.set({
        folderColors: {
          sharedFolder: "#41d17d",
          localFolder: "#a78bfa"
        }
      });
      await chrome.storage.sync.set({
        folderColors: {
          accountFolder: "#f2c94c",
          sharedFolder: "#4ea1ff"
        }
      });
      await migrateFolderColorsToLocal();
      const [localState, syncState, state] = await Promise.all([
        chrome.storage.local.get(["folderColors", "bfFolderColorsLocalV1"]),
        chrome.storage.sync.get("folderColors"),
        getState()
      ]);
      return { localState, syncState, stateColors: state.settings.folderColors };
    })()
  `);
  assert.deepEqual(folderColorMigration.localState.folderColors, {
    accountFolder: "#f2c94c",
    sharedFolder: "#41d17d",
    localFolder: "#a78bfa"
  }, "Legacy synced folder colors were not merged into profile-local storage");
  assert.equal(folderColorMigration.localState.bfFolderColorsLocalV1, true, "Folder color migration marker was not stored locally");
  assert.equal("folderColors" in folderColorMigration.syncState, false, "Profile-local folder IDs remained in Chrome Sync");
  assert.deepEqual(folderColorMigration.stateColors, folderColorMigration.localState.folderColors, "Runtime settings lost migrated folder colors");

  await evaluate(cdp, workerSession, `
    (async () => {
      const [root] = await chrome.bookmarks.getTree();
      const bar = (root.children || []).find((node) => node.folderType === "bookmarks-bar" || node.id === "1");
      if (!bar) throw new Error("Bookmark Bar was not found");
      const children = await chrome.bookmarks.getChildren(bar.id);
      await Promise.all(children.map((node) => node.url
        ? chrome.bookmarks.remove(node.id)
        : chrome.bookmarks.removeTree(node.id)));
      await chrome.bookmarks.create({ parentId: bar.id, title: "Private marker", url: ${JSON.stringify(markerUrl)} });
      await chrome.storage.sync.set({ enabled: true, showOnSites: true, rows: 2 });
      await chrome.storage.local.set({ disabledHosts: [] });
      return true;
    })()
  `);

  await reloadAndWaitForContentScript(cdp, hostilePage);
  const disclosure = await evaluate(cdp, hostilePage, `
    (() => {
      const roots = [...document.querySelectorAll('[id^="bookmarkflow-bar-root"]')];
      const exposedText = window.attackerRoot?.textContent || "";
      const exposedLinks = [...(window.attackerRoot?.querySelectorAll("a") || [])]
        .map((link) => ({ href: link.href, title: link.title, text: link.textContent }));
      return {
        hostCount: roots.length,
        openRootCount: roots.filter((node) => node.shadowRoot).length,
        privateBookmarkExposed: exposedText.includes("Private marker") || exposedLinks.some((link) => link.href === ${JSON.stringify(markerUrl)}),
        hasExtensionStyle: Boolean(document.getElementById("bookmarkflow-bar-page-style"))
      };
    })()
  `);

  const dispatched = await evaluate(cdp, hostilePage, `
    (() => {
      const root = window.attackerRoot;
      const form = root?.querySelector(".bf-add-panel");
      if (!form) return false;
      form.querySelector(".bf-add-title").value = "Synthetic attacker bookmark";
      form.querySelector(".bf-add-url").value = ${JSON.stringify(injectedUrl)};
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      return true;
    })()
  `);
  await delay(500);
  const syntheticCreated = await evaluate(cdp, workerSession, `
    (async () => (await chrome.bookmarks.search({ url: ${JSON.stringify(injectedUrl)} })).length > 0)()
  `);

  assert.equal(disclosure.hasExtensionStyle, true, "The content script did not initialize on the hostile page");
  assert.equal(disclosure.privateBookmarkExposed, false, "A page-owned open ShadowRoot exposed a private bookmark");
  assert.equal(syntheticCreated, false, `A page-dispatched synthetic submit created a bookmark (form found: ${dispatched})`);

  await trustedShadowClick(cdp, hostilePage, { "data-bf-action": "add-bookmark" });
  await fillShadowInput(cdp, hostilePage, "bf-add-url", overlayLegitimateUrl);
  await trustedShadowClick(cdp, hostilePage, { class: "bf-add-primary" });
  await delay(500);
  const overlayLegitimateCreated = await evaluate(cdp, workerSession, `
    (async () => (await chrome.bookmarks.search({ url: ${JSON.stringify(overlayLegitimateUrl)} })).length > 0)()
  `);
  assert.equal(overlayLegitimateCreated, true, "A trusted click in the closed overlay no longer creates bookmarks");

  await evaluate(cdp, workerSession, `
    (async () => {
      await chrome.storage.local.remove(["disabledHosts", "bfDisabledHostsLocalV1"]);
      await chrome.storage.sync.set({ disabledHosts: [${JSON.stringify(localOnlyHost)}] });
      await migrateDisabledHostsToLocal();
      const [localState, syncState, response] = await Promise.all([
        chrome.storage.local.get(["disabledHosts", "bfDisabledHostsLocalV1"]),
        chrome.storage.sync.get("disabledHosts"),
        getState()
      ]);
      return { localState, syncState, response };
    })()
  `).then((migration) => {
    assert.deepEqual(migration.localState.disabledHosts, [localOnlyHost], "Per-site privacy choices were not migrated locally");
    assert.equal(migration.localState.bfDisabledHostsLocalV1, true, "Privacy migration marker was not stored");
    assert.equal("disabledHosts" in migration.syncState, false, "Per-site hostnames remained in Chrome Sync");
    assert.deepEqual(migration.response.settings.disabledHosts, [localOnlyHost], "Merged settings lost the local host list");
  });

  await waitFor(cdp, newTab, "document.readyState === 'complete' && !document.querySelector('#bookmarkBar').hidden");
  const newTabLocale = await evaluate(cdp, newTab, `({
    language: document.documentElement.lang,
    folderLabel: document.querySelector('[data-i18n="folders"]')?.textContent
  })`);
  assert.equal(newTabLocale.language, requestedLanguage, "New-tab document language was not localized");
  assert.equal(newTabLocale.folderLabel, chromeMessageFor(requestedLanguage, "Folders", "Klasörler"), "New-tab static copy was not localized");

  if (process.env.BOOKMARKFLOW_NEWTAB_SCREENSHOT) {
    await cdp.call("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    }, newTab);
    await delay(250);
    const screenshot = await cdp.call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    }, newTab);
    await fs.writeFile(process.env.BOOKMARKFLOW_NEWTAB_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }

  const searchApiMocked = await evaluate(cdp, newTab, `(() => {
    const originalQuery = chrome.search.query;
    chrome.search.query = async (queryInfo) => {
      window.__bookmarkFlowSearchQuery = queryInfo;
    };
    return chrome.search.query !== originalQuery;
  })()`);
  assert.equal(searchApiMocked, true, "Chrome Search API could not be instrumented for the new-tab regression");
  await fillInput(cdp, newTab, "#searchInput", "bookmarkflow default provider test");
  await trustedClick(cdp, newTab, "#searchForm button[type='submit']");
  await waitFor(cdp, newTab, "window.__bookmarkFlowSearchQuery?.text === 'bookmarkflow default provider test'");
  const searchQuery = await evaluate(cdp, newTab, "window.__bookmarkFlowSearchQuery");
  assert.deepEqual(searchQuery, {
    text: "bookmarkflow default provider test",
    disposition: "CURRENT_TAB"
  }, "New-tab search did not use Chrome's default-provider Search API contract");

  await trustedClick(cdp, newTab, "#addBookmark");
  await waitFor(cdp, newTab, "!document.querySelector('#addDialog').hidden");
  await fillInput(cdp, newTab, "#addTitle", "Legitimate UI bookmark");
  await fillInput(cdp, newTab, "#addUrl", "https://legitimate.example/bookmarkflow-ui");
  await trustedClick(cdp, newTab, "#addSubmit");
  await waitFor(cdp, newTab, "document.querySelector('#addStatus').textContent === chrome.i18n.getMessage('bookmarkAdded')");
  const legitimateCreated = await evaluate(cdp, workerSession, `
    (async () => (await chrome.bookmarks.search({ url: "https://legitimate.example/bookmarkflow-ui" })).length > 0)()
  `);
  assert.equal(legitimateCreated, true, "A trusted extension-page UI action no longer creates bookmarks");

  await evaluate(cdp, workerSession, `chrome.storage.sync.set({ autoHideSensitiveSites: true })`);
  const sensitivePage = await createPage(cdp, `http://payment.example:${server.port}/`);
  await delay(750);
  const sensitiveVisibility = await evaluate(cdp, sensitivePage, `({
    host: window.location.hostname,
    hostCount: document.querySelectorAll('[id^="bookmarkflow-bar-root"]').length,
    extensionStylePresent: Boolean(document.getElementById("bookmarkflow-bar-page-style"))
  })`);
  assert.equal(sensitiveVisibility.host, "payment.example", "Sensitive-host smoke page did not resolve to the intended host");
  assert.equal(sensitiveVisibility.hostCount, 1, "BookmarkFlow rendered on a sensitive host while auto-hide was enabled");

  await evaluate(cdp, workerSession, `
    Promise.all([
      chrome.storage.sync.set({ autoHideSensitiveSites: false }),
      chrome.storage.local.set({ disabledHosts: ["127.0.0.1"] })
    ])
  `);
  await reloadAndWaitForDocument(cdp, hostilePage);
  await delay(500);
  const disabledHostVisibility = await evaluate(cdp, hostilePage, `({
    hostCount: document.querySelectorAll('[id^="bookmarkflow-bar-root"]').length,
    extensionStylePresent: Boolean(document.getElementById("bookmarkflow-bar-page-style"))
  })`);
  assert.equal(disabledHostVisibility.hostCount, 1, "BookmarkFlow rendered on a host disabled by the user");

  await evaluate(cdp, workerSession, `Promise.all([
    chrome.storage.sync.set({ autoHideSensitiveSites: false }),
    chrome.storage.local.set({ disabledHosts: [] })
  ])`);
  const revocationPage = await createPage(cdp, server.url);
  await waitFor(cdp, revocationPage, "Boolean(document.getElementById('bookmarkflow-bar-page-style'))");
  await waitFor(cdp, revocationPage, "document.querySelectorAll('[id^=\"bookmarkflow-bar-root\"]').length >= 2");
  const revokedConsent = await evaluate(cdp, onboarding, `chrome.runtime.sendMessage({
    type: "BF_SET_DATA_CONSENT",
    consent: false
  })`);
  assert.equal(revokedConsent.consentGranted, false, "Authorized onboarding revocation did not clear consent");
  await waitFor(cdp, revocationPage, "!document.getElementById('bookmarkflow-bar-page-style')");
  await waitFor(cdp, revocationPage, "document.querySelectorAll('[id^=\"bookmarkflow-bar-root\"]').length === 1");
  await waitFor(cdp, newTab, "!document.querySelector('#consentGate').hidden && document.querySelector('#newTabWorkspace').hidden");
  await waitFor(cdp, popup, "!document.querySelector('#popupConsentGate').hidden && document.querySelector('#enabled').disabled");
  await waitFor(cdp, maintenance, "!document.querySelector('#maintenanceConsentGate').hidden && document.querySelector('#folderFilter').disabled");
  const revokedState = await evaluate(cdp, workerSession, `routeMessage({ type: "BF_GET_STATE" }, {})`);
  assert.equal(revokedState.consentRequired, true, "State access was not locked again after consent revocation");

  console.log(JSON.stringify({
    status: "pass",
    locale: {
      requested: requestedLanguage,
      worker: locale,
      newTab: newTabLocale,
      onboarding: onboardingLocale
    },
    disclosure,
    dataConsentGate: {
      preConsentState: "blocked",
      preConsentPage: "inert",
      preConsentSurfaces,
      affirmativeConsent: "pass",
      revocation: "relocked"
    },
    syntheticSubmitBlocked: !syntheticCreated,
    defaultProviderSearchApi: "pass",
    multiBookmarkBarContract: "pass",
    profileLocalFolderColors: "pass",
    legitimateOverlayBookmarkCreate: "pass",
    localHostMigration: "pass",
    legitimateBookmarkCreate: "pass",
    visibilityDecisions: {
      sensitiveHost: sensitiveVisibility,
      disabledHost: disabledHostVisibility
    },
    profileDirOutsideProject: !profileDir.startsWith(`${projectRoot}${path.sep}`),
    tourProfileLocation: "os-temporary"
  }, null, 2));
} finally {
  try {
    await cdp?.call("Browser.close");
  } catch {}
  cdp?.close();
  await waitForProcessExit(chrome);
  await closeServer(server.instance);
  await removeTemporaryProfile(profileDir);
}

function chromeMessageFor(language, english, turkish) {
  return language === "tr" ? turkish : english;
}
}

async function findChrome() {
  const playwrightCandidates = await findPlaywrightChromium();
  const candidates = [
    process.env.BOOKMARKFLOW_CHROME_PATH,
    ...playwrightCandidates,
    process.platform === "win32" ? path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe") : "",
    process.platform === "win32" ? path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe") : "",
    process.platform === "win32" ? path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe") : "",
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "",
    process.platform === "linux" ? "/usr/bin/google-chrome" : ""
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }

  throw new Error("Chrome was not found. Set BOOKMARKFLOW_CHROME_PATH to run this regression test.");
}

async function findPlaywrightChromium() {
  const root = process.platform === "win32" && process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "ms-playwright")
    : process.platform === "darwin" && process.env.HOME
      ? path.join(process.env.HOME, "Library", "Caches", "ms-playwright")
      : process.env.HOME
        ? path.join(process.env.HOME, ".cache", "ms-playwright")
        : "";
  if (!root) return [];
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const chromiumRoots = entries
    .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
    .sort((left, right) => right.name.localeCompare(left.name, "en", { numeric: true }));

  if (process.platform === "win32") {
    return chromiumRoots.map((entry) => path.join(root, entry.name, "chrome-win", "chrome.exe"));
  }
  if (process.platform === "darwin") {
    return chromiumRoots.flatMap((entry) => [
      path.join(root, entry.name, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
      path.join(root, entry.name, "chrome-mac-arm64", "Chromium.app", "Contents", "MacOS", "Chromium")
    ]);
  }
  return chromiumRoots.flatMap((entry) => [
    path.join(root, entry.name, "chrome-linux", "chrome"),
    path.join(root, entry.name, "chrome-linux64", "chrome")
  ]);
}

async function startHostileServer() {
  const instance = http.createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(`<!doctype html><html><head><script>
      const host = document.createElement("div");
      host.id = "bookmarkflow-bar-root";
      window.attackerRoot = host.attachShadow({ mode: "open" });
      document.documentElement.prepend(host);
    </script></head><body><h1>Hostile test page</h1></body></html>`);
  });
  await new Promise((resolve, reject) => {
    instance.once("error", reject);
    instance.listen(0, "127.0.0.1", resolve);
  });
  const address = instance.address();
  return { instance, port: address.port, url: `http://127.0.0.1:${address.port}/` };
}

async function closeServer(server) {
  if (!server.listening) return;
  await new Promise((resolve) => server.close(resolve));
}

async function getFreePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForDebugger(port, getDiagnostics = () => ({})) {
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) {
        const version = await response.json();
        if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
      }
    } catch (error) {
      lastError = error;
    }
    if (getDiagnostics().exitCode !== null) break;
    await delay(100);
  }
  const diagnostics = getDiagnostics();
  throw new Error(`Chrome DevTools did not start: ${lastError?.message || "timeout"}; diagnostics: ${JSON.stringify(diagnostics)}`);
}

async function createPage(cdp, url) {
  const { targetId } = await cdp.call("Target.createTarget", { url });
  const sessionId = await attach(cdp, targetId);
  await cdp.call("Page.enable", {}, sessionId);
  await cdp.call("Runtime.enable", {}, sessionId);
  await waitFor(cdp, sessionId, "document.readyState === 'complete'");
  return sessionId;
}

async function attach(cdp, targetId) {
  const { sessionId } = await cdp.call("Target.attachToTarget", { targetId, flatten: true });
  await cdp.call("Runtime.enable", {}, sessionId);
  return sessionId;
}

async function waitForExtensionWorker(cdp) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const { targetInfos } = await cdp.call("Target.getTargets");
    const worker = targetInfos.find((target) => (
      target.type === "service_worker" &&
      target.url.startsWith("chrome-extension://") &&
      target.url.endsWith("/src/background.js")
    ));
    if (worker) return { targetId: worker.targetId, url: worker.url };
    await delay(100);
  }
  throw new Error("BookmarkFlow service worker did not start");
}

async function reloadAndWaitForContentScript(cdp, sessionId) {
  await cdp.call("Page.reload", { ignoreCache: true }, sessionId);
  await waitFor(cdp, sessionId, "document.readyState === 'complete'");
  await waitFor(cdp, sessionId, "Boolean(document.getElementById('bookmarkflow-bar-page-style'))");
  await waitFor(cdp, sessionId, "document.querySelectorAll('[id^=\"bookmarkflow-bar-root\"]').length >= 2");
}

async function reloadAndWaitForDocument(cdp, sessionId) {
  await cdp.call("Page.reload", { ignoreCache: true }, sessionId);
  await waitFor(cdp, sessionId, "document.readyState === 'complete'");
}

async function waitFor(cdp, sessionId, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(cdp, sessionId, expression);
    if (lastValue) return lastValue;
    await delay(100);
  }
  throw new Error(`Timed out waiting for: ${expression}; last value: ${JSON.stringify(lastValue)}`);
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.call("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function trustedClick(cdp, sessionId, selector) {
  const rect = await evaluate(cdp, sessionId, `
    (() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error("Missing element: ${selector}");
      element.scrollIntoView({ block: "center", inline: "center" });
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()
  `);
  await cdp.call("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1 }, sessionId);
  await cdp.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x, y: rect.y, button: "left", clickCount: 1 }, sessionId);
}

async function fillInput(cdp, sessionId, selector, value) {
  await evaluate(cdp, sessionId, `
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) throw new Error("Missing input: ${selector}");
      input.value = "";
      input.focus();
      return true;
    })()
  `);
  await cdp.call("Input.insertText", { text: value }, sessionId);
}

async function trustedShadowClick(cdp, sessionId, expectedAttributes) {
  const node = await waitForPiercedNode(cdp, sessionId, expectedAttributes);
  const { model } = await cdp.call("DOM.getBoxModel", { nodeId: node.nodeId }, sessionId);
  const quad = model.content || model.border;
  const x = (quad[0] + quad[2] + quad[4] + quad[6]) / 4;
  const y = (quad[1] + quad[3] + quad[5] + quad[7]) / 4;
  await cdp.call("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 }, sessionId);
  await cdp.call("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 }, sessionId);
}

async function fillShadowInput(cdp, sessionId, className, value) {
  const node = await waitForPiercedNode(cdp, sessionId, { class: className });
  await cdp.call("DOM.focus", { nodeId: node.nodeId }, sessionId);
  await cdp.call("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    modifiers: 2
  }, sessionId);
  await cdp.call("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    modifiers: 2
  }, sessionId);
  await cdp.call("Input.insertText", { text: value }, sessionId);
}

async function waitForPiercedNode(cdp, sessionId, expectedAttributes, timeoutMs = 10000) {
  await cdp.call("DOM.enable", {}, sessionId);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { nodes } = await cdp.call("DOM.getFlattenedDocument", { depth: -1, pierce: true }, sessionId);
    const node = nodes.find((candidate) => attributesMatch(candidate.attributes, expectedAttributes));
    if (node) return node;
    await delay(100);
  }
  throw new Error(`Timed out waiting for a pierced node: ${JSON.stringify(expectedAttributes)}`);
}

function attributesMatch(attributes = [], expectedAttributes) {
  const actual = Object.fromEntries(Array.from({ length: attributes.length / 2 }, (_, index) => [
    attributes[index * 2],
    attributes[index * 2 + 1]
  ]));
  return Object.entries(expectedAttributes).every(([name, value]) => (
    name === "class"
      ? String(actual.class || "").split(/\s+/).includes(value)
      : actual[name] === value
  ));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProcessExit(child) {
  if (child.exitCode !== null) return;
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5000)
  ]);
  if (child.exitCode === null) child.kill();
}

async function removeTemporaryProfile(directory) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await fs.rm(directory, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      if (error?.code !== "EBUSY" && error?.code !== "EPERM") throw error;
      await delay(100);
    }
  }
  throw lastError;
}

class CdpClient {
  static async connect(url) {
    const client = new CdpClient(url);
    await client.ready;
    return client;
  }

  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolve(message.result || {});
    });
  }

  call(method, params = {}, sessionId) {
    const id = this.nextId++;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify(message));
    });
  }

  close() {
    this.socket.close();
  }
}

await main();
