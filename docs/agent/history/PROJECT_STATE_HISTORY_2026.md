# PROJECT_STATE_HISTORY_2026.md — BookmarkFlow Bar Sürüm ve Özellik Arşivi

Bu dosya, `docs/agent/PROJECT_STATE.md` çalışma belleğini hafif ve odaklanmış (<12 KB) tutmak amacıyla tamamlanan sürümlerin detaylı teknik geçmişini arşivler (`BF-GOV-028`). Yalnızca geçmiş sürüm detaylarına ihtiyaç duyulduğunda okunur.

---

## v0.4.1 Sürümü ile Tamamlanan Özellikler Arşivi (Madde 1–45)

1. **Turkuaz Işıltı Teması (Turquoise Glow - BF-UX-024)**: Yüksek kontrastlı canlı turkuaz vurgular (`#22d3ee`), derin okyanus zeminleri (`#061318`, `#0a1a20`) ve buz-turkuaz metin tonları (`#ecfeff`) ile 5. resmi tema; ayarlar ve popup üzerinden anında geçiş, tam TR/EN yerelleştirme paritesi.
2. **Turkuaz Uçurum Yeni Sekme Duvar Kağıdı & Klasör Işıltısı (BF-UX-025)**: Yeni Sekme başlangıç sayfası için derin okyanus degrade arka planı (`turquoise-abyss`) ve varsayılan nötr klasör ikonları için turkuaz mikro ışıltı.
3. **Turkuaz Kenar Tutamacı & Arama Aksiyon Vurguları (BF-UX-026)**: Çubuk gizlendiğinde ekranın en sağ sınırında beliren geri getirme tutamacı (`.bf-edge-restore`) ve arama eylem butonlarında canlı turkuaz ışıltı.
4. **Turkuaz Toast İlerleme Çubuğu & Arama Odak Halkaları (BF-UX-027)**: Toast bildirimlerinin altındaki zaman aşımı çubuğunda (`.bf-toast-progress`, `.nt-toast-progress`) akıcı turkuaz animasyonu ve klavye odağı için güçlendirilmiş turkuaz odak halkaları (`:focus`).
5. **Kısayol Kartları Işıltısı & Sağlık Denetleyicisi Tema Senkronizasyonu (BF-UX-028)**: Yeni Sekme kısayol kartlarında zarif turkuaz hover/focus çerçevesi ve Yer İmi Bakım Merkezinde sağlık metrik rozetleri ve filtrelerinin aktif temayla tam renk uyumu.
6. **Canlı Saat / Karşılama Metninde Turkuaz Gradyan & Klasör Birleştirme Buton Fiziği (BF-UX-029)**: Yeni Sekme dijital saati ve karşılama metninde modern buz-turkuaz degrade geçişi; yinelenen klasörleri birleştirme butonunda (`#merge.primary`) neon turkuaz gradyan ve aktif basılma yay fiziği.
7. **Sosyal Medya Çift Bağlantı (Store & GitHub) & 280 Karakter Bütçe Zorunluluğu (BF-GOV-015 / Karar 22)**: X ve sosyal medya paylaşımlarında istisnasız hem resmi Chrome Web Store hem GitHub linkinin yer alması; t.co ve Unicode emoji ağırlıkları gözetilerek 280 sınırının fail-closed korunması.
8. **Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (BF-GOV-011 / Karar 20)**: Yapay zeka asistanının Chrome DevTools (Shadow DOM izolasyonu, CSS layout, a11y, bellek sızıntısı), Modern Web Guidance ve Gemini API araçlarını tam otonom çalıştırma yetkisi.
9. **JaponiGo Yönetişim & İşletim Çekirdeği Mimarisi (BF-GOV-010)**: `AGENTS.md` operating kernel, kanonik kararlar indeksi (`DECISION_INDEX.md`) ve modüler alan playbook'ları (`docs/agent-playbooks/`).
10. **Terminal-Öncelikli GitHub CLI Standardı (BF-GOV-016 / Karar 23)**: GitHub üzerinde PR açma (`gh pr create`), CI izleme (`gh pr checks --watch`), birleştirme (`gh pr merge --auto --merge`) ve sürüm yönetiminin tarayıcı açılmadan doğrudan resmi `gh` CLI ile terminalden yürütülmesi.
11. **GitHub Actions Otomatik PR Birleştirme ve PowerShell Ortam Entegrasyonu (BF-GOV-017 / Karar 24)**: GitHub reposunda `allow_auto_merge=true` kalıcı olarak etkinleştirildi.
12. **GitHub CLI Otomatik Release Betiği ve Pre-Push Kalite Kancası (BF-GOV-018 / Karar 25)**: `scripts/release-github-cli.mjs` ve `.githooks/pre-push` kancası devreye alındı.
13. **Tek Komutla Sürüm Etiketleme, Paketleme ve GitHub Release Orkestrasyonu (BF-GOV-019 / Karar 26)**: `scripts/release-pipeline.mjs` ve `npm run release:full` komutu ile doğrulama, git tag oluşturma, çapraz tarayıcı paketleme ve GitHub Release yükleme süreci tek adımda birleştirildi.
14. **JaponiGo Çekirdek Sinerjisi ve 3-Kademeli Raw-Key Güvencesi (BF-GOV-020 / Karar 27)**: Otonom ara kilometre taşı commit yetkisi (`git commit -s`), asgari ön inceleme & uygulama sınırları (Minimum Preflight), iki kollu tarayıcı mimarisi (`User's Live Chrome Invariant - CDP 9222`) ve canlı raw-key/mojibake denetimi (`scripts/raw-key-contract.test.mjs`).
15. **Tam Otonom Geliştirici Araçları/MCP Ekosistemi, CI Raw-Key Kapısı ve Canlı Chrome CDP Pilotu (BF-GOV-021 / Karar 28)**: CI iş akışında bağımsız `npm run test:raw-keys` adımı, `assertRawKeyIntegrity` fail-closed kapısı ve `scripts/live-chrome-pilot.mjs` pilotu.
16. **Kural-Bazlı Tetikleyiciler ve Kural-Ötesi Tam Model Karar İnisiyatifi (BF-GOV-022 / Karar 29)**: Alan bazlı tetikleyiciler ve Kural-Ötesi Tam Model Karar İnisiyatifi (Beyond-Rules Autonomous Discretion).
17. **Manifest V3 API Uyumluluk ve Sıfır Deprecation Güvencesi (BF-QA-005 / Karar 30)**: `scripts/mv3-api-audit.test.mjs` test paketi, `npm run test:mv3` komutu ve `assertMv3Compliance`.
18. **JaponiGo Kural Uyumluluk Benchmark'ı, Bağlam Bütçe Kapısı, Sessiz Yanıt Kapısı ve Kalite Dörtgeni (BF-GOV-023 / Karar 31)**: `AGENT_RULE_COMPLIANCE_BENCHMARK.md`, `validate-governance.mjs` bütçe kapısı, P0-25 Sessiz Nihai Yanıt Kapısı ve `scripts/live-console-guard.mjs`.
19. **Açılır Klasör Menüsünde Metin Çakışması Giderimi ve Dinamik Satır Mimarisi (BF-UX-030)**: Dinamik satır yüksekliği (`min-height: 38px`) ve `.bf-menu-header` bileşeni.
20. **Açılır Klasör Menüsünde Tam Klavye Dolaşımı ve Odak Döngüsü (BF-UX-031)**: `ArrowDown`/`ArrowUp`, `Enter`, `Tab`/`Shift+Tab` ve `Escape` odak geri yükleme mimarisi.
21. **Kalabalık Klasörler İçin Canlı Filtreleme ve Yay Fiziği Animasyonu (BF-UX-032)**: 15+ yer imi içeren klasörlerde `.bf-menu-filter` ve `cubic-bezier(0.16, 1, 0.3, 1)` yay fiziği.
22. **Açılır Klasör Menüsünde Hızlı Temizleme (Clear Input `×`) Mikro Aksiyonu (BF-UX-033)**: `.bf-menu-filter-clear` butonu ve otomatik odak iadesi.
23. **Açılır Menü Yer İmlerinde Sağ Tık ile "Gizli Pencerede Aç" / "Kopyala" Hızlı Eylemleri (BF-UX-034)**: `BF_OPEN_INCOGNITO` ve `addressCopiedToast` entegrasyonu.
24. **Açılır Menü Yer İmlerinde Orta Tık (Auxclick) ile Arka Planda Yeni Sekmede Açma (BF-UX-035)**: `BF_OPEN_BACKGROUND_TAB` mesaj rotası.
25. **Menü İçi Filtreleme İçin Eşleşen Karakterleri Vurgulama (BF-UX-036)**: Güvenli DOM text node mimarisiyle `<mark class="bf-highlight">` vurgulaması.
26. **Spotlight ve Yeni Sekme Arama Paletlerinde Eşleşen Karakterleri Vurgulama Paritesi (BF-UX-037)**: `<mark class="bf-highlight">` ve `<mark class="nt-highlight">` paritesi.
27. **Açılır Menü Canlı Filtresinde Akıllı Etiket (#tag) ile Hızlı Süzme Desteği (BF-UX-038)**: `.bf-tag-pill.is-tag-matched` parlama efekti.
28. **Klasör Menüsünde ve Sağ Tık Menüsünde "Tümünü Sekmelerde Aç" Toplu Eylemi (BF-UX-039)**: `.bf-menu-open-all-btn`, `BF_OPEN_BACKGROUND_TABS` ve >15 sekme onay kapısı.
29. **Spotlight ve Yeni Sekme Arama Sonuçlarında Etiket Hapı Canlı Eşleşme Vurgusu (BF-UX-040)**: `.nt-tag-pill.is-tag-matched` ve `forced-colors: active` uyumu.
30. **Açılır Klasör Menüsünde "Yeni Alt Klasör Oluştur" / "Buraya Yer İmi Ekle" Başlık Hızlı Eylemleri (BF-UX-041)**: `.bf-menu-add-btn` ve `.bf-menu-add-popover`.
31. **Spotlight ve Yeni Sekme Arama Sonuçlarında Akıllı Süzme Sekmeleri / Filtre Çipleri (BF-UX-042)**: "Tümü", "Klasörler", "Etiketler", "Okuma Listesi" filtre çipleri.
32. **Açılır Klasör Menüsünde "Son Eklenenler" / "Sık Kullanılanlar" Akıllı Sıralama Desteği (BF-UX-043)**: `.bf-menu-sort-btn` ("Varsayılan", "A-Z", "En Yeni", "Sık Kullanılan").
33. **Kalıcı Proaktif Backlog Defteri ve Otomatik Tahliye Kapısı (BF-GOV-024 / Karar 32)**: `PROJECT_STATE.md` kanonik backlog defteri, `Eviction Gate` ve `Pre-Proposal Verification Gate`.
34. **Kullanıcı Odaklı Dış Dil Standardı ve İç Teknik Jargon Yasağı (BF-GOV-025 / Karar 33)**: Kamuya açık duyurularda iç bugfix jargonu yasağı.
35. **Eklenti Kusursuz Kalite Dörtgeni ve Clef/Decision-1 Çift Hakem Mimarisi (BF-QA-006 / Karar 34)**: 4 bağımsız denetim boyutu.
36. **Kapalı Shadow DOM Hızlı Ağaç Denetleyicisi (BF-QA-007 / Karar 35)**: `scripts/inspect-extension-dom.mjs` (`npm run inspect:dom`).
37. **Spotlight ve Yeni Sekme Filtre Çiplerinde W3C Tablist Klavye Dolaşımı (BF-UX-045 / Karar 36)**: `ArrowLeft`/`ArrowRight`/`Home`/`End` ve roving `tabindex`.
38. **Açılır Klasör Menüsünde Akıllı Sıralama Tercihinin Kalıcı Olarak Saklanması (BF-UX-046 / Karar 37)**: `bfFolderSortModes` yerel depolama kalıcılığı.
39. **JaponiGo Auto-Allow Daemon, Canlı Chrome WebSocket CDP & Otonom Sosyal Medya Lansmanı (BF-WIN-002 / Karar 39)**: `chrome_auto_allow_daemon.py`, `DevToolsActivePort` WebSocket ve `scripts/publish-social.mjs`.
40. **Zorunlu Görsel ve Video Tanıtım Kartı Standardı (BF-GOV-026 / Karar 40)**: Sosyal medya paylaşımlarında görsel kart zorunluluğu.
41. **Bounding-Box Destekli Görsel Regresyon Hakemliği ve Sosyal Medya Görsel Lint Kapısı (BF-QA-008, BF-GOV-027 / Karar 41)**: `scripts/inspect-visual-boxes.mjs` ve `assertSocialCardVisualQuality`.
42. **Ham Ekran Görüntüsü Pikselleriyle Canlı Jev 1.14 Multimodal Kutulama Hakemliği (BF-QA-009 / Karar 42)**: `TypeSafe-Danger-Zone-Images: true` ile ham PNG varlık denetimi.
43. **Tam Ekran (`fullscreenchange`) / `visualViewport` Geçiş Koruması ve `NewTabFooterView` Güvenli Boşluğu (BF-UX-050)**: Tam ekran gizleme, `syncLayoutAfterFullscreen` ve `--nt-native-footer-safe-offset: 44px`.
44. **Klasör Menüsü Sıralama Değişiminde Ekran Okuyucu Canlı Duyurusu (ARIA Live - BF-UX-047)**: `.bf-menu-sort-live` (`role="status"`, `aria-live="polite"`) ekran okuyucu duyurusu.
45. **Tek Komutla Chrome Web Store Yayınlama Betiği (`publish:cws`) ve Sosyal Medya Öncesi Zorunlu Sürüm Sıra Kapısı (BF-REL-016 / Karar 43)**: `scripts/publish-cws.mjs` (dinamik `resolveCwsUrls`) ve `assertPreSocialReleaseGate`.
