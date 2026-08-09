import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "output", "playwright", "tour-gifs");
const framesRoot = path.join(outputRoot, "frames");
const stagedAssetDir = path.join(outputRoot, "generated");
const assetDir = path.join(projectRoot, "src", "assets", "tour");
const requiredPlaywrightVersion = "1.55.0";
const requiredChromiumRevision = "1187";
const folderRailDefaultMigrationKey = "bfFolderRailDefaultLeftV1";
const tourAssetNames = Object.freeze([
  "bar-open-close",
  "search-palette",
  "folder-rail",
  "streamer-mode",
  "context-actions"
]);
const fps = 12;
const frameDelay = 1000 / fps;
const viewport = { width: 960, height: 540 };
const tourClip = Object.freeze({ width: 720 });

const demoPageHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BookmarkFlow local tour workspace</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0d1118;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
      }

      body {
        position: relative;
        background:
          radial-gradient(circle at 78% 68%, rgba(65, 209, 125, 0.08), transparent 30%),
          radial-gradient(circle at 24% 72%, rgba(242, 201, 76, 0.12), transparent 34%),
          linear-gradient(145deg, #101620 0%, #0d1118 56%, #111722 100%);
      }

      .demo-grid {
        position: absolute;
        inset: 160px 58px 72px;
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 24px;
        opacity: 0.76;
      }

      .demo-card {
        position: relative;
        overflow: hidden;
        border: 1px solid rgba(125, 140, 160, 0.16);
        border-radius: 22px;
        background: #141b25;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.26);
      }

      .demo-card::before,
      .demo-card::after {
        content: "";
        position: absolute;
        border-radius: 999px;
        background: #222c39;
      }

      .demo-card::before {
        top: 34px;
        left: 34px;
        width: 34%;
        height: 10px;
      }

      .demo-card::after {
        top: 58px;
        left: 34px;
        width: 58%;
        height: 7px;
        opacity: 0.7;
      }

      .demo-accent {
        position: absolute;
        right: 32px;
        bottom: 30px;
        width: 44%;
        height: 42%;
        border: 1px solid rgba(242, 201, 76, 0.22);
        border-radius: 16px;
        background: rgba(242, 201, 76, 0.05);
      }

      .demo-proof {
        position: absolute;
        right: 30px;
        bottom: 20px;
        color: #667286;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <main class="demo-grid" aria-label="Synthetic local BookmarkFlow demo workspace">
      <section class="demo-card" aria-hidden="true"><span class="demo-accent"></span></section>
      <section class="demo-card" aria-hidden="true"><span class="demo-accent"></span></section>
    </main>
    <div class="demo-proof">Local demo · synthetic data</div>
  </body>
</html>`;

const baseSettings = Object.freeze({
  enabled: true,
  rows: 2,
  compact: true,
  offsetPage: true,
  showSearch: false,
  hideEmptySearchSuggestions: false,
  streamerMode: false,
  folderRail: "off",
  autoHideSensitiveSites: false,
  avoidAppTopBars: false,
  disabledHosts: []
});

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { chromium } = await loadPlaywright();
  const executablePath = await findBrowserExecutable();
  await resetOutput();
  await fs.mkdir(assetDir, { recursive: true });
  let profileDir = "";
  let demoServer = null;
  let context = null;

  try {
    profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-tour-"));
    demoServer = await startDemoServer();
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      ...(executablePath ? { executablePath } : {}),
      viewport,
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
      args: [
        `--disable-extensions-except=${projectRoot}`,
        `--load-extension=${projectRoot}`,
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--lang=en-US",
        "--force-color-profile=srgb",
        "--disable-features=Translate",
        "--disable-sync",
        "--no-first-run"
      ]
    });

    const runtime = await getExtensionRuntime(context);
    const extensionId = getExtensionId(runtime);
    await assertEnglishLocale(runtime);
    await seedDemoData(runtime);

    await recordBarOpenClose(context, runtime, demoServer.url);
    await recordSearchPalette(context, runtime, demoServer.url);
    await recordFolderRail(context, runtime, demoServer.url);
    await recordStreamerMode(context, runtime, demoServer.url);
    await recordContextActions(context, runtime, demoServer.url);

    const onboarding = await context.newPage();
    await onboarding.goto(`chrome-extension://${extensionId}/src/onboarding.html`);
    await onboarding.waitForLoadState("domcontentloaded");
    await onboarding.screenshot({
      path: path.join(outputRoot, "onboarding-tour.png"),
      fullPage: true
    });
    await publishTourAssets();
  } finally {
    try {
      await context?.close();
    } finally {
      try {
        await demoServer?.close();
      } finally {
        if (profileDir) await fs.rm(profileDir, { recursive: true, force: true });
      }
    }
  }
}

