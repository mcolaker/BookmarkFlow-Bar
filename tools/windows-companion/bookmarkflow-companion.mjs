import { execFile } from "node:child_process";
import process from "node:process";

const COMPANION_VERSION = "0.1.0";

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
          "fast_windows_uia"
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

  process.stdin.on("end", () => {
    process.exit(0);
  });
}

startCompanion();
