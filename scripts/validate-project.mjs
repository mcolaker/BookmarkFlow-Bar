import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = join(root, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const requiredManifestValues = {
  manifest_version: 3,
  name: "__MSG_appName__",
  default_locale: "en",
  homepage_url: "https://mcolaker.github.io/BookmarkFlow-Bar/",
};

for (const [key, expected] of Object.entries(requiredManifestValues)) {
  if (manifest[key] !== expected) {
    throw new Error(`manifest.json: expected ${key} to equal ${JSON.stringify(expected)}`);
  }
}

if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) {
  throw new Error("manifest.json: version must use the x.y.z format");
}

if (!(manifest.permissions ?? []).includes("search")) {
  throw new Error("manifest.json: the new-tab web search must declare the Chrome search permission");
}

const newTabSource = readFileSync(join(root, "src/newtab.js"), "utf8");
if (!/chrome\.search\.query\s*\(/u.test(newTabSource)) {
  throw new Error("src/newtab.js: web search must use Chrome's default-provider search API");
}
if (/google\.com\/search/iu.test(newTabSource)) {
  throw new Error("src/newtab.js: web search must not hard-code a search provider");
}

const referencedFiles = [
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  manifest.chrome_url_overrides?.newtab,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
  ...(manifest.content_scripts ?? []).flatMap((entry) => [
    ...(entry.js ?? []),
    ...(entry.css ?? []),
  ]),
].filter(Boolean);

const localeRoot = join(root, "_locales");
const requiredLocales = ["en", "tr"];
const localeMessages = new Map();

for (const locale of requiredLocales) {
  const path = join(localeRoot, locale, "messages.json");
  if (!existsSync(path)) {
    throw new Error(`Missing required locale file: _locales/${locale}/messages.json`);
  }
  localeMessages.set(locale, JSON.parse(readFileSync(path, "utf8")));
}

const defaultMessages = localeMessages.get(manifest.default_locale);
for (const [key, value] of Object.entries(manifest)) {
  if (typeof value !== "string") continue;
  const match = value.match(/^__MSG_([A-Za-z0-9_]+)__$/u);
  if (match && !defaultMessages?.[match[1]]?.message) {
    throw new Error(`manifest.json references a missing default-locale message: ${match[1]}`);
  }
}

const defaultKeys = Object.keys(defaultMessages).sort();
for (const [locale, messages] of localeMessages) {
  const keys = Object.keys(messages).sort();
  if (JSON.stringify(keys) !== JSON.stringify(defaultKeys)) {
    const missing = defaultKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !defaultKeys.includes(key));
    throw new Error(`Locale ${locale} does not match en keys. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`);
  }
}

const usedMessageKeys = new Set();
const manifestSource = JSON.stringify(manifest);
for (const match of manifestSource.matchAll(/__MSG_([A-Za-z0-9_]+)__/gu)) {
  usedMessageKeys.add(match[1]);
}

for (const directory of [join(root, "src")]) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || ![".html", ".js"].includes(extname(entry.name))) continue;
    const source = readFileSync(join(directory, entry.name), "utf8");
    for (const match of source.matchAll(/\bt\(\s*["']([A-Za-z0-9_]+)["']/gu)) {
      usedMessageKeys.add(match[1]);
    }
    for (const match of source.matchAll(/data-i18n(?:-[a-z-]+)?=["']([A-Za-z0-9_]+)["']/gu)) {
      usedMessageKeys.add(match[1]);
    }
  }
}

const undefinedMessageKeys = [...usedMessageKeys].filter((key) => !defaultMessages[key]?.message).sort();
if (undefinedMessageKeys.length) {
  throw new Error(`Undefined localization keys: ${undefinedMessageKeys.join(", ")}`);
}

const extensionPages = [
  "src/popup.html",
  "src/newtab.html",
  "src/onboarding.html",
  "src/bookmark-maintenance.html"
];
for (const page of extensionPages) {
  const source = readFileSync(join(root, page), "utf8");
  if (!/<html\s+lang="en">/u.test(source)) {
    throw new Error(`${page}: English must remain the source/default document language`);
  }
  if (!/<script\s+src="i18n\.js"><\/script>/u.test(source)) {
    throw new Error(`${page}: missing i18n.js before page behavior scripts`);
  }
}

for (const stylesheet of [
  "src/content.css",
  "src/newtab.css",
  "src/popup.css",
  "src/onboarding.css",
  "src/bookmark-maintenance.css"
]) {
  const source = readFileSync(join(root, stylesheet), "utf8");
  if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/u.test(source)) {
    throw new Error(`${stylesheet}: missing reduced-motion support`);
  }
}

for (const path of new Set(referencedFiles)) {
  if (!existsSync(join(root, path))) {
    throw new Error(`manifest.json references a missing file: ${path}`);
  }
}

const sourceDirectories = [join(root, "src"), join(root, "scripts")];
const JavaScriptFiles = [];

function collectJavaScriptFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectJavaScriptFiles(path);
    } else if ([".js", ".mjs"].includes(extname(entry.name))) {
      JavaScriptFiles.push(path);
    }
  }
}

for (const directory of sourceDirectories) {
  collectJavaScriptFiles(directory);
}

for (const path of JavaScriptFiles) {
  execFileSync(process.execPath, ["--check", path], { stdio: "pipe" });
}

const requiredPresentationFiles = [
  "README.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "docs/assets/bookmarkflow-hero.jpg",
  "store/listing-en.md",
];

for (const path of requiredPresentationFiles) {
  if (!existsSync(join(root, path))) {
    throw new Error(`Required project file is missing: ${path}`);
  }
}

const readmeSource = readFileSync(join(root, "README.md"), "utf8");
for (const requiredSupportContent of [
  "## How to support",
  "https://github.com/mcolaker/BookmarkFlow-Bar/discussions",
  "LICENSE.md",
  "SECURITY.md",
]) {
  if (!readmeSource.includes(requiredSupportContent)) {
    throw new Error(`README.md: missing required support content: ${requiredSupportContent}`);
  }
}

for (const canonicalLinkFile of [
  ".github/ISSUE_TEMPLATE/config.yml",
  "CODE_OF_CONDUCT.md",
  "LICENSE.md",
  "README.md",
  "SECURITY.md",
  "docs/index.html",
  "docs/privacy/index.html",
  "store/listing-en.md",
  "store/privacy-dashboard-answers.md",
  "store/privacy-policy.html",
  "store/privacy-policy.md",
  "store/publish-checklist.md",
]) {
  const source = readFileSync(join(root, canonicalLinkFile), "utf8");
  if (/https:\/\/(?:github\.com\/09mc|09mc\.github\.io)/u.test(source)) {
    throw new Error(`${canonicalLinkFile}: contains a stale pre-rename GitHub URL`);
  }
}

console.log(
  `Validated manifest v${manifest.version}, ${JavaScriptFiles.length} JavaScript files, ${requiredLocales.length} locales, and ${requiredPresentationFiles.length} presentation files.`,
);
