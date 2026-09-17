# BookmarkFlow Bar - Fast Windows UIA Desktop Companion

The **Fast Windows UIA Companion** is a lightweight, zero-dependency native messaging host bridging the BookmarkFlow Bar browser extension with the Windows desktop operating system.

---

## Capabilities

1. **Win32 Global Hotkey Engine (`RegisterHotKey`)**:
   - Registers system-wide global hotkeys with `MOD_NOREPEAT` flag:
     - `Win+Shift+B`: Toggle BookmarkFlow Bar (`GLOBAL_TOGGLE_BAR`)
     - `Win+Shift+K`: Open Spotlight Command Palette (`GLOBAL_OPEN_SEARCH`)
     - `Win+Alt+S` / `Win+Shift+S`: Stash Open Tabs (`GLOBAL_STASH_TABS`)
   - Operates even when the browser is unfocused, minimized, or in the background.
   - Built-in watchdog guarantees zero orphan background processes when Chrome/Node exits.
2. **System Tray Icon & Quick Manager (`companion-tray.ps1`)**:
   - Visual presence in the Windows taskbar notification area.
   - Right-click context menu shows active shortcuts, allows one-click hotkey pausing/resuming, and opens extension settings.
3. **Customizable Global Hotkeys (`UPDATE_HOTKEYS`)**:
   - Dynamic in-memory hotkey reconfiguration directly from the browser extension settings.
   - Fail-safe conflict detection and zero-delay rebinding.
4. **Fast Windows UIA Window Inspector (`GET_ACTIVE_WINDOW`)**:
   - Queries the active foreground window, window title, process ID, and process name across Windows.
   - Enables the browser extension to detect when users are working in IDEs, office suites, or secondary browser instances.
5. **Global Command Dispatcher (`DISPATCH_COMMAND`)**:
   - Forwards desktop-level triggers directly into the active browser extension via Chrome Native Messaging.
6. **Zero-Latency Binary IPC**:
   - Communicates strictly via standard input/output (STDIN/STDOUT) using 32-bit native length-prefixed JSON messages conforming to the Chrome/Edge Native Messaging specification.
7. **100% Local-First & Private**:
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