async function startDemoServer() {
  const server = createServer((request, response) => {
    if (request.url === "/favicon.ico") {
      response.writeHead(204, { "Cache-Control": "no-store" });
      response.end();
      return;
    }

    if (request.url !== "/tour") {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self' chrome-extension: data:; style-src 'unsafe-inline' chrome-extension:; img-src 'self' chrome-extension: data:",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(demoPageHtml);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("The local tour server did not expose a TCP port.");
  }

  return {
    url: `http://127.0.0.1:${address.port}/tour`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE_PATH) {
    candidates.push(process.env.PLAYWRIGHT_MODULE_PATH);
  }

  try {
    candidates.push(fileURLToPath(await import.meta.resolve("playwright")));
  } catch {}

  const cacheEntry = await findCachedPlaywrightModule();
  if (cacheEntry) candidates.push(cacheEntry);

  const codexEntry = await findCodexPlaywrightModule();
  if (codexEntry) candidates.push(codexEntry);

  const failures = [];
  for (const modulePath of [...new Set(candidates)]) {
    if (!await isExactPlaywrightModule(modulePath)) {
      failures.push(`${modulePath} is not Playwright ${requiredPlaywrightVersion}`);
      continue;
    }

    try {
      return await import(pathToFileURL(modulePath).href);
    } catch (error) {
      failures.push(`${modulePath}: ${error?.message || error}`);
    }
  }

  throw new Error(
    `Exact Playwright ${requiredPlaywrightVersion} was not found. Run "npx --yes playwright@${requiredPlaywrightVersion} --version" once, then "npx --yes playwright@${requiredPlaywrightVersion} install chromium". ${failures.join("; ")}`
  );
}

async function isExactPlaywrightModule(modulePath) {
  try {
    const packageJson = JSON.parse(await fs.readFile(path.join(path.dirname(modulePath), "package.json"), "utf8"));
    return packageJson.name === "playwright" && packageJson.version === requiredPlaywrightVersion;
  } catch {
    return false;
  }
}

async function findCodexPlaywrightModule() {
  const runtimeRoot = process.env.USERPROFILE
    ? path.join(process.env.USERPROFILE, ".cache", "codex-runtimes")
    : "";
  if (!runtimeRoot) {
    return "";
  }

  let entries = [];
  try {
    entries = await fs.readdir(runtimeRoot, { withFileTypes: true });
  } catch {
    return "";
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const modulePath = path.join(
      runtimeRoot,
      entry.name,
      "dependencies",
      "node",
      "node_modules",
      "playwright",
      "index.mjs"
    );
    try {
      if (await isExactPlaywrightModule(modulePath)) {
        const stats = await fs.stat(modulePath);
        candidates.push({ path: modulePath, mtimeMs: stats.mtimeMs });
      }
    } catch {}
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.path || "";
}

async function findBrowserExecutable() {
  const explicitPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicitPath) {
    if (await isExactChromiumExecutable(explicitPath)) return explicitPath;
    throw new Error(
      `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH must point inside chromium-${requiredChromiumRevision}; run "npx --yes playwright@${requiredPlaywrightVersion} install chromium".`
    );
  }

  const browserRoots = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "ms-playwright"),
    process.env.HOME && path.join(process.env.HOME, ".cache", "ms-playwright"),
    process.env.HOME && path.join(process.env.HOME, "Library", "Caches", "ms-playwright")
  ].filter(Boolean);
  const exactBrowserDirectory = `chromium-${requiredChromiumRevision}`;
  const relativePaths = process.platform === "win32"
    ? [["chrome-win64", "chrome.exe"], ["chrome-win", "chrome.exe"]]
    : process.platform === "darwin"
      ? [["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"]]
      : [["chrome-linux", "chrome"]];

  for (const browserRoot of browserRoots) {
    let entries = [];
    try {
      entries = await fs.readdir(browserRoot, { withFileTypes: true });
    } catch {}
    if (!entries.some((entry) => entry.isDirectory() && entry.name === exactBrowserDirectory)) continue;
    for (const relativePath of relativePaths) {
      const candidate = path.join(browserRoot, exactBrowserDirectory, ...relativePath);
      try {
        if ((await fs.stat(candidate)).isFile()) {
          return candidate;
        }
      } catch {}
    }
  }

  throw new Error(
    `Playwright Chromium build ${requiredChromiumRevision} was not found. Run "npx --yes playwright@${requiredPlaywrightVersion} install chromium".`
  );
}

