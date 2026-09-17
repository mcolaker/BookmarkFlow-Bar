# BookmarkFlow Bar - Fast Windows UIA Desktop Companion

The **Fast Windows UIA Companion** is a lightweight, zero-dependency native messaging host bridging the BookmarkFlow Bar browser extension with the Windows desktop operating system.

---

## Capabilities

1. **Fast Windows UIA Window Inspector (`GET_ACTIVE_WINDOW`)**:
   - Queries the active foreground window, window title, process ID, and process name across Windows.
   - Enables the browser extension to detect when users are working in IDEs, office suites, or secondary browser instances.
2. **Global Command Dispatcher (`DISPATCH_COMMAND`)**:
   - Forwards desktop-level triggers (such as `GLOBAL_TOGGLE_BAR` or `GLOBAL_STASH_TABS`) directly into the active browser extension.
3. **Zero-Latency Binary IPC**:
   - Communicates strictly via standard input/output (STDIN/STDOUT) using 32-bit native length-prefixed JSON messages conforming to the Chrome/Edge Native Messaging specification.
4. **100% Local-First & Private**:
   - Zero telemetry, zero external network requests, zero background cloud dependencies.

---

## Installation (Windows - No Administrator Required)

Run the PowerShell installer from this directory:

```powershell
.\install-companion.ps1
```

This registers `com.bookmarkflow.companion` under your current user registry:
- `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bookmarkflow.companion`
- `HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bookmarkflow.companion`

To uninstall:
```powershell
.\uninstall-companion.ps1
```

---

## Verification & Testing

Run the automated IPC integration test to verify the handshake and UIA inspector:

```bash
node test-companion-ipc.mjs
```
