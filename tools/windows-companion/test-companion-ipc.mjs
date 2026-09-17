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

    // Step 1: Send PING
    sendPacket({ type: "PING", id: "req_1" });

    // Wait for PONG, then send GET_ACTIVE_WINDOW
    const checkInterval = setInterval(async () => {
      const pong = receivedMessages.find((m) => m.id === "req_1");
      if (pong) {
        clearInterval(checkInterval);

        try {
          assert.equal(pong.type, "PONG");
          assert.equal(pong.version, "0.1.0");
          assert.equal(pong.platform, "win32");
          assert.ok(Array.isArray(pong.capabilities));
          assert.ok(pong.capabilities.includes("fast_windows_uia"));
          assert.ok(pong.capabilities.includes("zero_latency_ipc"));
          console.log("✔ PING / PONG handshake verified");

          // Step 2: Test DISPATCH_COMMAND
          sendPacket({ type: "DISPATCH_COMMAND", id: "req_2", command: "GLOBAL_TOGGLE_BAR" });

          // Step 3: Test GET_ACTIVE_WINDOW
          sendPacket({ type: "GET_ACTIVE_WINDOW", id: "req_3" });

          const checkSecond = setInterval(() => {
            const cmdReply = receivedMessages.find((m) => m.id === "req_2");
            const winReply = receivedMessages.find((m) => m.id === "req_3");

            if (cmdReply && winReply) {
              clearInterval(checkSecond);
              assert.equal(cmdReply.type, "COMMAND_DISPATCHED");
              assert.equal(cmdReply.command, "GLOBAL_TOGGLE_BAR");
              console.log("✔ Command dispatch verified");

              assert.equal(winReply.type, "ACTIVE_WINDOW_RESULT");
              assert.ok(winReply.window && typeof winReply.window === "object");
              assert.ok("title" in winReply.window);
              assert.ok("process" in winReply.window);
              console.log(`✔ Windows UIA Active Window verified: [${winReply.window.process}] "${winReply.window.title}"`);

              child.stdin.end();
              resolve();
            }
          }, 100);

        } catch (err) {
          clearInterval(checkInterval);
          child.kill();
          reject(err);
        }
      }
    }, 50);

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
    }, 8000);
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