async function isExactChromiumExecutable(executablePath) {
  try {
    if (!(await fs.stat(executablePath)).isFile()) return false;
    const normalizedPath = path.resolve(executablePath);
    return normalizedPath.includes(`${path.sep}chromium-${requiredChromiumRevision}${path.sep}`);
  } catch {
    return false;
  }
}

async function findCachedPlaywrightModule() {
  const npxRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : "";
  if (!npxRoot) {
    return "";
  }

  let entries = [];
  try {
    entries = await fs.readdir(npxRoot, { withFileTypes: true });
  } catch {
    return "";
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const modulePath = path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs");
    try {
      if (await isExactPlaywrightModule(modulePath)) {
        const stats = await fs.stat(modulePath);
        candidates.push({ path: modulePath, mtimeMs: stats.mtimeMs });
      }
    } catch {}
  }

  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.path || "";
}

async function resetOutput() {
  const resolvedOutput = path.resolve(outputRoot);
  const resolvedProject = path.resolve(projectRoot);
  if (!resolvedOutput.startsWith(resolvedProject + path.sep)) {
    throw new Error(`Refusing to delete outside project: ${resolvedOutput}`);
  }

  await fs.rm(resolvedOutput, { recursive: true, force: true });
  await Promise.all([
    fs.mkdir(framesRoot, { recursive: true }),
    fs.mkdir(stagedAssetDir, { recursive: true })
  ]);
}

async function getExtensionRuntime(context) {
  const isBookmarkFlowWorker = async (worker) => {
    if (!worker.url().startsWith("chrome-extension://")) return false;
    try {
      return await worker.evaluate(() => {
        const manifest = chrome.runtime?.getManifest?.();
        return manifest?.chrome_url_overrides?.newtab === "src/newtab.html"
          && manifest?.permissions?.includes("bookmarks");
      });
    } catch {
      return false;
    }
  };

  for (const worker of context.serviceWorkers()) {
    if (await isBookmarkFlowWorker(worker)) return worker;
  }

  try {
    const worker = await context.waitForEvent("serviceworker", {
      predicate: (worker) => worker.url().startsWith("chrome-extension://"),
      timeout: 5_000
    });
    if (await isBookmarkFlowWorker(worker)) return worker;
  } catch {
    // Fall through to the chrome://extensions page lookup below.
  }

  const page = await context.newPage();
  await page.goto("chrome://extensions/");
  await page.waitForSelector("extensions-manager");
  const extensionId = await page.evaluate((expectedName) => {
    const items = [];
    const visit = (root) => {
      for (const element of root.querySelectorAll("*")) {
        if (element.tagName === "EXTENSIONS-ITEM" && element.id) {
          items.push({ id: element.id, text: element.shadowRoot?.textContent || element.textContent || "" });
        }
        if (element.shadowRoot) visit(element.shadowRoot);
      }
    };
    visit(document);
    return items.find((item) => item.text.includes(expectedName))?.id || "";
  }, "BookmarkFlow Bar");

  if (!extensionId) {
    throw new Error("BookmarkFlow Bar was not present in chrome://extensions after launch.");
  }
  await page.goto(`chrome-extension://${extensionId}/src/onboarding.html`);
  await page.waitForLoadState("domcontentloaded");
  return page;
}

