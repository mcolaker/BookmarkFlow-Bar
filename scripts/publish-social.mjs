import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export function parsePngDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) {
    throw new Error("Invalid buffer: not enough bytes for PNG header");
  }
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < 8; i++) {
    if (buffer[i] !== pngSig[i]) {
      throw new Error("Invalid PNG signature");
    }
  }
  const chunkType = buffer.toString("ascii", 12, 16);
  if (chunkType !== "IHDR") {
    throw new Error(`Expected IHDR chunk at offset 12, got: ${chunkType}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  return { width, height, bitDepth, colorType, aspectRatio: width / height };
}

export function assertSocialCardVisualQuality(imagePath, targetPlatform) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error(`Social media card file does not exist: ${imagePath}`);
  }

  const stat = fs.statSync(imagePath);
  if (stat.size < 10 * 1024) {
    throw new Error(`Social media card file is suspiciously small (${stat.size} bytes < 10KB): ${imagePath}`);
  }
  if (stat.size > 15 * 1024 * 1024) {
    throw new Error(`Social media card file exceeds 15MB upload limit (${stat.size} bytes): ${imagePath}`);
  }

  const buffer = fs.readFileSync(imagePath);
  const { width, height, aspectRatio } = parsePngDimensions(buffer);

  const platform = String(targetPlatform || "x").toLowerCase();
  if (platform === "x" || platform === "twitter") {
    if (width < 600 || height < 300) {
      throw new Error(`X promo card resolution too low: ${width}x${height}px (minimum 600x300)`);
    }
    if (aspectRatio < 1.70 || aspectRatio > 1.85) {
      throw new Error(`X promo card must follow ~16:9 aspect ratio (~1.777), got ${aspectRatio.toFixed(3)} (${width}x${height})`);
    }
  } else if (platform === "linkedin") {
    if (width < 600 || height < 300) {
      throw new Error(`LinkedIn promo card resolution too low: ${width}x${height}px (minimum 600x300)`);
    }
    if (aspectRatio < 1.85 || aspectRatio > 1.96) {
      throw new Error(`LinkedIn promo card must follow ~1.91:1 aspect ratio (~1.913), got ${aspectRatio.toFixed(3)} (${width}x${height})`);
    }
  }

  return {
    valid: true,
    platform,
    width,
    height,
    aspectRatio: Math.round(aspectRatio * 1000) / 1000,
    sizeBytes: stat.size,
  };
}

export async function getActiveChromeWsUrl() {
  const activePortFile = path.join(
    process.env.LOCALAPPDATA,
    "Google/Chrome/User Data/DevToolsActivePort",
  );
  if (!fs.existsSync(activePortFile)) {
    throw new Error("DevToolsActivePort not found. Chrome is not running with remote debugging.");
  }
  const lines = fs.readFileSync(activePortFile, "utf8").trim().split("\n").map((l) => l.trim());
  return `ws://127.0.0.1:${lines[0]}${lines[1]}`;
}

export class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
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

export async function prepareXPost() {
  const wsUrl = await getActiveChromeWsUrl();
  console.log("Connecting to:", wsUrl);
  const client = new CdpClient(wsUrl);
  await client.connect();
  console.log("Connected to Chrome via WebSocket CDP!");

  const { targetInfos } = await client.send("Target.getTargets");
  const xTarget = targetInfos.find((t) => t.type === "page" && t.url.includes("x.com"));
  if (!xTarget) {
    console.log("No X tab found in Chrome. Please open x.com");
    client.close();
    return;
  }

  console.log("Found X target:", xTarget.title, xTarget.targetId);
  const { sessionId } = await client.send("Target.attachToTarget", { targetId: xTarget.targetId, flatten: true });

  console.log("Navigating to https://x.com/compose/post...");
  await client.send("Page.navigate", { url: "https://x.com/compose/post" }, sessionId);

  console.log("Waiting for compose box...");
  await new Promise((r) => setTimeout(r, 4000));

  const postText = `Browse at the speed of thought. 🌊⚡

BookmarkFlow Bar 0.4.0 is live!
• Smart folder sorting (Newest, Frequent)
• Spotlight search filter chips
• Turquoise Glow dark theme

Chrome: https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf
GitHub: https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/v0.4.0

#Chrome #Productivity`;

  const imagePath = path.resolve("output/social-v0.4.0/bookmarkflow-v0.4.0-x-card.png");
  console.log("Image path:", imagePath);
  const visualLint = assertSocialCardVisualQuality(imagePath, "x");
  console.log("[Pre-Publish Visual Lint] X Promo Card Verified:", visualLint);

  const evalResult = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const editor = document.querySelector('[data-testid="tweetTextarea_0"]') || document.querySelector('div[contenteditable="true"]');
      if (!editor) return { success: false, reason: "editor_not_found" };
      editor.focus();
      return { success: true };
    })()`,
    returnByValue: true,
  }, sessionId);

  console.log("Focus editor result:", evalResult.result.value);

  if (evalResult.result.value.success) {
    console.log("Typing post text via CDP Input.insertText...");
    await client.send("Input.insertText", { text: postText }, sessionId);
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (fs.existsSync(imagePath)) {
    console.log("Uploading card image via CDP DOM.setFileInputFiles...");
    try {
      const doc = await client.send("DOM.getDocument", {}, sessionId);
      const fileInputNode = await client.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: 'input[data-testid="fileInput"]',
      }, sessionId);

      if (fileInputNode.nodeId > 0) {
        await client.send("DOM.setFileInputFiles", {
          files: [imagePath],
          nodeId: fileInputNode.nodeId,
        }, sessionId);
        console.log("Image attached successfully!");
        await new Promise((r) => setTimeout(r, 3000));
      } else {
        console.log("fileInput element not found on page");
      }
    } catch (fileErr) {
      console.log("Error attaching image:", fileErr.message);
    }
  }

  console.log("Waiting for media upload to finish and Post button to enable...");
  let clicked = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const btnCheck = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('[data-testid="tweetButton"]') || document.querySelector('[data-testid="tweetButtonInline"]');
        if (!btn) return { found: false };
        const disabled = btn.getAttribute("aria-disabled") === "true" || btn.disabled;
        if (!disabled) {
          btn.click();
          return { found: true, clicked: true, text: btn.textContent };
        }
        return { found: true, disabled: true, text: btn.textContent };
      })()`,
      returnByValue: true,
    }, sessionId);

    console.log(`Check ${i + 1}:`, btnCheck.result.value);
    if (btnCheck.result.value && btnCheck.result.value.clicked) {
      clicked = true;
      console.log("🚀 Post button clicked successfully on X!");
      break;
    }
  }

  if (!clicked) {
    console.log("Post button was not clickable within timeout.");
  }

  await new Promise((r) => setTimeout(r, 3000));
  client.close();
  console.log("Finished prepareXPost!");
}

