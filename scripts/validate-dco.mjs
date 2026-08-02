import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fullCommitShaPattern = /^[0-9a-f]{40}$/iu;
const signoffPattern = /^Signed-off-by:\s+[^<>\r\n]+?\s+<[^<>\s@]+@[^<>\s@]+>\s*$/u;
const trailerPattern = /^[A-Za-z0-9-]+:\s+\S.*$/u;

export function createDcoRevisionRange(baseSha, headSha) {
  if (!fullCommitShaPattern.test(baseSha ?? "")) throw new Error("DCO base SHA must be a full 40-character Git commit SHA.");
  if (!fullCommitShaPattern.test(headSha ?? "")) throw new Error("DCO head SHA must be a full 40-character Git commit SHA.");
  if (baseSha.toLowerCase() === headSha.toLowerCase()) throw new Error("DCO base and head SHAs must identify different commits.");
  return `${baseSha}..${headSha}`;
}

export function hasValidDcoSignoff(message) {
  const lines = message.replace(/\r\n?/gu, "\n").split("\n");
  while (lines.length && !lines.at(-1).trim()) lines.pop();
  if (lines.length < 3) return false;

  let paragraphStart = lines.length - 1;
  while (paragraphStart > 0 && lines[paragraphStart - 1].trim()) paragraphStart -= 1;
  if (paragraphStart === 0 || lines[paragraphStart - 1].trim()) return false;

  const trailerLines = lines.slice(paragraphStart);
  if (!trailerLines.every((line) => trailerPattern.test(line) || /^\s+\S/u.test(line))) return false;
  return trailerLines.some((line) => signoffPattern.test(line));
}

export function validateDcoCommits(commits) {
  const errors = [];
  if (!commits.length) return ["DCO revision range contains no commits; base/head inputs may be incorrect."];

  for (const commit of commits) {
    if (!fullCommitShaPattern.test(commit.sha ?? "")) {
      errors.push(`Invalid commit SHA returned for DCO validation: ${commit.sha ?? "<missing>"}.`);
      continue;
    }
    if (!hasValidDcoSignoff(commit.message ?? "")) {
      errors.push(`${commit.sha}: missing a valid Signed-off-by: Name <email> trailer in the final commit-message trailer block.`);
    }
  }
  return errors;
}

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trimEnd();
}

export function collectDcoRangeCommits(baseSha, headSha, git = runGit) {
  const range = createDcoRevisionRange(baseSha, headSha);
  git(["cat-file", "-e", `${baseSha}^{commit}`]);
  git(["cat-file", "-e", `${headSha}^{commit}`]);

  const revisionOutput = git(["rev-list", "--reverse", range]);
  const commitShas = revisionOutput ? revisionOutput.split(/\r?\n/u).filter(Boolean) : [];
  return commitShas.map((sha) => ({
    sha,
    message: git(["show", "-s", "--format=%B", sha]),
  }));
}

export function validateDcoRange(baseSha, headSha, git = runGit) {
  return validateDcoCommits(collectDcoRangeCommits(baseSha, headSha, git));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const baseSha = process.env.DCO_BASE_SHA ?? process.argv[2];
  const headSha = process.env.DCO_HEAD_SHA ?? process.argv[3];

  try {
    const errors = validateDcoRange(baseSha, headSha);
    if (errors.length) {
      for (const error of errors) console.error(`ERROR: ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`DCO sign-offs are valid for ${createDcoRevisionRange(baseSha, headSha)}.`);
    }
  } catch (error) {
    console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
