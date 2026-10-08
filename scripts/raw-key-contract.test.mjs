import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

// Known Mojibake / double-encoded UTF-8 corruption patterns
const mojibakePatterns = [
  /Ã§/u, // ç
  /Ã¶/u, // ö
  /Ã¼/u, // ü
  /ÄŸ/u, // ğ
  /ÅŸ/u, // ş
  /Ä±/u, // ı
  /Ã‡/u, // Ç
  /Ã–/u, // Ö
  /Ãœ/u, // Ü
  /Äž/u, // Ğ
  /Åž/u, // Ş
  /Ä°/u, // İ
  /â€œ/u, // “
  /â€”/u, // —
  /â€™/u, // ’
];

test("localization: 100% key and placeholder parity between en and tr", () => {
  const enJson = JSON.parse(readFileSync(join(root, "_locales", "en", "messages.json"), "utf8"));
  const trJson = JSON.parse(readFileSync(join(root, "_locales", "tr", "messages.json"), "utf8"));

  const enKeys = Object.keys(enJson).sort();
  const trKeys = Object.keys(trJson).sort();

  assert.deepEqual(enKeys, trKeys, "en and tr messages.json must have 100% identical keys");

  for (const key of enKeys) {
    const enPlaceholders = Object.keys(enJson[key].placeholders || {}).sort();
    const trPlaceholders = Object.keys(trJson[key].placeholders || {}).sort();
    assert.deepEqual(
      enPlaceholders,
      trPlaceholders,
      `Key '${key}' placeholders must match between en and tr`
    );
  }
});

test("raw-key gate: all chrome.i18n.getMessage and data-i18n calls reference valid keys", () => {
  const enJson = JSON.parse(readFileSync(join(root, "_locales", "en", "messages.json"), "utf8"));
  const validKeys = new Set(Object.keys(enJson));

  const srcDir = join(root, "src");
  const srcFiles = readdirSync(srcDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".html")))
    .map((entry) => join(entry.parentPath || srcDir, entry.name));

  const getMessageRegex = /chrome\.i18n\.getMessage\(\s*["']([^"']+)["']/gu;
  const i18nFunctionRegex = /\bi18n\(\s*["']([^"']+)["']/gu;
  const dataI18nRegex = /data-i18n(?:-[a-z]+)?=["']([^"']+)["']/gu;

  const missingKeys = [];

  for (const filePath of srcFiles) {
    const content = readFileSync(filePath, "utf8");

    // Check getMessage("...")
    for (const match of content.matchAll(getMessageRegex)) {
      const key = match[1];
      if (!validKeys.has(key)) {
        missingKeys.push({ file: filePath, key, source: "chrome.i18n.getMessage" });
      }
    }

    // Check i18n("...")
    for (const match of content.matchAll(i18nFunctionRegex)) {
      const key = match[1];
      if (!validKeys.has(key)) {
        missingKeys.push({ file: filePath, key, source: "i18n()" });
      }
    }

    // Check data-i18n="..."
    for (const match of content.matchAll(dataI18nRegex)) {
      const key = match[1];
      if (!validKeys.has(key)) {
        missingKeys.push({ file: filePath, key, source: "data-i18n" });
      }
    }
  }

  assert.equal(
    missingKeys.length,
    0,
    `Found invalid or missing i18n keys: ${JSON.stringify(missingKeys, null, 2)}`
  );
});

test("mojibake & corruption gate: zero double-encoded UTF-8 characters across UI and locales", () => {
  const filesToScan = [
    join(root, "_locales", "en", "messages.json"),
    join(root, "_locales", "tr", "messages.json"),
    join(root, "manifest.json"),
    ...readdirSync(join(root, "src"), { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile() && (e.name.endsWith(".js") || e.name.endsWith(".html") || e.name.endsWith(".css")))
      .map((e) => join(e.parentPath || join(root, "src"), e.name)),
  ];

  const violations = [];

  for (const filePath of filesToScan) {
    const content = readFileSync(filePath, "utf8");
    for (const pattern of mojibakePatterns) {
      if (pattern.test(content)) {
        violations.push({ file: filePath, pattern: pattern.toString() });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Mojibake or character corruption detected: ${JSON.stringify(violations, null, 2)}`
  );
});

test("raw UI key leak gate: HTML files do not contain unparsed raw keys in text nodes", () => {
  const htmlFiles = readdirSync(join(root, "src"))
    .filter((name) => name.endsWith(".html"))
    .map((name) => join(root, "src", name));

  // Regex to catch things like >nt_title< or >bar_placeholder< that were left unreplaced
  const rawKeyPattern = />\s*(nt_[a-zA-Z0-9_]+|bar_[a-zA-Z0-9_]+|quick_[a-zA-Z0-9_]+)\s*</gu;
  const leaks = [];

  for (const htmlPath of htmlFiles) {
    const content = readFileSync(htmlPath, "utf8");
    for (const match of content.matchAll(rawKeyPattern)) {
      leaks.push({ file: htmlPath, rawKey: match[1] });
    }
  }

  assert.equal(
    leaks.length,
    0,
    `Raw translation keys leaked in HTML text nodes: ${JSON.stringify(leaks, null, 2)}`
  );
});
