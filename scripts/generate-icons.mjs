import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const sourcePage = path.join(projectRoot, "src", "onboarding.html");
const iconDir = path.join(projectRoot, "icons");
const iconSizes = Object.freeze([16, 32, 48, 128, 512]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const { chromium } = await loadPlaywright();
  const executablePath = await findBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ["--disable-background-networking", "--force-color-profile=srgb"]
  });

  try {
    await fs.mkdir(iconDir, { recursive: true });
    for (const size of iconSizes) {
      await renderIcon(browser, size);
    }
  } finally {
    await browser.close();
  }

  console.log(`Generated ${iconSizes.length} canonical BookmarkFlow icons from src/onboarding.html.`);
}

async function renderIcon(browser, size) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
    colorScheme: "dark"
  });

  try {
    await page.goto(pathToFileURL(sourcePage).href, { waitUntil: "load" });
    const inset = Math.max(2, Math.round(size / 8));
    const artworkSize = size - inset * 2;
    await page.evaluate(({ canvasSize, artworkSize, inset }) => {
      const mark = document.querySelector(".mark");
      if (!(mark instanceof HTMLElement)) {
        throw new Error("Canonical onboarding mark was not found.");
      }

      document.documentElement.style.cssText = [
        `width:${canvasSize}px`,
        `height:${canvasSize}px`,
        "margin:0",
        "background:transparent",
        "overflow:hidden"
      ].join(";");
      document.body.replaceChildren(mark);
      document.body.style.cssText = [
        `width:${canvasSize}px`,
        `height:${canvasSize}px`,
        "min-width:0",
        "margin:0",
        "background:transparent",
        "overflow:hidden",
        "position:relative"
      ].join(";");
      mark.style.cssText = [
        "display:grid",
        "place-items:center",
        "position:absolute",
        `left:${inset}px`,
        `top:${inset}px`,
        `width:${artworkSize}px`,
        `height:${artworkSize}px`,
        `border-radius:${Math.max(2, Math.round(artworkSize * 0.18))}px`,
        "background:#f2c94c",
        "color:#11151d",
        `font-size:${Math.max(5, Math.round(artworkSize * 0.4))}px`,
        "font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
        "font-weight:900",
        "line-height:1",
        "letter-spacing:-0.02em"
      ].join(";");
    }, { canvasSize: size, artworkSize, inset });

    await page.screenshot({
      path: path.join(iconDir, `icon${size}.png`),
      clip: { x: 0, y: 0, width: size, height: size },
      omitBackground: true,
      animations: "disabled"
    });
  } finally {
    await page.close();
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    const candidates = [
      process.env.PLAYWRIGHT_MODULE_PATH,
      await findCachedPlaywrightModule(),
      await findCodexPlaywrightModule()
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
  const root = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, "npm-cache", "_npx")
    : "";
  return findNewestFile(root, ["node_modules", "playwright", "index.mjs"]);
}

async function findCodexPlaywrightModule() {
  const userProfile = process.env.USERPROFILE || "";
  const root = userProfile
    ? path.join(userProfile, ".cache", "codex-runtimes")
    : "";
  return findNewestFile(root, ["dependencies", "node", "node_modules", "playwright", "index.mjs"]);
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

async function findBrowserExecutable() {
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if ((await fs.stat(candidate)).isFile()) {
        return candidate;
      }
    } catch {}
  }
  return "";
}
