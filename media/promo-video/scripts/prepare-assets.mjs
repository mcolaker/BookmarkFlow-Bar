import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {dirname, join, relative, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const generatedRoot = join(workspaceRoot, "public", "generated");
const captureRoot = join(workspaceRoot, "public", "captures");
const captureManifest = process.env.PROMO_USE_NATIVE_CAPTURES === "1" ? readCaptureManifest() : null;

assertInsideWorkspace(generatedRoot);
rmSync(generatedRoot, {recursive: true, force: true});
for (const directory of ["assets", "audio", "sequences"]) {
  mkdirSync(join(generatedRoot, directory), {recursive: true});
}

const copiedAssets = new Map([
  [captureOrFallback("02-expanded-bar.png", "store/assets/screenshot-overlay-1280x800.png"), "assets/overlay.png"],
  [captureOrFallback("03-search-palette.png", "store/assets/screenshot-palette-1280x800.png"), "assets/palette.png"],
  [captureOrFallback("07-new-tab-workspace.png", "store/assets/screenshot-newtab-1280x800.png"), "assets/newtab.png"],
  [captureOrFallback("04-folder-rail.png", "store/assets/screenshot-folder-rail-1280x800.png"), "assets/folder-rail.png"],
  [captureOrFallback("06-streamer-mode.png", "store/assets/screenshot-streamer-1280x800.png"), "assets/streamer.png"],
  [join(repoRoot, "docs/assets/bookmarkflow-hero.jpg"), "assets/hero.jpg"],
  [join(repoRoot, "icons/icon512.png"), "assets/icon512.png"],
]);

for (const [source, destination] of copiedAssets) {
  copyFileSync(source, join(generatedRoot, destination));
}

const motionAssets = new Map([
  ["src/assets/tour/bar-open-close.gif", "sequences/bar-open-close"],
  ["src/assets/tour/folder-rail.gif", "sequences/folder-rail"],
  ["src/assets/tour/streamer-mode.gif", "sequences/streamer-mode"],
]);

for (const [source, destination] of motionAssets) {
  const sequenceRoot = join(generatedRoot, destination);
  mkdirSync(sequenceRoot, {recursive: true});
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      join(repoRoot, source),
      "-vf",
      "scale=iw*2:ih*2:flags=lanczos",
      "-fps_mode",
      "passthrough",
      "-start_number",
      "1",
      join(sequenceRoot, "frame-%03d.png"),
    ],
    {cwd: repoRoot, stdio: "inherit"},
  );
}

writeAmbientBed(join(generatedRoot, "audio", "bookmarkflow-bed.wav"), 60, 48_000);

const manifest = {
  schemaVersion: 1,
  generatedAt: "deterministic",
  safety: {
    profile: "No browser profile is read by this preparation step.",
    network: "No remote media is fetched.",
    inputs: captureManifest
      ? "Verified temporary-profile captures and provenance-reviewed repository assets are used."
      : "Only provenance-reviewed repository assets are copied or transcoded.",
  },
  files: listFiles(generatedRoot).map((absolutePath) => ({
    path: relative(generatedRoot, absolutePath).replaceAll("\\", "/"),
    bytes: statSync(absolutePath).size,
    sha256: sha256(absolutePath),
  })),
};

writeFileSync(join(generatedRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Prepared ${manifest.files.length} deterministic promo inputs in ${generatedRoot}`);

function assertInsideWorkspace(target) {
  const workspace = `${resolve(workspaceRoot).toLowerCase()}\\`;
  const resolvedTarget = `${resolve(target).toLowerCase()}\\`;
  if (!resolvedTarget.startsWith(workspace)) {
    throw new Error(`Refusing to mutate a path outside the promo workspace: ${target}`);
  }
}

function listFiles(directory) {
  return readdirSync(directory, {withFileTypes: true})
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    })
    .sort((a, b) => a.localeCompare(b));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readCaptureManifest() {
  const path = join(captureRoot, "capture-manifest.json");
  if (!existsSync(path)) return null;
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  if (manifest.locale !== "en-US" || manifest.resolution?.width !== 1920 || manifest.resolution?.height !== 1080) {
    throw new Error("Capture manifest does not match the reviewed en-US 1920x1080 contract");
  }
  for (const capture of manifest.captures ?? []) {
    const capturePath = join(captureRoot, capture.file);
    if (!existsSync(capturePath) || statSync(capturePath).size !== capture.bytes || sha256(capturePath) !== capture.sha256) {
      throw new Error(`Capture manifest integrity check failed: ${capture.file}`);
    }
  }
  return manifest;
}

function captureOrFallback(captureName, fallbackRelativePath) {
  if (!captureManifest) return join(repoRoot, fallbackRelativePath);
  if (!(captureManifest.captures ?? []).some(({file}) => file === captureName)) {
    throw new Error(`Required capture is absent from capture-manifest.json: ${captureName}`);
  }
  return join(captureRoot, captureName);
}

function writeAmbientBed(path, durationSeconds, sampleRate) {
  mkdirSync(dirname(path), {recursive: true});
  const channels = 2;
  const bytesPerSample = 2;
  const sampleCount = durationSeconds * sampleRate;
  const dataSize = sampleCount * channels * bytesPerSample;
  const output = Buffer.allocUnsafe(44 + dataSize);

  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(36 + dataSize, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  output.writeUInt16LE(channels * bytesPerSample, 32);
  output.writeUInt16LE(bytesPerSample * 8, 34);
  output.write("data", 36, "ascii");
  output.writeUInt32LE(dataSize, 40);

  const chordRoots = [110, 130.8128, 98, 146.8324];
  let offset = 44;
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const root = chordRoots[Math.floor(time / 8) % chordRoots.length];
    const fadeIn = Math.min(1, time / 2.5);
    const fadeOut = Math.min(1, (durationSeconds - time) / 4);
    const masterEnvelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const slowPulse = 0.76 + 0.24 * Math.sin(Math.PI * 2 * time / 4) ** 2;
    const pad =
      Math.sin(Math.PI * 2 * root * time) * 0.42
      + Math.sin(Math.PI * 2 * root * 1.5 * time + 0.3) * 0.28
      + Math.sin(Math.PI * 2 * root * 2 * time + 0.8) * 0.16;
    const shimmerEnvelope = Math.exp(-((time % 4) * 1.25));
    const shimmer = Math.sin(Math.PI * 2 * root * 4 * time) * shimmerEnvelope * 0.16;
    const sample = Math.tanh((pad * slowPulse + shimmer) * 0.12) * masterEnvelope;
    const left = Math.round(sample * 32767);
    const right = Math.round(sample * (0.94 + 0.04 * Math.sin(time * 0.7)) * 32767);
    output.writeInt16LE(left, offset);
    output.writeInt16LE(right, offset + 2);
    offset += 4;
  }

  writeFileSync(path, output);
}
