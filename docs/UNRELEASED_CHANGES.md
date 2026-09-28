# Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log)

Bu dosya, bir sonraki sürüme dahil edilecek tüm yeni özellikleri, kullanıcı deneyimi iyileştirmelerini, mimari geliştirmeleri ve hata düzeltmelerini kayıt altında tutar.

> **Sürüm Hazırlık Standardı Kuralı**:
> Kullanıcı "yeni sürümü oluşturalım" dediğinde veya "bu sürümde neler yaptık?" diye sorduğunda, doğrudan bu dosyadaki doğrulanmış maddeler kullanılır. Sürüm yayınlandığında buradaki maddeler `CHANGELOG.md` dosyasına taşınır ve bu dosya yeni sürüm döngüsü için sıfırlanır.

---

## [Sıradaki Sürüm / Unreleased] — Hazırlık Aşamasında

### 🌟 1. Arama Çubuğundan Doğrudan Bağlantı Yakalama ve Klasör Seçici (BF-UX-013)
- **Arama Çubuğunda URL Algılama ve Akıllı Yönlendirme**:
  - Yeni Sekme (New Tab) arama çubuğuna bir internet adresi (URL veya domain) yazıldığında, `Enter` tuşuna basıldığında doğrudan linke gidip sayfayı açmak yerine kullanıcı dostu Yer İmi Ekleme paneli (`#addDialog`) tetiklenir.
  - Arama sonuç listesinde URL girildiğinde ilk sırada **"⭐ Bu Bağlantıyı Yer İmlerine Ekle"** aksiyonu, ikinci sırada ise **"🌐 Web Sayfasını Yeni Sekmede Aç"** seçeneği sunulur. Klavye ok tuşlarıyla ikisi arasında anında geçiş yapılabilir.
- **Dinamik Hiyerarşik Klasör Seçici (`<select>` Dropdown)**:
  - Hem Yeni Sekme hem de sayfa içi (In-Page Shadow DOM) yer imi ekleme diyaloglarına tam hiyerarşik klasör seçici eklendi (`#addFolderSelect` ve `.bf-add-select`).
  - Kullanıcı yer imi çubuğundaki ana dizini veya alt klasörleri (`📁 Klasör / Alt Klasör`) açılır listeden tek tıkla seçerek yer imini dilediği konuma kaydedebilir.
- **Sayfa İçi Command Palette Bağlantı Eylemi (`Alt+Shift+K`)**:
  - Gezinilen herhangi bir web sitesinde `Alt+Shift+K` ile açılan hızlı arama paletine link yapıştırıldığında, doğrudan yer imlerine ve seçili klasöre kaydetme eylem kartı görüntülenir.
- **Chrome Omnibox / Adres Çubuğu Entegrasyonu (`bf <url>`)**:
  - Chrome'un üst adres çubuğuna `bf` yazıp `Tab` veya `Boşluk` tuşuna basıldığında BookmarkFlow Bar omnibox modu devreye girer.
  - Adres çubuğuna bir bağlantı yazıldığında, sayfaya gitmeden arka planda yer imi çubuğuna veya alt klasörlere tek tuşla ekleme önerileri listelenir ve doğrudan kaydedilir.
- **İki Dilli Yerelleştirme**:
  - `_locales/en` ve `_locales/tr` sözlüklerine 11 yeni anahtar eklenerek tüm arayüz metinleri Türkçe ve İngilizce olarak eksiksiz sağlandı.

### 🧠 2. Akıllı Klasör Hafızası (Smart Folder Memory)
- **Son Kullanılan Klasörü Hatırlama**:
  - Kullanıcı yer imi eklerken hangi klasörü seçtiyse, bu tercih yerel ve güvenli olarak `chrome.storage.local` üzerindeki `bfLastUsedFolderId` anahtarına kaydedilir.
  - Bir sonraki bağlantı veya yer imi ekleme işleminde (Yeni Sekme, Sayfa İçi Ekleme Paneli veya Chrome Omnibox), son kullanılan klasör otomatik olarak seçili gelir.
  - Kullanıcının aynı proje veya kategori için art arda yer imi eklerken her seferinde klasör ağacını baştan araması engellendi, iş akışı ciddi oranda hızlandırıldı.

