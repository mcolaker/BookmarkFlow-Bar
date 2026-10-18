#!/usr/bin/env node
/**
 * scripts/check-architecture-guard.mjs
 *
 * BookmarkFlow Bar Architecture Guard (AGENTS.md §3, BF-GOV-028)
 * Inspired by JaponiGo check_architecture_guard.py (Decision #87 & #95).
 *
 * Checks staged changes (or commit range via --range BASE..HEAD) for:
 *   1. Newly added empty silent catch blocks (`catch {}` or `catch (e) {}`) in `src/`,
 *   2. Newly added remote HTTP/CDN runtime dependencies or forbidden MV2 APIs in `src/`,
 *   3. Growth of `src/` JavaScript files already exceeding the line ceiling (default: 1,500 lines),
 *      guiding extraction into modular helpers (`src/utils/` or dedicated modules).
 *
 * Default exit code is 0 (warnings) unless `--strict` is passed or a critical rule (`remote-runtime-import`) fails.
 */

import { execFileSync } from "node:child_process";

export const DEFAULT_MAX_LINES = 1500;

const SILENT_CATCH_REGEX = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/u;
const FORBIDDEN_MV2_OR_REMOTE_REGEX = /\b(?:chrome\.(?:extension|browserAction|pageAction)\.|chrome\.runtime\.getBackgroundPage|import\s+.*from\s+["']https?:\/\/)/u;

/**
 * Determines whether a relative file path is an extension runtime JS file under `src/`.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isRuntimeSrcJs(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  return normalized.startsWith("src/") && normalized.endsWith(".js");
}

/**
 * Parses unified git diff (`-U0`) output into `{ [filePath]: string[] }` of added lines.
 * @param {string} diffText
 * @returns {Record<string, string[]>}
 */
export function parseAddedLines(diffText) {
  const result = {};
  let current = null;

  for (const line of String(diffText || "").split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim();
      current = target.startsWith("b/") ? target.slice(2) : null;
      if (current !== null && !result[current]) {
        result[current] = [];
      }
    } else if (current && line.startsWith("+") && !line.startsWith("+++")) {
      result[current].push(line.slice(1));
    }
  }
  return result;
}

/**
 * Pure evaluation of architecture guard rules over diff telemetry.
 * @param {{
 *   addedFiles?: string[],
 *   numstat?: Record<string, { added: number, removed: number }>,
 *   addedLines?: Record<string, string[]>,
 *   lineCounts?: Record<string, number>,
 *   maxLines?: number
 * }} input
 */
export function evaluateArchitectureGuard({
  addedFiles = [],
  numstat = {},
  addedLines = {},
  lineCounts = {},
  maxLines = DEFAULT_MAX_LINES,
} = {}) {
  const warnings = [];
  const errors = [];

  for (const filePath of Object.keys(addedLines).sort()) {
    if (!isRuntimeSrcJs(filePath)) continue;
    const lines = addedLines[filePath] || [];

    for (const line of lines) {
      if (SILENT_CATCH_REGEX.test(line)) {
        warnings.push({
          rule: "silent-catch-block",
          path: filePath,
          detail: "newly added empty `catch {}` block; log or handle the error or add an explicit fallback comment",
        });
        break;
      }
    }

    for (const line of lines) {
      if (FORBIDDEN_MV2_OR_REMOTE_REGEX.test(line)) {
        errors.push({
          rule: "forbidden-runtime-api",
          path: filePath,
          detail: "adds forbidden MV2 synchronous API or remote HTTP import in runtime `src/` (violates P0-1 / P0-24)",
        });
        break;
      }
    }
  }

  for (const filePath of Object.keys(numstat).sort()) {
    if (!isRuntimeSrcJs(filePath)) continue;
    const { added = 0, removed = 0 } = numstat[filePath] || {};
    const total = lineCounts[filePath] ?? 0;

    if (total > maxLines && added > removed) {
      warnings.push({
        rule: "large-file-growth",
        path: filePath,
        detail: `${total} lines (> ${maxLines}) and grew by +${added - removed} net lines; consider extracting a modular helper`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    warningCount: warnings.length,
    errorCount: errors.length,
    warnings,
    errors,
    addedFilesCount: addedFiles.length,
  };
}

function runGit(args) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
}

function getDiffArgs(rangeSpec) {
  if (rangeSpec) {
    const [base, head] = rangeSpec.split("..");
    return [base, head || "HEAD"];
  }
  return ["--cached"];
}

export function collectGitDiffTelemetry(rangeSpec = null) {
  const diffArgs = getDiffArgs(rangeSpec);

  const addedOut = runGit(["diff", ...diffArgs, "--name-only", "--diff-filter=A"]);
  const addedFiles = addedOut
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const numstatOut = runGit(["diff", ...diffArgs, "--numstat", "--no-renames", "--", "src"]);
  const numstat = {};
  for (const line of numstatOut.split(/\r?\n/)) {
    const parts = line.split("\t");
    if (parts.length === 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      numstat[parts[2].replace(/\\/g, "/")] = {
        added: Number(parts[0]),
        removed: Number(parts[1]),
      };
    }
  }

  const unifiedOut = runGit(["diff", ...diffArgs, "-U0", "--no-renames", "--", "src"]);
  const addedLines = parseAddedLines(unifiedOut);

  const lineCounts = {};
  const headRef = rangeSpec ? rangeSpec.split("..")[1] || "HEAD" : "";
  for (const filePath of Object.keys(numstat)) {
    if (!isRuntimeSrcJs(filePath)) continue;
    const spec = headRef ? `${headRef}:${filePath}` : `:${filePath}`;
    const fileContent = runGit(["show", spec]);
    lineCounts[filePath] = fileContent ? fileContent.split(/\r?\n/).length : 0;
  }

  return { addedFiles, numstat, addedLines, lineCounts };
}

// CLI execution
if (process.argv[1] && process.argv[1].endsWith("check-architecture-guard.mjs")) {
  const args = process.argv.slice(2);
  const rangeIdx = args.indexOf("--range");
  const rangeSpec = rangeIdx !== -1 && args[rangeIdx + 1] ? args[rangeIdx + 1] : null;
  const maxIdx = args.indexOf("--max-lines");
  const maxLines = maxIdx !== -1 && args[maxIdx + 1] ? Number(args[maxIdx + 1]) : DEFAULT_MAX_LINES;
  const strict = args.includes("--strict");

  const telemetry = collectGitDiffTelemetry(rangeSpec);
  const result = evaluateArchitectureGuard({ ...telemetry, maxLines });

  if (result.errorCount === 0 && result.warningCount === 0) {
    console.log("BookmarkFlow architecture guard: 0 warnings, 0 errors.");
    process.exit(0);
  }

  for (const err of result.errors) {
    console.error(`  [ERROR:${err.rule}] ${err.path}: ${err.detail}`);
  }
  for (const warn of result.warnings) {
    console.warn(`  [WARN:${warn.rule}] ${warn.path}: ${warn.detail}`);
  }

  if (result.errorCount > 0 || (strict && result.warningCount > 0)) {
    process.exit(1);
  }
  process.exit(0);
}
