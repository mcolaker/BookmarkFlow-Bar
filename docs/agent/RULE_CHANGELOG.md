# RULE_CHANGELOG.md — BookmarkFlow Bar Kural Değişiklikleri Tarihçesi

Bu dosya, BookmarkFlow Bar projesinin `AGENTS.md` işletim çekirdeği ve yönetişim kurallarında yapılan tüm kalıcı değişiklikleri kayıt altında tutar.

## [2026-10-10] — v0.4.0 Sürüm Yayını ve Dağıtım Sözleşmesi (BF-REL-014 / Karar 38)
- **v0.4.0 Sürüm Yayın Hazırlığı ve Dağıtımı**: BF-UX-030..046 arası 17 büyük özellik ve yönetişim geliştirmesini kapsayan `0.4.0` sürümü; `manifest.json` ve `package.json` sürümlerinin yükseltilmesi, `CHANGELOG.md` Keep a Changelog güncellenmesi, `README.md` sürüm rozetleri ve vitrin açıklamaları, mağaza metinleri, exact annotated `v0.4.0` Git etiketi ve Chromium/Firefox/Edge paketlemesi ile yayına hazırlandı.

## [2026-10-10] — JaponiGo Çekirdek Sinerjisi: Kalıcı Proaktif Backlog, Dış Duyuru Jargon Yasağı, Eklenti Kalite Dörtgeni, Hızlı Shadow DOM Denetleyicisi ve Tablist Çip Dolaşımı (Kararlar 32-36)
- **Kalıcı Proaktif Backlog Defteri ve Otomatik Tahliye Kapısı (BF-GOV-024 / Karar 32)**: JaponiGo'nun Karar #31/32 bellek disiplini benimsendi; `docs/agent/PROJECT_STATE.md` içerisinde `## Aktif Proaktif Backlog` tablosu kuruldu. Kodlanan işler defterden anında tahliye edilir (`Eviction Gate`), öneri öncesinde kod tabanı taranarak mükerrer öneriler engellenir (`Pre-Proposal Verification Gate`).
- **Kullanıcı Odaklı Dış Dil Standardı ve İç Teknik Jargon Yasağı (BF-GOV-025 / Karar 33)**: JaponiGo Karar #37 güncellemesi benimsendi; `AGENTS.md` P0-16 ve `release_distribution.md` altına kural işlendi. Chrome Web Store sürüm notları, X ve LinkedIn lansman paylaşımlarında son kullanıcıya dönük değerler ("Işık hızında klavye dolaşımı", "Göz yormayan okyanus ışıltısı") esas alındı; iç yazılımsal bugfix jargonu (`DOM insertBefore`, `Shadow DOM focus trap`, `event stopImmediatePropagation` vb.) kamuya açık duyurularda kesinlikle yasaklandı.
- **Eklenti Kusursuz Kalite Dörtgeni ve Clef/Decision-1 Çift Hakem Mimarisi (BF-QA-006 / Karar 34)**: Eklenti UI ve davranış doğrulamaları için 4 bağımsız denetim boyutu (`ui_accessibility.md`, `AGENTS.md` P0-19, P0-20) tescillendi: (1) Gören Göz (Gemini Agentic Video / `qa:motion`), (2) Düşünen Hakem (Cloudflare Clef & Microsoft Decision-1 çift hakem / failover via `clef` MCP), (3) Standartlar & MV3 Hakemi (`test:mv3` & WAI-ARIA), (4) Tasarım ve Estetik Hakemi (Google Stitch & Design Tokens).
- **Kapalı Shadow DOM Hızlı Ağaç Denetleyicisi (BF-QA-007 / Karar 35)**: Kapalı Shadow DOM (`mode: "closed"`) arayüzünü, ARIA rollerini, odak tuzaklarını, metinleri ve durumları <200ms içinde sıfır görsel token harcayarak çıkaran ve denetleyen `scripts/inspect-extension-dom.mjs` (`npm run inspect:dom`) CLI aracı ve sözleşme testleri devreye alındı.
- **Spotlight ve Yeni Sekme Filtre Çiplerinde W3C Tablist Klavye Dolaşımı (BF-UX-045 / Karar 36)**: Spotlight paleti (`.bf-filter-chip`) ve New Tab arama ekranında (`.nt-filter-chip`) W3C Tabs/Tablist klavye erişilebilirlik modeli tamamlandı; `ArrowLeft`/`ArrowRight` ile yatay döngüsel dolaşım, `Home` ile ilk çipe, `End` ile son çipe atlama, `Enter`/`Space` ile anında filtre aktivasyonu, `ArrowUp` ile arama kutusuna ve `ArrowDown` ile sonuç listesine odak aktarımı; roving `tabindex="0"` ve `tabindex="-1"` yönetimi tescillendi.
- **Açılır Klasör Menüsünde Akıllı Sıralama Tercihinin Kalıcı Olarak Saklanması (BF-UX-046 / Karar 37)**: Açılır klasör menüsünde seçilen akıllı sıralama modunun (`default`, `az`, `newest`, `frequent`) `chrome.storage.local` üzerinde `bfFolderSortModes` nesnesiyle klasör bazında hatırlanması, menü açılışında linklerin doğrudan sıralı render edilmesi ve mod değişiminin anında saklanması kurala bağlandı.

