import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const promoRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(promoRoot, "..", "..");
const outputRoot = path.join(promoRoot, "public", "captures");
const captureStylesRelativePath = "media/promo-video/scripts/capture-product-scenes.css";
const viewport = Object.freeze({ width: 1920, height: 1080 });
const expectedLocale = Object.freeze({ id: "en", browser: "en-US" });
const sceneNames = Object.freeze([
  "01-compact-control.png",
  "02-expanded-bar.png",
  "03-search-palette.png",
  "04-folder-rail.png",
  "05-context-actions.png",
  "06-streamer-mode.png",
  "07-new-tab-workspace.png"
]);

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

const syntheticBookmarks = Object.freeze([
  Object.freeze({ title: "Inbox", slug: "inbox" }),
  Object.freeze({ title: "Project Hub", slug: "project-hub" }),
  Object.freeze({ title: "Project Briefs", slug: "project-briefs" }),
  Object.freeze({ title: "Docs", slug: "docs" }),
  Object.freeze({ title: "Design", slug: "design" }),
  Object.freeze({ title: "Finance", slug: "finance" }),
  Object.freeze({ title: "Calendar", slug: "calendar" }),
  Object.freeze({ title: "Insights", slug: "insights" }),
  Object.freeze({ title: "Roadmap", slug: "roadmap" }),
  Object.freeze({ title: "Releases", slug: "releases" }),
  Object.freeze({ title: "Research", slug: "research" }),
  Object.freeze({ title: "Reading List", slug: "reading-list" }),
  Object.freeze({
    title: "Resources",
    children: Object.freeze([
      Object.freeze({ title: "Templates", slug: "templates" }),
      Object.freeze({ title: "Team Notes", slug: "team-notes" }),
      Object.freeze({ title: "Reference Library", slug: "reference-library" })
    ])
  }),
  Object.freeze({
    title: "Planning",
    children: Object.freeze([
      Object.freeze({ title: "Milestones", slug: "milestones" }),
      Object.freeze({ title: "Sprint Board", slug: "sprint-board" })
    ])
  }),
  Object.freeze({
    title: "Archive",
    children: Object.freeze([
      Object.freeze({ title: "Project Archive", slug: "project-archive" })
    ])
  })
]);

main().catch((error) => {
  console.error(error);
  console.error("CAPTURE_STATUS=FAILED");
  process.exitCode = 1;
});

async function main() {
  const manifest = await assertProjectContract();
  if (process.argv.includes("--check")) {
    console.log(`Capture preflight is valid for BookmarkFlow Bar ${manifest.version}.`);
    console.log(`Output: ${path.relative(projectRoot, outputRoot).replaceAll(path.sep, "/")}`);
    console.log(`Scenes: ${sceneNames.length} x ${viewport.width}x${viewport.height} PNG`);
    console.log("CAPTURE_STATUS=CHECK_OK");
    return;
  }

  const { chromium } = await loadPlaywright();
  const executablePath = await findBrowserExecutable();
  const stagingRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-promo-scenes-"));
  const stagingCaptures = path.join(stagingRoot, "captures");
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-promo-profile-"));
  await assertTemporaryDirectory(stagingRoot, "capture staging directory");
  await assertTemporaryDirectory(profileDir, "Chrome profile directory");
  await fs.mkdir(stagingCaptures, { recursive: true });

  let server = null;
  let context = null;
  const blockedRemoteRequests = [];

  try {
    server = await startLocalDemoServer();
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      ...(executablePath ? { executablePath } : {}),
      viewport,
      deviceScaleFactor: 1,
      locale: expectedLocale.browser,
      colorScheme: "dark",
      reducedMotion: "reduce",
      timezoneId: "UTC",
      args: [
        `--disable-extensions-except=${projectRoot}`,
        `--load-extension=${projectRoot}`,
        "--disable-background-networking",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-default-apps",
        "--disable-domain-reliability",
        "--disable-features=Translate,OptimizationHints,MediaRouter",
        "--disable-search-engine-choice-screen",
        "--disable-sync",
        "--force-color-profile=srgb",
        "--lang=en-US",
        "--metrics-recording-only",
        "--no-first-run",
        "--password-store=basic"
      ]
    });

    await installNetworkGuard(context, server.origin, blockedRemoteRequests);
    const worker = await getExtensionWorker(context);
    const extensionId = getExtensionId(worker);
    await assertEnglishLocale(context, extensionId);
    const bookmarkUrls = await seedSyntheticBookmarks(worker, server.origin);
    await prewarmLocalFavicons(context, bookmarkUrls);

    const captures = [];
    captures.push(await captureCompactControl(context, worker, server.origin, stagingCaptures));
    captures.push(await captureExpandedBar(context, worker, server.origin, stagingCaptures));
    captures.push(await captureSearchPalette(context, worker, server.origin, stagingCaptures));
    captures.push(await captureFolderRail(context, worker, server.origin, stagingCaptures));
    captures.push(await captureContextActions(context, worker, server.origin, stagingCaptures));
    captures.push(await captureStreamerMode(context, worker, server.origin, stagingCaptures));
    captures.push(await captureNewTab(context, worker, extensionId, stagingCaptures));

    if (blockedRemoteRequests.length) {
      throw new Error(
        `Unexpected remote requests were blocked: ${[...new Set(blockedRemoteRequests)].sort().join(", ")}`
      );
    }

    const captureManifestPath = await writeCaptureManifest(stagingCaptures, manifest, captures);
    const published = await publishCaptures([...captures.map(({ path: capturePath }) => capturePath), captureManifestPath]);
    console.log("Generated deterministic, synthetic product scenes:");
    for (const publishedPath of published) {
      console.log(`- ${path.relative(projectRoot, publishedPath).replaceAll(path.sep, "/")}`);
    }
    console.log("CAPTURE_STATUS=GENERATED");
  } finally {
    try {
      await context?.close();
    } finally {
      try {
        await server?.close();
      } finally {
        await Promise.all([
          fs.rm(profileDir, { recursive: true, force: true }),
          fs.rm(stagingRoot, { recursive: true, force: true })
        ]);
      }
    }
  }
}

