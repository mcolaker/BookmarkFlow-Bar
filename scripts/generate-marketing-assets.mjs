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
const storeScreenshotNames = Object.freeze([
  "screenshot-newtab-1280x800.png",
  "screenshot-overlay-1280x800.png",
  "screenshot-palette-1280x800.png",
  "screenshot-folder-rail-1280x800.png",
  "screenshot-streamer-1280x800.png"
]);

const locales = Object.freeze([
  Object.freeze({
    id: "en",
    browserLocale: "en-US",
    langArg: "en-US",
    finalOutputDir: storeAssetDir,
    productName: "BookmarkFlow Bar",
    promoTitle: "Bookmarks, in flow.",
    marqueeTitle: "Your bookmarks. Your flow.",
    marqueeSubtitle: "A focused, local-first workspace for browser bookmarks.",
    privacyLabel: "Private by design"
  }),
  Object.freeze({
    id: "tr",
    browserLocale: "tr-TR",
    langArg: "tr-TR",
    finalOutputDir: path.join(storeAssetDir, "tr"),
    productName: "BookmarkFlow Bar",
    promoTitle: "Yer imlerin, senin akışın.",
    marqueeTitle: "Yer imlerin. Senin akışın.",
    marqueeSubtitle: "Tarayıcı yer imleri için odaklı ve yerel öncelikli çalışma alanı.",
    privacyLabel: "Gizlilik odaklı"
  })
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { chromium } = await loadPlaywright();
  const executablePath = await findBrowserExecutable();
  await resetOutput();
  const captureLocales = locales.map((locale) => ({
    ...locale,
    outputDir: path.join(outputRoot, locale.id)
  }));
  await Promise.all([
    ...captureLocales.map(({ outputDir }) => fs.mkdir(outputDir, { recursive: true })),
    fs.mkdir(path.join(outputRoot, "docs"), { recursive: true })
  ]);

  const server = await startLocalDemoServer();
  const generatedAssets = [];
  const blockedNetworkRequests = [];

  try {
    for (const locale of captureLocales) {
      const result = await captureLocaleAssets({
        chromium,
        executablePath,
        serverOrigin: server.origin,
        locale
      });
      generatedAssets.push(...result.generatedAssets);
      blockedNetworkRequests.push(...result.blockedNetworkRequests);
    }

    if (blockedNetworkRequests.length) {
      throw new Error(`Blocked unexpected remote requests: ${[...new Set(blockedNetworkRequests)].join(", ")}`);
    }

    const publishedAssets = await publishMarketingAssets(generatedAssets);

    console.log("Generated project-owned marketing assets:");
    for (const assetPath of publishedAssets) {
      console.log(`- ${path.relative(projectRoot, assetPath).replaceAll(path.sep, "/")}`);
    }
  } finally {
    await server.close();
  }
}

async function captureLocaleAssets({ chromium, executablePath, serverOrigin, locale }) {
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), `bookmarkflow-marketing-${locale.id}-`));
  let context = null;
  let blockedNetworkRequests = [];
  const generatedAssets = [];

  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      ...(executablePath ? { executablePath } : {}),
      viewport,
      deviceScaleFactor: 1,
      locale: locale.browserLocale,
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
        `--lang=${locale.langArg}`,
        "--no-first-run"
      ]
    });
    blockedNetworkRequests = await installNetworkGuard(context, serverOrigin);

    const worker = await getExtensionWorker(context);
    const extensionId = getExtensionId(worker);
    await assertExtensionLocale(context, extensionId, locale);
    const bookmarkUrls = await seedSyntheticBookmarks(worker, serverOrigin, locale.id);
    await prewarmLocalFavicons(context, bookmarkUrls);

    const [newTabPath, overlayPath, palettePath, folderRailPath, streamerPath]
      = storeScreenshotNames.map((name) => path.join(locale.outputDir, name));

    await captureNewTab(context, worker, extensionId, locale, newTabPath);
    await captureOverlay(context, worker, serverOrigin, locale.id, overlayPath);
    await capturePalette(context, worker, serverOrigin, locale.id, palettePath);
    await captureFolderRail(context, worker, serverOrigin, locale.id, folderRailPath);
    await captureStreamerMode(context, worker, serverOrigin, locale.id, streamerPath);

    const promoPath = path.join(locale.outputDir, "promo-440x280.png");
    const marqueePath = path.join(locale.outputDir, "marquee-1400x560.png");
    await capturePromo(context, overlayPath, promoPath, locale);
    await captureMarquee(context, newTabPath, marqueePath, locale);

    generatedAssets.push(
      newTabPath,
      overlayPath,
      palettePath,
      folderRailPath,
      streamerPath,
      promoPath,
      marqueePath
    );

    if (locale.id === "en") {
      const heroPath = path.join(outputRoot, "docs", "bookmarkflow-hero.jpg");
      await captureHero(context, newTabPath, heroPath);
      generatedAssets.push(heroPath);
    }

    return { generatedAssets, blockedNetworkRequests };
  } finally {
    await context?.close();
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

async function publishMarketingAssets(stagedAssets) {
  const uniqueAssets = [...new Set(stagedAssets.map((assetPath) => path.resolve(assetPath)))];
  const expectedCount = locales.length * 7 + 1;
  if (uniqueAssets.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} staged marketing assets, received ${uniqueAssets.length}.`);
  }

  const publications = uniqueAssets.map((source) => {
    const relativePath = path.relative(outputRoot, source);
    const [scope, ...rest] = relativePath.split(path.sep);
    if (scope === "docs") {
      return { source, destination: path.join(docsAssetDir, ...rest) };
    }
    const locale = locales.find((candidate) => candidate.id === scope);
    if (!locale || !rest.length) {
      throw new Error(`Unexpected staged marketing path: ${relativePath}`);
    }
    return { source, destination: path.join(locale.finalOutputDir, ...rest) };
  });

  for (const publication of publications) {
    const stats = await fs.stat(publication.source);
    if (!stats.isFile() || stats.size < 100) {
      throw new Error(`Staged marketing asset is missing or empty: ${publication.source}`);
    }
  }

  await replaceFilesAtomically(publications);
  return publications.map(({ destination }) => destination);
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
      const stats = await fs.stat(record.temporary);
      if (!stats.isFile() || stats.size < 100) {
        throw new Error(`Prepared marketing asset is missing or empty: ${record.temporary}`);
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
      throw new AggregateError([error, ...rollbackErrors], "Marketing asset publication and rollback failed");
    }
    throw error;
  } finally {
    await Promise.all(records.map((record) => fs.rm(record.temporary, { force: true })));
    if (complete) {
      await Promise.all(records.map((record) => fs.rm(record.backup, { force: true })));
    }
  }
}

async function startLocalDemoServer() {
  const icon = await fs.readFile(path.join(projectRoot, "icons", "icon32.png"));
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/favicons/") && url.pathname.endsWith(".svg")) {
      const key = path.posix.basename(url.pathname, ".svg");
      response.writeHead(200, {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      response.end(syntheticFaviconSvg(key));
      return;
    }

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
    response.end(demoPageHtml({
      pathname: url.pathname,
      locale: url.searchParams.get("locale") === "tr" ? "tr" : "en"
    }));
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

function syntheticFaviconSvg(key) {
  const palettes = [
    ["#183153", "#67b7ff"],
    ["#3b225f", "#d6a6ff"],
    ["#163f35", "#75e6b5"],
    ["#5a301a", "#ffb36b"],
    ["#4e2232", "#ff8fb4"],
    ["#24345d", "#91a7ff"],
    ["#3e3918", "#f2d95c"],
    ["#173e46", "#6bd9e5"]
  ];
  const hash = [...key].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
  const [background, foreground] = palettes[hash % palettes.length];
  const label = key.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase() || "B";
  const accentOffset = 7 + (hash % 9);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" role="img" aria-label="">
  <rect width="32" height="32" rx="8" fill="${background}"/>
  <circle cx="${accentOffset}" cy="${32 - accentOffset}" r="8" fill="${foreground}" opacity=".18"/>
  <text x="16" y="21" text-anchor="middle" fill="${foreground}" font-family="Arial, sans-serif" font-size="15" font-weight="700">${escapeHtml(label)}</text>
</svg>`;
}

function demoPageHtml({ pathname, locale }) {
  const isTurkish = locale === "tr";
  const variant = pathname.includes("folder")
    ? "folder"
    : pathname.includes("search")
      ? "palette"
      : pathname.includes("streamer")
        ? "streamer"
        : "workspace";
  const copy = isTurkish
    ? {
        title: "Odak gerektiren işler için daha sakin bir web.",
        eyebrow: "Yerel öncelikli yer imi çalışma alanı",
        description: "Çok satırlı çubuk, klasör rayı ve hızlı klavye aramasıyla tarayıcı yer imlerini düzenli bir çalışma alanına dönüştürün.",
        nav: ["Çalışma alanı", "Yer imleri", "Ayarlar"],
        chips: ["Gizlilik odaklı", "Klavye hazır", "İngilizce ve Türkçe"],
        panelTitle: "Bugünün çalışma alanı",
        status: "Hazır",
        rows: [
          ["Proje merkezi", "Planlama ve kilometre taşları", "P"],
          ["Bilgi bankası", "Notlar ve kaynaklar", "B"],
          ["Sürüm panosu", "Kontroller ve teslim", "S"]
        ]
      }
    : {
        title: "A calmer web for focused work.",
        eyebrow: "Local-first bookmark workspace",
        description: "Turn browser bookmarks into an organized workspace with a multi-row bar, folder rail, and fast keyboard search.",
        nav: ["Workspace", "Bookmarks", "Settings"],
        chips: ["Private by design", "Keyboard ready", "English & Turkish"],
        panelTitle: "Today's workspace",
        status: "Ready",
        rows: [
          ["Project hub", "Planning and milestones", "P"],
          ["Knowledge base", "Notes and references", "K"],
          ["Release board", "Checks and handoff", "R"]
        ]
      };
  const faviconKey = path.posix.basename(pathname) || "workspace";

  return `<!doctype html>
<html lang="${isTurkish ? "tr" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BookmarkFlow local preview</title>
  <link rel="icon" href="/favicons/${encodeURIComponent(faviconKey)}.svg" type="image/svg+xml">
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { min-height: 100vh; margin: 0; overflow: hidden; background: #0d1118; color: #f7f9fc; }
    body::before { content: ""; position: fixed; inset: 0; background: radial-gradient(circle at 77% 24%, rgba(242, 201, 76, .16), transparent 32%), radial-gradient(circle at 17% 78%, rgba(107, 136, 255, .12), transparent 34%); }
    .shell { position: relative; min-height: 100vh; padding: 138px 72px 52px; }
    body.folder .shell { padding-left: 310px; }
    body.palette .shell { opacity: .22; }
    body.palette main { visibility: hidden; }
    nav { display: flex; align-items: center; justify-content: space-between; color: #98a3b4; font-size: 13px; }
    .wordmark { display: inline-flex; align-items: center; gap: 10px; color: #f7f9fc; font-weight: 800; }
    .mark { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(242, 201, 76, .46); border-radius: 9px; background: rgba(242, 201, 76, .12); color: #f2c94c; }
    .navlinks { display: flex; gap: 26px; }
    main { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(360px, .85fr); align-items: center; gap: 62px; padding-top: 70px; }
    .eyebrow { color: #f2c94c; font-size: 13px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    h1 { max-width: 650px; margin: 18px 0; font-size: 64px; line-height: 1; letter-spacing: -.045em; }
    p { max-width: 600px; margin: 0; color: #aeb7c5; font-size: 18px; line-height: 1.55; }
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
<body class="${variant}">
  <div class="shell">
    <nav>
      <span class="wordmark"><span class="mark">BF</span>BookmarkFlow Bar</span>
      <span class="navlinks">${copy.nav.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</span>
    </nav>
    <main>
      <section>
        <div class="eyebrow">${escapeHtml(copy.eyebrow)}</div>
        <h1>${escapeHtml(copy.title)}</h1>
        <p>${escapeHtml(copy.description)}</p>
        <div class="chips">${copy.chips.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join("")}</div>
      </section>
      <section class="panel" aria-label="Feature preview">
        <div class="panel-head"><strong>${escapeHtml(copy.panelTitle)}</strong><span class="status">${escapeHtml(copy.status)}</span></div>
        ${copy.rows.map(([title, description, key], index) => `<div class="row"><span class="row-icon">0${index + 1}</span><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)}</small></span><span class="key">${escapeHtml(key)}</span></div>`).join("")}
      </section>
    </main>
  </div>
</body>
</html>`;
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
  if (!extensionId) {
    throw new Error(`Cannot read extension id from ${worker.url()}`);
  }
  return extensionId;
}

