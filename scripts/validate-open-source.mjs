import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

// Normalized hashes of the official texts at:
// https://www.apache.org/licenses/LICENSE-2.0.txt
// https://developercertificate.org/
const APACHE_2_0_SHA256 = "43070e2d4e532684de521b885f385d0841030efa2b1a20bafb76133a5e1379c1";
const DCO_1_1_SHA256 = "e2d4e3a3e38f7bd60cbafd7c075cafcdc588efcfdf7bc26ee3c14f7408b10ed2";

const requiredFiles = [
  "README.md",
  "LICENSE.md",
  "NOTICE",
  "TRADEMARKS.md",
  "DCO",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "GOVERNANCE.md",
  "ROADMAP.md",
  "SUPPORT.md",
  "docs/ASSET_PROVENANCE.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/validate.yml",
];

const ignoredDirectories = new Set([".git", "dist", "node_modules", "output"]);
const historicalFiles = new Set(["CHANGELOG.md", "docs/backlog/OPEN_TASKS.md"]);
const publicTextExtensions = new Set([".html", ".md", ".txt", ".yml", ".yaml"]);

const retiredRestrictionPatterns = [
  /Proprietary Source-Available Notice/iu,
  /Copyright[^\n]+All rights reserved\./iu,
  /Public access to the source code does not grant permission to copy/iu,
  /Any such use requires prior written permission from the copyright owner/iu,
  /unmodified checkout for personal evaluation/iu,
  /submitting a contribution does not grant rights to the project/iu,
];

function toRepositoryPath(root, absolutePath) {
  return relative(root, absolutePath).replaceAll("\\", "/");
}

function collectTextPaths(root, directory = root, paths = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      collectTextPaths(root, absolutePath, paths);
      continue;
    }
    if (!entry.isFile()) continue;

    const repositoryPath = toRepositoryPath(root, absolutePath);
    if (historicalFiles.has(repositoryPath)) continue;
    if (publicTextExtensions.has(extname(entry.name).toLowerCase()) || entry.name === "DCO" || entry.name === "NOTICE") {
      paths.push(repositoryPath);
    }
  }
  return paths;
}

export function normalizeOfficialText(text) {
  return text
    .replace(/\r\n?/gu, "\n")
    .replace(/^(?:[ \t]*\n)+/u, "")
    .replace(/(?:\n[ \t]*)+$/u, "");
}

export function officialTextSha256(text) {
  return createHash("sha256").update(normalizeOfficialText(text), "utf8").digest("hex");
}

export function readRepositoryTextFiles(root = repositoryRoot) {
  const paths = new Set(collectTextPaths(root));
  for (const path of requiredFiles) paths.add(path);

  const files = new Map();
  for (const path of [...paths].sort()) {
    const absolutePath = resolve(root, path);
    files.set(path, existsSync(absolutePath) ? readFileSync(absolutePath, "utf8") : null);
  }
  return files;
}

function requireFragments(errors, files, path, fragments) {
  const text = files.get(path);
  if (typeof text !== "string") return;
  for (const fragment of fragments) {
    if (!text.includes(fragment)) errors.push(`${path}: required contract fragment is missing: ${fragment}`);
  }
}

export function validateOpenSourceFiles(files) {
  const errors = [];

  for (const path of requiredFiles) {
    const text = files.get(path);
    if (typeof text !== "string" || !text.trim()) errors.push(`${path}: required open-source file is missing or empty.`);
  }

  const license = files.get("LICENSE.md");
  if (typeof license === "string" && officialTextSha256(license) !== APACHE_2_0_SHA256) {
    errors.push("LICENSE.md: content must exactly match the official Apache License 2.0 text; only line endings and leading/trailing blank lines may differ.");
  }

  const dco = files.get("DCO");
  if (typeof dco === "string" && officialTextSha256(dco) !== DCO_1_1_SHA256) {
    errors.push("DCO: content must exactly match the official Developer Certificate of Origin 1.1 text; only line endings and leading/trailing blank lines may differ.");
  }

  for (const [path, text] of files) {
    if (typeof text !== "string" || historicalFiles.has(path)) continue;
    for (const pattern of retiredRestrictionPatterns) {
      if (pattern.test(text)) errors.push(`${path}: retired proprietary source-available restriction remains active (${pattern.source}).`);
    }
  }

  requireFragments(errors, files, "README.md", [
    "[Apache License 2.0](LICENSE.md)",
    "[NOTICE](NOTICE)",
    "[TRADEMARKS.md](TRADEMARKS.md)",
    "[CONTRIBUTING.md](CONTRIBUTING.md)",
    "[Developer Certificate of Origin](DCO)",
    "[SUPPORT.md](SUPPORT.md)",
    "GOVERNANCE.md",
    "ROADMAP.md",
  ]);

  requireFragments(errors, files, "CONTRIBUTING.md", [
    "[Apache License 2.0](LICENSE.md)",
    "without additional or different terms",
    "[DCO](DCO)",
    "git commit -s",
    "Signed-off-by:",
    "](GOVERNANCE.md)",
    "[TRADEMARKS.md](TRADEMARKS.md)",
  ]);

  requireFragments(errors, files, "NOTICE", ["BookmarkFlow Bar", "Copyright"]);
  requireFragments(errors, files, "TRADEMARKS.md", ["Apache License 2.0 section 6", "does not restrict the rights granted by that license"]);
  requireFragments(errors, files, ".github/PULL_REQUEST_TEMPLATE.md", [
    "Every commit includes a DCO `Signed-off-by:` trailer",
    "under Apache License 2.0",
  ]);
  requireFragments(errors, files, ".github/workflows/validate.yml", [
    "fetch-depth: 0",
    "node scripts/validate-open-source.mjs",
    "node --test scripts/open-source-contract.test.mjs scripts/dco-contract.test.mjs",
    "if: github.event_name == 'pull_request'",
    "DCO_BASE_SHA: ${{ github.event.pull_request.base.sha }}",
    "DCO_HEAD_SHA: ${{ github.event.pull_request.head.sha }}",
    "node scripts/validate-dco.mjs",
  ]);

  return errors;
}

export function validateOpenSourceRepository(root = repositoryRoot) {
  return validateOpenSourceFiles(readRepositoryTextFiles(root));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const errors = validateOpenSourceRepository();
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Open-source license, governance, contribution, and CI contracts are valid.");
  }
}