function getExtensionId(runtime) {
  const [, , extensionId] = runtime.url().split("/");
  if (!extensionId) {
    throw new Error(`Cannot read extension id from ${runtime.url()}`);
  }

  return extensionId;
}

async function assertEnglishLocale(worker) {
  const locale = await worker.evaluate(() => ({
    language: chrome.i18n.getUILanguage(),
    folders: chrome.i18n.getMessage("folders"),
    openInNewTab: chrome.i18n.getMessage("openInNewTab")
  }));

  if (!locale.language.toLowerCase().startsWith("en")
    || locale.folders !== "Folders"
    || locale.openInNewTab !== "Open in new tab") {
    throw new Error(`Tour capture requires the en-US extension locale; received ${JSON.stringify(locale)}.`);
  }
}

async function seedDemoData(worker) {
  await worker.evaluate(async ({ settings, folderRailDefaultMigrationKey }) => {
    const [root] = await chrome.bookmarks.getTree();
    const bookmarkBar = (root.children || []).find((node) => node.folderType === "bookmarks-bar" || node.id === "1");
    if (!bookmarkBar) {
      throw new Error("Bookmark Bar was not found.");
    }

    const children = await chrome.bookmarks.getChildren(bookmarkBar.id);
    await Promise.all(children.map((node) => node.url
      ? chrome.bookmarks.remove(node.id)
      : chrome.bookmarks.removeTree(node.id)
    ));

    const createBookmark = (title, url, parentId = bookmarkBar.id) => chrome.bookmarks.create({ parentId, title, url });
    const createFolder = (title) => chrome.bookmarks.create({ parentId: bookmarkBar.id, title });

    await createBookmark("Mail", "https://mail.bookmarkflow.invalid");
    await createBookmark("Docs", "https://docs.bookmarkflow.invalid");
    await createBookmark("Design", "https://design.bookmarkflow.invalid");
    await createBookmark("Finance", "https://finance.bookmarkflow.invalid");
    await createBookmark("Projects", "https://projects.bookmarkflow.invalid");
    await createBookmark("Calendar", "https://calendar.bookmarkflow.invalid");

    const resources = await createFolder("Resources");
    await createBookmark("Design System", "https://design-system.bookmarkflow.invalid", resources.id);
    await createBookmark("Brand Kit", "https://brand.bookmarkflow.invalid", resources.id);
    await createBookmark("Team Notes", "https://notes.bookmarkflow.invalid", resources.id);

    const inspiration = await createFolder("Inspiration");
    await createBookmark("Gallery", "https://gallery.bookmarkflow.invalid", inspiration.id);
    await createBookmark("Research", "https://research.bookmarkflow.invalid", inspiration.id);

    await createFolder("Tools");

    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    const { disabledHosts, ...syncedSettings } = settings;
    await chrome.storage.sync.set(syncedSettings);
    await chrome.storage.local.set({
      [BookmarkFlowConfig.DATA_CONSENT_STORAGE_KEY]: BookmarkFlowConfig.DATA_CONSENT_VERSION,
      bfOnboardingSeen: true,
      [folderRailDefaultMigrationKey]: true,
      disabledHosts
    });
  }, { settings: baseSettings, folderRailDefaultMigrationKey });
}

async function applySettings(worker, settings) {
  await worker.evaluate(async (nextSettings) => {
    const { disabledHosts, ...syncedSettings } = nextSettings;
    await Promise.all([
      chrome.storage.sync.set(syncedSettings),
      chrome.storage.local.set({ disabledHosts })
    ]);
  }, { ...baseSettings, ...settings });
}

async function openDemoPage(context, worker, demoUrl, settings = {}) {
  await applySettings(worker, settings);
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(demoUrl);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => Boolean(document.getElementById("bookmarkflow-bar-page-style")));
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[id^="bookmarkflow-bar-root-"]'))
    .some((element) => element.getBoundingClientRect().height > 0));
  await installTourGuides(page);
  await page.waitForTimeout(400);
  return page;
}

