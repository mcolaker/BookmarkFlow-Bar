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

### 🎥 9. Web Tabanlı Canlı Akıcılık ve Medya Kalite Denetim Sistemi (BF-QA-002, BF-QA-003)
- **Web Tabanlı Canlı Akıcılık Denetim Aracı (`scripts/inspect-motion-qa.mjs` - `npm run qa:motion`)**:
  - Playwright altyapısıyla Chromium tarayıcısında eklenti yüklü olarak sayfa içi çubuğun açılış/kapanışı (`Alt+Shift+B`), genişleme/daralma ve sayfa içeriği itilme reflow'u (`offsetPage`), Spotlight paleti (`Alt+Shift+K`) ve New Tab animasyonları 3-5 saniyelik video olarak kaydedilir.
  - Video Gemini Agentic Video (`processing: "agentic"`) motoruna iletilerek 60 FPS akıcılık, frame drop (jank), yırtılma ve layout shift mikro saniyelik zaman damgalarıyla denetlenir.
  - Hata/kusur durumunda video kalıcı saklanır (`live_motion_qa_<timestamp>_issue.webm`); kusur yoksa otomatik temizlenir (`Auto-Purge`).
- **Tanıtım Videoları ve Medya Varlıkları Kalite Doğrulayıcısı (`scripts/validate-media-qa.mjs` - `npm run qa:media`)**:
  - Sürüm öncesinde üretilen tanıtım videoları ve tur GIF'leri (`src/assets/tour/`, `docs/assets/promo-video/`) otomatik taranarak:
    1. Kişisel veri sızıntısı (sıfır e-posta, sıfır yerel yol, sıfır token),
    2. Görsel kadraj ve taşma (kırpılmamış menü alt kenarları, tam görünür kontroller),
    3. Görsel hijyen
    kriterleri Gemini Agentic Video ile doğrulanır; offline modda deterministik boyut ve format doğrulaması sunulur.
### 🛡️ 10. Site Kontrolü, MV3 Ayarlar Güvenliği ve Popup Düzen Bütünlüğü (BF-UX-018)
- **MV3 İzin ve Güvenlik Uyumluluğu (Zero ERR_BLOCKED_BY_CLIENT)**:
  - Sayfa içi çubuk (`content.js`) içerisinden doğrudan `window.open` ile extension URL'si (`chrome-extension://.../bookmark-maintenance.html`) açma girişimi Chromium MV3 güvenlik kum havuzuna takılıyordu.
  - Bu çağrı güvenli mesajlaşma modeline (`BF_OPEN_SETTINGS`) dönüştürülerek tam yetkili `background.js` Service Worker'a delege edildi (`chrome.tabs.create`).
  - Hızlı arama ve Spotlight içerisindeki `#health` ve bakım eylemleri de bu güvenli köprü üzerinden hatasız çalışır hale getirildi.
- **"Bu Sitede Devre Dışı Bırak / Gizle" Bildirim, Geri Al (Undo) ve Geri Kazanım UX'i**:
  - Kullanıcı BookmarkFlow çubuğuna sağ tıklayıp "Bu Sitede Devre Dışı Bırak" seçtiğinde çubuğun habersiz kaybolması engellendi.
  - 3.5 saniye boyunca ekranın sağ üstünde altın vurgulu, açıklayıcı bir toast bildirimi (`siteDisabledToast`) gösterilerek kullanıcının çubuğu dilediğinde eklenti simgesinden veya Ayarlar'dan tekrar açabileceği açıklandı.
  - Yanlışlıkla yapılan tıklamalar için bildirimin içerisine **"Geri Al" (`undo`)** butonu eklendi; tek tıkla site yeniden etkinleştirilir ve çubuk geri gelir.