async function assertExtensionLocale(context, extensionId, locale) {
  const messagePath = path.join(projectRoot, "_locales", locale.id, "messages.json");
  const messages = JSON.parse(await fs.readFile(messagePath, "utf8"));
  const expected = {
    appName: messages.appName?.message,
    folders: messages.folders?.message,
    openInNewTab: messages.openInNewTab?.message
  };
  const page = await context.newPage();
  let actual;
  try {
    await page.goto(`chrome-extension://${extensionId}/src/onboarding.html`);
    await page.waitForLoadState("domcontentloaded");
    actual = await page.evaluate(() => ({
      language: chrome.i18n.getUILanguage(),
      documentLanguage: document.documentElement.lang,
      appName: chrome.i18n.getMessage("appName"),
      folders: chrome.i18n.getMessage("folders"),
      openInNewTab: chrome.i18n.getMessage("openInNewTab")
    }));
  } finally {
    await page.close();
  }
  if (!actual.language.toLowerCase().startsWith(locale.id)
    || !actual.documentLanguage.toLowerCase().startsWith(locale.id)
    || actual.appName !== expected.appName
    || actual.folders !== expected.folders
    || actual.openInNewTab !== expected.openInNewTab) {
    throw new Error(
      `Marketing capture requires the ${locale.browserLocale} extension locale; received ${JSON.stringify(actual)}.`
    );
  }
}