## [2026-10-08] — JaponiGo Kural Uyumluluk Benchmark'ı, Bağlam Bütçe Kapısı, Sessiz Yanıt Kapısı ve Kalite Dörtgeni (BF-GOV-023 / Karar 31)
- **Kritik Kural Uyumluluk Benchmark'ı (`AGENT_RULE_COMPLIANCE_BENCHMARK.md`)**: Yeni oturumlarda ve bağlam genişlemelerinde yapay zeka modelinin 24 P0 kuralına ve kritik playbook yönlendirmelerine tam sadakatini İngilizce sentetik prompt ile fail-closed denetleyen resmi test harness'i oluşturuldu.
- **Kural Bağlam Tavan Bütçesi Kapısı (`validate-governance.mjs`)**: Kök `AGENTS.md` dosyasının bağlam tavan bütçesi maksimum 20.480 bayt (20 KB) ile sınırlandırıldı; dosyanın kontrolsüz büyümesi ve zorunlu anahtar kelimelerin eksikliği fail-closed engellendi.
- **Sessiz Nihai Yanıt Kapısı (`AGENTS.md` P0-25)**: Modelin her nihai yanıttan önce zihninde Türkçe dil paritesi, öncelik etiketli tek sonraki adım, sıfır gizli veri/mutlak yol, kanıtsız iddia yasağı ve P0 uyumunu sessizce doğrulaması zorunlu kılındı.
- **Eklenti Kusursuz Kalite Dörtgeni (`ui_accessibility.md`)**: Eklenti arayüzleri için 4'lü hakem çemberi (Görsel & Hareket, Shadow DOM İzolasyonu, A11y & Kontrast, Yerel Gizlilik & MV3) resmi standart haline getirildi.
- **Canlı Konsol Hata Bekçisi (`scripts/live-console-guard.mjs`, `npm run guard:console`)**: Kullanıcının port 9222 CDP oturumundaki eklenti sekmelerinde ve Service Worker'da fırlatılan console.error ve unhandled exception loglarını terminalden anında izleyen bekçi aracı ve sözleşme testi devreye alındı.

## [2026-10-08] — Manifest V3 API Uyumluluk ve Kullanımdan Kalkma Güvencesi (BF-QA-005 / Karar 30)
- **Manifest V3 API Denetim ve Sıfır Deprecation Sözleşmesi**: Kod tabanında (`src/`) eski Manifest V2 senkron metotlarının (`chrome.extension.*`, `chrome.browserAction.*`, `chrome.pageAction.*`, `chrome.tabs.executeScript`, `chrome.tabs.insertCSS`, `chrome.runtime.getBackgroundPage`, WebSQL `openDatabase` vb.) bulunmadığını denetleyen fail-closed `scripts/mv3-api-audit.test.mjs` test paketi ve `npm run test:mv3` komutu eklendi.
- **CSP ve DOM-Free Service Worker Taraması**: `eval()`, `new Function()`, HTML içi uzak `<script src="https://...">` bağlantıları ve Service Worker içinde doğrudan DOM nesnelerine (`window`/`document`) erişim girişimleri taranarak engellendi.
- **API İzin Eşleşmesi ve Dağıtım Ön Kancası**: Kullanılan tüm `chrome.*` çağrılarının `manifest.json` izinleriyle örtüşmesi güvenceye alındı; `package-release.mjs` ve `package-cross-browser.mjs` dağıtım paketleyicilerine `assertMv3Compliance` ön kancası ve `.github/workflows/validate.yml` CI iş akışına bağımsız kontrol adımı entegre edildi.