async function assertProjectContract() {
  const expectedProjectRoot = path.resolve(scriptDir, "..", "..", "..");
  if (projectRoot !== expectedProjectRoot || promoRoot !== path.join(projectRoot, "media", "promo-video")) {
    throw new Error("Promo capture paths do not resolve inside the BookmarkFlow Bar repository.");
  }
  await assertNoSymlinkPath(promoRoot, outputRoot);

  const manifestPath = path.join(projectRoot, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const permissions = new Set(manifest.permissions || []);
  if (
    manifest.manifest_version !== 3
    || manifest.default_locale !== expectedLocale.id
    || manifest.chrome_url_overrides?.newtab !== "src/newtab.html"
    || !permissions.has("bookmarks")
    || !Array.isArray(manifest.content_scripts)
    || !manifest.content_scripts.some((entry) => entry.js?.includes("src/content.js"))
  ) {
    throw new Error("The extension manifest no longer matches the capture contract.");
  }

  const messages = JSON.parse(
    await fs.readFile(path.join(projectRoot, "_locales", expectedLocale.id, "messages.json"), "utf8")
  );
  if (messages.appName?.message !== "BookmarkFlow Bar" || messages.openInNewTab?.message !== "Open in new tab") {
    throw new Error("The English locale no longer matches the expected product copy.");
  }
  if (!await fileExists(path.join(projectRoot, ...captureStylesRelativePath.split("/")))) {
    throw new Error(`Capture stylesheet is missing: ${captureStylesRelativePath}`);
  }
  return manifest;
}

async function assertNoSymlinkPath(root, destination) {
  const relative = path.relative(root, destination);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe capture destination: ${destination}`);
  }

  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    try {
      const stats = await fs.lstat(current);
      if (stats.isSymbolicLink()) {
        throw new Error(`Refusing to write captures through a symbolic link: ${current}`);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      break;
    }
  }
}

async function assertTemporaryDirectory(directory, label) {
  const tempRoot = path.resolve(os.tmpdir());
  const resolved = path.resolve(directory);
  const relative = path.relative(tempRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} is outside the operating-system temporary directory: ${resolved}`);
  }
  const stats = await fs.lstat(resolved);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${label} is not a real temporary directory: ${resolved}`);
  }
}

async function installNetworkGuard(context, allowedOrigin, blocked) {
  const allowed = new URL(allowedOrigin);
  if (allowed.protocol !== "http:" || allowed.hostname !== "127.0.0.1") {
    throw new Error(`Capture server is not loopback-only: ${allowedOrigin}`);
  }

  await context.route(/^https?:\/\//, async (route) => {
    const requestUrl = route.request().url();
    const candidate = new URL(requestUrl);
    if (candidate.origin === allowed.origin) {
      await route.continue();
      return;
    }
    blocked.push(requestUrl);
    await route.abort("blockedbyclient");
  });
}

async function startLocalDemoServer() {
  const icon = await fs.readFile(path.join(projectRoot, "icons", "icon32.png"));
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/favicons/") && url.pathname.endsWith(".svg")) {
      const key = path.posix.basename(url.pathname, ".svg");
      response.writeHead(200, {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/svg+xml; charset=utf-8",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(syntheticFaviconSvg(key));
      return;
    }

    if (url.pathname === "/favicon.ico") {
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff"
      });
      response.end(icon);
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    });
    response.end(demoPageHtml(url.pathname));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("The local capture server did not expose a TCP port.");
  }
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}

function demoPageHtml(pathname) {
  const variant = pathname.includes("search")
    ? "search"
    : pathname.includes("folder")
      ? "folder"
      : pathname.includes("streamer")
        ? "streamer"
        : "workspace";
  const faviconKey = path.posix.basename(pathname) || "workspace";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BookmarkFlow local studio</title>
  <link rel="icon" href="/favicons/${encodeURIComponent(faviconKey)}.svg" type="image/svg+xml">
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
    body { position: relative; background: #0d1118; color: #f7f9fc; }
    body::before { content: ""; position: fixed; inset: 0; background: radial-gradient(circle at 79% 24%, rgba(242, 201, 76, .16), transparent 31%), radial-gradient(circle at 18% 80%, rgba(107, 136, 255, .13), transparent 34%), linear-gradient(145deg, #101620, #0d1118 56%, #111722); }
    .shell { position: relative; min-height: 100vh; padding: 220px 112px 76px; }
    body.folder .shell { padding-left: 390px; }
    body.search .shell { opacity: .2; }
    body.search main { visibility: hidden; }
    nav { display: flex; align-items: center; justify-content: space-between; color: #98a3b4; font-size: 16px; }
    .wordmark { display: inline-flex; align-items: center; gap: 14px; color: #f7f9fc; font-size: 18px; font-weight: 800; }
    .mark { display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid rgba(242, 201, 76, .46); border-radius: 12px; background: rgba(242, 201, 76, .12); color: #f2c94c; }
    .navlinks { display: flex; gap: 34px; }
    main { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(500px, .85fr); align-items: center; gap: 94px; padding-top: 92px; }
    .eyebrow { color: #f2c94c; font-size: 15px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
    h1 { max-width: 820px; margin: 22px 0; font-size: 82px; line-height: .98; letter-spacing: -.05em; }
    p { max-width: 760px; margin: 0; color: #aeb7c5; font-size: 22px; line-height: 1.55; }
    .chips { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 38px; }
    .chip { border: 1px solid #293341; border-radius: 999px; padding: 11px 17px; background: rgba(24, 30, 40, .78); color: #d7dde7; font-size: 14px; }
    .panel { border: 1px solid #2d3744; border-radius: 26px; padding: 28px; background: linear-gradient(145deg, rgba(30, 37, 48, .97), rgba(18, 23, 31, .97)); box-shadow: 0 34px 94px rgba(0, 0, 0, .44); }
    .panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .panel-head strong { font-size: 17px; }
    .status { color: #8bdca6; font-size: 13px; }
    .row { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 14px; margin-top: 12px; border: 1px solid #313b48; border-radius: 14px; padding: 14px; background: #202730; }
    .row-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 11px; background: #2c3542; color: #f2c94c; font-size: 12px; font-weight: 800; }
    .row strong { display: block; font-size: 14px; }
    .row small { display: block; margin-top: 4px; color: #8995a6; font-size: 12px; }
    .key { border: 1px solid #3a4553; border-radius: 8px; padding: 6px 9px; color: #aeb7c5; font-size: 11px; }
    .proof { position: fixed; right: 32px; bottom: 24px; color: #667286; font-size: 11px; font-weight: 800; letter-spacing: .15em; text-transform: uppercase; }
  </style>
</head>
<body class="${variant}">
  <div class="shell">
    <nav>
      <span class="wordmark"><span class="mark">BF</span>BookmarkFlow Bar</span>
      <span class="navlinks"><span>Workspace</span><span>Bookmarks</span><span>Settings</span></span>
    </nav>
    <main>
      <section>
        <div class="eyebrow">Local-first bookmark workspace</div>
        <h1>A calmer web for focused work.</h1>
        <p>Turn browser bookmarks into an organized workspace with a multi-row bar, folder rail, and fast keyboard search.</p>
        <div class="chips"><span class="chip">Private by design</span><span class="chip">Keyboard ready</span><span class="chip">English &amp; Turkish</span></div>
      </section>
      <section class="panel" aria-label="Synthetic feature preview">
        <div class="panel-head"><strong>Today's workspace</strong><span class="status">Ready</span></div>
        <div class="row"><span class="row-icon">01</span><span><strong>Project hub</strong><small>Planning and milestones</small></span><span class="key">P</span></div>
        <div class="row"><span class="row-icon">02</span><span><strong>Knowledge base</strong><small>Notes and references</small></span><span class="key">K</span></div>
        <div class="row"><span class="row-icon">03</span><span><strong>Release board</strong><small>Checks and handoff</small></span><span class="key">R</span></div>
      </section>
    </main>
  </div>
  <div class="proof">Local demo · synthetic data</div>
</body>
</html>`;
}