async function recordBarOpenClose(context, worker, demoUrl) {
  const page = await openDemoPage(context, worker, demoUrl);
  const clip = { y: 0, height: 180 };
  await captureAction("bar-open-close", page, async (timeline) => {
    await showCue(page, "Keyboard", "Alt + Shift + B", { x: 662, y: 128 });
    await timeline(8, clip);
    await hideTourGuides(page);
    await runContentCommand(worker, page, "toggle-bar");
    const expandedState = await waitForContentState(worker, page, "expanded bookmark bar", (state) => (
      state.expanded === true
      && state.renderedAppExpanded === true
      && state.renderedAppVisible === true
    ));
    assertBoundsInsideClip(expandedState.renderedAppBounds, clip, "expanded bookmark bar");
    await timeline(18, clip);
    await showCue(page, "Keyboard", "Alt + Shift + B", { x: 662, y: 128 });
    await timeline(6, clip);
    await hideTourGuides(page);
    await runContentCommand(worker, page, "toggle-bar");
    await waitForContentState(worker, page, "collapsed bookmark bar", (state) => (
      state.expanded === false
      && state.renderedAppExpanded === false
      && state.renderedAppVisible === true
    ));
    await timeline(10, clip);
    await runContentCommand(worker, page, "toggle-bar");
    const finalExpandedState = await waitForContentState(worker, page, "final expanded bookmark bar", (state) => (
      state.expanded === true
      && state.renderedAppExpanded === true
      && state.renderedAppVisible === true
    ));
    assertBoundsInsideClip(finalExpandedState.renderedAppBounds, clip, "final expanded bookmark bar");
    await timeline(18, clip);
  });
  await page.close();
}

async function recordSearchPalette(context, worker, demoUrl) {
  const page = await openDemoPage(context, worker, demoUrl);
  const clip = { x: 0, y: 0, width: viewport.width, height: viewport.height };
  await captureAction("search-palette", page, async (timeline) => {
    await showCue(page, "Keyboard", "Alt + Shift + K", { x: 136, y: 408 });
    await timeline(8, clip);
    await hideTourGuides(page);
    await runContentCommand(worker, page, "open-search");
    await waitForContentState(worker, page, "open search palette", (state) => state.searchOpen === true);
    await timeline(8, clip);
    await showCue(page, "Type", "design", { x: 136, y: 408 });
    await timeline(5, clip);
    await hideTourGuides(page);
    for (const character of "design") {
      await page.keyboard.type(character);
      await timeline(1, clip);
    }
    await timeline(8, clip);
    await showCue(page, "Keyboard", "Arrow Down", { x: 136, y: 408 });
    await timeline(5, clip);
    await hideTourGuides(page);
    await page.keyboard.press("ArrowDown");
    const searchState = await waitForContentState(
      worker,
      page,
      "search results with the second item selected",
      (state) => state.searchOpen === true && state.commandResults >= 2 && state.commandActiveIndex === 1
    );
    assertBoundsInsideClip(searchState.commandBounds, clip, "search palette");
    await timeline(20, clip);
  });
  await page.close();
}

async function recordFolderRail(context, worker, demoUrl) {
  const page = await openDemoPage(context, worker, demoUrl, { folderRail: "left" });
  await runContentCommand(worker, page, "toggle-bar");
  const expandedFolderState = await waitForContentState(worker, page, "expanded folder-rail scene", (state) => (
    state.expanded === true
    && state.renderedAppExpanded === true
    && state.renderedAppVisible === true
    && state.folderRail === "left"
    && state.renderedFolderRail === true
    && state.renderedFolderRailItems > 0
  ));
  const clip = { x: 0, y: 0, width: tourClip.width, height: 420 };
  assertBoundsInsideClip(expandedFolderState.renderedFolderRailBounds, clip, "expanded folder rail");
  await captureAction("folder-rail", page, async (timeline) => {
    await showCue(page, "Mouse", "Click a folder", { x: 430, y: 366 });
    await showPointer(page, { x: 100, y: 158 });
    await timeline(8, clip);
    await showPointer(page, { x: 100, y: 158, pressed: true });
    await timeline(2, clip);
    await page.mouse.click(100, 158);
    const folderState = await waitForContentState(
      worker,
      page,
      "open folder menu",
      (state) => state.folderMenuOpen === true
    );
    assertBoundsInsideClip(folderState.folderMenuBounds, clip, "folder menu");
    await showPointer(page, { x: 100, y: 158 });
    await timeline(5, clip);
    await hideTourGuides(page);
    await timeline(22, clip);
  });
  await page.close();
}