## [2026-10-08] — Kural-Bazlı Tetikleyiciler ve Kural-Ötesi Tam Otonom MCP Model İnisiyatifi (BF-GOV-022 / Karar 29)
- **Konu ve Alan Bazlı Otonom Tetikleyiciler**: Chrome DevTools, Modern Web Guidance, Google Developer Knowledge, Context7, Gemini API/Agentic Video, Live Chrome Pilot ve Google Workspace için proje ihtiyaçlarına özgü operasyonel tetikleme alanları `AGENTS.md` P0-20-A ve `browser_extension.md` altında kesinleştirildi.
- **Kural-Ötesi Tam Model Karar İnisiyatifi (Beyond-Rules Autonomous Discretion)**: Yapay zeka modeline, listelenen alanların ve önceden tanımlanmış kuralların ötesinde, kendi teknik uzmanlığıyla gerekli veya yararlı gördüğü her an dilediği MCP aracını kullanıcı onayı beklemeksizin tam otonom çalıştırma yetkisi `AGENTS.md` P0-20-B altında verildi.

## [2026-10-08] — Tam Otonom Geliştirici Araçları/MCP Ekosistemi, CI Raw-Key Kapısı ve Canlı Chrome CDP Pilotu (BF-GOV-021 / Karar 28)
- **Tam Otonom MCP & Geliştirici Araçları İnisiyatifi**: Modern Web Guidance, Chrome Extensions, Chrome DevTools MCP, Google Developer Knowledge, Context7, Sequential Thinking, Codebase Memory, Gemini API & Agentic Video ve Google Workspace (Docs/Sheets) araçlarının model tarafından kullanıcıdan açık onay beklemeksizin proaktif ve tam otonom çağrılması `AGENTS.md` P0-20 kuralı ve Task Router tablosunda yetkilendirildi.
- **GitHub Actions Bağımsız Raw-Key Kapısı**: `.github/workflows/validate.yml` CI iş akışına `Run raw-key & mojibake gate` adımı eklenerek PR aşamasında çeviri anahtarı bütünlüğü ve karakter kodlaması bağımsız kontrol adımı olarak ayrıştırıldı.
- **Dağıtım Paketlemesi Fail-Closed Ön Kancası**: `scripts/package-release.mjs` ve `scripts/package-cross-browser.mjs` betiklerine `assertRawKeyIntegrity` kancası entegre edilerek ekranda ham anahtar veya mojibake içeren paketlerin arşivlenmesi fail-closed engellendi.
- **Live Chrome Pilot (`scripts/live-chrome-pilot.mjs`)**: P0-22 uyarınca kullanıcının port 9222 üzerindeki canlı çalışan Chrome profiline bağlanıp Chrome Web Store Developer Console, GitHub ve sosyal medya sekme durumunu denetleyen pilot betik ve test paketi (`scripts/live-chrome-pilot.test.mjs`, `npm run pilot:chrome`) sisteme dahil edildi.

