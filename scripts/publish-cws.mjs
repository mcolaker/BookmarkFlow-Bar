import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { ensureAutoAllowDaemon, triggerFastUiaAutoConfirm } from "./live-chrome-pilot.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

export const CWS_PUBLISHER_ID = "91a2622b-7094-42c1-9605-adfb34bcd8d2";
export const CWS_ITEM_ID = "iaikobkolclhhpcogacjkenijlfaibpf";
export const CWS_DASHBOARD_URL = `https://chrome.google.com/webstore/devconsole/${CWS_PUBLISHER_ID}`;
export const CWS_EDIT_URL = `${CWS_DASHBOARD_URL}/${CWS_ITEM_ID}/edit`;
export const CWS_PACKAGE_URL = `${CWS_EDIT_URL}/package`;

export function getManifestVersion(manifestPath = path.join(root, "manifest.json")) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!manifest.version || typeof manifest.version !== "string") {
    throw new Error(`Invalid version in manifest: ${manifestPath}`);
  }
  return manifest.version.trim();
}

export function parseCwsArgs(args = []) {
  const options = {
    version: null,
    zipPath: null,
    checkOnly: false,
    dryRun: false,
    skipSubmit: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--check-only") {
      options.checkOnly = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--skip-submit") {
      options.skipSubmit = true;
    } else if (arg === "--version" && i + 1 < args.length) {
      options.version = args[++i].replace(/^v/u, "");
    } else if (arg === "--zip" && i + 1 < args.length) {
      options.zipPath = args[++i];
    } else if (/^v?\d+\.\d+\.\d+$/u.test(arg)) {
      options.version = arg.replace(/^v/u, "");
    }
  }

  return options;
}