### 💻 3. Windows Desktop Companion & Küresel Kısayol Motoru
- **Sistem Geneli Global Kısayol Dinleyicisi (`Win+Shift+B`)**:
  - Chrome arka plandayken, simge durumundayken veya kullanıcı başka bir Windows uygulamasında çalışırken bile masaüstünden doğrudan çubuğu tetikleyebilen Win32 `RegisterHotKey` kancası.
- **Windows Sistem Tepsisi (Quick System Tray) Göstergesi**:
  - Companion durumunu gösteren, sağ tıkla kısayolları duraklatıp açmaya olanak tanıyan hafif sistem tepsisi menüsü.
- **Özelleştirilebilir Kısayol Ayarları**:
  - Eklenti Ayarlar sayfasından Windows Companion kısayolunun tuş kombinasyonunu dinamik olarak değiştirebilme imkanı.

### ⚡ 4. Sık Kullanılan Klasörler İçin Hızlı Çip Rozetleri (Quick Folder Chips - BF-UX-014)
- **Tek Tıkla Klasör Seçimi (Chips)**:
  - Hem Yeni Sekme hem de Sayfa İçi yer imi ekleme diyaloglarında hedef klasör dropdown'unun hemen altında en çok kullanılan ve sabitlenen klasörler kompakt çip rozetleri (`[⭐ Çubuk] [📁 Klasör 1] [📁 Klasör 2]`) olarak listelenir.
  - Kullanıcı dropdown açmaya gerek kalmadan tek tıkla hedef klasörü değiştirebilir.
  - Seçilen çip altın vurgu (`#f2c94c`) ve `is-active` durumu kazanır; aynı zamanda `<select>` açılır kutusu ve `bfLastUsedFolderId` hafızası ile çift yönlü olarak senkronize çalışır.

### 🚀 5. Arama Öneri Kartında Sıfır Adımlı Hızlı Klasör Ekleme Butonları (Instant Folder Save Chips - BF-UX-015)
- **Doğrudan Arama Kartından Kayıt**:
  - Yeni Sekme arama kutusuna veya sayfa içi Spotlight (`Alt+Shift+K`) paletine bir web adresi yazıldığında beliren "⭐ Yer İmlerine Ekle" kartının içerisine mini inline eylem butonları (`[⭐ Çubuğa Ekle] [📁 Klasöre Ekle]`) yerleştirildi.
  - Kullanıcı bu butonlara tıkladığında ekleme diyaloğu dahi açılmadan arka planda tek tıkla ("zero-click") yer imi hedef klasöre kaydedilir, arama kutusu temizlenir ve arayüz güncellenir.
  - Kartın gövdesine tıklandığında ise tüm detayları düzenlemek isteyen kullanıcılar için standart diyalog açılmaya devam eder.

### 🔔 6. Sıfır Adımlı Kayıt Sonrası Canlı Toast Geri Bildirimi (Instant Toast Feedback - BF-UX-016)
- **Hafif ve Mikro Görsel Teyit (Toast Notification)**:
  - Arama öneri kartındaki hızlı kaydetme çipine basılıp yer imi arka planda kaydedildiğinde, kullanıcının göz ucuyla kaydı teyit edebilmesi için ekranın sağ üst köşesinde 1.8 saniyelik altın çerçeveli (`#f2c94c`), bulanık lacivert zeminli zarif bir bildirim rozeti belirir.
  - Toast mesajı dinamik olarak hedef klasörün adını içerir (örneğin: `"✓ Yer İmleri Çubuğuna kaydedildi"` veya `"✓ İş klasörüne kaydedildi"`).
  - Süre dolduğunda yumuşak bir dikey kayma ve kaybolma animasyonuyla (`.is-leaving`) kendiliğinden kapanır.
  - Hem Yeni Sekme sayfasında (`.nt-toast`) hem de sayfa içi Spotlight / Content Script Shadow DOM yapısında (`.bf-toast`) tam izole ve erişilebilir (`role="status"`, `aria-live="polite"`) olarak çalışır.
