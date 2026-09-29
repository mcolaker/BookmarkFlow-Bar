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

- **Birim ve Sözleşme Testleri**: `npm test` -> 99/99 PASS (%100 yeşil).
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
12. **Canlı Yüksek Kontrast (Forced Colors) Erişilebilirliği ve Tüm Yüzeylerde Tasarım Değişkenleri Yaygınlaştırması (BF-GOV-012, BF-GOV-013)**: Windows ve modern tarayıcıların yüksek kontrast (`@media (forced-colors: active)`) erişilebilirlik modunda `Canvas`, `CanvasText`, `Highlight`, `ButtonBorder` sistem renklerinin `src/design-tokens.css` içinde otomatik devreye girmesi; Spotlight ve Komut Paleti için modüler `src/spotlight.css`, Ayarlar & Bakım Merkezi için modüler `src/settings.css`, ve İlk Kurulum Sihirbazı (`src/onboarding.css`, `src/onboarding.html`) dahil tüm yüzeylerde (`content.css`, `newtab.css`, `popup.css`, `spotlight.css`, `settings.css`, `onboarding.css`) tek kaynaktan altın-obsidyen tasarım değişkeni senkronizasyonu.
13. **Sayfa İçi Çubuğu Gizle (Alt + Shift + H) Tam Gizleme ve Geri Getirme Yaşam Döngüsü (BF-UX-019)**: Kullanıcı bağlam menüsünden veya `Alt+Shift+H` kısayolu ile çubuğu gizlediğinde ekranda artık hiçbir buton veya rozet kalmaması (`:host([hidden])`, `:host(.is-snoozed)`, sayfa kaydırma ofsetinin sıfırlanması), gizleme anında 2 saniyelik rehberlik eden altın çerçeveli toast (`✓ BookmarkFlow gizlendi (Geri getirmek için: Alt + Shift + H)`), `Alt+Shift+H`, `Alt+Shift+B` veya `Alt+Shift+K` kısayollarıyla anında restorasyon ve `✓ BookmarkFlow geri getirildi` teyidi; popup arayüzünde sekme gizlenme durumunun canlı tespiti.
14. **Popup Menüsünde Tek Tıkla 'Çubuğu Göster' Butonu Entegrasyonu (BF-UX-020)**: Popup açıldığında aktif sekmede çubuk gizlenmişse (`activePage.snoozed === true`) doğrudan çalışan tek tıkla `[👁️ Çubuğu Göster]` (`#restoreBarBtn`, `.site-restore-btn`) eylem butonu, tıklandığında `BF_RUN_COMMAND` ("hide-restore") ile çubuğun anında geri gelmesi, durum metninin güncellenmesi ve butonun gizlenmesi; yüksek kontrast forced-colors desteği.
15. **Ekran Kenarı Minimalist Geri Getirme Tutamacı (Edge Peek Strip - BF-UX-021)**: Çubuk gizlendiğinde ekranın en sağ sınırında normalde %100 şeffaf, yalnızca fare ekranın sıfır piksel kenarına dayandığında çok hafif altın ışıltısıyla beliren 3 piksellik mikro bir dokunma çizgisi (`.bf-edge-restore`), tıklandığında çubuğun anında geri gelmesi, `getPageInfo` `edgeRestoreActive` teftişi ve yüksek kontrast desteği.
16. **Sayfa İçi Çubuk Gizlendiğinde Popup İkonuna Geçici Mikro Rozet (Snooze Badge Indicator - BF-UX-022)**: Çubuk gizlendiğinde aktif sekmeye özel olarak tarayıcı araç çubuğundaki eklenti simgesi üzerine hafif bir gri/altın mikro rozet (`chrome.action.setBadgeText({ text: "off", tabId })`, `setBadgeBackgroundColor({ color: "#2d3748" })`, `setBadgeTextColor({ color: "#f2c94c" })`) yerleştirilmesi, çubuk geri açıldığında (`text: ""`) rozetin temizlenmesi; sekmeler arası tam izolasyon ve canlı kullanıcı yolculuğu teftişi.

---

## 4. Aktif Sınırlar ve Bilinen Kısıtlamalar

- **Chrome Omnibox Bildirimi**: Chrome adres çubuğundan `bf <url>` ile ekleme yapıldığında sayfa DOM'una erişilemediği için aktif sekmeye hafif runtime mesajı iletimi ilerleyen fazda genişletilebilir.
- **Masaüstü Companion Kurulumu**: Windows Companion kullanıcı tarafından `tools/windows-companion/install-companion.ps1` ile tek seferlik kayıt gerektirir.
