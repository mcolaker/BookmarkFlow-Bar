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
- **Arama Kutusunda Doğrudan Inline Hızlı Kaydet Butonu, `Ctrl+S` Kısayolu, Dinamik Tooltip ve Altın Parlama Animasyonu (`[⭐ Kaydet]` - BF-UX-018)**:
  - Hem Yeni Sekme (`src/newtab.html`, `#searchInlineSaveBtn`) hem de sayfa içi Spotlight (`src/content.js`, `.bf-command-inline-save`) arama kutularına bir bağlantı yazıldığında/yapıştırıldığında, arama kutusunun sağında niyet rozetinin yanında doğrudan tek tıkla yer imi oluşturan altın renkli `[⭐ Kaydet]` simge butonu belirir.
  - **`Ctrl+S` / `Cmd+S` Doğrudan Kaydetme Kısayolu**: Arama kutusu odaklıyken ve URL algılanmışken kullanıcı fareye dokunmadan doğrudan `Ctrl+S` basarak tarayıcının yerel farklı kaydetme penceresini engeller ve yer imini son klasöre anında kaydeder.
  - **Dinamik Hedef Klasör İpucu (Tooltip)**: Butonun üzerine gelindiğinde hedef klasör adına göre canlı bir ipucu sunulur (Örn: `"'Projeler' Klasörüne Kaydet (Ctrl+S)"` veya `"Yer İmleri Çubuğuna Kaydet (Ctrl+S)"`). Kullanıcı nereye kaydedileceğini önceden görerek sıfır hata ile işlem yapar.
  - **Altın Parlama Mikro Animasyonu (Save Pulse)**: `Ctrl+S` veya inline butona basılarak kayıt yapıldığında arama kutusunda 350ms süren zarif bir altın ışıltı (`.is-saved-flash`, `ntSearchSaveFlash`, `bfCommandSaveFlash`) tetiklenir; arama kutusu temizlenir ve odak arama çubuğunda korunur.
  - **Escape ve Arama Temizliğinde Pürüzsüz Kapanış Animasyonu (`.is-leaving`)**: Kullanıcı URL yazıp ardından `Escape` tuşuna bastığında veya arama kutusu temizlendiğinde, `[⭐ Kaydet]` butonunun aniden yok olmak yerine 120ms süren zarif bir fade-out ve scale-down animasyonuyla (`.is-leaving`, `hideInlineSaveBtnSmoothly`, `hideCommandInlineSaveBtnSmoothly`) sönmesi sağlandı; buton belirirken de 140ms'lik yaylanmalı giriş animasyonu (`ntInlineSaveEnter`, `bfCommandInlineSaveEnter`) eklendi.
  - **`Ctrl+Z` / `[Geri Al]` Sonrasında Silinen URL'nin Arama Kutusuna Otomatik Yeniden Doldurulması ve 400ms Amber Parlama (`.is-restored`)**: Kullanıcı kaydettiği yer imini `Ctrl+Z` veya `[Geri Al]` ile iptal ettiğinde, silinen bağlantı (`lastDirectSavedUrl`, `lastCommandDirectSavedUrl`) arama kutusuna otomatik geri doldurulur, tüm metin seçilir (`select()`), niyet rozeti yeniden tetiklenir ve kutu çerçevesinde 400ms süren yumuşak bir amber ışıltı (`.is-restored`, `ntSearchRestoredFlash`, `bfCommandRestoredFlash`) canlandırılır; kullanıcının bağlantıyı baştan arama veya panodan kopyalama külfeti tamamen ortadan kaldırıldı.
  - **Escape ile Arama Temizlendiğinde `Ctrl+Z` ile Geri Getirme (Undo Clear Kısayolu) ve Canlı Teyit Bildirimi (`queryRestoredToast`)**:
    - Kullanıcı arama kutusuna bir sorgu veya adres yazıp yanlışlıkla `Escape` tuşuna basarak kutuyu temizlediğinde, arama kutusu boştayken `Ctrl+Z` basıldığında temizlenen metin (`lastEscapeClearedSearchText`, `lastEscapeClearedCommandText`) amber parıltısıyla kutucuğa anında geri getirilir, odak korunur ve sağ üstte 1.5 saniye süren zümrüt yeşili kenarlıklı `"✓ Metin geri getirildi"` / `"✓ Text restored"` teyit bildirimi (`queryRestoredToast`) gösterilir.
  - **Arama Kutusuna URL Girildiğinde Mevcut Yer İmi Başlığının Canlı Önizlenmesi ve Inline `[✏️ Düzenle]` Modu (`existingBookmarkNotice`, `.is-edit-mode`)**:
    - Arama kutusuna veya Spotlight paletine bir URL yazıldığında/yapıştırıldığında, yerel yer imleri taranarak (`findExistingBookmarkByUrl`, `normalizeUrlForMatch`) bağlantının halihazırda kayıtlı olup olmadığı kontrol edilir.
    - Bağlantı zaten kayıtlıysa, mevcut başlığı arama öneri kartının açıklamasında (`"• Zaten yer imlerinde: <Başlık>"`) canlı olarak sunulur; ayrıca inline buton altın yıldız yerine camgöbeği/mavi ışıltılı `[✏️]` simgesine (`.nt-inline-save-btn.is-edit-mode`, `.bf-command-inline-save.is-edit-mode`) evrilir.
    - Butonun tooltip'i dinamik olarak `"'<Başlık>' Yer İmini Düzenle (Ctrl+S)"` (`quickEditExistingBookmark`) haline gelir; tıklandığında veya `Ctrl+S` basıldığında doğrudan mevcut yer imini düzenleme modunda (`editNodeId`, `openAddBookmarkDialog`, `BF_RENAME_BOOKMARK`) açarak kullanıcının var olan kaydı sıfır adımla güncellemesini sağlar.
  - **Toast Bildirimlerinde Yumuşak Geçiş Animasyonu (Smooth Toast Switching - `.is-switching`)**:
    - Kullanıcı art arda hızlıca `Ctrl+S` ve `Ctrl+Z` yaptığında, mevcut toast aniden kaybolup yenisi yerine geçmek yerine, 220ms süren hafif bir dikey mikro yaylanma animasyonuyla (`.nt-toast.is-switching`, `.bf-toast.is-switching`, `ntToastSwitch`, `bfToastSwitch`) yeni bildirime pürüzsüzce geçiş yapar.
  - **Düzenleme Modunda URL Kilit Açma Butonu (`#addUrlUnlockBtn` / `.bf-url-unlock-btn`, `.is-locked`)**:
    - Mevcut yer imi düzenleme diyaloğu açıldığında URL giriş alanı varsayılan olarak kilitli (`readOnly`, `.is-locked`) gelir; yanındaki küçük kilit butonu (`🔒` / `🔓`, `unlockUrl` / `lockUrl`) tıklandığında kilit açılarak kullanıcının URL'yi doğrudan değiştirebilmesine imkan tanınır.
    - Kaydetme esnasında `chrome.bookmarks.update` fonksiyonuna hem `title` hem de `url` parametreleri iletilir; ayrıca klasör değiştirildiyse `chrome.bookmarks.move` ile yeni klasöre taşınarak `bfLastUsedFolderId` güncellenir.
  - **URL Kilit Açıldığında Adres Doğrulama ve Otomatik Protokol Tamamlama (`https://`, `.is-invalid-url`)**:
    - Kilit açılıp veya yeni adres yazıldığında kullanıcı protokolü unuttuysa (`github.com/repo`, `localhost:3000`, `192.168.1.1` vb.), kaydetme esnasında arka planda otomatik `https://` eklenir ve input'a yansıtılır.
    - Geçersiz veya güvenli olmayan URL formatlarında input alanına kırmızı çerçeve ve mikro sallantı animasyonu (`.is-invalid-url`, `@keyframes ntUrlShake` / `bfUrlShake`) uygulanarak odak ve seçim sağlanır; kullanıcı yazmaya başladığında hata çerçevesi otomatik temizlenir.
  - **Arama Öneri Kartında Canlı Klasör Değiştirme ve Düzenleme Çipleri (`[⭐ Çubuğa Taşı]`, `[📁 Klasöre Taşı]`, `[✏️ Düzenle]`)**:
    - Arama kutusuna veya Spotlight paletine bir URL yazıldığında, link zaten kayıtlıysa kart açıklamasında mevcut klasör adı gösterilir (`existingBookmarkWithFolderNotice`); kartın içine diyalog açmaya gerek kalmadan tek tıkla çalışan `[⭐ Çubuğa Taşı]` ve `[📁 <Hedef Klasör>'e Taşı]` (`.is-move-chip`) ile `[✏️ Düzenle]` (`.is-edit-chip`) çipleri yerleştirildi.
    - Taşıma yapıldığında `BF_MOVE_TO_FOLDER` Service Worker rotası üzerinden yer imi taşınır, sağ üstte 3.5 saniye süren `"✓ '<Hedef Klasör>' klasörüne taşındı"` toast bildirimi gösterilir; `[Geri Al (Ctrl+Z)]` veya `Ctrl+Z` ile önceki klasöre (`previousParentId`) sıfır veri kaybıyla geri alma desteği sunulur.
  - **Canlı Klasör Çiplerinde Dropdown Klasör Ağacını Kapsayan Mini Seçici Çip (`[📁▾]`, `.is-folder-picker-chip`)**:
    - Arama öneri kartındaki hızlı taşıma çiplerinin yanına yerleştirilen kompakt `[📁▾]` butonu ile yer imi çubuğundaki ve alt klasörlerdeki tüm hedefler hiyerarşik bir açılır menüde (`.nt-folder-picker-menu`, `.bf-folder-picker-menu`) listelenir.
    - Menüde mevcut klasör `(mevcut)` / `(current)` rozetiyle belirtilir; kullanıcı dilediği başka bir klasöre tek tıkla tıklayarak yer imini doğrudan oraya taşıyabilir, 3.5s toast bildirimi ve `Ctrl+Z` geri alma imkanıyla sıfır adımla klasör yönetimi sağlar.
  - **İki Dilli Yerelleştirme**:
    - `_locales/en` ve `_locales/tr` sözlüklerine 35 yeni anahtar (`otherFolders`, `chooseFolderToMove`, `currentFolderTag`, `urlAutoCompletedHttps` dahil) eklenerek %100 parite korundu.