## [2026-10-08] — JaponiGo Çekirdek Sinerjisi ve 3-Kademeli Raw-Key Güvencesi (BF-GOV-020 / Karar 27)
- **Otonom Yerel Ara Kilometre Taşı Commit Yetkisi**: Modelin yeşil test ve hatasız statik analizle tamamladığı mantıksal ara adımlarda kullanıcıyı bekletmeden otonom yerel commit (`git commit -s`) oluşturabilmesi `AGENTS.md` P0-21 kuralına bağlandı; uzak işlemler kullanıcının kontrolünde tutuldu.
- **İki Kollu Tarayıcı Mimarisi & Kullanıcının Canlı Chrome Profili (`port 9222 / CDP`)**: Kamuya açık web araştırmaları için sıfır izinli Chrome DevTools MCP; mağaza konsolu, GitHub ve sosyal medya işlemleri içinse kullanıcının aktif çalışan Chrome oturumuna doğrudan bağlanma (`User's Live Chrome Invariant`) `AGENTS.md` P0-22 kuralına bağlandı.
- **3-Kademeli Dil ve Raw-Key Güvencesi (`test:raw-keys`)**: Ekranda çevrilmemiş ham anahtar (`nt_*`, `bar_*`, `quick_*`) veya bozuk UTF-8 (mojibake) sızıntılarını fail-closed denetleyen `scripts/raw-key-contract.test.mjs` yazıldı ve `AGENTS.md` P0-23 kuralına eklendi.
- **Asgari Ön İnceleme ve Uygulama Sınırları**: Yeni kod yazmadan önce mevcut desen, yardımcı fonksiyon ve modern yerel web API'lerini önceliklendirme ilkesi `AGENTS.md` Bölüm 3 altına entegre edildi.
- **Kural ve Bellek Rafinasyonu**: Kuralların biriktirilerek bağlamı şişirmemesi, zamanla daha keskin ve modüler hale getirilmesi ilkesi kabul edildi.

---

## [2026-10-02] — Tek Komutla Sürüm Etiketleme, Paketleme ve GitHub Release Orkestrasyonu (BF-GOV-019 / Karar 26)
- **Sürüm Yayınlama Orkestrasyonu (`scripts/release-pipeline.mjs`)**: Test çalıştırma (`npm run validate:all`), çalışma ağacı temizlik denetimi, Git annotated imzalı tag oluşturma (`git tag -s vX.Y.Z`), Chromium, Firefox ve Edge paketleme ve GitHub Release varlık yükleme (`releaseWithGhCli`) adımları tek bir yerel orkestrasyon betiğinde (`npm run release:full`) birleştirildi.
- **Dry-Run ve Güvenlik Parametreleri**: `--dry-run`, `--skip-tests` ve `--skip-tag` parametreleri eklenerek sürüm öncesi tam simülasyon ve kontrollü dağıtım sağlandı; kirli çalışma ağaçlarında fail-closed durma mekanizması garantiye alındı.
- **Kılavuz ve Karar Entegrasyonu**: `docs/agent-playbooks/release_distribution.md` ve `docs/agent/DECISION_INDEX.md` (Karar 26) güncellendi.

---

## [2026-10-02] — GitHub CLI Otomatik Release Betiği ve Pre-Push Kalite Kancası (BF-GOV-018 / Karar 25)
- **Terminalden Otomatik Release Yayınlama (`scripts/release-github-cli.mjs`)**: Dağıtım paketlerini (Chromium, Firefox, Edge) ve SHA-256 sağlama toplamlarını tarayıcıya gerek kalmadan tek komutla (`npm run release:github`) doğrudan GitHub Release'e yükleyen resmi CLI otomasyon betiği eklendi; `--dry-run` simülasyonu ve `CHANGELOG.md` otomatik not çıkarma mekanizması kuruldu.
- **Git Pre-Push Kalite Kancası (`.githooks/pre-push`)**: Yerel geliştirme ortamında uzak repoya `git push` yapılmadan önce `node scripts/validate-governance.mjs` ve tüm testleri (`npm test`) otomatik çalıştıran Git kancası (`core.hooksPath = .githooks`) devreye alındı.
- **Kılavuz ve Karar Entegrasyonu**: `docs/agent-playbooks/release_distribution.md` ve `docs/agent/DECISION_INDEX.md` (Karar 25) güncellendi.

---

