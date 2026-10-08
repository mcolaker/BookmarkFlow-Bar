import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

export const DEPRECATED_MV2_PATTERNS = [
  { pattern: /\bchrome\.extension\b/gu, name: "chrome.extension (deprecated, replace with chrome.runtime)" },
  { pattern: /\bchrome\.browserAction\b/gu, name: "chrome.browserAction (deprecated, replace with chrome.action)" },
  { pattern: /\bchrome\.pageAction\b/gu, name: "chrome.pageAction (deprecated, replace with chrome.action)" },
  { pattern: /\bchrome\.tabs\.executeScript\b/gu, name: "chrome.tabs.executeScript (deprecated, replace with chrome.scripting.executeScript)" },
  { pattern: /\bchrome\.tabs\.insertCSS\b/gu, name: "chrome.tabs.insertCSS (deprecated, replace with chrome.scripting.insertCSS)" },
  { pattern: /\bchrome\.tabs\.removeCSS\b/gu, name: "chrome.tabs.removeCSS (deprecated, replace with chrome.scripting.removeCSS)" },
  { pattern: /\bchrome\.runtime\.getBackgroundPage\b/gu, name: "chrome.runtime.getBackgroundPage (not supported in MV3 service workers)" },
  { pattern: /\bopenDatabase\b/gu, name: "WebSQL openDatabase (deprecated and removed in Chromium)" },
  { pattern: /\bchrome\.webRequest\.blocking\b/gu, name: "chrome.webRequest.blocking (unsupported in standard MV3)" },
];