### 🎥 10. Yapay Zeka Otonom Video İnisiyatifi ve Otomatik Dinamik Yüzey Denetimi (BF-QA-004 / Karar 19)
- **Model Otonom İnisiyatifi (Autonomous Video Trigger Authority)**:
  - Yapay zeka asistanı, dinamik hareket, animasyon akıcılığı, geçiş fiziği veya kaydırma jank şüphesi gördüğü her durumda kullanıcının açık komut vermesini KESİNLİKLE BEKLEMEDEN kendi inisiyatifiyle `scripts/inspect-motion-qa.mjs` (`npm run qa:motion` / `npm run qa:motion:auto`) çalıştırarak video denetimini icra eder.
- **Statik ve Dinamik Yüzey Ayrımı**:
  - Statik kontroller (DOM/erişilebilirlik/metin/renkler) hızlı sözleşme testleriyle (`npm test`) sıfır ek maliyetle yürütülür; hareketli yüzeyler (Sayfa içi çubuk, Spotlight paleti, New Tab efektleri) ise Agentic Video motoruyla otonom denetlenir.
- **Otomatik Kusur Saklama & Kalıcı İz (Auto Artifact Preservation)**:
  - Video analizinde kusur (jank, glitch, frame drop, layout defect) tespit edildiğinde video aktif artifact dizinine kopyalanır (`live_motion_qa_<surface>_<timestamp>_issue.webm`) ve konsola `[ARTIFACT: ...]` URI'si basılır.
