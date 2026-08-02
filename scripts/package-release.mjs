import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const ref = process.argv[2] || "HEAD";
const safeRoot = root.replaceAll("\\", "/").replace(/\/$/u, "");
const git = (...args) => execFileSync(
  "git",
  ["-c", `safe.directory=${safeRoot}`, ...args],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);

const manifest = JSON.parse(git("show", `${ref}:manifest.json`));
const version = manifest.version;
if (!/^\d+\.\d+\.\d+$/u.test(version ?? "")) {
  throw new Error(`Ref ${ref} has an invalid manifest version: ${JSON.stringify(version)}`);
}
if (/^v\d/u.test(ref) && ref !== `v${version}`) {
  throw new Error(`Release tag ${ref} does not match manifest version ${version}`);
}

const requiredSourceFiles = [
  "LICENSE.md",
  "NOTICE",
  "TRADEMARKS.md",
  "docs/ASSET_PROVENANCE.md",
];
for (const path of requiredSourceFiles) {
  try {
    git("cat-file", "-e", `${ref}:${path}`);
  } catch {
    throw new Error(`Ref ${ref} is missing required release source file: ${path}`);
  }
}

const dist = join(root, "dist");
const archiveName = `bookmarkflow-bar-${version}.zip`;
const archivePath = join(dist, archiveName);

const tarArchive = execFileSync("git", [
  "-c",
  `safe.directory=${safeRoot}`,
  "archive",
  "--format=tar",
  ref,
], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });

function listTarEntries(buffer) {
  const entries = [];
  for (let offset = 0; offset + 512 <= buffer.length;) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((value) => value === 0)) break;
    const readString = (start, end) => header
      .subarray(start, end)
      .toString("utf8")
      .replace(/\0.*$/u, "");
    const name = readString(0, 100);
    const prefix = readString(345, 500);
    const path = prefix ? `${prefix}/${name}` : name;
    const sizeText = readString(124, 136).trim();
    const size = sizeText ? Number.parseInt(sizeText, 8) : 0;
    if (!Number.isFinite(size)) {
      throw new Error(`Could not parse archived size for ${path}`);
    }
    entries.push(path);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return new Set(entries);
}

const archivedFiles = listTarEntries(tarArchive);
for (const path of ["manifest.json", "LICENSE.md", "NOTICE", "TRADEMARKS.md"]) {
  if (!archivedFiles.has(path)) {
    throw new Error(`Release archive is missing required package file: ${path}`);
  }
}

mkdirSync(dist, { recursive: true });
execFileSync("git", [
  "-c",
  `safe.directory=${safeRoot}`,
  "archive",
  "--format=zip",
  `--output=${archivePath}`,
  ref
], {
  cwd: root,
  stdio: "pipe"
});

const digest = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
const checksumPath = join(dist, `${archiveName}.sha256`);
writeFileSync(checksumPath, `${digest}  ${archiveName}\n`, "utf8");

console.log(`Created ${archiveName}`);
console.log(`SHA-256 ${digest}`);
