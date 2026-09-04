import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = fileURLToPath(new URL("../", import.meta.url));

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

export function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const requiredPackageFiles = ["manifest.json", "LICENSE.md", "NOTICE", "TRADEMARKS.md"];
const allowedPackagePrefixes = ["_locales/", "icons/", "src/"];

export function transformManifestForFirefox(baseManifest) {
  if (!baseManifest || typeof baseManifest !== "object") {
    throw new Error("Invalid base manifest: must be an object");
  }

  const manifest = JSON.parse(JSON.stringify(baseManifest));

  manifest.browser_specific_settings = {
    gecko: {
      id: "bookmarkflow-bar@maprins",
      strict_min_version: "109.0",
    },
  };

  if (Array.isArray(manifest.permissions)) {
    manifest.permissions = manifest.permissions.filter((perm) => perm !== "favicon");
  }

  if (manifest.background && manifest.background.service_worker) {
    manifest.background = {
      scripts: [manifest.background.service_worker],
    };
  }

  return manifest;
}

export function transformManifestForEdge(baseManifest) {
  if (!baseManifest || typeof baseManifest !== "object") {
    throw new Error("Invalid base manifest: must be an object");
  }

  const manifest = JSON.parse(JSON.stringify(baseManifest));
  return manifest;
}

export function buildDeterministicZip(entries) {
  const sortedNames = Object.keys(entries).sort();
  const localHeadersAndData = [];
  const centralDirectoryHeaders = [];
  let currentOffset = 0;

  // Fixed DOS timestamp: 2026-01-01 00:00:00 (deterministic builds)
  const dosTime = 0;
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

  for (const name of sortedNames) {
    const content = entries[name];
    const dataBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const nameBuf = Buffer.from(name.replaceAll("\\", "/"), "utf8");

    const uncompressedSize = dataBuf.length;
    const crc = crc32(dataBuf);
    const compressedData = zlib.deflateRawSync(dataBuf, { level: 9 });
    const compressedSize = compressedData.length;

    // Local file header (30 bytes)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4);          // Version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6);       // General purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(8, 8);            // Compression method: Deflate
    localHeader.writeUInt16LE(dosTime, 10);     // Last mod file time
    localHeader.writeUInt16LE(dosDate, 12);     // Last mod file date
    localHeader.writeUInt32LE(crc, 14);         // CRC-32
    localHeader.writeUInt32LE(compressedSize, 18);   // Compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);   // File name length
    localHeader.writeUInt16LE(0, 28);                // Extra field length

    localHeadersAndData.push(localHeader, nameBuf, compressedData);

    // Central directory header (46 bytes)
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0);      // Central directory signature
    cdHeader.writeUInt16LE(20, 4);              // Version made by (2.0)
    cdHeader.writeUInt16LE(20, 6);              // Version needed to extract (2.0)
    cdHeader.writeUInt16LE(0x0800, 8);          // General purpose bit flag (UTF-8)
    cdHeader.writeUInt16LE(8, 10);              // Compression method: Deflate
    cdHeader.writeUInt16LE(dosTime, 12);        // Last mod file time
    cdHeader.writeUInt16LE(dosDate, 14);        // Last mod file date
    cdHeader.writeUInt32LE(crc, 16);            // CRC-32
    cdHeader.writeUInt32LE(compressedSize, 20); // Compressed size
    cdHeader.writeUInt32LE(uncompressedSize, 24); // Uncompressed size
    cdHeader.writeUInt16LE(nameBuf.length, 28); // File name length
    cdHeader.writeUInt16LE(0, 30);              // Extra field length
    cdHeader.writeUInt16LE(0, 32);              // File comment length
    cdHeader.writeUInt16LE(0, 34);              // Disk number start
    cdHeader.writeUInt16LE(0, 36);              // Internal file attributes
    cdHeader.writeUInt32LE(0, 38);              // External file attributes
    cdHeader.writeUInt32LE(currentOffset, 42);  // Relative offset of local header

    centralDirectoryHeaders.push(cdHeader, nameBuf);

    currentOffset += 30 + nameBuf.length + compressedSize;
  }

  const centralDirectory = Buffer.concat(centralDirectoryHeaders);
  const cdSize = centralDirectory.length;
  const entryCount = sortedNames.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // EOCD signature
  eocd.writeUInt16LE(0, 4);                // Number of this disk
  eocd.writeUInt16LE(0, 6);                // Disk where CD starts
  eocd.writeUInt16LE(entryCount, 8);       // Entries on this disk
  eocd.writeUInt16LE(entryCount, 10);      // Total entries
  eocd.writeUInt32LE(cdSize, 12);          // Central directory size
  eocd.writeUInt32LE(currentOffset, 16);   // Offset of start of CD
  eocd.writeUInt16LE(0, 20);               // Comment length

  return Buffer.concat([...localHeadersAndData, centralDirectory, eocd]);
}

