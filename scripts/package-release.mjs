import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const safeRoot = root.replaceAll("\\", "/").replace(/\/$/u, "");
const git = (...args) => execFileSync(
  "git",
  ["-c", `safe.directory=${safeRoot}`, ...args],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);

const releaseTagPattern = /^v(\d+\.\d+\.\d+)$/u;
const requiredPackageFiles = ["manifest.json", "LICENSE.md", "NOTICE", "TRADEMARKS.md"];
const allowedPackagePrefixes = ["_locales/", "icons/", "src/"];

export function assertImmutableReleaseTag(ref, runGit = git) {
  const match = typeof ref === "string" ? ref.match(releaseTagPattern) : null;
  if (!match) {
    throw new Error("Release ref must be an existing annotated tag named v<major>.<minor>.<patch>; HEAD, branches, and commit SHAs are not allowed");
  }

  const tagRef = `refs/tags/${ref}`;
  try {
    runGit("rev-parse", "--verify", `${tagRef}^{tag}`);
  } catch {
    throw new Error(`Release ref ${ref} must resolve to an existing annotated Git tag`);
  }

  return { ref, tagRef, version: match[1] };
}

export function listTarEntries(buffer) {
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

export function assertReleaseArchiveContract(archivedFiles) {
  for (const path of requiredPackageFiles) {
    if (!archivedFiles.has(path)) {
      throw new Error(`Release archive is missing required package file: ${path}`);
    }
  }

  const unexpectedFiles = [...archivedFiles].filter((path) => (
    path !== "pax_global_header"
    && !requiredPackageFiles.includes(path)
    && !allowedPackagePrefixes.some((prefix) => path.startsWith(prefix))
  ));
  if (unexpectedFiles.length) {
    throw new Error(`Release archive contains maintenance or unapproved paths: ${unexpectedFiles.sort().join(", ")}`);
  }
}

export function packageRelease(ref) {
  const release = assertImmutableReleaseTag(ref);
  const manifest = JSON.parse(git("show", `${release.tagRef}:manifest.json`));
  if (manifest.version !== release.version) {
    throw new Error(`Release tag ${release.ref} does not match manifest version ${JSON.stringify(manifest.version)}`);
  }

  const requiredSourceFiles = [
    "LICENSE.md",
    "NOTICE",
    "TRADEMARKS.md",
    "docs/ASSET_PROVENANCE.md",
  ];
  for (const path of requiredSourceFiles) {
    try {
      git("cat-file", "-e", `${release.tagRef}:${path}`);
    } catch {
      throw new Error(`Release tag ${release.ref} is missing required release source file: ${path}`);
    }
  }

  const dist = join(root, "dist");
  const archiveName = `bookmarkflow-bar-${release.version}.zip`;
  const archivePath = join(dist, archiveName);
  const tarArchive = execFileSync("git", [
    "-c",
    `safe.directory=${safeRoot}`,
    "archive",
    "--format=tar",
    release.tagRef,
  ], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  assertReleaseArchiveContract(listTarEntries(tarArchive));

  mkdirSync(dist, { recursive: true });
  execFileSync("git", [
    "-c",
    `safe.directory=${safeRoot}`,
    "archive",
    "--format=zip",
    `--output=${archivePath}`,
    release.tagRef,
  ], {
    cwd: root,
    stdio: "pipe",
  });

  const digest = createHash("sha256").update(readFileSync(archivePath)).digest("hex");
  const checksumPath = join(dist, `${archiveName}.sha256`);
  writeFileSync(checksumPath, `${digest}  ${archiveName}\n`, "utf8");

  console.log(`Created ${archiveName}`);
  console.log(`SHA-256 ${digest}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  packageRelease(process.argv[2]);
}