function createSyntheticBookmarkFixture(localeId) {
  const isTurkish = localeId === "tr";
  const titles = isTurkish
    ? {
        inbox: "Gelen Kutusu",
        projectHub: "Proje Merkezi",
        projectBriefs: "Proje Özetleri",
        docs: "Belgeler",
        design: "Tasarım",
        finance: "Finans",
        calendar: "Takvim",
        insights: "Analizler",
        roadmap: "Yol Haritası",
        releases: "Sürümler",
        research: "Araştırma",
        reading: "Okuma Listesi",
        resources: "Kaynaklar",
        templates: "Şablonlar",
        teamNotes: "Ekip Notları",
        reference: "Kaynak Kitaplığı",
        planning: "Planlama",
        milestones: "Kilometre Taşları",
        sprint: "Sprint Panosu",
        archive: "Arşiv",
        projectArchive: "Proje Arşivi"
      }
    : {
        inbox: "Inbox",
        projectHub: "Project Hub",
        projectBriefs: "Project Briefs",
        docs: "Docs",
        design: "Design",
        finance: "Finance",
        calendar: "Calendar",
        insights: "Insights",
        roadmap: "Roadmap",
        releases: "Releases",
        research: "Research",
        reading: "Reading List",
        resources: "Resources",
        templates: "Templates",
        teamNotes: "Team Notes",
        reference: "Reference Library",
        planning: "Planning",
        milestones: "Milestones",
        sprint: "Sprint Board",
        archive: "Archive",
        projectArchive: "Project Archive"
      };

  return [
    { title: titles.inbox, slug: "inbox" },
    { title: titles.projectHub, slug: "project-hub" },
    { title: titles.projectBriefs, slug: "project-briefs" },
    { title: titles.docs, slug: "docs" },
    { title: titles.design, slug: "design" },
    { title: titles.finance, slug: "finance" },
    { title: titles.calendar, slug: "calendar" },
    { title: titles.insights, slug: "insights" },
    { title: titles.roadmap, slug: "roadmap" },
    { title: titles.releases, slug: "releases" },
    { title: titles.research, slug: "research" },
    { title: titles.reading, slug: "reading-list" },
    {
      title: titles.resources,
      children: [
        { title: titles.templates, slug: "templates" },
        { title: titles.teamNotes, slug: "team-notes" },
        { title: titles.reference, slug: "reference-library" }
      ]
    },
    {
      title: titles.planning,
      children: [
        { title: titles.milestones, slug: "milestones" },
        { title: titles.sprint, slug: "sprint-board" }
      ]
    },
    {
      title: titles.archive,
      children: [
        { title: titles.projectArchive, slug: "project-archive" }
      ]
    }
  ];
}

