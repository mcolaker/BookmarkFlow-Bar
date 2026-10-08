import assert from "node:assert/strict";
import test from "node:test";
import {
  categorizeTarget,
  categorizeTargetList,
  formatLiveChromeReport,
  inspectLiveChrome,
} from "./live-chrome-pilot.mjs";

test("categorizeTarget accurately identifies surfaces", () => {
  assert.equal(
    categorizeTarget({ url: "https://chromewebstore.google.com/detail/bookmarkflow-bar/123" }),
    "store_console",
  );
  assert.equal(
    categorizeTarget({ url: "https://chrome.google.com/webstore/devconsole/detail/123" }),
    "store_console",
  );
  assert.equal(
    categorizeTarget({ url: "https://github.com/mcolaker/BookmarkFlow-Bar/pull/86" }),
    "github_repo",
  );
  assert.equal(
    categorizeTarget({ url: "https://github.com/trending" }),
    "github_general",
  );
  assert.equal(
    categorizeTarget({ url: "https://x.com/home" }),
    "x_twitter",
  );
  assert.equal(
    categorizeTarget({ url: "https://twitter.com/compose/tweet" }),
    "x_twitter",
  );
  assert.equal(
    categorizeTarget({ url: "https://www.linkedin.com/feed/" }),
    "linkedin",
  );
  assert.equal(
    categorizeTarget({ url: "chrome-extension://abcdef/src/popup/popup.html" }),
    "extension_surface",
  );
  assert.equal(
    categorizeTarget({ url: "https://example.com/page", title: "BookmarkFlow Testing" }),
    "extension_surface",
  );
  assert.equal(
    categorizeTarget({ url: "https://example.com" }),
    "other",
  );
});

test("categorizeTargetList distributes items into structured categories", () => {
  const targets = [
    { id: "1", url: "https://chromewebstore.google.com/detail/bookmarkflow-bar/123", title: "Store" },
    { id: "2", url: "https://github.com/mcolaker/BookmarkFlow-Bar", title: "Repo" },
    { id: "3", url: "https://x.com/post", title: "X" },
    { id: "4", url: "https://www.linkedin.com/post", title: "LinkedIn" },
    { id: "5", url: "chrome-extension://id/newtab.html", title: "New Tab" },
    { id: "6", url: "https://wikipedia.org", title: "Wiki" },
  ];

  const result = categorizeTargetList(targets);
  assert.equal(result.store_console.length, 1);
  assert.equal(result.github_repo.length, 1);
  assert.equal(result.x_twitter.length, 1);
  assert.equal(result.linkedin.length, 1);
  assert.equal(result.extension_surface.length, 1);
  assert.equal(result.other.length, 1);
});

test("inspectLiveChrome dry-run returns valid structured payload", async () => {
  const result = await inspectLiveChrome({ dryRun: true, port: 9222 });

  assert.equal(result.connected, true);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.port, 9222);
  assert.ok(result.totalTargets > 0);
  assert.ok(result.categorized.store_console.length > 0);
  assert.ok(result.categorized.github_repo.length > 0);
});

test("inspectLiveChrome fails gracefully when port is offline", async () => {
  // Use an unlikely port to test offline handling
  const result = await inspectLiveChrome({ dryRun: false, port: 59999, timeoutMs: 200 });

  assert.equal(result.connected, false);
  assert.equal(result.mode, "live");
  assert.equal(result.port, 59999);
  assert.match(result.help, /chrome\.exe --remote-debugging-port=59999/u);
  assert.deepEqual(result.targets, []);
});

test("formatLiveChromeReport produces actionable formatted text for both states", async () => {
  const dryReport = await inspectLiveChrome({ dryRun: true });
  const textSuccess = formatLiveChromeReport(dryReport);
  assert.match(textSuccess, /Canlı CDP Bağlantısı Aktif/u);
  assert.match(textSuccess, /Chrome Web Store Konsolu/u);
  assert.match(textSuccess, /GitHub Repo Sekmeleri/u);

  const failReport = {
    connected: false,
    host: "127.0.0.1",
    port: 9222,
    error: "Connection refused",
  };
  const textFail = formatLiveChromeReport(failReport);
  assert.match(textFail, /Bağlantı Başarısız/u);
  assert.match(textFail, /chrome\.exe --remote-debugging-port=9222/u);
});
