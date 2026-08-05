import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const provenancePath = join(root, "docs", "ASSET_PROVENANCE.md");
const provenance = readFileSync(provenancePath, "utf8");

const screenshots = [
  "screenshot-newtab-1280x800.png",
  "screenshot-overlay-1280x800.png",
  "screenshot-palette-1280x800.png",
  "screenshot-folder-rail-1280x800.png",
  "screenshot-streamer-1280x800.png",
];

const assets = new Map([
  ["docs/assets/bookmarkflow-hero.jpg", [1280, 640]],
  ["docs/assets/promo-video/bookmarkflow-bar-poster-1920x1080.jpg", [1920, 1080]],
  ["docs/assets/promo-video/bookmarkflow-bar-preview-960x540.gif", [960, 540]],
  ["icons/icon16.png", [16, 16]],
  ["icons/icon32.png", [32, 32]],
  ["icons/icon48.png", [48, 48]],
  ["icons/icon128.png", [128, 128]],
  ["icons/icon512.png", [512, 512]],
  ["src/assets/tour/bar-open-close.gif", [720, 135]],
  ["src/assets/tour/context-actions.gif", [720, 360]],
  ["src/assets/tour/folder-rail.gif", [720, 420]],
  ["src/assets/tour/search-palette.gif", [720, 420]],
  ["src/assets/tour/streamer-mode.gif", [720, 135]],
  ["store/assets/promo-440x280.png", [440, 280]],
  ["store/assets/marquee-1400x560.png", [1400, 560]],
  ...screenshots.map((name) => [`store/assets/${name}`, [1280, 800]]),
  ["store/assets/tr/promo-440x280.png", [440, 280]],
  ["store/assets/tr/marquee-1400x560.png", [1400, 560]],
  ...screenshots.map((name) => [`store/assets/tr/${name}`, [1280, 800]]),
]);

assertCompleteBinaryInventory();

const reviewed = new Map();

for (const [relativePath, expectedDimensions] of assets) {
  const bytes = readFileSync(join(root, relativePath));
  const actualDimensions = readDimensions(bytes, relativePath);
  if (actualDimensions[0] !== expectedDimensions[0] || actualDimensions[1] !== expectedDimensions[1]) {
    throw new Error(
      `${relativePath}: expected ${expectedDimensions.join("x")}, received ${actualDimensions.join("x")}`,
    );
  }

  if (relativePath.endsWith(".gif")) {
    assertGifContract(bytes, relativePath);
  }

  const digest = createHash("sha256").update(bytes).digest("hex");
  reviewed.set(relativePath, digest);
  const escapedPath = escapeRegExp(relativePath);
  const expectedRow = new RegExp(
    "\\| `" + escapedPath + "` \\|[^\\r\\n]*\\| "
      + expectedDimensions.join("x") + " \\| `" + digest + "` \\|",
    "u",
  );
  if (!expectedRow.test(provenance)) {
    throw new Error(`${relativePath}: dimensions or SHA-256 are missing/stale in docs/ASSET_PROVENANCE.md`);
  }
}

for (const name of ["promo-440x280.png", "marquee-1400x560.png", ...screenshots]) {
  const englishPath = `store/assets/${name}`;
  const turkishPath = `store/assets/tr/${name}`;
  if (reviewed.get(englishPath) === reviewed.get(turkishPath)) {
    throw new Error(`${name}: English and Turkish store assets must be independently localized`);
  }
}

console.log(`Validated ${assets.size} binary assets, complete provenance coverage, localized store variants, and bounded one-play GIFs.`);

function assertCompleteBinaryInventory() {
  const repositoryFiles = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  ).split("\0").filter(Boolean).map((entry) => entry.replaceAll("\\", "/"));
  const textExtensions = new Set([
    ".css", ".gitattributes", ".gitignore", ".html", ".js", ".json", ".md", ".mjs",
    ".srt", ".svg", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
  ]);
  const extensionlessTextFiles = new Set(["DCO", "NOTICE"]);
  const repositoryBinaries = new Set(repositoryFiles.filter((entry) => {
    const fileName = entry.split("/").at(-1);
    const extensionIndex = fileName.lastIndexOf(".");
    const extension = extensionIndex >= 0 ? fileName.slice(extensionIndex).toLowerCase() : "";
    return !extensionlessTextFiles.has(fileName) && !textExtensions.has(extension);
  }));
  const reviewedBinaries = new Set(assets.keys());
  const unreviewed = [...repositoryBinaries].filter((entry) => !reviewedBinaries.has(entry)).sort();
  const stale = [...reviewedBinaries].filter((entry) => !repositoryBinaries.has(entry)).sort();

  if (unreviewed.length || stale.length) {
    throw new Error([
      "Binary provenance inventory must exactly match the repository.",
      unreviewed.length ? `Unreviewed or unclassified files: ${unreviewed.join(", ")}` : "",
      stale.length ? `Stale inventory entries: ${stale.join(", ")}` : "",
    ].filter(Boolean).join(" "));
  }
}