async function seedSyntheticBookmarks(worker, origin, localeId) {
  const fixture = createSyntheticBookmarkFixture(localeId);
  await worker.evaluate(async ({ settings, origin: localOrigin, fixture: bookmarkFixture }) => {
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
      for (const child of node.children || []) {
        await createNode(child, folder.id);
      }
    };

    for (const node of bookmarkFixture) {
      await createNode(node, bookmarkBar.id);
    }

    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    const { disabledHosts, ...syncedSettings } = settings;
    await chrome.storage.sync.set(syncedSettings);
    await chrome.storage.local.set({
      [BookmarkFlowConfig.DATA_CONSENT_STORAGE_KEY]: BookmarkFlowConfig.DATA_CONSENT_VERSION,
      bfOnboardingSeen: true,
      disabledHosts
    });
  }, { settings: baseSettings, origin, fixture });

  const urls = [];
  const collectUrls = (nodes) => {
    for (const node of nodes) {
      if (node.slug) {
        urls.push(`${origin}/bookmarks/${node.slug}`);
      }
      collectUrls(node.children || []);
    }
  };
  collectUrls(fixture);
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

async function applySettings(worker, overrides) {
  await worker.evaluate(async (settings) => {
    const { disabledHosts, ...syncedSettings } = settings;
    await Promise.all([
      chrome.storage.sync.set(syncedSettings),
      chrome.storage.local.set({ disabledHosts })
    ]);
  }, { ...baseSettings, ...overrides });
}

