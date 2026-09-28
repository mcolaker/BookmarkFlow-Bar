import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

function loadIntentRouter() {
  const code = readFileSync(new URL("../src/intent-router.js", import.meta.url), "utf8");
  const context = { globalThis: {}, console };
  context.window = context.globalThis;
  context.globalThis.globalThis = context.globalThis;
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.globalThis.BookmarkIntentRoutingEngine;
}

const intentRouter = loadIntentRouter();

test("BookmarkIntentRoutingEngine detects empty query as default search with null badge", () => {
  const result1 = intentRouter.detectUserIntent("");
  assert.equal(result1.intent, intentRouter.INTENT_SEARCH);
  assert.equal(result1.badge, null);

  const result2 = intentRouter.detectUserIntent("   ");
  assert.equal(result2.intent, intentRouter.INTENT_SEARCH);
  assert.equal(result2.badge, null);
});

test("BookmarkIntentRoutingEngine detects URL and link capture intents accurately", () => {
  const urls = [
    "https://github.com",
    "http://example.com/sub/page",
    "developer.mozilla.org",
    "localhost:3000/api",
    "news.ycombinator.com"
  ];

  for (const url of urls) {
    const result = intentRouter.detectUserIntent(url);
    assert.equal(result.intent, intentRouter.INTENT_URL);
    assert.ok(result.targetUrl.startsWith("http"));
    assert.equal(result.badge.className, "is-url");
    assert.equal(result.badge.key, "intentLinkMode");
  }
});

test("BookmarkIntentRoutingEngine detects command palette actions (#stash, health, etc.)", () => {
  const commands = [
    { query: "#stash", expectedId: "stash" },
    { query: "health", expectedId: "health" },
    { query: "#reading", expectedId: "reading" },
    { query: "backup", expectedId: "backup" },
    { query: "ayarlar", expectedId: "settings" }
  ];

  for (const cmd of commands) {
    const result = intentRouter.detectUserIntent(cmd.query);
    assert.equal(result.intent, intentRouter.INTENT_COMMAND);
    assert.equal(result.commandId, cmd.expectedId);
    assert.equal(result.badge.className, "is-command");
    assert.equal(result.badge.key, "intentCommandMode");
  }
});

test("BookmarkIntentRoutingEngine detects tag filter intent for hashtags", () => {
  const tags = ["#dev", "#tasarim", "#ai", "#video"];

  for (const tag of tags) {
    const result = intentRouter.detectUserIntent(tag);
    assert.equal(result.intent, intentRouter.INTENT_TAG);
    assert.equal(result.tagValue, tag.slice(1));
    assert.equal(result.badge.className, "is-tag");
    assert.equal(result.badge.key, "intentTagMode");
  }
});

test("BookmarkIntentRoutingEngine detects folder navigation with prefix or context folders", () => {
  const prefixResult = intentRouter.detectUserIntent("folder:projeler");
  assert.equal(prefixResult.intent, intentRouter.INTENT_FOLDER);
  assert.equal(prefixResult.folderQuery, "projeler");
  assert.equal(prefixResult.badge.className, "is-folder");
  assert.equal(prefixResult.badge.key, "intentFolderMode");

  const trPrefixResult = intentRouter.detectUserIntent("klasör:iş");
  assert.equal(trPrefixResult.intent, intentRouter.INTENT_FOLDER);
  assert.equal(trPrefixResult.folderQuery, "iş");

  const contextFolders = [
    { id: "f1", title: "Kişisel" },
    { id: "f2", title: "İş" },
    { id: "f3", title: "Araştırma" }
  ];

  const directFolderResult = intentRouter.detectUserIntent("kişisel", { folders: contextFolders });
  assert.equal(directFolderResult.intent, intentRouter.INTENT_FOLDER);
  assert.equal(directFolderResult.folderId, "f1");
  assert.equal(directFolderResult.folderTitle, "Kişisel");
});

test("BookmarkIntentRoutingEngine detects tab switch intent with tab: or sekme: prefix", () => {
  const tabResult = intentRouter.detectUserIntent("tab:github");
  assert.equal(tabResult.intent, intentRouter.INTENT_TAB);
  assert.equal(tabResult.tabQuery, "github");
  assert.equal(tabResult.badge.className, "is-tab");
  assert.equal(tabResult.badge.key, "intentTabMode");

  const sekmeResult = intentRouter.detectUserIntent("sekme:youtube");
  assert.equal(sekmeResult.intent, intentRouter.INTENT_TAB);
  assert.equal(sekmeResult.tabQuery, "youtube");
});

test("BookmarkIntentRoutingEngine falls back to smart search intent with clean badge", () => {
  const result = intentRouter.detectUserIntent("nasıl web bileşeni yazılır");
  assert.equal(result.intent, intentRouter.INTENT_SEARCH);
  assert.equal(result.badge.className, "is-search");
  assert.equal(result.badge.key, "intentSearchMode");
});
