# Browser Extension Playbook — BookmarkFlow Bar

Bu kılavuz, BookmarkFlow Bar tarayıcı eklentisi (Chrome, Firefox, Edge) mimarisinde kod geliştirirken uyulması gereken teknik standartları ve sözleşmeleri tanımlar.

---

## 1. Manifest V3 & Çalışma Zamanı Mimarisi

- **Manifest Versiyonu**: Manifest V3 standartlarına tam uyum zorunludur (`manifest_version: 3`).
- **Service Worker (`src/background.js`)**:
  - Arka plan servis çalışanı durumsuz (stateless) çalışır; global değişkenler yerine `chrome.storage.local` kullanılır.
  - Olay dinleyicileri (event listeners) dosyanın en üst seviyesinde (top-level) tanımlanmalıdır.
  - `chrome.omnibox` keyword'ü `"bf"` olarak tanımlıdır; adres çubuğu girdilerini `onInputChanged` ve `onInputEntered` ile yönetir.
- **İzinler (Permissions)**:
  - Yalnızca zorunlu izinler (`bookmarks`, `storage`, `tabs`, `search`, `favicon`) kullanılır.
  - Uzak sunucu izinleri (`<all_urls>`, harici host izinleri) eklenemez.

---

## 2. Kapalı Shadow DOM & Sayfa İzolasyonu (`src/content.js`)

- **İzolasyon**: Sayfa içi kayan çubuk (`.bf-root`) ve bileşenleri barındırıcı sayfanın DOM'una mutlaka `attachShadow({ mode: "closed" })` ile bağlanır.
- **Stil Koruması**: Ana sayfanın CSS kurallarının eklentiye sızmasını veya eklenti stillerinin ana sayfayı bozmasını engellemek için tüm stiller `src/content.css` içinden Shadow Root içine enjekte edilir.
- **Güvenli Olay İletimi**: Klavye olayları (`keydown`) işlenirken, web sayfasının kendi form alanlarında (input, textarea) çakışma yaratmamak için odak denetimi yapılır.
- **Reflow Optimizasyonu**: Üst çubuk tespiti (`detectLikelyFixedTopSurface`) batch edilir; forced synchronous reflow üretilmez.

---

## 3. Yeni Sekme (New Tab) Mimarisi (`src/newtab.js`)

- **Arama Motoru**: `chrome.search.query` API'si kullanılır; kullanıcı varsayılan arama motoruna saygı duyulur, hardcoded arama sağlayıcısı yazılamaz.
- **URL Yakalama**: Arama kutusuna geçerli bir internet bağlantısı girildiğinde doğrudan sayfaya gitmek yerine ekleme paneli tetiklenir (`BF-UX-013`).
- **Arama İndeksi**: `searchIndexCache` ile sıfır-tahsisli önbellek kullanılır; yerel arama tepki süresi <1ms seviyesindedir.
- **Okuma Listesi**: `bfReadingList` yerel depolaması üzerinden çalışır.

---

## 4. İki Dilli Yerelleştirme (`_locales/`)

- Kaynak kodda doğrudan kullanıcıya görünen metin (hardcoded string) bırakılamaz.
- `_locales/en/messages.json` ve `_locales/tr/messages.json` dosyaları birebir anahtar paritesine sahip olmalıdır.
- Yeni eklenen veya değiştirilen tüm özelliklerde `node scripts/validate-project.mjs` ile yerelleştirme doğrulanır.

---

## 5. Yerel Niyet ve Akıllı Yönlendirme Motoru (`src/intent-router.js`)

- **Mimari (`BookmarkIntentRoutingEngine`)**: Arama çubuğu (`src/newtab.js`) ve Spotlight arama paletine (`src/content.js`) girilen tüm girdiler, harici ağa çıkmadan milisaniyelik yerel kural motoruyla sınıflandırılır.
- **Niyet Modları**:
  1. `url` (`is-url`): URL tespiti yapıldığında doğrudan link yakalama kartı ve hızlı klasör kayıt çipleri sunulur.
  2. `command` (`is-command`): `#stash`, `health`, `#reading`, `backup`, `settings` girdilerinde doğrudan BookmarkFlow eylem kartı çıkar.
  3. `tag` (`is-tag`): `#dev`, `#tasarim` gibi etiket sorgularında yerel akıllı etiket havuzu filtrelenir.
  4. `folder` (`is-folder`): `folder:ad`, `klasör:ad` veya mevcut bir klasör adıyla tam eşleşen sorgularda o klasörün içi hiyerarşik listelenir.
  5. `open_tab` (`is-tab`): `tab:sorgu` veya `sekme:sorgu` ile açık sekmeler taranır ve tek tıkla sekmeye geçiş sağlanır.
  6. `search` (`is-search`): Genel akıllı arama modu.