- **İki Dilli Yerelleştirme**:
  - `_locales/en` ve `_locales/tr` sözlüklerine `bookmarkSavedToBarToast` ve parametrik `bookmarkSavedToFolderToast` anahtarları eklendi.

### 🏛️ 7. JaponiGo Yönetişim & Modüler Playbook Mimarisi (BF-GOV-010)
- **Operating Kernel (`AGENTS.md`)**:
  - Proje anayasası tok bir işletim çekirdeğine dönüştürüldü; bağlam tüketimi optimize edildi. P0 tavizsiz kuralları, Task Router ve zorunlu nihai rapor şablonu bağlandı.
- **Kalıcı Mimari Bellek (`docs/agent/`)**:
  - `DECISION_INDEX.md` (16 kalıcı mimari ve ürün kararı), `PROJECT_STATE.md` (canlı mimari durum) ve `RULE_CHANGELOG.md` oluşturuldu.
- **Modüler Playbook'lar (`docs/agent-playbooks/`)**:
  - Göreve göre yüklenen 6 bağımsız el kitabı (`browser_extension.md`, `windows_companion.md`, `ui_accessibility.md`, `security_privacy.md`, `release_distribution.md`, `rule_governance.md`) kuruldu.
- **Bütünsel İkincil İyileştirme Standardı (Proactive Holistic QA - P0-11)**:
  - Ziyaret edilen her arayüzde layout, kontrast, klavye odağı ve taşma kusurlarının anında yerinde onarılması kurala bağlandı.
- **Zorunlu Birebir Ham Konsol Kanıtı (Verbatim Terminal Output)**:
  - Nihai raporlarda özetleme yasaklanarak `npm test`, `validate:all` ve `git diff --check` çıktılarının ham kod bloklarında sunulması zorunlu kılındı.
- **Yönetişim Otomasyonu**:
  - `scripts/validate-governance.mjs` ve `scripts/governance-contract.test.mjs` test kapıları eklendi.

### ⚡ 8. Yerel Niyet ve Akıllı Yönlendirme Motoru ile Canlı Akıllı Rozetler (BF-UX-017)
- **Sıfır Gecikmeli Niyet Motoru (`src/intent-router.js`)**:
  - JaponiGo'nun yerel sıfır gecikmeli kural motoru BookmarkFlow Bar'a `BookmarkIntentRoutingEngine` olarak uyarlandı.
  - Arama çubuğu (`src/newtab.js`) ve Spotlight paletine (`src/content.js`) girilen tüm girdiler, harici hiçbir uzak sunucuya bağlanmadan milisaniyeler içinde 6 niyet kategorisine (`url`, `command`, `tag`, `folder`, `open_tab`, `search`) sınıflandırılır.
- **Canlı Akıllı Yönlendirme Rozetleri (Smart Routing Badges)**:
  - Kullanıcı henüz `Enter`'a basmadan önce arama kutusunun sağında hafif ve modern bir hap rozet belirir (`.nt-intent-badge`, `.bf-intent-badge`):
    - `[🌐 Bağlantı Modu]` (`.is-url`): URL tespit edildiğinde link yakalama kartı ve hızlı klasör çipleri hazır edilir.
    - `[⚡ Komut Modu]` (`.is-command`): `#stash`, `health`, `#reading`, `backup`, `settings` yazıldığında BookmarkFlow fonksiyon eylem kartı çıkar.
    - `[🏷️ Etiket Modu]` (`.is-tag`): `#dev`, `#tasarim` gibi etiket sorgularında yer imleri filtrelenir.
    - `[📁 Klasör Modu]` (`.is-folder`): `folder:iş`, `klasör:proje` veya mevcut bir klasör adı yazıldığında o klasörün içi hiyerarşik listelenir.
    - `[🗂️ Sekme Modu]` (`.is-tab`): `tab:github`, `sekme:youtube` ile açık sekmeler taranır ve tek tıkla sekmeye geçiş sağlanır.
    - `[🔍 Akıllı Arama]` (`.is-search`): Genel akıllı arama modu.