export function assertReleaseZipExists(version, customZipPath = null, distDir = path.join(root, "dist")) {
  const cleanVersion = String(version || "").replace(/^v/u, "").trim();
  if (!/^\d+\.\d+\.\d+$/u.test(cleanVersion)) {
    throw new Error(`Invalid semantic version for CWS package: "${version}"`);
  }

  const zipPath = customZipPath
    ? path.resolve(customZipPath)
    : path.join(distDir, `bookmarkflow-bar-${cleanVersion}.zip`);

  if (!fs.existsSync(zipPath)) {
    throw new Error(
      `CWS release ZIP archive does not exist: ${zipPath}. Run 'npm run release:full' or 'node scripts/package-release.mjs v${cleanVersion}' first.`
    );
  }

  const stat = fs.statSync(zipPath);
  if (stat.size < 20 * 1024) {
    throw new Error(`CWS release ZIP archive is suspiciously small (${stat.size} bytes < 20KB): ${zipPath}`);
  }

  const fd = fs.openSync(zipPath, "r");
  const header = Buffer.alloc(4);
  try {
    fs.readSync(fd, header, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }

  if (header[0] !== 0x50 || header[1] !== 0x4b || header[2] !== 0x03 || header[3] !== 0x04) {
    throw new Error(`Invalid ZIP signature in archive: ${zipPath}`);
  }

  return {
    valid: true,
    version: cleanVersion,
    zipPath,
    sizeBytes: stat.size,
  };
}

export function checkGitHubReleasePublished(version, options = {}) {
  const cleanVersion = String(version || "").replace(/^v/u, "").trim();
  const targetTag = `v${cleanVersion}`;
  const { runCommand = execFileSync, dryRun = false } = options;

  if (dryRun) {
    return {
      published: true,
      dryRun: true,
      tag: targetTag,
      version: cleanVersion,
      url: `https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/${targetTag}`,
      assetCount: 6,
    };
  }

  let rawOutput;
  try {
    rawOutput = runCommand(
      "gh",
      ["release", "view", targetTag, "--json", "tagName,isDraft,url,assets"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (err) {
    throw new Error(
      `[Pre-Release Gate] GitHub Release ${targetTag} is not published yet (${err.message}). Publish on GitHub first.`
    );
  }

  let data;
  try {
    data = JSON.parse(rawOutput);
  } catch {
    throw new Error(`[Pre-Release Gate] Failed to parse gh release view JSON output for ${targetTag}.`);
  }

  if (data.isDraft) {
    throw new Error(`[Pre-Release Gate] GitHub Release ${targetTag} is still in DRAFT state.`);
  }

  const assets = Array.isArray(data.assets) ? data.assets : [];
  const expectedZipName = `bookmarkflow-bar-${cleanVersion}.zip`;
  const hasChromeZip = assets.some((a) => a && a.name === expectedZipName);
  if (!hasChromeZip) {
    throw new Error(
      `[Pre-Release Gate] GitHub Release ${targetTag} is missing required asset "${expectedZipName}".`
    );
  }

  return {
    published: true,
    tag: data.tagName || targetTag,
    version: cleanVersion,
    url: data.url || `https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/${targetTag}`,
    assetCount: assets.length,
  };
}

export function parseCwsStatusFromText(bodyText, version, currentUrl = "") {
  const text = String(bodyText || "");
  const url = String(currentUrl || "");
  const cleanVersion = String(version || "").replace(/^v/u, "").trim();

  const isAuthUrl = url.includes("accounts.google.com/v3/signin") || url.includes("accounts.google.com/ServiceLogin");
  const hasReauthPrompt =
    isAuthUrl ||
    text.includes("Devam etmek için önce kimliğinizi doğrulayın") ||
    text.includes("Şifrenizi girin") ||
    text.includes("Verify it's you") ||
    text.includes("Enter your password");

  if (hasReauthPrompt) {
    return {
      reauthRequired: true,
      versionFound: false,
      isPendingReview: false,
      isPublished: false,
      isDraft: false,
      status: "reauth_required",
    };
  }

  const versionRegex = new RegExp(`(?:Sürüm|Version)?\\s*${cleanVersion.replaceAll(".", "\\.")}(?![0-9.])`, "iu");
  const versionFound = versionRegex.test(text);

  if (!versionFound) {
    return {
      reauthRequired: false,
      versionFound: false,
      isPendingReview: false,
      isPublished: false,
      isDraft: false,
      status: "not_found",
    };
  }

  // Extract lines or segments around the target version to avoid confusing older published versions with the target version
  const normalized = text.replace(/\r\n/g, "\n");
  const escapedVer = cleanVersion.replaceAll(".", "\\.");

  const pendingRegex = new RegExp(
    `(?:İncelenmeyi bekliyor|Pending review)[\\s\\S]{0,160}${escapedVer}|${escapedVer}[\\s\\S]{0,160}(?:İncelenmeyi bekliyor|Pending review)`,
    "iu"
  );
  const draftRegex = new RegExp(
    `(?:Taslak|Draft)[\\s\\S]{0,120}(?:Sürüm|Version)\\s*${escapedVer}|${escapedVer}[\\s\\S]{0,120}(?:Taslak|Draft)`,
    "iu"
  );
  const publishedRegex = new RegExp(
    `(?:Yayımlandı|Published)[\\s\\S]{0,140}(?:Sürüm|Version)?\\s*${escapedVer}|(?:Sürüm|Version)\\s*${escapedVer}[\\s\\S]{0,120}(?:Yayımlandı|Published)`,
    "iu"
  );

  const isPendingReview = pendingRegex.test(normalized);
  const isDraft = !isPendingReview && draftRegex.test(normalized);
  const isPublished = !isPendingReview && !isDraft && publishedRegex.test(normalized);

  let status = "version_present_unknown_state";
  if (isPendingReview) status = "pending_review";
  else if (isPublished) status = "published";
  else if (isDraft) status = "draft";

  return {
    reauthRequired: false,
    versionFound: true,
    isPendingReview,
    isPublished,
    isDraft,
    status,
  };
}

export async function getActiveChromeWsUrl() {
  const activePortFile = path.join(
    process.env.LOCALAPPDATA || "",
    "Google/Chrome/User Data/DevToolsActivePort"
  );
  if (!fs.existsSync(activePortFile)) {
    throw new Error("DevToolsActivePort not found. Chrome is not running with remote debugging.");
  }
  const lines = fs
    .readFileSync(activePortFile, "utf8")
    .trim()
    .split("\n")
    .map((l) => l.trim());
  return `ws://127.0.0.1:${lines[0]}${lines[1]}`;
}

export class CwsCdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    ensureAutoAllowDaemon();
    triggerFastUiaAutoConfirm(5000).catch(() => null);
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else cb.resolve(msg.result);
        }
      };
    });
  }

  async send(method, params = {}, sessionId = undefined) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      this.ws.send(JSON.stringify(payload));
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