async function recordStreamerMode(context, worker, demoUrl) {
  const page = await openDemoPage(context, worker, demoUrl);
  await runContentCommand(worker, page, "toggle-bar");
  const expandedStreamerState = await waitForContentState(worker, page, "expanded streamer scene", (state) => (
    state.expanded === true
    && state.renderedAppExpanded === true
    && state.renderedAppVisible === true
  ));
  const clip = { y: 0, height: 180 };
  assertBoundsInsideClip(expandedStreamerState.renderedAppBounds, clip, "expanded streamer app");
  await captureAction("streamer-mode", page, async (timeline) => {
    await showCue(page, "Toggle", "Streamer mode · Alt + Shift + M", { x: 602, y: 128 });
    await timeline(10, clip);
    await hideTourGuides(page);
    await applySettings(worker, { streamerMode: true });
    await waitForContentState(worker, page, "streamer mode", (state) => (
      state.streamerMode === true
      && state.renderedStreamerMode === true
      && state.renderedAppExpanded === true
      && state.renderedAppVisible === true
    ));
    await timeline(24, clip);
  });
  await page.close();
}

async function recordContextActions(context, worker, demoUrl) {
  const page = await openDemoPage(context, worker, demoUrl);
  await runContentCommand(worker, page, "toggle-bar");
  const expandedContextState = await waitForContentState(worker, page, "expanded context-menu scene", (state) => (
    state.expanded === true
    && state.renderedAppExpanded === true
    && state.renderedAppVisible === true
  ));
  const clip = { x: 0, y: 0, width: viewport.width, height: 480 };
  assertBoundsInsideClip(expandedContextState.renderedAppBounds, clip, "expanded context-menu app");
  await captureAction("context-actions", page, async (timeline) => {
    await showCue(page, "Mouse", "Right-click a bookmark", { x: 420, y: 306 });
    await showPointer(page, { x: 80, y: 25 });
    await timeline(8, clip);
    await showPointer(page, { x: 80, y: 25, pressed: true });
    await timeline(2, clip);
    await page.mouse.click(80, 25, { button: "right" });
    const contextState = await waitForContentState(
      worker,
      page,
      "open bookmark context menu",
      (state) => state.contextMenuOpen === true
    );
    assertBoundsInsideClip(contextState.contextMenuBounds, clip, "bookmark context menu");
    await showPointer(page, { x: 80, y: 25 });
    await timeline(5, clip);
    await hideTourGuides(page);
    await timeline(22, clip);
  });
  await page.close();
}

async function installTourGuides(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "bookmarkflow-tour-guide-style";
    style.textContent = `
      #bookmarkflow-tour-cue,
      #bookmarkflow-tour-pointer,
      #bookmarkflow-tour-ripple {
        position: fixed;
        z-index: 2147483647;
        pointer-events: none;
      }

      #bookmarkflow-tour-cue {
        display: none;
        align-items: center;
        gap: 9px;
        min-height: 38px;
        border: 1px solid rgba(242, 201, 76, 0.48);
        border-radius: 999px;
        padding: 7px 12px 7px 8px;
        background: #111720;
        color: #f7f9fc;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.42);
        font: 700 12px/1.1 Inter, ui-sans-serif, system-ui, sans-serif;
        white-space: nowrap;
      }

      #bookmarkflow-tour-cue strong {
        display: inline-grid;
        place-items: center;
        min-height: 24px;
        border-radius: 999px;
        padding: 0 9px;
        background: #f2c94c;
        color: #171b22;
        font-size: 9px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #bookmarkflow-tour-pointer {
        display: none;
        width: 21px;
        height: 27px;
        filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.58));
      }

      #bookmarkflow-tour-pointer svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      #bookmarkflow-tour-ripple {
        display: none;
        width: 30px;
        height: 30px;
        border: 2px solid #f2c94c;
        border-radius: 50%;
        background: rgba(242, 201, 76, 0.12);
        transform: translate(-12px, -12px);
      }
    `;

    const cue = document.createElement("div");
    cue.id = "bookmarkflow-tour-cue";
    cue.setAttribute("aria-hidden", "true");

    const pointer = document.createElement("div");
    pointer.id = "bookmarkflow-tour-pointer";
    pointer.setAttribute("aria-hidden", "true");
    pointer.innerHTML = `<svg viewBox="0 0 21 27" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M2 2.2v19.1l5.1-5.1 3.7 8.3 4.1-1.8-3.7-8.1h7.1L2 2.2Z" fill="#f7f9fc" stroke="#111720" stroke-width="2" stroke-linejoin="round"/></svg>`;

    const ripple = document.createElement("div");
    ripple.id = "bookmarkflow-tour-ripple";
    ripple.setAttribute("aria-hidden", "true");

    document.head.append(style);
    document.body.append(cue, ripple, pointer);
  });
}

