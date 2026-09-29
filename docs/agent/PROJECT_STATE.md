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

- **Birim ve Sözleşme Testleri**: `npm test` -> 93/93 PASS (%100 yeşil).
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
8. **Yerel Niyet ve Akıllı Yönlendirme Motoru ile Canlı Rozetler (BF-UX-017)**: `BookmarkIntentRoutingEngine` (6 kategori: link, komut, etiket, klasör, sekme, arama) ve canlı akıllı yönlendirme rozetleri.
9. **Site Kontrolü, MV3 Ayarlar Güvenliği, Inline Kaydet/Düzenle, URL Doğrulama ve Canlı Klasör Çipleri (BF-UX-018)**: Güvenli MV3 ayarlar açılışı (`BF_OPEN_SETTINGS`), arama kutusunda `[⭐ Kaydet]` / `[✏️ Düzenle]` butonu, `Ctrl+S` kısayolu, `Ctrl+Z` / `[Geri Al]` geri yükleme ve amber parıltı, Escape temizliğini geri alma (`queryRestoredToast`), düzenleme modunda URL kilidini açma butonu (`#addUrlUnlockBtn`), otomatik protokol tamamlama (`https://`) ve URL hata çerçevesi (`.is-invalid-url`), arama kartında mevcut klasör adı ve canlı klasör taşıma çipleri (`[⭐ Çubuğa Taşı]`, `[📁 Klasöre Taşı]`, `[✏️ Düzenle]`), mini klasör seçici çipi (`[📁▾]`, `.is-folder-picker-chip`) ve açılır menüsü (`.nt-folder-picker-menu`, `.bf-folder-picker-menu`), `BF_MOVE_TO_FOLDER` mesajlaşması ve `previousParentId` ile eski klasöre geri alma desteği.
10. **Yapay Zeka Otonom Video İnisiyatifi, Otomatik Dinamik Yüzey Denetimi ve Canlı Yolculuk Donanımsal Çerçeve Sayacı (BF-QA-004)**: Yapay zeka asistanının kullanıcıdan komut beklemeden dinamik yüzeylerde (çubuk açılışı, Spotlight paleti, New Tab efektleri, 60 FPS akıcılık ve jank denetimi) otonom olarak `scripts/inspect-motion-qa.mjs` (`npm run qa:motion` / `npm run qa:motion:auto`) çalıştırabilmesi; canlı kullanıcı yolculuğu (`scripts/user-journey-live-qa.mjs`) simülasyonunda Chromium CDP `Performance.enable` ve `Animation.enable` ile `requestAnimationFrame` + `performance.now()` mikro-monitörü ve `droppedFrames > 2` eşiğinde otonom Agentic Video QA tetikleme kancası; statik ve dinamik yüzeylerin ayrılması, otomatik kusur saklama (`live_motion_qa_<surface>_<timestamp>_issue.webm`) ve auto-purge yaşam döngüsü.
11. **Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (BF-GOV-011 / Karar 20)**: Yapay zeka asistanının Chrome DevTools (Shadow DOM kapalı izolasyon teftişi, CSS/layout hata ayıklama, konsol/ağ ve bellek sızıntısı analizi), Modern Web Guidance (web standartları, MV3 mimarisi, CSS optimizasyonu, a11y) ve Gemini API (multimodal/video akıcılık denetimi) araçlarını kullanıcının açık komut vermesini beklemeden kendi inisiyatifiyle tam otonom yönetebilmesi ve optimizasyonları proaktif olarak uygulayabilmesi.

---

## 4. Aktif Sınırlar ve Bilinen Kısıtlamalar

- **Chrome Omnibox Bildirimi**: Chrome adres çubuğundan `bf <url>` ile ekleme yapıldığında sayfa DOM'una erişilemediği için aktif sekmeye hafif runtime mesajı iletimi ilerleyen fazda genişletilebilir.
- **Masaüstü Companion Kurulumu**: Windows Companion kullanıcı tarafından `tools/windows-companion/install-companion.ps1` ile tek seferlik kayıt gerektirir.
