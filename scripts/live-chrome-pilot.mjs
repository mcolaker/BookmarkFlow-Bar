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
  const port = options.port || 9222;
  const host = options.host || "127.0.0.1";
  const dryRun = Boolean(options.dryRun);

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
        title: "X. It's what's happening",
        url: "https://x.com/compose/post",
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
      port,
      host,
      browser: "Chrome/Synthetic-CDP-DryRun",
      protocolVersion: "1.3",
      totalTargets: mockTargets.length,
      targets: mockTargets,
      categorized: categorizeTargetList(mockTargets),
    };
  }

  try {
    const versionUrl = `http://${host}:${port}/json/version`;
    const listUrl = `http://${host}:${port}/json/list`;

    const versionData = await fetchJson(versionUrl, options.timeoutMs || 2000);
    const targetList = await fetchJson(listUrl, options.timeoutMs || 2000);

    return {
      connected: true,
      mode: "live",
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
      error: error.message,
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

  lines.push(`[DURUM] Canlı CDP Bağlantısı Aktif (${report.mode === "dry-run" ? "Simülasyon / Dry-Run" : "Canlı Oturum"})`);
  lines.push(`[TARAYICI] ${report.browser} (Protokol: ${report.protocolVersion})`);
  lines.push(`[TOPLAM SEKMELER] ${report.totalTargets}`);
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
  const port = portArg ? Number.parseInt(portArg.split("=")[1], 10) : 9222;

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
    // Non-zero exit code on real run when port is not reachable to communicate state cleanly
    process.exitCode = 0; // Keep 0 so it can be called safely in diagnosis without breaking scripts
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  main();
}
