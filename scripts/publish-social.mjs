import fs from "node:fs";
import path from "node:path";
import process from "node:process";

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

  // Navigate to compose tweet
  console.log("Navigating to https://x.com/compose/post...");
  await client.send("Page.navigate", { url: "https://x.com/compose/post" }, sessionId);

  // Wait for compose dialog to appear
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

  // 1. Insert text via DOM Document.execCommand or Input.insertText
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

  // 2. Set file input for image upload
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

  // 3. Wait for image upload to complete and button to enable
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
    const created = await client.send("Target.createTarget", { url: "https://www.linkedin.com/feed/" });
    await new Promise((r) => setTimeout(r, 4000));
    const updated = await client.send("Target.getTargets");
    liTarget = updated.targetInfos.find((t) => t.targetId === created.targetId) || { targetId: created.targetId, title: "LinkedIn", url: "https://www.linkedin.com/feed/" };
  }

  console.log("Found LinkedIn target:", liTarget.title, liTarget.targetId);
  const { sessionId } = await client.send("Target.attachToTarget", { targetId: liTarget.targetId, flatten: true });

  console.log("Clicking 'Start a post' trigger...");
  const triggerResult = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const btn = document.querySelector('.share-box-feed-entry__trigger') ||
                  document.querySelector('button[aria-label*="gönderi"]') ||
                  document.querySelector('button[aria-label*="post"]') ||
                  Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Gönderi başlat') || b.textContent.includes('Start a post'));
      if (btn) {
        btn.click();
        return { success: true };
      }
      return { success: false, reason: "button_not_found" };
    })()`,
    returnByValue: true,
  }, sessionId);

  console.log("Trigger click result:", triggerResult.result.value);
  await new Promise((r) => setTimeout(r, 3000));

  const postText = `Browse at the speed of thought. 🌊⚡

We are excited to announce the release of BookmarkFlow Bar 0.4.0!

Designed for high-productivity workflows, BookmarkFlow Bar helps you find and organize your bookmarks instantly without breaking your focus:

✨ Smart Folder Sorting: Auto-prioritize your most relevant and frequently visited links
⚡ Instant Spotlight Filter Chips: Narrow down searches by folder or tag in milliseconds
🎨 Turquoise Glow Theme: Sleek, high-contrast dark aesthetic built for modern desktops
🔒 100% Local & Privacy-First: Zero cloud tracking, everything stays in your browser

Get it now:
🌐 Chrome Web Store: https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf
📦 GitHub Release: https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/v0.4.0

#Chrome #Productivity #OpenSource #WebDevelopment #SoftwareEngineering`;

  const imagePath = path.resolve("output/social-v0.4.0/bookmarkflow-v0.4.0-linkedin-card.png");
  console.log("Image path:", imagePath);

  // 1. Focus editor and insert text
  console.log("Focusing editor in LinkedIn modal...");
  const editorFocusResult = await client.send("Runtime.evaluate", {
    expression: `(() => {
      const editor = document.querySelector('.ql-editor') ||
                    document.querySelector('div[contenteditable="true"][role="textbox"]') ||
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
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 2. Attach Image
  if (fs.existsSync(imagePath)) {
    console.log("Uploading card image to LinkedIn...");
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
        console.log("LinkedIn image attached!");
        await new Promise((r) => setTimeout(r, 4000));

        // Click Next/Done on image modal if it appears
        console.log("Checking for image modal 'Next'/'Done' button...");
        await client.send("Runtime.evaluate", {
          expression: `(() => {
            const nextBtn = Array.from(document.querySelectorAll('button')).find(b => {
              const txt = b.textContent.trim().toLowerCase();
              return txt === 'ileri' || txt === 'bitti' || txt === 'next' || txt === 'done';
            });
            if (nextBtn) {
              nextBtn.click();
              return { clicked: true, text: nextBtn.textContent.trim() };
            }
            return { clicked: false };
          })()`,
          returnByValue: true,
        }, sessionId);

        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (imgErr) {
      console.log("Error attaching LinkedIn image:", imgErr.message);
    }
  }

  // 3. Post button
  console.log("Looking for LinkedIn 'Post' / 'Yayınla' button...");
  for (let i = 0; i < 10; i++) {
    const postBtnResult = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const btn = document.querySelector('.share-actions__primary-action') ||
                    Array.from(document.querySelectorAll('button')).find(b => {
                      const txt = b.textContent.trim().toLowerCase();
                      return (txt === 'yayınla' || txt === 'paylaş' || txt === 'post') && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
                    });
        if (btn) {
          btn.click();
          return { clicked: true, text: btn.textContent.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true,
    }, sessionId);

    console.log(`Post check ${i + 1}:`, postBtnResult.result.value);
    if (postBtnResult.result.value && postBtnResult.result.value.clicked) {
      console.log("🚀 LinkedIn post button clicked successfully!");
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
    // default: run linkedin since x was already completed
    prepareLinkedInPost().catch(console.error);
  }
}
