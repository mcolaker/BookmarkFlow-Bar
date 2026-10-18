import { execFile, execSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getDevToolsActivePortInfo(customUserDataDir = null) {
  try {
    const userDataDir = customUserDataDir || (
      process.env.LOCALAPPDATA
        ? join(process.env.LOCALAPPDATA, "Google", "Chrome", "User Data")
        : ""
    );

    if (!userDataDir) return null;
    const activePortPath = join(userDataDir, "DevToolsActivePort");
    if (!fs.existsSync(activePortPath)) return null;

    const content = fs.readFileSync(activePortPath, "utf8").trim();
    const lines = content.split(/\r?\n/);
    if (!lines[0]) return null;

    const port = Number.parseInt(lines[0], 10);
    const browserPath = lines[1] ? lines[1].trim() : "";
    return { port, browserPath };
  } catch {
    return null;
  }
}

export function triggerFastUiaAutoConfirm(timeoutMs = 3500) {
  return new Promise((resolveResult) => {
    if (process.platform !== "win32") {
      resolveResult({ supported: false, triggered: false });
      return;
    }

    const uiaScript = resolve(__dirname, "../tools/windows-companion/windows-uia.ps1");
    if (!fs.existsSync(uiaScript)) {
      resolveResult({ supported: true, triggered: false, reason: "script_not_found" });
      return;
    }

    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-File", uiaScript, "-Action", "auto-confirm", "-TimeoutMs", String(timeoutMs)],
      { timeout: timeoutMs + 1000 },
      (error, stdout) => {
        const text = stdout ? stdout.trim() : "";
        const confirmed = text.includes("AUTO_CONFIRM_SUCCESS") || text.includes("FastUia Auto-Confirmed");
        resolveResult({
          supported: true,
          triggered: true,
          confirmed,
          output: text,
        });
      },
    );
  });
}

export function fetchJson(url, timeoutMs = 2500) {
  return new Promise((resolvePromise, rejectPromise) => {
    const parsedUrl = new URL(url);
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "GET",
      timeout: timeoutMs,
      headers: {
        Accept: "application/json",
      },
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolvePromise(JSON.parse(data));
          } catch (err) {
            rejectPromise(new Error(`Failed to parse JSON response: ${err.message}`));
          }
        } else {
          rejectPromise(new Error(`HTTP status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (err) => {
      rejectPromise(err);
    });

    req.on("timeout", () => {
      req.destroy();
      rejectPromise(new Error(`Connection timed out after ${timeoutMs}ms`));
    });

    req.end();
  });
}

export function ensureAutoAllowDaemon() {
  if (process.platform !== "win32") return { supported: false, running: false };
  try {
    const userProfile = process.env.USERPROFILE || "";
    const pythonWPath = join(userProfile, ".gemini", "antigravity", "scratch", "jev-ultrafast", ".venv", "Scripts", "pythonw.exe");
    const pythonExePath = join(userProfile, ".gemini", "antigravity", "scratch", "jev-ultrafast", ".venv", "Scripts", "python.exe");
    const pythonPath = fs.existsSync(pythonWPath) ? pythonWPath : pythonExePath;
    const daemonScript = resolve(__dirname, "../tools/windows-companion/chrome_auto_allow_daemon.py");
    if (!fs.existsSync(pythonPath) || !fs.existsSync(daemonScript)) {
      return { supported: false, running: false, reason: "files_missing" };
    }

    try {
      const psScript = [
        "$ existing = Get-CimInstance Win32_Process -Filter \"Name='python.exe' OR Name='pythonw.exe'\" | Where-Object { $_.CommandLine -like '*chrome_auto_allow_daemon.py*' } | Select-Object -First 1;",
        "if ($existing) { Write-Output ('RUNNING:' + $existing.ProcessId) } else {",
        `  $cmd = '"${pythonPath}" "${daemonScript}"';`,
        "  $res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd };",
        "  Write-Output ('STARTED:' + $res.ProcessId)",
        "}",
      ].join(" ").replace("$ existing", "$existing");

      const stdout = execSync(
        `powershell.exe -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 4000, windowsHide: true },
      ).trim();

      if (stdout.startsWith("RUNNING:")) {
        return { supported: true, running: true, started: false, pid: Number.parseInt(stdout.split(":")[1], 10) };
      }
      if (stdout.startsWith("STARTED:")) {
        return { supported: true, running: true, started: true, pid: Number.parseInt(stdout.split(":")[1], 10) };
      }
    } catch {
      // Fallback to direct detached spawn if WMI is restricted
    }

    const child = spawn(pythonPath, [daemonScript], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return { supported: true, running: true, started: true, pid: child.pid };
  } catch {
    return { supported: true, running: false };
  }
}