- **Otomatik Yaşam Döngüsü (Auto-Purge)**:
  - Analiz temiz geçtiğinde geçici video dosyaları otomatik silinerek disk ve bellek şişmesi engellenir.
- **Akıllı Otonom Yüzey Tespiti (`--autonomous`)**:
  - Git çalışma ağacındaki değişiklikler (`git status --porcelain`) incelenerek hangi dinamik yüzeyin değiştiği (`bar`, `spotlight`, `newtab` veya `all`) otonom tespit edilir; dinamik arayüz değişikliği yoksa gereksiz video kaydı ve token tüketimi önlenir (Zero-Waste).
- **Donanımsal Çerçeve Sayacı (FPS Dropped-Frame Inspector) ve Canlı Yolculuk Otonom Tetikleme**:
  - `scripts/user-journey-live-qa.mjs` simülasyonuna Chromium CDP `Performance.enable` ve `Animation.enable` ile `requestAnimationFrame` + `performance.now()` mikro-monitörü entegre edildi.
  - Dinamik yüzey geçişlerinde (Kayan Çubuk `Alt+Shift+B`, Spotlight `Alt+Shift+K`, New Tab Çalışma Alanı & Hızlı Klasör Çipleri) saniyede düşen kare sayısı eşiği (`droppedFrames > 2` veya `--jank-threshold=<N>`) aşıldığında veya `--motion-qa` bayrağı aktif olduğunda, Agentic Video motoru (`inspect-motion-qa.mjs`) otonom olarak devreye girer.
  - Canlı kullanıcı yolculuğu simülasyonunda görsel ve donanımsal akıcılık sıfır insan müdahalesiyle denetlenir.

