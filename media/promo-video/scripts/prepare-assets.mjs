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

writeBrightTechBed(join(generatedRoot, "audio", "bookmarkflow-bed.wav"), 60, 48_000);

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

function writeBrightTechBed(path, durationSeconds, sampleRate) {
  mkdirSync(dirname(path), {recursive: true});
  const channels = 2;
  const bytesPerSample = 2;
  const sampleCount = durationSeconds * sampleRate;
  const dataSize = sampleCount * channels * bytesPerSample;
  const output = Buffer.allocUnsafe(44 + dataSize);
  const leftSamples = new Float32Array(sampleCount);
  const rightSamples = new Float32Array(sampleCount);

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

  const tempo = 104;
  const beatDuration = 60 / tempo;
  const halfBeatDuration = beatDuration / 2;
  const barDuration = beatDuration * 4;
  const progression = [
    {root: 146.8324, chord: [146.8324, 184.9972, 220]},
    {root: 110, chord: [110, 138.5913, 164.8138]},
    {root: 97.9989, chord: [97.9989, 123.4708, 146.8324]},
    {root: 110, chord: [110, 138.5913, 164.8138]},
  ];
  const arpOrder = [0, 1, 2, 1, 0, 1, 2, 1];
  let peak = 0;
  let sumSquares = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const barIndex = Math.floor(time / barDuration);
    const barPhase = time % barDuration;
    const {root, chord} = progression[barIndex % progression.length];
    const beatIndex = Math.floor(time / beatDuration);
    const beatInBar = beatIndex % 4;
    const beatPhase = time % beatDuration;
    const halfBeatIndex = Math.floor(time / halfBeatDuration);
    const halfBeatPhase = time % halfBeatDuration;
    const fadeIn = Math.min(1, time / 0.8);
    const fadeOut = Math.min(1, (durationSeconds - time) / 2);
    const masterEnvelope = Math.max(0, Math.min(fadeIn, fadeOut));
    const chordEnvelope = Math.min(1, barPhase / 0.12)
      * Math.min(1, (barDuration - barPhase) / 0.18);
    const sidechain = 0.58 + 0.42 * Math.min(1, beatPhase / 0.16);
    const padLeft = chord.reduce(
      (sum, frequency, chordIndex) => sum + Math.sin(Math.PI * 2 * frequency * time + chordIndex * 0.13),
      0,
    ) / chord.length;
    const padRight = chord.reduce(
      (sum, frequency, chordIndex) => sum + Math.sin(Math.PI * 2 * frequency * time - chordIndex * 0.11),
      0,
    ) / chord.length;

    const bassEnvelope = 0.72 + 0.28 * Math.exp(-beatPhase * 5);
    const bass = (
      Math.sin(Math.PI * root * time)
      + Math.sin(Math.PI * 2 * root * time) * 0.16
    ) * bassEnvelope;

    const arpStep = arpOrder[halfBeatIndex % arpOrder.length];
    const arpFrequency = chord[arpStep] * 2;
    const pluckEnvelope = Math.exp(-halfBeatPhase * 9.5);
    const pluck = (
      Math.sin(Math.PI * 2 * arpFrequency * halfBeatPhase)
      + Math.sin(Math.PI * 4 * arpFrequency * halfBeatPhase) * 0.22
    ) * pluckEnvelope;
    const pluckPan = ((halfBeatIndex % 4) - 1.5) / 7.5;

    const kickEnvelope = Math.exp(-beatPhase * 20);
    const kickPhase = Math.PI * 2 * (64 * beatPhase - 16 * beatPhase ** 2);
    const kick = Math.sin(kickPhase) * kickEnvelope;

    const noise = deterministicNoise(index, 0x4b1d) - deterministicNoise(index - 1, 0x4b1d);
    const clap = (beatInBar === 1 || beatInBar === 3)
      ? noise * Math.exp(-beatPhase * 32)
      : 0;
    const hatNoise = deterministicNoise(index, 0x19af) - deterministicNoise(index - 2, 0x19af);
    const hat = hatNoise * Math.exp(-halfBeatPhase * 70);

    const left = Math.tanh(
      padLeft * chordEnvelope * sidechain * 0.12
      + bass * 0.11
      + pluck * (0.105 - pluckPan * 0.025)
      + kick * 0.19
      + clap * 0.038
      + hat * 0.012,
    ) * masterEnvelope;
    const right = Math.tanh(
      padRight * chordEnvelope * sidechain * 0.12
      + bass * 0.105
      + pluck * (0.105 + pluckPan * 0.025)
      + kick * 0.19
      + clap * 0.041
      + hat * 0.014,
    ) * masterEnvelope;
    leftSamples[index] = left;
    rightSamples[index] = right;
    peak = Math.max(peak, Math.abs(left), Math.abs(right));
    sumSquares += left ** 2 + right ** 2;
  }

  const rms = Math.sqrt(sumSquares / (sampleCount * channels));
  const gain = Math.min(0.36 / peak, 0.09 / rms);
  let offset = 44;
  for (let index = 0; index < sampleCount; index += 1) {
    output.writeInt16LE(Math.round(leftSamples[index] * gain * 32767), offset);
    output.writeInt16LE(Math.round(rightSamples[index] * gain * 32767), offset + 2);
    offset += 4;
  }

  writeFileSync(path, output);
}

function deterministicNoise(index, seed) {
  let value = Math.imul(index ^ seed, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value ^= value >>> 16;
  return ((value >>> 0) / 0xffffffff) * 2 - 1;
}
