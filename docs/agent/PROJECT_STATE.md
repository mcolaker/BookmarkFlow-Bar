# PROJECT_STATE.md — BookmarkFlow Bar Canlı Proje Durumu

Son güncelleme: 2026-10-08
Aktif Sürüm: `0.3.1`
Aktif Dal: `main` (Sürüm: `v0.3.1`)

---

## 1. Mimari Genel Bakış ve Platform Matrisi

BookmarkFlow Bar, modern tarayıcılar ve Windows masaüstü için geliştirilmiş, yerel-öncelikli (zero-cloud, offline-first), yüksek performanslı (<1ms tepki süresi) bir yer imi ve üretkenlik ekosistemidir.

| Platform / Bileşen | Mimari / Teknoloji | Durum / Doğrulama |
|---|---|---|
| **Google Chrome / Chromium** | Manifest V3, Service Worker, Closed Shadow DOM | Canlı & Tam Uyumlu (`v0.3.1` Chrome Web Store'da yayında) |
| **Mozilla Firefox** | Gecko MV3 (`scripts/package-cross-browser.mjs`) | Doğrulandı (Zip derleme & SHA-256) |
| **Microsoft Edge** | Chromium MV3 uyumlu paket | Doğrulandı (Zip derleme & SHA-256) |
| **Windows Desktop Companion** | Node.js Native Messaging Host, Win32 `RegisterHotKey`, UIA | Doğrulandı (IPC testleri yeşil) |
| **Windows System Tray** | `System.Windows.Forms.NotifyIcon`, PowerShell 5.1/7+ | Doğrulandı (Sıfır yetim süreç) |

---

## 2. Test ve Kalite Durumu

- **Birim ve Sözleşme Testleri**: `npm test` -> 137/137 PASS (%100 yeşil).
- **Kural Uyumluluk ve Bağlam Bütçe Kapısı**: `AGENT_RULE_COMPLIANCE_BENCHMARK.md` ve `scripts/validate-governance.mjs` (Context ceiling budget <20 KB) devrede.
- **Canlı Konsol Hata Bekçisi**: `scripts/live-console-guard.mjs` (`npm run guard:console`) ile Port 9222 CDP eklenti konsol ve istisna izleme aktif.
- **Statik ve Açık Kaynak Doğrulama**: `npm run validate:all` -> PASS (Açık kaynak lisans, DCO, public tree, manifest, backlog, raw-key, MV3 deprecation ve yönetişim sözleşmeleri temiz).
- **Biçim ve Satır Sonu**: `git diff --check` -> Sıfır hata (CRLF/LF normalize, EOF boş satırsız).
- **Gizli Veri Denetimi**: Sıfır API anahtarı, sıfır token, sıfır mutlak kullanıcı yolu.

---

## 3. v0.3.1 Sürümü ile Yayına Alınan Özellikler (Turkuaz Işıltı & Okyanus Atmosferi)

v0.3.1 sürümü başarıyla derlenmiş, test edilmiş, GitHub Release olarak etiketlenmiş ve Chrome Web Store üzerinde Google incelemesinden geçerek resmen canlıya alınmıştır:

1. **Turkuaz Işıltı Teması (Turquoise Glow - BF-UX-024)**: Yüksek kontrastlı canlı turkuaz vurgular (`#22d3ee`), derin okyanus zeminleri (`#061318`, `#0a1a20`) ve buz-turkuaz metin tonları (`#ecfeff`) ile 5. resmi tema; ayarlar ve popup üzerinden anında geçiş, tam TR/EN yerelleştirme paritesi.
2. **Turkuaz Uçurum Yeni Sekme Duvar Kağıdı & Klasör Işıltısı (BF-UX-025)**: Yeni Sekme başlangıç sayfası için derin okyanus degrade arka planı (`turquoise-abyss`) ve varsayılan nötr klasör ikonları için turkuaz mikro ışıltı.
3. **Turkuaz Kenar Tutamacı & Arama Aksiyon Vurguları (BF-UX-026)**: Çubuk gizlendiğinde ekranın en sağ sınırında beliren geri getirme tutamacı (`.bf-edge-restore`) ve arama eylem butonlarında canlı turkuaz ışıltı.
4. **Turkuaz Toast İlerleme Çubuğu & Arama Odak Halkaları (BF-UX-027)**: Toast bildirimlerinin altındaki zaman aşımı çubuğunda (`.bf-toast-progress`, `.nt-toast-progress`) akıcı turkuaz animasyonu ve klavye odağı için güçlendirilmiş turkuaz odak halkaları (`:focus`).
5. **Kısayol Kartları Işıltısı & Sağlık Denetleyicisi Tema Senkronizasyonu (BF-UX-028)**: Yeni Sekme kısayol kartlarında zarif turkuaz hover/focus çerçevesi ve Yer İmi Bakım Merkezinde sağlık metrik rozetleri ve filtrelerinin aktif temayla tam renk uyumu.
6. **Canlı Saat / Karşılama Metninde Turkuaz Gradyan & Klasör Birleştirme Buton Fiziği (BF-UX-029)**: Yeni Sekme dijital saati ve karşılama metninde modern buz-turkuaz degrade geçişi; yinelenen klasörleri birleştirme butonunda (`#merge.primary`) neon turkuaz gradyan ve aktif basılma yay fiziği.
7. **Sosyal Medya Çift Bağlantı (Store & GitHub) & 280 Karakter Bütçe Zorunluluğu (BF-GOV-015 / Karar 22)**: X ve sosyal medya paylaşımlarında istisnasız hem resmi Chrome Web Store hem GitHub linkinin yer alması; t.co ve Unicode emoji ağırlıkları gözetilerek 280 sınırının fail-closed korunması.
8. **Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (BF-GOV-011 / Karar 20)**: Yapay zeka asistanının Chrome DevTools (Shadow DOM izolasyonu, CSS layout, a11y, bellek sızıntısı), Modern Web Guidance ve Gemini API araçlarını tam otonom çalıştırma yetkisi.
9. **JaponiGo Yönetişim & İşletim Çekirdeği Mimarisi (BF-GOV-010)**: `AGENTS.md` operating kernel, kanonik kararlar indeksi (`DECISION_INDEX.md`) ve modüler alan playbook'ları (`docs/agent-playbooks/`).
10. **Terminal-Öncelikli GitHub CLI Standardı (BF-GOV-016 / Karar 23)**: GitHub üzerinde PR açma (`gh pr create`), CI izleme (`gh pr checks --watch`), birleştirme (`gh pr merge --auto --merge`) ve sürüm yönetiminin tarayıcı açılmadan doğrudan resmi `gh` CLI ile terminalden yürütülmesi; tarayıcı bağımlılığının sıfırlanması.
11. **GitHub Actions Otomatik PR Birleştirme ve PowerShell Ortam Entegrasyonu (BF-GOV-017 / Karar 24)**: GitHub reposunda `allow_auto_merge=true` kalıcı olarak etkinleştirildi; Windows PowerShell profilinde `Test-Command` ve `gh` ikili yolu otomatik yükleme mekanizması kuruldu.
12. **GitHub CLI Otomatik Release Betiği ve Pre-Push Kalite Kancası (BF-GOV-018 / Karar 25)**: `scripts/release-github-cli.mjs` ve `.githooks/pre-push` kancası devreye alındı; sürüm paketleme ve push doğrulama döngüleri yerel-öncelikli güvenceye kavuşturuldu.
13. **Tek Komutla Sürüm Etiketleme, Paketleme ve GitHub Release Orkestrasyonu (BF-GOV-019 / Karar 26)**: `scripts/release-pipeline.mjs` ve `npm run release:full` komutu ile doğrulama, git tag oluşturma, çapraz tarayıcı paketleme ve GitHub Release yükleme süreci tek adımda birleştirildi; sürüm hazırlık süresi <15 saniyeye indirildi.
14. **JaponiGo Çekirdek Sinerjisi ve 3-Kademeli Raw-Key Güvencesi (BF-GOV-020 / Karar 27)**: Otonom ara kilometre taşı commit yetkisi (`git commit -s`), asgari ön inceleme & uygulama sınırları (Minimum Preflight), iki kollu tarayıcı mimarisi (`User's Live Chrome Invariant - CDP 9222`) ve canlı raw-key/mojibake denetimi (`scripts/raw-key-contract.test.mjs`) kalıcı olarak entegre edildi.
15. **Tam Otonom Geliştirici Araçları/MCP Ekosistemi, CI Raw-Key Kapısı ve Canlı Chrome CDP Pilotu (BF-GOV-021 / Karar 28)**: Modern Web Guidance, Chrome Extensions, Chrome DevTools MCP, Google Developer Knowledge, Context7, Sequential Thinking, Codebase Memory, Gemini API & Agentic Video ve Google Workspace araçlarının tam otonom inisiyatifi; `.github/workflows/validate.yml` CI iş akışında bağımsız `npm run test:raw-keys` adımı; `scripts/package-release.mjs` ve `package-cross-browser.mjs` paketleme süreçlerinde `assertRawKeyIntegrity` fail-closed kapısı; ve kullanıcının port 9222 üzerindeki canlı çalışan Chrome profiline bağlanan `scripts/live-chrome-pilot.mjs` pilotu.
16. **Kural-Bazlı Tetikleyiciler ve Kural-Ötesi Tam Model Karar İnisiyatifi (BF-GOV-022 / Karar 29)**: Chrome DevTools, Modern Web Guidance, Google Developer Knowledge, Context7, Gemini API/Agentic Video, Live Chrome Pilot ve Google Workspace için alan bazlı tetikleyiciler kodlandı; ayrıca yapay zeka modeline tanımlı kuralların ötesinde dilediği MCP'yi kendi uzman teknik inisiyatifiyle tam otonom çalıştırma yetkisi (Beyond-Rules Autonomous Discretion) verildi.
17. **Manifest V3 API Uyumluluk ve Sıfır Deprecation Güvencesi (BF-QA-005 / Karar 30)**: Kod tabanındaki tüm Chrome API çağrılarının (`bookmarks`, `storage`, `tabs`, `runtime`, `search`, `scripting`, `action`, `commands`, `omnibox`) Manifest V3 resmi standartlarıyla tam uyumlu olduğunu, eski MV2 senkron metotlarının bulunmadığını, CSP `eval`/`Function` ve uzak scriptlerin engellendiğini, Service Worker içinde DOM globalsiz çalışıldığını denetleyen fail-closed `scripts/mv3-api-audit.test.mjs` test paketi, `npm run test:mv3` komutu, CI kontrol adımı ve paketleme ön kancası (`assertMv3Compliance`) devreye alındı.
18. **JaponiGo Kural Uyumluluk Benchmark'ı, Bağlam Bütçe Kapısı, Sessiz Yanıt Kapısı ve Kalite Dörtgeni (BF-GOV-023 / Karar 31)**: Modelin yeni oturumlarda 24 P0 kuralına tam uyumunu sentetik İngilizce prompt ile denetleyen `AGENT_RULE_COMPLIANCE_BENCHMARK.md` kılavuzu; `scripts/validate-governance.mjs` içerisinde `AGENTS.md` context ceiling bütçe kapısı (max 20 KB); `AGENTS.md` P0-25 Sessiz Nihai Yanıt Kapısı (Final Response Gate); `ui_accessibility.md` altında 4 hakemli Eklenti Kusursuz Kalite Dörtgeni; ve port 9222 CDP eklenti konsol/istisna izleyicisi `scripts/live-console-guard.mjs` (`npm run guard:console`).
19. **Açılır Klasör Menüsünde Metin Çakışması Giderimi ve Dinamik Satır Mimarisi (BF-UX-030)**: Sabit `35px` satır yüksekliğinin etiketler ve klasör yolu içeren satırlarda dikey taşmaya yol açarak alttaki yer imlerinin üzerine binmesi sorunu kökten çözüldü (`min-height: 38px`, `height: auto`, dikey flex düzeni); açılır klasör menüsü içerisindeki mükerrer klasör yolu kalabalığı gizlendi ve menünün en üstüne klasör ikonu, adı ve dinamik sayaç rozeti içeren şık `.bf-menu-header` bileşeni eklendi.
20. **Açılır Klasör Menüsünde Tam Klavye Dolaşımı ve Odak Döngüsü (BF-UX-031)**: Menü açıkken `ArrowDown` ve `ArrowUp` tuşlarıyla yer imleri arasında akıcı gezinme, `Enter` ile seçili bağlantıyı açma, `Tab`/`Shift+Tab` ile döngüsel dolaşım ve `Escape` ile menü kapanırken odağı otomatik olarak açılış butonuna (`lastFolderAnchor`) geri yükleyen erişilebilir klavye mimarisi devreye alındı.
21. **Kalabalık Klasörler İçin Canlı Filtreleme ve Yay Fiziği Animasyonu (BF-UX-032)**: 15 veya daha fazla yer imi içeren klasörlerde otomatik beliren 28px kompakt canlı arama girdisi (`.bf-menu-filter`, tam TR/EN paritesi), canlı sayaç (`matchCount/total`) ve anlık filtreleme; açılışta `cubic-bezier(0.16, 1, 0.3, 1)` mikro yay fiziği (`bfMenuAppear`, `bfMenuAppearBottom`) ile akıcı görünüm kazandırıldı.
22. **Açılır Klasör Menüsünde Hızlı Temizleme (Clear Input `×`) Mikro Aksiyonu (BF-UX-033)**: Menü içi canlı filtre kutusunda metin girildiğinde sağ tarafta beliren kompakt ve erişilebilir `×` temizleme butonu (`.bf-menu-filter-clear`, `clearText` çeviri anahtarı, klavye `:focus-visible` halkası); tek tıkla aramayı sıfırlar, tüm yer imlerini geri yükler ve odağı otomatik olarak arama kutusuna iade eder.
23. **Açılır Menü Yer İmlerinde Sağ Tık ile "Gizli Pencerede Aç" / "Kopyala" Hızlı Eylemleri (BF-UX-034)**: Klasör menüsündeki herhangi bir yer imine sağ tıklandığında doğrudan açılan BookmarkFlow bağlam menüsü; `BF_OPEN_INCOGNITO` mesaj rotasıyla güvenli gizli pencere açma (`openInIncognitoWindow`) ve panoya kopyalama sonrası anlık yeşil onay bildirimi (`addressCopiedToast`) ile tam teşekküllü yer imi yönetimi.
24. **Açılır Menü Yer İmlerinde Orta Tık (Auxclick) ile Arka Planda Yeni Sekmede Açma (BF-UX-035)**: Klasör menüsündeki yer imlerine fare tekerleğiyle (orta tık) tıklandığında menüyü kapatmadan bağlantıyı `BF_OPEN_BACKGROUND_TAB` mesaj rotasıyla (`chrome.tabs.create({ url, active: false })`) arka planda yeni sekmede açma yeteneği; peş peşe sekme açmak isteyen kullanıcılar için akıcı ve kesintisiz gezinme desteği.
25. **Menü İçi Filtreleme İçin Eşleşen Karakterleri Vurgulama (Highlight Matching Substring - BF-UX-036)**: Kullanıcı canlı filtreye metin girdiğinde, yer imi başlığında sorguyla eşleşen karakterlerin XSS korumalı güvenli DOM text node mimarisiyle `<mark class="bf-highlight">` içine alınarak tema vurgusuyla (`--bf-theme-accent-glow`, `--bf-theme-accent`) belirginleştirilmesi; yüksek kontrast modunda (`forced-colors`) tam erişilebilir stil entegrasyonu.
26. **Spotlight ve Yeni Sekme Arama Paletlerinde Eşleşen Karakterleri Vurgulama Paritesi (BF-UX-037)**: Açılır klasör menüsündeki alt dizgi vurgulama mimarisi ana Spotlight arama paleti (`Alt+Shift+K`), sayfa içi arama paneli (`.bf-results`) ve New Tab canlı arama kartlarına teşmil edildi; çoklu kelime, `#tag` arındırma, yerel dil uyumu (`tr-TR` / `en-US`) ve çakışmasız aralık birleştirme ile `<mark class="bf-highlight">` ve `<mark class="nt-highlight">` vurgulaması sağlandı; Windows yüksek kontrast modunda (`forced-colors`) sistem `Highlight` renkleriyle tam erişilebilirlik güvenceye alındı.

---

## 4. Aktif Sınırlar ve Bilinen Kısıtlamalar

- **Chrome Omnibox Bildirimi**: Chrome adres çubuğundan `bf <url>` ile ekleme yapıldığında sayfa DOM'una erişilemediği için aktif sekmeye hafif runtime mesajı iletimi ilerleyen fazda genişletilebilir.
- **Masaüstü Companion Kurulumu**: Windows Companion kullanıcı tarafından `tools/windows-companion/install-companion.ps1` ile tek seferlik kayıt gerektirir.
