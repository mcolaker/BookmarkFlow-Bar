# PROJECT_STATE.md — BookmarkFlow Bar Canlı Proje Durumu

Kısa çalışma belleği (`AGENTS.md` §0 & §5). Bağlam penceresini yormamak için `<16 KB` altında tutulur: güncel mimari gerçekler, doğrulama kapıları, aktif sınırlar, kapsam dışı ilkeler (Non-Goals) ve bekleyen proaktif backlog burada yaşar. Tamamlanan sürümlerin madde madde detaylı geçmişi `docs/agent/history/PROJECT_STATE_HISTORY_2026.md` arşivinde ve `docs/agent/DECISION_INDEX.md` kararlar indeksindedir.

Son güncelleme: 2026-10-18
Aktif Sürüm: `0.4.1`
Aktif Dal: `main` (Sürüm: `v0.4.1` — GitHub Release & Chrome Web Store `published`)

---

## 1. Mimari Genel Bakış ve Platform Matrisi

BookmarkFlow Bar, modern tarayıcılar ve Windows masaüstü için geliştirilmiş, yerel-öncelikli (zero-cloud, offline-first), yüksek performanslı (<1ms tepki süresi) bir yer imi ve üretkenlik ekosistemidir.

| Platform / Bileşen | Mimari / Teknoloji | Durum / Doğrulama |
|---|---|---|
| **Google Chrome / Chromium** | Manifest V3, Service Worker, Closed Shadow DOM | Canlı & Tam Uyumlu (`v0.4.1` CWS üzerinde `published`) |
| **Mozilla Firefox** | Gecko MV3 (`scripts/package-cross-browser.mjs`) | Doğrulandı (Zip derleme & SHA-256) |
| **Microsoft Edge** | Chromium MV3 uyumlu paket | Doğrulandı (Zip derleme & SHA-256) |
| **Windows Desktop Companion** | Node.js Native Messaging Host, Win32 `RegisterHotKey`, UIA | Doğrulandı (IPC testleri yeşil) |
| **Windows System Tray** | `System.Windows.Forms.NotifyIcon`, PowerShell 5.1/7+ | Doğrulandı (Sıfır yetim süreç) |

---

## 2. Test, Kalite Dörtgeni ve Yönetişim Durumu

- **Birim ve Sözleşme Testleri**: `npm test` -> %100 yeşil (`scripts/*.test.mjs`).
- **Kural Uyumluluk, Bağlam Bütçesi & Mimari Bekçi (`BF-GOV-023`, `BF-GOV-028`)**: `AGENT_RULE_COMPLIANCE_BENCHMARK.md`, `scripts/validate-governance.mjs` (Kök `AGENTS.md` <=16 KB, `PROJECT_STATE.md` <=16 KB, toplam playbook <=120 KB, bayat referans taraması), `scripts/check-architecture-guard.mjs` (`npm run guard:arch`: sessiz `catch {}` engeli ve `>1500` satır dosya büyüme bekçisi) ve izlenen `.githooks/pre-commit` + `.githooks/pre-push` kancaları devrede.
- **360° Multimodal Jev 1.14 + Clef Failover & Otonom Stitch/Banana Tasarım Kapısı (`BF-QA-008`, `BF-QA-009`, `BF-QA-010`)**: `scripts/inspect-visual-boxes.mjs` (`npm run inspect:boxes`, `npm run inspect:360`) ile tek geçişli spekülatif fan-out (`screen_state`, `visual_design_score` 0..4, `design_layout_harmony`, `design_color_contrast`, `design_primary_observation`, `design_glass_bento_richness`, `animation_motion_health`, `i18n_raw_key_integrity`), Cloudflare Clef (`microsoft-decision-1`) kesintisiz failover ve sıfır gecikmeli `evaluateProactiveStitchBananaGate` (`[1C]` otonom tasarım yükseltme tetikleyicisi) aktif.
- **Canlı Konsol & Kapalı Shadow DOM Bekçileri (`BF-QA-007`)**: `scripts/live-console-guard.mjs` (`npm run guard:console`) ve `scripts/inspect-extension-dom.mjs` (`npm run inspect:dom`).
- **Statik, MV3 ve Açık Kaynak Doğrulama (`BF-QA-005`)**: `npm run validate:all` -> PASS (Lisans, DCO, public tree, manifest, backlog, raw-key `test:raw-keys`, MV3 deprecation `test:mv3` ve medya kalite kapıları temiz).

