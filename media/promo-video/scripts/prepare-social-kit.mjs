import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {dirname, join, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..", "..");
const outputRoot = resolve(repoRoot, "output", "social-launch-kit");
const status = "PREPARED_NOT_POSTED";
const background = "0x0d1118";
const expectedToolVersion = "8.0.1";
const expectedMediaSourceRevision = "ef1fe204e09b894509a0ceeaf7411435d3ead862";
const promoManifestRelativePath = "output/promo-video/manifest.json";
const promoManifestSha256 = "f1a1557db55f975cbbd6357524c114404d481793633f54ae4282128932e8bf08";
const ffmpeg = findOnPath(process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
const ffprobe = findOnPath(process.platform === "win32" ? "ffprobe.exe" : "ffprobe");

const approvedSources = new Map([
  [
    "output/promo-video/bookmarkflow-bar-master-1920x1080.mp4",
    mediaContract("fc9a5fdb422ffa72a4b48f1eef6295eb5a9e083bf47b66c1dde3c954df4972a2", 8575262, 1920, 1080, "h264", {duration: 58, audio: true}),
  ],
  [
    "output/promo-video/bookmarkflow-bar-linkedin-1920x1080.mp4",
    mediaContract("fc9a5fdb422ffa72a4b48f1eef6295eb5a9e083bf47b66c1dde3c954df4972a2", 8575262, 1920, 1080, "h264", {duration: 58, audio: true}),
  ],
  [
    "output/promo-video/bookmarkflow-bar-x-1920x1080.mp4",
    mediaContract("3dfaf957a70da07870f1d67f40fc2aa050179ca037cf73e94acd590cf6b33d7d", 4170939, 1920, 1080, "h264", {duration: 32, audio: true}),
  ],
  [
    "output/promo-video/bookmarkflow-bar-teaser-1080x1350.mp4",
    mediaContract("c8749cab07c8de8fb6c83f02075677121ec81798ecea627c86142c0c8549db3b", 2936669, 1080, 1350, "h264", {duration: 15, audio: true}),
  ],
  [
    "docs/assets/promo-video/bookmarkflow-bar-poster-1920x1080.jpg",
    mediaContract("54ed70aece14899308a83a2056fb9f811509efdd6281cbf25c0b2f647363a649", 127399, 1920, 1080, "mjpeg"),
  ],
  [
    "docs/assets/promo-video/bookmarkflow-bar-preview-960x540.gif",
    mediaContract("81eb19948e96572ca4cb3ec88aad0586aa27a0022b48be1a7adbb890115d3c9e", 1225748, 960, 540, "gif", {duration: 4.58}),
  ],
  [
    "icons/icon512.png",
    mediaContract("bc1899c76bde9c0c9bb2989bc333cabba91f25bf4df8312840c2dc0fda1258d3", 6898, 512, 512, "png"),
  ],
  [
    "store/assets/screenshot-newtab-1280x800.png",
    mediaContract("85dec2d36d5c8d8794d02dadecb4f06cbc4493f81e8a84f643d18cc06cd4b8e6", 32464, 1280, 800, "png"),
  ],
  [
    "store/assets/screenshot-overlay-1280x800.png",
    mediaContract("57c1a9c57ba696602b1fa44177d548e5f73439fd110c6ae65b09fe69b56fa7a1", 252376, 1280, 800, "png"),
  ],
  [
    "store/assets/screenshot-palette-1280x800.png",
    mediaContract("f9e06c92d28f9223e329e9883584a5197e49b10b886a060eb13352fd5f197b04", 155231, 1280, 800, "png"),
  ],
  [
    "store/assets/screenshot-folder-rail-1280x800.png",
    mediaContract("8af02a60e8ee7a2ec0a59d74019acac5e247a5ad7b8f805cb12f3f8bc60ebdf4", 277733, 1280, 800, "png"),
  ],
  [
    "store/assets/screenshot-streamer-1280x800.png",
    mediaContract("8067910e0db0a86d98cd7c36b8102f9f722afde4c97fac0acce7dac03d485914", 252989, 1280, 800, "png"),
  ],
  [
    "output/promo-video/bookmarkflow-bar-master.en.srt",
    textContract("be4a393a55aed83c383eb1236719385010151e4fd4aee3ab70f26cbfc4b0a31a", 625, "application/x-subrip"),
  ],
  [
    "output/promo-video/bookmarkflow-bar-x.en.srt",
    textContract("4be659921d8af8befd42a1946241a53ede7bb11813b75eebc5600682e16fb97b", 352, "application/x-subrip"),
  ],
  [
    "media/promo-video/launch/LAUNCH_COPY.en.md",
    textContract("4bd2877deb00bc35f6c8d860f92262acdc1af0e874ffdf3d9e13e16cdd0a9fe9", 8579, "text/markdown"),
  ],
  [
    "media/promo-video/launch/POSTING_GUIDE.en.md",
    textContract("f8784e3b3d2f499a0dee8bcbf2dc6776913f160a4e1fb8cbdc6e8554994cfce9", 5366, "text/markdown"),
  ],
]);

const copyDefinitions = [
  copyDefinition("approved-master", "output/promo-video/bookmarkflow-bar-master-1920x1080.mp4", "videos/bookmarkflow-bar-master-1920x1080.mp4"),
  copyDefinition("linkedin-video", "output/promo-video/bookmarkflow-bar-linkedin-1920x1080.mp4", "videos/bookmarkflow-bar-linkedin-1920x1080.mp4"),
  copyDefinition("x-video", "output/promo-video/bookmarkflow-bar-x-1920x1080.mp4", "videos/bookmarkflow-bar-x-1920x1080.mp4"),
  copyDefinition("four-by-five-teaser", "output/promo-video/bookmarkflow-bar-teaser-1080x1350.mp4", "videos/bookmarkflow-bar-teaser-1080x1350.mp4"),
  copyDefinition("readme-preview-gif", "docs/assets/promo-video/bookmarkflow-bar-preview-960x540.gif", "readme/bookmarkflow-bar-preview-960x540.gif"),
  copyDefinition("store-new-tab", "store/assets/screenshot-newtab-1280x800.png", "store-screenshots/screenshot-newtab-1280x800.png"),
  copyDefinition("store-overlay", "store/assets/screenshot-overlay-1280x800.png", "store-screenshots/screenshot-overlay-1280x800.png"),
  copyDefinition("store-search-palette", "store/assets/screenshot-palette-1280x800.png", "store-screenshots/screenshot-palette-1280x800.png"),
  copyDefinition("store-folder-rail", "store/assets/screenshot-folder-rail-1280x800.png", "store-screenshots/screenshot-folder-rail-1280x800.png"),
  copyDefinition("store-streamer-mode", "store/assets/screenshot-streamer-1280x800.png", "store-screenshots/screenshot-streamer-1280x800.png"),
  copyDefinition("master-english-captions", "output/promo-video/bookmarkflow-bar-master.en.srt", "captions/bookmarkflow-bar-master.en.srt"),
  copyDefinition("x-english-captions", "output/promo-video/bookmarkflow-bar-x.en.srt", "captions/bookmarkflow-bar-x.en.srt"),
  copyDefinition("english-launch-copy", "media/promo-video/launch/LAUNCH_COPY.en.md", "copy/LAUNCH_COPY.en.md"),
  copyDefinition("english-posting-guide", "media/promo-video/launch/POSTING_GUIDE.en.md", "copy/POSTING_GUIDE.en.md"),
];

const stillDefinitions = [
  stillDefinition("linkedin-still", "docs/assets/promo-video/bookmarkflow-bar-poster-1920x1080.jpg", "stills/bookmarkflow-linkedin-1200x627.png", 1200, 627, "a494c622ba3a92fd9e63ce7d85e54ae8dfac238ac40430aeec717b17eb65f3d7"),
  stillDefinition("x-reddit-still", "docs/assets/promo-video/bookmarkflow-bar-poster-1920x1080.jpg", "stills/bookmarkflow-x-reddit-1600x900.png", 1600, 900, "bc4a92b09947ff9d952d5b83035faab5af41a12a8e933ef5db79b6dcc0cda48b"),
  stillDefinition("devto-still", "docs/assets/promo-video/bookmarkflow-bar-poster-1920x1080.jpg", "stills/bookmarkflow-devto-1000x420.png", 1000, 420, "2fd1f398dd7e98fa6c3d0947a851364e7aefec7b5886a4c2001488ced756b32b"),
  stillDefinition("product-hunt-gallery", "docs/assets/promo-video/bookmarkflow-bar-poster-1920x1080.jpg", "stills/bookmarkflow-product-hunt-gallery-1270x760.png", 1270, 760, "5c10492afc69fbde894df73d8b6e16c365ba82d7fef4072ea930861f81b49442"),
  stillDefinition("product-hunt-thumbnail", "icons/icon512.png", "stills/bookmarkflow-product-hunt-thumbnail-240x240.png", 240, 240, "069b0222b8b593b89d173b5f75860186edbe57519921e17372794173da608793"),
];

const artifactDefinitions = [...copyDefinitions, ...stillDefinitions];
const expectedPublishedPaths = [
  ...artifactDefinitions.map(({output}) => output),
  "manifest.json",
  "SHA256SUMS.txt",
].sort();

main();

function main() {
  assertSafeOutputRoot();
  assertExistingOutputShape();
  const toolchain = validateToolchain();
  const mediaProvenance = validatePromoManifest();
  const sourceCache = new Map();
  for (const definition of artifactDefinitions) {
    validateApprovedSource(definition.source, sourceCache);
  }

  const outputParent = dirname(outputRoot);
  mkdirSync(outputParent, {recursive: true});
  const stagingRoot = resolve(outputParent, `.social-launch-kit-staging-${process.pid}`);
  assertInsideOutputParent(stagingRoot);
  rmSync(stagingRoot, {recursive: true, force: true});
  mkdirSync(stagingRoot, {recursive: true});

  try {
    for (const definition of copyDefinitions) {
      const destination = stagingPath(stagingRoot, definition.output);
      mkdirSync(dirname(destination), {recursive: true});
      copyFileSync(sourcePath(definition.source), destination);
    }
    for (const definition of stillDefinitions) {
      const destination = stagingPath(stagingRoot, definition.output);
      mkdirSync(dirname(destination), {recursive: true});
      deriveStill(sourcePath(definition.source), destination, definition.width, definition.height);
    }

    const artifacts = artifactDefinitions.map((definition) => describeArtifact(stagingRoot, definition));
    assertOutputContracts(artifacts);

    const manifest = {
      schemaVersion: 1,
      status,
      provenance: {
        assemblyRevision: git(["rev-parse", "HEAD"]).trim(),
        assemblyWorktree: git(["status", "--short", "--untracked-files=normal"]).trim() ? "dirty" : "clean",
        mediaSourceRevision: mediaProvenance.sourceRevision,
        promoManifestSha256: mediaProvenance.sha256,
        socialKitScriptSha256: sha256(fileURLToPath(import.meta.url)),
      },
      kitRoot: "output/social-launch-kit",
      background: "#0d1118",
      toolchain,
      privacy: {
        note: "Only reviewed synthetic BookmarkFlow interface media is included; no personal Chrome profile, bookmarks, browsing history, account data, analytics, or remote input is used.",
        remoteInput: "forbidden",
        publishing: "No artifact has been posted, uploaded, or published by this preparation script.",
      },
      rights: {
        note: "All inputs are project-owned or project-generated assets recorded in docs/ASSET_PROVENANCE.md.",
        transforms: "Platform stills use deterministic aspect-preserving scale and dark-background padding only; no generative edit, invented text, third-party logo, or remote font is added.",
      },
      artifacts,
    };
    const manifestPath = stagingPath(stagingRoot, "manifest.json");
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const checksumEntries = [
      ...artifacts.map(({sha256, output}) => ({sha256, output})),
      {sha256: sha256(manifestPath), output: "manifest.json"},
    ].sort((left, right) => left.output.localeCompare(right.output));
    writeFileSync(
      stagingPath(stagingRoot, "SHA256SUMS.txt"),
      `${checksumEntries.map(({sha256: hash, output}) => `${hash}  ${output}`).join("\n")}\n`,
      "utf8",
    );

    publishAtomically(stagingRoot);
    verifyPublishedKit(artifacts, checksumEntries);
    console.log(`Prepared and verified ${artifacts.length} social-launch artifacts.`);
    console.log(`Output: ${outputRoot}`);
    console.log(`Status: ${status}`);
  } finally {
    rmSync(stagingRoot, {recursive: true, force: true});
  }
}

function mediaContract(hash, bytes, width, height, codec, options = {}) {
  return {kind: "media", hash, bytes, width, height, codec, ...options};
}

function textContract(hash, bytes, mediaType) {
  return {kind: "text", hash, bytes, mediaType, encoding: "utf-8"};
}

function copyDefinition(role, source, output) {
  return {role, source, output, transform: "byte-identical-copy"};
}

function stillDefinition(role, source, output, width, height, goldenSha256) {
  return {
    role,
    source,
    output,
    width,
    height,
    goldenSha256,
    transform: `aspect-preserving-scale-and-pad:${width}x${height}:background=#0d1118`,
  };
}

function validateApprovedSource(source, cache) {
  if (cache.has(source)) return cache.get(source);
  if (/^(?:https?|ftp|data):/iu.test(source)) {
    throw new Error(`Remote or embedded source input is forbidden: ${source}`);
  }
  const contract = approvedSources.get(source);
  if (!contract) throw new Error(`Source is not in the approved asset allowlist: ${source}`);
  const filePath = sourcePath(source);
  if (!existsSync(filePath)) throw new Error(`Approved source is missing: ${source}`);
  const linkStats = lstatSync(filePath);
  if (!linkStats.isFile() || linkStats.isSymbolicLink()) {
    throw new Error(`Approved source must be a regular, non-symlink file: ${source}`);
  }
  const realSource = realpathSync(filePath);
  assertInsideRepo(realSource, `Approved source resolves outside the repository: ${source}`);
  const stats = statSync(filePath);
  const actualHash = sha256(filePath);
  if (stats.size !== contract.bytes || actualHash !== contract.hash) {
    throw new Error(`Approved source hash/size drifted: ${source}`);
  }
  if (contract.kind === "text") {
    const bytes = readFileSync(filePath);
    const decoded = new TextDecoder("utf-8", {fatal: true}).decode(bytes);
    if (decoded.includes("\0")) throw new Error(`Approved text source contains a NUL byte: ${source}`);
    const description = {contract, probe: null, path: filePath, sha256: actualHash, bytes: stats.size};
    cache.set(source, description);
    return description;
  }
  const probe = probeMedia(filePath);
  const video = probe.streams.find(({codec_type: type}) => type === "video");
  const audio = probe.streams.find(({codec_type: type}) => type === "audio");
  const duration = Number(probe.format?.duration || 0);
  if (
    video?.codec_name !== contract.codec
    || video?.width !== contract.width
    || video?.height !== contract.height
    || (contract.duration !== undefined && Math.abs(duration - contract.duration) > 0.12)
  ) {
    throw new Error(`Approved source media contract drifted: ${source}`);
  }
  if (contract.audio && (
    audio?.codec_name !== "aac"
    || audio?.sample_rate !== "48000"
    || audio?.channels !== 2
    || video?.pix_fmt !== "yuv420p"
    || video?.r_frame_rate !== "30/1"
  )) {
    throw new Error(`Approved video codec/audio contract drifted: ${source}`);
  }
  const description = {contract, probe, path: filePath, sha256: actualHash, bytes: stats.size};
  cache.set(source, description);
  return description;
}

function deriveStill(source, destination, width, height) {
  execFileSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-y",
      "-i", source,
      "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${background},setsar=1,format=rgb24`,
      "-frames:v", "1",
      "-an",
      "-map_metadata", "-1",
      "-threads", "1",
      "-compression_level", "9",
      "-pred", "mixed",
      destination,
    ],
    {cwd: repoRoot, stdio: "pipe"},
  );
}

