import assert from "node:assert/strict";
import test from "node:test";
import { parsePipelineArgs, releasePipeline } from "./release-pipeline.mjs";

test("parsePipelineArgs handles CLI arguments correctly", () => {
  const parsed1 = parsePipelineArgs(["--dry-run", "--skip-tests"]);
  assert.equal(parsed1.dryRun, true);
  assert.equal(parsed1.skipTests, true);
  assert.equal(parsed1.skipTag, false);
  assert.equal(parsed1.tag, null);

  const parsed2 = parsePipelineArgs(["--tag", "v0.4.0", "--skip-tag"]);
  assert.equal(parsed2.dryRun, false);
  assert.equal(parsed2.skipTests, false);
  assert.equal(parsed2.skipTag, true);
  assert.equal(parsed2.tag, "v0.4.0");

  const parsed3 = parsePipelineArgs(["v1.2.3", "--dry-run"]);
  assert.equal(parsed3.tag, "v1.2.3");
  assert.equal(parsed3.dryRun, true);
});

test("releasePipeline succeeds in dry-run mode and returns structured steps", () => {
  const result = releasePipeline({
    dryRun: true,
    skipTests: true,
  });

  assert.equal(result.success, true);
  assert.equal(result.dryRun, true);
  assert.match(result.tag, /^v\d+\.\d+\.\d+$/u);
  assert.ok(Array.isArray(result.steps));
  assert.equal(result.steps.length >= 5, true);

  const stepNames = result.steps.map((s) => s.name);
  assert.ok(stepNames.includes("gh-cli-check"));
  assert.ok(stepNames.includes("working-tree-clean"));
  assert.ok(stepNames.includes("verification-suite"));
  assert.ok(stepNames.includes("git-tag"));
  assert.ok(stepNames.includes("packaging"));
  assert.ok(stepNames.includes("github-release"));
});

test("releasePipeline fails closed on dirty working tree when not dryRun", () => {
  const fakeRunCommand = (cmd, args) => {
    if (cmd === "gh" && args[0] === "--version") return "gh version 2.50.0\n";
    if (cmd === "gh" && args[0] === "auth") return "Logged in to github.com\n";
    if (cmd === "git" && args[0] === "status") return " M src/content.js\n";
    return "";
  };

  assert.throws(
    () => {
      releasePipeline({
        dryRun: false,
        runCommand: fakeRunCommand,
      });
    },
    /Working tree is dirty/u
  );
});

test("releasePipeline respects skipTests and skipTag flags", () => {
  const fakeRunCommand = (cmd, args) => {
    if (cmd === "gh" && args[0] === "--version") return "gh version 2.50.0\n";
    if (cmd === "gh" && args[0] === "auth") return "Logged in to github.com\n";
    if (cmd === "git" && args[0] === "status") return "";
    if (cmd === "git" && args[0] === "rev-parse") {
      throw new Error("tag not found");
    }
    return "";
  };

  const result = releasePipeline({
    dryRun: true,
    skipTests: true,
    skipTag: true,
    runCommand: fakeRunCommand,
  });

  const testStep = result.steps.find((s) => s.name === "verification-suite");
  assert.equal(testStep.status, "skipped");

  const tagStep = result.steps.find((s) => s.name === "git-tag");
  assert.equal(tagStep.status, "skipped");
});
