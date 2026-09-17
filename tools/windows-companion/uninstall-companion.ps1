# BookmarkFlow Bar - Windows Companion Uninstaller
$ErrorActionPreference = "SilentlyContinue"

$targets = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.bookmarkflow.companion",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.bookmarkflow.companion"
)

foreach ($keyPath in $targets) {
    if (Test-Path $keyPath) {
        Remove-Item -Path $keyPath -Recurse -Force | Out-Null
        Write-Host "Removed: $keyPath"
    }
}

Write-Host "BookmarkFlow Windows Companion successfully uninstalled."