async function captureNewTab(context, worker, extensionId, locale, outputPath) {
  await applySettings(worker, { folderRail: "off", offsetPage: false, rows: 2 });
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/src/newtab.html`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForSelector("#bookmarkBar:not([hidden])");
    await page.waitForFunction(() => (
      document.querySelectorAll(".nt-bookmark").length >= 15
    ));
    const pageLanguage = await page.evaluate(() => document.documentElement.lang);
    if (!pageLanguage.toLowerCase().startsWith(locale.id)) {
      throw new Error(`New-tab capture expected ${locale.id}, received document language ${pageLanguage}.`);
    }
    await addNewTabCaptureStyles(page);
    await page.evaluate(() => document.activeElement?.blur());
    await page.mouse.move(1240, 760);
    await page.waitForTimeout(300);
    await assertNoHorizontalOverflow(page, ".nt-strip", "new-tab bookmark strip");
    await assertNoDocumentOverflow(page, "new-tab capture");
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function captureOverlay(context, worker, origin, localeId, outputPath) {
  await applySettings(worker, { folderRail: "off", offsetPage: false, rows: 2 });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/workspace?locale=${localeId}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(900);
    await runContentCommand(worker, page, "toggle-bar");
    const overlayState = await waitForContentState(worker, page, "expanded overlay", (state) => (
      state.expanded === true
      && state.renderedAppExpanded === true
      && state.renderedAppVisible === true
    ));
    assertBoundsInsideViewport(overlayState.renderedAppBounds, "expanded overlay");
    await page.mouse.move(1240, 760);
    await page.waitForTimeout(300);
    await assertNoDocumentOverflow(page, "overlay capture");
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function capturePalette(context, worker, origin, localeId, outputPath) {
  await applySettings(worker, { folderRail: "off", offsetPage: false });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/search?locale=${localeId}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    await runContentCommand(worker, page, "open-search");
    await waitForContentState(worker, page, "open search palette", (state) => state.searchOpen === true);
    const query = localeId === "tr" ? "proje" : "project";
    await assertBookmarkQueryCount(worker, query, 3);
    await page.keyboard.type(query, { delay: 20 });
    await page.keyboard.press("ArrowDown");
    const paletteState = await waitForContentState(
      worker,
      page,
      "three rendered search results with the second item selected",
      (state) => state.searchOpen === true && state.commandResults === 3 && state.commandActiveIndex === 1
    );
    assertBoundsInsideViewport(paletteState.commandBounds, "search palette");
    await page.mouse.move(1240, 760);
    await page.waitForTimeout(300);
    await assertNoDocumentOverflow(page, "palette capture");
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function captureFolderRail(context, worker, origin, localeId, outputPath) {
  await applySettings(worker, { folderRail: "left", offsetPage: false, rows: 2 });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/folder-rail?locale=${localeId}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    await runContentCommand(worker, page, "toggle-bar");
    const folderRailState = await waitForContentState(worker, page, "expanded left folder rail", (state) => (
      state.expanded === true
      && state.renderedAppExpanded === true
      && state.folderRail === "left"
      && state.renderedFolderRail === true
      && state.renderedFolderRailItems > 0
    ));
    assertBoundsInsideViewport(folderRailState.renderedFolderRailBounds, "folder rail");
    await page.mouse.move(1240, 760);
    await page.waitForTimeout(300);
    await assertNoDocumentOverflow(page, "folder rail capture");
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function captureStreamerMode(context, worker, origin, localeId, outputPath) {
  await applySettings(worker, {
    folderRail: "off",
    offsetPage: false,
    rows: 1,
    streamerMode: true,
    hideEmptySearchSuggestions: true
  });
  const page = await context.newPage();
  try {
    await page.goto(`${origin}/streamer?locale=${localeId}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    await runContentCommand(worker, page, "toggle-bar");
    const streamerState = await waitForContentState(worker, page, "expanded streamer mode", (state) => (
      state.expanded === true
      && state.renderedAppExpanded === true
      && state.streamerMode === true
      && state.renderedStreamerMode === true
      && state.renderedAppVisible === true
    ));
    assertBoundsInsideViewport(streamerState.renderedAppBounds, "streamer-mode bar");
    await page.mouse.move(1240, 760);
    await page.waitForTimeout(300);
    await assertNoDocumentOverflow(page, "streamer mode capture");
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function addNewTabCaptureStyles(page) {
  await page.addStyleTag({
    content: `
      html,
      body {
        overflow: hidden !important;
      }

      .nt-strip,
      .nt-folder-rail-list {
        scrollbar-width: none !important;
      }

      .nt-strip::-webkit-scrollbar,
      .nt-folder-rail-list::-webkit-scrollbar {
        display: none !important;
      }

      .nt-main {
        min-height: calc(100vh - 92px) !important;
        padding: 76px 20px 64px !important;
      }

      .nt-search {
        gap: 20px !important;
      }

      .nt-search-label {
        font-size: clamp(52px, 6vw, 72px) !important;
      }
    `
  });
}

async function assertBookmarkQueryCount(worker, query, minimum) {
  const resultCount = await worker.evaluate(async (searchQuery) => {
    const [root] = await chrome.bookmarks.getTree();
    const normalizedQuery = searchQuery.toLocaleLowerCase();
    const countMatches = (nodes) => (nodes || []).reduce((count, node) => {
      const ownMatch = node.url && node.title.toLocaleLowerCase().includes(normalizedQuery) ? 1 : 0;
      return count + ownMatch + countMatches(node.children);
    }, 0);
    return countMatches(root.children);
  }, query);

  if (resultCount < minimum) {
    throw new Error(`Expected at least ${minimum} results for ${query}, received ${resultCount}.`);
  }
}

async function assertNoHorizontalOverflow(page, selector, label) {
  const metrics = await page.locator(selector).evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }));
  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    throw new Error(`${label} overflows horizontally (${metrics.scrollWidth}px > ${metrics.clientWidth}px).`);
  }
}