---

## 3. Aktif Mimari ve Ürün Yetenekleri Özeti (`v0.4.1`)

*(Tamamlanan 45+ özelliğin detaylı madde madde geçmişi `docs/agent/history/PROJECT_STATE_HISTORY_2026.md` arşivindedir).*

- **Görsel Tasarım & 5 Tema Motoru (`BF-UX-024`..`029`, `BF-GOV-012`)**: Sakura, Ocean, Emerald, Obsidian ve **Turquoise Glow** (`#22d3ee`, `turquoise-abyss`) temaları; yüksek kontrast modu (`forced-colors: active`) ve global design token propagasyonu.
- **Açılır Klasör Menüsü & Akıllı Sıralama (`BF-UX-030`..`047`)**: Dinamik satır yüksekliği, tam klavye dolaşımı (`ArrowUp`/`ArrowDown`/`Enter`/`Escape`), 15+ öğeli klasörlerde canlı filtre (`.bf-menu-filter`) ve `×` hızlı temizleme, sağ tık (`BF_OPEN_INCOGNITO`, kopyala) ve orta tık (`BF_OPEN_BACKGROUND_TAB`), "Tümünü Sekmelerde Aç" (`BF_OPEN_BACKGROUND_TABS`), başlıkta `+` hızlı yer imi/alt klasör ekleme, kalıcı akıllı sıralama (`bfFolderSortModes`: Varsayılan, A-Z, En Yeni, Sık Kullanılan) ve `aria-live="polite"` ekran okuyucu duyurusu (`BF-UX-047`).
- **Spotlight (`Alt+Shift+K`) & Yeni Sekme Arama (`BF-UX-017`, `BF-UX-036`..`045`)**: Sıfır gecikmeli yerel `BookmarkIntentRoutingEngine` ve `Smart Routing Badge`, XSS korumalı `<mark>` alt dizgi vurgulama, `#tag` etiket hapı parlama vurgusu ve W3C `role="tablist"` klavye destekli akıllı filtre çipleri ("Tümü", "Klasörler", "Etiketler", "Okuma Listesi").
- **Tam Ekran (`fullscreenchange`) & Yerleşik Alt Çubuk Koruması (`BF-UX-050`)**: Tam ekrana girildiğinde çubuğun ve modalların otomatik gizlenmesi, çıkışta kademeli `syncLayoutAfterFullscreen` ve `visualViewport` senkronizasyonu; Chromium 138+ / Brave `NewTabFooterView` için `--nt-native-footer-safe-offset: 44px`.
- **Mobil Yer İşaretleri (`folderType: 'mobile'`) Çift Yönlü Senkron Köprüsü & Rehberi (`BF-UX-051`)**: `BookmarkFlowConfig.collectFoldersWithMobileBridge` ve `selectMobileBookmarksNode` ile `folderType === "mobile"` (`id === "3"`) kök düğümünün Klasör Rayı (`📱 Mobil`), Hızlı Klasör Çipleri, Hedef Klasör `<select>` menüleri ve Omnibox (`bf <url>`) ile çift yönlü bağlanması; `.bf-mobile-sync-banner` / `.nt-mobile-sync-banner`, `mobileSyncSelectedHint` ve `#tipMobileSync` ile telefona eklenti kurmadan otomatik senkronizasyon rehberi.
- **Otonom Geliştirici Araçları, Terminal-First GitHub CLI & CWS/Sosyal Yayın Hattı (`BF-GOV-010`, `BF-GOV-011`, `BF-GOV-016`, `BF-GOV-017`, `BF-GOV-018`, `BF-GOV-019`, `BF-GOV-020`, `BF-GOV-021`, `BF-GOV-022`, `BF-GOV-023`, `BF-GOV-024`, `BF-GOV-025`, `BF-GOV-026`, `BF-GOV-027`, `BF-GOV-028`, `BF-QA-004`..`010`, `BF-WIN-002`, `BF-REL-016`)**: `AGENTS.md` işletim çekirdeği, `gh` CLI otonom PR/auto-merge/release (`release:full`), `chrome_auto_allow_daemon.py` + `DevToolsActivePort` WebSocket CDP bağlantısı, tek komutla Chrome Web Store paket yükleme (`npm run publish:cws` — dinamik `resolveCwsUrls`) ve sosyal medya öncesi zorunlu sıra kapısı (`assertPreSocialReleaseGate` + `assertSocialCardVisualQuality`).

