import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const safeRoot = root.replaceAll("\\", "/").replace(/\/$/u, "");
const publicFiles = execFileSync(
  "git",
  [
    "-c",
    `safe.directory=${safeRoot}`,
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
  ],
  {
  cwd: root,
  encoding: "utf8",
  },
)
  .split(/\r?\n/u)
  .filter(Boolean);

const forbiddenPaths = [
  /(?:^|\/)(?:node_modules|output|dist|deploy|renders|frames|coverage|\.remotion|\.cache)\//iu,
  /(?:^|\/)public\/(?:generated|captures)\//iu,
  /(?:^|\/)(?:\.env(?:\..*)?|cookies?|history|login data|web data)$/iu,
  /(?:^|\/)(?:id_rsa|id_ed25519)(?:\.pub)?$/iu,
];

const forbiddenPath = publicFiles.find((path) =>
  forbiddenPaths.some((pattern) => pattern.test(path)),
);

if (forbiddenPath) {
  throw new Error(`Unsafe local or generated path is tracked: ${forbiddenPath}`);
}

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".srt",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
]);

const scanPatterns = [
  { label: "absolute Windows user path", value: /[A-Za-z]:[\\/]Users[\\/][^\\/\s]+/u },
  { label: "private key", value: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { label: "GitHub access token", value: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/u },
  { label: "AWS access key", value: /\bAKIA[0-9A-Z]{16}\b/u },
];

const extensionlessTextFiles = new Set(["DCO", "NOTICE", ".imgbotconfig"]);

for (const path of publicFiles) {
  if (
    path === "scripts/verify-public-tree.mjs"
    || (!textExtensions.has(extname(path).toLowerCase()) && !extensionlessTextFiles.has(path))
  ) {
    continue;
  }

  const content = readFileSync(join(root, path), "utf8");
  const match = scanPatterns.find(({ value }) => value.test(content));
  if (match) {
    throw new Error(`${match.label} found in tracked file: ${path}`);
  }
}

console.log(`Verified ${publicFiles.length} public files: no blocked paths or high-confidence secret patterns found.`);