async function showCue(page, kind, label, position) {
  await page.evaluate(({ kind, label, position }) => {
    const cue = document.getElementById("bookmarkflow-tour-cue");
    const badge = document.createElement("strong");
    const copy = document.createElement("span");
    badge.textContent = kind;
    copy.textContent = label;
    cue.replaceChildren(badge, copy);
    cue.style.left = `${position.x}px`;
    cue.style.top = `${position.y}px`;
    cue.style.display = "flex";
  }, { kind, label, position });
}

async function showPointer(page, { x, y, pressed = false }) {
  await page.evaluate(({ x, y, pressed }) => {
    const pointer = document.getElementById("bookmarkflow-tour-pointer");
    const ripple = document.getElementById("bookmarkflow-tour-ripple");
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
    pointer.style.display = "block";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.display = pressed ? "block" : "none";
  }, { x, y, pressed });
}

async function hideTourGuides(page) {
  await page.evaluate(() => {
    for (const id of ["bookmarkflow-tour-cue", "bookmarkflow-tour-pointer", "bookmarkflow-tour-ripple"]) {
      const element = document.getElementById(id);
      if (element) element.style.display = "none";
    }
  });
}

async function captureAction(name, page, action) {
  const frameDir = path.join(framesRoot, name);
  await fs.mkdir(frameDir, { recursive: true });
  let frameIndex = 0;

  const timeline = async (count, clip = {}) => {
    for (let index = 0; index < count; index += 1) {
      await page.screenshot({
        path: path.join(frameDir, `frame-${String(frameIndex).padStart(4, "0")}.png`),
        clip: normalizeClip(clip)
      });
      frameIndex += 1;
      await page.waitForTimeout(frameDelay);
    }
  };

  await action(timeline);
  await makeGif(name, frameDir);
}

async function runContentCommand(worker, page, command) {
  const targetUrl = page.url();
  const response = await worker.evaluate(async ({ targetUrl, command }) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === targetUrl)
      || tabs.find((candidate) => candidate.active)
      || tabs[tabs.length - 1];
    if (typeof tab?.id !== "number") {
      return { ok: false, error: "Demo tab was not found." };
    }

    const commandResponse = await chrome.tabs.sendMessage(tab.id, {
      type: "BF_RUN_COMMAND",
      command
    });
    return commandResponse?.ok
      ? commandResponse
      : { ok: false, error: commandResponse?.error || `Command failed: ${command}` };
  }, { targetUrl, command });

  if (!response?.ok) {
    throw new Error(response?.error || `Command failed: ${command}`);
  }
  await page.waitForTimeout(260);
}

async function getContentState(worker, page) {
  const targetUrl = page.url();
  return worker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === url)
      || tabs.find((candidate) => candidate.active)
      || tabs[tabs.length - 1];
    if (typeof tab?.id !== "number") {
      return { ok: false, error: "Demo tab was not found." };
    }
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: "BF_GET_PAGE_INFO" });
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  }, targetUrl);
}

