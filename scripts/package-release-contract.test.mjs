import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertImmutableReleaseTag,
  assertReleaseArchiveContract,
  listTarEntries,
} from "./package-release.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

test("moving refs and commit-like values fail before Git resolution", () => {
  for (const ref of [undefined, "HEAD", "main", "0.1.37", "79f500f", "v0.1.37^{commit}"]) {
    assert.throws(
      () => assertImmutableReleaseTag(ref, () => assert.fail("Git must not run for an invalid release ref")),
      /existing annotated tag named v<major>\.<minor>\.<patch>/u,
    );
  }
});

test("an exact semantic version tag resolves only through refs/tags", () => {
  const calls = [];
  const release = assertImmutableReleaseTag("v1.2.3", (...args) => {
    calls.push(args);
    return "synthetic-tag-object\n";
  });

  assert.deepEqual(release, {
    ref: "v1.2.3",
    tagRef: "refs/tags/v1.2.3",
    version: "1.2.3",
  });
  assert.deepEqual(calls, [["rev-parse", "--verify", "refs/tags/v1.2.3^{tag}"]]);
});

test("a missing or lightweight tag fails closed", () => {
  assert.throws(
    () => assertImmutableReleaseTag("v1.2.3", () => {
      throw new Error("not an annotated tag");
    }),
    /must resolve to an existing annotated Git tag/u,
  );
});

test("the published v0.1.37 tag exports only runtime and required legal files", () => {
  const archive = execFileSync("git", ["archive", "--format=tar", "refs/tags/v0.1.37"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const entries = listTarEntries(archive);

  assert.doesNotThrow(() => assertReleaseArchiveContract(entries));
  for (const forbidden of [
    ".github/workflows/validate.yml",
    "AGENTS.md",
    "CODE_OF_CONDUCT.md",
    "DCO",
    "GOVERNANCE.md",
    "ROADMAP.md",
    "SUPPORT.md",
    "docs/backlog/OPEN_TASKS.md",
    "scripts/package-release.mjs",
    "store/publish-checklist.md",
  ]) {
    assert.equal(entries.has(forbidden), false, `${forbidden} must remain outside the runtime package`);
  }
});

test("missing legal files and unexpected maintenance paths fail closed", () => {
  const valid = new Set([
    "pax_global_header",
    "manifest.json",
    "LICENSE.md",
    "NOTICE",
    "TRADEMARKS.md",
    "_locales/",
    "_locales/en/messages.json",
    "icons/",
    "icons/icon128.png",
    "src/",
    "src/content.js",
  ]);

  const missingNotice = new Set(valid);
  missingNotice.delete("NOTICE");
  assert.throws(
    () => assertReleaseArchiveContract(missingNotice),
    /missing required package file: NOTICE/u,
  );

  const unexpectedReadme = new Set(valid);
  unexpectedReadme.add("README.md");
  assert.throws(
    () => assertReleaseArchiveContract(unexpectedReadme),
    /maintenance or unapproved paths: README\.md/u,
  );

  for (const promoPath of [
    "media/promo-video/package.json",
    "docs/assets/promo-video/bookmarkflow-bar-overview.mp4",
  ]) {
    const unexpectedPromoMedia = new Set(valid);
    unexpectedPromoMedia.add(promoPath);
    assert.throws(
      () => assertReleaseArchiveContract(unexpectedPromoMedia),
      /maintenance or unapproved paths/u,
      `${promoPath} must remain outside the extension archive`,
    );
  }
});

test("the package CLI rejects HEAD without creating a release archive", () => {
  const result = spawnSync(process.execPath, ["scripts/package-release.mjs", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /HEAD, branches, and commit SHAs are not allowed/u);
});