function syntheticFaviconSvg(key) {
  const palettes = [
    ["#183153", "#67b7ff"], ["#3b225f", "#d6a6ff"], ["#163f35", "#75e6b5"],
    ["#5a301a", "#ffb36b"], ["#4e2232", "#ff8fb4"], ["#24345d", "#91a7ff"],
    ["#3e3918", "#f2d95c"], ["#173e46", "#6bd9e5"]
  ];
  const hash = [...key].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
  const [background, foreground] = palettes[hash % palettes.length];
  const label = key.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "B";
  const accentOffset = 7 + (hash % 9);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${background}"/><circle cx="${accentOffset}" cy="${32 - accentOffset}" r="8" fill="${foreground}" opacity=".18"/><text x="16" y="21" text-anchor="middle" fill="${foreground}" font-family="Arial, sans-serif" font-size="15" font-weight="700">${label}</text></svg>`;
}

async function getExtensionWorker(context) {
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

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    for (const worker of context.serviceWorkers()) {
      if (await isBookmarkFlowWorker(worker)) return worker;
    }
    try {
      const worker = await context.waitForEvent("serviceworker", {
        predicate: (candidate) => candidate.url().startsWith("chrome-extension://"),
        timeout: Math.min(2_000, Math.max(1, deadline - Date.now()))
      });
      if (await isBookmarkFlowWorker(worker)) return worker;
    } catch {}
  }
  throw new Error("BookmarkFlow Bar service worker was not available after launch.");
}