## [2026-10-02] — GitHub Actions Otomatik PR Birleştirme ve PowerShell Ortam Entegrasyonu (BF-GOV-017 / Karar 24)
- **GitHub Otomatik PR Birleştirme (`allow_auto_merge`)**: Repo seviyesinde otomatik birleştirme bayrağı terminalden açılarak (`allow_auto_merge=true`) PR açıldığı andan itibaren `gh pr merge --auto --merge` komutuyla CI kontrolleri bittiği milisaniyede GitHub tarafından otomatik merge yapılması sağlandı.
- **PowerShell Ortam Entegrasyonu**: Windows PowerShell `$PROFILE` yapılandırmasına `Test-Command` kontrol fonksiyonu ve `gh` ikilisinin her yeni oturumda dinamik yol tanımlayıcısıyla (`$env:ProgramFiles\GitHub CLI`) tanınmasını sağlayan mekanizma entegre edildi.
- **Kılavuz Entegrasyonu**: `docs/agent-playbooks/release_distribution.md` ve `docs/agent/DECISION_INDEX.md` (Karar 24) güncellendi.

---

## [2026-10-02] — Terminal-Öncelikli GitHub CLI Standardı (BF-GOV-016 / Karar 23)
- **Terminal-Öncelikli GitHub İşlemleri**: Kullanıcının 2026-10-02 tarihli açık talebi ("tarayıcıyı kullanmak yerine git terminali falan yok mu direkt terminalden tüm işlemleri yapsan daha hızlı olmaz mı?") doğrultusunda, GitHub üzerindeki dal oluşturma, push, Pull Request açma (`gh pr create`), CI bekleme (`gh pr checks --watch`), PR birleştirme (`gh pr merge --auto --merge`) ve sürüm yönetiminin tarayıcı arayüzü açılmadan doğrudan terminalden resmi GitHub CLI (`gh`) aracılığıyla otonom yürütülmesi standartlaştırıldı.
- **Tarayıcı Bağımlılığının Sıfırlanması**: GitHub PR ve release süreçlerinde tarayıcı açma ve GUI tıklama gereksinimi tamamen ortadan kaldırıldı; operasyon süreleri 1-2 saniyeye indirilerek hata payı sıfırlandı. Tarayıcı yalnızca görsel varlık/medya doğrulaması durumlarında ikincil araç olarak tutuldu.
- **Yönetişim & Kılavuz Entegrasyonu**: `AGENTS.md` P0-17 kuralı genişletildi, `docs/agent-playbooks/release_distribution.md` içerisine Terminal GitHub CLI iş akışları eklendi ve `docs/agent/DECISION_INDEX.md` içerisine Karar 23 olarak kaydedildi.

---

## [2026-10-02] — Sosyal Medya Çift Bağlantı (Store & GitHub) ve 280 Karakter Bütçe Zorunluluğu (BF-GOV-015 / Karar 22)
- **Çift Bağlantı Zorunluluğu (Dual-Link Mandate)**: Kullanıcı açık talimatıyla (2026-10-02), X (Twitter) ve sosyal medya lansman paylaşımlarında resmi Chrome Web Store bağlantısı (`https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf`) ile GitHub Sürüm bağlantısının (`https://github.com/mcolaker/BookmarkFlow-Bar/releases/tag/v...`) birlikte bulunması kurala bağlandı.
- **X (Twitter) 280 Karakter Bütçe Disiplini**: X üzerinde t.co URL kısaltması (her URL = 23 karakter, 2 URL = 46 karakter) ve emoji Unicode ağırlıkları (her emoji = 2 karakter) hesaplanarak metinlerin sınır engeline takılmaması için en az 10-15 karakterlik güvenlik payı bırakılması zorunlu kılındı.
- **Yönetişim & Sözleşme Entegrasyonu**: `AGENTS.md` P0-16 kuralı genişletildi; `docs/agent-playbooks/release_distribution.md`, `.agents/skills/bookmarkflow-release/SKILL.md` ve `docs/agent/DECISION_INDEX.md` (Karar 22) güncellendi.

---

## [2026-09-30] — Otonom Sosyal Medya Paylaşım Yetkilendirmesi (BF-GOV-014 / Karar 21)
- **Harici Platform Yetki Devri**: Kullanıcının 2026-09-30 tarihli açık talimatı ("hem x hem linkedinden bundan sonra paylaşımları senin yapmanı istiyorum") uyarınca, her sürüm çıkışında ve topluluk duyurusu aşamasında X (Twitter) ve LinkedIn platformlarında lansman metinleri ve 2x Retina görsel varlıklarının AI asistan tarafından doğrudan yayınlanması kalıcı olarak yetkilendirildi.
- **Kullanıcı Onayı Otomasyonu**: Rutin sürüm döngülerinde sosyal medya gönderimi için ek onay adımı beklenmeksizin hazırlanmış `COMMUNITY_LAUNCH_KIT` varlıkları canlı oturumlar üzerinden otonom paylaşılır.
- **Karar İndeksi Entegrasyonu**: `docs/agent/DECISION_INDEX.md` içerisine Karar 21 olarak işlendi.

