import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertGhCliInstalled, releaseWithGhCli } from "./release-github-cli.mjs";
import { packageCrossBrowser } from "./package-cross-browser.mjs";
import { packageRelease } from "./package-release.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

export function parsePipelineArgs(args = []) {
  const options = {
    dryRun: false,
    skipTests: false,
    skipTag: false,
    tag: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--skip-tests") {
      options.skipTests = true;
    } else if (arg === "--skip-tag") {
      options.skipTag = true;
    } else if (arg === "--tag" && i + 1 < args.length) {
      options.tag = args[++i];
    } else if (arg.startsWith("v") || /^\d+\.\d+\.\d+$/u.test(arg)) {
      options.tag = arg;
    }
  }

  return options;
}

export function releasePipeline(options = {}) {
  const {
    dryRun = false,
    skipTests = false,
    skipTag = false,
    tag = null,
    runCommand = execFileSync,
    manifestPath = join(root, "manifest.json"),
  } = options;

  const steps = [];

  // Step 1: Pre-flight checks (GitHub CLI)
  assertGhCliInstalled(runCommand);
  steps.push({ name: "gh-cli-check", status: "passed" });

  // Read version from manifest or override tag
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const version = tag ? tag.replace(/^v/u, "") : manifest.version;
  const targetTag = `v${version}`;

  // Step 2: Clean working tree check
  const statusOutput = runCommand("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (statusOutput && !dryRun) {
    throw new Error("Working tree is dirty. Please commit or stash all changes before running release:full.");
  }
  steps.push({ name: "working-tree-clean", status: statusOutput ? "dirty-ignored-for-dry-run" : "clean" });

  // Step 3: Run full verification suite if not skipped
  if (!skipTests) {
    if (dryRun) {
      steps.push({ name: "verification-suite", status: "simulated" });
    } else {
      console.log("Running comprehensive test and verification suite...");
      runCommand("npm", ["run", "validate:all"], {
        cwd: root,
        encoding: "utf8",
        stdio: "inherit",
      });
      steps.push({ name: "verification-suite", status: "passed" });
    }
  } else {
    steps.push({ name: "verification-suite", status: "skipped" });
  }

  // Step 4: Git Tag Check / Creation
  let tagExists = false;
  try {
    runCommand("git", ["rev-parse", "--verify", `refs/tags/${targetTag}^{tag}`], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    tagExists = true;
  } catch {
    tagExists = false;
  }

  if (tagExists) {
    steps.push({ name: "git-tag", status: "already-exists", tag: targetTag });
  } else if (!skipTag) {
    if (dryRun) {
      steps.push({ name: "git-tag", status: "dry-run-create", tag: targetTag });
    } else {
      try {
        console.log(`Creating signed annotated Git tag ${targetTag}...`);
        runCommand("git", ["tag", "-s", targetTag, "-m", `BookmarkFlow Bar ${targetTag}`], {
          cwd: root,
          encoding: "utf8",
          stdio: "pipe",
        });
      } catch {
        console.log(`GPG secret key not configured; falling back to standard annotated Git tag ${targetTag}...`);
        runCommand("git", ["tag", "-a", targetTag, "-m", `BookmarkFlow Bar ${targetTag}`], {
          cwd: root,
          encoding: "utf8",
          stdio: "inherit",
        });
      }
      console.log(`Pushing tag ${targetTag} to origin...`);
      runCommand("git", ["push", "origin", targetTag], {
        cwd: root,
        encoding: "utf8",
        stdio: "inherit",
      });
      steps.push({ name: "git-tag", status: "created-and-pushed", tag: targetTag });
    }
  } else {
    steps.push({ name: "git-tag", status: "skipped", tag: targetTag });
  }

  // Step 5: Packaging (Chromium, Firefox, Edge)
  if (dryRun) {
    packageCrossBrowser("all", { dryRun: true });
    steps.push({ name: "packaging", status: "dry-run-packaged" });
  } else {
    console.log(`Packaging Chromium release archive for ${targetTag}...`);
    packageRelease(targetTag);
    console.log("Packaging Firefox and Edge cross-browser archives...");
    packageCrossBrowser("all");
    steps.push({ name: "packaging", status: "packaged" });
  }

  // Step 6: GitHub Release Creation / Upload
  console.log(`Publishing release assets via GitHub CLI for ${targetTag}...`);
  const ghResult = releaseWithGhCli({
    tag: targetTag,
    dryRun,
    runCommand,
  });
  steps.push({ name: "github-release", status: dryRun ? "dry-run-simulated" : "published", result: ghResult });

  return {
    success: true,
    version,
    tag: targetTag,
    dryRun,
    steps,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const options = parsePipelineArgs(process.argv.slice(2));
  console.log(`Starting BookmarkFlow Release Pipeline (dryRun=${options.dryRun})...`);
  const result = releasePipeline(options);
  console.log(`\n[SUCCESS] Release pipeline finished for ${result.tag}. Steps completed: ${result.steps.length}`);
}