export function queryTargetsViaWebSocket(wsUrl, timeoutMs = 5000) {
  return new Promise((resolvePromise, rejectPromise) => {
    if (typeof WebSocket === "undefined") {
      rejectPromise(new Error("Global WebSocket is not supported in this runtime."));
      return;
    }

    ensureAutoAllowDaemon();
    triggerFastUiaAutoConfirm(Math.min(timeoutMs, 4500)).catch(() => null);

    let socket = null;
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (socket) {
        try {
          socket.close();
        } catch {}
      }
    };

    timer = setTimeout(() => {
      cleanup();
      rejectPromise(new Error(`WebSocket connection to ${wsUrl} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        socket.send(JSON.stringify({ id: 1, method: "Target.getTargets" }));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.id === 1 && payload.result && Array.isArray(payload.result.targetInfos)) {
            const targets = payload.result.targetInfos.map((t) => ({
              id: t.targetId,
              title: t.title || "",
              url: t.url || "",
              type: t.type || "page",
            }));
            cleanup();
            resolvePromise(targets);
          }
        } catch (err) {
          cleanup();
          rejectPromise(new Error(`Failed to parse WebSocket message: ${err.message}`));
        }
      };

      socket.onerror = () => {
        // Allow background auto-allow daemon up to timeoutMs to click "İzin ver"
      };

      socket.onclose = () => {
        // Terminal close will trigger timeout rejection if open never succeeded
      };
    } catch (err) {
      cleanup();
      rejectPromise(err);
    }
  });
}

export function categorizeTarget(target) {
  const url = (target && target.url) || "";
  const title = (target && target.title) || "";

  if (/chrome(?:webstore)?\.google\.com\/(?:detail|webstore\/devconsole)/iu.test(url)) {
    return "store_console";
  }
  if (/github\.com\/mcolaker\/BookmarkFlow-Bar/iu.test(url)) {
    return "github_repo";
  }
  if (/github\.com/iu.test(url)) {
    return "github_general";
  }
  if (/(?:x\.com|twitter\.com)/iu.test(url)) {
    return "x_twitter";
  }
  if (/linkedin\.com/iu.test(url)) {
    return "linkedin";
  }
  if (url.startsWith("chrome-extension://") || /bookmarkflow/iu.test(title)) {
    return "extension_surface";
  }
  return "other";
}

export function categorizeTargetList(targets = []) {
  const categories = {
    store_console: [],
    github_repo: [],
    github_general: [],
    x_twitter: [],
    linkedin: [],
    extension_surface: [],
    other: [],
  };

  for (const target of targets) {
    const category = categorizeTarget(target);
    if (categories[category]) {
      categories[category].push(target);
    } else {
      categories.other.push(target);
    }
  }

  return categories;
}

export async function inspectLiveChrome(options = {}) {
  const defaultPort = options.port || 9222;
  const host = options.host || "127.0.0.1";
  const dryRun = Boolean(options.dryRun);
  const timeoutMs = options.timeoutMs || 6000;

  if (dryRun) {
    const mockTargets = options.mockData || [
      {
        id: "mock-1",
        title: "BookmarkFlow Bar - Chrome Web Store",
        url: "https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf",
        type: "page",
      },
      {
        id: "mock-2",
        title: "mcolaker/BookmarkFlow-Bar: Modern bookmark manager",
        url: "https://github.com/mcolaker/BookmarkFlow-Bar",
        type: "page",
      },
      {
        id: "mock-3",
        title: "ForeverLife (@Foreverrlifeee) / X",
        url: "https://x.com/Foreverrlifeee",
        type: "page",
      },
      {
        id: "mock-4",
        title: "Feed | LinkedIn",
        url: "https://www.linkedin.com/feed/",
        type: "page",
      },
      {
        id: "mock-5",
        title: "BookmarkFlow Bar Settings",
        url: "chrome-extension://synthetic-id/src/settings/settings.html",
        type: "page",
      },
    ];

    return {
      connected: true,
      mode: "dry-run",
      port: defaultPort,
      host,
      browser: "Chrome/Synthetic-CDP-DryRun",
      protocolVersion: "1.3",
      totalTargets: mockTargets.length,
      targets: mockTargets,
      categorized: categorizeTargetList(mockTargets),
      autoConfirm: { supported: true, triggered: false },
    };
  }

  // 1. Check DevToolsActivePort first for modern WebSocket-only Chrome (BF-WIN-002)
  const explicitPortProvided = typeof options.port === "number";
  const portInfo = getDevToolsActivePortInfo(options.userDataDir);
  const port = explicitPortProvided ? options.port : (portInfo ? portInfo.port : defaultPort);
  const browserPath = (portInfo && (!explicitPortProvided || portInfo.port === port)) ? portInfo.browserPath : "";

  // 2. Proactively ensure background auto-allow daemon is running (JaponiGo Invariant)
  let daemonStatus = null;
  if (options.autoConfirm !== false && process.platform === "win32") {
    daemonStatus = ensureAutoAllowDaemon();
  }

  let lastError = null;
  // 3. Try WebSocket CDP first if browserPath exists (Chrome 128+)
  if (browserPath) {
    try {
      const wsUrl = `ws://${host}:${port}${browserPath}`;
      const targets = await queryTargetsViaWebSocket(wsUrl, timeoutMs);

      return {
        connected: true,
        mode: "live",
        transport: "websocket",
        port,
        host,
        browser: "Google Chrome (Live WebSocket CDP)",
        protocolVersion: "1.3",
        totalTargets: targets.length,
        targets,
        categorized: categorizeTargetList(targets),
        autoConfirm: daemonStatus,
      };
    } catch (wsErr) {
      // If WebSocket failed, keep wsErr message for diagnostic
      lastError = wsErr.message;
    }
  }

  // 4. Fallback: Classic HTTP discovery endpoints (/json/version, /json/list)
  try {
    const versionUrl = `http://${host}:${port}/json/version`;
    const listUrl = `http://${host}:${port}/json/list`;

    const versionData = await fetchJson(versionUrl, Math.min(timeoutMs, 1500));
    const targetList = await fetchJson(listUrl, Math.min(timeoutMs, 1500));

    return {
      connected: true,
      mode: "live",
      transport: "http",
      port,
      host,
      browser: versionData.Browser || "Unknown Chrome",
      protocolVersion: versionData["Protocol-Version"] || "1.3",
      webSocketDebuggerUrl: versionData.webSocketDebuggerUrl || null,
      totalTargets: Array.isArray(targetList) ? targetList.length : 0,
      targets: Array.isArray(targetList) ? targetList : [],
      categorized: categorizeTargetList(Array.isArray(targetList) ? targetList : []),
    };
  } catch (error) {
    return {
      connected: false,
      mode: "live",
      port,
      host,
      error: lastError || error.message,
      help: `Chrome remote debugging port ${port} is not reachable. Start Chrome with: chrome.exe --remote-debugging-port=${port}`,
      targets: [],
      categorized: categorizeTargetList([]),
    };
  }
}

export function formatLiveChromeReport(report) {
  const lines = [];
  lines.push("================================================================");
  lines.push("  BookmarkFlow Bar — Live Chrome CDP Pilot (P0-22 Invariant)");
  lines.push("================================================================");

  if (!report.connected) {
    lines.push(`[DURUM] Bağlantı Başarısız: ${report.host}:${report.port}`);
    lines.push(`[HATA] ${report.error || "Port erişilemez"}`);
    lines.push("");
    lines.push("İpucu: Kullanıcının çalışan canlı Chrome oturumuna bağlanmak için:");
    lines.push(`  chrome.exe --remote-debugging-port=${report.port}`);
    lines.push("komutu ile Chrome'u başlatıp portu aktif hale getirebilirsiniz.");
    lines.push("================================================================");
    return lines.join("\n");
  }

  const transportLabel = report.transport ? `[${report.transport.toUpperCase()}]` : "";
  lines.push(`[DURUM] Canlı CDP Bağlantısı Aktif ${transportLabel} (${report.mode === "dry-run" ? "Simülasyon / Dry-Run" : "Canlı Oturum"})`);
  lines.push(`[TARAYICI] ${report.browser} (Protokol: ${report.protocolVersion})`);
  lines.push(`[TOPLAM SEKMELER] ${report.totalTargets}`);

  if (report.autoConfirm && report.autoConfirm.confirmed) {
    lines.push("[UIA AUTO-CONFIRM] Fast Windows UIA uzaktan hata ayıklama iznini otomatik onayladı ✅");
  }

  lines.push("----------------------------------------------------------------");

  const { categorized } = report;
  const storeCount = categorized.store_console.length;
  const repoCount = categorized.github_repo.length;
  const generalGithubCount = categorized.github_general.length;
  const xCount = categorized.x_twitter.length;
  const linkedinCount = categorized.linkedin.length;
  const extCount = categorized.extension_surface.length;

  lines.push(`• Chrome Web Store Konsolu: ${storeCount > 0 ? `[BULUNDU: ${storeCount}]` : "[YOK]"}`);
  for (const t of categorized.store_console) lines.push(`  - ${t.title} (${t.url})`);

  lines.push(`• GitHub Repo Sekmeleri: ${repoCount > 0 ? `[BULUNDU: ${repoCount}]` : "[YOK]"}`);
  for (const t of categorized.github_repo) lines.push(`  - ${t.title} (${t.url})`);

  if (generalGithubCount > 0) {
    lines.push(`• Genel GitHub Sekmeleri: [BULUNDU: ${generalGithubCount}]`);
  }

  lines.push(`• X (Twitter) Lansman Sekmesi: ${xCount > 0 ? `[BULUNDU: ${xCount}]` : "[YOK]"}`);
  for (const t of categorized.x_twitter) lines.push(`  - ${t.title} (${t.url})`);

  lines.push(`• LinkedIn Lansman Sekmesi: ${linkedinCount > 0 ? `[BULUNDU: ${linkedinCount}]` : "[YOK]"}`);
  for (const t of categorized.linkedin) lines.push(`  - ${t.title} (${t.url})`);

  lines.push(`• Eklenti Canlı Yüzeyleri: ${extCount > 0 ? `[BULUNDU: ${extCount}]` : "[YOK]"}`);
  for (const t of categorized.extension_surface) lines.push(`  - ${t.title} (${t.url})`);

  lines.push("================================================================");
  return lines.join("\n");
}

export async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const jsonOutput = args.includes("--json");
  const portArg = args.find((a) => a.startsWith("--port="));
  const port = portArg ? Number.parseInt(portArg.split("=")[1], 10) : undefined;

  if (args.includes("--help")) {
    console.log("Usage: node scripts/live-chrome-pilot.mjs [--port=9222] [--dry-run] [--json] [--help]");
    process.exit(0);
  }

  const report = await inspectLiveChrome({ port, dryRun });

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatLiveChromeReport(report));
  }

  if (!dryRun && !report.connected) {
    process.exitCode = 0;
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
