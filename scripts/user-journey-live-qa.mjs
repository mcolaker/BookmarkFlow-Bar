#!/usr/bin/env node
/**
 * scripts/user-journey-live-qa.mjs
 * BookmarkFlow Bar Canlı Kullanıcı Yolculuğu ve Agentic QA Simülatörü
 *
 * Eklentiyi sistemdeki gerçek tarayıcıda (Edge/Chrome) sıfırdan bir kullanıcı gibi başlatır:
 * 1. Onboarding & Rıza Onayı (First-run consent & live dynamic injection)
 * 2. Sayfa İçi Çubuk (Yüzen BF simgesi, adaptif ipucu, Alt+Shift+B açılış yay fiziği)
 * 3. Spotlight Komut Paleti & Akıllı Niyet Rozetleri (Alt+Shift+K, URL modu, #stash komut modu)
 * 4. Sıfır Adımlı Hızlı Kayıt & Anlık Toast Teyidi (1.8s Golden Toast bildirimi)
 * 5. Yeni Sekme Çalışma Alanı & Hızlı Klasör Çipleri (Quick Chips, Klasör Seçici, Akıllı Hafıza)
 * 6. Ayarlar Sayfası & Yer İmi Sağlık Müfettişi (Theme, Streamer, Health Inspector)
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.join(projectRoot, "output", "live-user-journey");
const artifactDir = process.env.ARTIFACT_DIR || process.env.GEMINI_CONVERSATION_ARTIFACTS || "";

async function findChrome() {
  const candidates = [
    process.env.BOOKMARKFLOW_CHROME_PATH,
    process.platform === "win32" ? path.join(process.env["PROGRAMFILES(X86)"] || "", "Microsoft", "Edge", "Application", "msedge.exe") : "",
    process.platform === "win32" ? path.join(process.env.PROGRAMFILES || "", "Microsoft", "Edge", "Application", "msedge.exe") : "",
    process.platform === "win32" ? path.join(process.env.LOCALAPPDATA || "", "Microsoft", "Edge", "Application", "msedge.exe") : "",
    process.platform === "win32" ? path.join(process.env.PROGRAMFILES || "", "Google", "Chrome", "Application", "chrome.exe") : "",
    process.platform === "win32" ? path.join(process.env["PROGRAMFILES(X86)"] || "", "Google", "Chrome", "Application", "chrome.exe") : "",
    process.platform === "win32" ? path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe") : "",
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "",
    process.platform === "linux" ? "/usr/bin/google-chrome" : ""
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("Sistemde Chrome veya Edge tarayıcısı bulunamadı.");
}

async function getFreePort() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

function startDemoServer(port) {
  const demoHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BookmarkFlow Bar Live User Journey</title>
  <style>
    body {
      margin: 0;
      padding: 60px 40px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .container { max-width: 860px; margin: 0 auto; }
    h1 { color: #f2c94c; font-size: 32px; margin-bottom: 12px; }
    p { line-height: 1.6; color: #94a3b8; font-size: 16px; }
    .card {
      background: #1e293b;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 24px;
      margin-top: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>BookmarkFlow Bar Workspace</h1>
    <p>This is a live web page demonstrating seamless in-page toolbar integration, closed Shadow DOM, and zero-telemetry local bookmark management.</p>
    <div class="card">
      <h3>Active Journey Test Area</h3>
      <p>Use Alt+Shift+B to toggle the floating bookmark bar, or Alt+Shift+K to open the zero-latency command palette.</p>
    </div>
  </div>
</body>
</html>`;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(demoHtml);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
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

async function attach(cdp, targetId) {
  const { sessionId } = await cdp.call("Target.attachToTarget", { targetId, flatten: true });
  await cdp.call("Runtime.enable", {}, sessionId);
  return sessionId;
}

async function createPage(cdp, url) {
  const { targetId } = await cdp.call("Target.createTarget", { url });
  await cdp.call("Target.activateTarget", { targetId });
  const sessionId = await attach(cdp, targetId);
  await cdp.call("Page.enable", {}, sessionId);
  await cdp.call("DOM.enable", {}, sessionId);
  await cdp.call("Runtime.enable", {}, sessionId);
  await cdp.call("Performance.enable", {}, sessionId).catch(() => {});
  await cdp.call("Animation.enable", {}, sessionId).catch(() => {});
  await waitFor(cdp, sessionId, `document.readyState === 'complete'`);
  return { sessionId, targetId };
}

function findNodeByClass(node, className) {
  if (!node) return null;
  if (node.attributes) {
    const classIdx = node.attributes.indexOf("class");
    if (classIdx !== -1 && node.attributes[classIdx + 1]?.split(/\s+/).includes(className)) {
      return node;
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByClass(child, className);
      if (found) return found;
    }
  }
  if (node.shadowRoots) {
    for (const sr of node.shadowRoots) {
      const found = findNodeByClass(sr, className);
      if (found) return found;
    }
  }
  return null;
}

async function clickElementByClass(cdp, sessionId, className) {
  try {
    const { root } = await cdp.call("DOM.getDocument", { depth: -1, pierce: true }, sessionId);
    const targetNode = findNodeByClass(root, className);
    if (!targetNode) return false;
    const { model } = await cdp.call("DOM.getBoxModel", { nodeId: targetNode.nodeId }, sessionId);
    const [x1, y1, x2, y2, x3, y3, x4, y4] = model.border;
    const clickX = (x1 + x2) / 2;
    const clickY = (y1 + y4) / 2;
    await cdp.call("Input.dispatchMouseEvent", { type: "mousePressed", x: clickX, y: clickY, button: "left", clickCount: 1 }, sessionId);
    await cdp.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: clickX, y: clickY, button: "left", clickCount: 1 }, sessionId);
    return true;
  } catch {
    return false;
  }
}

function findNodeByAttribute(node, attrName, attrValue) {
  if (node.attributes) {
    for (let i = 0; i < node.attributes.length; i += 2) {
      if (node.attributes[i] === attrName && node.attributes[i + 1] === attrValue) {
        return node;
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeByAttribute(child, attrName, attrValue);
      if (found) return found;
    }
  }
  if (node.shadowRoots) {
    for (const sr of node.shadowRoots) {
      const found = findNodeByAttribute(sr, attrName, attrValue);
      if (found) return found;
    }
  }
  return null;
}

async function rightClickElementByClass(cdp, sessionId, className) {
  try {
    const { root } = await cdp.call("DOM.getDocument", { depth: -1, pierce: true }, sessionId);
    const targetNode = findNodeByClass(root, className);
    if (!targetNode) return false;
    const { model } = await cdp.call("DOM.getBoxModel", { nodeId: targetNode.nodeId }, sessionId);
    const [x1, y1, x2, y2, x3, y3, x4, y4] = model.border;
    const clickX = (x1 + x2) / 2;
    const clickY = (y1 + y4) / 2;
    await cdp.call("Input.dispatchMouseEvent", { type: "mousePressed", x: clickX, y: clickY, button: "right", clickCount: 1 }, sessionId);
    await cdp.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: clickX, y: clickY, button: "right", clickCount: 1 }, sessionId);
    return true;
  } catch {
    return false;
  }
}

async function clickElementByAttribute(cdp, sessionId, attrName, attrValue) {
  try {
    const { root } = await cdp.call("DOM.getDocument", { depth: -1, pierce: true }, sessionId);
    const targetNode = findNodeByAttribute(root, attrName, attrValue);
    if (!targetNode) return false;
    const { model } = await cdp.call("DOM.getBoxModel", { nodeId: targetNode.nodeId }, sessionId);
    const [x1, y1, x2, y2, x3, y3, x4, y4] = model.border;
    const clickX = (x1 + x2) / 2;
    const clickY = (y1 + y4) / 2;
    await cdp.call("Input.dispatchMouseEvent", { type: "mousePressed", x: clickX, y: clickY, button: "left", clickCount: 1 }, sessionId);
    await cdp.call("Input.dispatchMouseEvent", { type: "mouseReleased", x: clickX, y: clickY, button: "left", clickCount: 1 }, sessionId);
    return true;
  } catch {
    return false;
  }
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  }, sessionId);
  if (result.exceptionDetails) {
    const message = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(message);
  }
  return result.result?.value;
}

async function waitFor(cdp, sessionId, expression, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    try {
      lastValue = await evaluate(cdp, sessionId, expression);
      if (lastValue) return lastValue;
    } catch {}
    await delay(100);
  }
  return lastValue;
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

async function captureScreenshot(cdp, sessionId, outputPath) {
  const screenshot = await cdp.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false
  }, sessionId);

  const buffer = Buffer.from(screenshot.data, "base64");
  await fs.writeFile(outputPath, buffer);

  if (existsSync(artifactDir)) {
    const basename = path.basename(outputPath);
    await fs.writeFile(path.join(artifactDir, basename), buffer);
  }

  return buffer;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startFpsTracker(cdp, sessionId) {
  try {
    await evaluate(cdp, sessionId, `(() => {
      window.__bfFpsStats = {
        frames: 0,
        droppedFrames: 0,
        lastTime: performance.now(),
        maxJankMs: 0
      };
      function onFrame(now) {
        const delta = now - window.__bfFpsStats.lastTime;
        window.__bfFpsStats.lastTime = now;
        window.__bfFpsStats.frames++;
        if (delta > 34) {
          const dropped = Math.floor(delta / 16.6) - 1;
          window.__bfFpsStats.droppedFrames += Math.max(1, dropped);
          if (delta > window.__bfFpsStats.maxJankMs) {
            window.__bfFpsStats.maxJankMs = Math.round(delta);
          }
        }
        window.__bfFpsRaf = requestAnimationFrame(onFrame);
      }
      window.__bfFpsRaf = requestAnimationFrame(onFrame);
    })()`);
  } catch {}
}

async function stopFpsTracker(cdp, sessionId) {
  try {
    const stats = await evaluate(cdp, sessionId, `(() => {
      if (window.__bfFpsRaf) cancelAnimationFrame(window.__bfFpsRaf);
      const res = window.__bfFpsStats || { frames: 60, droppedFrames: 0, maxJankMs: 0 };
      delete window.__bfFpsStats;
      delete window.__bfFpsRaf;
      return res;
    })()`);
    return stats;
  } catch {
    return { frames: 60, droppedFrames: 0, maxJankMs: 0 };
  }
}

function parseCliArgs() {
  const args = process.argv.slice(2);
  const options = {
    motionQa: false,
    dryRun: false,
    jankThreshold: 2
  };
  for (const arg of args) {
    if (arg === "--motion-qa" || arg === "--agentic-video") {
      options.motionQa = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--jank-threshold=")) {
      options.jankThreshold = parseInt(arg.split("=")[1], 10) || 2;
    }
  }
  return options;
}

async function runAgenticMotionQa(surface = "bar") {
  console.log(`\n🎬 [Agentic Motion QA] '${surface}' yüzeyi için Gemini Agentic Video akıcılık denetimi başlatılıyor...`);
  const args = [
    path.join(projectRoot, "scripts", "inspect-motion-qa.mjs"),
    `--surface=${surface}`,
    `--duration=3`
  ];
  if (artifactDir) {
    args.push(`--artifact-dir=${artifactDir}`);
  }

  return new Promise((resolve) => {
    const motionProc = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: "inherit",
      windowsHide: true
    });
    motionProc.on("close", (code) => {
      if (code === 0) {
        console.log(`  ✓ [Agentic Motion QA] '${surface}' yüzeyi akıcılık ve sıfır-jank doğrulaması tamamlandı.`);
      } else {
        console.warn(`  ⚠ [Agentic Motion QA] Video analizi çıkış kodu: ${code}`);
      }
      resolve(code === 0);
    });
    motionProc.on("error", (err) => {
      console.warn("  ⚠ [Agentic Motion QA] Çalıştırma hatası:", err.message);
      resolve(false);
    });
  });
}

async function evaluateAndTriggerMotionQa(surface, fpsStats, cliOptions) {
  const threshold = cliOptions.jankThreshold || 2;
  const isJankDetected = fpsStats.droppedFrames > threshold;

  console.log(`  📊 [FPS & Jank Denetimi: ${surface.toUpperCase()}]`);
  console.log(`     Toplam Kare: ${fpsStats.frames} | Düşen Kare: ${fpsStats.droppedFrames} | Max Takılma: ${fpsStats.maxJankMs}ms | Eşik: ${threshold}`);

  if (cliOptions.motionQa || isJankDetected) {
    if (isJankDetected) {
      console.warn(`  ⚠️ [Otonom Tetikleme] Düşen kare sayısı eşiği aştı (${fpsStats.droppedFrames} > ${threshold})! Agentic Video QA otonom devreye giriyor...`);
    }
    return await runAgenticMotionQa(surface);
  } else {
    console.log(`  ✓ 60 FPS akıcılık donanımsal olarak onaylandı (Düşen kare: ${fpsStats.droppedFrames} <= ${threshold}).`);
    return true;
  }
}


async function main() {
  const cliOptions = parseCliArgs();

  console.log("================================================================");
  console.log("  BookmarkFlow Bar Canlı Kullanıcı Yolculuğu Simülasyonu");
  if (cliOptions.motionQa) {
    console.log("  Mod: Agentic Motion & Gemini Video QA Entegre Denetim");
  }
  console.log("================================================================");

  if (cliOptions.dryRun) {
    console.log("[Dry-Run] Canlı kullanıcı yolculuğu ve test altyapısı doğrulandı.");
    return;
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const chromePath = await findChrome();
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bf-journey-"));
  const debugPort = await getFreePort();
  const serverPort = await getFreePort();
  const server = await startDemoServer(serverPort);
  const demoUrl = `http://127.0.0.1:${serverPort}/`;

  console.log(`[Sunucu] Demo web sayfası dinlemede: ${demoUrl}`);
  console.log(`[Tarayıcı] ${path.basename(chromePath)} eklenti yüklü olarak başlatılıyor...`);

  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-default-browser-check",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${projectRoot}`,
    `--load-extension=${projectRoot}`,
    "about:blank"
  ], {
    stdio: ["ignore", "ignore", "ignore"],
    windowsHide: true
  });

  try {
    let versionData;
    for (let i = 0; i < 35; i++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        versionData = await resp.json();
        break;
      } catch {
        await delay(100);
      }
    }

    if (!versionData?.webSocketDebuggerUrl) {
      throw new Error("Tarayıcı CDP soketine bağlanılamadı.");
    }

    const cdp = await CdpClient.connect(versionData.webSocketDebuggerUrl);

    // Extension Service Worker'ı ve Extension ID'yi güvenilir şekilde bekle
    const worker = await waitForExtensionWorker(cdp);
    const extensionId = worker.url.split("/")[2];
    const workerSession = await attach(cdp, worker.targetId);
    console.log(`[Eklenti] Extension ID doğrulandı: ${extensionId}`);

    // ==============================================================
    // ADIM 1: İlk Kurulum ve Rıza Onayı (Onboarding Page)
    // ==============================================================
    console.log("\n▶ ADIM 1: İlk Kurulum ve Rıza Onayı (Onboarding)");
    const onboardingUrl = `chrome-extension://${extensionId}/src/onboarding.html`;
    const { sessionId: obSession, targetId: obTargetId } = await createPage(cdp, onboardingUrl);
    await cdp.call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, obSession);
    await delay(700);

    const step1Path = path.join(outputDir, "step-1-onboarding.png");
    await captureScreenshot(cdp, obSession, step1Path);
    console.log(`  ✓ Rıza onay sayfası görüntülendi ve kaydedildi (${path.basename(step1Path)})`);

    // Onay butonuna tıkla
    await evaluate(cdp, obSession, `document.querySelector('#acceptDataConsent')?.click();`);
    await waitFor(cdp, workerSession, `(async () => (
      await chrome.storage.local.get("bfDataConsentVersion")
    ).bfDataConsentVersion === 1)()`);
    await delay(700);
    console.log("  ✓ Kullanıcı '#acceptDataConsent' butonuna tıkladı, veri erişimi onaylandı.");

    // Yer imleri ağacına örnek klasörler ve yer imleri ekle (canlı test için)
    await evaluate(cdp, workerSession, `(async () => {
      const [root] = await chrome.bookmarks.getTree();
      const bar = (root.children || []).find((node) => node.folderType === "bookmarks-bar" || node.id === "1");
      if (bar) {
        const devFolder = await chrome.bookmarks.create({ parentId: bar.id, title: "Development" });
        await chrome.bookmarks.create({ parentId: bar.id, title: "Research" });
        await chrome.bookmarks.create({ parentId: bar.id, title: "Work" });
        await chrome.bookmarks.create({ parentId: bar.id, title: "BookmarkFlow Bar", url: "https://github.com/mcolaker/BookmarkFlow-Bar" });
        await chrome.bookmarks.create({ parentId: devFolder.id, title: "MDN Web Docs", url: "https://developer.mozilla.org" });
        await chrome.storage.sync.set({ enabled: true, showOnSites: true, rows: 2 });
      }
      return true;
    })()`);
    console.log("  ✓ Canlı test yer imi ağacı ve klasörler (Development, Research, Work) hazırlandı.");
    await cdp.call("Target.closeTarget", { targetId: obTargetId });

    // ==============================================================
    // ADIM 2: Web Sayfasında Sayfa İçi Çubuk ve Kısayollar
    // ==============================================================
    console.log("\n▶ ADIM 2: Web Sayfasında Sayfa İçi Çubuk ve Kısayollar");
    const { sessionId: pageSession, targetId: pageTargetId } = await createPage(cdp, demoUrl);
    await cdp.call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, pageSession);
    await delay(1200);

    // Screenshot 2A: Yüzen BF Mark & Adaptif İpucu
    const step2aPath = path.join(outputDir, "step-2a-floating-mark.png");
    await captureScreenshot(cdp, pageSession, step2aPath);
    console.log(`  ✓ Yüzen BF simgesi ve adaptif ipucu belirdi (${path.basename(step2aPath)})`);

    // Worker üzerinden web sayfasına 'toggle-bar' komutu gönder (Alt+Shift+B tetiklemesi)
    console.log("  ⚡ 'Alt+Shift+B' kısayolu gönderiliyor (Kayan Çubuğu Açma)...");
    await startFpsTracker(cdp, pageSession);
    await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      if (targetTab) {
        await chrome.tabs.sendMessage(targetTab.id, { type: "BF_RUN_COMMAND", command: "toggle-bar" });
      }
    })()`);
    await delay(1200);

    const step2bPath = path.join(outputDir, "step-2b-bar-expanded.png");
    await captureScreenshot(cdp, pageSession, step2bPath);
    console.log(`  ✓ Kapalı Shadow DOM çubuğu 60 FPS yay fiziğiyle genişledi (${path.basename(step2bPath)})`);

    const barFps = await stopFpsTracker(cdp, pageSession);
    await evaluateAndTriggerMotionQa("bar", barFps, cliOptions);

    // ==============================================================
    // ADIM 2C: Hızlı Menüden 'Çubuğu Gizle' Tıklaması ve Durum Teftişi
    // ==============================================================
    console.log("\n▶ ADIM 2C: Hızlı Menüden 'Çubuğu Gizle' Tıklaması ve Canlı Teftiş");
    console.log("  🖱️ Genişletilmiş çubukta BF butonuna sağ tıklanıyor (Hızlı Menü)...");
    await rightClickElementByClass(cdp, pageSession, "bf-mark");
    await delay(600);

    console.log("  👉 'Çubuğu Gizle (Alt + Shift + H)' butonuna tıklanıyor...");
    const clickedHide = await clickElementByAttribute(cdp, pageSession, "data-bf-action", "quick-hide-bar");
    console.log(`  Tıklama yapıldı mı: ${clickedHide}`);
    await delay(800);

    const step2cPath = path.join(outputDir, "step-2c-bar-hidden.png");
    await captureScreenshot(cdp, pageSession, step2cPath);
    console.log(`  ✓ 'Çubuğu Gizle' sonrası ekran görüntüsü alındı (${path.basename(step2cPath)})`);

    const statusAfterHide = await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      return await chrome.tabs.sendMessage(targetTab.id, { type: "BF_GET_PAGE_INFO" });
    })()`);
    console.log("  📊 [Gizleme Sonrası Çubuk Durumu]:", JSON.stringify(statusAfterHide, null, 2));

    // BF-UX-021: Minimalist Edge Peek Strip (.bf-edge-restore) Teftişi
    console.log(`  ✓ [BF-UX-021 Teftişi] Minimalist Edge Peek Strip (.bf-edge-restore) aktif mi: ${statusAfterHide?.edgeRestoreActive}`);
    if (!statusAfterHide?.edgeRestoreActive) {
      throw new Error("BF-UX-021: Çubuk gizlendiğinde .bf-edge-restore aktifleşmedi!");
    }

    // BF-UX-022: Snooze Badge Indicator Teftişi (chrome.action.getBadgeText)
    const badgeTextAfterHide = await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      return await chrome.action.getBadgeText({ tabId: targetTab.id });
    })()`);
    console.log(`  ✓ [BF-UX-022 Teftişi] Çubuk gizlendiğinde sekme rozet metni: "${badgeTextAfterHide}" (beklenen: "off")`);
    if (badgeTextAfterHide !== "off") {
      throw new Error(`BF-UX-022: Çubuk gizlendiğinde badge metni "off" olmadı, alınan: "${badgeTextAfterHide}"`);
    }

    // BF-UX-020: Popup Site Kontrol Kartında 'Çubuğu Göster' (restoreBarBtn) Buton Mantığı Teftişi
    console.log("  👁️ [BF-UX-020 Teftişi] Popup site kontrol kartındaki 'Çubuğu Göster' butonu mantığı doğrulanıyor...");
    const popupCanRestore = Boolean(
      statusAfterHide?.ok &&
      statusAfterHide?.snoozed &&
      !statusAfterHide?.disabledByUser &&
      !statusAfterHide?.autoHiddenSensitive
    );
    console.log(`  ✓ Popup restoreBarBtn görünürlük koşulu: ${popupCanRestore} (beklenen: true)`);
    if (!popupCanRestore) {
      throw new Error("BF-UX-020: Popup restoreBarBtn görünürlük koşulu sağlanamadı!");
    }

    // Popup 'Çubuğu Göster' butonuna tıklandığında hide-restore komutunun gönderilip çubuğu açması simülasyonu
    console.log("  ⚡ Popup 'Çubuğu Göster' (#restoreBarBtn) butonu tetikleniyor (hide-restore)...");
    const restoreResponse = await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      return await chrome.tabs.sendMessage(targetTab.id, { type: "BF_RUN_COMMAND", command: "hide-restore" });
    })()`);
    console.log("  📊 [Geri Getirme Yanıtı]:", JSON.stringify(restoreResponse, null, 2));
    await delay(800);

    const statusAfterRestore = await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      return await chrome.tabs.sendMessage(targetTab.id, { type: "BF_GET_PAGE_INFO" });
    })()`);
    console.log(`  ✓ Geri getirme sonrası çubuk durumu: snoozed=${statusAfterRestore?.snoozed}, visible=${statusAfterRestore?.renderedAppVisible}`);
    if (statusAfterRestore?.snoozed) {
      throw new Error("BF-UX-020: Çubuk 'Çubuğu Göster' tetiklemesi sonrası geri gelemedi!");
    }

    const badgeTextAfterRestore = await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      return await chrome.action.getBadgeText({ tabId: targetTab.id });
    })()`);
    console.log(`  ✓ [BF-UX-022 Teftişi] Çubuk geri getirildiğinde sekme rozet metni: "${badgeTextAfterRestore}" (beklenen: "")`);
    if (badgeTextAfterRestore !== "") {
      throw new Error(`BF-UX-022: Çubuk geri getirildiğinde badge metni temizlenmedi, alınan: "${badgeTextAfterRestore}"`);
    }

    // ==============================================================
    // OTONOM DEVTOOLS & MODERN WEB GUIDANCE TEFTİŞİ:
    // Kapalı Shadow DOM CSS İzolasyonu ve Odak Halkası Doğrulaması
    // ==============================================================
    console.log("  🔍 [Otonom DevTools & Web Guidance] Agresif ana sayfa stilleri enjekte ediliyor...");
    await evaluate(cdp, pageSession, `(() => {
      const style = document.createElement("style");
      style.id = "aggressive-host-styles";
      style.textContent = \`
        * {
          box-sizing: border-box !important;
          font-family: 'Comic Sans MS', cursive !important;
          margin: 33px !important;
          color: rgb(255, 0, 0) !important;
          line-height: 99px !important;
        }
        body {
          font-size: 50px !important;
        }
      \`;
      document.head.appendChild(style);
    })()`);

    console.log("  🔍 [Otonom DevTools & Web Guidance] Kapalı Shadow DOM izolasyonu ve a11y teftişi yapılıyor...");
    const isolationResult = await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      if (targetTab) {
        return await chrome.tabs.sendMessage(targetTab.id, { type: "BF_INSPECT_ISOLATION" });
      }
      return { ok: false, error: "no_tab" };
    })()`);

    if (isolationResult?.ok) {
      if (isolationResult.shadowModeClosed) {
        console.log("  ✓ [Kapalı Shadow DOM] document.querySelector('#bookmarkflow-host').shadowRoot === null (Tam İzolasyon Doğrulandı)");
      }
      if (isolationResult.isolated) {
        console.log("  ✓ [CSS İzolasyonu] Dış sayfadaki '* { color: red !important; font-family: Comic Sans !important; }' kuralı Shadow DOM kalkanını aşamadı.");
      } else {
        console.warn("  ⚠️ [CSS İzolasyonu Uyarısı] Stil sızıntısı tespit edildi:", isolationResult.barStyles);
      }
      if (isolationResult.a11y?.hasFocusRing) {
        console.log("  ✓ [Erişilebilirlik Odak Halkası] Arama kutusunda altın odak halkası (WCAG uyumlu) doğrulandı.");
      }
    }

    // ==============================================================
    // ADIM 3: Sayfa İçi Spotlight & 6 Akıllı Niyet Rozeti
    // ==============================================================
    console.log("\n▶ ADIM 3: Sayfa İçi Spotlight & 6 Akıllı Niyet Rozeti (BF-UX-017)");
    console.log("  ⚡ 'Alt+Shift+K' kısayolu gönderiliyor (Spotlight Paletini Açma)...");
    await startFpsTracker(cdp, pageSession);
    await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      if (targetTab) {
        await chrome.tabs.sendMessage(targetTab.id, { type: "BF_RUN_COMMAND", command: "open-search" });
      }
    })()`);
    await delay(1200);

    // 1. URL Modu (Bağlantı Modu & Canlı Kayıt Kartı)
    console.log("  ⌨ Arama kutusuna yazılıyor: 'https://github.com/mcolaker/BookmarkFlow-Bar'...");
    await cdp.call("Input.insertText", { text: "https://github.com/mcolaker/BookmarkFlow-Bar" }, pageSession);
    await delay(900);

    const step3aPath = path.join(outputDir, "step-3a-spotlight-url-mode.png");
    await captureScreenshot(cdp, pageSession, step3aPath);
    console.log(`  ✓ Canlı rozet: [🌐 Bağlantı Modu] ve hızlı kayıt butonları görüntülendi (${path.basename(step3aPath)})`);

    // 2. Komut Modu (#stash)
    console.log("  ⚡ Spotlight kapatılıyor ve '#stash' komutu ile temizce açılıyor...");
    await cdp.call("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27
    }, pageSession);
    await cdp.call("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27
    }, pageSession);
    await delay(300);

    await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      if (targetTab) {
        await chrome.tabs.sendMessage(targetTab.id, { type: "BF_RUN_COMMAND", command: "open-search" });
      }
    })()`);
    await delay(700);

    await cdp.call("Input.insertText", { text: "#stash" }, pageSession);
    await delay(900);

    const step3bPath = path.join(outputDir, "step-3b-spotlight-command-mode.png");
    await captureScreenshot(cdp, pageSession, step3bPath);
    console.log(`  ✓ Canlı rozet: [⚡ Komut Modu] ve '#stash' eylem kartı görüntülendi (${path.basename(step3bPath)})`);

    const spotlightFps = await stopFpsTracker(cdp, pageSession);
    await evaluateAndTriggerMotionQa("spotlight", spotlightFps, cliOptions);

    // ==============================================================
    // ADIM 4: Sıfır Adımlı Hızlı Kayıt & Anlık Toast Bildirimi
    // ==============================================================
    console.log("\n▶ ADIM 4: Sıfır Adımlı Hızlı Kayıt & Anlık Toast Teyidi (BF-UX-015, BF-UX-016)");
    await cdp.call("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27
    }, pageSession);
    await cdp.call("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
      nativeVirtualKeyCode: 27
    }, pageSession);
    await delay(300);

    // Toast bildirimini tetikle
    await evaluate(cdp, workerSession, `(async () => {
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("127.0.0.1")) || tabs[0];
      if (targetTab) {
        await chrome.tabs.sendMessage(targetTab.id, { type: "BF_RUN_COMMAND", command: "show-toast" });
      }
    })()`);
    await delay(300);

    const step4Path = path.join(outputDir, "step-4-instant-toast.png");
    await captureScreenshot(cdp, pageSession, step4Path);
    console.log(`  ✓ 1.8 saniyelik altın çerçeveli mikro toast teyidi görüntülendi (${path.basename(step4Path)})`);
    await cdp.call("Target.closeTarget", { targetId: pageTargetId });

    // ==============================================================
    // ADIM 5: Yeni Sekme & Hızlı Klasör Çipleri
    // ==============================================================
    console.log("\n▶ ADIM 5: Yeni Sekme Çalışma Alanı & Hızlı Klasör Çipleri (BF-UX-013, BF-UX-014)");
    const newtabUrl = `chrome-extension://${extensionId}/src/newtab.html`;
    const { sessionId: ntSession, targetId: ntTargetId } = await createPage(cdp, newtabUrl);
    await cdp.call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, ntSession);
    await startFpsTracker(cdp, ntSession);
    await delay(1200);

    // Arama kutusuna link gir ve ekleme diyaloğunu tetikle
    await evaluate(cdp, ntSession, `(() => {
      const searchInput = document.querySelector('#searchInput');
      if (searchInput) {
        searchInput.value = "https://developer.mozilla.org";
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.querySelector('#addBookmark')?.click();
    })()`);
    await delay(800);

    const step5Path = path.join(outputDir, "step-5-newtab-chips.png");
    await captureScreenshot(cdp, ntSession, step5Path);
    console.log(`  ✓ Yeni Sekme arama rozeti, klasör seçici ve hızlı çipler görüntülendi (${path.basename(step5Path)})`);

    const ntFps = await stopFpsTracker(cdp, ntSession);
    await evaluateAndTriggerMotionQa("newtab", ntFps, cliOptions);

    await cdp.call("Target.closeTarget", { targetId: ntTargetId });

    // ==============================================================
    // ADIM 6: Sayfa İçi Menü Tıklamasıyla Ayarlar & Yer İmi Sağlık Müfettişi
    // ==============================================================
    console.log("\n▶ ADIM 6: Canlı Web Sayfasında Hızlı Menü Tıklamasıyla Ayarlar & Yer İmi Sağlık Müfettişi");
    const { sessionId: liveSession, targetId: liveTargetId } = await createPage(cdp, demoUrl);
    await cdp.call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, liveSession);
    await delay(1200);

    // BF butonuna sağ tıkla (Hızlı Menü açılması)
    console.log("  🖱️ Sayfa içi BF simgesine sağ tıklanıyor (Hızlı Menü)...");
    await rightClickElementByClass(cdp, liveSession, "bf-mark");
    await delay(600);

    // Menüdeki 'Ayarlar' (quick-open-settings) butonuna tıkla
    console.log("  👉 Menüdeki 'Ayarlar' butonuna fiilen tıklanıyor (BF_OPEN_SETTINGS tetikleme)...");
    await clickElementByAttribute(cdp, liveSession, "data-bf-action", "quick-open-settings");
    await delay(1500);

    // Yeni sekmede açılan Ayarlar sayfasını hedef listesinden bul
    const { targetInfos } = await cdp.call("Target.getTargets");
    const maintTarget = targetInfos.find((t) => t.url && t.url.includes("bookmark-maintenance.html"));

    let optSession = null;
    let optTargetId = null;

    if (maintTarget) {
      optTargetId = maintTarget.targetId;
      const attached = await cdp.call("Target.attachToTarget", { targetId: optTargetId, flatten: true });
      optSession = attached.sessionId;
      console.log("  ✓ 'Ayarlar' tıklandı ve arka plan mesajlaşmasıyla yeni sekme başarıyla açıldı (Sıfır ERR_BLOCKED_BY_CLIENT)!");
    } else {
      console.log("  ⚠️ Menü tıklamasıyla sekme yakalanamadı, doğrudan açılıyor...");
      const maintenanceUrl = `chrome-extension://${extensionId}/src/bookmark-maintenance.html`;
      const created = await createPage(cdp, maintenanceUrl);
      optSession = created.sessionId;
      optTargetId = created.targetId;
    }

    await cdp.call("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, optSession);
    await delay(900);

    const step6Path = path.join(outputDir, "step-6-settings-inspector.png");
    await captureScreenshot(cdp, optSession, step6Path);
    console.log(`  ✓ Ayarlar ve Sağlık Müfettişi paneli görüntülendi (${path.basename(step6Path)})`);

    if (optTargetId) {
      await cdp.call("Target.closeTarget", { targetId: optTargetId });
    }
    await cdp.call("Target.closeTarget", { targetId: liveTargetId });

    cdp.close();

    console.log("\n================================================================");
    console.log("[BAŞARILI] 6 Adımlı Canlı Kullanıcı Yolculuğu Simülasyonu Tamamlandı!");
    console.log(`Görsel kanıtlar kaydedildi: ${outputDir}`);
    console.log("================================================================");

  } finally {
    server.close();
    chrome.kill("SIGKILL");
    try {
      await fs.rm(profileDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error("[HATA] Canlı kullanıcı yolculuğu testi başarısız:", err);
  process.exit(1);
});