function getExtensionId(worker) {
  const [, , extensionId] = worker.url().split("/");
  if (!extensionId) throw new Error(`Cannot read extension id from ${worker.url()}`);
  return extensionId;
}

async function assertEnglishLocale(context, extensionId) {
  const page = await context.newPage();
  let actual;
  try {
    await page.goto(`chrome-extension://${extensionId}/src/onboarding.html`);
    await page.waitForLoadState("domcontentloaded");
    actual = await page.evaluate(() => ({
      uiLanguage: chrome.i18n.getUILanguage(),
      documentLanguage: document.documentElement.lang,
      appName: chrome.i18n.getMessage("appName"),
      folders: chrome.i18n.getMessage("folders"),
      openInNewTab: chrome.i18n.getMessage("openInNewTab")
    }));
  } finally {
    await page.close();
  }
  if (
    !actual.uiLanguage.toLowerCase().startsWith("en")
    || !actual.documentLanguage.toLowerCase().startsWith("en")
    || actual.appName !== "BookmarkFlow Bar"
    || actual.folders !== "Folders"
    || actual.openInNewTab !== "Open in new tab"
  ) {
    throw new Error(`Capture requires the en-US extension locale; received ${JSON.stringify(actual)}.`);
  }
}

async function seedSyntheticBookmarks(worker, origin) {
  await worker.evaluate(async ({ fixture, localOrigin, settings }) => {
    const [root] = await chrome.bookmarks.getTree();
    const bookmarkBar = (root.children || []).find((node) => node.folderType === "bookmarks-bar" || node.id === "1");
    if (!bookmarkBar) throw new Error("Bookmark Bar was not found in the temporary profile.");

    const existing = await chrome.bookmarks.getChildren(bookmarkBar.id);
    for (const node of existing) {
      if (node.url) await chrome.bookmarks.remove(node.id);
      else await chrome.bookmarks.removeTree(node.id);
    }

    const createNode = async (node, parentId) => {
      if (node.slug) {
        await chrome.bookmarks.create({
          parentId,
          title: node.title,
          url: `${localOrigin}/bookmarks/${node.slug}`
        });
        return;
      }
      const folder = await chrome.bookmarks.create({ parentId, title: node.title });
      for (const child of node.children || []) await createNode(child, folder.id);
    };
    for (const node of fixture) await createNode(node, bookmarkBar.id);

    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    const { disabledHosts, ...syncedSettings } = settings;
    await chrome.storage.sync.set(syncedSettings);
    await chrome.storage.local.set({
      [BookmarkFlowConfig.DATA_CONSENT_STORAGE_KEY]: BookmarkFlowConfig.DATA_CONSENT_VERSION,
      bfOnboardingSeen: true,
      disabledHosts
    });
  }, { fixture: syntheticBookmarks, localOrigin: origin, settings: baseSettings });

  const urls = [];
  const collectUrls = (nodes) => {
    for (const node of nodes) {
      if (node.slug) urls.push(`${origin}/bookmarks/${node.slug}`);
      collectUrls(node.children || []);
    }
  };
  collectUrls(syntheticBookmarks);
  return urls;
}

