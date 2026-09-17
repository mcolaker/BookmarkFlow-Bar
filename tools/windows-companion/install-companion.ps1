# BookmarkFlow Bar - Windows Companion Installer (User Level - No Admin Required)
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $scriptDir "com.bookmarkflow.companion.json"

if (-not (Test-Path $manifestPath)) {
    Write-Error "Manifest not found at $manifestPath"
    exit 1
}

$targets = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bookmarkflow.companion",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bookmarkflow.companion"
)

foreach ($keyPath in $targets) {
    if (-not (Test-Path $keyPath)) {
        New-Item -Path $keyPath -Force | Out-Null
    }
    Set-ItemProperty -Path $keyPath -Name "(default)" -Value $manifestPath
    Write-Host "Registered: $keyPath -> $manifestPath"
}

Write-Host "BookmarkFlow Windows Companion successfully installed for Chrome and Edge!"