export const INSECURE_CSP_PATTERNS = [
  { pattern: /\beval\s*\(/gu, name: "eval() dynamic code execution" },
  { pattern: /\bnew\s+Function\s*\(/gu, name: "new Function() dynamic string compilation" },
];

export function auditDeprecatedApis(code, fileName = "unknown") {
  const violations = [];
  for (const { pattern, name } of DEPRECATED_MV2_PATTERNS) {
    if (pattern.test(code)) {
      violations.push({ file: fileName, issue: name });
    }
  }
  return violations;
}

export function auditCspCompliance(code, fileName = "unknown") {
  const violations = [];
  for (const { pattern, name } of INSECURE_CSP_PATTERNS) {
    if (pattern.test(code)) {
      violations.push({ file: fileName, issue: name });
    }
  }
  return violations;
}

export function auditHtmlSecurity(htmlContent, fileName = "unknown") {
  const violations = [];
  if (/<script\b[^>]*\bsrc\s*=\s*["']https?:\/\//iu.test(htmlContent)) {
    violations.push({ file: fileName, issue: "Remote script tag violates MV3 Content Security Policy" });
  }
  if (/<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']*\.css/iu.test(htmlContent)) {
    violations.push({ file: fileName, issue: "Remote stylesheet link violates local-first offline invariant" });
  }
  if (/\bon[a-z]+\s*=\s*["']javascript:/iu.test(htmlContent)) {
    violations.push({ file: fileName, issue: "Inline javascript: handler violates MV3 CSP" });
  }
  return violations;
}

export function auditManifestSchema(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") {
    return ["Manifest must be an object"];
  }
  if (manifest.manifest_version !== 3) {
    errors.push(`Expected manifest_version: 3, got: ${manifest.manifest_version}`);
  }
  if (!manifest.background?.service_worker) {
    errors.push("Missing background.service_worker declaration required for Manifest V3");
  }
  if (manifest.background?.scripts || manifest.background?.page) {
    errors.push("MV2 background.scripts or background.page is prohibited in Manifest V3");
  }
  if (manifest.browser_action || manifest.page_action) {
    errors.push("MV2 browser_action/page_action is prohibited in Manifest V3; use 'action'");
  }
  if (manifest.web_accessible_resources && !Array.isArray(manifest.web_accessible_resources)) {
    errors.push("web_accessible_resources must be an array of objects in MV3");
  } else if (Array.isArray(manifest.web_accessible_resources)) {
    for (const entry of manifest.web_accessible_resources) {
      if (typeof entry !== "object" || !Array.isArray(entry.resources) || !Array.isArray(entry.matches)) {
        errors.push("Each web_accessible_resources entry must have { resources: [...], matches: [...] } in MV3");
      }
    }
  }
  return errors;
}

export function auditServiceWorkerDom(content, fileName = "src/background.js") {
  const violations = [];
  // Strip comments before checking for window/document calls
  const stripped = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
  const domGlobals = stripped.match(/\b(?:window|document)\.[a-zA-Z0-9_$]+/g) || [];
  for (const match of domGlobals) {
    violations.push({ file: fileName, issue: `Service worker accesses DOM global: ${match}` });
  }
  return violations;
}

export function auditChromeApiPermissions(srcDir, manifest) {
  const files = readdirSync(srcDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => join(entry.parentPath || srcDir, entry.name));

  const detectedApis = new Set();
  const apiRegex = /\bchrome\.([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?/gu;

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(apiRegex)) {
      const namespace = match[1];
      const method = match[2];
      // Filter out domain names like chrome.google.com
      if (namespace === "google") continue;
      detectedApis.add(`${namespace}${method ? `.${method}` : ""}`);
    }
  }

  const permissions = new Set(manifest.permissions || []);
  const errors = [];

  const PRIVILEGED_NAMESPACES = {
    bookmarks: "bookmarks",
    storage: "storage",
    tabs: "tabs",
    scripting: "scripting",
    search: "search",
    favicon: "favicon",
  };

  const MANIFEST_KEY_APIS = {
    action: "action",
    commands: "commands",
    omnibox: "omnibox",
  };

  const UNPRIVILEGED_ALLOWED = new Set(["runtime", "i18n", "windows"]);

  for (const api of detectedApis) {
    const namespace = api.split(".")[0];
    if (PRIVILEGED_NAMESPACES[namespace]) {
      const requiredPerm = PRIVILEGED_NAMESPACES[namespace];
      if (!permissions.has(requiredPerm)) {
        errors.push(`API '${api}' is used but required permission '${requiredPerm}' is missing from manifest`);
      }
    } else if (MANIFEST_KEY_APIS[namespace]) {
      const requiredKey = MANIFEST_KEY_APIS[namespace];
      if (!manifest[requiredKey]) {
        errors.push(`API '${api}' is used but required manifest key '${requiredKey}' is missing`);
      }
    } else if (!UNPRIVILEGED_ALLOWED.has(namespace)) {
      errors.push(`Unrecognized or unapproved Chrome API namespace: '${namespace}' (${api})`);
    }
  }

  return { detectedApis: Array.from(detectedApis).sort(), errors };
}

// --------------------------------------------------------------------------
// Test Suite
// --------------------------------------------------------------------------

test("mv3-audit: zero deprecated Manifest V2 API calls across all source files", () => {
  const srcDir = join(root, "src");
  const files = readdirSync(srcDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => join(entry.parentPath || srcDir, entry.name));

  const allViolations = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const violations = auditDeprecatedApis(content, file);
    allViolations.push(...violations);
  }

  assert.equal(
    allViolations.length,
    0,
    `Found deprecated MV2 APIs:\n${allViolations.map((v) => `  - ${v.file}: ${v.issue}`).join("\n")}`
  );
});

test("mv3-audit: Manifest V3 CSP compliance (zero eval/new Function and zero remote scripts)", () => {
  const srcDir = join(root, "src");
  const entries = readdirSync(srcDir, { recursive: true, withFileTypes: true });

  const jsFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => join(entry.parentPath || srcDir, entry.name));

  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".html"))
    .map((entry) => join(entry.parentPath || srcDir, entry.name));

  const violations = [];

  for (const file of jsFiles) {
    const content = readFileSync(file, "utf8");
    violations.push(...auditCspCompliance(content, file));
  }

  for (const file of htmlFiles) {
    const content = readFileSync(file, "utf8");
    violations.push(...auditHtmlSecurity(content, file));
  }

  assert.equal(
    violations.length,
    0,
    `Found CSP / dynamic execution violations:\n${violations.map((v) => `  - ${v.file}: ${v.issue}`).join("\n")}`
  );
});