- **Evrensel Toast Geri Al Butonu, Görsel İlerleme Çubuğu ve `Ctrl+Z` Kısayolu**:
  - Hem sayfa içi çubukta (`src/content.js`, `src/content.css`) hem de Yeni Sekme sayfasında (`src/newtab.js`, `src/newtab.css`) toast bildirimleri etkileşimli butonları destekleyecek şekilde güncellendi (`pointer-events: auto`).
  - Hızlı kayıt çiplerinden (Instant Folder Save Chips) yer imi kaydedildiğinde bildirim rozetinde **[Geri Al]** butonu sunulur; tıklandığında oluşturulan yer imi arka planda güvenle silinir (`BF_DELETE_BOOKMARK`) ve "✓ Yer imi kaldırıldı" teyidi verilir.
  - Bildirim açık kaldığı süre boyunca eklenen geçici klavye dinleyicisi ile kullanıcı fareye dokunmadan `Ctrl+Z` (veya `Cmd+Z`) tuşlarına basarak da işlemi anında geri alabilir.
  - **Görsel Geri Sayım Çubuğu (Progress Bar)**: Bildirimin alt tabanına süreyi canlı gösteren altın renkli mikro doğrusal ilerleme çubuğu (`.bf-toast-progress`, `.nt-toast-progress`) eklendi.
  - **Fare ile Duraklatma (Pause on Hover)**: Kullanıcı fareyi toast üzerine getirdiğinde (`mouseenter`) zamanlayıcı ve animasyon duraklatılır, fare çekildiğinde (`mouseleave`) kalan süre devam eder.
- **Canlı E2E Menü Tıklaması ve Sekme Doğrulama Simülasyonu (`scripts/user-journey-live-qa.mjs`)**:
  - Adım 6 simülasyonu doğrudan URL açmak yerine web sayfasındaki BF butonuna gerçek sağ tık (contextmenu) simüle edip açılan menüdeki "Ayarlar" butonuna fiilen tıklar; `content.js` -> `background.js` mesajlaşmasını ve sekmenin açılmasını gerçek tarayıcıda doğrular.
