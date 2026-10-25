import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assertPreSocialReleaseGate,
  assertSocialCardVisualQuality,
  assertZeroTechnicalJargonInPublicCopy,
  parsePngDimensions,
  parseSocialArgs,
} from "./publish-social.mjs";

test("parsePngDimensions parses standard PNG header and dimensions correctly", () => {
  // Construct a minimal valid PNG buffer (8 bytes signature + 4 bytes length + 4 bytes IHDR + 13 bytes data)
  const buf = Buffer.alloc(33);
  // PNG signature
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].forEach((b, i) => { buf[i] = b; });
  // Chunk length (13)
  buf.writeUInt32BE(13, 8);
  // Chunk type 'IHDR'
  buf.write("IHDR", 12, "ascii");
  // Width: 1200, Height: 675
  buf.writeUInt32BE(1200, 16);
  buf.writeUInt32BE(675, 20);
  buf[24] = 8; // bit depth
  buf[25] = 6; // color type RGBA

  const parsed = parsePngDimensions(buf);
  assert.equal(parsed.width, 1200);
  assert.equal(parsed.height, 675);
  assert.equal(parsed.bitDepth, 8);
  assert.equal(parsed.colorType, 6);
  assert.equal(parsed.aspectRatio, 1200 / 675);
});

test("parsePngDimensions rejects invalid signatures or corrupted buffers", () => {
  assert.throws(() => parsePngDimensions(Buffer.from("invalid-buffer-content")), /Invalid buffer|Invalid PNG/);

  const corruptedSig = Buffer.alloc(30);
  assert.throws(() => parsePngDimensions(corruptedSig), /Invalid PNG signature/);
});

test("assertSocialCardVisualQuality validates X promo card 1200x675 (16:9)", () => {
  const xCardPath = fs.existsSync(path.resolve("output/social-v0.4.1/bookmarkflow-v0.4.1-x-card.png"))
    ? path.resolve("output/social-v0.4.1/bookmarkflow-v0.4.1-x-card.png")
    : path.resolve("output/social-v0.4.0/bookmarkflow-v0.4.0-x-card.png");
  if (fs.existsSync(xCardPath)) {
    const result = assertSocialCardVisualQuality(xCardPath, "x");
    assert.equal(result.valid, true);
    assert.equal(result.platform, "x");
    assert.ok(result.width >= 1200);
    assert.ok(result.height >= 600);
    assert.ok(result.aspectRatio >= 1.70 && result.aspectRatio <= 1.85);
  }
});

test("assertSocialCardVisualQuality validates LinkedIn promo card 1200x627 (1.91:1)", () => {
  const liCardPath = fs.existsSync(path.resolve("output/social-v0.4.1/bookmarkflow-v0.4.1-linkedin-card.png"))
    ? path.resolve("output/social-v0.4.1/bookmarkflow-v0.4.1-linkedin-card.png")
    : path.resolve("output/social-v0.4.0/bookmarkflow-v0.4.0-linkedin-card.png");
  if (fs.existsSync(liCardPath)) {
    const result = assertSocialCardVisualQuality(liCardPath, "linkedin");
    assert.equal(result.valid, true);
    assert.equal(result.platform, "linkedin");
    assert.ok(result.width >= 1200);
    assert.ok(result.height >= 600);
    assert.ok(result.aspectRatio >= 1.85 && result.aspectRatio <= 1.96);
  }
});

test("assertSocialCardVisualQuality fails closed on missing files or wrong aspect ratio", () => {
  assert.throws(
    () => assertSocialCardVisualQuality("non_existent_card.png", "x"),
    /Social media card file does not exist/
  );
});

test("parseSocialArgs parses platform, version, dry-run, and gate flags", () => {
  const parsed = parseSocialArgs(["linkedin", "--version", "v0.4.1", "--dry-run", "--check-gate"]);
  assert.equal(parsed.platform, "linkedin");
  assert.equal(parsed.version, "0.4.1");
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.checkGateOnly, true);
});

test("assertPreSocialReleaseGate passes when both GitHub Release and CWS submission are verified", async () => {
  const mockRunGh = () =>
    JSON.stringify({
      tagName: "v0.4.1",
      isDraft: false,
      url: "https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/v0.4.1",
      assets: [{ name: "bookmarkflow-bar-0.4.1.zip" }],
    });
  const mockVerifyCws = async (ver) => ({
    ok: true,
    version: ver,
    status: "pending_review",
  });

  const gate = await assertPreSocialReleaseGate("v0.4.1", {
    runCommand: mockRunGh,
    verifyCwsFn: mockVerifyCws,
  });
  assert.equal(gate.valid, true);
  assert.equal(gate.version, "0.4.1");
  assert.equal(gate.github.published, true);
  assert.equal(gate.cws.status, "pending_review");
});

test("assertPreSocialReleaseGate fails closed when CWS release is still draft or not submitted", async () => {
  const mockRunGh = () =>
    JSON.stringify({
      tagName: "v0.4.1",
      isDraft: false,
      assets: [{ name: "bookmarkflow-bar-0.4.1.zip" }],
    });
  const mockVerifyCwsNotReady = async (ver) => ({
    ok: false,
    version: ver,
    status: "draft",
  });

  await assert.rejects(
    () =>
      assertPreSocialReleaseGate("0.4.1", {
        runCommand: mockRunGh,
        verifyCwsFn: mockVerifyCwsNotReady,
      }),
    /\[Pre-Social Release Gate Blocked\].*status: draft/
  );
});

test("assertZeroTechnicalJargonInPublicCopy passes Benefit-First copy and blocks internal engineering/AI jargon (BF-GOV-029)", () => {
  const cleanCopy = `Browse without interruption. 🎬⚡
BookmarkFlow Bar v0.4.1 is live!
• Instant mobile bookmark sync across desktop and phone
• Adaptive New Tab safe-area & voice-guided smart sorting`;

  const res = assertZeroTechnicalJargonInPublicCopy(cleanCopy);
  assert.equal(res.valid, true);

  assert.throws(
    () =>
      assertZeroTechnicalJargonInPublicCopy(
        "New update with <1ms O(1) lookup inside closed Shadow DOM and Manifest V3 Service Worker (BF-UX-051)!"
      ),
    /\[Zero-Technical-Jargon Gate Blocked\]/u
  );

  assert.throws(
    () => assertZeroTechnicalJargonInPublicCopy("Powered by AI and LLM smart routing!"),
    /\[Zero-Technical-Jargon Gate Blocked\]/u
  );
});
