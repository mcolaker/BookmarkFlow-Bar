import {execFileSync} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const workspaceRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const packageJson = JSON.parse(readFileSync(join(workspaceRoot, "package.json"), "utf8"));

const expectedDependencies = {
  "@remotion/cli": "4.0.506",
  react: "19.2.8",
  "react-dom": "19.2.8",
  remotion: "4.0.506",
};

if (JSON.stringify(packageJson.dependencies) !== JSON.stringify(expectedDependencies)) {
  throw new Error("Promo dependencies must remain exact, reviewed versions");
}

const rootSource = readFileSync(join(workspaceRoot, "src", "Root.tsx"), "utf8");
const videoSource = readFileSync(join(workspaceRoot, "src", "video.tsx"), "utf8");
const expectedCompositions = [
  ["BookmarkFlowMaster", 58, 1920, 1080],
  ["BookmarkFlowX", 32, 1920, 1080],
  ["BookmarkFlowTeaser", 15, 1080, 1350],
  ["BookmarkFlowPoster", 1 / 30, 1920, 1080],
];

for (const [id, seconds, width, height] of expectedCompositions) {
  if (!rootSource.includes(`id="${id}"`)) throw new Error(`Missing composition: ${id}`);
  if (!rootSource.includes(`width={${width}}`) || !rootSource.includes(`height={${height}}`)) {
    throw new Error(`${id}: reviewed dimensions are missing`);
  }
  if (seconds >= 1 && !rootSource.includes(`durationInFrames={${seconds} * FPS}`)) {
    throw new Error(`${id}: reviewed duration is missing`);
  }
}

for (const unsafePattern of [
  /https?:\/\//iu,
  /[A-Za-z]:[\\/]Users[\\/]/u,
  /chrome[\\/]User Data/iu,
  /search-palette\.gif/iu,
  /context-actions\.gif/iu,
]) {
  if (unsafePattern.test(videoSource)) {
    throw new Error(`Promo source contains a blocked runtime asset or local-profile reference: ${unsafePattern}`);
  }
}

for (const captionName of ["bookmarkflow-master.en.srt", "bookmarkflow-x.en.srt"]) {
  const captionPath = join(workspaceRoot, "captions", captionName);
  if (!existsSync(captionPath)) throw new Error(`Missing captions: ${captionName}`);
  assertSrt(readFileSync(captionPath, "utf8"), captionName);
}

for (const ignoredPath of [
  "media/promo-video/node_modules/probe",
  "media/promo-video/.remotion/probe",
  "media/promo-video/public/generated/probe",
  "media/promo-video/public/captures/probe",
  "media/promo-video/output/probe",
]) {
  execFileSync("git", ["check-ignore", "--quiet", ignoredPath], {cwd: repoRoot});
}

const attributes = readFileSync(join(repoRoot, ".gitattributes"), "utf8");
if (!/^\/media export-ignore$/mu.test(attributes)) {
  throw new Error(".gitattributes must exclude the dev-only media workspace from extension archives");
}

console.log("Validated deterministic promo compositions, exact dependencies, captions, and repository isolation.");

function assertSrt(source, label) {
  const blocks = source.trim().split(/\r?\n\r?\n/u);
  let previousEnd = -1;
  blocks.forEach((block, index) => {
    const lines = block.split(/\r?\n/u);
    if (Number(lines[0]) !== index + 1 || !lines[1]) {
      throw new Error(`${label}: cue ${index + 1} is malformed`);
    }
    const match = lines[1].match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})$/u);
    if (!match) throw new Error(`${label}: cue ${index + 1} has an invalid timestamp`);
    const start = toMilliseconds(match.slice(1, 5));
    const end = toMilliseconds(match.slice(5, 9));
    if (start < previousEnd || end <= start) throw new Error(`${label}: cue ${index + 1} overlaps or has zero duration`);
    if (!lines.slice(2).join(" ").trim()) throw new Error(`${label}: cue ${index + 1} is empty`);
    previousEnd = end;
  });
}

function toMilliseconds(parts) {
  const [hours, minutes, seconds, milliseconds] = parts.map(Number);
  return (((hours * 60 + minutes) * 60 + seconds) * 1000) + milliseconds;
}
