import { execFile, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const COMPANION_VERSION = "0.2.0";


function sendNativeMessage(msg) {
  try {
    const jsonBuffer = Buffer.from(JSON.stringify(msg), "utf8");
    const header = Buffer.alloc(4);
    header.writeUInt32LE(jsonBuffer.length, 0);
    process.stdout.write(header);
    process.stdout.write(jsonBuffer);
  } catch (err) {
    // Process pipe closed or broken
  }
}

function queryActiveWindow() {
  return new Promise((resolve) => {
    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
$source = @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public class WinInspector {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll", SetLastError = true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
'@
if (-not ([System.Management.Automation.PSTypeName]'WinInspector').Type) {
  Add-Type -TypeDefinition $source -Language CSharp | Out-Null
}
$hWnd = [WinInspector]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 512
[WinInspector]::GetWindowText($hWnd, $sb, 512) | Out-Null
$pidOut = 0
[WinInspector]::GetWindowThreadProcessId($hWnd, [ref]$pidOut) | Out-Null
$proc = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
$browserNames = @('chrome', 'msedge', 'brave', 'firefox', 'vivaldi', 'opera')
$isBrowser = $false
if ($proc -and $browserNames -contains $proc.ProcessName.ToLower()) {
  $isBrowser = $true
}
[PSCustomObject]@{
  title = $sb.ToString()
  process = if ($proc) { $proc.ProcessName } else { 'unknown' }
  pid = $pidOut
  isBrowser = $isBrowser
} | ConvertTo-Json -Compress
`;

    execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
      timeout: 2500,
      encoding: "utf8"
    }, (error, stdout) => {
      if (error || !stdout) {
        resolve({
          title: "Unknown",
          process: "unknown",
          pid: 0,
          isBrowser: false
        });
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch {
        resolve({
          title: "Unknown",
          process: "unknown",
          pid: 0,
          isBrowser: false
        });
      }
    });
  });
}

let hotkeyProcess = null;
let registeredHotkeys = [];

function startHotkeyListener() {
  if (process.platform !== "win32") {
    return;
  }
  if (hotkeyProcess) {
    return;
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const scriptPath = join(__dirname, "hotkey-listener.ps1");

  try {
    hotkeyProcess = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath,
        "-ParentPid",
        String(process.pid)
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true
      }
    );

    let lineBuffer = "";

    hotkeyProcess.stdout.on("data", (chunk) => {
      lineBuffer += chunk.toString("utf8");
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("{")) {
          continue;
        }
        try {
          const event = JSON.parse(trimmed);
          if (event.type === "HOTKEY_READY") {
            registeredHotkeys = event.registered ?? [];
          } else if (event.type === "HOTKEY_TRIGGERED" && event.command) {
            sendNativeMessage({
              type: "DISPATCH_COMMAND",
              command: event.command,
              hotkey: event.hotkey,
              source: "win32_register_hotkey",
              timestamp: event.timestamp || Date.now()
            });
          }
        } catch {
          // Ignore partial line or invalid JSON
        }
      }
    });

    hotkeyProcess.on("exit", () => {
      hotkeyProcess = null;
    });

    hotkeyProcess.on("error", () => {
      hotkeyProcess = null;
    });
  } catch {
    hotkeyProcess = null;
  }
}

function stopHotkeyListener() {
  if (hotkeyProcess) {
    try {
      hotkeyProcess.kill();
    } catch {
      // Process already closed
    }
    hotkeyProcess = null;
  }
}

async function handleMessage(message) {
  if (!message || typeof message !== "object") {
    sendNativeMessage({ type: "ERROR", error: "Invalid message payload: expected object" });
    return;
  }

  const { type, id } = message;

  switch (type) {
    case "PING": {
      sendNativeMessage({
        type: "PONG",
        id,
        version: COMPANION_VERSION,
        platform: process.platform,
        arch: process.arch,
        capabilities: [
          "uia_window_detect",
          "global_command_dispatch",
          "zero_latency_ipc",
          "fast_windows_uia",
          "win32_global_hotkeys",
          "hotkey_listener"
        ]
      });
      break;
    }

    case "GET_ACTIVE_WINDOW": {
      const activeWindow = await queryActiveWindow();
      sendNativeMessage({
        type: "ACTIVE_WINDOW_RESULT",
        id,
        window: activeWindow,
        timestamp: Date.now()
      });
      break;
    }

    case "GET_HOTKEY_STATUS": {
      sendNativeMessage({
        type: "HOTKEY_STATUS_RESULT",
        id,
        running: !!hotkeyProcess,
        registered: registeredHotkeys,
        timestamp: Date.now()
      });
      break;
    }

    case "START_HOTKEY_LISTENER": {
      startHotkeyListener();
      sendNativeMessage({
        type: "HOTKEY_LISTENER_STARTED",
        id,
        running: !!hotkeyProcess,
        timestamp: Date.now()
      });
      break;
    }

    case "STOP_HOTKEY_LISTENER": {
      stopHotkeyListener();
      sendNativeMessage({
        type: "HOTKEY_LISTENER_STOPPED",
        id,
        running: false,
        timestamp: Date.now()
      });
      break;
    }

    case "DISPATCH_COMMAND": {
      sendNativeMessage({
        type: "COMMAND_DISPATCHED",
        id,
        command: message.command,
        timestamp: Date.now()
      });
      break;
    }

    case "ECHO": {
      sendNativeMessage({
        type: "ECHO_REPLY",
        id,
        payload: message.payload
      });
      break;
    }

    default: {
      sendNativeMessage({
        type: "UNKNOWN_TYPE",
        id,
        receivedType: type
      });
      break;
    }
  }
}

function startCompanion() {
  let buffer = Buffer.alloc(0);

  // Auto-start background Win32 global hotkey listener on Windows
  startHotkeyListener();

  process.stdin.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const messageLength = buffer.readUInt32LE(0);
      if (buffer.length < 4 + messageLength) {
        break;
      }

      const messageContent = buffer.subarray(4, 4 + messageLength);
      buffer = buffer.subarray(4 + messageLength);

      try {
        const json = JSON.parse(messageContent.toString("utf8"));
        handleMessage(json).catch((err) => {
          sendNativeMessage({ type: "ERROR", error: err?.message || String(err) });
        });
      } catch (parseErr) {
        sendNativeMessage({ type: "ERROR", error: "JSON parse error: " + parseErr.message });
      }
    }
  });

  const cleanupAndExit = () => {
    stopHotkeyListener();
    process.exit(0);
  };

  process.stdin.on("end", cleanupAndExit);
  process.on("exit", stopHotkeyListener);
  process.on("SIGINT", cleanupAndExit);
  process.on("SIGTERM", cleanupAndExit);
}

startCompanion();