- **Canlı Akıllı Rozetler (`.nt-intent-badge`, `.bf-intent-badge`)**: Kullanıcı henüz Enter'a basmadan önce hangi modun devrede olduğu görsel olarak gösterilir.
- **Terminoloji Hijyeni (P0-13)**: Kullanıcıya asla "AI" veya "JEV" gibi teknik ibareler gösterilmez; arayüzde daima "Akıllı Arama" ve "Akıllı Yönlendirme" sunulur.

---

## 6. Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (BF-GOV-011 / Karar 20)

- **Chrome DevTools Otonom Hata Ayıklama**:
  - Sayfa içi kapalı Shadow DOM (`mode: "closed"`) izolasyonunun delinmediğini, barındırıcı sayfanın global stillerinin çubuğu bozmadığını doğrulamak için Chrome DevTools DOM ve stil teftişi yapay zeka tarafından otonom işletilir.
  - Service Worker yaşam döngüsü, hafıza sızıntısı tespiti ve sekme etkileşimlerinde DevTools konsol ve ağ dinleyicileri kullanılır.
- **Modern Web Guidance Standartları**:
  - CSS layout (flexbox, grid), mikro animasyonlar (`@keyframes`), erişilebilir odak tuzakları (`focus trap`), `backdrop-filter` performansı ve MV3 event-driven mimarisi Modern Web Guidance kılavuzlarına göre proaktif olarak denetlenir ve refaktör edilir.

---

## 7. İki Kollu Tarayıcı Mimarisi & Canlı Kullanıcı Profili (Bifurcated Browser & User's Live Chrome Invariant - Karar 27)

Tarayıcı operasyonları iki ayrı kanala ayrılır:
1. **Anonim / Kamuya Açık Web (DevTools MCP):** İzin istemeyen, <500ms hızında çalışan Chrome DevTools MCP; kamuya açık web araştırmalarında, MDN web API belgelerinde ve CSS/layout denetimlerinde kullanılır.
2. **Oturumlu Web (Kullanıcının Canlı Chrome Oturumu - CDP Port 9222):** Chrome Web Store Developer Console, GitHub PR/issue yönetimi veya sosyal medya (X, LinkedIn) işlemlerinde **kesinlikle geçici/sahte profiller (`tmp`, `.browser_profile`) açılmaz**. Doğrudan kullanıcının varsayılan çalışan Chrome oturumuna CDP (`port 9222`) ile bağlanılır; böylece kullanıcının aktif oturumları, çerezleri ve 2FA yetkileri korunur.

---

## 8. 3-Kademeli Dil ve Raw-Key Güvencesi (Three-Tier Localization & Raw-Key Gate - Karar 27)

1. **Kademe 1 — Statik Deterministik Kilit:** `_locales/en` ve `_locales/tr` arasında %100 anahtar ve yer tutucu paritesi `npm run validate` ile zorunludur.
2. **Kademe 2 — Canlı Arayüz Raw-Key & Mojibake Taraması:** `npm run test:raw-keys` (`scripts/raw-key-contract.test.mjs`) ile tüm HTML ve JS dosyaları taranarak `chrome.i18n.getMessage`, `data-i18n` ve DOM metinlerinde tanımsız anahtar veya ekranda çevrilmemiş ham anahtar (`nt_*`, `bar_*`, `quick_*`) sızıntısı ile bozuk UTF-8 karakterleri (mojibake) fail-closed engellenir.
3. **Kademe 3 — Otomatik Tamamlama:** Yeni bir UI metni veya özelliği eklendiğinde her iki dil dosyası eşzamanlı olarak güncellenir.

---

## 9. Asgari Ön İnceleme ve Uygulama Sınırları (Minimum Preflight & Implementation Boundaries)

1. **Mevcut Yapıyı İncele:** Yeni bir yardımcı fonksiyon veya bileşen yazmadan önce `src/` altındaki mevcut yardımcıların (URL parser, i18n helper, depolama yöneticisi) varlığı taranır.
2. **Mevcut Deseni Genişlet:** Projede oturmuş mimari desenleri koru ve genişlet.
3. **Yerel Modern Web API'leri:** Harici kütüphane bağımlılığı eklemek kesinlikle yasaktır; modern tarayıcı API'leri (Native Messaging, Closed Shadow DOM, CSS Custom Properties) kullanılır.
4. **Merkezi Otoriteyi Koruma:** `chrome.storage.local` ve yer imi ağacı tek bir kaynaktan yönetilir; alt bileşenler bağımsız senkronizasyon yapamaz.
