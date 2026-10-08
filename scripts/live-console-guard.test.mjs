import test from "node:test";
import assert from "node:assert/strict";
import {
  isExtensionTarget,
  filterExtensionTargets,
  parseConsoleMessage,
  runConsoleGuard,
  formatConsoleGuardReport,
} from "./live-console-guard.mjs";

test("live-console-guard: isExtensionTarget identifies extension surfaces and new tab correctly", () => {
  assert.equal(
    isExtensionTarget({ url: "chrome-extension://abc123xyz/src/newtab/newtab.html", title: "New Tab" }),
    true
  );
  assert.equal(
    isExtensionTarget({ url: "chrome://newtab/", title: "New Tab" }),
    true
  );
  assert.equal(
    isExtensionTarget({ url: "https://example.com", title: "BookmarkFlow Bar In-Page Surface" }),
    true
  );
  assert.equal(
    isExtensionTarget({ url: "https://google.com", title: "Google Search" }),
    false
  );
  assert.equal(isExtensionTarget(null), false);
  assert.equal(isExtensionTarget({}), false);
});

test("live-console-guard: filterExtensionTargets filters list based on mode", () => {
  const targets = [
    { id: "1", url: "chrome-extension://abc/popup.html", title: "Popup" },
    { id: "2", url: "https://news.ycombinator.com", title: "Hacker News" },
    { id: "3", url: "chrome://newtab", title: "New Tab" },
  ];

  const extFiltered = filterExtensionTargets(targets, "extension");
  assert.equal(extFiltered.length, 2);
  assert.equal(extFiltered[0].id, "1");
  assert.equal(extFiltered[1].id, "3");

  const allFiltered = filterExtensionTargets(targets, "all");
  assert.equal(allFiltered.length, 3);
});

test("live-console-guard: parseConsoleMessage handles exceptions, logs, and console calls", () => {
  const exceptionMsg = parseConsoleMessage("Runtime.exceptionThrown", {
    exceptionDetails: {
      text: "Uncaught ReferenceError: foo is not defined",
      url: "chrome-extension://test/src/content.js",
      lineNumber: 42,
      columnNumber: 5,
    },
  });
  assert.ok(exceptionMsg);
  assert.equal(exceptionMsg.type, "exception");
  assert.equal(exceptionMsg.level, "error");
  assert.equal(exceptionMsg.text, "Uncaught ReferenceError: foo is not defined");
  assert.equal(exceptionMsg.lineNumber, 42);

  const logEntry = parseConsoleMessage("Log.entryAdded", {
    entry: {
      level: "warning",
      text: "Deprecated feature used",
      url: "chrome-extension://test/src/background.js",
      lineNumber: 10,
    },
  });
  assert.ok(logEntry);
  assert.equal(logEntry.type, "log_entry");
  assert.equal(logEntry.level, "warning");
  assert.equal(logEntry.text, "Deprecated feature used");

  const consoleMsg = parseConsoleMessage("Console.messageAdded", {
    message: {
      level: "error",
      text: "Failed to load resource: net::ERR_FILE_NOT_FOUND",
      url: "chrome-extension://test/icon.png",
      line: 1,
      column: 1,
    },
  });
  assert.ok(consoleMsg);
  assert.equal(consoleMsg.type, "console_message");
  assert.equal(consoleMsg.level, "error");
  assert.equal(consoleMsg.lineNumber, 1);

  const unknown = parseConsoleMessage("Network.requestWillBeSent", {});
  assert.equal(unknown, null);
});

test("live-console-guard: runConsoleGuard in dry-run mode returns structured report", async () => {
  const dryReport = await runConsoleGuard({
    dryRun: true,
    mockEntries: [
      {
        type: "exception",
        level: "error",
        text: "Simulated syntax error in content script",
        url: "chrome-extension://synthetic/src/content.js",
        lineNumber: 100,
      },
      {
        type: "log_entry",
        level: "warning",
        text: "Simulated performance notice",
      },
    ],
  });

  assert.equal(dryReport.connected, true);
  assert.equal(dryReport.mode, "dry-run");
  assert.equal(dryReport.errorsCount, 1);
  assert.equal(dryReport.warningsCount, 1);
  assert.equal(dryReport.clean, false);
  assert.equal(dryReport.extensionTargets.length, 2);

  const formatted = formatConsoleGuardReport(dryReport);
  assert.ok(formatted.includes("Canlı CDP Bağlantısı Aktif (Simülasyon / Dry-Run)"));
  assert.ok(formatted.includes("[HATA] [exception] Simulated syntax error in content script"));
  assert.ok(formatted.includes("Hata Sayısı: 1 | Uyarı Sayısı: 1"));
});

test("live-console-guard: runConsoleGuard reports clean state when zero errors detected", async () => {
  const cleanReport = await runConsoleGuard({
    dryRun: true,
    mockEntries: [],
  });

  assert.equal(cleanReport.connected, true);
  assert.equal(cleanReport.clean, true);
  assert.equal(cleanReport.errorsCount, 0);

  const formatted = formatConsoleGuardReport(cleanReport);
  assert.ok(formatted.includes("[BAŞARILI] İzlenen süre boyunca konsolda sıfır hata/istisna tespit edildi."));
});

test("live-console-guard: formatConsoleGuardReport handles disconnected port gracefully", () => {
  const disconnectedReport = {
    connected: false,
    mode: "live",
    port: 9222,
    host: "127.0.0.1",
    error: "connect ECONNREFUSED 127.0.0.1:9222",
  };

  const formatted = formatConsoleGuardReport(disconnectedReport);
  assert.ok(formatted.includes("[DURUM] Bağlantı Başarısız: 127.0.0.1:9222"));
  assert.ok(formatted.includes("chrome.exe --remote-debugging-port=9222"));
});
