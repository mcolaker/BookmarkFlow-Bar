import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(projectRoot, "output", "playwright", "tour-gifs");
const framesRoot = path.join(outputRoot, "frames");
const assetDir = path.join(projectRoot, "src", "assets", "tour");
const fps = 12;
const frameDelay = 1000 / fps;
const viewport = { width: 960, height: 540 };

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
  await resetOutput();
  await fs.mkdir(assetDir, { recursive: true });
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-tour-"));
  let context = null;

  try {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport,
      args: [
        `--disable-extensions-except=${projectRoot}`,
        `--load-extension=${projectRoot}`,
        "--disable-features=Translate",
        "--disable-sync",
        "--no-first-run"
      ]
    });

    const extensionId = await getExtensionId(context);
    const worker = await getExtensionWorker(context);
    await seedDemoData(worker);

    await recordBarOpenClose(context, worker);
    await recordSearchPalette(context, worker);
    await recordFolderRail(context, worker);
    await recordStreamerMode(context, worker);
    await recordContextActions(context, worker);

    const onboarding = await context.newPage();
    await onboarding.goto(`chrome-extension://${extensionId}/src/onboarding.html`);
    await onboarding.waitForLoadState("domcontentloaded");
    await onboarding.screenshot({
      path: path.join(outputRoot, "onboarding-tour.png"),
      fullPage: true
    });
  } finally {
    await context?.close();
    await fs.rm(profileDir, { recursive: true, force: true });
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    const explicitPath = process.env.PLAYWRIGHT_MODULE_PATH;
    if (explicitPath) {
      return import(pathToFileURL(explicitPath).href);
    }

    const cacheEntry = await findCachedPlaywrightModule();
    if (cacheEntry) {
      return import(pathToFileURL(cacheEntry).href);
    }

    throw new Error(
      `Playwright module was not found. Run this script with "npx --yes playwright --version" once, or set PLAYWRIGHT_MODULE_PATH. Original error: ${error?.message || error}`
    );
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
      const stats = await fs.stat(modulePath);
      candidates.push({
        path: modulePath,
        mtimeMs: stats.mtimeMs
      });
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
  await fs.mkdir(framesRoot, { recursive: true });
}

async function getExtensionWorker(context) {
  return context.serviceWorkers()[0] || context.waitForEvent("serviceworker");
}

async function getExtensionId(context) {
  const worker = await getExtensionWorker(context);
  const [, , extensionId] = worker.url().split("/");
  if (!extensionId) {
    throw new Error(`Cannot read extension id from ${worker.url()}`);
  }

  return extensionId;
}

async function seedDemoData(worker) {
  await worker.evaluate(async (settings) => {
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

    await createBookmark("Mail", "https://mail.example.com");
    await createBookmark("Docs", "https://docs.example.com");
    await createBookmark("Design", "https://design.example.com");
    await createBookmark("Finance", "https://finance.example.com");
    await createBookmark("Projects", "https://projects.example.com");
    await createBookmark("Calendar", "https://calendar.example.com");

    const resources = await createFolder("Resources");
    await createBookmark("Design System", "https://figma.example.com/design-system", resources.id);
    await createBookmark("Brand Kit", "https://brand.example.com", resources.id);
    await createBookmark("Team Notes", "https://notes.example.com", resources.id);

    const inspiration = await createFolder("Inspiration");
    await createBookmark("Gallery", "https://gallery.example.com", inspiration.id);
    await createBookmark("Research", "https://research.example.com", inspiration.id);

    await createFolder("Tools");

    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    const { disabledHosts, ...syncedSettings } = settings;
    await chrome.storage.sync.set(syncedSettings);
    await chrome.storage.local.set({ bfOnboardingSeen: true, disabledHosts });
  }, baseSettings);
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

async function openDemoPage(context, worker, settings = {}) {
  await applySettings(worker, settings);
  const page = await context.newPage();
  await page.goto("https://example.com/");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(800);
  return page;
}

async function recordBarOpenClose(context, worker) {
  const page = await openDemoPage(context, worker);
  await captureAction("bar-open-close", page, async (timeline) => {
    await timeline(8, { y: 0, height: 126 });
    await runContentCommand(worker, page, "toggle-bar");
    await timeline(20, { y: 0, height: 126 });
    await runContentCommand(worker, page, "toggle-bar");
    await timeline(14, { y: 0, height: 126 });
  });
  await page.close();
}

async function recordSearchPalette(context, worker) {
  const page = await openDemoPage(context, worker);
  await captureAction("search-palette", page, async (timeline) => {
    await runContentCommand(worker, page, "open-search");
    await timeline(6, { x: 120, y: 42, width: 720, height: 420 });
    await page.keyboard.type("design", { delay: 45 });
    await timeline(18, { x: 120, y: 42, width: 720, height: 420 });
    await page.keyboard.press("ArrowDown");
    await timeline(10, { x: 120, y: 42, width: 720, height: 420 });
  });
  await page.close();
}

async function recordFolderRail(context, worker) {
  const page = await openDemoPage(context, worker, { folderRail: "left" });
  await runContentCommand(worker, page, "toggle-bar");
  await page.waitForTimeout(400);
  await captureAction("folder-rail", page, async (timeline) => {
    await timeline(10, { x: 0, y: 0, width: 620, height: 420 });
    await page.mouse.click(54, 140);
    await timeline(22, { x: 0, y: 0, width: 620, height: 420 });
  });
  await page.close();
}

async function recordStreamerMode(context, worker) {
  const page = await openDemoPage(context, worker);
  await runContentCommand(worker, page, "toggle-bar");
  await page.waitForTimeout(400);
  await captureAction("streamer-mode", page, async (timeline) => {
    await timeline(12, { y: 0, height: 126 });
    await applySettings(worker, { streamerMode: true });
    await page.waitForTimeout(220);
    await timeline(18, { y: 0, height: 126 });
  });
  await page.close();
}

async function recordContextActions(context, worker) {
  const page = await openDemoPage(context, worker);
  await runContentCommand(worker, page, "toggle-bar");
  await page.waitForTimeout(400);
  await captureAction("context-actions", page, async (timeline) => {
    await timeline(8, { x: 0, y: 0, width: 720, height: 360 });
    await page.mouse.click(126, 25, { button: "right" });
    await timeline(20, { x: 0, y: 0, width: 720, height: 360 });
  });
  await page.close();
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

    await chrome.tabs.sendMessage(tab.id, {
      type: "BF_RUN_COMMAND",
      command
    });
    return { ok: true };
  }, { targetUrl, command });

  if (!response?.ok) {
    throw new Error(response?.error || `Command failed: ${command}`);
  }
  await page.waitForTimeout(260);
}

function normalizeClip(clip) {
  const x = Number.isFinite(clip.x) ? clip.x : 0;
  const y = Number.isFinite(clip.y) ? clip.y : 0;
  const width = Number.isFinite(clip.width) ? clip.width : viewport.width - x;
  const height = Number.isFinite(clip.height) ? clip.height : viewport.height - y;
  return { x, y, width, height };
}

async function makeGif(name, frameDir) {
  const input = path.join(frameDir, "frame-%04d.png");
  const palette = path.join(frameDir, "palette.png");
  const output = path.join(assetDir, `${name}.gif`);
  const scaleFilter = "fps=12,scale=720:-1:flags=lanczos";

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
    output
  ]);
}
