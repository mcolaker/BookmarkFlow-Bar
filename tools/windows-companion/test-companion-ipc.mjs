import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const companionScript = path.join(__dirname, "bookmarkflow-companion.mjs");

function runTest() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [companionScript], {
      stdio: ["pipe", "pipe", "inherit"]
    });

    let receiveBuffer = Buffer.alloc(0);
    const receivedMessages = [];

    child.stdout.on("data", (chunk) => {
      receiveBuffer = Buffer.concat([receiveBuffer, chunk]);

      while (receiveBuffer.length >= 4) {
        const len = receiveBuffer.readUInt32LE(0);
        if (receiveBuffer.length < 4 + len) break;

        const payload = receiveBuffer.subarray(4, 4 + len);
        receiveBuffer = receiveBuffer.subarray(4 + len);

        const msg = JSON.parse(payload.toString("utf8"));
        receivedMessages.push(msg);
      }
    });

    function sendPacket(obj) {
      const json = Buffer.from(JSON.stringify(obj), "utf8");
      const header = Buffer.alloc(4);
      header.writeUInt32LE(json.length, 0);
      child.stdin.write(header);
      child.stdin.write(json);
    }

    function waitForMessage(predicate, timeoutMs = 8000) {
      return new Promise((res, rej) => {
        const start = Date.now();
        const check = () => {
          const found = receivedMessages.find(predicate);
          if (found) {
            return res(found);
          }
          if (Date.now() - start > timeoutMs) {
            return rej(new Error("Timed out waiting for message predicate"));
          }
          setTimeout(check, 50);
        };
        check();
      });
    }

    (async () => {
      try {
        // Step 1: PING / PONG
        sendPacket({ type: "PING", id: "req_1" });
        const pong = await waitForMessage((m) => m.id === "req_1");
        assert.equal(pong.type, "PONG");
        assert.equal(pong.version, "0.2.0");
        assert.equal(pong.platform, "win32");
        assert.ok(Array.isArray(pong.capabilities));
        assert.ok(pong.capabilities.includes("fast_windows_uia"));
        assert.ok(pong.capabilities.includes("zero_latency_ipc"));
        assert.ok(pong.capabilities.includes("win32_global_hotkeys"));
        assert.ok(pong.capabilities.includes("hotkey_listener"));
        assert.ok(pong.capabilities.includes("companion_tray"));
        assert.ok(pong.capabilities.includes("customizable_hotkeys"));
        console.log("✔ PING / PONG handshake verified (v0.2.0 with Win32 Hotkeys & Tray)");

        // Step 2: Test DISPATCH_COMMAND
        sendPacket({ type: "DISPATCH_COMMAND", id: "req_2", command: "GLOBAL_TOGGLE_BAR" });
        const cmdReply = await waitForMessage((m) => m.id === "req_2");
        assert.equal(cmdReply.type, "COMMAND_DISPATCHED");
        assert.equal(cmdReply.command, "GLOBAL_TOGGLE_BAR");
        console.log("✔ Command dispatch verified");

        // Step 3: Test GET_ACTIVE_WINDOW
        sendPacket({ type: "GET_ACTIVE_WINDOW", id: "req_3" });
        const winReply = await waitForMessage((m) => m.id === "req_3");
        assert.equal(winReply.type, "ACTIVE_WINDOW_RESULT");
        assert.ok(winReply.window && typeof winReply.window === "object");
        assert.ok("title" in winReply.window);
        assert.ok("process" in winReply.window);
        console.log(`✔ Windows UIA Active Window verified: [${winReply.window.process}] "${winReply.window.title}"`);

        // Step 4: Poll GET_HOTKEY_STATUS until PowerShell hotkey listener initializes
        let hotkeyReply = null;
        const pollStart = Date.now();
        let attempt = 0;
        while (Date.now() - pollStart < 8000) {
          attempt++;
          const reqId = `req_hotkey_${attempt}`;
          sendPacket({ type: "GET_HOTKEY_STATUS", id: reqId });
          const reply = await waitForMessage((m) => m.id === reqId, 1500).catch(() => null);
          if (reply && reply.running && Array.isArray(reply.registered) && reply.registered.length > 0) {
            hotkeyReply = reply;
            break;
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        assert.ok(hotkeyReply, "Hotkey status with registered hotkeys must be received within 8s");
        assert.equal(hotkeyReply.type, "HOTKEY_STATUS_RESULT");
        assert.equal(hotkeyReply.running, true);
        const toggleBarRegistered = hotkeyReply.registered.some((h) => h.command === "GLOBAL_TOGGLE_BAR" && h.hotkey === "Win+Shift+B");
        assert.ok(toggleBarRegistered, "Win+Shift+B must be registered for GLOBAL_TOGGLE_BAR");
        console.log(`✔ Win32 RegisterHotKey verified (${hotkeyReply.registered.length} global shortcuts active)`);

        // Step 5: Test UPDATE_HOTKEYS (Dynamic Custom Configuration)
        sendPacket({
          type: "UPDATE_HOTKEYS",
          id: "req_update_1",
          hotkeys: [
            { id: 1, key: "Z", modifiers: ["Win", "Shift"], command: "GLOBAL_TOGGLE_BAR" },
            { id: 2, key: "K", modifiers: ["Win", "Shift"], command: "GLOBAL_OPEN_SEARCH" }
          ]
        });
        const updateReply = await waitForMessage((m) => m.id === "req_update_1");
        assert.equal(updateReply.type, "HOTKEYS_UPDATED");
        assert.equal(updateReply.success, true);

        // Poll for updated hotkeys
        let updatedHotkeyReply = null;
        const updatePollStart = Date.now();
        let updateAttempt = 0;
        while (Date.now() - updatePollStart < 8000) {
          updateAttempt++;
          const reqId = `req_updated_poll_${updateAttempt}`;
          sendPacket({ type: "GET_HOTKEY_STATUS", id: reqId });
          const reply = await waitForMessage((m) => m.id === reqId, 1500).catch(() => null);
          if (reply && reply.running && Array.isArray(reply.registered) && reply.registered.some((h) => h.hotkey === "Win+Shift+Z")) {
            updatedHotkeyReply = reply;
            break;
          }
          await new Promise((r) => setTimeout(r, 200));
        }
        assert.ok(updatedHotkeyReply, "Updated hotkeys (Win+Shift+Z) must be active");
        console.log("✔ UPDATE_HOTKEYS dynamic customization verified (Win+Shift+Z active)");

        // Step 6: Test PAUSE_HOTKEYS & RESUME_HOTKEYS
        sendPacket({ type: "PAUSE_HOTKEYS", id: "req_pause" });
        const pauseReply = await waitForMessage((m) => m.id === "req_pause");
        assert.equal(pauseReply.type, "HOTKEYS_PAUSED");
        assert.equal(pauseReply.running, false);
        console.log("✔ PAUSE_HOTKEYS verified");

        sendPacket({ type: "RESUME_HOTKEYS", id: "req_resume" });
        const resumeReply = await waitForMessage((m) => m.id === "req_resume");
        assert.equal(resumeReply.type, "HOTKEYS_RESUMED");
        assert.equal(resumeReply.running, true);
        console.log("✔ RESUME_HOTKEYS verified");

        child.stdin.end();
        resolve();
      } catch (err) {
        child.kill();
        reject(err);
      }
    })();

    child.on("error", (err) => {
      reject(err);
    });

    child.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Companion exited with code ${code}`));
      }
    });

    setTimeout(() => {
      child.kill();
      reject(new Error("Companion IPC test timed out"));
    }, 20000);
  });
}

runTest()
  .then(() => {
    console.log("All Windows Companion IPC tests passed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("IPC test failed:", err);
    process.exit(1);
  });
