import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertGhCliInstalled,
  extractReleaseNotes,
  getExpectedReleaseAssets,
  getGhCommand,
  releaseWithGhCli,
} from "./release-github-cli.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("release-github-cli contract (BF-GOV-018)", () => {
  assert.strictEqual(getGhCommand(), "gh");

  // Test assertGhCliInstalled with mock commands
  const mockSuccessRunner = (cmd, args) => {
    if (args[0] === "--version") return "gh version 2.102.0 (2026-09-30)";
    if (args[0] === "auth" && args[1] === "status") return "Logged in to github.com account mcolaker (keyring)";
    return "";
  };
  assert.strictEqual(assertGhCliInstalled(mockSuccessRunner), true);

  // Test failing versions
  const mockFailVersionRunner = (cmd, args) => {
    if (args[0] === "--version") throw new Error("command not found");
    return "";
  };
  assert.throws(() => assertGhCliInstalled(mockFailVersionRunner), /not installed/u);

  // Test failing auth
  const mockFailAuthRunner = (cmd, args) => {
    if (args[0] === "--version") return "gh version 2.102.0";
    if (args[0] === "auth") throw new Error("not logged in");
    return "";
  };
  assert.throws(() => assertGhCliInstalled(mockFailAuthRunner), /not authenticated/u);

  // Test getExpectedReleaseAssets
  const assets = getExpectedReleaseAssets("0.3.1");
  assert.strictEqual(assets.length, 6);
  assert.ok(assets.some((a) => a.name === "bookmarkflow-bar-0.3.1.zip"));
  assert.ok(assets.some((a) => a.name === "bookmarkflow-bar-0.3.1.zip.sha256"));
  assert.ok(assets.some((a) => a.name === "bookmarkflow-bar-0.3.1-firefox.zip"));
  assert.ok(assets.some((a) => a.name === "bookmarkflow-bar-0.3.1-edge.zip"));

  // Test extractReleaseNotes
  const sampleChangelog = `
# Changelog

## [0.3.1] — 2026-10-02
### Added
- Turquoise glow theme and accents.

## [0.3.0] — 2026-09-29
### Added
- Previous features.
`;
  const notes = extractReleaseNotes(sampleChangelog, "0.3.1");
  assert.match(notes, /Turquoise glow theme/u);
  assert.doesNotMatch(notes, /Previous features/u);

  // Test dry-run execution
  const dryRunResult = releaseWithGhCli({
    tag: "v0.3.1",
    dryRun: true,
    runCommand: mockSuccessRunner,
  });
  assert.strictEqual(dryRunResult.dryRun, true);
  assert.strictEqual(dryRunResult.tag, "v0.3.1");
  assert.strictEqual(dryRunResult.version, "0.3.1");
  assert.ok(Array.isArray(dryRunResult.command));
  assert.strictEqual(dryRunResult.command[0], "gh");
  assert.strictEqual(dryRunResult.command[1], "release");
  assert.strictEqual(dryRunResult.command[2], "create");
});