async function prewarmLocalFavicons(context, bookmarkUrls) {
  const page = await context.newPage();
  try {
    for (const bookmarkUrl of bookmarkUrls) {
      const slug = new URL(bookmarkUrl).pathname.split("/").filter(Boolean).at(-1);
      const expectedPath = `/favicons/${slug}.svg`;
      const faviconResponse = page.waitForResponse((response) => {
        const responseUrl = new URL(response.url());
        return responseUrl.pathname === expectedPath && response.status() === 200;
      }, { timeout: 5_000 });
      await page.goto(bookmarkUrl, { waitUntil: "load" });
      await faviconResponse;
    }
  } finally {
    await page.close();
  }
}

async function applySettings(worker, overrides = {}) {
  await worker.evaluate(async (settings) => {
    const { disabledHosts, ...syncedSettings } = settings;
    await Promise.all([
      chrome.storage.sync.set(syncedSettings),
      chrome.storage.local.set({ disabledHosts })
    ]);
  }, { ...baseSettings, ...overrides });
}

async function openDemoPage(context, worker, origin, pathname, settings = {}) {
  await applySettings(worker, settings);
  const page = await context.newPage();
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(`${origin}${pathname}`, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(document.getElementById("bookmarkflow-bar-page-style")));
  await page.waitForFunction(() => Array.from(document.querySelectorAll('[id^="bookmarkflow-bar-root-"]'))
    .some((element) => element.getBoundingClientRect().height > 0));
  await page.waitForTimeout(350);
  return page;
}

async function captureCompactControl(context, worker, origin, stagingCaptures) {
  const page = await openDemoPage(context, worker, origin, "/workspace");
  try {
    const state = await waitForContentState(worker, page, "collapsed compact control", (candidate) => (
      candidate.expanded === false
      && candidate.renderedAppExpanded === false
      && candidate.renderedAppVisible === true
    ));
    return await takeScene(page, stagingCaptures, sceneNames[0], { expanded: state.expanded });
  } finally {
    await page.close();
  }
}

async function captureExpandedBar(context, worker, origin, stagingCaptures) {
  const page = await openDemoPage(context, worker, origin, "/workspace");
  try {
    await runContentCommand(worker, page, "toggle-bar");
    const state = await waitForContentState(worker, page, "expanded bookmark bar", (candidate) => (
      candidate.expanded === true
      && candidate.renderedAppExpanded === true
      && candidate.renderedAppVisible === true
    ));
    assertBoundsInsideViewport(state.renderedAppBounds, "expanded bookmark bar");
    return await takeScene(page, stagingCaptures, sceneNames[1], { expanded: state.expanded });
  } finally {
    await page.close();
  }
}

async function captureSearchPalette(context, worker, origin, stagingCaptures) {
  const page = await openDemoPage(context, worker, origin, "/search");
  try {
    await runContentCommand(worker, page, "open-search");
    await waitForContentState(worker, page, "open search palette", (state) => state.searchOpen === true);
    await assertBookmarkQueryCount(worker, "project", 3);
    await page.keyboard.type("project", { delay: 20 });
    await page.keyboard.press("ArrowDown");
    const state = await waitForContentState(worker, page, "project results with second item selected", (candidate) => (
      candidate.searchOpen === true
      && candidate.commandResults === 3
      && candidate.commandActiveIndex === 1
    ));
    assertBoundsInsideViewport(state.commandBounds, "search palette");
    return await takeScene(page, stagingCaptures, sceneNames[2], {
      query: "project",
      results: state.commandResults,
      activeIndex: state.commandActiveIndex
    });
  } finally {
    await page.close();
  }
}

async function captureFolderRail(context, worker, origin, stagingCaptures) {
  const page = await openDemoPage(context, worker, origin, "/folder-rail", { folderRail: "left" });
  try {
    await runContentCommand(worker, page, "toggle-bar");
    const state = await waitForContentState(worker, page, "expanded left folder rail", (candidate) => (
      candidate.expanded === true
      && candidate.renderedAppExpanded === true
      && candidate.folderRail === "left"
      && candidate.renderedFolderRail === true
      && candidate.renderedFolderRailItems > 0
    ));
    assertBoundsInsideViewport(state.renderedFolderRailBounds, "folder rail");
    return await takeScene(page, stagingCaptures, sceneNames[3], {
      folderRail: state.folderRail,
      folderCount: state.renderedFolderRailItems
    });
  } finally {
    await page.close();
  }
}

