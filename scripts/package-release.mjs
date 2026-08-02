import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const version = manifest.version;
const ref = process.argv[2] || "HEAD";
const safeRoot = root.replaceAll("\\", "/").replace(/\/$/u, "");
const dist = join(root, "dist");
const archiveName = `bookmarkflow-bar-${version}.zip`;
const archivePath = join(dist, archiveName);

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
