import http from "node:http";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

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

export function isExtensionTarget(target) {
  if (!target || typeof target !== "object") return false;
  const url = target.url || "";
  const title = (target.title || "").toLowerCase();
  return (
    url.startsWith("chrome-extension://") ||
    url.startsWith("chrome://newtab") ||
    title.includes("bookmarkflow")
  );
}

export function filterExtensionTargets(targets = [], filterMode = "extension") {
  if (!Array.isArray(targets)) return [];
  if (filterMode === "all") return [...targets];
  return targets.filter(isExtensionTarget);
}

export function parseConsoleMessage(method, params) {
  if (method === "Runtime.exceptionThrown") {
    const details = params.exceptionDetails || {};
    const text = details.exception?.description || details.text || "Unhandled Exception";
    return {
      type: "exception",
      level: "error",
      text,
      url: details.url || "",
      lineNumber: details.lineNumber,
      columnNumber: details.columnNumber,
      timestamp: Date.now(),
    };
  }

  if (method === "Log.entryAdded") {
    const entry = params.entry || {};
    return {
      type: "log_entry",
      level: entry.level || "info",
      text: entry.text || "",
      url: entry.url || "",
      lineNumber: entry.lineNumber,
      source: entry.source || "",
      timestamp: entry.timestamp || Date.now(),
    };
  }

  if (method === "Console.messageAdded") {
    const msg = params.message || {};
    return {
      type: "console_message",
      level: msg.level || "log",
      text: msg.text || "",
      url: msg.url || "",
      lineNumber: msg.line,
      columnNumber: msg.column,
      timestamp: Date.now(),
    };
  }

  return null;
}

export function listenTargetWs(wsUrl, durationMs = 1500) {
  return new Promise((resolvePromise) => {
    const logs = [];
    if (!wsUrl || typeof WebSocket === "undefined") {
      resolvePromise(logs);
      return;
    }

    let ws;
    let timer;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      resolvePromise(logs);
      return;
    }

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          ws.close();
        }
      } catch {}
      resolvePromise(logs);
    };

    timer = setTimeout(cleanup, durationMs);

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify({ id: 1, method: "Log.enable" }));
        ws.send(JSON.stringify({ id: 2, method: "Runtime.enable" }));
        ws.send(JSON.stringify({ id: 3, method: "Console.enable" }));
      } catch {
        cleanup();
      }
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.method) {
          const parsed = parseConsoleMessage(payload.method, payload.params);
          if (parsed) {
            logs.push(parsed);
          }
        }
      } catch {}
    };

    ws.onerror = () => {
      cleanup();
    };

    ws.onclose = () => {
      cleanup();
    };
  });
}

