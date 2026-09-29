#!/usr/bin/env node
/**
 * scripts/generate-social-v0.3.0.mjs
 * BookmarkFlow Bar v0.3.0 Landmark Release Sosyal Medya ve Tanitim Gorselleri
 *
 * X (Twitter) Card: 1200x675
 * LinkedIn Card: 1200x627
 *
 * 18 yenilik (Intent Engine, Instant Save Chips, Universal Undo, Full Concealment,
 * Edge Peek Strip, Snooze Badge, Design Tokens, Windows Companion) tanitilir.
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
const outputDir = path.join(projectRoot, "output", "social-v0.3.0");
const artifactDir = "C:\\Users\\MUHAMMED\\.gemini\\antigravity\\brain\\8fc617a4-674f-4d52-ac0c-94efcd56c692";

function renderCardHtml(mode = "x") {
  const isLinkedIn = mode === "linkedin";
  const height = isLinkedIn ? 627 : 675;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BookmarkFlow Bar v0.3.0 Social Card</title>
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
        radial-gradient(circle at 85% 15%, rgba(242, 201, 76, 0.16) 0%, transparent 45%),
        radial-gradient(circle at 15% 82%, rgba(99, 102, 241, 0.18) 0%, transparent 48%),
        radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.75) 0%, transparent 100%),
        linear-gradient(135deg, #090d16 0%, #0d1527 45%, #111827 100%);
      padding: ${isLinkedIn ? "36px 52px" : "44px 56px"};
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
      box-shadow: 0 0 24px rgba(242, 201, 76, 0.38);
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
      gap: 8px;
      padding: 6px 16px;
      background: rgba(242, 201, 76, 0.12);
      border: 1px solid rgba(242, 201, 76, 0.45);
      border-radius: 999px;
      color: #f2c94c;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      box-shadow: 0 0 20px rgba(242, 201, 76, 0.22);
    }
    .version-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #f2c94c;
      box-shadow: 0 0 8px #f2c94c;
    }
    .title-section {
      margin-top: ${isLinkedIn ? "10px" : "16px"};
    }
    .main-title {
      font-size: ${isLinkedIn ? "38px" : "42px"};
      font-weight: 800;
      letter-spacing: -1.2px;
      line-height: 1.15;
    }
    .highlight-gold {
      background: linear-gradient(135deg, #f2c94c 0%, #ffd978 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .sub-title {
      font-size: 15px;
      color: #94a3b8;
      margin-top: 6px;
      font-weight: 400;
      letter-spacing: -0.2px;
    }
    .showcase-container {
      position: relative;
      margin-top: ${isLinkedIn ? "14px" : "18px"};
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 18px;
      padding: ${isLinkedIn ? "20px 24px" : "24px 28px"};
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .search-mockup {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(11, 15, 25, 0.95);
      border: 1px solid rgba(242, 201, 76, 0.5);
      border-radius: 12px;
      padding: 11px 16px;
      box-shadow: 0 0 20px rgba(242, 201, 76, 0.15);
    }
    .search-icon {
      color: #94a3b8;
      font-size: 16px;
    }
    .search-text {
      flex: 1;
      font-size: 14px;
      color: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .smart-badges {
      display: flex;
      gap: 8px;
    }
    .smart-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .smart-badge.badge-url {
      background: rgba(59, 130, 246, 0.18);
      border: 1px solid rgba(59, 130, 246, 0.6);
      color: #60a5fa;
    }
    .smart-badge.badge-cmd {
      background: rgba(245, 158, 11, 0.18);
      border: 1px solid rgba(245, 158, 11, 0.6);
      color: #fbbf24;
    }
    .smart-badge.badge-tag {
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(16, 185, 129, 0.6);
      color: #34d399;
    }
    .action-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.12);
      border-radius: 12px;
      padding: 10px 16px;
    }
    .action-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .action-icon {
      font-size: 18px;
      color: #f2c94c;
    }
    .action-title {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
    }
    .folder-chips {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .folder-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: rgba(30, 41, 59, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 999px;
      color: #cbd5e1;
      font-size: 12px;
      font-weight: 500;
    }
    .folder-chip.active {
      background: rgba(242, 201, 76, 0.2);
      border-color: #f2c94c;
      color: #f2c94c;
      font-weight: 700;
      box-shadow: 0 0 12px rgba(242, 201, 76, 0.25);
    }
    .folder-chip.btn-save {
      background: linear-gradient(135deg, rgba(242, 201, 76, 0.25), rgba(242, 201, 76, 0.1));
      border: 1px solid #f2c94c;
      color: #f2c94c;
      font-weight: 700;
    }
    .toast-pill {
      position: absolute;
      top: -14px;
      right: 28px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: rgba(13, 21, 39, 0.96);
      border: 1px solid rgba(242, 201, 76, 0.7);
      border-radius: 999px;
      color: #f8fafc;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 0 16px rgba(242, 201, 76, 0.3);
    }
    .toast-icon {
      color: #f2c94c;
      font-size: 13px;
      font-weight: 800;
    }
    .toast-undo {
      padding: 2px 8px;
      background: rgba(242, 201, 76, 0.15);
      border: 1px solid rgba(242, 201, 76, 0.5);
      border-radius: 6px;
      color: #f2c94c;
      font-size: 11px;
      font-weight: 700;
    }
    .badges-row {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .feature-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 8px;
      font-size: 12px;
      color: #cbd5e1;
    }
    .feature-badge strong {
      color: #f8fafc;
    }
    .footer-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: ${isLinkedIn ? "10px" : "16px"};
      padding-top: 12px;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
    }
    .platform-tags {
      display: flex;
      gap: 14px;
    }
    .platform-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #94a3b8;
      font-size: 12px;
      font-weight: 500;
    }
    .platform-tag strong {
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
          <span>v0.3.0 Landmark Release</span>
        </div>
      </div>

      <div class="title-section">
        <h1 class="main-title">Next-Gen Bookmark Flow & <span class="highlight-gold">Zero-Latency Intent Engine</span></h1>
        <p class="sub-title">Instant Search Link Capture · Live Smart Badges · Universal Undo · Full Bar Concealment · Windows Companion</p>
      </div>

      <div class="showcase-container">
        <div class="toast-pill">
          <span class="toast-icon">✓</span>
          <span>Saved to "Development" folder</span>
          <span class="toast-undo">Undo (Ctrl+Z)</span>
        </div>

        <div class="search-mockup">
          <span class="search-icon">🔍</span>
          <span class="search-text">https://github.com/mcolaker/BookmarkFlow-Bar</span>
          <div class="smart-badges">
            <span class="smart-badge badge-url">🌐 Link Mode</span>
            <span class="smart-badge badge-cmd">⚡ Command</span>
            <span class="smart-badge badge-tag">🏷️ Tag</span>
          </div>
        </div>

        <div class="action-row">
          <div class="action-info">
            <span class="action-icon">⭐</span>
            <span class="action-title">Instant Link Capture</span>
          </div>
          <div class="folder-chips">
            <span class="folder-chip btn-save">⭐ Save (Ctrl+S)</span>
            <span class="folder-chip active">📁 Development</span>
            <span class="folder-chip">📁 Articles</span>
            <span class="folder-chip">📁▾ All</span>
          </div>
        </div>

        <div class="badges-row">
          <div class="feature-badge">🙈 <strong>Alt+Shift+H</strong> Full Concealment</div>
          <div class="feature-badge">⚡ <strong>Edge Peek Strip</strong> 3px Touch Restore</div>
          <div class="feature-badge">🏷️ <strong>Toolbar Snooze Badge</strong> "off" Status</div>
          <div class="feature-badge">🎨 <strong>Forced-Colors</strong> High Contrast</div>
          <div class="feature-badge">💻 <strong>Win+Shift+B</strong> Companion</div>
        </div>
      </div>
    </div>

    <div class="footer-row">
      <div class="platform-tags">
        <span class="platform-tag">⚡ <strong>&lt;1ms</strong> Local Intent Router</span>
        <span class="platform-tag">🔒 <strong>100%</strong> Zero-Cloud / Offline-First</span>
        <span class="platform-tag">🌐 <strong>Chrome · Edge · Firefox</strong></span>
      </div>
      <div class="repo-link">github.com/mcolaker/BookmarkFlow-Bar</div>
    </div>
  </div>
</body>
</html>`;
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

async function findChrome() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.LOCALAPPDATA || "", "Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("Chromium tabanlı bir tarayıcı (Chrome veya Edge) bulunamadı.");
}

function startStaticServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url === "/x") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderCardHtml("x"));
      } else if (req.url === "/linkedin") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(renderCardHtml("linkedin"));
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
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
  console.log("  BookmarkFlow Bar v0.3.0 Landmark Release Sosyal Medya Kartları");
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
    const xCardPath = path.join(outputDir, "bookmarkflow-v0.3.0-x-card.png");
    console.log("[Render] X (Twitter) Kartı oluşturuluyor (1200x675)...");
    const xBuffer = await captureCard(cdp, `http://127.0.0.1:${serverPort}/x`, 1200, 675, xCardPath);
    console.log(`[Tamam] X Kartı kaydedildi: ${xCardPath} (${(xBuffer.length / 1024).toFixed(1)} KB)`);

    // 2. LinkedIn Card: 1200x627
    const linkedInCardPath = path.join(outputDir, "bookmarkflow-v0.3.0-linkedin-card.png");
    console.log("[Render] LinkedIn Kartı oluşturuluyor (1200x627)...");
    const linkedInBuffer = await captureCard(cdp, `http://127.0.0.1:${serverPort}/linkedin`, 1200, 627, linkedInCardPath);
    console.log(`[Tamam] LinkedIn Kartı kaydedildi: ${linkedInCardPath} (${(linkedInBuffer.length / 1024).toFixed(1)} KB)`);

    // Artifacts dizinine de kopyala (Kullanıcı arayüzünde doğrudan görünebilmesi için)
    if (existsSync(artifactDir)) {
      await fs.writeFile(path.join(artifactDir, "bookmarkflow-v0.3.0-x-card.png"), xBuffer);
      await fs.writeFile(path.join(artifactDir, "bookmarkflow-v0.3.0-linkedin-card.png"), linkedInBuffer);
      console.log(`[Artifact] Kartlar görsel arayüze aktarıldı: ${artifactDir}`);
    }

    cdp.close();
    console.log("================================================================");
    console.log("[BAŞARILI] v0.3.0 Lansman Görselleri Kusursuz Olarak Üretildi!");
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