- **Popup Menüsünde Akıllı "Bu Site" Kartı (Contextual Top Card)**:
  - Popup arayüzünde (`popup.html`, `popup.css`) en altta ve 15 ayarın gerisinde kaybolan site kontrolü, en tepeye (header'ın hemen altına) taşındı.
  - Aktif sekmenin alan adını (`github.com`), o sitedeki etkin/devre dışı durumunu ve tek tıkla açma/kapatma butonunu gösteren modern bir kart görünümü kazandı.
- **Popup Alt Buton Taşma Kusuru Onarımı (P0-11)**:
  - `popup.html` dosyasında `<div class="backup-row">` etiketinin kapanış `</div>` etiketinin eksik olması sebebiyle tek bir yatay satırda ezilerek okunmaz hale gelen yedek butonları, durum metni, ipucu kartı ve panel sıfırlama butonu temiz hiyerarşik satırlara bölündü.
- **Ayarlar Sayfasına "Devre Dışı Bırakılan Siteler" Yönetim Paneli**:
  - `bookmark-maintenance.html` sayfasına `#sites` sekmesi (`navSitesLink`) ve dinamik site yönetim paneli (`#disabledSitesList`, `#addDisabledHostBtn`) eklendi.
  - Kullanıcı daha önce gizlediği tüm siteleri listeleyebilir, tek tıkla etkinleştirebilir veya yeni istisnalar tanımlayabilir.
- **Arama Kutusunda Doğrudan Inline Hızlı Kaydet Butonu (`[⭐ Kaydet]` - BF-UX-018)**:
  - Hem Yeni Sekme (`src/newtab.html`, `#searchInlineSaveBtn`) hem de sayfa içi Spotlight (`src/content.js`, `.bf-command-inline-save`) arama kutularına bir bağlantı yazıldığında/yapıştırıldığında, arama kutusunun sağında niyet rozetinin yanında doğrudan tek tıkla yer imi oluşturan altın renkli `[⭐ Kaydet]` simge butonu belirir.
  - Kullanıcı `Enter` tuşuna basmaya veya arama öneri listesine odaklanmaya gerek kalmadan, doğrudan arama kutusundan ayrılmadan tek tıkla yer imi kaydedebilir.
  - Tıklandığında yer imi son kullanılan klasöre veya ana çubuğa eklenir, arama kutusu temizlenir ve anlık toast bildirimi tetiklenir.
- **Başarılı Geri Alma Teyitlerinde Zümrüt Yeşili İpucu (`.is-undone` / `#27ae60`)**:
  - `Ctrl+Z` veya `[Geri Al]` tıklandığında gösterilen "✓ Yer imi kaldırıldı" ve "✓ Site etkinleştirildi" teyit bildirimleri, standart altın vurgu yerine zümrüt yeşili kenarlık ve ışıltıyla (`.nt-toast.is-undone`, `.bf-toast.is-undone`, `#27ae60`) sunulur.
  - Bu görsel ayrım, kullanıcının geri alma işleminin başarıyla tamamlandığını sezgisel olarak anında kavramasını sağlar.
- **İki Dilli Yerelleştirme**:
  - `_locales/en` ve `_locales/tr` sözlüklerine 15 yeni anahtar (`quickSaveBookmark`, `undo`, `bookmarkDeletedToast` dahil) eklenerek %100 parite korundu.

---

### 📋 Etkilenen Dosyalar ve Bileşenler
- `manifest.json`: Omnibox `bf` anahtar kelimesi ve `content_scripts` içine `src/intent-router.js` eklendi.
- `src/intent-router.js`: Evrensel yerel niyet sınıflandırma motoru (`BookmarkIntentRoutingEngine`).
- `src/newtab.html`, `src/newtab.css`, `src/newtab.js`: Arama yakalama, arama içi hızlı kayıt çipleri (`.nt-search-action-chips`), klasör dropdown'u, hızlı klasör çipleri (`#addFolderChips`), anlık bildirim rozeti (`.nt-toast`, `showToastNotification`), akıllı niyet rozeti (`.nt-intent-badge`, `updateSearchIntentBadge`), klasör/sekme niyet entegrasyonu, klavye kontrolleri, smart folder memory entegrasyonu.
- `src/content.js`, `src/content.css`: Shadow DOM ekleme diyaloğuna klasör seçici, hızlı klasör çipleri (`.bf-folder-chips`), command palette URL eylem kartı ve hızlı kayıt çipleri (`.bf-command-action-chips`), anlık bildirim rozeti (`.bf-toast`, `showContentToastNotification`), command palette akıllı niyet rozeti (`.bf-intent-badge`, `updateCommandIntentBadge`), smart folder memory entegrasyonu, MV3 ayarlar mesajlaşması (`BF_OPEN_SETTINGS`), site devre dışı bırakma toast bildirimi.
- `src/background.js`: Omnibox dinleyicileri, `BF_SWITCH_TO_TAB` sekme değiştirme eylemi, `BF_OPEN_SETTINGS` sekme açma yöneticisi, smart folder memory entegrasyonu.
- `src/popup.html`, `src/popup.css`: Akıllı site kontrol kartı, unclosed tag (`.backup-row`) onarımı, modern altın-obsidyen kart stilleri.
- `src/bookmark-maintenance.html`, `src/bookmark-maintenance.css`, `src/bookmark-maintenance.js`: Devre dışı bırakılan siteler yönetimi (`#sites`, `#disabledSitesList`, `loadDisabledSites`).
- `_locales/en/messages.json`, `_locales/tr/messages.json`: 34 yeni yerelleştirme anahtarı tam pariteyle sağlandı.
- `scripts/intent-router.test.mjs`: `BookmarkIntentRoutingEngine` için 7 adet bağımsız birim testi.
- `scripts/ui-behavior-contract.test.mjs`: `BF-UX-013`, `BF-UX-014`, `BF-UX-015`, `BF-UX-016`, `BF-UX-017` ve `BF-UX-018` sözleşme testleri.
- `scripts/governance-contract.test.mjs`, `scripts/validate-governance.mjs`: Yönetişim ve Operating Kernel sözleşme testleri (`BF-GOV-010`).
- `AGENTS.md`: Operating Kernel, P0 kuralları (P0-18 eklendi), Task Router ve Zorunlu Rapor Şablonu.
- `docs/agent/`: `DECISION_INDEX.md` (Karar 17 eklendi), `PROJECT_STATE.md`, `RULE_CHANGELOG.md`.
- `docs/agent-playbooks/`: 6 modüler alan kılavuzu (Bölüm 5 Intent Routing Engine eklendi, UI el kitabına Motion & Media QA eklendi).
- `scripts/inspect-motion-qa.mjs`: Playwright ve Gemini Agentic Video canlı web akıcılık denetim aracı (`npm run qa:motion`).
- `scripts/validate-media-qa.mjs`: Tanıtım videoları ve medya varlıkları kalite doğrulayıcısı (`npm run qa:media`).
- `package.json`: `qa:motion` ve `qa:media` komutları eklendi.