async function captureContextActions(context, worker, origin, stagingCaptures) {
  const page = await openDemoPage(context, worker, origin, "/context-actions");
  try {
    await runContentCommand(worker, page, "toggle-bar");
    await waitForContentState(worker, page, "expanded bar for context menu", (state) => (
      state.expanded === true && state.renderedAppExpanded === true && state.renderedAppVisible === true
    ));
    await page.mouse.click(100, 30, { button: "right" });
    const state = await waitForContentState(worker, page, "bookmark context menu", (candidate) => (
      candidate.contextMenuOpen === true
    ));
    assertBoundsInsideViewport(state.contextMenuBounds, "bookmark context menu");
    return await takeScene(page, stagingCaptures, sceneNames[4], { contextMenuOpen: true });
  } finally {
    await page.close();
  }
}

async function captureStreamerMode(context, worker, origin, stagingCaptures) {
  const page = await openDemoPage(context, worker, origin, "/streamer", {
    rows: 1,
    streamerMode: true,
    hideEmptySearchSuggestions: true
  });
  try {
    await runContentCommand(worker, page, "toggle-bar");
    const state = await waitForContentState(worker, page, "expanded streamer mode", (candidate) => (
      candidate.expanded === true
      && candidate.renderedAppExpanded === true
      && candidate.renderedAppVisible === true
      && candidate.streamerMode === true
      && candidate.renderedStreamerMode === true
    ));
    assertBoundsInsideViewport(state.renderedAppBounds, "streamer-mode bar");
    return await takeScene(page, stagingCaptures, sceneNames[5], { streamerMode: true });
  } finally {
    await page.close();
  }
}

async function captureNewTab(context, worker, extensionId, stagingCaptures) {
  await applySettings(worker, { folderRail: "off", rows: 2 });
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/src/newtab.html`, { waitUntil: "load" });
    await page.waitForSelector("#bookmarkBar:not([hidden])");
    await page.waitForFunction(() => document.querySelectorAll(".nt-bookmark").length >= 15);
    const language = await page.evaluate(() => document.documentElement.lang);
    if (!language.toLowerCase().startsWith("en")) {
      throw new Error(`New-tab scene is not English: ${language}`);
    }
    await page.addStyleTag({
      url: `chrome-extension://${extensionId}/${captureStylesRelativePath}`
    });
    const captureStyleState = await page.locator(".nt-main").evaluate((main) => ({
      minHeight: getComputedStyle(main).minHeight,
      paddingTop: getComputedStyle(main).paddingTop
    }));
    if (captureStyleState.minHeight !== "968px") {
      throw new Error(`New-tab capture styles were not applied: ${JSON.stringify(captureStyleState)}.`);
    }
    await assertNoDocumentOverflow(page, "new-tab workspace");
    return await takeScene(page, stagingCaptures, sceneNames[6], {
      bookmarkCount: await page.locator(".nt-bookmark").count(),
      language
    });
  } finally {
    await page.close();
  }
}

async function takeScene(page, stagingCaptures, name, state) {
  if (!sceneNames.includes(name)) throw new Error(`Unknown scene name: ${name}`);
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(viewport.width - 30, viewport.height - 30);
  await page.waitForTimeout(280);
  await assertNoDocumentOverflow(page, name);
  const outputPath = path.join(stagingCaptures, name);
  await page.screenshot({
    path: outputPath,
    animations: "disabled",
    caret: "hide",
    fullPage: false,
    scale: "css",
    type: "png"
  });
  const metadata = await validatePng(outputPath);
  return { name, path: outputPath, state, ...metadata };
}