---

### 📋 Etkilenen Dosyalar ve Bileşenler
- `manifest.json`: Omnibox `bf` anahtar kelimesi ve `content_scripts` içine `src/intent-router.js` eklendi.
- `src/intent-router.js`: Evrensel yerel niyet sınıflandırma motoru (`BookmarkIntentRoutingEngine`).
- `src/newtab.html`, `src/newtab.css`, `src/newtab.js`: Arama yakalama, arama içi hızlı kayıt çipleri (`.nt-search-action-chips`), klasör dropdown'u, hızlı klasör çipleri (`#addFolderChips`), anlık bildirim rozeti (`.nt-toast`, `showToastNotification`, `.is-switching`), akıllı niyet rozeti (`.nt-intent-badge`, `updateSearchIntentBadge`), inline `[✏️ Düzenle]` modu (`.is-edit-mode`), diyalog `editNodeId` desteği, URL kilit açma butonu (`#addUrlUnlockBtn`), URL doğrulama ve otomatik protokol tamamlama (`.is-invalid-url`), arama kartı canlı klasör taşıma çipleri (`.is-move-chip`, `.is-folder-picker-chip`, `.is-edit-chip`), mini klasör seçici menüsü (`.nt-folder-picker-menu`, `showFolderPickerMenu`), `handleMoveBookmarkToFolder` ve `Ctrl+Z` geri alma, klasör/sekme niyet entegrasyonu, klavye kontrolleri, smart folder memory entegrasyonu, mevcut yer imi başlık önizlemesi (`findExistingBookmarkByUrl`), metin geri yükleme toast bildirimi.
- `src/content.js`, `src/content.css`: Shadow DOM ekleme diyaloğuna klasör seçici, hızlı klasör çipleri (`.bf-folder-chips`), URL kilit açma butonu (`.bf-url-unlock-btn`), URL doğrulama ve otomatik protokol tamamlama (`.is-invalid-url`), command palette URL eylem kartı ve hızlı kayıt çipleri (`.bf-command-action-chips`), arama kartı canlı klasör taşıma çipleri (`.is-move-chip`, `.is-folder-picker-chip`, `.is-edit-chip`), mini klasör seçici menüsü (`.bf-folder-picker-menu`, `showContentFolderPickerMenu`), `handleContentMoveBookmarkToFolder`, anlık bildirim rozeti (`.bf-toast`, `showContentToastNotification`, `.is-switching`), command palette akıllı niyet rozeti (`.bf-intent-badge`, `updateCommandIntentBadge`), inline `[✏️ Düzenle]` modu (`.is-edit-mode`), diyalog `editNodeId` desteği, smart folder memory entegrasyonu, MV3 ayarlar mesajlaşması (`BF_OPEN_SETTINGS`), site devre dışı bırakma toast bildirimi, mevcut yer imi başlık önizlemesi, metin geri yükleme toast bildirimi.
- `src/background.js`: Omnibox dinleyicileri, `BF_SWITCH_TO_TAB` sekme değiştirme eylemi, `BF_OPEN_SETTINGS` sekme açma yöneticisi, `BF_MOVE_TO_FOLDER` klasör taşıma ve `previousParentId` desteği, `renameBookmark` içinde hem `title` hem `url` güncellemesi, smart folder memory entegrasyonu.
- `src/popup.html`, `src/popup.css`: Akıllı site kontrol kartı, unclosed tag (`.backup-row`) onarımı, modern altın-obsidyen kart stilleri.
- `src/bookmark-maintenance.html`, `src/bookmark-maintenance.css`, `src/bookmark-maintenance.js`: Devre dışı bırakılan siteler yönetimi (`#sites`, `#disabledSitesList`, `loadDisabledSites`).
- `_locales/en/messages.json`, `_locales/tr/messages.json`: 51 yeni yerelleştirme anahtarı tam pariteyle sağlandı.
- `scripts/intent-router.test.mjs`: `BookmarkIntentRoutingEngine` için 7 adet bağımsız birim testi.
- `scripts/ui-behavior-contract.test.mjs`: `BF-UX-013`, `BF-UX-014`, `BF-UX-015`, `BF-UX-016`, `BF-UX-017`, `BF-UX-018` ve `BF-QA-004` (FPS Dropped-Frame Inspector & Live Journey Motion QA) sözleşme testleri.
- `scripts/governance-contract.test.mjs`, `scripts/validate-governance.mjs`: Yönetişim ve Operating Kernel sözleşme testleri (`BF-GOV-010`).
- `AGENTS.md`: Operating Kernel, P0 kuralları (P0-18 ve P0-19 Otonom Video İnisiyatifi eklendi), Task Router ve Zorunlu Rapor Şablonu.
- `docs/agent/`: `DECISION_INDEX.md` (Karar 18 ve Karar 19 eklendi), `PROJECT_STATE.md`, `RULE_CHANGELOG.md`.
- `docs/agent-playbooks/`: 6 modüler alan kılavuzu (Bölüm 5 Intent Routing Engine eklendi, UI el kitabına Otonom Motion & Media QA ve FPS Dropped-Frame Inspector eklendi).
- `scripts/user-journey-live-qa.mjs`: Canlı yolculuk simülasyonuna Chromium CDP `Performance.enable`, `Animation.enable`, `startFpsTracker`, `stopFpsTracker`, `evaluateAndTriggerMotionQa` ve `--jank-threshold` donanımsal jank denetimi eklendi.
- `scripts/inspect-motion-qa.mjs`: Playwright ve Gemini Agentic Video canlı web akıcılık denetim aracı, otonom yüzey algılama (`--autonomous`), otomatik kusur saklama ve auto-purge (`npm run qa:motion`, `npm run qa:motion:auto`).
- `scripts/validate-media-qa.mjs`: Tanıtım videoları ve medya varlıkları kalite doğrulayıcısı (`npm run qa:media`).
- `package.json`: `qa:motion`, `qa:motion:auto` ve `qa:media` komutları eklendi.
