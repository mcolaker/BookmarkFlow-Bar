import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "output", "social-v0.1.40");
const requiredPlaywrightVersion = "1.55.0";
const requiredChromiumRevision = "1187";
const folderRailDefaultMigrationKey = "bfFolderRailDefaultLeftV1";

const demoPageHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>BookmarkFlow social capture workspace</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0d1118; }
      * { box-sizing: border-box; }
      html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
      body { position: relative; background: radial-gradient(circle at 78% 68%, rgba(65, 209, 125, 0.08), transparent 30%), radial-gradient(circle at 24% 72%, rgba(242, 201, 76, 0.12), transparent 34%), linear-gradient(145deg, #101620 0%, #0d1118 56%, #111722 100%); }
      .headline { position: absolute; top: 56px; left: 58px; color: #f7f9fc; font-size: 30px; font-weight: 800; letter-spacing: -0.3px; }
      .headline small { display: block; margin-top: 10px; color: #8f98a8; font-size: 17px; font-weight: 500; letter-spacing: 0; }
      .demo-grid { position: absolute; inset: 190px 58px 72px; display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 24px; opacity: 0.66; }
      .demo-card { position: relative; overflow: hidden; border: 1px solid rgba(125, 140, 160, 0.16); border-radius: 22px; background: #141b25; box-shadow: 0 24px 70px rgba(0, 0, 0, 0.26); }
      .demo-card::before, .demo-card::after { content: ""; position: absolute; border-radius: 999px; background: #222c39; }
      .demo-card::before { top: 34px; left: 34px; width: 34%; height: 10px; }
      .demo-card::after { top: 58px; left: 34px; width: 58%; height: 10px; }
      .demo-card:nth-child(1)::after { width: 42%; }
      .demo-card::before { box-shadow: 0 0 0 16px #202a37, 0 0 0 32px #1c2530, 0 0 0 48px #182029; }
      .demo-card::after { box-shadow: 0 0 0 16px #202a37, 0 0 0 32px #1c2530, 0 0 0 48px #182029; }
      .demo-card:nth-child(2) { transform: translateY(40px); }
      .demo-card .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 34px; background: #1a222d; border-top: 1px solid rgba(125, 140, 160, 0.14); }
      .demo-card .bar span { position: absolute; top: 9px; left: 16px; width: 96px; height: 14px; border-radius: 7px; background: #2a3442; }
      .demo-card .bar i { position: absolute; top: 8px; right: 16px; width: 18px; height: 18px; border-radius: 5px; border: 1px solid rgba(242, 201, 76, 0.4); background: rgba(242, 201, 76, 0.12); }
      .chip { position: absolute; top: 216px; right: 96px; display: inline-flex; align-items: center; gap: 12px; padding: 10px 16px; border: 1px solid rgba(65, 209, 125, 0.5); border-radius: 999px; background: rgba(20, 27, 37, 0.9); color: #f7f9fc; font-size: 16px; font-weight: 600; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); }
      .chip strong { color: #41d17d; font-weight: 800; }
    </style>
  </head>
  <body>
    <h1 class="headline">BookmarkFlow Bar<small>v0.1.40 · the bar now rests as a single logo</small></h1>
    <div class="demo-grid" aria-hidden="true">
      <div class="demo-card"><div class="bar"><span></span><i></i></div></div>
      <div class="demo-card"><div class="bar"><span></span><i></i></div></div>
    </div>
    <span class="chip" aria-hidden="true"><strong>BF</strong> click to expand</span>
  </body>
</html>`;

const baseSettings = {
  enabled: true,
  showOnSites: true,
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
};

const viewport = { width: 1600, height: 900 };

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE_PATH) candidates.push(process.env.PLAYWRIGHT_MODULE_PATH);
  try { candidates.push(fileURLToPath(await import.meta.resolve("playwright"))); } catch {}
  const npxRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx") : "";
  let entries = [];
  try { entries = await fs.readdir(npxRoot, { withFileTypes: true }); } catch {}
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const modulePath = path.join(npxRoot, entry.name, "node_modules", "playwright", "index.mjs");
    try {
      const packageJson = JSON.parse(await fs.readFile(path.join(path.dirname(modulePath), "package.json"), "utf8"));
      if (packageJson.name === "playwright" && packageJson.version === requiredPlaywrightVersion) candidates.push(modulePath);
    } catch {}
  }
  for (const modulePath of [...new Set(candidates)]) {
    try { return await import(pathToFileURL(modulePath).href); } catch {}
  }
  throw new Error(`Exact Playwright ${requiredPlaywrightVersion} was not found.`);
}

async function findBrowserExecutable() {
  const browserRoots = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "ms-playwright"),
    process.env.HOME && path.join(process.env.HOME, ".cache", "ms-playwright")
  ].filter(Boolean);
  const exactBrowserDirectory = `chromium-${requiredChromiumRevision}`;
  const relativePaths = process.platform === "win32"
    ? [["chrome-win64", "chrome.exe"], ["chrome-win", "chrome.exe"]]
    : [["chrome-linux", "chrome"]];
  for (const browserRoot of browserRoots) {
    let entries = [];
    try { entries = await fs.readdir(browserRoot, { withFileTypes: true }); } catch {}
    if (!entries.some((entry) => entry.isDirectory() && entry.name === exactBrowserDirectory)) continue;
    for (const relativePath of relativePaths) {
      const candidate = path.join(browserRoot, exactBrowserDirectory, ...relativePath);
      try { if ((await fs.stat(candidate)).isFile()) return candidate; } catch {}
    }
  }
  throw new Error(`Playwright Chromium build ${requiredChromiumRevision} was not found.`);
}

async function startDemoServer() {
  const server = createServer((request, response) => {
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
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

async function getExtensionRuntime(context) {
  const isBookmarkFlowWorker = async (worker) => {
    if (!worker.url().startsWith("chrome-extension://")) return false;
    try {
      return await worker.evaluate(() => {
        const manifest = chrome.runtime?.getManifest?.();
        return manifest?.chrome_url_overrides?.newtab === "src/newtab.html" && manifest?.permissions?.includes("bookmarks");
      });
    } catch { return false; }
  };
  for (const worker of context.serviceWorkers()) {
    if (await isBookmarkFlowWorker(worker)) return worker;
  }
  const page = await context.newPage();
  await page.goto("chrome://extensions/");
  await page.waitForSelector("extensions-manager");
  const extensionId = await page.evaluate(() => {
    const items = [];
    const visit = (root) => {
      for (const element of root.querySelectorAll("*")) {
        if (element.tagName === "EXTENSIONS-ITEM" && element.id) items.push({ id: element.id, text: element.shadowRoot?.textContent || "" });
        if (element.shadowRoot) visit(element.shadowRoot);
      }
    };
    visit(document);
    return items.find((item) => item.text.includes("BookmarkFlow Bar"))?.id || "";
  });
  if (!extensionId) throw new Error("BookmarkFlow Bar was not present in chrome://extensions after launch.");
  await page.goto(`chrome-extension://${extensionId}/src/onboarding.html`);
  await page.waitForLoadState("domcontentloaded");
  return page;
}

function getExtensionId(runtime) { return runtime.url().split("/")[2]; }

async function seedDemoData(worker) {
  await worker.evaluate(async ({ settings, folderRailDefaultMigrationKey }) => {
    const [root] = await chrome.bookmarks.getTree();
    const bookmarkBar = (root.children || []).find((node) => node.folderType === "bookmarks-bar" || node.id === "1");
    if (!bookmarkBar) throw new Error("Bookmark Bar was not found.");
    const children = await chrome.bookmarks.getChildren(bookmarkBar.id);
    await Promise.all(children.map((node) => node.url ? chrome.bookmarks.remove(node.id) : chrome.bookmarks.removeTree(node.id)));
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

async function getContentState(worker, page) {
  const targetUrl = page.url();
  return worker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === url) || tabs.find((candidate) => candidate.active) || tabs[tabs.length - 1];
    if (typeof tab?.id !== "number") return { ok: false, error: "Demo tab was not found." };
    try { return await chrome.tabs.sendMessage(tab.id, { type: "BF_GET_PAGE_INFO" }); }
    catch (error) { return { ok: false, error: error?.message || String(error) }; }
  }, targetUrl);
}

async function waitForContentState(worker, page, label, predicate) {
  const deadline = Date.now() + 8000;
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await getContentState(worker, page);
    if (lastState?.ok && predicate(lastState)) return lastState;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${label}; last state: ${JSON.stringify(lastState)}`);
}

async function main() {
  const { chromium } = await loadPlaywright();
  const executablePath = await findBrowserExecutable();
  await fs.mkdir(outputDir, { recursive: true });
  let profileDir = "";
  let demoServer = null;
  let context = null;
  try {
    profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-social-"));
    demoServer = await startDemoServer();
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      executablePath,
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
    await seedDemoData(runtime);
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.goto(demoServer.url);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => Boolean(document.getElementById("bookmarkflow-bar-page-style")));
    await page.waitForFunction(() => Array.from(document.querySelectorAll('[id^="bookmarkflow-bar-root-"]')).some((element) => element.getBoundingClientRect().height > 0));
    await waitForContentState(runtime, page, "collapsed bar", (state) => (
      state.expanded === false && state.renderedAppExpanded === false && state.renderedAppVisible === true
    ));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outputDir, `bookmarkflow-v0.1.40-collapsed-${extensionId}.png`) });
    console.log(`Captured collapsed bar screenshot for ${extensionId}`);
  } finally {
    try { await context?.close(); } finally {
      try { await demoServer?.close(); } finally {
        if (profileDir) await fs.rm(profileDir, { recursive: true, force: true });
      }
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
