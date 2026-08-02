import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifestPath = join(root, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const requiredManifestValues = {
  manifest_version: 3,
  name: "BookmarkFlow Bar",
};

for (const [key, expected] of Object.entries(requiredManifestValues)) {
  if (manifest[key] !== expected) {
    throw new Error(`manifest.json: expected ${key} to equal ${JSON.stringify(expected)}`);
  }
}

if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) {
  throw new Error("manifest.json: version must use the x.y.z format");
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

console.log(
  `Validated manifest v${manifest.version}, ${JavaScriptFiles.length} JavaScript files, and ${requiredPresentationFiles.length} presentation files.`,
);