async function validatePng(filePath) {
  const buffer = await fs.readFile(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature || buffer.length < 10_000) {
    throw new Error(`Capture is not a valid non-empty PNG: ${filePath}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== viewport.width || height !== viewport.height) {
    throw new Error(`Capture must be ${viewport.width}x${viewport.height}; received ${width}x${height}: ${filePath}`);
  }
  return {
    width,
    height,
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex")
  };
}

async function writeCaptureManifest(stagingCaptures, manifest, captures) {
  if (captures.length !== sceneNames.length || captures.some((capture, index) => capture.name !== sceneNames[index])) {
    throw new Error("Capture set is incomplete or out of order.");
  }
  const captureManifestPath = path.join(stagingCaptures, "capture-manifest.json");
  const payload = {
    product: "BookmarkFlow Bar",
    extensionVersion: manifest.version,
    locale: expectedLocale.browser,
    resolution: viewport,
    format: "png",
    source: "temporary isolated Chrome profile with project-owned synthetic bookmarks",
    networkPolicy: "loopback-only; unexpected remote requests fail the run",
    captures: captures.map(({ name, width, height, bytes, sha256, state }) => ({
      file: name,
      width,
      height,
      bytes,
      sha256,
      state
    }))
  };
  await fs.writeFile(captureManifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return captureManifestPath;
}

async function publishCaptures(stagedPaths) {
  await assertNoSymlinkPath(promoRoot, outputRoot);
  const expectedNames = [...sceneNames, "capture-manifest.json"];
  const actualNames = stagedPaths.map((filePath) => path.basename(filePath));
  if (actualNames.length !== expectedNames.length || actualNames.some((name, index) => name !== expectedNames[index])) {
    throw new Error(`Unexpected capture publication set: ${actualNames.join(", ")}`);
  }

  await fs.mkdir(outputRoot, { recursive: true });
  const token = `.bookmarkflow-promo-${process.pid}-${Date.now()}`;
  const records = stagedPaths.map((source, index) => {
    const destination = path.join(outputRoot, path.basename(source));
    return {
      source,
      destination,
      temporary: `${destination}${token}.tmp-${index}`,
      backup: `${destination}${token}.bak-${index}`,
      backedUp: false,
      published: false
    };
  });
  let complete = false;

  try {
    for (const record of records) {
      await fs.copyFile(record.source, record.temporary);
      const stats = await fs.stat(record.temporary);
      if (!stats.isFile() || stats.size < 100) throw new Error(`Prepared capture is empty: ${record.temporary}`);
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
      throw new AggregateError([error, ...rollbackErrors], "Capture publication and rollback both failed.");
    }
    throw error;
  } finally {
    await Promise.all(records.map((record) => fs.rm(record.temporary, { force: true })));
    if (complete) await Promise.all(records.map((record) => fs.rm(record.backup, { force: true })));
  }
  return records.map(({ destination }) => destination);
}

async function assertBookmarkQueryCount(worker, query, expected) {
  const count = await worker.evaluate(async (searchQuery) => {
    const [root] = await chrome.bookmarks.getTree();
    const normalizedQuery = searchQuery.toLocaleLowerCase("en-US");
    const countMatches = (nodes) => (nodes || []).reduce((total, node) => {
      const ownMatch = node.url && node.title.toLocaleLowerCase("en-US").includes(normalizedQuery) ? 1 : 0;
      return total + ownMatch + countMatches(node.children);
    }, 0);
    return countMatches(root.children);
  }, query);
  if (count !== expected) throw new Error(`Expected exactly ${expected} results for ${query}; received ${count}.`);
}

async function runContentCommand(worker, page, command) {
  await page.bringToFront();
  const targetUrl = page.url();
  const response = await worker.evaluate(async ({ targetUrl: url, nextCommand }) => {
    const tabs = await chrome.tabs.query({});
    const expected = new URL(url);
    const normalizePath = (value) => value.replace(/\/+$/, "") || "/";
    const matchingTabs = tabs.filter((candidate) => {
      try {
        const actual = new URL(candidate.url || "");
        return actual.origin === expected.origin
          && normalizePath(actual.pathname) === normalizePath(expected.pathname)
          && actual.search === expected.search;
      } catch {
        return false;
      }
    });
    const activeTabs = tabs.filter((candidate) => candidate.active === true);
    const tab = matchingTabs.length === 1
      ? matchingTabs[0]
      : matchingTabs.length === 0 && activeTabs.length === 1
        ? activeTabs[0]
        : null;
    if (typeof tab?.id !== "number") {
      return {
        ok: false,
        error: `Expected exactly one demo tab for ${url}; received ${matchingTabs.length}. `
          + `Active temporary tabs: ${activeTabs.length}.`
      };
    }
    try {
      const commandResponse = await chrome.tabs.sendMessage(tab.id, {
        type: "BF_RUN_COMMAND",
        command: nextCommand
      });
      return commandResponse?.ok
        ? commandResponse
        : { ok: false, error: commandResponse?.error || `Command failed: ${nextCommand}` };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  }, { targetUrl, nextCommand: command });
  if (!response?.ok) throw new Error(response?.error || `Command failed: ${command}`);
  await page.waitForTimeout(260);
}

async function getContentState(worker, page) {
  await page.bringToFront();
  const targetUrl = page.url();
  return worker.evaluate(async (url) => {
    const tabs = await chrome.tabs.query({});
    const expected = new URL(url);
    const normalizePath = (value) => value.replace(/\/+$/, "") || "/";
    const matchingTabs = tabs.filter((candidate) => {
      try {
        const actual = new URL(candidate.url || "");
        return actual.origin === expected.origin
          && normalizePath(actual.pathname) === normalizePath(expected.pathname)
          && actual.search === expected.search;
      } catch {
        return false;
      }
    });
    const activeTabs = tabs.filter((candidate) => candidate.active === true);
    const tab = matchingTabs.length === 1
      ? matchingTabs[0]
      : matchingTabs.length === 0 && activeTabs.length === 1
        ? activeTabs[0]
        : null;
    if (typeof tab?.id !== "number") {
      return {
        ok: false,
        error: `Expected exactly one demo tab for ${url}; received ${matchingTabs.length}. `
          + `Active temporary tabs: ${activeTabs.length}.`
      };
    }
    try {
      return await chrome.tabs.sendMessage(tab.id, { type: "BF_GET_PAGE_INFO" });
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  }, targetUrl);
}

async function waitForContentState(worker, page, label, predicate) {
  const deadline = Date.now() + 6_000;
  let lastState = null;
  while (Date.now() < deadline) {
    lastState = await getContentState(worker, page);
    if (lastState?.ok && predicate(lastState)) return lastState;
    await page.waitForTimeout(100);
  }
  throw new Error(`${label} was not rendered. Last state: ${JSON.stringify(lastState)}`);
}

function assertBoundsInsideViewport(bounds, label) {
  if (!bounds) throw new Error(`${label} bounds were unavailable.`);
  const epsilon = 1;
  if (
    bounds.width <= 0
    || bounds.height <= 0
    || bounds.left < -epsilon
    || bounds.top < -epsilon
    || bounds.right > viewport.width + epsilon
    || bounds.bottom > viewport.height + epsilon
  ) {
    throw new Error(`${label} is clipped by the ${viewport.width}x${viewport.height} viewport: ${JSON.stringify(bounds)}`);
  }
}

async function assertNoDocumentOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    bodyHeight: document.body.getBoundingClientRect().height,
    bookmarkBarHeight: document.querySelector("#bookmarkBar")?.getBoundingClientRect().height || 0,
    mainHeight: document.querySelector(".nt-main")?.getBoundingClientRect().height || 0,
    mainMinHeight: document.querySelector(".nt-main")
      ? getComputedStyle(document.querySelector(".nt-main")).minHeight
      : ""
  }));
  if (metrics.scrollWidth > metrics.viewportWidth + 1 || metrics.scrollHeight > metrics.viewportHeight + 1) {
    throw new Error(
      `${label} exceeds the ${metrics.viewportWidth}x${metrics.viewportHeight} viewport `
      + `(${metrics.scrollWidth}x${metrics.scrollHeight}); layout=${JSON.stringify({
        bodyHeight: metrics.bodyHeight,
        bookmarkBarHeight: metrics.bookmarkBarHeight,
        mainHeight: metrics.mainHeight,
        mainMinHeight: metrics.mainMinHeight
      })}.`
    );
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (initialError) {
    const candidates = [
      process.env.PLAYWRIGHT_MODULE_PATH,
      await findCachedPlaywrightModule(),
      await findBundledPlaywrightModule(),
      await findCodexPlaywrightModule()
    ].filter(Boolean);
    for (const candidate of candidates) {
      try {
        return await import(pathToFileURL(candidate).href);
      } catch {}
    }
    throw new Error(
      `Playwright is unavailable. Set PLAYWRIGHT_MODULE_PATH to an existing playwright/index.mjs; no package is downloaded automatically. Original error: ${initialError?.message || initialError}`
    );
  }
}

async function findCachedPlaywrightModule() {
  const root = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx") : "";
  return findNewestFile(root, ["node_modules", "playwright", "index.mjs"]);
}

async function findBundledPlaywrightModule() {
  const root = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "OpenAI", "Codex", "runtimes", "cua_node")
    : "";
  return findNewestFile(root, ["bin", "node_modules", "playwright", "index.mjs"]);
}

async function findCodexPlaywrightModule() {
  const root = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, ".cache", "codex-runtimes") : "";
  return findNewestFile(root, ["dependencies", "node", "node_modules", "playwright", "index.mjs"]);
}

async function findNewestFile(root, suffixParts) {
  if (!root) return "";
  let entries = [];
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return "";
  }
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(root, entry.name, ...suffixParts);
    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) candidates.push({ path: candidate, mtimeMs: stats.mtimeMs });
    } catch {}
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0]?.path || "";
}

async function findBrowserExecutable() {
  const explicitPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (explicitPath && await fileExists(explicitPath)) return explicitPath;

  const browserRoot = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "ms-playwright") : "";
  if (browserRoot) {
    let entries = [];
    try {
      entries = await fs.readdir(browserRoot, { withFileTypes: true });
    } catch {}
    const cached = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith("chromium-")) continue;
      for (const relativePath of [["chrome-win64", "chrome.exe"], ["chrome-win", "chrome.exe"]]) {
        const candidate = path.join(browserRoot, entry.name, ...relativePath);
        if (await fileExists(candidate)) {
          cached.push({ path: candidate, revision: Number(entry.name.split("-")[1]) || 0 });
        }
      }
    }
    cached.sort((left, right) => right.revision - left.revision);
    if (cached[0]) return cached[0].path;
  }

  const installed = [
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
  ].filter(Boolean);
  for (const candidate of installed) {
    if (await fileExists(candidate)) return candidate;
  }
  return "";
}

async function fileExists(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}