async function assertNoDocumentOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight
  }));
  if (metrics.scrollWidth > metrics.viewportWidth + 1 || metrics.scrollHeight > metrics.viewportHeight + 1) {
    throw new Error(
      `${label} exceeds the ${metrics.viewportWidth}x${metrics.viewportHeight} viewport `
      + `(${metrics.scrollWidth}x${metrics.scrollHeight}).`
    );
  }
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

    const commandResponse = await chrome.tabs.sendMessage(tab.id, {
      type: "BF_RUN_COMMAND",
      command: nextCommand
    });
    return commandResponse?.ok
      ? commandResponse
      : { ok: false, error: commandResponse?.error || `Command failed: ${nextCommand}` };
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

async function capturePromo(context, sourcePath, outputPath, locale) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 440, height: 280 });
    const image = (await fs.readFile(sourcePath)).toString("base64");
    await page.setContent(marketingComposition({
      width: 440,
      height: 280,
      productName: locale.productName,
      title: locale.promoTitle,
      subtitle: "",
      privacyLabel: locale.privacyLabel,
      image,
      variant: "promo"
    }), { waitUntil: "load" });
    await page.screenshot({ path: outputPath, animations: "disabled" });
  } finally {
    await page.close();
  }
}

async function captureMarquee(context, sourcePath, outputPath, locale) {
  const page = await context.newPage();
  try {
    await page.setViewportSize({ width: 1400, height: 560 });
    const image = (await fs.readFile(sourcePath)).toString("base64");
    await page.setContent(marketingComposition({
      width: 1400,
      height: 560,
      productName: locale.productName,
      title: locale.marqueeTitle,
      subtitle: locale.marqueeSubtitle,
      privacyLabel: locale.privacyLabel,
      image,
      variant: "marquee"
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
      productName: "BookmarkFlow Bar",
      title: "Your bookmarks. Your flow.",
      subtitle: "A focused, local-first workspace for browser bookmarks.",
      privacyLabel: "Private by design",
      image,
      variant: "hero"
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

function marketingComposition({ width, height, productName, title, subtitle, privacyLabel, image, variant }) {
  const layouts = {
    promo: {
      copyLeft: 20,
      copyTop: 30,
      copyWidth: 168,
      markSize: 30,
      brandSize: 11,
      titleSize: 26,
      titleMargin: "22px 0 0",
      subtitleSize: 0,
      previewLeft: 196,
      previewTop: 88,
      previewWidth: 230,
      previewHeight: 144,
      previewRadius: 10,
      showTag: false
    },
    marquee: {
      copyLeft: 82,
      copyTop: 92,
      copyWidth: 500,
      markSize: 48,
      brandSize: 16,
      titleSize: 56,
      titleMargin: "34px 0 18px",
      subtitleSize: 18,
      previewLeft: 624,
      previewTop: 52,
      previewWidth: 730,
      previewHeight: 456,
      previewRadius: 22,
      showTag: true
    },
    hero: {
      copyLeft: 62,
      copyTop: 118,
      copyWidth: 500,
      markSize: 50,
      brandSize: 17,
      titleSize: 54,
      titleMargin: "34px 0 18px",
      subtitleSize: 18,
      previewLeft: 610,
      previewTop: 122,
      previewWidth: 628,
      previewHeight: 393,
      previewRadius: 22,
      showTag: true
    }
  };
  const layout = layouts[variant] || layouts.hero;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; margin: 0; overflow: hidden; }
  body { position: relative; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 85% 5%, rgba(242,201,76,.24), transparent 38%), linear-gradient(135deg, #0d1118, #181e27); color: #f8fbff; }
  .copy { position: absolute; z-index: 2; left: ${layout.copyLeft}px; top: ${layout.copyTop}px; width: ${layout.copyWidth}px; }
  .brand { display: flex; align-items: center; gap: ${variant === "promo" ? 9 : 14}px; color: #f8fbff; font-size: ${layout.brandSize}px; font-weight: 800; letter-spacing: -.01em; }
  .mark { display: grid; width: ${layout.markSize}px; height: ${layout.markSize}px; flex: 0 0 ${layout.markSize}px; place-items: center; border: 1px solid rgba(242,201,76,.5); border-radius: ${variant === "promo" ? 8 : 14}px; background: rgba(242,201,76,.13); color: #f2c94c; font-size: ${variant === "promo" ? 11 : 18}px; font-weight: 900; }
  h1 { margin: ${layout.titleMargin}; font-size: ${layout.titleSize}px; line-height: 1; letter-spacing: -.04em; }
  p { margin: 0; color: #aeb8c7; font-size: ${layout.subtitleSize}px; line-height: 1.55; }
  .tag { display: inline-block; margin-top: 26px; border: 1px solid #303a48; border-radius: 999px; padding: 9px 14px; background: rgba(27,34,44,.76); color: #d6dde7; font-size: 12px; font-weight: 700; }
  .preview { position: absolute; left: ${layout.previewLeft}px; top: ${layout.previewTop}px; width: ${layout.previewWidth}px; height: ${layout.previewHeight}px; overflow: hidden; border: 1px solid #35404f; border-radius: ${layout.previewRadius}px; background: #151a22; box-shadow: 0 34px 100px rgba(0,0,0,.52); }
  .preview img { display: block; width: 100%; height: 100%; object-fit: contain; }
  .glow { position: absolute; right: -12%; bottom: -42%; width: 60%; aspect-ratio: 1; border-radius: 50%; background: rgba(89,117,255,.16); filter: blur(30px); }
</style></head><body>
  <div class="glow"></div>
  <section class="copy">
    <div class="brand"><span class="mark">BF</span><span>${escapeHtml(productName)}</span></div>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
    ${layout.showTag ? `<span class="tag">${escapeHtml(privacyLabel)}</span>` : ""}
  </section>
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