- **Son Kullanıcı Terminolojisi Hijyeni (P0-13)**:
  - Arayüzde asla "AI", "JEV" gibi teknik ibareler gösterilmez; kullanıcıya daima "Akıllı Arama", "Akıllı Yönlendirme" ve "Bağlantı Modu" gibi doğal ürün dili sunulur.
- **İki Dilli Yerelleştirme**:
  - `_locales/en` ve `_locales/tr` sözlüklerine 6 yeni niyet anahtarı (`intentLinkMode`, `intentCommandMode`, `intentTagMode`, `intentFolderMode`, `intentTabMode`, `intentSearchMode`) tam pariteyle eklendi.

---

### 📋 Etkilenen Dosyalar ve Bileşenler
- `manifest.json`: Omnibox `bf` anahtar kelimesi ve `content_scripts` içine `src/intent-router.js` eklendi.
- `src/intent-router.js`: Evrensel yerel niyet sınıflandırma motoru (`BookmarkIntentRoutingEngine`).
- `src/newtab.html`, `src/newtab.css`, `src/newtab.js`: Arama yakalama, arama içi hızlı kayıt çipleri (`.nt-search-action-chips`), klasör dropdown'u, hızlı klasör çipleri (`#addFolderChips`), anlık bildirim rozeti (`.nt-toast`, `showToastNotification`), akıllı niyet rozeti (`.nt-intent-badge`, `updateSearchIntentBadge`), klasör/sekme niyet entegrasyonu, klavye kontrolleri, smart folder memory entegrasyonu.
- `src/content.js`, `src/content.css`: Shadow DOM ekleme diyaloğuna klasör seçici, hızlı klasör çipleri (`.bf-folder-chips`), command palette URL eylem kartı ve hızlı kayıt çipleri (`.bf-command-action-chips`), anlık bildirim rozeti (`.bf-toast`, `showContentToastNotification`), command palette akıllı niyet rozeti (`.bf-intent-badge`, `updateCommandIntentBadge`), smart folder memory entegrasyonu.
- `src/background.js`: Omnibox `onInputChanged` ve `onInputEntered` dinleyicileri, `BF_SWITCH_TO_TAB` sekme değiştirme eylemi, smart folder memory entegrasyonu.
- `_locales/en/messages.json`, `_locales/tr/messages.json`: 22 yeni yerelleştirme anahtarı (`quickFolders`, `saveToBar`, `saveToFolder`, `bookmarkSavedToBarToast`, `bookmarkSavedToFolderToast`, niyet modları dahil).
- `scripts/intent-router.test.mjs`: `BookmarkIntentRoutingEngine` için 7 adet bağımsız birim testi.
- `scripts/ui-behavior-contract.test.mjs`: `BF-UX-013`, `BF-UX-014`, `BF-UX-015`, `BF-UX-016` ve `BF-UX-017` sözleşme testleri.
- `scripts/governance-contract.test.mjs`, `scripts/validate-governance.mjs`: Yönetişim ve Operating Kernel sözleşme testleri (`BF-GOV-010`).
- `AGENTS.md`: Operating Kernel, P0 kuralları (P0-18 eklendi), Task Router ve Zorunlu Rapor Şablonu.
- `docs/agent/`: `DECISION_INDEX.md` (Karar 17 eklendi), `PROJECT_STATE.md`, `RULE_CHANGELOG.md`.
- `docs/agent-playbooks/`: 6 modüler alan kılavuzu (Bölüm 5 Intent Routing Engine eklendi).