function validateToolchain() {
  const ffmpegVersion = readToolVersion(ffmpeg, "ffmpeg");
  const ffprobeVersion = readToolVersion(ffprobe, "ffprobe");
  return {
    requiredVersion: expectedToolVersion,
    ffmpeg: ffmpegVersion,
    ffprobe: ffprobeVersion,
  };
}

function readToolVersion(executable, name) {
  const firstLine = execFileSync(executable, ["-version"], {cwd: repoRoot, encoding: "utf8"})
    .split(/\r?\n/u)[0]
    .trim();
  if (!firstLine.startsWith(`${name} version ${expectedToolVersion}`)) {
    throw new Error(`${name} ${expectedToolVersion} is required; received: ${firstLine}`);
  }
  return firstLine;
}

function validatePromoManifest() {
  const manifestPath = sourcePath(promoManifestRelativePath);
  if (!existsSync(manifestPath) || lstatSync(manifestPath).isSymbolicLink() || !statSync(manifestPath).isFile()) {
    throw new Error("The reviewed promo manifest must be a regular, non-symlink file.");
  }
  const actualSha256 = sha256(manifestPath);
  if (actualSha256 !== promoManifestSha256) {
    throw new Error("The reviewed promo manifest digest drifted.");
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const master = manifest.artifacts?.find(({path}) => path === "bookmarkflow-bar-master-1920x1080.mp4");
  const xVideo = manifest.artifacts?.find(({path}) => path === "bookmarkflow-bar-x-1920x1080.mp4");
  if (
    manifest.status !== "PREPARED_NOT_UPLOADED"
    || manifest.sourceRevision !== expectedMediaSourceRevision
    || master?.sha256 !== approvedSources.get("output/promo-video/bookmarkflow-bar-master-1920x1080.mp4").hash
    || xVideo?.sha256 !== approvedSources.get("output/promo-video/bookmarkflow-bar-x-1920x1080.mp4").hash
  ) {
    throw new Error("The reviewed promo manifest provenance contract failed.");
  }
  return {sourceRevision: manifest.sourceRevision, sha256: actualSha256};
}

function describeArtifact(stagingRoot, definition) {
  const source = validateApprovedSource(definition.source, new Map());
  const outputPath = stagingPath(stagingRoot, definition.output);
  if (!existsSync(outputPath) || !statSync(outputPath).isFile()) {
    throw new Error(`Prepared output is missing: ${definition.output}`);
  }
  if (source.contract.kind === "text") {
    const bytes = readFileSync(outputPath);
    new TextDecoder("utf-8", {fatal: true}).decode(bytes);
    return {
      role: definition.role,
      status,
      source: definition.source,
      sourceSha256: source.sha256,
      output: definition.output,
      bytes: statSync(outputPath).size,
      mediaType: source.contract.mediaType,
      encoding: source.contract.encoding,
      sha256: sha256(outputPath),
      transform: definition.transform,
    };
  }
  const probe = probeMedia(outputPath);
  const video = probe.streams.find(({codec_type: type}) => type === "video");
  const duration = Number(probe.format?.duration || 0);
  return {
    role: definition.role,
    status,
    source: definition.source,
    sourceSha256: source.sha256,
    output: definition.output,
    bytes: statSync(outputPath).size,
    dimensions: {width: video?.width || 0, height: video?.height || 0},
    ...(duration > 0.05 ? {durationSeconds: Number(duration.toFixed(3))} : {}),
    codec: video?.codec_name || "unknown",
    sha256: sha256(outputPath),
    transform: definition.transform,
  };
}

function assertOutputContracts(artifacts) {
  if (artifacts.length !== artifactDefinitions.length) {
    throw new Error(`Expected ${artifactDefinitions.length} artifacts, received ${artifacts.length}.`);
  }
  for (const definition of artifactDefinitions) {
    const artifact = artifacts.find(({output}) => output === definition.output);
    const source = approvedSources.get(definition.source);
    if (source.kind === "text") {
      if (
        !artifact
        || artifact.status !== status
        || artifact.bytes !== source.bytes
        || artifact.sha256 !== source.hash
        || artifact.mediaType !== source.mediaType
        || artifact.encoding !== source.encoding
      ) {
        throw new Error(`Prepared text artifact contract failed: ${definition.output}`);
      }
      continue;
    }
    const expectedWidth = definition.width || source.width;
    const expectedHeight = definition.height || source.height;
    const expectedCodec = definition.transform === "byte-identical-copy" ? source.codec : "png";
    if (
      !artifact
      || artifact.status !== status
      || artifact.bytes < 100
      || artifact.dimensions.width !== expectedWidth
      || artifact.dimensions.height !== expectedHeight
      || artifact.codec !== expectedCodec
    ) {
      throw new Error(`Prepared artifact contract failed: ${definition.output}`);
    }
    if (definition.transform === "byte-identical-copy") {
      if (artifact.sha256 !== source.hash || artifact.bytes !== source.bytes) {
        throw new Error(`Copied artifact is not byte-identical to its approved source: ${definition.output}`);
      }
    } else if (artifact.sha256 !== definition.goldenSha256) {
      throw new Error(`Derived artifact does not match its reviewed golden digest: ${definition.output}`);
    }
  }
}

function publishAtomically(stagingRoot) {
  const stagedFiles = listFiles(stagingRoot).map((filePath) => relative(stagingRoot, filePath).replaceAll(sep, "/")).sort();
  if (JSON.stringify(stagedFiles) !== JSON.stringify(expectedPublishedPaths)) {
    throw new Error(`Unexpected staged publication set: ${JSON.stringify(stagedFiles)}`);
  }

  const backupRoot = resolve(dirname(outputRoot), `.social-launch-kit-backup-${process.pid}`);
  assertInsideOutputParent(backupRoot);
  if (existsSync(backupRoot)) {
    throw new Error(`Refusing to overwrite an existing social-kit backup: ${backupRoot}`);
  }
  let backedUp = false;
  let published = false;
  let complete = false;
  try {
    if (existsSync(outputRoot)) {
      renameSync(outputRoot, backupRoot);
      backedUp = true;
    }
    renameSync(stagingRoot, outputRoot);
    published = true;
    complete = true;
  } catch (error) {
    const rollbackErrors = [];
    try {
      if (published && existsSync(outputRoot)) rmSync(outputRoot, {recursive: true, force: true});
      if (backedUp && existsSync(backupRoot)) renameSync(backupRoot, outputRoot);
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }
    if (rollbackErrors.length) {
      throw new AggregateError([error, ...rollbackErrors], "Social kit publication and rollback failed.");
    }
    throw error;
  } finally {
    if (complete && existsSync(backupRoot)) rmSync(backupRoot, {recursive: true, force: true});
  }
}

function verifyPublishedKit(artifacts, checksumEntries) {
  for (const artifact of artifacts) {
    const published = outputPath(artifact.output);
    if (
      !existsSync(published)
      || statSync(published).size !== artifact.bytes
      || sha256(published) !== artifact.sha256
    ) {
      throw new Error(`Published artifact readback failed: ${artifact.output}`);
    }
  }
  const manifestPath = outputPath("manifest.json");
  const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (parsed.status !== status || parsed.artifacts?.length !== artifactDefinitions.length) {
    throw new Error("Published manifest readback failed.");
  }
  const expectedChecksums = `${checksumEntries.map(({sha256: hash, output}) => `${hash}  ${output}`).join("\n")}\n`;
  if (readFileSync(outputPath("SHA256SUMS.txt"), "utf8") !== expectedChecksums) {
    throw new Error("Published SHA256SUMS readback failed.");
  }
}

function assertExistingOutputShape() {
  if (!existsSync(outputRoot)) return;
  assertNoSymlinkComponents(outputRoot);
  const files = listFiles(outputRoot)
    .filter((filePath) => !relative(outputRoot, filePath).split(sep)[0].startsWith(".staging-"))
    .map((filePath) => relative(outputRoot, filePath).replaceAll(sep, "/"))
    .sort();
  const unexpected = files.filter((filePath) => !expectedPublishedPaths.includes(filePath));
  if (unexpected.length) {
    throw new Error(`Refusing to overwrite output containing unexpected files: ${unexpected.join(", ")}`);
  }
}

function listFiles(root) {
  if (!existsSync(root)) return [];
  const output = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const candidate = join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Symbolic links are forbidden in the social kit: ${candidate}`);
      if (entry.isDirectory()) visit(candidate);
      else if (entry.isFile()) output.push(candidate);
      else throw new Error(`Unexpected filesystem entry in the social kit: ${candidate}`);
    }
  };
  visit(root);
  return output;
}

function probeMedia(filePath) {
  return JSON.parse(execFileSync(
    ffprobe,
    ["-v", "error", "-show_streams", "-show_format", "-of", "json", filePath],
    {cwd: repoRoot, encoding: "utf8"},
  ));
}

function sourcePath(source) {
  const candidate = resolve(repoRoot, ...source.split("/"));
  assertInsideRepo(candidate, `Source escapes the repository: ${source}`);
  return candidate;
}

function stagingPath(stagingRoot, relativePath) {
  const candidate = resolve(stagingRoot, ...relativePath.split("/"));
  const rel = relative(stagingRoot, candidate);
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`) || resolve(candidate) === resolve(stagingRoot)) {
    throw new Error(`Staging output escapes its expected directory: ${relativePath}`);
  }
  return candidate;
}

