# Copyright 2026 BookmarkFlow Bar Authors
# SPDX-License-Identifier: Apache-2.0
#
# Fast Windows UIA - Win32 Global Hotkey Listener
# Registers Win+Shift+B, Win+Shift+K, Win+Shift+S and outputs JSON events to stdout.

param(
    [int]$ParentPid = 0
)

$ErrorActionPreference = 'SilentlyContinue'

$source = @'
using System;
using System.Runtime.InteropServices;

public class WinHotKey {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    [DllImport("user32.dll")]
    public static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

    [DllImport("user32.dll")]
    public static extern bool PostQuitMessage(int nExitCode);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MSG {
        public IntPtr hwnd;
        public uint message;
        public UIntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public POINT pt;
    }
}
'@

if (-not ([System.Management.Automation.PSTypeName]'WinHotKey').Type) {
    Add-Type -TypeDefinition $source -Language CSharp | Out-Null
}

# Modifiers:
# MOD_ALT = 0x0001, MOD_CONTROL = 0x0002, MOD_SHIFT = 0x0004, MOD_WIN = 0x0008, MOD_NOREPEAT = 0x4000
$MOD_WIN_SHIFT_NOREPEAT = 0x400C
$MOD_WIN_ALT_NOREPEAT = 0x4009

$hotkeyCandidates = @(
    @{ id = 1; key = 'B'; mod = $MOD_WIN_SHIFT_NOREPEAT; vk = 0x42; hotkey = 'Win+Shift+B'; command = 'GLOBAL_TOGGLE_BAR' },
    @{ id = 2; key = 'K'; mod = $MOD_WIN_SHIFT_NOREPEAT; vk = 0x4B; hotkey = 'Win+Shift+K'; command = 'GLOBAL_OPEN_SEARCH' },
    @{
        id = 3;
        command = 'GLOBAL_STASH_TABS';
        attempts = @(
            @{ key = 'S'; mod = $MOD_WIN_SHIFT_NOREPEAT; vk = 0x53; hotkey = 'Win+Shift+S' },
            @{ key = 'S'; mod = $MOD_WIN_ALT_NOREPEAT; vk = 0x53; hotkey = 'Win+Alt+S' }
        )
    }
)

$registeredList = @()
$hotkeyMap = @{}

foreach ($item in $hotkeyCandidates) {
    if ($item.attempts) {
        $registered = $false
        foreach ($attempt in $item.attempts) {
            $success = [WinHotKey]::RegisterHotKey([IntPtr]::Zero, $item.id, $attempt.mod, $attempt.vk)
            if ($success) {
                $registered = $true
                $entry = @{
                    id = $item.id
                    hotkey = $attempt.hotkey
                    command = $item.command
                    mod = $attempt.mod
                    vk = $attempt.vk
                }
                $registeredList += $entry
                $hotkeyMap[$item.id] = $entry
                break
            }
        }
        if (-not $registered) {
            [PSCustomObject]@{
                type = 'HOTKEY_WARN'
                id = $item.id
                command = $item.command
                error = 'Failed to register stash tabs hotkey (candidates in use)'
            } | ConvertTo-Json -Compress
        }
    } else {
        $success = [WinHotKey]::RegisterHotKey([IntPtr]::Zero, $item.id, $item.mod, $item.vk)
        if ($success) {
            $entry = @{
                id = $item.id
                hotkey = $item.hotkey
                command = $item.command
                mod = $item.mod
                vk = $item.vk
            }
            $registeredList += $entry
            $hotkeyMap[$item.id] = $entry
        } else {
            [PSCustomObject]@{
                type = 'HOTKEY_WARN'
                id = $item.id
                hotkey = $item.hotkey
                command = $item.command
                error = "Failed to register $($item.hotkey) (already reserved by another app)"
            } | ConvertTo-Json -Compress
        }
    }
}

[PSCustomObject]@{
    type = 'HOTKEY_READY'
    registered = $registeredList
    count = $registeredList.Count
} | ConvertTo-Json -Compress

# Setup parent process watchdog to ensure zero orphan processes
if ($ParentPid -gt 0) {
    $timer = New-Object System.Timers.Timer
    $timer.Interval = 1000
    $timer.AutoReset = $true
    Register-ObjectEvent -InputObject $timer -EventName Elapsed -Action {
        $parent = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
        if (-not $parent -or $parent.HasExited) {
            [WinHotKey]::PostQuitMessage(0) | Out-Null
        }
    } | Out-Null
    $timer.Start()
}

try {
    $msg = New-Object WinHotKey+MSG
    # GetMessage returns true until WM_QUIT (0) is received
    while ([WinHotKey]::GetMessage([ref]$msg, [IntPtr]::Zero, 0, 0)) {
        if ($msg.message -eq 0x0312) { # WM_HOTKEY
            $triggeredId = $msg.wParam.ToInt32()
            $matched = $hotkeyMap[$triggeredId]
            if ($matched) {
                [PSCustomObject]@{
                    type = 'HOTKEY_TRIGGERED'
                    id = $triggeredId
                    hotkey = $matched.hotkey
                    command = $matched.command
                    timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                } | ConvertTo-Json -Compress
            }
        }
    }
} finally {
    # Cleanly unregister all successfully registered hotkeys on exit
    foreach ($h in $registeredList) {
        [WinHotKey]::UnregisterHotKey([IntPtr]::Zero, $h.id) | Out-Null
    }
}