---

## [2026-09-29] — Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (BF-GOV-011 / Karar 20)
- **P0-20 Kuralı Tanımlandı**: Yapay zeka asistanı; sayfa içi kapalı Shadow DOM izolasyon denetimi, CSS/layout hata ayıklama, konsol/ağ incelemeleri ve bellek sızıntısı tespiti için Chrome DevTools MCP; modern web ve MV3 mimarisi, CSS optimizasyonu ve erişilebilirlik için Modern Web Guidance; multimodal/video akıcılık ve görsel kalite analizi için Gemini API araçlarını kullanıcının açık komutunu beklemeden kendi inisiyatifiyle tam otonom yönetir.
- **Kullanıcı Komut Bağımsızlığı**: Model, hata ayıklama, kodlama, optimizasyon ve doğrulama aşamalarında ihtiyaç duyduğu her an ilgili aracı otonom devreye sokar ve elde ettiği bulguları projeye proaktif olarak uygular.
- **Sözleşme ve Playbook Entegrasyonu**: `docs/agent-playbooks/browser_extension.md` ve `docs/agent-playbooks/ui_accessibility.md` el kitaplarına otonom geliştirici araçları teftiş ilkeleri işlendi.

---

## [2026-09-29] — Yapay Zeka Otonom Video İnisiyatifi & Dinamik Yüzey Ayrımı Standardı (BF-QA-004 / Karar 19)
- **P0-19 Otonom Video İnisiyatifi Genişletildi**: Yapay zeka asistanı, dinamik hareket, animasyon akıcılığı, geçiş fiziği veya kaydırma jank şüphesi gördüğü her durumda kullanıcının açık komut vermesini KESİNLİKLE BEKLEMEZ; kendi inisiyatifiyle `scripts/inspect-motion-qa.mjs` (`npm run qa:motion` / `npm run qa:motion:auto`) çalıştırarak video denetimini icra eder.
- **Statik ve Dinamik Yüzey Ayrımı (Static vs Dynamic Surface Authority)**: Metin, rozet, buton, kontrast ve padding için statik yerel sözleşme testleri (`npm test`) sıfır ek maliyetle işletilir; dinamik hareketli yüzeylerde Agentic Video devreye girer.
- **Otomatik Kusur Saklama & Kalıcı İz (Auto Artifact Preservation)**: Analiz anında kusur/jank tespit edildiğinde video aktif artifact dizinine kopyalanır (`[ARTIFACT: ...]`); temiz kayıtlarda auto-purge uygulanır.
- **Akıllı Otonom Yüzey Tespiti (`--autonomous`)**: Git çalışma ağacı analiz edilerek hangi dinamik yüzeyin değiştiği otonom tespit edilir; dinamik arayüz değişikliği yoksa gereksiz video kaydı önlenir (Zero-Waste).

---

## [2026-09-28] — Agentic Motion & Medya Kalite Standardı (BF-QA-002, BF-QA-003 / Karar 18)
- **P0-19 Kuralı Tanımlandı**: Sayfa içi çubuk, Spotlight ve New Tab animasyon akıcılığı Playwright ve Gemini Agentic Video (`processing: "agentic"`) motoruyla (`npm run qa:motion`) doğrulanır.
- **Tanıtım Medyası Kalite Kapısı (`npm run qa:media`)**: Sürüm tanıtım videoları ve tur GIF'leri sıfır kişisel veri ve tam kadraj için otomatik analizden geçirilir.
- **Güvenli API Anahtarı Yönetimi**: API anahtarları asla koda yazılmaz; Windows ortamı (`GEMINI_API_KEY`) üzerinden parametrik ve güvenli yönetilir.

---

