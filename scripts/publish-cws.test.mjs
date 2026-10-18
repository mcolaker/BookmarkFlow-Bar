import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  CWS_DASHBOARD_URL,
  CWS_EDIT_URL,
  CWS_PACKAGE_URL,
  assertReleaseZipExists,
  checkGitHubReleasePublished,
  getManifestVersion,
  parseCwsArgs,
  parseCwsStatusFromText,
  publishToChromeWebStore,
} from "./publish-cws.mjs";

test("getManifestVersion reads active semantic version from manifest.json", () => {
  const version = getManifestVersion();
  assert.match(version, /^\d+\.\d+\.\d+$/u);
});

test("parseCwsArgs parses flags and positional version tags accurately", () => {
  const parsed = parseCwsArgs(["v0.4.1", "--check-only", "--dry-run", "--skip-submit", "--zip", "dist/custom.zip"]);
  assert.equal(parsed.version, "0.4.1");
  assert.equal(parsed.checkOnly, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.skipSubmit, true);
  assert.equal(parsed.zipPath, "dist/custom.zip");

  const parsedFlagVersion = parseCwsArgs(["--version", "v0.5.0"]);
  assert.equal(parsedFlagVersion.version, "0.5.0");
});

test("assertReleaseZipExists validates real ZIP signature and minimum file size", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bf-cws-test-"));
  try {
    const validZipPath = path.join(tmpDir, "bookmarkflow-bar-0.4.1.zip");
    const zipBuffer = Buffer.alloc(24 * 1024, 0x20);
    zipBuffer[0] = 0x50;
    zipBuffer[1] = 0x4b;
    zipBuffer[2] = 0x03;
    zipBuffer[3] = 0x04;
    fs.writeFileSync(validZipPath, zipBuffer);

    const res = assertReleaseZipExists("v0.4.1", null, tmpDir);
    assert.equal(res.valid, true);
    assert.equal(res.version, "0.4.1");
    assert.equal(res.zipPath, validZipPath);
    assert.equal(res.sizeBytes, 24 * 1024);

    // Reject missing file
    assert.throws(
      () => assertReleaseZipExists("0.9.9", null, tmpDir),
      /CWS release ZIP archive does not exist/
    );

    // Reject small file
    const tinyZipPath = path.join(tmpDir, "bookmarkflow-bar-0.4.2.zip");
    fs.writeFileSync(tinyZipPath, Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    assert.throws(
      () => assertReleaseZipExists("0.4.2", null, tmpDir),
      /suspiciously small/
    );

    // Reject non-ZIP header
    const badHeaderPath = path.join(tmpDir, "bookmarkflow-bar-0.4.3.zip");
    fs.writeFileSync(badHeaderPath, Buffer.alloc(25 * 1024, 0x41));
    assert.throws(
      () => assertReleaseZipExists("0.4.3", null, tmpDir),
      /Invalid ZIP signature/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("checkGitHubReleasePublished verifies non-draft GitHub release and Chrome ZIP asset", () => {
  const mockRunCommandOk = () =>
    JSON.stringify({
      tagName: "v0.4.1",
      isDraft: false,
      url: "https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/v0.4.1",
      assets: [{ name: "bookmarkflow-bar-0.4.1.zip" }, { name: "bookmarkflow-bar-0.4.1-firefox.zip" }],
    });

  const okRes = checkGitHubReleasePublished("0.4.1", { runCommand: mockRunCommandOk });
  assert.equal(okRes.published, true);
  assert.equal(okRes.tag, "v0.4.1");
  assert.equal(okRes.assetCount, 2);

  // Reject draft release
  const mockRunDraft = () =>
    JSON.stringify({
      tagName: "v0.4.1",
      isDraft: true,
      assets: [{ name: "bookmarkflow-bar-0.4.1.zip" }],
    });
  assert.throws(
    () => checkGitHubReleasePublished("0.4.1", { runCommand: mockRunDraft }),
    /still in DRAFT state/
  );

  // Reject missing Chrome ZIP asset
  const mockRunMissingAsset = () =>
    JSON.stringify({
      tagName: "v0.4.1",
      isDraft: false,
      assets: [{ name: "bookmarkflow-bar-0.4.1-firefox.zip" }],
    });
  assert.throws(
    () => checkGitHubReleasePublished("0.4.1", { runCommand: mockRunMissingAsset }),
    /missing required asset "bookmarkflow-bar-0.4.1.zip"/
  );
});

test("parseCwsStatusFromText detects reauth, pending_review, published, draft, and not_found states", () => {
  const reauthRes = parseCwsStatusFromText(
    "Devam etmek için önce kimliğinizi doğrulayın\nŞifrenizi girin",
    "0.4.1",
    "https://accounts.google.com/v3/signin/challenge/pwd"
  );
  assert.equal(reauthRes.reauthRequired, true);
  assert.equal(reauthRes.status, "reauth_required");

  const pendingRes = parseCwsStatusFromText(
    "BookmarkFlow Bar\n18 Eki 2026\nSürüm 0.4.1 — İncelenmeyi bekliyor\nYayımlandı\nSürüm 0.4.0",
    "0.4.1",
    CWS_DASHBOARD_URL
  );
  assert.equal(pendingRes.reauthRequired, false);
  assert.equal(pendingRes.isPendingReview, true);
  assert.equal(pendingRes.status, "pending_review");

  const draftRes = parseCwsStatusFromText(
    "Paket\nTaslak\nSürüm 0.4.2\n18 Eki 2026\nYayımlandı\nSürüm 0.4.1",
    "0.4.2",
    CWS_PACKAGE_URL
  );
  assert.equal(draftRes.isDraft, true);
  assert.equal(draftRes.status, "draft");

  const publishedRes = parseCwsStatusFromText(
    "Paket\nYayımlandı\nSürüm 0.4.1\n18 Eki 2026",
    "0.4.1",
    CWS_PACKAGE_URL
  );
  assert.equal(publishedRes.isPublished, true);
  assert.equal(publishedRes.status, "published");

  const missingRes = parseCwsStatusFromText(
    "BookmarkFlow Bar\nSürüm 0.4.0 — Yayımlandı",
    "0.4.1",
    CWS_EDIT_URL
  );
  assert.equal(missingRes.versionFound, false);
  assert.equal(missingRes.status, "not_found");
});

test("publishToChromeWebStore executes dry-run simulation without network side effects", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bf-cws-dry-"));
  try {
    const validZipPath = path.join(tmpDir, "bookmarkflow-bar-0.4.1.zip");
    const zipBuffer = Buffer.alloc(24 * 1024, 0x20);
    zipBuffer[0] = 0x50;
    zipBuffer[1] = 0x4b;
    zipBuffer[2] = 0x03;
    zipBuffer[3] = 0x04;
    fs.writeFileSync(validZipPath, zipBuffer);

    const res = await publishToChromeWebStore({
      version: "0.4.1",
      distDir: tmpDir,
      dryRun: true,
    });
    assert.equal(res.success, true);
    assert.equal(res.dryRun, true);
    assert.equal(res.version, "0.4.1");
    assert.ok(res.steps.includes("upload-zip-package"));
    assert.ok(res.steps.includes("submit-for-review"));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
