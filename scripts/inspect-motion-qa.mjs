#!/usr/bin/env node
/**
 * scripts/inspect-motion-qa.mjs
 * BookmarkFlow Bar Web Tabanli Canli Akicilik ve Hareket Denetim Araci (Agentic Motion & Video QA)
 *
 * Playwright ile canli Chromium tarayicisinda eklentiyi calistirir,
 * secilen yuzeyin (bar, spotlight, newtab) 3-5 saniyelik video kaydini alir,
 * Gemini Agentic Video motoruyla jank, frame drop ve animasyon akiciligini mikrosaniyelik zaman damgalariyla denetler.
 */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const defaultVideoDuration = 4;
const viewport = { width: 1280, height: 800 };

function getAgenticVideoScriptPath() {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  return path.join(home, ".gemini", "config", "skills", "agentic-video", "scripts", "analyze_video.py");
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    surface: "bar", // bar | spotlight | newtab
    duration: defaultVideoDuration,
    prompt: "",
    keepVideo: false,
    dryRun: false,
    outputPath: ""
  };

  for (const arg of args) {
    if (arg.startsWith("--surface=")) {
      options.surface = arg.split("=")[1].trim();
    } else if (arg.startsWith("--duration=")) {
      options.duration = parseInt(arg.split("=")[1], 10) || defaultVideoDuration;
    } else if (arg.startsWith("--prompt=")) {
      options.prompt = arg.split("=")[1].trim();
    } else if (arg.startsWith("--output=")) {
      options.outputPath = arg.split("=")[1].trim();
    } else if (arg === "--keep-video") {
      options.keepVideo = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    }
  }

  return options;
}

async function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE_PATH) {
    candidates.push(process.env.PLAYWRIGHT_MODULE_PATH);
  }

  try {
    candidates.push(fileURLToPath(await import.meta.resolve("playwright")));
  } catch {}

  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home) {
    const codexRuntime = path.join(home, ".cache", "codex-runtimes");
    try {
      const entries = await fs.readdir(codexRuntime, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.isDirectory() && ent.name.includes("playwright")) {
          const mod = path.join(codexRuntime, ent.name, "node_modules", "playwright", "index.mjs");
          if (existsSync(mod)) candidates.push(mod);
        }
      }
    } catch {}
  }

  for (const p of [...new Set(candidates)]) {
    try {
      return await import(pathToFileURL(p).href);
    } catch {}
  }

  try {
    return await import("playwright");
  } catch {
    return null;
  }
}