---

## 4. Aktif Sınırlar ve Bilinen Kısıtlamalar

- **Chrome Omnibox Bildirimi**: Chrome adres çubuğundan `bf <url>` ile ekleme yapıldığında sayfa DOM'una erişilemediği için aktif sekmeye hafif runtime mesajı iletimi ilerleyen fazda genişletilebilir.
- **Masaüstü Companion Kurulumu**: Windows Companion kullanıcı tarafından `tools/windows-companion/install-companion.ps1` ile tek seferlik kayıt gerektirir.
- **Büyük Kaynak Dosyaları (`check-architecture-guard.mjs`)**: `src/content.js` (~6.144 satır) ve `src/newtab.js` (~3.689 satır) dosyalarına yeni özellik eklenirken monolitik büyümeyi önlemek için yeni mantığın modüler yardımcılara ayrıştırılması esastır.

---

## 5. Aktif Proaktif Backlog (Bekleyen CRITICAL/HIGH Öneriler)

Aşağıdaki liste, önceki oturumlarda önerilmiş ancak henüz uygulanmamış olan açık/bekleyen proaktif önerilerin kanonik defteridir (`BF-GOV-024`). Kodlanan ve test edilen maddeler bu defterden anında tahliye edilir (`Eviction Gate`).

| ID | Öncelik | Öneri Başlığı | Açıklama ve Olası Yan Etki | Durum |
|---|---|---|---|---|
| **BF-UX-048** | HIGH | Açılır Menü Yer İmlerinde Ziyaret Sayaç Rozeti Gösterimi | "Sık Kullanılanlar" modunda listelenen yer imlerinin sağ tarafında ziyaret sayısını gösteren kompakt mikro rozet (`.bf-visit-badge`). (Menü satırına 20px mikro badge ekler; sık kullanılanların neden en üstte olduğunu görselleştirir). | BEKLİYOR |
| **BF-UX-049** | HIGH | Klasör Menüsü Sıralama Modunu Tek Tıkla Sıfırlama / Sağ Tık Eylemi | Sıralama butonuna sağ tıklandığında veya Shift+Tık yapıldığında modu doğrudan "Varsayılan"a sıfırlayabilme desteği. (Buton tıklama dinleyicisine Shift/contextmenu kontrolü ekler; 4 mod arasında tekrar tekrar tıklama sürtünmesini azaltır). | BEKLİYOR |
| **BF-UX-052** | HIGH | Spotlight (`Alt+Shift+K`) ve Yeni Sekme Arama Filtrelerine "📱 Mobil" Hızlı Sekmesi Ekleme | Spotlight ve Yeni Sekme arama çubuğunun altındaki `role="tablist"` akıllı filtre çiplerine ("Tümü", "Klasörler", "Etiketler", "Okuma Listesi") ek olarak doğrudan `folderType: 'mobile'` altındaki öğeleri süzen `"📱 Mobil"` filtre çipi eklenmesi. (Filtre sekme çubuğuna 1 adet sekme ekler; telefonda kaydedilen bağlantılara klavyeden tek tuşla ulaşmayı hızlandırır). | BEKLİYOR |

---

## 6. Ürün Kapsam Dışı İlkeleri (Product Non-Goals — Asla Önerilmeyecekler)

Aşağıdaki özellikler BookmarkFlow Bar'ın yerel-öncelikli (P0-1) ve yalın ürün felsefesine aykırı olduğu için **ASLA proaktif öneri olarak sunulmaz**:
- **Bulut Hesabı / Harici Sunucu Senkronizasyonu**: Kullanıcı girişi, uzak veritabanı veya bulut tabanlı yer imi senkronizasyonu (P0-1 Runtime Zero-Cloud ihlali).
- **Kullanıcı Telemetrisi ve Analitik Takibi**: Kullanıcının tıklama, arama veya gezinme davranışlarını izleyen herhangi bir analitik/telemetri SDK'sı.
- **Sosyal Ağ, Liderlik Tablosu veya Herkese Açık Yer İmi Akışı**: Rekabetçi puanlama, genel profil veya sosyal paylaşım akışları.
- **Son Kullanıcı Arayüzünde Yapay Zeka / LLM Sohbet Botu**: Arayüzde AI terimleri veya uzak LLM sohbet bileşenleri (P0-13 ihlali).
