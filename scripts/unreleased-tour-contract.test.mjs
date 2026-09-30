import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("unreleased tour 1: direct link capture and folder selector (BF-UX-013)", () => {
  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(newtabHtml, /id="addFolderSelect"/u, "newtab.html must contain addFolderSelect");

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /function populateFolderSelect\(/u, "newtab.js must define populateFolderSelect");
  assert.match(newtabJs, /handleSearchSubmit/u, "newtab.js must define handleSearchSubmit");

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /class="bf-add-select"/u, "content.js must render folder dropdown");

  const manifest = JSON.parse(readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.strictEqual(manifest.omnibox?.keyword, "bf", "manifest must declare omnibox keyword 'bf'");

  const bgJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(bgJs, /chrome\.omnibox\.onInputChanged/u, "background.js must handle omnibox input");
  assert.match(bgJs, /chrome\.omnibox\.onInputEntered/u, "background.js must handle omnibox submit");
});

test("unreleased tour 2: smart folder memory across surfaces", () => {
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /const LAST_USED_FOLDER_STORAGE_KEY = "bfLastUsedFolderId"/u);
  assert.match(newtabJs, /chrome\.storage\.local\.set\(\{\s*\[LAST_USED_FOLDER_STORAGE_KEY\]:\s*parentId\s*\}\)/u);

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /const LAST_USED_FOLDER_STORAGE_KEY = "bfLastUsedFolderId"/u);

  const bgJs = readFileSync(path.join(root, "src/background.js"), "utf8");
  assert.match(bgJs, /bfLastUsedFolderId/u);
});

test("unreleased tour 3: windows desktop companion & global hotkey suite", () => {
  assert.ok(existsSync(path.join(root, "tools/windows-companion/com.bookmarkflow.companion.json")));
  assert.ok(existsSync(path.join(root, "tools/windows-companion/hotkey-listener.ps1")));
  assert.ok(existsSync(path.join(root, "tools/windows-companion/companion-tray.ps1")));
  assert.ok(existsSync(path.join(root, "tools/windows-companion/bookmarkflow-companion.mjs")));

  const hotkeys = readFileSync(path.join(root, "tools/windows-companion/hotkey-listener.ps1"), "utf8");
  assert.match(hotkeys, /RegisterHotKey/u, "hotkey-listener.ps1 must import Win32 RegisterHotKey");
  assert.match(hotkeys, /GLOBAL_TOGGLE_BAR/u, "hotkey-listener.ps1 must dispatch GLOBAL_TOGGLE_BAR");
});

test("unreleased tour 4: quick folder chips (BF-UX-014)", () => {
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /function renderFolderChips\(/u);
  assert.match(newtabJs, /function updateFolderChipsActive\(/u);

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /function renderContentFolderChips\(/u);
  assert.match(contentJs, /function updateContentFolderChipsActive\(/u);
});

test("unreleased tour 5: search live card instant folder chips (BF-UX-015)", () => {
  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /nt-search-action-chips/u);
  assert.match(newtabJs, /async function handleDirectSaveBookmark\(/u);

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /bf-command-action-chips/u);
  assert.match(contentJs, /async function handleDirectSaveBookmark\(/u);
});

test("unreleased tour 6: instant toast feedback (BF-UX-016)", () => {
  const newtabHtml = readFileSync(path.join(root, "src/newtab.html"), "utf8");
  assert.match(newtabHtml, /role="status"/u);
  assert.match(newtabHtml, /aria-live="polite"/u);

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /function showToastNotification\(/u);

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /function showContentToastNotification\(/u);
});

test("unreleased tour 7: operating kernel and modular playbook architecture (BF-GOV-010)", () => {
  assert.ok(existsSync(path.join(root, "AGENTS.md")));
  assert.ok(existsSync(path.join(root, "docs/agent/DECISION_INDEX.md")));
  assert.ok(existsSync(path.join(root, "docs/agent/PROJECT_STATE.md")));
  assert.ok(existsSync(path.join(root, "docs/agent/RULE_CHANGELOG.md")));

  const playbooks = [
    "browser_extension.md",
    "windows_companion.md",
    "ui_accessibility.md",
    "security_privacy.md",
    "release_distribution.md",
    "rule_governance.md",
  ];
  for (const pb of playbooks) {
    assert.ok(existsSync(path.join(root, "docs/agent-playbooks", pb)), `Playbook missing: ${pb}`);
  }
});

test("unreleased tour 8: zero-latency intent router and smart badges (BF-UX-017)", () => {
  assert.ok(existsSync(path.join(root, "src/intent-router.js")));
  const routerCode = readFileSync(path.join(root, "src/intent-router.js"), "utf8");
  assert.match(routerCode, /const BookmarkIntentRoutingEngine = Object\.freeze/u);
  assert.match(routerCode, /detectUserIntent/u);

  const newtabJs = readFileSync(path.join(root, "src/newtab.js"), "utf8");
  assert.match(newtabJs, /updateSearchIntentBadge/u);

  const contentJs = readFileSync(path.join(root, "src/content.js"), "utf8");
  assert.match(contentJs, /updateCommandIntentBadge/u);
});

test("unreleased tour 9: agentic motion & media QA system (BF-QA-002, BF-QA-003)", () => {
  assert.ok(existsSync(path.join(root, "scripts/inspect-motion-qa.mjs")));
  assert.ok(existsSync(path.join(root, "scripts/validate-media-qa.mjs")));

  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts?.["qa:motion"]);
  assert.ok(pkg.scripts?.["qa:media"]);
  assert.match(pkg.scripts?.["validate:all"], /validate-media-qa\.mjs --offline/u);
});