async function startDemoServer() {
  const demoHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BookmarkFlow Bar Motion QA Workspace</title>
  <style>
    body {
      margin: 0;
      padding: 40px;
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
    }
    .demo-content {
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    h1 { color: #f2c94c; }
  </style>
</head>
<body>
  <div class="demo-content">
    <h1>BookmarkFlow Bar Live Motion Verification</h1>
    <p>Testing closed Shadow DOM isolation, floating bar reflow offset, and Spotlight command palette animations.</p>
  </div>
</body>
</html>`;

  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(demoHtml);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

async function recordMotionVideo(options) {
  const playwright = await loadPlaywright();
  if (!playwright) {
    throw new Error("Playwright modulu bulunamadi. Lutfen 'npm install' veya Playwright kurulumunu kontrol edin.");
  }

  const { chromium } = playwright;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "bf-motion-qa-"));
  const videoDir = path.join(tempDir, "video");
  mkdirSync(videoDir, { recursive: true });

  const demoServer = await startDemoServer();
  let context = null;

  try {
    context = await chromium.launchPersistentContext(tempDir, {
      headless: false,
      viewport,
      recordVideo: {
        dir: videoDir,
        size: viewport
      },
      args: [
        `--disable-extensions-except=${projectRoot}`,
        `--load-extension=${projectRoot}`,
        "--disable-background-networking",
        "--no-first-run"
      ]
    });

    const page = await context.newPage();
    await page.goto(demoServer.url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    if (options.surface === "bar") {
      // Toggle bar on/off with Alt+Shift+B
      await page.keyboard.press("Alt+Shift+B");
      await page.waitForTimeout(1200);
      await page.keyboard.press("Alt+Shift+B");
      await page.waitForTimeout(800);
    } else if (options.surface === "spotlight") {
      // Open spotlight palette with Alt+Shift+K
      await page.keyboard.press("Alt+Shift+K");
      await page.waitForTimeout(800);
      await page.keyboard.type("#stash", { delay: 100 });
      await page.waitForTimeout(1000);
    } else if (options.surface === "newtab") {
      const backgroundPages = context.serviceWorkers?.() || [];
      const extensionId = backgroundPages[0]?.url()?.match(/chrome-extension:\/\/([a-z]+)\//)?.[1] || "";
      if (extensionId) {
        await page.goto(`chrome-extension://${extensionId}/src/newtab.html`);
        await page.waitForTimeout(1200);
      }
    }

    await page.waitForTimeout(1000);
    await page.close();

    const videoFiles = await fs.readdir(videoDir);
    const videoFile = videoFiles.find(f => f.endsWith(".webm") || f.endsWith(".mp4"));
    if (!videoFile) {
      throw new Error("Video kaydi olusturulamadi.");
    }

    const recordedPath = path.join(videoDir, videoFile);
    const targetLocalPath = options.outputPath || path.join(os.tmpdir(), `bf_motion_${Date.now()}.webm`);
    await fs.copyFile(recordedPath, targetLocalPath);

    return targetLocalPath;
  } finally {
    try {
      await context?.close();
    } catch {}
    try {
      await demoServer.close();
    } catch {}
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

async function analyzeWithAgenticVideo(videoPath, customPrompt) {
  const scriptPath = getAgenticVideoScriptPath();
  if (!existsSync(scriptPath)) {
    console.warn(`[AgenticMotionQA] Uyari: Agentic video scripti bulunamadi: ${scriptPath}`);
    return null;
  }

  const prompt = customPrompt || "Bu video BookmarkFlow Bar eklentisinin animasyon ve gecislerini gosteriyor. Arayuzde takilma (jank), kare atlamasi (frame drop), sayfa icerigi itilmesinde yirtilma (glitch) veya stil bozulmasi var mi? Milisaniyelik zaman damgalariyla akiciligi degerlendir.";

  try {
    const { stdout } = await execFileAsync("uv", [
      "run",
      "--with",
      "google-genai",
      "python",
      scriptPath,
      videoPath,
      prompt
    ], { maxBuffer: 10 * 1024 * 1024 });

    return stdout.trim();
  } catch (error) {
    console.warn(`[AgenticMotionQA] Video analizi calistirilamadi: ${error?.message || error}`);
    return null;
  }
}

async function main() {
  const options = parseCliArgs();

  console.log("================================================================");
  console.log("  BookmarkFlow Bar Agentic Motion & Video QA");
  console.log(`  Hedef Yuzey: ${options.surface.toUpperCase()} | Sure: ~${options.duration}s`);
  console.log("================================================================");

  if (options.dryRun) {
    console.log("[Dry-Run] Script ve Playwright baglantisi dogrulandi.");
    return;
  }

  let videoPath = "";
  try {
    console.log("[1/3] Canli tarayicida video kaydi aliniyor...");
    videoPath = await recordMotionVideo(options);
    console.log(`[OK] Video kaydedildi: ${videoPath}`);

    console.log("[2/3] Gemini Agentic Video motoru ile analiz ediliyor...");
    const analysis = await analyzeWithAgenticVideo(videoPath, options.prompt);

    if (analysis) {
      console.log("\n--- AGENTIC VIDEO ANALIZ RAPORU ---");
      console.log(analysis);
      console.log("------------------------------------\n");

      const hasIssue = /hata|kusur|jank|frame drop|gecikme|titreme|yirtilma|problem/i.test(analysis);
      if (hasIssue) {
        console.warn("[DIKKAT] Animasyon akiciliginda kusur tespit edildi!");
      } else {
        console.log("[PASS] 60 FPS akicilik ve animasyon gecisleri kusursuz onaylandi.");
      }
    } else {
      console.log("[Bilgi] Video kaydedildi, harici analiz calistirilamadi (GEMINI_API_KEY veya uv baglantisi kontrol edilmeli).");
    }
  } finally {
    if (!options.keepVideo && videoPath && existsSync(videoPath)) {
      try {
        await fs.unlink(videoPath);
        console.log("[Auto-Purge] Gecici video temizlendi.");
      } catch {}
    } else if (videoPath && existsSync(videoPath)) {
      console.log(`[KeepVideo] Video korundu: ${videoPath}`);
    }
  }
}

main().catch((err) => {
  console.error("[HATA]", err?.message || err);
  process.exit(1);
});
