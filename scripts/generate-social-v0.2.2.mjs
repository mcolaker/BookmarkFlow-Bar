#!/usr/bin/env node
/**
 * scripts/generate-social-v0.2.2.mjs
 * BookmarkFlow Bar v0.2.2 Sosyal Medya ve Tanitim Gorselleri Uretim Scripti
 *
 * X (Twitter) Card: 1200x675
 * LinkedIn Card: 1200x627
 *
 * 9 unreleased ozelligi (Smart Intent Badges, Instant Folder Chips, Toast Feedback,
 * Quick Chips, Desktop Companion) en yuksek gorsel sadakatle tanitir.
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
const outputDir = path.join(projectRoot, "output", "social-v0.2.2");
const artifactDir = "C:\\Users\\MUHAMMED\\.gemini\\antigravity\\brain\\8fc617a4-674f-4d52-ac0c-94efcd56c692";

function renderCardHtml(mode = "x") {
  const isLinkedIn = mode === "linkedin";
  const height = isLinkedIn ? 627 : 675;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BookmarkFlow Bar v0.2.2 Social Card</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1200px;
      height: ${height}px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
      background: #090d16;
      color: #f8fafc;
      -webkit-font-smoothing: antialiased;
    }
    .canvas {
      position: relative;
      width: 1200px;
      height: ${height}px;
      background:
        radial-gradient(circle at 82% 20%, rgba(242, 201, 76, 0.14) 0%, transparent 42%),
        radial-gradient(circle at 18% 78%, rgba(99, 102, 241, 0.16) 0%, transparent 48%),
        radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.7) 0%, transparent 100%),
        linear-gradient(135deg, #090d16 0%, #0d1527 45%, #111827 100%);
      padding: ${isLinkedIn ? "38px 52px" : "48px 56px"};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-meta {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #f2c94c 0%, #e0a82e 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(242, 201, 76, 0.35);
      font-weight: 900;
      color: #090d16;
      font-size: 20px;
      letter-spacing: -0.5px;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.3px;
    }
    .version-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: rgba(242, 201, 76, 0.12);
      border: 1px solid rgba(242, 201, 76, 0.45);
      border-radius: 999px;
      color: #f2c94c;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      box-shadow: 0 0 16px rgba(242, 201, 76, 0.18);
    }
    .version-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f2c94c;
      box-shadow: 0 0 8px #f2c94c;
    }
    .title-section {
      margin-top: ${isLinkedIn ? "14px" : "20px"};
    }
    .main-title {
      font-size: ${isLinkedIn ? "40px" : "44px"};
      font-weight: 800;
      letter-spacing: -1.2px;
      line-height: 1.15;
      background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .sub-title {
      font-size: ${isLinkedIn ? "17px" : "19px"};
      color: #94a3b8;
      font-weight: 450;
      margin-top: 8px;
      line-height: 1.4;
    }
    .highlight-gold {
      color: #f2c94c;
      -webkit-text-fill-color: #f2c94c;
    }
    .showcase-container {
      position: relative;
      margin-top: ${isLinkedIn ? "18px" : "24px"};
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 20px;
      padding: ${isLinkedIn ? "22px 28px" : "26px 32px"};
      backdrop-filter: blur(20px);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
    }
    .search-mockup {
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(242, 201, 76, 0.4);
      border-radius: 12px;
      padding: 12px 18px;
      box-shadow: 0 0 24px rgba(242, 201, 76, 0.12);
    }
    .search-icon {
      font-size: 18px;
      color: #94a3b8;
    }
    .search-text {
      flex: 1;
      font-size: 16px;
      font-weight: 500;
      color: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      letter-spacing: -0.2px;
    }
    .smart-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 8px;
      color: #38bdf8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .action-card-mockup {
      margin-top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 12px;
      padding: 12px 18px;
    }
    .action-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-icon {
      font-size: 20px;
      color: #f2c94c;
    }
    .action-title {
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
    }
    .action-url {
      font-size: 13px;
      color: #64748b;
      margin-left: 8px;
    }
    .inline-action-chips {
      display: flex;
      gap: 8px;
    }
    .mini-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(242, 201, 76, 0.14);
      border: 1px solid rgba(242, 201, 76, 0.35);
      border-radius: 6px;
      color: #f2c94c;
      font-size: 12px;
      font-weight: 600;
    }
    .mini-chip.blue {
      background: rgba(99, 102, 241, 0.16);
      border-color: rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
    }
    .quick-chips-row {
      margin-top: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .quick-chips-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .folder-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 999px;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
    }
    .folder-chip.active {
      background: rgba(242, 201, 76, 0.18);
      border-color: #f2c94c;
      color: #f2c94c;
      font-weight: 700;
      box-shadow: 0 0 12px rgba(242, 201, 76, 0.2);
    }
    .toast-pill {
      position: absolute;
      top: -16px;
      right: 28px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      background: rgba(13, 21, 39, 0.95);
      border: 1px solid rgba(242, 201, 76, 0.7);
      border-radius: 999px;
      color: #f8fafc;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5), 0 0 16px rgba(242, 201, 76, 0.3);
    }
    .toast-icon {
      color: #f2c94c;
      font-size: 14px;
      font-weight: 800;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: ${isLinkedIn ? "14px" : "20px"};
      padding-top: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }
    .features-list {
      display: flex;
      gap: 16px;
    }
    .feature-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
    }
    .feature-tag strong {
      color: #f8fafc;
    }
    .repo-link {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #f2c94c;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div>
      <div class="header-row">
        <div class="brand-meta">
          <div class="brand-logo">★</div>
          <span class="brand-name">BookmarkFlow Bar</span>
        </div>
        <div class="version-pill">
          <span class="version-dot"></span>
          <span>v0.2.2 Release</span>
        </div>
      </div>

      <div class="title-section">
        <h1 class="main-title">Instant Link Capture & <span class="highlight-gold">Intent Routing</span></h1>
        <p class="sub-title">Zero-latency local classification · Instant folder chips · Live toast feedback · Desktop Companion</p>
      </div>

      <div class="showcase-container">
        <div class="toast-pill">
          <span class="toast-icon">✓</span>
          <span>Saved to "Development" folder</span>
        </div>

        <div class="search-mockup">
          <span class="search-icon">🔍</span>
          <span class="search-text">https://github.com/mcolaker/BookmarkFlow-Bar</span>
          <span class="smart-badge">🌐 Link Mode</span>
        </div>

        <div class="action-card-mockup">
          <div class="action-info">
            <span class="action-icon">⭐</span>
            <span class="action-title">Save to Bookmarks Bar</span>
            <span class="action-url">github.com/mcolaker/BookmarkFlow-Bar</span>
          </div>
          <div class="inline-action-chips">
            <span class="mini-chip">⭐ Save to Bar</span>
            <span class="mini-chip blue">📁 Save to Folder</span>
          </div>
        </div>

        <div class="quick-chips-row">
          <span class="quick-chips-label">Quick Folders:</span>
          <span class="folder-chip">⭐ Bar</span>
          <span class="folder-chip active">📁 Development</span>
          <span class="folder-chip">📁 Research</span>
          <span class="folder-chip">📁 Reading List</span>
        </div>
      </div>
    </div>

    <div class="footer-row">
      <div class="features-list">
        <span class="feature-tag">🔒 <strong>100% Local-First</strong></span>
        <span class="feature-tag">⚡ <strong>Zero-Cloud Invariant</strong></span>
        <span class="feature-tag">💻 <strong>Win+Shift+B Hotkey</strong></span>
        <span class="feature-tag">🎥 <strong>60 FPS Motion QA</strong></span>
      </div>
      <div class="repo-link">github.com/mcolaker/BookmarkFlow-Bar</div>
    </div>
  </div>
</body>
</html>`;
}

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
  throw new Error("No Chrome or Edge browser executable found.");
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function startStaticServer(port) {
  let activeMode = "x";
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/x") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderCardHtml("x"));
    } else if (url.pathname === "/linkedin") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderCardHtml("linkedin"));
    } else {
      res.writeHead(404);
      res.end();
    }
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

async function captureCard(cdp, url, width, height, outputPath) {
  const { targetId } = await cdp.call("Target.createTarget", { url });
  const { sessionId } = await cdp.call("Target.attachToTarget", { targetId, flatten: true });

  await cdp.call("Page.enable", {}, sessionId);
  await cdp.call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2, // 2x Retina quality
    mobile: false
  }, sessionId);

  // Sayfanın render olmasını bekle
  await new Promise((r) => setTimeout(r, 600));

  const screenshot = await cdp.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    clip: { x: 0, y: 0, width, height, scale: 2 }
  }, sessionId);

  const buffer = Buffer.from(screenshot.data, "base64");
  await fs.writeFile(outputPath, buffer);
  await cdp.call("Target.closeTarget", { targetId });

  return buffer;
}

async function main() {
  console.log("================================================================");
  console.log("  BookmarkFlow Bar v0.2.2 Sosyal Medya Kartları Üretimi");
  console.log("================================================================");

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const chromePath = await findChrome();
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-social-"));
  const debugPort = await getFreePort();
  const serverPort = await getFreePort();
  const server = await startStaticServer(serverPort);

  console.log(`[Tarayici] ${path.basename(chromePath)} baslatiliyor (CDP port: ${debugPort})...`);
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-default-browser-check",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ], {
    stdio: ["ignore", "ignore", "ignore"],
    windowsHide: true
  });

  try {
    let versionData;
    for (let i = 0; i < 30; i++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        versionData = await resp.json();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (!versionData?.webSocketDebuggerUrl) {
      throw new Error("Tarayıcı CDP soketine bağlanılamadı.");
    }

    const cdp = await CdpClient.connect(versionData.webSocketDebuggerUrl);

    // 1. X (Twitter) Card: 1200x675
    const xCardPath = path.join(outputDir, "bookmarkflow-v0.2.2-x-card.png");
    console.log("[Render] X (Twitter) Kartı oluşturuluyor (1200x675)...");
    const xBuffer = await captureCard(cdp, `http://127.0.0.1:${serverPort}/x`, 1200, 675, xCardPath);
    console.log(`[Tamam] X Kartı kaydedildi: ${xCardPath} (${(xBuffer.length / 1024).toFixed(1)} KB)`);

    // 2. LinkedIn Card: 1200x627
    const linkedInCardPath = path.join(outputDir, "bookmarkflow-v0.2.2-linkedin-card.png");
    console.log("[Render] LinkedIn Kartı oluşturuluyor (1200x627)...");
    const linkedInBuffer = await captureCard(cdp, `http://127.0.0.1:${serverPort}/linkedin`, 1200, 627, linkedInCardPath);
    console.log(`[Tamam] LinkedIn Kartı kaydedildi: ${linkedInCardPath} (${(linkedInBuffer.length / 1024).toFixed(1)} KB)`);

    // Artifacts dizinine de kopyala (Kullanıcı arayüzünde görünmesi için)
    if (existsSync(artifactDir)) {
      await fs.writeFile(path.join(artifactDir, "bookmarkflow-v0.2.2-x-card.png"), xBuffer);
      await fs.writeFile(path.join(artifactDir, "bookmarkflow-v0.2.2-linkedin-card.png"), linkedInBuffer);
      console.log(`[Artifact] Kartlar görsel arayüze aktarıldı: ${artifactDir}`);
    }

    cdp.close();
    console.log("================================================================");
    console.log("[BAŞARILI] v0.2.2 Lansman Görselleri Kusursuz Olarak Üretildi!");
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
  console.error("[HATA] Sosyal kart üretimi başarısız:", err);
  process.exit(1);
});
