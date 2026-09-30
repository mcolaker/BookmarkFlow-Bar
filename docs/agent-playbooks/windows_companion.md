# Windows Companion Playbook — BookmarkFlow Bar

Bu kılavuz, BookmarkFlow Bar Windows masaüstü companion uygulaması ve Win32 entegrasyonu mimarisinde kod geliştirirken uyulması gereken standartları tanımlar.

---

## 1. Native Messaging Host Mimarisi

- **Manifest Kaydı**: `tools/windows-companion/com.bookmarkflow.companion.json` dosyası `HKCU\Software\Google\Chrome\NativeMessagingHosts` altında kayıtlıdır.
- **İletişim Protokolü**: Chrome Native Messaging standardı olan 32-bit little-endian uzunluk öneki + JSON formatı (`STDOUT` / `STDIN`) kullanılır.
- **Sıfır Harici Bağımlılık**: Node.js yerel modülleri (`child_process`, `fs`, `path`) kullanılır; npm paketi eklenmez.

---

## 2. Win32 RegisterHotKey & Küresel Kısayol Dinleyicisi

- **Kısayol Süreci (`hotkey-listener.ps1`)**:
  - P/Invoke ile `user32.dll` içindeki `RegisterHotKey`, `UnregisterHotKey` ve `GetMessageW` API'leri çağrılır.
  - Dinlenen varsayılan kısayollar: `Win+Shift+B` (GLOBAL_TOGGLE_BAR), `Win+Shift+K` (GLOBAL_OPEN_SEARCH), `Win+Alt+S` (GLOBAL_STASH_TABS).
  - Tetiklenen kısayol anında stdout üzerinden `DISPATCH_COMMAND` ile Node.js sürecine ve oradan Chrome'a iletilir.
- **Dinamik Yeniden Yapılandırma**:
  - Eklenti ayarlarından gelen yeni kombinasyonlar `UPDATE_HOTKEYS` IPC komutuyla alt sürece aktarılır ve çalışma zamanında yeniden kaydedilir.
- **Sıfır Yetim Süreç (Zero Orphan Processes)**:
  - Companion veya Chrome kapandığında `beforeExit` ve `SIGINT/SIGTERM` kancaları alt PowerShell süreçlerini (`Stop-Process`) tamamen temizler. Yetim süreç bırakılamaz.

---

## 3. Sistem Tepsisi Göstergesi (Quick Tray Icon)

- **Tepsi Süreci (`companion-tray.ps1`)**:
  - `System.Windows.Forms.NotifyIcon` ve `ContextMenuStrip` kullanılır.
  - Menü eylemleri: Durum Bilgisi, Kısayolları Duraklat/Devam Et (`PAUSE_HOTKEYS` / `RESUME_HOTKEYS`), Ayarları Aç (`OPEN_SETTINGS`), Çıkış (`EXIT_COMPANION`).

---

## 4. Doğrulama ve Entegrasyon Testleri

- Masaüstü companion ile ilgili her değişiklik sonrası `node tools/windows-companion/test-companion-ipc.mjs` çalıştırılır.
- PING/PONG el sıkışması, IPC komut iletimi ve RegisterHotKey kayıtları doğrulanmadan görev tamamlanmış sayılmaz.