function outputPath(relativePath) {
  const candidate = resolve(outputRoot, ...relativePath.split("/"));
  assertInsideOutput(candidate);
  return candidate;
}

function assertSafeOutputRoot() {
  const expected = resolve(repoRoot, "output", "social-launch-kit");
  if (outputRoot.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Refusing to prepare an unexpected output path: ${outputRoot}`);
  }
  assertInsideRepo(outputRoot, `Output root escapes the repository: ${outputRoot}`);
  assertNoSymlinkComponents(dirname(outputRoot));
  if (existsSync(outputRoot)) assertNoSymlinkComponents(outputRoot);
}

function assertInsideRepo(candidate, message) {
  const rel = relative(repoRoot, resolve(candidate));
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) throw new Error(message);
}

function assertInsideOutput(candidate) {
  const rel = relative(outputRoot, resolve(candidate));
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) {
    throw new Error(`Output escapes output/social-launch-kit: ${candidate}`);
  }
}

function assertInsideOutputParent(candidate) {
  const outputParent = dirname(outputRoot);
  const rel = relative(outputParent, resolve(candidate));
  if (!rel || rel.startsWith("..") || rel.includes(`..${sep}`)) {
    throw new Error(`Social-kit staging path escapes the output directory: ${candidate}`);
  }
}

function assertNoSymlinkComponents(candidate) {
  const rel = relative(repoRoot, resolve(candidate));
  if (rel.startsWith("..")) throw new Error(`Path escapes repository: ${candidate}`);
  let current = repoRoot;
  for (const part of rel.split(sep).filter(Boolean)) {
    current = join(current, part);
    if (!existsSync(current)) break;
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Symbolic link path is forbidden: ${current}`);
  }
}

function findOnPath(executable) {
  const locator = process.platform === "win32" ? "where.exe" : "which";
  const paths = execFileSync(locator, [executable], {encoding: "utf8"})
    .split(/\r?\n/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!paths[0] || /^(?:https?|ftp|data):/iu.test(paths[0])) {
    throw new Error(`${executable} must be available as a local system executable.`);
  }
  return paths[0];
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function git(args) {
  return execFileSync("git", args, {cwd: repoRoot, encoding: "utf8"});
}
