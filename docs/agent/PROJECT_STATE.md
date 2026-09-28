# PROJECT_STATE.md — BookmarkFlow Bar Canlı Proje Durumu

Son güncelleme: 2026-09-28
Aktif Sürüm: `0.2.1` (Sıradaki: `0.3.0` Taslağı)
Aktif Dal: `feature/link-capture-and-quick-folder-add-bf-ux-013`

---

## 1. Mimari Genel Bakış ve Platform Matrisi

BookmarkFlow Bar, modern tarayıcılar ve Windows masaüstü için geliştirilmiş, yerel-öncelikli (zero-cloud, offline-first), yüksek performanslı (<1ms tepki süresi) bir yer imi ve üretkenlik ekosistemidir.

| Platform / Bileşen | Mimari / Teknoloji | Durum / Doğrulama |
|---|---|---|
| **Google Chrome / Chromium** | Manifest V3, Service Worker, Closed Shadow DOM | Canlı & Tam Uyumlu |
| **Mozilla Firefox** | Gecko MV3 (`scripts/package-cross-browser.mjs`) | Doğrulandı (Zip derleme & SHA-256) |
| **Microsoft Edge** | Chromium MV3 uyumlu paket | Doğrulandı (Zip derleme & SHA-256) |
| **Windows Desktop Companion** | Node.js Native Messaging Host, Win32 `RegisterHotKey`, UIA | Doğrulandı (IPC testleri yeşil) |
| **Windows System Tray** | `System.Windows.Forms.NotifyIcon`, PowerShell 5.1/7+ | Doğrulandı (Sıfır yetim süreç) |

---

## 2. Test ve Kalite Durumu

- **Birim ve Sözleşme Testleri**: `npm test` -> 67/67 PASS (%100 yeşil).
- **Statik ve Açık Kaynak Doğrulama**: `npm run validate:all` -> PASS (Açık kaynak lisans, DCO, public tree, manifest, backlog sözleşmeleri temiz).
- **Biçim ve Satır Sonu**: `git diff --check` -> Sıfır hata (CRLF/LF normalize, EOF boş satırsız).
- **Gizli Veri Denetimi**: Sıfır API anahtarı, sıfır token, sıfır mutlak kullanıcı yolu.

---

## 3. Sürüm Taslağında Biriken Özellikler (`v0.3.0` Hazırlığı)

Kullanıcının talimatı doğrultusunda, yeni sürüm yayınlanana kadar PR açılmamakta ve ana dala (main) doğrudan merge yapılmamaktadır. Tüm yeni yetenekler `feature/link-capture-and-quick-folder-add-bf-ux-013` dalında güvenle biriktirilmektedir:

1. **Arama Çubuğundan Doğrudan Bağlantı Yakalama ve Klasör Seçici (BF-UX-013)**: URL girildiğinde Enter'a basınca sayfaya gitmek yerine önceden doldurulmuş ekleme diyaloğu açma ve `<select>` hiyerarşik klasör seçici.
2. **Akıllı Klasör Hafızası (`bfLastUsedFolderId`)**: Eklenen son hedef klasörün New Tab, Content Script ve Omnibox genelinde yerel olarak hatırlanması.
3. **Windows Desktop Companion & Küresel Kısayol Motoru (BF-WIN-001, BF-WIN-002)**: `Win+Shift+B` ile masaüstünden çubuğu tetikleme, sistem tepsisi menüsü ve eklenti ayarlarından dinamik kısayol özelleştirme.
4. **Sık Kullanılan Klasörler İçin Hızlı Çip Rozetleri (BF-UX-014)**: Ekleme diyaloglarında en çok kullanılan ilk 3 klasör için tek tıkla seçilebilir çip butonları (`.nt-folder-chip`, `.bf-folder-chip`).
5. **Arama Öneri Kartında Sıfır Adımlı Hızlı Klasör Ekleme Butonları (BF-UX-015)**: Arama kartı içinde doğrudan yer imi çubuğuna ve hedef klasöre kayıt yapan mini inline butonlar.
6. **Sıfır Adımlı Kayıt Sonrası Canlı Toast Geri Bildirimi (BF-UX-016)**: Hızlı çipten kayıt yapıldığında ekranın sağ üstünde 1.8 saniyelik altın çerçeveli (`#f2c94c`) hafif bildirim rozeti (`.nt-toast`, `.bf-toast`).
7. **JaponiGo Yönetişim ve Modüler Playbook Mimarisi (BF-GOV-010)**: Operating Kernel, Decision Index, Project State ve modüler el kitapları (`docs/agent-playbooks/`).

---

## 4. Aktif Sınırlar ve Bilinen Kısıtlamalar

- **Chrome Omnibox Bildirimi**: Chrome adres çubuğundan `bf <url>` ile ekleme yapıldığında sayfa DOM'una erişilemediği için aktif sekmeye hafif runtime mesajı iletimi ilerleyen fazda genişletilebilir.
- **Masaüstü Companion Kurulumu**: Windows Companion kullanıcı tarafından `tools/windows-companion/install-companion.ps1` ile tek seferlik kayıt gerektirir.