async function getPageSnapshot(client, sessionId) {
  const evalRes = await client.send(
    "Runtime.evaluate",
    {
      expression: `({
        url: location.href,
        title: document.title,
        text: document.body ? document.body.innerText : ''
      })`,
      returnByValue: true,
    },
    sessionId
  );
  return evalRes.result?.value || { url: "", title: "", text: "" };
}

export async function verifyCwsReleaseStatus(version = getManifestVersion(), options = {}) {
  const cleanVersion = String(version || "").replace(/^v/u, "").trim();
  if (options.dryRun) {
    return {
      ok: true,
      dryRun: true,
      version: cleanVersion,
      status: "pending_review",
      url: CWS_DASHBOARD_URL,
    };
  }

  const wsUrl = await getActiveChromeWsUrl();
  const client = new CwsCdpClient(wsUrl);
  await client.connect();

  try {
    const { targetInfos } = await client.send("Target.getTargets");
    let cwsPage = targetInfos.find(
      (t) =>
        t.type === "page" &&
        (t.url.includes("chrome.google.com/webstore/devconsole") ||
          t.url.includes("chromewebstore.google.com/u/"))
    );

    if (!cwsPage) {
      const created = await client.send("Target.createTarget", { url: CWS_PACKAGE_URL });
      await new Promise((r) => setTimeout(r, 4500));
      cwsPage = { targetId: created.targetId, url: CWS_PACKAGE_URL };
    }

    const { sessionId } = await client.send("Target.attachToTarget", {
      targetId: cwsPage.targetId,
      flatten: true,
    });

    let snap = await getPageSnapshot(client, sessionId);
    let parsed = parseCwsStatusFromText(snap.text, cleanVersion, snap.url);

    if (parsed.reauthRequired) {
      await client.send("Target.activateTarget", { targetId: cwsPage.targetId }).catch(() => null);
      throw new Error(
        `[REAUTH_REQUIRED] Chrome Web Store Developer Console requires Google password verification. The Chrome tab has been brought to the foreground; please enter your password and re-run.`
      );
    }

    // If current page doesn't show the status clearly, check package page and dashboard page
    if (!parsed.isPendingReview && !parsed.isPublished) {
      await client.send("Page.navigate", { url: CWS_PACKAGE_URL }, sessionId);
      await new Promise((r) => setTimeout(r, 4000));
      snap = await getPageSnapshot(client, sessionId);
      parsed = parseCwsStatusFromText(snap.text, cleanVersion, snap.url);

      if (parsed.reauthRequired) {
        await client.send("Target.activateTarget", { targetId: cwsPage.targetId }).catch(() => null);
        throw new Error(
          `[REAUTH_REQUIRED] Chrome Web Store Developer Console requires Google password verification. The Chrome tab has been brought to the foreground; please enter your password and re-run.`
        );
      }
    }

    if (!parsed.isPendingReview && !parsed.isPublished) {
      await client.send("Page.navigate", { url: CWS_DASHBOARD_URL }, sessionId);
      await new Promise((r) => setTimeout(r, 4000));
      snap = await getPageSnapshot(client, sessionId);
      const dashParsed = parseCwsStatusFromText(snap.text, cleanVersion, snap.url);
      if (dashParsed.isPendingReview || dashParsed.isPublished || dashParsed.versionFound) {
        parsed = dashParsed;
      }
    }

    return {
      ok: parsed.isPendingReview || parsed.isPublished,
      version: cleanVersion,
      status: parsed.status,
      isPendingReview: parsed.isPendingReview,
      isPublished: parsed.isPublished,
      isDraft: parsed.isDraft,
      url: snap.url,
    };
  } finally {
    client.close();
  }
}