export async function prepareLinkedInPost() {
  const wsUrl = await getActiveChromeWsUrl();
  console.log("Connecting to:", wsUrl);
  const client = new CdpClient(wsUrl);
  await client.connect();
  console.log("Connected to Chrome via WebSocket CDP!");

  const { targetInfos } = await client.send("Target.getTargets");
  let liTarget = targetInfos.find((t) => t.type === "page" && t.url.includes("linkedin.com"));
  if (!liTarget) {
    console.log("Creating LinkedIn target...");
    const created = await client.send("Target.createTarget", { url: "https://www.linkedin.com/feed/?shareActive=true" });
    await new Promise((r) => setTimeout(r, 4000));
    const updated = await client.send("Target.getTargets");
    liTarget = updated.targetInfos.find((t) => t.targetId === created.targetId) || { targetId: created.targetId, title: "LinkedIn", url: "https://www.linkedin.com/feed/?shareActive=true" };
  }

  console.log("Found LinkedIn target:", liTarget.title, liTarget.targetId);
  const { sessionId } = await client.send("Target.attachToTarget", { targetId: liTarget.targetId, flatten: true });

  console.log("Navigating to LinkedIn feed...");
  await client.send("Page.navigate", { url: "https://www.linkedin.com/feed/" }, sessionId);
  await new Promise((r) => setTimeout(r, 5000));

  const imagePath = path.resolve("output/social-v0.4.0/bookmarkflow-v0.4.0-linkedin-card.png");
  const visualLint = assertSocialCardVisualQuality(imagePath, "linkedin");
  console.log("[Pre-Publish Visual Lint] LinkedIn Promo Card Verified:", visualLint);
  if (fs.existsSync(imagePath)) {
    console.log("Clicking Fotoğraf button on feed to trigger image upload...");
    await client.send("Runtime.evaluate", {
      expression: `(() => {
        const p = Array.from(document.querySelectorAll('p')).find(el => el.innerText.trim() === 'Fotoğraf');
        const btn = p ? p.closest('div[role="button"]') || p.parentElement : null;
        if (btn) btn.click();
      })()`
    }, sessionId);
    await new Promise((r) => setTimeout(r, 2000));

    console.log("Setting image file via CDP DOM.setFileInputFiles...");
    try {
      const doc = await client.send("DOM.getDocument", {}, sessionId);
      const fileInputNode = await client.send("DOM.querySelector", {
        nodeId: doc.root.nodeId,
        selector: 'input[type="file"]',
      }, sessionId);

      if (fileInputNode.nodeId > 0) {
        await client.send("DOM.setFileInputFiles", {
          files: [imagePath],
          nodeId: fileInputNode.nodeId,
        }, sessionId);
        await client.send("Runtime.evaluate", {
          expression: `(() => {
            const input = document.querySelector('input[type="file"]');
            if (input) {
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })()`
        }, sessionId);
        console.log("Image set via DOM.setFileInputFiles!");
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (fileErr) {
      console.log("Error with DOM.setFileInputFiles:", fileErr.message);
    }

    // Click Next / İleri button
    const nextBtnRes = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => {
          const t = b.innerText.trim().toLowerCase();
          return t === 'ileri' || t === 'bitti' || t === 'next' || t === 'done';
        });
        if (nextBtn) {
          nextBtn.click();
          return { clicked: true, text: nextBtn.innerText.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    }, sessionId);

    console.log("Next/Done button result:", nextBtnRes.result.value);
    await new Promise((r) => setTimeout(r, 3000));
  }

  const postText = `Browse at the speed of thought. 🌊⚡

We are excited to announce BookmarkFlow Bar 0.4.0!

Designed for high-productivity workflows, BookmarkFlow Bar helps you find and organize your bookmarks instantly without breaking your focus:

✨ Smart Folder Sorting: Auto-prioritize your most relevant and frequently visited links
⚡ Instant Spotlight Filter Chips: Narrow down searches by folder or tag in milliseconds
🎨 Turquoise Glow Theme: Sleek, high-contrast dark aesthetic built for modern desktops
🔒 100% Local & Privacy-First: Zero cloud tracking, everything stays in your browser

Get it now:
🌐 Chrome Web Store: https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf
📦 GitHub Release: https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/v0.4.0

#Chrome #Productivity #OpenSource #WebDevelopment #SoftwareEngineering`;

  // Focus editor and insert text
  console.log("Focusing editor in LinkedIn modal...");
  const editorFocusResult = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const editor = document.querySelector('.tiptap.ProseMirror') ||
                    document.querySelector('.ql-editor') ||
                    document.querySelector('div[contenteditable="true"]');
      if (editor) {
        editor.focus();
        return { success: true };
      }
      return { success: false };
    })()`,
    returnByValue: true,
  }, sessionId);

  console.log("Editor focus result:", editorFocusResult.result.value);
  if (editorFocusResult.result.value && editorFocusResult.result.value.success) {
    console.log("Inserting text into LinkedIn editor...");
    await client.send("Input.insertText", { text: postText }, sessionId);
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Click Yayınla / Post
  console.log("Looking for LinkedIn 'Post' / 'Yayınla' button...");
  for (let i = 0; i < 10; i++) {
    const postBtnResult = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => {
          const txt = b.innerText.trim().toLowerCase();
          return (txt === 'yayınla' || txt === 'paylaş' || txt === 'post') && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
        });
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.innerText.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    }, sessionId);

    console.log(`Post check ${i + 1}:`, postBtnResult.result.value);
    if (postBtnResult.result.value && postBtnResult.result.value.clicked) {
      console.log("🚀 LinkedIn post button clicked successfully with image card!");
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  await new Promise((r) => setTimeout(r, 3000));
  client.close();
  console.log("Finished prepareLinkedInPost!");
}

if (process.argv[1] && process.argv[1].endsWith("publish-social.mjs")) {
  const platform = process.argv[2] || "all";
  if (platform === "x") {
    prepareXPost().catch(console.error);
  } else if (platform === "linkedin") {
    prepareLinkedInPost().catch(console.error);
  } else {
    prepareLinkedInPost().catch(console.error);
  }
}
