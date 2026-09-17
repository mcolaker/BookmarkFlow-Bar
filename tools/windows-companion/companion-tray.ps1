# Copyright 2026 BookmarkFlow Bar Authors
# SPDX-License-Identifier: Apache-2.0
#
# Fast Windows UIA - System Tray Icon and Quick Management Menu
# Provides taskbar notification area presence and control for BookmarkFlow Companion.

param(
    [int]$ParentPid = 0,
    [string]$IconPath = "",
    [string]$ToggleHotkey = "Win+Shift+B",
    [string]$SearchHotkey = "Win+Shift+K",
    [string]$StashHotkey = "Win+Alt+S"
)

$ErrorActionPreference = 'SilentlyContinue'

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Setup Icon from repository assets or system fallback
$iconLoaded = $false
if ($IconPath -and (Test-Path $IconPath)) {
    try {
        $bmp = [System.Drawing.Bitmap]::FromFile($IconPath)
        $hIcon = $bmp.GetHicon()
        $notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($hIcon)
        $iconLoaded = $true
    } catch {
        $iconLoaded = $false
    }
}
if (-not $iconLoaded) {
    $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
}

$notifyIcon.Text = "BookmarkFlow Bar Companion"
$notifyIcon.Visible = $true

# Header Item (Title & Version)
$headerItem = New-Object System.Windows.Forms.ToolStripMenuItem
$headerItem.Text = "📌 BookmarkFlow Companion (Active)"
$headerItem.Enabled = $false
$contextMenu.Items.Add($headerItem) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Shortcut Status Items
$itemToggle = New-Object System.Windows.Forms.ToolStripMenuItem
$itemToggle.Text = "Toggle Bar: $ToggleHotkey"
$itemToggle.Enabled = $false
$contextMenu.Items.Add($itemToggle) | Out-Null

$itemSearch = New-Object System.Windows.Forms.ToolStripMenuItem
$itemSearch.Text = "Spotlight: $SearchHotkey"
$itemSearch.Enabled = $false
$contextMenu.Items.Add($itemSearch) | Out-Null

$itemStash = New-Object System.Windows.Forms.ToolStripMenuItem
$itemStash.Text = "Stash Tabs: $StashHotkey"
$itemStash.Enabled = $false
$contextMenu.Items.Add($itemStash) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Pause / Resume Item
$itemPause = New-Object System.Windows.Forms.ToolStripMenuItem
$itemPause.Text = "⏸ Pause Global Hotkeys"
$isPaused = $false
$itemPause.Add_Click({
    $script:isPaused = -not $script:isPaused
    if ($script:isPaused) {
        $itemPause.Text = "▶ Resume Global Hotkeys"
        $headerItem.Text = "⏸ BookmarkFlow Companion (Paused)"
        [PSCustomObject]@{ type = "TRAY_ACTION"; action = "PAUSE_HOTKEYS" } | ConvertTo-Json -Compress
    } else {
        $itemPause.Text = "⏸ Pause Global Hotkeys"
        $headerItem.Text = "📌 BookmarkFlow Companion (Active)"
        [PSCustomObject]@{ type = "TRAY_ACTION"; action = "RESUME_HOTKEYS" } | ConvertTo-Json -Compress
    }
})
$contextMenu.Items.Add($itemPause) | Out-Null

# Open Settings
$itemSettings = New-Object System.Windows.Forms.ToolStripMenuItem
$itemSettings.Text = "⚙ Open Extension Settings"
$itemSettings.Add_Click({
    [PSCustomObject]@{ type = "TRAY_ACTION"; action = "OPEN_SETTINGS" } | ConvertTo-Json -Compress
})
$contextMenu.Items.Add($itemSettings) | Out-Null

$contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

# Exit Item
$itemExit = New-Object System.Windows.Forms.ToolStripMenuItem
$itemExit.Text = "❌ Exit Companion"
$itemExit.Add_Click({
    [PSCustomObject]@{ type = "TRAY_ACTION"; action = "EXIT" } | ConvertTo-Json -Compress
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    [System.Windows.Forms.Application]::Exit()
    exit 0
})
$contextMenu.Items.Add($itemExit) | Out-Null

$notifyIcon.ContextMenuStrip = $contextMenu

# Emit ready signal to parent
[PSCustomObject]@{
    type = "TRAY_READY"
    version = "0.2.0"
    visible = $true
} | ConvertTo-Json -Compress

# Watchdog timer to exit cleanly when parent dies
if ($ParentPid -gt 0) {
    $watchdogTimer = New-Object System.Windows.Forms.Timer
    $watchdogTimer.Interval = 1000
    $watchdogTimer.Add_Tick({
        $parent = Get-Process -Id $ParentPid -ErrorAction SilentlyContinue
        if (-not $parent -or $parent.HasExited) {
            $watchdogTimer.Stop()
            $notifyIcon.Visible = $false
            $notifyIcon.Dispose()
            [System.Windows.Forms.Application]::Exit()
            exit 0
        }
    })
    $watchdogTimer.Start()
}

# Run message loop
try {
    [System.Windows.Forms.Application]::Run()
} finally {
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
}
