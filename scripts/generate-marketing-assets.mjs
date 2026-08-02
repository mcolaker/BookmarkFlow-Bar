import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const docsAssetDir = path.join(projectRoot, "docs", "assets");
const storeAssetDir = path.join(projectRoot, "store", "assets");
const outputRoot = path.join(projectRoot, "output", "marketing-assets");
const viewport = Object.freeze({ width: 1280, height: 800 });

const baseSettings = Object.freeze({
  enabled: true,
  rows: 2,
  compact: true,
  offsetPage: false,
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
  await Promise.all([
    fs.mkdir(docsAssetDir, { recursive: true }),
    fs.mkdir(storeAssetDir, { recursive: true })
  ]);

  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-marketing-"));
  const server = await startLocalDemoServer();
  let context = null;
  let blockedNetworkRequests = [];

  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      ...(executablePath ? { executablePath } : {}),
      viewport,
      deviceScaleFactor: 1,
      locale: "en-US",
      colorScheme: "dark",
      reducedMotion: "reduce",
      args: [
        `--disable-extensions-except=${projectRoot}`,
        `--load-extension=${projectRoot}`,
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-features=Translate",
        "--disable-sync",
        "--force-color-profile=srgb",
        "--lang=en-US",
        "--no-first-run"
      ]
    });
    blockedNetworkRequests = await installNetworkGuard(context, server.origin);

    const worker = await getExtensionWorker(context);
    const extensionId = getExtensionId(worker);
    await seedSyntheticBookmarks(worker, server.origin);

    const newTabPath = path.join(storeAssetDir, "screenshot-newtab-1280x800.png");
    const overlayPath = path.join(storeAssetDir, "screenshot-overlay-1280x800.png");
    const palettePath = path.join(storeAssetDir, "screenshot-palette-1280x800.png");

    await captureNewTab(context, worker, extensionId, newTabPath);
    await captureOverlay(context, worker, server.origin, overlayPath);
    await capturePalette(context, worker, server.origin, palettePath);
    await capturePromo(context, overlayPath, path.join(storeAssetDir, "promo-440x280.png"));
    await captureHero(context, newTabPath, path.join(docsAssetDir, "bookmarkflow-hero.jpg"));

    if (blockedNetworkRequests.length) {
      throw new Error(`Blocked unexpected remote requests: ${blockedNetworkRequests.join(", ")}`);
    }

    console.log("Generated project-owned marketing assets:");
    for (const assetPath of [newTabPath, overlayPath, palettePath,
      path.join(storeAssetDir, "promo-440x280.png"),
      path.join(docsAssetDir, "bookmarkflow-hero.jpg")]) {
      console.log(`- ${path.relative(projectRoot, assetPath).replaceAll(path.sep, "/")}`);
    }
  } finally {
    await context?.close();
    await server.close();
    await fs.rm(profileDir, { recursive: true, force: true });
  }
}

async function installNetworkGuard(context, allowedOrigin) {
  const blocked = [];
  await context.route(/^https?:\/\//, async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith(`${allowedOrigin}/`)) {
      await route.continue();
      return;
    }

    blocked.push(requestUrl);
    await route.abort("blockedbyclient");
  });
  return blocked;
}

async function findBrowserExecutable() {
  const explicitPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicitPath && await fileExists(explicitPath)) {
    return explicitPath;
  }

  const browserRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "ms-playwright")
    : "";
  if (browserRoot) {
    let entries = [];
    try {
      entries = await fs.readdir(browserRoot, { withFileTypes: true });
    } catch {}

    const candidates = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("chromium-")) {
        continue;
      }
      for (const relativePath of [
        ["chrome-win64", "chrome.exe"],
        ["chrome-win", "chrome.exe"]
      ]) {
        const candidate = path.join(browserRoot, entry.name, ...relativePath);
        if (await fileExists(candidate)) {
          candidates.push({ path: candidate, revision: Number(entry.name.split("-")[1]) || 0 });
        }
      }
    }
    candidates.sort((left, right) => right.revision - left.revision);
    if (candidates[0]) {
      return candidates[0].path;
    }
  }

  const installedCandidates = [
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
  ].filter(Boolean);
  for (const candidate of installedCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return "";
}