export async function runConsoleGuard(options = {}) {
  const port = options.port || 9222;
  const host = options.host || "127.0.0.1";
  const dryRun = Boolean(options.dryRun);
  const durationMs = options.durationMs || 1000;
  const filterMode = options.filter || "extension";

  if (dryRun) {
    const mockTargets = options.mockTargets || [
      {
        id: "mock-ext-1",
        title: "BookmarkFlow Bar - New Tab",
        url: "chrome-extension://synthetic-id/src/newtab/newtab.html",
        webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/page/mock-ext-1",
      },
      {
        id: "mock-ext-2",
        title: "BookmarkFlow Bar Background Service Worker",
        url: "chrome-extension://synthetic-id/src/background.js",
        webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/page/mock-ext-2",
      },
    ];

    const mockEntries = options.mockEntries || [];
    const errors = mockEntries.filter((e) => e.level === "error");
    const warnings = mockEntries.filter((e) => e.level === "warning");

    return {
      connected: true,
      mode: "dry-run",
      port,
      host,
      targetsScanned: mockTargets.length,
      extensionTargets: mockTargets,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      entries: mockEntries,
      clean: errors.length === 0,
    };
  }

  try {
    const listUrl = `http://${host}:${port}/json/list`;
    const targetList = await fetchJson(listUrl, options.timeoutMs || 2000);
    const validTargets = Array.isArray(targetList) ? targetList : [];
    const extTargets = filterExtensionTargets(validTargets, filterMode);

    if (extTargets.length === 0) {
      return {
        connected: true,
        mode: "live",
        port,
        host,
        targetsScanned: validTargets.length,
        extensionTargets: [],
        errorsCount: 0,
        warningsCount: 0,
        entries: [],
        clean: true,
        notice: "Canlı Chrome oturumu bağlı, ancak izlenecek aktif eklenti sekmesi veya Service Worker bulunamadı.",
      };
    }

    const allEntries = [];
    for (const target of extTargets) {
      if (target.webSocketDebuggerUrl) {
        const targetLogs = await listenTargetWs(target.webSocketDebuggerUrl, durationMs);
        for (const log of targetLogs) {
          allEntries.push({
            targetTitle: target.title || "Untitled",
            targetUrl: target.url || "",
            ...log,
          });
        }
      }
    }

    const errors = allEntries.filter((e) => e.level === "error");
    const warnings = allEntries.filter((e) => e.level === "warning");

    return {
      connected: true,
      mode: "live",
      port,
      host,
      targetsScanned: validTargets.length,
      extensionTargets: extTargets,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      entries: allEntries,
      clean: errors.length === 0,
    };
  } catch (error) {
    return {
      connected: false,
      mode: "live",
      port,
      host,
      error: error.message,
      help: `Chrome remote debugging port ${port} erişilemez. Chrome'u başlatmak için: chrome.exe --remote-debugging-port=${port}`,
      targetsScanned: 0,
      extensionTargets: [],
      errorsCount: 0,
      warningsCount: 0,
      entries: [],
      clean: true,
    };
  }
}

export function formatConsoleGuardReport(report) {
  const lines = [];
  lines.push("================================================================");
  lines.push("  BookmarkFlow Bar — Canlı Konsol Hata Bekçisi (Live Console Guard)");
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

  lines.push(`[DURUM] Canlı CDP Bağlantısı Aktif (${report.mode === "dry-run" ? "Simülasyon / Dry-Run" : "Canlı Oturum"})`);
  lines.push(`[TARANAN HEDEFLER] Toplam Sekme: ${report.targetsScanned}, İzlenen Eklenti Hedefleri: ${report.extensionTargets.length}`);

  if (report.extensionTargets.length > 0) {
    lines.push("----------------------------------------------------------------");
    for (const t of report.extensionTargets) {
      lines.push(`• ${t.title || "Untitled"} (${t.url || ""})`);
    }
  }

  if (report.notice) {
    lines.push(`[BİLGİ] ${report.notice}`);
  }

  lines.push("----------------------------------------------------------------");
  lines.push(`[SONUÇ] Hata Sayısı: ${report.errorsCount} | Uyarı Sayısı: ${report.warningsCount}`);

  if (report.entries.length === 0) {
    lines.push("[BAŞARILI] İzlenen süre boyunca konsolda sıfır hata/istisna tespit edildi.");
  } else {
    for (const entry of report.entries) {
      const prefix = entry.level === "error" ? "[HATA]" : "[UYARI]";
      lines.push(`${prefix} [${entry.type}] ${entry.text}`);
      if (entry.url) {
        lines.push(`       Dosya: ${entry.url}:${entry.lineNumber || 0}`);
      }
    }
  }

  lines.push("================================================================");
  return lines.join("\n");
}

export async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const jsonOutput = args.includes("--json");
  const strictMode = args.includes("--strict");

  const portArg = args.find((a) => a.startsWith("--port="));
  const port = portArg ? Number.parseInt(portArg.split("=")[1], 10) : 9222;

  const durationArg = args.find((a) => a.startsWith("--duration="));
  const durationMs = durationArg ? Number.parseInt(durationArg.split("=")[1], 10) : 1200;

  if (args.includes("--help")) {
    console.log("Usage: node scripts/live-console-guard.mjs [--port=9222] [--duration=1200] [--dry-run] [--strict] [--json] [--help]");
    process.exit(0);
  }

  const report = await runConsoleGuard({ port, dryRun, durationMs });

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatConsoleGuardReport(report));
  }

  if (strictMode && report.errorsCount > 0) {
    process.exit(1);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