export async function publishToChromeWebStore(options = {}) {
  const manifestPath = options.manifestPath || path.join(root, "manifest.json");
  const version = (options.version || getManifestVersion(manifestPath)).replace(/^v/u, "").trim();
  const dryRun = Boolean(options.dryRun);
  const checkOnly = Boolean(options.checkOnly);
  const skipSubmit = Boolean(options.skipSubmit);

  const zipInfo = assertReleaseZipExists(version, options.zipPath, options.distDir);

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      version,
      zipPath: zipInfo.zipPath,
      sizeBytes: zipInfo.sizeBytes,
      steps: [
        "validate-zip",
        "connect-cdp",
        "check-cws-status",
        "upload-zip-package",
        skipSubmit ? "skip-submit" : "submit-for-review",
        "verify-store-status",
      ],
    };
  }

  if (checkOnly) {
    const statusRes = await verifyCwsReleaseStatus(version, options);
    if (!statusRes.ok) {
      throw new Error(
        `[CWS Check Failed] Version ${version} is not in 'Pending review' or 'Published' state on Chrome Web Store (current status: ${statusRes.status}).`
      );
    }
    return {
      success: true,
      checkOnly: true,
      version,
      status: statusRes.status,
      url: statusRes.url,
    };
  }

  const wsUrl = await getActiveChromeWsUrl();
  const client = new CwsCdpClient(wsUrl);
  await client.connect();

  try {
    const { targetInfos } = await client.send("Target.getTargets");
    let cwsPage = targetInfos.find(
      (t) =>
        t.type === "page" &&
        (t.url.includes("chrome.google.com/webstore/devconsole") ||
          t.url.includes("chromewebstore.google.com/u/"))
    );

    if (!cwsPage) {
      const created = await client.send("Target.createTarget", { url: CWS_PACKAGE_URL });
      await new Promise((r) => setTimeout(r, 4500));
      cwsPage = { targetId: created.targetId, url: CWS_PACKAGE_URL };
    }

    const { sessionId } = await client.send("Target.attachToTarget", {
      targetId: cwsPage.targetId,
      flatten: true,
    });

    console.log(`[CWS] Navigating to package console for v${version}...`);
    await client.send("Page.navigate", { url: CWS_PACKAGE_URL }, sessionId);
    await new Promise((r) => setTimeout(r, 4500));

    let snap = await getPageSnapshot(client, sessionId);
    let parsed = parseCwsStatusFromText(snap.text, version, snap.url);

    if (parsed.reauthRequired) {
      await client.send("Target.activateTarget", { targetId: cwsPage.targetId }).catch(() => null);
      throw new Error(
        `[REAUTH_REQUIRED] Chrome Web Store Developer Console requires Google password verification. The Chrome tab has been brought to the foreground; please enter your password and re-run.`
      );
    }

    if (parsed.isPendingReview || parsed.isPublished) {
      console.log(`[CWS] Version ${version} is already ${parsed.status} on Chrome Web Store.`);
      return {
        success: true,
        alreadySubmitted: true,
        version,
        status: parsed.status,
      };
    }

    // Upload ZIP if not already staged as Draft
    if (!parsed.isDraft) {
      console.log(`[CWS] Uploading ${path.basename(zipInfo.zipPath)} (${zipInfo.sizeBytes} bytes)...`);
      let fileInputObjectId = null;

      for (let attempt = 0; attempt < 10; attempt++) {
        const clickUploadRes = await client.send(
          "Runtime.evaluate",
          {
            expression: `(() => {
              if (!window.__bfCwsFileGuard) {
                window.__bfCwsFileGuard = true;
                const origClick = HTMLInputElement.prototype.click;
                HTMLInputElement.prototype.click = function(...args) {
                  if (this.type === 'file') return;
                  return origClick.apply(this, args);
                };
              }
              const existingInput = document.querySelector('input[type="file"]');
              if (existingInput) return { hasInput: true };
              const btn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => {
                const t = (b.innerText || '').trim();
                return t.includes('Yeni paket yükle') || t.includes('Upload new package');
              });
              if (btn) {
                btn.click();
                return { hasInput: Boolean(document.querySelector('input[type="file"]')), clickedBtn: true };
              }
              return { hasInput: false, clickedBtn: false };
            })()`,
            returnByValue: true,
          },
          sessionId
        );

        if (clickUploadRes.result?.value?.hasInput || clickUploadRes.result?.value?.clickedBtn) {
          await new Promise((r) => setTimeout(r, 600));
          const inputObj = await client.send(
            "Runtime.evaluate",
            { expression: `document.querySelector('input[type="file"]')` },
            sessionId
          );
          if (inputObj.result?.objectId) {
            fileInputObjectId = inputObj.result.objectId;
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!fileInputObjectId) {
        throw new Error(`[CWS Upload Failed] Could not find file input or 'Yeni paket yükle' button on ${snap.url}`);
      }

      await client.send(
        "DOM.setFileInputFiles",
        {
          files: [zipInfo.zipPath],
          objectId: fileInputObjectId,
        },
        sessionId
      );

      await client.send(
        "Runtime.evaluate",
        {
          expression: `(() => {
            const input = document.querySelector('input[type="file"]');
            if (input) {
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()`,
          returnByValue: true,
        },
        sessionId
      );

      console.log("[CWS] Waiting for package upload and validation to complete...");
      let uploadedOk = false;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        snap = await getPageSnapshot(client, sessionId);
        if (snap.url.endsWith("/edit") || snap.text.includes(version)) {
          uploadedOk = true;
          break;
        }
      }

      if (!uploadedOk) {
        throw new Error(`[CWS Upload Timeout] Package upload for v${version} did not complete within 30s.`);
      }
      console.log(`[CWS] Package v${version} staged as draft!`);
    } else {
      console.log(`[CWS] Package v${version} is already staged as Draft.`);
    }

    if (skipSubmit) {
      return {
        success: true,
        version,
        status: "draft",
        skipSubmit: true,
      };
    }

    // Navigate to /edit and click "İnceleme için gönder" / "Submit for review"
    console.log(`[CWS] Navigating to Store Listing (/edit) to submit v${version} for review...`);
    await client.send("Page.navigate", { url: CWS_EDIT_URL }, sessionId);
    await new Promise((r) => setTimeout(r, 4000));

    let submitClicked = false;
    for (let i = 0; i < 10; i++) {
      const submitRes = await client.send(
        "Runtime.evaluate",
        {
          expression: `(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => {
              const rect = b.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0 || b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
              const t = (b.innerText || '').trim().toLocaleLowerCase('tr-TR');
              return t.includes('inceleme için gönder') || t.includes('submit for review');
            });
            if (btn) {
              btn.click();
              return { clicked: true, text: (btn.innerText || '').trim() };
            }
            return { clicked: false };
          })()`,
          returnByValue: true,
        },
        sessionId
      );

      if (submitRes.result?.value?.clicked) {
        submitClicked = true;
        console.log("[CWS] Clicked primary Submit button:", submitRes.result.value.text);
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (!submitClicked) {
      throw new Error(`[CWS Submit Failed] 'İnceleme için gönder' button was not enabled or found for v${version}.`);
    }

    // Confirm modal dialog ("İnceleme İçin Gönder")
    console.log("[CWS] Waiting for confirmation dialog...");
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      const modalRes = await client.send(
        "Runtime.evaluate",
        {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('button')).filter(b => {
              const rect = b.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0 || b.disabled || b.getAttribute('aria-disabled') === 'true') return false;
              const t = (b.innerText || '').trim().toLocaleLowerCase('tr-TR');
              return t === 'inceleme için gönder' || t === 'submit for review' || t === 'gönder' || t === 'submit';
            });
            if (btns.length >= 2) {
              const confirmBtn = btns[btns.length - 1];
              confirmBtn.click();
              return { confirmed: true, text: (confirmBtn.innerText || '').trim() };
            }
            return { confirmed: false, count: btns.length };
          })()`,
          returnByValue: true,
        },
        sessionId
      );

      if (modalRes.result?.value?.confirmed) {
        console.log("[CWS] Confirmed review submission modal:", modalRes.result.value.text);
        break;
      }
    }

    await new Promise((r) => setTimeout(r, 5000));

    // Final verification on CWS Dashboard
    await client.send("Page.navigate", { url: CWS_DASHBOARD_URL }, sessionId);
    await new Promise((r) => setTimeout(r, 4000));
    snap = await getPageSnapshot(client, sessionId);
    parsed = parseCwsStatusFromText(snap.text, version, snap.url);

    if (!parsed.isPendingReview && !parsed.isPublished) {
      throw new Error(
        `[CWS Verification Failed] Expected v${version} to be 'İncelenmeyi bekliyor' or 'Yayımlandı', got status: ${parsed.status}`
      );
    }

    console.log(`[SUCCESS] Chrome Web Store v${version} is now verified as '${parsed.status}'!`);
    return {
      success: true,
      version,
      status: parsed.status,
      url: CWS_DASHBOARD_URL,
    };
  } finally {
    client.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const options = parseCwsArgs(process.argv.slice(2));
  publishToChromeWebStore(options)
    .then((res) => {
      console.log("[CWS Result]", JSON.stringify(res, null, 2));
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exitCode = 1;
    });
}