async function waitForContentState(worker, page, label, predicate) {
  const deadline = Date.now() + 5_000;
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await getContentState(worker, page);
    if (lastState?.ok && predicate(lastState)) {
      return lastState;
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} was not rendered. Last state: ${JSON.stringify(lastState)}`);
}

function normalizeClip(clip) {
  const x = Number.isFinite(clip.x) ? clip.x : 0;
  const y = Number.isFinite(clip.y) ? clip.y : 0;
  const width = Number.isFinite(clip.width) ? clip.width : viewport.width - x;
  const height = Number.isFinite(clip.height) ? clip.height : viewport.height - y;
  return { x, y, width, height };
}

function assertBoundsInsideClip(bounds, clip, label) {
  if (!bounds) throw new Error(`${label} bounds were unavailable.`);
  const normalized = normalizeClip(clip);
  const epsilon = 1;
  if (
    bounds.width <= 0
    || bounds.height <= 0
    || bounds.left < normalized.x - epsilon
    || bounds.top < normalized.y - epsilon
    || bounds.right > normalized.x + normalized.width + epsilon
    || bounds.bottom > normalized.y + normalized.height + epsilon
  ) {
    throw new Error(`${label} is clipped by the capture bounds: ${JSON.stringify({ bounds, clip: normalized })}`);
  }
}

async function makeGif(name, frameDir) {
  const input = path.join(frameDir, "frame-%04d.png");
  const palette = path.join(frameDir, "palette.png");
  const output = path.join(stagedAssetDir, `${name}.gif`);
  const scaleFilter = name === "search-palette"
    ? "fps=12,scale=720:405:flags=lanczos,pad=720:420:0:7:color=0x0d1118"
    : "fps=12,scale=720:-1:flags=lanczos";

  await execFileAsync("ffmpeg", [
    "-y",
    "-framerate", String(fps),
    "-i", input,
    "-vf", `${scaleFilter},palettegen=max_colors=96`,
    palette
  ]);

  await execFileAsync("ffmpeg", [
    "-y",
    "-framerate", String(fps),
    "-i", input,
    "-i", palette,
    "-lavfi", `${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`,
    "-loop", "-1",
    output
  ]);
}

async function publishTourAssets() {
  const publications = [];
  for (const name of tourAssetNames) {
    const source = path.join(stagedAssetDir, `${name}.gif`);
    const destination = path.join(assetDir, `${name}.gif`);
    const bytes = await fs.readFile(source);
    if (bytes.subarray(0, 3).toString("ascii") !== "GIF") {
      throw new Error(`${name}.gif is not a valid staged GIF.`);
    }
    publications.push({ source, destination });
  }
  await replaceFilesAtomically(publications);
}

async function replaceFilesAtomically(publications) {
  const token = `.bookmarkflow-${process.pid}-${Date.now()}`;
  const records = publications.map((publication, index) => ({
    ...publication,
    temporary: `${publication.destination}${token}.tmp-${index}`,
    backup: `${publication.destination}${token}.bak-${index}`,
    backedUp: false,
    published: false
  }));
  let complete = false;

  try {
    for (const record of records) {
      await fs.mkdir(path.dirname(record.destination), { recursive: true });
      await fs.copyFile(record.source, record.temporary);
      const bytes = await fs.readFile(record.temporary);
      if (bytes.subarray(0, 3).toString("ascii") !== "GIF") {
        throw new Error(`Prepared tour asset is not a GIF: ${record.temporary}`);
      }
    }

    for (const record of records) {
      try {
        await fs.rename(record.destination, record.backup);
        record.backedUp = true;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }

    for (const record of records) {
      await fs.rename(record.temporary, record.destination);
      record.published = true;
    }
    complete = true;
  } catch (error) {
    const rollbackErrors = [];
    for (const record of [...records].reverse()) {
      try {
        if (record.published) await fs.rm(record.destination, { force: true });
        if (record.backedUp) await fs.rename(record.backup, record.destination);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length) {
      throw new AggregateError([error, ...rollbackErrors], "Tour asset publication and rollback failed");
    }
    throw error;
  } finally {
    await Promise.all(records.map((record) => fs.rm(record.temporary, { force: true })));
    if (complete) {
      await Promise.all(records.map((record) => fs.rm(record.backup, { force: true })));
    }
  }
}