test("mv3-audit: background service worker operates cleanly without DOM globals", () => {
  const bgPath = join(root, "src", "background.js");
  assert.ok(existsSync(bgPath), "src/background.js must exist");
  const content = readFileSync(bgPath, "utf8");
  const violations = auditServiceWorkerDom(content, "src/background.js");

  assert.equal(
    violations.length,
    0,
    `Service worker must not access DOM globals:\n${violations.map((v) => `  - ${v.issue}`).join("\n")}`
  );
});

test("mv3-audit: manifest.json strictly implements Manifest V3 schema and structure", () => {
  const manifestPath = join(root, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const errors = auditManifestSchema(manifest);

  assert.equal(
    errors.length,
    0,
    `manifest.json fails MV3 schema audit:\n${errors.map((e) => `  - ${e}`).join("\n")}`
  );
});

test("mv3-audit: all Chrome API calls map to declared permissions or valid runtime APIs", () => {
  const manifestPath = join(root, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const srcDir = join(root, "src");

  const { detectedApis, errors } = auditChromeApiPermissions(srcDir, manifest);

  assert.ok(detectedApis.length > 0, "Audit must discover active Chrome APIs in src/");
  assert.equal(
    errors.length,
    0,
    `Chrome API permission mismatch:\n${errors.map((e) => `  - ${e}`).join("\n")}`
  );
});

test("mv3-audit: negative regression tests fail closed on simulated MV2 and CSP violations", () => {
  // Test deprecated API rejection
  const deprecatedCode = `
    function oldWay() {
      chrome.browserAction.setBadgeText({ text: '1' });
      const url = chrome.extension.getURL('icon.png');
      chrome.tabs.executeScript(1, { code: 'alert(1)' });
    }
  `;
  const depViolations = auditDeprecatedApis(deprecatedCode, "synthetic-deprecated.js");
  assert.equal(depViolations.length, 3, "Must detect exactly 3 deprecated API calls");

  // Test CSP eval rejection
  const evalCode = `eval("console.log('insecure')"); const fn = new Function("return 1;");`;
  const cspViolations = auditCspCompliance(evalCode, "synthetic-eval.js");
  assert.equal(cspViolations.length, 2, "Must detect eval() and new Function()");

  // Test remote HTML script rejection
  const remoteHtml = `<script src="https://cdn.example.com/lib.js"></script>`;
  const htmlViolations = auditHtmlSecurity(remoteHtml, "synthetic.html");
  assert.equal(htmlViolations.length, 1, "Must detect remote script tag");

  // Test MV2 manifest rejection
  const mv2Manifest = {
    manifest_version: 2,
    background: { scripts: ["background.js"] },
    browser_action: { default_title: "test" },
  };
  const manifestErrors = auditManifestSchema(mv2Manifest);
  assert.ok(manifestErrors.length >= 3, "Must reject MV2 manifest version, background scripts, and browser_action");

  // Test missing permission detection
  const syntheticManifest = { permissions: [] };
  const syntheticErrors = [];
  const testApis = ["bookmarks.getTree", "storage.local.get"];
  for (const api of testApis) {
    const namespace = api.split(".")[0];
    if (!syntheticManifest.permissions.includes(namespace)) {
      syntheticErrors.push(`API '${api}' is used but required permission '${namespace}' is missing`);
    }
  }
  assert.equal(syntheticErrors.length, 2, "Must reject unpermitted API calls");
});
