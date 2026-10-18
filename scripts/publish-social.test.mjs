import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parsePngDimensions, assertSocialCardVisualQuality } from "./publish-social.mjs";

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