## [2026-09-28] — Yerel Niyet ve Akıllı Yönlendirme Motoru Standardı (BF-UX-017 / Karar 17)
- **P0-18 Kuralı Tanımlandı**: Arama çubuğu ve Spotlight paleti için harici sunucu bağımsız, sıfır gecikmeli kural bazlı niyet motoru (`BookmarkIntentRoutingEngine`) zorunlu kılındı.
- **Canlı Akıllı Rozetler (Smart Routing Badges)**: Kullanıcı yazarken girdi türüne göre anlık rozet (`[🌐 Bağlantı Modu]`, `[⚡ Komut Modu]`, `[🏷️ Etiket Modu]`, `[📁 Klasör Modu]`, `[🗂️ Sekme Modu]`, `[🔍 Akıllı Arama]`) gösterilmesi kurala bağlandı.
- **Son Kullanıcı Terminolojisi Hijyeni (P0-13)**: Motorun arka plan mantığı kullanıcıya asla "AI" veya "JEV" gibi teknik terimlerle yansıtılamaz; daima "Akıllı Arama" veya "Akıllı Yönlendirme" sunulur.

---

## [2026-09-28] — JaponiGo Yönetişim & Modüler Playbook Mimarisine Geçiş (BF-GOV-010)
- **Operating Kernel Mimarisi**: `AGENTS.md` dosyası JaponiGo standartlarında tok, hafif ve tavizsiz bir işletim çekirdeğine (Operating Kernel) dönüştürüldü.
- **Modüler Playbook'lar (`docs/agent-playbooks/`)**: Detaylı alan kılavuzları 6 bağımsız playbook'a ayrıldı (`browser_extension.md`, `windows_companion.md`, `ui_accessibility.md`, `security_privacy.md`, `release_distribution.md`, `rule_governance.md`).
- **Kalıcı Mimari Bellek**: `docs/agent/DECISION_INDEX.md` (16 kalıcı karar), `PROJECT_STATE.md` ve `RULE_CHANGELOG.md` oluşturuldu.
- **P0-11 Bütünsel İkincil İyileştirme Standardı (Proactive Holistic QA)**: Ziyaret edilen/incelenen her yüzeyde layout, padding, kontrast, klavye odağı ve CSS kusurlarının proaktif onarımı zorunlu kılındı.
- **P0-13 Son Kullanıcı Yapay Zeka / AI Terim Yasağı**: Arayüzde asla "AI", "Yapay Zeka" gibi teknik ibareler kullanılmaması prensibi bağlandı.
- **Zorunlu Nihai Rapor Şablonu**: Nihai raporda ham terminal çıktılarının (`npm test`, `validate:all`, `git diff --check`) verbatim kod blokları içinde sunulması kurala bağlandı.
- **Yönetişim Otomasyonu**: `scripts/validate-governance.mjs` fail-closed doğrulama kapısı eklendi.

---

## [2026-09-27] — Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log) Standardı
- Sürüm yayınlanana kadar geçen geliştirme turlarında yapılan tüm yeniliklerin `docs/UNRELEASED_CHANGES.md` ve `CHANGELOG.md [Unreleased]` altında sıcağı sıcağına not alınması kurala bağlandı.
- Kullanıcı sürüm istediğinde sürüm notlarının doğrudan bu belgeden derlenmesi güvenceye alındı.

---

## [2026-08-09] — GitHub İşlem Yetkilendirmesi (BF-GOV-007)
- Hak sahibi tarafından rutin GitHub iş akışı (dal oluşturma, push, PR açma, doğrulama kapıları yeşil olan PR'ları merge etme) için tur başına açık onay beklenmemesi kurala bağlandı.
- Sürüm yayını, harici platform duyuruları, force push ve repo silme işlemleri için açık onay şartı korundu.

---

## [2026-08-02] — Kanonik Backlog ve Kanıt Sözleşmesi (BF-GOV-001)
- `docs/backlog/OPEN_TASKS.md` dosyasının tek durum otoritesi olması kurala bağlandı.
- İzinli durumlar (`OPEN`, `IN_PROGRESS`, `BLOCKED`, `DONE`), stabil `BF-*` kimlikleri, zorunlu kabul kriterleri ve fail-closed doğrulama kapıları (`validate-backlog.mjs`) kuruldu.
