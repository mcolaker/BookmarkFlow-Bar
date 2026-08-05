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

const openSearchSuggestedKeys = manifest.commands?.["open-search"]?.suggested_key ?? {};
for (const platform of ["default", "mac"]) {
  if (openSearchSuggestedKeys[platform] !== "Alt+Shift+K") {
    throw new Error(`manifest.json: open-search ${platform} shortcut must use the reviewed Alt+Shift+K default`);
  }
}

const newTabSource = readFileSync(join(root, "src/newtab.js"), "utf8");
if (!/chrome\.search\.query\s*\(/u.test(newTabSource)) {
  throw new Error("src/newtab.js: web search must use Chrome's default-provider search API");
}
if (/google\.com\/search/iu.test(newTabSource)) {
  throw new Error("src/newtab.js: web search must not hard-code a search provider");
}

const onboardingHtml = readFileSync(join(root, "src/onboarding.html"), "utf8");
const onboardingSource = readFileSync(join(root, "src/onboarding.js"), "utf8");
if (!/chrome\.commands\.getAll\s*\(/u.test(onboardingSource)) {
  throw new Error("src/onboarding.js: shortcut guide must read Chrome's actual command assignments");
}
for (const command of ["open-search", "toggle-bar", "hide-restore", "toggle-streamer-mode"]) {
  if (!onboardingHtml.includes(`data-command="${command}"`)) {
    throw new Error(`src/onboarding.html: missing dynamic shortcut row for ${command}`);
  }
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

const promoVideoValidator = join(root, "media", "promo-video", "scripts", "validate-source.mjs");
if (existsSync(promoVideoValidator)) {
  execFileSync(process.execPath, [promoVideoValidator], {cwd: root, stdio: "inherit"});
}

const ciWorkflowSource = readFileSync(join(root, ".github/workflows/validate.yml"), "utf8");
for (const requiredBrowserCiContract of [
  "runs-on: ubuntu-24.04",
  "BOOKMARKFLOW_CHROME_PATH: /usr/bin/google-chrome",
  "Verify locale-capable Google Chrome",
  'readlink -f "$BOOKMARKFLOW_CHROME_PATH"',
  "locales/en-US.pak",
  'locales/${BOOKMARKFLOW_CHROME_LANG}.pak',
]) {
  if (!ciWorkflowSource.includes(requiredBrowserCiContract)) {
    throw new Error(`.github/workflows/validate.yml: missing locale-capable Chrome contract: ${requiredBrowserCiContract}`);
  }
}
if (/playwright@[^\s]+\s+install\s+chromium/iu.test(ciWorkflowSource)) {
  throw new Error(".github/workflows/validate.yml: locale matrix must not use the locale-incomplete Playwright Chromium bundle");
}

const requiredPresentationFiles = [
  "README.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "DCO",
  "GOVERNANCE.md",
  "LICENSE.md",
  "NOTICE",
  "ROADMAP.md",
  "SECURITY.md",
  "SUPPORT.md",
  "TRADEMARKS.md",
  "CHANGELOG.md",
  "docs/ASSET_PROVENANCE.md",
  "docs/assets/bookmarkflow-hero.jpg",
  "docs/assets/promo-video/bookmarkflow-bar-poster-1920x1080.jpg",
  "docs/assets/promo-video/bookmarkflow-bar-preview-960x540.gif",
  "media/promo-video/README.md",
  "media/promo-video/captions/bookmarkflow-master.en.srt",
  "store/listing-en.md",
];

for (const path of requiredPresentationFiles) {
  if (!existsSync(join(root, path))) {
    throw new Error(`Required project file is missing: ${path}`);
  }
}

const readmeSource = readFileSync(join(root, "README.md"), "utf8");
const chromeWebStoreUrl = "https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf";
for (const requiredSupportContent of [
  "## How to support",
  chromeWebStoreUrl,
  "https://github.com/mcolaker/BookmarkFlow-Bar/discussions",
  "GOVERNANCE.md",
  "LICENSE.md",
  "ROADMAP.md",
  "SECURITY.md",
  "SUPPORT.md",
  "TRADEMARKS.md",
  "## Product film",
  "docs/assets/promo-video/bookmarkflow-bar-preview-960x540.gif",
  "media/promo-video/README.md",
]) {
  if (!readmeSource.includes(requiredSupportContent)) {
    throw new Error(`README.md: missing required support content: ${requiredSupportContent}`);
  }
}

for (const canonicalLinkFile of [
  ".github/ISSUE_TEMPLATE/config.yml",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "GOVERNANCE.md",
  "LICENSE.md",
  "README.md",
  "ROADMAP.md",
  "SECURITY.md",
  "SUPPORT.md",
  "TRADEMARKS.md",
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

for (const consentKey of [
  "dataConsentHeading",
  "dataConsentIntro",
  "dataConsentAgree",
  "dataConsentRequired",
  "dataConsentRequiredHeading",
  "dataConsentRequiredDescription",
]) {
  for (const [locale, messages] of localeMessages) {
    if (!String(messages[consentKey]?.message || "").trim()) {
      throw new Error(`_locales/${locale}/messages.json: missing non-empty consent message ${consentKey}`);
    }
  }
}

const reviewerNotes = readFileSync(join(root, "store/reviewer-notes.md"), "utf8");
const reviewerPermissions = reviewerNotes.split("## Permissions")[1] || "";
for (const permission of manifest.permissions ?? []) {
  if (!reviewerPermissions.includes(`\`${permission}\``)) {
    throw new Error(`store/reviewer-notes.md: permissions section omits manifest permission ${permission}`);
  }
}

const privacyDashboard = readFileSync(join(root, "store/privacy-dashboard-answers.md"), "utf8");
for (const requiredDisclosure of [
  "**Web history: select.**",
  "**Website content: select.**",
  "**User activity: leave unselected.**",
  "Chrome's Search API sends the query",
  "not sold or transferred to third parties outside the approved use cases",
  "not used or transferred for purposes unrelated to BookmarkFlow Bar's single purpose",
  "not used or transferred to determine creditworthiness",
]) {
  if (!privacyDashboard.includes(requiredDisclosure)) {
    throw new Error(`store/privacy-dashboard-answers.md: missing reviewed disclosure: ${requiredDisclosure}`);
  }
}
if (!privacyDashboard.includes("I agree — enable bookmark and page access")) {
  throw new Error("store/privacy-dashboard-answers.md: missing prominent first-run consent disclosure");
}

const productSiteSource = readFileSync(join(root, "docs/index.html"), "utf8");
if (!productSiteSource.includes(chromeWebStoreUrl)) {
  throw new Error("docs/index.html: missing canonical Chrome Web Store installation URL");
}

const publishChecklist = readFileSync(join(root, "store/publish-checklist.md"), "utf8");
if (!publishChecklist.includes(chromeWebStoreUrl)) {
  throw new Error("store/publish-checklist.md: missing canonical existing Chrome Web Store item URL");
}
if (!publishChecklist.includes("Upload only the extension ZIP")) {
  throw new Error("store/publish-checklist.md: Chrome Web Store upload must be limited to the extension ZIP");
}
if (/upload both generated files/iu.test(publishChecklist)) {
  throw new Error("store/publish-checklist.md: incorrectly instructs maintainers to upload the checksum to Chrome Web Store");
}

for (const privacyPolicyPath of [
  "store/privacy-policy.md",
  "store/privacy-policy.html",
  "docs/privacy/index.html",
]) {
  const source = readFileSync(join(root, privacyPolicyPath), "utf8");
  if (!source.includes("August 5, 2026")) {
    throw new Error(`${privacyPolicyPath}: effective date does not cover the current privacy behavior`);
  }
}

const onboardingHtmlSource = readFileSync(join(root, "src/onboarding.html"), "utf8");
const attributesSource = readFileSync(join(root, ".gitattributes"), "utf8");
for (const pendingTourAsset of ["search-palette.gif", "context-actions.gif"]) {
  if (readmeSource.includes(`src/assets/tour/${pendingTourAsset}`) || onboardingHtmlSource.includes(`assets/tour/${pendingTourAsset}`)) {
    throw new Error(`${pendingTourAsset}: pending visual refresh must not be promoted in README or onboarding`);
  }
  if (!attributesSource.includes(`/src/assets/tour/${pendingTourAsset} export-ignore`)) {
    throw new Error(`${pendingTourAsset}: pending visual refresh must not enter the release archive`);
  }
}

const turkishListing = readFileSync(join(root, "store/listing-tr.md"), "utf8");
for (const requiredTurkishContent of [
  "ÖNE ÇIKAN ÖZELLİKLER",
  "TASARIMDAN İTİBAREN GİZLİLİK",
  "Alt + Shift + K",
  "https://mcolaker.github.io/BookmarkFlow-Bar/privacy/",
]) {
  if (!turkishListing.includes(requiredTurkishContent)) {
    throw new Error(`store/listing-tr.md: missing reviewed Turkish listing content: ${requiredTurkishContent}`);
  }
}
if (/\b(?:gosterir|kucuk|ust|ozellikler)\b/iu.test(turkishListing)) {
  throw new Error("store/listing-tr.md: ASCII-transliterated Turkish copy remains in the active listing");
}

execFileSync(process.execPath, [join(root, "scripts/validate-assets.mjs")], {
  cwd: root,
  stdio: "pipe",
});

console.log(
  `Validated manifest v${manifest.version}, ${JavaScriptFiles.length} JavaScript files, ${requiredLocales.length} locales, ${requiredPresentationFiles.length} presentation files, and the reviewed binary asset contract.`,
);