export function parseZipFileNames(zipBuffer) {
  const names = [];
  let eocdOffset = -1;

  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid zip file: EOCD signature not found");
  }

  const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10);
  const cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  let cursor = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (zipBuffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Corrupt zip central directory at offset ${cursor}`);
    }
    const nameLen = zipBuffer.readUInt16LE(cursor + 28);
    const extraLen = zipBuffer.readUInt16LE(cursor + 30);
    const commentLen = zipBuffer.readUInt16LE(cursor + 32);

    const name = zipBuffer.toString("utf8", cursor + 46, cursor + 46 + nameLen);
    names.push(name);

    cursor += 46 + nameLen + extraLen + commentLen;
  }

  return names;
}

export function assertPackageFilesContract(fileNames) {
  const nameSet = new Set(fileNames);
  for (const required of requiredPackageFiles) {
    if (!nameSet.has(required)) {
      throw new Error(`Package is missing required file: ${required}`);
    }
  }

  const unexpectedFiles = fileNames.filter((name) => (
    !requiredPackageFiles.includes(name)
    && !allowedPackagePrefixes.some((prefix) => name.startsWith(prefix))
  ));

  if (unexpectedFiles.length > 0) {
    throw new Error(`Package contains unapproved files: ${unexpectedFiles.sort().join(", ")}`);
  }
}

export function collectWorkspaceFiles(workspaceRoot = root) {
  const files = {};

  for (const legalFile of ["LICENSE.md", "NOTICE", "TRADEMARKS.md"]) {
    const fullPath = join(workspaceRoot, legalFile);
    if (!existsSync(fullPath)) {
      throw new Error(`Required file missing from workspace: ${legalFile}`);
    }
    files[legalFile] = readFileSync(fullPath);
  }

  function addDirRecursive(dirRel) {
    const dirAbs = join(workspaceRoot, dirRel);
    if (!existsSync(dirAbs)) return;
    const entries = readdirSync(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
      const entryRel = join(dirRel, entry.name).replaceAll("\\", "/");
      const entryAbs = join(dirAbs, entry.name);
      if (entry.isDirectory()) {
        addDirRecursive(entryRel);
      } else if (entry.isFile()) {
        files[entryRel] = readFileSync(entryAbs);
      }
    }
  }

  addDirRecursive("_locales");
  addDirRecursive("icons");
  addDirRecursive("src");

  return files;
}

export function packageFirefox(options = {}) {
  const workspaceRoot = options.workspaceRoot || root;
  const distDir = options.distDir || join(workspaceRoot, "dist");
  const dryRun = Boolean(options.dryRun);

  const manifestPath = join(workspaceRoot, "manifest.json");
  const baseManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const version = options.version || baseManifest.version;

  const firefoxManifest = transformManifestForFirefox(baseManifest);
  const files = collectWorkspaceFiles(workspaceRoot);
  files["manifest.json"] = Buffer.from(JSON.stringify(firefoxManifest, null, 2) + "\n", "utf8");

  assertPackageFilesContract(Object.keys(files));

  const zipBuffer = buildDeterministicZip(files);
  const parsedNames = parseZipFileNames(zipBuffer);
  assertPackageFilesContract(parsedNames);

  const digest = createHash("sha256").update(zipBuffer).digest("hex");
  const archiveName = `bookmarkflow-bar-${version}-firefox.zip`;
  const archivePath = join(distDir, archiveName);
  const checksumPath = join(distDir, `${archiveName}.sha256`);

  if (!dryRun) {
    mkdirSync(distDir, { recursive: true });
    writeFileSync(archivePath, zipBuffer);
    writeFileSync(checksumPath, `${digest}  ${archiveName}\n`, "utf8");
  }

  return {
    target: "firefox",
    version,
    archiveName,
    archivePath,
    digest,
    manifest: firefoxManifest,
    buffer: zipBuffer,
    filesCount: Object.keys(files).length,
  };
}

export function packageEdge(options = {}) {
  const workspaceRoot = options.workspaceRoot || root;
  const distDir = options.distDir || join(workspaceRoot, "dist");
  const dryRun = Boolean(options.dryRun);

  const manifestPath = join(workspaceRoot, "manifest.json");
  const baseManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const version = options.version || baseManifest.version;

  const edgeManifest = transformManifestForEdge(baseManifest);
  const files = collectWorkspaceFiles(workspaceRoot);
  files["manifest.json"] = Buffer.from(JSON.stringify(edgeManifest, null, 2) + "\n", "utf8");

  assertPackageFilesContract(Object.keys(files));

  const zipBuffer = buildDeterministicZip(files);
  const parsedNames = parseZipFileNames(zipBuffer);
  assertPackageFilesContract(parsedNames);

  const digest = createHash("sha256").update(zipBuffer).digest("hex");
  const archiveName = `bookmarkflow-bar-${version}-edge.zip`;
  const archivePath = join(distDir, archiveName);
  const checksumPath = join(distDir, `${archiveName}.sha256`);

  if (!dryRun) {
    mkdirSync(distDir, { recursive: true });
    writeFileSync(archivePath, zipBuffer);
    writeFileSync(checksumPath, `${digest}  ${archiveName}\n`, "utf8");
  }

  return {
    target: "edge",
    version,
    archiveName,
    archivePath,
    digest,
    manifest: edgeManifest,
    buffer: zipBuffer,
    filesCount: Object.keys(files).length,
  };
}

export function packageCrossBrowser(target = "all", options = {}) {
  const results = [];
  if (target === "all" || target === "firefox") {
    const fxResult = packageFirefox(options);
    results.push(fxResult);
    console.log(`[Firefox] Created ${fxResult.archiveName} (${fxResult.filesCount} files)`);
    console.log(`[Firefox] SHA-256: ${fxResult.digest}`);
  }
  if (target === "all" || target === "edge") {
    const edgeResult = packageEdge(options);
    results.push(edgeResult);
    console.log(`[Edge] Created ${edgeResult.archiveName} (${edgeResult.filesCount} files)`);
    console.log(`[Edge] SHA-256: ${edgeResult.digest}`);
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const target = process.argv[2] || "all";
  packageCrossBrowser(target);
}
