#!/usr/bin/env node
/**
 * scripts/generate-social-v0.3.1.mjs
 * BookmarkFlow Bar v0.3.1 Release Sosyal Medya ve Tanıtım Görselleri
 *
 * X (Twitter) Card: 1200x675
 * LinkedIn Card: 1200x627
 *
 * Tanıtılan Özellikler:
 * - 5. Resmi Renk Teması: Turkuaz Işıltı (Turquoise Glow - #22d3ee)
 * - 5. Duvar Kağıdı: Turkuaz Uçurum (Turquoise Abyss)
 * - Ekran Kenarı Tutamacı (Edge Peek Strip) Turkuaz Işıltısı
 * - Canlı Toast Zaman Aşımı İlerleme Çubuğu & Arama Odak Halkaları
 * - Yeni Sekme Canlı Saat / Karşılama Buz-Turkuaz Degrade Geçişi
 * - Bakım Merkezi Çift Klasörleri Birleştirme Neon Buton Vurgusu
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
const outputDir = path.join(projectRoot, "output", "social-v0.3.1");
const artifactDir = "C:\\Users\\MUHAMMED\\.gemini\\antigravity\\brain\\8fc617a4-674f-4d52-ac0c-94efcd56c692";

function renderCardHtml(mode = "x") {
  const isLinkedIn = mode === "linkedin";
  const height = isLinkedIn ? 627 : 675;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>BookmarkFlow Bar v0.3.1 Social Card</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1200px;
      height: ${height}px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
      background: #030a0d;
      color: #ecfeff;
      -webkit-font-smoothing: antialiased;
    }
    .canvas {
      position: relative;
      width: 1200px;
      height: ${height}px;
      background:
        radial-gradient(circle at 85% 15%, rgba(34, 211, 238, 0.22) 0%, transparent 48%),
        radial-gradient(circle at 15% 82%, rgba(8, 145, 178, 0.25) 0%, transparent 50%),
        radial-gradient(circle at 50% 50%, rgba(6, 19, 24, 0.85) 0%, transparent 100%),
        linear-gradient(135deg, #02070a 0%, #061318 45%, #0b1e26 100%);
      padding: ${isLinkedIn ? "36px 52px" : "44px 56px"};
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-mark {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #22d3ee, #0891b2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 900;
      color: #04232c;
      box-shadow: 0 4px 18px rgba(34, 211, 238, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .brand-tagline {
      font-size: 13px;
      color: #67e8f9;
      font-weight: 500;
    }
    .version-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 16px;
      background: rgba(34, 211, 238, 0.12);
      border: 1px solid rgba(34, 211, 238, 0.45);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      color: #22d3ee;
      box-shadow: 0 0 16px rgba(34, 211, 238, 0.2);
    }
    .version-badge .dot {
      width: 8px;
      height: 8px;
      background: #22d3ee;
      border-radius: 50%;
      box-shadow: 0 0 8px #22d3ee;
    }
    .hero-content {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 36px;
      align-items: center;
    }
    .hero-text h1 {
      font-size: ${isLinkedIn ? "40px" : "44px"};
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -1px;
      margin-bottom: 12px;
      color: #ffffff;
    }
    .hero-text h1 span {
      background: linear-gradient(135deg, #22d3ee 20%, #67e8f9 60%, #ffffff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 20px rgba(34, 211, 238, 0.3));
    }
    .hero-text p {
      font-size: 15px;
      line-height: 1.5;
      color: #a5f3fc;
      margin-bottom: 22px;
      max-width: 580px;
    }
    .feature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .feature-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      background: rgba(14, 48, 61, 0.45);
      border: 1px solid rgba(34, 211, 238, 0.25);
      border-radius: 10px;
      backdrop-filter: blur(8px);
    }
    .feature-icon {
      font-size: 16px;
      flex-shrink: 0;
    }
    .feature-text {
      font-size: 12px;
      font-weight: 600;
      color: #ecfeff;
    }
    .mockup-card {
      background: rgba(10, 26, 32, 0.85);
      border: 1px solid rgba(34, 211, 238, 0.35);
      border-radius: 18px;
      padding: 22px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(34, 211, 238, 0.15);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .theme-palette-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(6, 19, 24, 0.7);
      border: 1px solid rgba(34, 211, 238, 0.2);
      border-radius: 12px;
      padding: 10px 14px;
    }
    .palette-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #67e8f9;
    }
    .palette-dots {
      display: flex;
      gap: 8px;
    }
    .p-dot {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .p-dot.gold { background: #f2c94c; }
    .p-dot.oled { background: #000000; border-color: #ffffff; }
    .p-dot.emerald { background: #10b981; }
    .p-dot.indigo { background: #6366f1; }
    .p-dot.turquoise {
      background: #22d3ee;
      border: 2px solid #ffffff;
      box-shadow: 0 0 12px #22d3ee;
      transform: scale(1.15);
    }
    .clock-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 0 8px 0;
    }
    .clock-num {
      font-size: 52px;
      font-weight: 300;
      letter-spacing: -1px;
      background: linear-gradient(135deg, #ffffff 30%, #22d3ee 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 0 16px rgba(34, 211, 238, 0.3));
    }
    .clock-greet {
      font-size: 13px;
      font-weight: 600;
      color: #22d3ee;
      letter-spacing: 0.5px;
    }
    .search-mock {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(6, 19, 24, 0.95);
      border: 1px solid #22d3ee;
      box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.35), 0 0 16px rgba(34, 211, 238, 0.2);
      border-radius: 10px;
      padding: 9px 14px;
    }
    .search-mock .icon { color: #67e8f9; font-size: 14px; }
    .search-mock .query { font-size: 13px; color: #ecfeff; font-family: monospace; flex: 1; }
    .search-mock .chip {
      background: linear-gradient(135deg, #22d3ee, #0891b2);
      color: #04232c;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(34, 211, 238, 0.4);
    }
    .merge-action-mock {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(14, 48, 61, 0.35);
      border: 1px solid rgba(34, 211, 238, 0.2);
      border-radius: 10px;
      padding: 9px 14px;
    }
    .merge-title {
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
    }
    .merge-btn {
      background: linear-gradient(135deg, #22d3ee, #0891b2);
      color: #04232c;
      font-size: 11px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 6px;
      border: none;
      box-shadow: 0 3px 12px rgba(34, 211, 238, 0.4);
    }
    .footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 14px;
      border-top: 1px solid rgba(34, 211, 238, 0.15);
    }
    .trust-badges {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .trust-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #67e8f9;
      font-weight: 600;
    }
    .repo-link {
      font-size: 13px;
      font-family: ui-monospace, SFMono-Regular, monospace;
      color: #ecfeff;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="canvas">
    <div class="header-row">
      <div class="brand-wrap">
        <div class="brand-mark">BF</div>
        <div>
          <div class="brand-title">BookmarkFlow Bar</div>
          <div class="brand-tagline">Multi-Row · Keyboard-Driven · Offline-First</div>
        </div>
      </div>
      <div class="version-badge">
        <span class="dot"></span>
        v0.3.1 RELEASE · TURQUOISE GLOW
      </div>
    </div>

    <div class="hero-content">
      <div class="hero-text">
        <h1>Dive into the <span>Turquoise Glow</span></h1>
        <p>Introducing our 5th official theme with high-contrast vivid turquoise accents, deep ocean abyss wallpaper, radiant edge handles, and text-clip clock gradients.</p>
        <div class="feature-grid">
          <div class="feature-pill">
            <span class="feature-icon">💎</span>
            <span class="feature-text">Turquoise Glow Theme</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon">🌊</span>
            <span class="feature-text">Turquoise Abyss Wallpaper</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon">✨</span>
            <span class="feature-text">Glowing Edge Peek Handle</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon">⚡</span>
            <span class="feature-text">Turquoise Toast Progress</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon">⏰</span>
            <span class="feature-text">Icy Clock Text Gradient</span>
          </div>
          <div class="feature-pill">
            <span class="feature-icon">📁</span>
            <span class="feature-text">Folder Merge Neon Physics</span>
          </div>
        </div>
      </div>

      <div class="mockup-card">
        <div class="theme-palette-bar">
          <span class="palette-label">5 Curated Themes</span>
          <div class="palette-dots">
            <div class="p-dot gold" title="Gold Obsidian"></div>
            <div class="p-dot oled" title="OLED Midnight"></div>
            <div class="p-dot emerald" title="Emerald Matrix"></div>
            <div class="p-dot indigo" title="Cyber Indigo"></div>
            <div class="p-dot turquoise" title="Turquoise Glow (New!)"></div>
          </div>
        </div>

        <div class="clock-preview">
          <div class="clock-num">10:42</div>
          <div class="clock-greet">Good morning, Explorer</div>
        </div>

        <div class="search-mock">
          <span class="icon">🔍</span>
          <span class="query">github.com/mcolaker</span>
          <span class="chip">⭐ Save</span>
        </div>

        <div class="merge-action-mock">
          <span class="merge-title">Duplicate Folders (3)</span>
          <button class="merge-btn">Merge Folders</button>
        </div>
      </div>
    </div>

    <div class="footer-row">
      <div class="trust-badges">
        <div class="trust-item">🛡️ 100% Zero-Cloud Privacy</div>
        <div class="trust-item">⚡ MV3 & Cross-Browser</div>
        <div class="trust-item">🎯 104/104 Automated Tests Passing</div>
      </div>
      <div class="repo-link">
        <span>github.com/mcolaker/BookmarkFlow-Bar</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.callbacks.has(data.id)) {
        const { resolve, reject } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
    };
  }

  static async connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.onopen = () => resolve(new CdpClient(ws));
      ws.onerror = reject;
    });
  }

  call(method, params = {}, sessionId = undefined) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.callbacks.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    this.ws.close();
  }
}

async function findChrome() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("Chromium tabanlı tarayıcı bulunamadı.");
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

async function startStaticServer(port) {
  const server = http.createServer((req, res) => {
    if (req.url === "/x") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderCardHtml("x"));
    } else if (req.url === "/linkedin") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderCardHtml("linkedin"));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return server;
}

async function captureCard(cdp, url, width, height, outputPath) {
  const { targetId } = await cdp.call("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.call("Target.attachToTarget", { targetId, flatten: true });

  await cdp.call("Page.enable", {}, sessionId);
  await cdp.call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: false
  }, sessionId);

  await cdp.call("Page.navigate", { url }, sessionId);
  await new Promise((r) => setTimeout(r, 1200));

  const screenshot = await cdp.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
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
  console.log("  BookmarkFlow Bar v0.3.1 Release Sosyal Medya Kartları");
  console.log("================================================================");

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const chromePath = await findChrome();
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "bookmarkflow-social-v031-"));
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
    const xCardPath = path.join(outputDir, "bookmarkflow-v0.3.1-x-card.png");
    console.log("[Render] X (Twitter) Kartı oluşturuluyor (1200x675)...");
    const xBuffer = await captureCard(cdp, `http://127.0.0.1:${serverPort}/x`, 1200, 675, xCardPath);
    console.log(`[Tamam] X Kartı kaydedildi: ${xCardPath} (${(xBuffer.length / 1024).toFixed(1)} KB)`);

    // 2. LinkedIn Card: 1200x627
    const linkedInCardPath = path.join(outputDir, "bookmarkflow-v0.3.1-linkedin-card.png");
    console.log("[Render] LinkedIn Kartı oluşturuluyor (1200x627)...");
    const linkedInBuffer = await captureCard(cdp, `http://127.0.0.1:${serverPort}/linkedin`, 1200, 627, linkedInCardPath);
    console.log(`[Tamam] LinkedIn Kartı kaydedildi: ${linkedInCardPath} (${(linkedInBuffer.length / 1024).toFixed(1)} KB)`);

    // Artifacts dizinine kopyala
    if (existsSync(artifactDir)) {
      await fs.writeFile(path.join(artifactDir, "bookmarkflow-v0.3.1-x-card.png"), xBuffer);
      await fs.writeFile(path.join(artifactDir, "bookmarkflow-v0.3.1-linkedin-card.png"), linkedInBuffer);
      console.log(`[Artifact] Kartlar görsel arayüze aktarıldı: ${artifactDir}`);
    }

    cdp.close();
    console.log("================================================================");
    console.log("[BAŞARILI] v0.3.1 Lansman Görselleri Kusursuz Olarak Üretildi!");
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