function readDimensions(bytes, relativePath) {
  if (relativePath.endsWith(".png")) {
    if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      throw new Error(`${relativePath}: invalid PNG signature`);
    }
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }

  if (relativePath.endsWith(".gif")) {
    const signature = bytes.subarray(0, 6).toString("ascii");
    if (!new Set(["GIF87a", "GIF89a"]).has(signature) || bytes.length < 10) {
      throw new Error(`${relativePath}: invalid GIF signature`);
    }
    return [bytes.readUInt16LE(6), bytes.readUInt16LE(8)];
  }

  if (relativePath.endsWith(".jpg") || relativePath.endsWith(".jpeg")) {
    return readJpegDimensions(bytes, relativePath);
  }

  throw new Error(`${relativePath}: unsupported binary format`);
}

function readJpegDimensions(bytes, relativePath) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error(`${relativePath}: invalid JPEG signature`);
  }

  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) break;
    if (startOfFrameMarkers.has(marker)) {
      return [bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3)];
    }
    offset += length;
  }
  throw new Error(`${relativePath}: JPEG dimensions could not be read`);
}

function assertGifContract(bytes, relativePath) {
  const text = bytes.toString("latin1");
  for (const extension of ["NETSCAPE2.0", "ANIMEXTS1.0"]) {
    const index = text.indexOf(extension);
    if (index !== -1) {
      throw new Error(`${relativePath}: GIF must play once and must not contain the ${extension} loop extension`);
    }
  }

  const playback = readGifPlayback(bytes, relativePath);
  if (playback.frames < 2) {
    throw new Error(`${relativePath}: animated GIF must contain at least two frames`);
  }
  if (playback.durationHundredths <= 0 || playback.durationHundredths > 500) {
    throw new Error(
      `${relativePath}: GIF duration must be greater than 0 and at most 5.00 seconds; received ${(playback.durationHundredths / 100).toFixed(2)} seconds`,
    );
  }
}

function readGifPlayback(bytes, relativePath) {
  if (bytes.length < 13) {
    throw new Error(`${relativePath}: truncated GIF header`);
  }

  let offset = 13;
  const logicalPacked = bytes[10];
  if (logicalPacked & 0x80) {
    offset += 3 * (2 ** ((logicalPacked & 0x07) + 1));
  }

  let frames = 0;
  let durationHundredths = 0;
  while (offset < bytes.length) {
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0x3b) break;

    if (marker === 0x21) {
      if (offset >= bytes.length) throw new Error(`${relativePath}: truncated GIF extension`);
      const label = bytes[offset];
      offset += 1;
      if (label === 0xf9) {
        if (bytes[offset] !== 4 || offset + 5 >= bytes.length) {
          throw new Error(`${relativePath}: malformed graphics control extension`);
        }
        durationHundredths += bytes.readUInt16LE(offset + 2);
      }
      offset = skipGifSubBlocks(bytes, offset, relativePath);
      continue;
    }

    if (marker === 0x2c) {
      if (offset + 9 > bytes.length) throw new Error(`${relativePath}: truncated image descriptor`);
      const packed = bytes[offset + 8];
      offset += 9;
      if (packed & 0x80) {
        offset += 3 * (2 ** ((packed & 0x07) + 1));
      }
      if (offset >= bytes.length) throw new Error(`${relativePath}: missing LZW code size`);
      offset += 1;
      offset = skipGifSubBlocks(bytes, offset, relativePath);
      frames += 1;
      continue;
    }

    throw new Error(`${relativePath}: unexpected GIF block marker 0x${marker.toString(16)}`);
  }

  return { frames, durationHundredths };
}

function skipGifSubBlocks(bytes, initialOffset, relativePath) {
  let offset = initialOffset;
  while (offset < bytes.length) {
    const size = bytes[offset];
    offset += 1;
    if (size === 0) return offset;
    offset += size;
    if (offset > bytes.length) {
      throw new Error(`${relativePath}: truncated GIF data sub-block`);
    }
  }
  throw new Error(`${relativePath}: unterminated GIF data sub-blocks`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