async function fileExists(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    const candidates = [
      process.env.PLAYWRIGHT_MODULE_PATH,
      await findCachedPlaywrightModule(),
      await findBundledPlaywrightModule()
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        return await import(pathToFileURL(candidate).href);
      } catch {}
    }

    throw new Error(
      `Playwright was not found. Set PLAYWRIGHT_MODULE_PATH to playwright/index.mjs. Original error: ${error?.message || error}`
    );
  }
}

async function findCachedPlaywrightModule() {
  const npxRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : "";
  return findNewestFile(npxRoot, ["node_modules", "playwright", "index.mjs"]);
}

async function findBundledPlaywrightModule() {
  const runtimeRoot = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "OpenAI", "Codex", "runtimes", "cua_node")
    : "";
  return findNewestFile(runtimeRoot, ["bin", "node_modules", "playwright", "index.mjs"]);
}

async function findNewestFile(root, suffixParts) {
  if (!root) {
    return "";
  }

  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return "";
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(root, entry.name, ...suffixParts);
    try {
      const stats = await fs.stat(candidate);
      candidates.push({ path: candidate, mtimeMs: stats.mtimeMs });
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
  await fs.mkdir(outputRoot, { recursive: true });
}

async function startLocalDemoServer() {
  const icon = await fs.readFile(path.join(projectRoot, "icons", "icon32.png"));
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname === "/favicon.ico") {
      response.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "no-store"
      });
      response.end(icon);
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'"
    });
    response.end(demoPageHtml());
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Local demo server did not expose a TCP port.");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

function demoPageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BookmarkFlow local preview</title>
  <link rel="icon" href="/favicon.ico">
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; overflow: hidden; background: #0d1118; color: #f7f9fc; }
    body::before { content: ""; position: fixed; inset: 0; background: radial-gradient(circle at 77% 24%, rgba(242, 201, 76, .16), transparent 32%), radial-gradient(circle at 17% 78%, rgba(107, 136, 255, .12), transparent 34%); }
    .shell { position: relative; min-height: 100vh; padding: 128px 72px 52px; }
    nav { display: flex; align-items: center; justify-content: space-between; color: #98a3b4; font-size: 13px; }
    .wordmark { display: inline-flex; align-items: center; gap: 10px; color: #f7f9fc; font-weight: 800; }
    .mark { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(242, 201, 76, .46); border-radius: 9px; background: rgba(242, 201, 76, .12); color: #f2c94c; }
    .navlinks { display: flex; gap: 26px; }
    main { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(360px, .8fr); align-items: center; gap: 66px; padding-top: 84px; }
    .eyebrow { color: #f2c94c; font-size: 13px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    h1 { max-width: 690px; margin: 18px 0; font-size: 72px; line-height: .98; letter-spacing: -.045em; }
    p { max-width: 610px; margin: 0; color: #aeb7c5; font-size: 20px; line-height: 1.6; }
    .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 34px; }
    .chip { border: 1px solid #293341; border-radius: 999px; padding: 9px 14px; background: rgba(24, 30, 40, .76); color: #d7dde7; font-size: 13px; }
    .panel { border: 1px solid #2d3744; border-radius: 22px; padding: 22px; background: linear-gradient(145deg, rgba(30, 37, 48, .96), rgba(18, 23, 31, .96)); box-shadow: 0 28px 80px rgba(0, 0, 0, .42); }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
    .panel-head strong { font-size: 14px; }
    .status { color: #8bdca6; font-size: 12px; }
    .row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 12px; margin-top: 10px; border: 1px solid #313b48; border-radius: 12px; padding: 12px; background: #202730; }
    .row-icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 9px; background: #2c3542; color: #f2c94c; font-size: 12px; font-weight: 800; }
    .row strong { display: block; font-size: 13px; }
    .row small { display: block; margin-top: 4px; color: #8995a6; }
    .key { border: 1px solid #3a4553; border-radius: 7px; padding: 5px 8px; color: #aeb7c5; font-size: 11px; }
  </style>
</head>
<body>
  <div class="shell">
    <nav>
      <span class="wordmark"><span class="mark">BF</span>BookmarkFlow Bar</span>
      <span class="navlinks"><span>Workspace</span><span>Bookmarks</span><span>Settings</span></span>
    </nav>
    <main>
      <section>
        <div class="eyebrow">Local-first bookmark workspace</div>
        <h1>Your work, one bookmark away.</h1>
        <p>Turn browser bookmarks into a focused workspace with a multi-row bar, folder rail, and fast keyboard search.</p>
        <div class="chips"><span class="chip">Private by design</span><span class="chip">Keyboard ready</span><span class="chip">English &amp; Turkish</span></div>
      </section>
      <section class="panel" aria-label="Feature preview">
        <div class="panel-head"><strong>Today&apos;s workspace</strong><span class="status">Ready</span></div>
        <div class="row"><span class="row-icon">01</span><span><strong>Project hub</strong><small>Planning and milestones</small></span><span class="key">P</span></div>
        <div class="row"><span class="row-icon">02</span><span><strong>Knowledge base</strong><small>Notes and references</small></span><span class="key">K</span></div>
        <div class="row"><span class="row-icon">03</span><span><strong>Release board</strong><small>Checks and handoff</small></span><span class="key">R</span></div>
      </section>
    </main>
  </div>
</body>
</html>`;
}

async function getExtensionWorker(context) {
  const existing = context.serviceWorkers().find((worker) => worker.url().startsWith("chrome-extension://"));
  if (existing) {
    return existing;
  }
  return context.waitForEvent("serviceworker", {
    predicate: (worker) => worker.url().startsWith("chrome-extension://")
  });
}

function getExtensionId(worker) {
  const [, , extensionId] = worker.url().split("/");
  if (!extensionId) {
    throw new Error(`Cannot read extension id from ${worker.url()}`);
  }
  return extensionId;
}

async function seedSyntheticBookmarks(worker, origin) {
  await worker.evaluate(async ({ settings, origin: localOrigin }) => {
    const [root] = await chrome.bookmarks.getTree();
    const bookmarkBar = (root.children || []).find((node) => node.folderType === "bookmarks-bar" || node.id === "1");
    if (!bookmarkBar) {
      throw new Error("Bookmark Bar was not found.");
    }

    const children = await chrome.bookmarks.getChildren(bookmarkBar.id);
    for (const node of children) {
      if (node.url) {
        await chrome.bookmarks.remove(node.id);
      } else {
        await chrome.bookmarks.removeTree(node.id);
      }
    }

    const bookmark = (title, slug, parentId = bookmarkBar.id) => chrome.bookmarks.create({
      parentId,
      title,
      url: `${localOrigin}/${slug}`
    });
    const folder = (title) => chrome.bookmarks.create({ parentId: bookmarkBar.id, title });

    await bookmark("Inbox", "inbox");
    await bookmark("Project Hub", "projects");
    await bookmark("Knowledge Base", "knowledge");
    await bookmark("Team Calendar", "calendar");
    await bookmark("Reports", "reports");
    await bookmark("Release Board", "releases");

    const resources = await folder("Resources");
    await bookmark("Reference Library", "reference", resources.id);
    await bookmark("Templates", "templates", resources.id);
    await bookmark("Team Notes", "notes", resources.id);

    const planning = await folder("Planning");
    await bookmark("Roadmap", "roadmap", planning.id);
    await bookmark("Milestones", "milestones", planning.id);

    const archive = await folder("Archive");
    await bookmark("Past Releases", "archive", archive.id);

    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    const { disabledHosts, ...syncedSettings } = settings;
    await chrome.storage.sync.set(syncedSettings);
    await chrome.storage.local.set({ bfOnboardingSeen: true, disabledHosts });
  }, { settings: baseSettings, origin });
}

async function applySettings(worker, overrides) {
  await worker.evaluate(async (settings) => {
    const { disabledHosts, ...syncedSettings } = settings;
    await Promise.all([
      chrome.storage.sync.set(syncedSettings),
      chrome.storage.local.set({ disabledHosts })
    ]);
  }, { ...baseSettings, ...overrides });
}

async function captureNewTab(context, worker, extensionId, outputPath) {
  await applySettings(worker, { folderRail: "left", offsetPage: true });
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/src/newtab.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#bookmarkBar:not([hidden])");
    await page.waitForFunction(() => (
      document.querySelectorAll(".nt-bookmark").length >= 6
      && document.querySelectorAll(".nt-folder-rail-item").length >= 3
    ));
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(300);
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function captureOverlay(context, worker, origin, outputPath) {
  await applySettings(worker, { folderRail: "left", offsetPage: false });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/workspace`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(900);
    await runContentCommand(worker, page, "toggle-bar");
    await page.waitForTimeout(300);
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function capturePalette(context, worker, origin, outputPath) {
  await applySettings(worker, { folderRail: "off", offsetPage: false });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/search`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    await runContentCommand(worker, page, "open-search");
    await page.keyboard.type("project", { delay: 20 });
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(300);
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function runContentCommand(worker, page, command) {
  const targetUrl = page.url();
  const response = await worker.evaluate(async ({ targetUrl: url, command: nextCommand }) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((candidate) => candidate.url === url)
      || tabs.find((candidate) => candidate.active)
      || tabs[tabs.length - 1];
    if (typeof tab?.id !== "number") {
      return { ok: false, error: "Demo tab was not found." };
    }

    await chrome.tabs.sendMessage(tab.id, { type: "BF_RUN_COMMAND", command: nextCommand });
    return { ok: true };
  }, { targetUrl, command });

  if (!response?.ok) {
    throw new Error(response?.error || `Command failed: ${command}`);
  }
  await page.waitForTimeout(260);
}

async function capturePromo(context, sourcePath, outputPath) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 440, height: 280 });
    const image = (await fs.readFile(sourcePath)).toString("base64");
    await page.setContent(marketingComposition({
      width: 440,
      height: 280,
      title: "Bookmarks, in flow.",
      subtitle: "A faster local-first bookmark workspace.",
      image,
      compact: true
    }), { waitUntil: "load" });
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function captureHero(context, sourcePath, outputPath) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 1280, height: 640 });
    const image = (await fs.readFile(sourcePath)).toString("base64");
    await page.setContent(marketingComposition({
      width: 1280,
      height: 640,
      title: "Your bookmarks. Your flow.",
      subtitle: "A focused, local-first workspace for browser bookmarks.",
      image,
      compact: false
    }), { waitUntil: "load" });
    await page.screenshot({
      path: outputPath,
      type: "jpeg",
      quality: 94,
      animations: "disabled"
    });
  } finally {
    await page.close();
  }
}

function marketingComposition({ width, height, title, subtitle, image, compact }) {
  const titleSize = compact ? 26 : 57;
  const subtitleSize = compact ? 11 : 19;
  const padding = compact ? 20 : 68;
  const previewLeft = compact ? 214 : 610;
  const previewTop = compact ? 54 : 56;
  const previewWidth = compact ? 360 : 790;
  const previewRadius = compact ? 12 : 24;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; margin: 0; overflow: hidden; }
  body { position: relative; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 85% 5%, rgba(242,201,76,.24), transparent 38%), linear-gradient(135deg, #0d1118, #181e27); color: #f8fbff; }
  .copy { position: absolute; z-index: 2; left: ${padding}px; top: ${compact ? 33 : 138}px; width: ${compact ? 190 : 510}px; }
  .mark { display: grid; width: ${compact ? 34 : 54}px; height: ${compact ? 34 : 54}px; place-items: center; border: 1px solid rgba(242,201,76,.5); border-radius: ${compact ? 9 : 14}px; background: rgba(242,201,76,.13); color: #f2c94c; font-size: ${compact ? 13 : 19}px; font-weight: 900; }
  h1 { margin: ${compact ? 16 : 28}px 0 ${compact ? 8 : 18}px; font-size: ${titleSize}px; line-height: .98; letter-spacing: -.04em; }
  p { margin: 0; color: #aeb8c7; font-size: ${subtitleSize}px; line-height: 1.55; }
  .tag { display: inline-block; margin-top: ${compact ? 12 : 28}px; border: 1px solid #303a48; border-radius: 999px; padding: ${compact ? "6px 9px" : "9px 14px"}; background: rgba(27,34,44,.76); color: #d6dde7; font-size: ${compact ? 9 : 13}px; font-weight: 700; }
  .preview { position: absolute; left: ${previewLeft}px; top: ${previewTop}px; width: ${previewWidth}px; overflow: hidden; border: 1px solid #35404f; border-radius: ${previewRadius}px; background: #151a22; box-shadow: 0 34px 100px rgba(0,0,0,.52); transform: rotate(${compact ? -3 : -2}deg); transform-origin: center; }
  .preview img { display: block; width: 100%; height: auto; }
  .glow { position: absolute; right: -12%; bottom: -42%; width: 60%; aspect-ratio: 1; border-radius: 50%; background: rgba(89,117,255,.16); filter: blur(30px); }
</style></head><body>
  <div class="glow"></div>
  <section class="copy"><div class="mark">BF</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><span class="tag">Private by design</span></section>
  <div class="preview"><img src="data:image/png;base64,${image}" alt=""></div>
</body></html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
