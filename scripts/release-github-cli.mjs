import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

export function getGhCommand() {
  return "gh";
}

export function assertGhCliInstalled(runCommand = execFileSync) {
  try {
    const versionOutput = runCommand("gh", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (!versionOutput || !versionOutput.includes("gh version")) {
      throw new Error("Unexpected gh version output");
    }
  } catch (err) {
    throw new Error(`GitHub CLI ('gh') is not installed or not available in PATH: ${err.message}`);
  }

  try {
    const authOutput = runCommand("gh", ["auth", "status"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    if (!authOutput || !authOutput.includes("Logged in to")) {
      throw new Error("GitHub CLI ('gh') is not logged in");
    }
  } catch (err) {
    throw new Error(`GitHub CLI ('gh') is not authenticated. Please run 'gh auth login': ${err.message}`);
  }

  return true;
}

export function getExpectedReleaseAssets(version, baseDir = join(root, "dist")) {
  const assetNames = [
    `bookmarkflow-bar-${version}.zip`,
    `bookmarkflow-bar-${version}.zip.sha256`,
    `bookmarkflow-bar-${version}-firefox.zip`,
    `bookmarkflow-bar-${version}-firefox.zip.sha256`,
    `bookmarkflow-bar-${version}-edge.zip`,
    `bookmarkflow-bar-${version}-edge.zip.sha256`,
  ];

  return assetNames.map((name) => ({
    name,
    path: join(baseDir, name),
    exists: existsSync(join(baseDir, name)),
  }));
}

export function extractReleaseNotes(changelogContent, version) {
  if (typeof changelogContent !== "string") {
    throw new Error("Invalid changelog content: must be a string");
  }

  const escapedVersion = version.replaceAll(".", "\\.");
  const headingRegex = new RegExp(`##\\s*\\[${escapedVersion}\\][^\n]*\n([\\s\\S]*?)(?=\\n##\\s*\\[|$)`, "u");
  const match = changelogContent.match(headingRegex);

  if (!match || !match[1].trim()) {
    return `Release v${version}\n\nAutomated release packages and SHA-256 digests for Chrome, Firefox, and Edge.`;
  }

  return match[1].trim();
}

export function releaseWithGhCli(options = {}) {
  const {
    tag = null,
    dryRun = false,
    runCommand = execFileSync,
    changelogPath = join(root, "CHANGELOG.md"),
    manifestPath = join(root, "manifest.json"),
  } = options;

  assertGhCliInstalled(runCommand);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const version = tag ? tag.replace(/^v/u, "") : manifest.version;
  const targetTag = `v${version}`;

  const changelog = existsSync(changelogPath) ? readFileSync(changelogPath, "utf8") : "";
  const notes = extractReleaseNotes(changelog, version);
  const title = `v${version} — Release`;

  const assets = getExpectedReleaseAssets(version);
  const missingAssets = assets.filter((a) => !a.exists);
  if (missingAssets.length > 0 && !dryRun) {
    throw new Error(
      `Missing release assets in dist/ for ${targetTag}: ${missingAssets.map((a) => a.name).join(", ")}. Please run 'npm run package:cross-browser' and exact-tag packaging first.`
    );
  }

  const assetPaths = assets.map((a) => a.path);

  if (dryRun) {
    return {
      dryRun: true,
      tag: targetTag,
      version,
      title,
      notes,
      assets: assets.map((a) => a.name),
      command: ["gh", "release", "create", targetTag, ...assetPaths, "--title", title, "--notes", notes],
    };
  }

  let releaseExists = false;
  try {
    runCommand("gh", ["release", "view", targetTag], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    releaseExists = true;
  } catch {
    releaseExists = false;
  }

  if (releaseExists) {
    console.log(`Release ${targetTag} exists. Uploading/updating assets...`);
    runCommand("gh", ["release", "upload", targetTag, ...assetPaths, "--clobber"], {
      encoding: "utf8",
      stdio: "inherit",
    });
  } else {
    console.log(`Creating release ${targetTag}...`);
    runCommand("gh", ["release", "create", targetTag, ...assetPaths, "--title", title, "--notes", notes], {
      encoding: "utf8",
      stdio: "inherit",
    });
  }

  return { success: true, tag: targetTag, version };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const tag = args.find((a) => a.startsWith("v") || /^\d+\.\d+\.\d+$/u.test(a));
  const result = releaseWithGhCli({ tag, dryRun });
  if (dryRun) {
    console.log(`[Dry-Run] GitHub CLI Release simulation successful for ${result.tag}`);
    console.log(`Target Title: ${result.title}`);
    console.log(`Assets (${result.assets.length}): ${result.assets.join(", ")}`);
    console.log(`Command: ${result.command[0]} ${result.command[1]} ${result.command[2]} ${result.command[3]} ...`);
  }
}
