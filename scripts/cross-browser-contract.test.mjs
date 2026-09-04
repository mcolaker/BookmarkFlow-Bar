import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertPackageFilesContract,
  buildDeterministicZip,
  crc32,
  packageCrossBrowser,
  packageEdge,
  packageFirefox,
  parseZipFileNames,
  transformManifestForEdge,
  transformManifestForFirefox,
} from "./package-cross-browser.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseManifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8"));

test("crc32 matches standard test vectors", () => {
  assert.equal(crc32(Buffer.from("123456789", "utf8")).toString(16), "cbf43926");
  assert.equal(crc32(Buffer.alloc(0)).toString(16), "0");
});

test("transformManifestForFirefox adds gecko id and transforms background to scripts", () => {
  const fxManifest = transformManifestForFirefox(baseManifest);

  assert.equal(fxManifest.manifest_version, 3);
  assert.equal(fxManifest.name, baseManifest.name);
  assert.equal(fxManifest.version, baseManifest.version);
  assert.deepEqual(fxManifest.browser_specific_settings, {
    gecko: {
      id: "bookmarkflow-bar@maprins",
      strict_min_version: "109.0",
    },
  });

  assert.equal(fxManifest.background.service_worker, undefined);
  assert.deepEqual(fxManifest.background.scripts, ["src/background.js"]);

  assert.equal(fxManifest.permissions.includes("favicon"), false);
  assert.equal(fxManifest.permissions.includes("bookmarks"), true);
  assert.equal(fxManifest.permissions.includes("storage"), true);
  assert.equal(fxManifest.permissions.includes("search"), true);
});

test("transformManifestForFirefox fails closed on non-object input", () => {
  assert.throws(() => transformManifestForFirefox(null), /must be an object/u);
  assert.throws(() => transformManifestForFirefox("string"), /must be an object/u);
});

test("transformManifestForEdge preserves standard Chromium MV3 compatibility", () => {
  const edgeManifest = transformManifestForEdge(baseManifest);

  assert.equal(edgeManifest.manifest_version, 3);
  assert.equal(edgeManifest.name, baseManifest.name);
  assert.equal(edgeManifest.version, baseManifest.version);
  assert.equal(edgeManifest.background.service_worker, "src/background.js");
  assert.deepEqual(edgeManifest.permissions, baseManifest.permissions);
});

test("transformManifestForEdge fails closed on non-object input", () => {
  assert.throws(() => transformManifestForEdge(null), /must be an object/u);
  assert.throws(() => transformManifestForEdge(123), /must be an object/u);
});

test("buildDeterministicZip produces identical bytes for identical inputs", () => {
  const files = {
    "manifest.json": JSON.stringify({ name: "test", version: "1.0.0" }),
    "src/test.js": "console.log('hello');",
    "LICENSE.md": "Apache-2.0",
  };

  const zip1 = buildDeterministicZip(files);
  const zip2 = buildDeterministicZip(files);

  assert.equal(zip1.compare(zip2), 0, "Deterministic zip output must be bit-identical");

  const names = parseZipFileNames(zip1);
  assert.deepEqual(names, ["LICENSE.md", "manifest.json", "src/test.js"]);
});

test("parseZipFileNames fails closed on corrupted buffer", () => {
  assert.throws(() => parseZipFileNames(Buffer.from("not-a-zip")), /Invalid zip file/u);
});

test("assertPackageFilesContract enforces required files and rejects maintenance paths", () => {
  const validFiles = [
    "manifest.json",
    "LICENSE.md",
    "NOTICE",
    "TRADEMARKS.md",
    "_locales/en/messages.json",
    "_locales/tr/messages.json",
    "icons/icon128.png",
    "src/content.js",
  ];

  assert.doesNotThrow(() => assertPackageFilesContract(validFiles));

  // Missing legal file
  assert.throws(
    () => assertPackageFilesContract(validFiles.filter((f) => f !== "LICENSE.md")),
    /missing required file: LICENSE\.md/u,
  );

  // Unapproved maintenance files
  assert.throws(
    () => assertPackageFilesContract([...validFiles, "package.json"]),
    /contains unapproved files: package\.json/u,
  );
  assert.throws(
    () => assertPackageFilesContract([...validFiles, "README.md"]),
    /contains unapproved files: README\.md/u,
  );
  assert.throws(
    () => assertPackageFilesContract([...validFiles, ".github/workflows/validate.yml"]),
    /contains unapproved files: \.github\/workflows\/validate\.yml/u,
  );
});

test("packageFirefox in dry-run mode packages valid files and digest", () => {
  const result = packageFirefox({ dryRun: true });

  assert.equal(result.target, "firefox");
  assert.equal(result.version, baseManifest.version);
  assert.equal(result.archiveName, `bookmarkflow-bar-${baseManifest.version}-firefox.zip`);
  assert.match(result.digest, /^[a-f0-9]{64}$/);
  assert.ok(result.filesCount >= 20, "Should include all runtime, icon, locale, and legal files");

  const entryNames = parseZipFileNames(result.buffer);
  assertPackageFilesContract(entryNames);
  assert.equal(entryNames.includes("manifest.json"), true);
  assert.equal(entryNames.includes("src/content.js"), true);
  assert.equal(entryNames.includes("package.json"), false);
});

test("packageEdge in dry-run mode packages valid files and digest", () => {
  const result = packageEdge({ dryRun: true });

  assert.equal(result.target, "edge");
  assert.equal(result.version, baseManifest.version);
  assert.equal(result.archiveName, `bookmarkflow-bar-${baseManifest.version}-edge.zip`);
  assert.match(result.digest, /^[a-f0-9]{64}$/);
  assert.ok(result.filesCount >= 20, "Should include all runtime, icon, locale, and legal files");

  const entryNames = parseZipFileNames(result.buffer);
  assertPackageFilesContract(entryNames);
  assert.equal(entryNames.includes("manifest.json"), true);
  assert.equal(entryNames.includes("src/content.js"), true);
  assert.equal(entryNames.includes("README.md"), false);
});

test("packageCrossBrowser handles all targets in dry-run mode", () => {
  const results = packageCrossBrowser("all", { dryRun: true });
  assert.equal(results.length, 2);
  assert.equal(results[0].target, "firefox");
  assert.equal(results[1].target, "edge");
});
