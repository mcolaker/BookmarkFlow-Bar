# AGENTS.md — BookmarkFlow Bar Operating Kernel

Bu dosya BookmarkFlow Bar projesinin her zaman yürürlükte olan ana işletim çekirdeği ve kural otoritesidir. Detaylı teknik kılavuzlar `docs/agent-playbooks/` altında yaşar ve Task Router aracılığıyla yalnızca mevcut işin ihtiyacına göre yüklenir.

---

## 0. Otorite ve Kalıcı Bellek

- Kök `AGENTS.md` birincil depo kural otoritesidir; proje deposu kalıcı bellektir (geçici sohbet belleğine güvenilmez).
- Model kural uyumluluğu ve gerileme önleme standardı `AGENT_RULE_COMPLIANCE_BENCHMARK.md` dosyasında tescillenir.
- Kalıcı mimari ve ürün kararları `docs/agent/DECISION_INDEX.md` dosyasında kayıt altına alınır.
- Güncel mimari durum, kapsam dışı ilkeler (Non-Goals) ve aktif sınırlar `docs/agent/PROJECT_STATE.md` dosyasında (detaylı arşiv `docs/agent/history/PROJECT_STATE_HISTORY_2026.md` içinde) tutulur.
- Görev takibi `docs/backlog/OPEN_TASKS.md` defterindedir; yeni sürüme kadar biriken yenilikler `docs/UNRELEASED_CHANGES.md` dosyasında not alınır.

---

## 1. P0 — Tavizsiz Kurallar (Non-Negotiable Invariants)

Geçerli herhangi bir P0 kuralı ihlal edilmişse hiçbir görev tamamlanmış sayılamaz:

1. **Manifest V3 & Yerel-Öncelikli Gizlilik (Zero-Cloud & Runtime/Dev-Time İzolasyonu)**: Eklenti tüm işlevlerini yerel yürütür; hiçbir yer imi, arama sorgusu veya gezinme verisi harici sunucuya gönderilemez (Runtime Zero-Cloud). Otonom geliştirici araçları, MCP ekosistemi, Jev 1.14/Clef hakemliği ve Playwright testleri yalnızca yerel geliştirme ve CI (Dev-Time) katmanında çalışır; son kullanıcı runtime koduna (`src/`) asla sızamaz.
2. **Kapalı Shadow DOM & Sayfa İzolasyonu**: Sayfa içi kayan çubuk (`src/content.js`) barındırıcı sayfanın global DOM ve CSS ağacından `attachShadow({ mode: "closed" })` ile tam izole edilir.
3. **Sıfır Gizli Veri & Sıfır Mutlak Yol**: Kaynak koda, testlere, belgelere veya commit'lere API anahtarı, token, şifre, sabit hesap UUID'si veya mutlak yerel kullanıcı yolları yazılamaz (`node scripts/verify-public-tree.mjs`).
4. **Kullanıcı Verisini Asla Düşürme**: Mevcut yer imleri, klasör renkleri, etiketler, okuma listesi veya kullanıcı ayarları hiçbir güncelleme veya geçişte sıfırlanamaz, silinemez veya ezilemez.
5. **Kök Nedene Öncelik, Tüm Çağrıcılar Grafı ve Çoklu Giriş Noktası Denetimi (Root-Cause First & All-Callers Graph Audit - BF-GOV-029)**: Hata veya beklenmeyen davranışlarda tahmin yürüterek kod değiştirilemez. Önce ilk gerçek hata, loglar ve yeniden üretim adımları incelenir; `src/` içinde paylaşılan bir fonksiyon veya mesaj/depolama işleyicisi değiştirilirken `codebase-memory` (`search_graph`, `trace_path`) ile tüm çağrıcılar (`src/background.js`, `src/content.js`, `src/newtab.js`, `src/shared.js`) taranır ve tüm giriş noktaları (Hızlı Ekle, Kayan Çubuk, Yeni Sekme, Sağ Tık Menüsü, Sürükle-Bırak, Kısayol) doğrulanır.
6. **Çalışma Ağacına Saygı**: Kullanıcıya ait mevcut değişiklikler korunur; görev kapsamı dışındaki ilgisiz dosyalar değiştirilemez.
7. **Sabit UI Metni Yasağı & Tam TR/EN Dil Paritesi**: Arayüzde hardcoded metin kullanılamaz; `_locales/en` ve `_locales/tr` arasında %100 anahtar paritesi korunur.
8. **Kanıtsız Doğrulama İddiası Yasağı**: Fiilen çalıştırılmayan hiçbir test veya kontrol "geçti" olarak raporlanamaz; çalıştırılmayan maddeler kalan risk olarak açıkça belirtilir.
9. **Türkçe Yanıt Kuralı (Turkish Response Invariant)**: Kullanıcı aksini talep etmedikçe kullanıcıya verilen tüm yanıtlar istisnasız Türkçe olmak zorundadır. Kod sembolleri ve commit mesajları İngilizce kalır.
10. **Kalıcı Proaktif Backlog, Tahliye Kapısı ve Sonraki Adım (BF-GOV-024)**: Her nihai yanıt, önem derecesi belirtilmiş tek bir somut sonraki adım (`Sonraki adım — [High|Medium|Low]: ...`) ve sayı sınırı olmaksızın tüm CRITICAL/HIGH proaktif önerileri (olası yan etkileriyle) içerir. Öneriler `docs/agent/PROJECT_STATE.md` içindeki `## Aktif Proaktif Backlog` defterinde tutulur; tamamlanan maddeler anında tahliye edilir (`Eviction Gate`), öneri öncesi kod tabanı doğrulanır (`Pre-Proposal Verification Gate`).
11. **Bütünsel İkincil İyileştirme Standardı (Proactive Holistic QA)**: Ziyaret edilen her arayüz yüzeyinde sadece birincil göreve bakılmaz; layout taşmaları, kontrast kusurları, padding dengesizlikleri, klavye odak halkaları ve kod hijyeni sorunları aynı turda yerinde onarılır. Ayrıca `inspect-visual-boxes.mjs` içinde `[1C]` tasarım kapısı tetiklenirse Google Stitch + Nano Banana Pro ile arayüz yükseltilir veya `[HIGH]` öneri olarak sunulur (`BF-QA-010`).
12. **Uçtan Uca Sıfır Hata & Sıfır Teknik Borç**: Kod değişikliği yapılan her turda ilgili doğrulama ve linter araçları çalıştırılır; sözdizimi, erişilebilirlik ve tip hataları yerinde sıfırlanır.
13. **Son Kullanıcı Yapay Zeka / AI Terim Yasağı (Zero End-User AI Invariant)**: Eklenti arayüzünde ve mağaza açıklamalarında son kullanıcıya ASLA "yapay zeka", "AI", "LLM" gibi teknik terimler gösterilemez; daima "Akıllı Arama", "Akıllı Sıralama", "Otomatik Öneri" gibi doğal ürün ifadeleri kullanılır.
14. **Açık Kaynak & DCO 1.1 Bütünlüğü**: Proje Apache License 2.0 ile korunur. Her katkı commit'i geçerli bir `Signed-off-by` satırı taşımalıdır (`git commit -s`).
15. **Sürüm Öncesi Değişiklik Günlüğü (`UNRELEASED_CHANGES.md`)**: Yeni sürüm çıkana kadar yapılan tüm geliştirmeler buraya kaydedilir.
16. **Profesyonel Görsel, Çift Bağlantı, Zorunlu Medya, Sıra Kapısı, Sıfır Teknik Jargon ve Dış Dil Standardı (BF-GOV-025, BF-GOV-026, BF-GOV-027, BF-REL-016, BF-GOV-029)**: Sosyal medya paylaşımlarında (X, LinkedIn) hem resmi Chrome Web Store hem GitHub Release bağlantısı birlikte yer alır; yalnızca metin/OG kartı ile paylaşım yasaktır (`assertSocialCardVisualQuality`). Paylaşım öncesinde GitHub Release ve CWS gönderim durumu `assertPreSocialReleaseGate` ile doğrulanır. Dış duyurular İSTİSNASIZ İNGİLİZCE yayınlanır, görsellerdeki UI dili İngilizce (`en`) olur ve kullanıcıya yönelik metinlerde mühendislik jargonu (`<1ms`, `60fps`, `O(1)`, `Shadow DOM`, `Manifest V3`, `Service Worker`, `regression`, `refactor`, `AST`, `BF-*`) kesinlikle kullanılmaz (`assertZeroTechnicalJargonInPublicCopy`, `docs/agent-playbooks/release_distribution.md`).
17. **GitHub İşlem Yetkilendirmesi & Terminal-Öncelikli GitHub CLI Standardı (BF-GOV-016)**: Dal oluşturma, push, PR açma (`gh pr create`), CI izleme (`gh pr checks --watch`), birleştirme (`gh pr merge --auto --merge`) ve sürüm işlemleri doğrudan terminalden resmi `gh` CLI ile yürütülür. Sürüm etiketi, harici duyuru ve force push açık kullanıcı onayı gerektirir.
18. **Yerel Niyet ve Akıllı Yönlendirme Motoru (Zero-Latency Intent Engine)**: Arama ve Spotlight girdileri harici ağ isteği olmadan yerel `BookmarkIntentRoutingEngine` ile sınıflandırılır ve `Smart Routing Badge` ile gösterilir.
19. **6 Sütunlu & 7 Boyutlu Kalite Matrisi, Durum Deltası (`t0 -> t1 -> t2`), Otonom Video İnisiyatifi ve 360° Görsel Kutu Hakemliği (BF-QA-004, BF-QA-006, BF-QA-008, BF-QA-010, BF-QA-011)**: UI doğrulamalarında 6 bağımsız hakem devrededir: (1) **Gören Göz** (`npm run qa:motion`, `inspect-visual-boxes.mjs --360` Jev 1.14 360° multimodal, `validateImageMagicBytes` PNG BOM bekçisi ve `evaluateIdleBlinkAndRebuildLoop` boşta titreme dedektörü); (2) **Düşünen Hakem** (Cloudflare Clef & Microsoft Decision-1 çift hakem/failover + `npm run inspect:dom`); (3) **Standartlar ve MV3 Hakemi** (`npm run test:mv3`, `npm run guard:console` & WAI-ARIA); (4) **Tasarım ve Estetik Hakemi** (Google Stitch + Nano Banana Pro `evaluateProactiveStitchBananaGate`: `STUDIO_GRADE_GLASS_BENTO`, `visual_design_score >= 3.50`, sıfır kesik etiket `'...'`/`'…'`); (5) **Dil ve Çapraz Sızıntı Hakemi** (`npm run test:raw-keys` & `scanI18nSuspiciousPatterns`); (6) **Durum Deltası ve Kalıcılık Hakemi** (`--save-baseline` / `--verify-delta` / `--expect-persisted` ile `Önce t0 -> Eylem t1 -> Yeniden Giriş t2` ve Çok Aşamalı Akış doğrulaması). Detaylar `docs/agent-playbooks/ui_accessibility.md` içindedir.
20. **Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (Autonomous DevTools, MCP Ecosystem & Beyond-Rules Discretion - Karar 20, 28, 29 - BF-GOV-022)**: Model; Chrome DevTools MCP, Modern Web Guidance, Google Developer Knowledge, Context7, TypeSafe Jev 1.14, Cloudflare Clef, Google Stitch + Nano Banana Pro, Gemini Agentic Video ve Live Chrome Pilot (CDP 9222) araçlarını `docs/agent-playbooks/mcp_plugin_orchestration.md` içindeki zorunlu tetikleme matrisine göre çalıştırır ve kuralların ötesinde teknik olarak gerekli gördüğü her an istediği MCP/yeteneği kullanıcıya sormadan tam otonom yetkiyle devreye alır.
21. **Otonom Ara Kilometre Taşı Commit Yetkisi (Karar 19 & 27)**: Model; testleri yeşil (`npm test`, `validate`) olan her mantıksal ara kilometre taşında kullanıcıya sormadan DCO imzalı yerel Git commit'i (`git commit -s`) oluşturur.
22. **İki Kollu Tarayıcı Mimarisi, Canlı Kullanıcı Profili ve Auto-Allow Daemon Güvencesi (Karar 27, 39 - BF-WIN-002)**: Kamuya açık araştırmalar için sıfır izinli DevTools MCP kullanılır; oturum gerektiren işlemler (CWS Console, GitHub, X, LinkedIn) için ASLA geçici profil açılmaz, kullanıcının çalışan Chrome penceresine `DevToolsActivePort` WebSocket (CDP 9222) ile bağlanılır ve izin penceresi `chrome_auto_allow_daemon.py` / `ensureAutoAllowDaemon()` ile otonom onaylanır.
23. **3-Kademeli Dil ve Canlı Arayüz Raw-Key Güvencesi (Karar 27)**: Eklenti arayüzlerinde ham çeviri anahtarı (`nt_*`, `bar_*`, `quick_*`, `app_*`) veya bozuk metin (mojibake) gösterilmesi yasaktır (`npm run test:raw-keys`).
24. **Manifest V3 API Uyumluluk ve Kullanımdan Kalkma Güvencesi (Karar 30 - BF-QA-005)**: Kod tabanında (`src/`) eski Manifest V2 senkron veya kullanımdan kalkmış API'ler kullanılamaz; Service Worker ortamında DOM globalsiz çalışılır (`npm run test:mv3` ve `assertMv3Compliance`).
25. **Sessiz Nihai Yanıt Kapısı (Final Response Gate - Karar 31)**: Yanıt göndermeden önce sessizce şu 5 invariant doğrulanır: (1) Türkçe yanıt (P0-9); (2) Öncelik etiketli (`[High|Medium|Low]`) tek somut sonraki adım (P0-10); (3) Sıfır gizli veri ve sıfır yerel mutlak yol (P0-3); (4) Çalıştırılmayan hiçbir kontrolün "geçti" gösterilmemesi (P0-8); (5) Tüm P0 kurallarına tam uyum.

---

## 2. Task Router & Uzman Alt Ajanlar (`.agents/agents/`) — Yalnızca İhtiyaç Duyulanı Yükle

İşe başlamadan önce `.agents/skills/bookmarkflow-rule-router/SKILL.md` protokolüyle görevi sınıflandırın, yalnızca ilgili kılavuzu yükleyin ve bağlamı ağır işleri `.agents/agents/` altındaki uzman alt ajanlara devredin (`BF-GOV-029`):

| Görev Türü | Yüklenecek Kılavuz (Playbook) | Devreye Girecek Otonom MCP / Araçlar | Uzman Alt Ajan (`.agents/agents/`) |
|---|---|---|---|
| `BUGFIX` | İlgili kaynak kod + en yakın alan playbook'u | `codebase-memory`, Chrome DevTools, Context7 | `bookmarkflow_live_qa_agent` |
| `BROWSER_EXTENSION` | `docs/agent-playbooks/browser_extension.md` | Modern Web Guidance, Chrome Extensions, `codebase-memory` | `bookmarkflow_modular_refactor_agent` (`>1.500` satırda) |
| `WINDOWS_COMPANION` | `docs/agent-playbooks/windows_companion.md` | Native Messaging, Live Chrome Pilot (CDP 9222) | `bookmarkflow_live_qa_agent` |
| `UI_ACCESSIBILITY` | `docs/agent-playbooks/ui_accessibility.md` | `bookmarkflow-browser-qa`, Jev 1.14 360°, Stitch/Banana, Motion | `bookmarkflow_live_qa_agent` |
| `MCP_ORCHESTRATION` | `docs/agent-playbooks/mcp_plugin_orchestration.md` | Jev 1.14, Clef/Decision-1, Stitch, Developer Knowledge | `bookmarkflow_live_qa_agent` |
| `SECURITY_PRIVACY` | `docs/agent-playbooks/security_privacy.md` | Public Tree Scanner, Secret Detection | — |
| `RELEASE_DISTRIBUTION` | `docs/agent-playbooks/release_distribution.md` | `bookmarkflow-release`, Live Chrome Pilot (`publish:cws`, `publish:social`) | `bookmarkflow_i18n_release_agent` |
| `RULE_GOVERNANCE` | `docs/agent-playbooks/rule_governance.md` | `codebase-memory`, Governance & Version Drift Guard | — |

---

## 3. Asgari Ön İnceleme & Uygulama Sınırları (Minimum Preflight & Implementation Boundaries)

Yeni soyutlama, bileşen veya yardımcı kod yazmadan önce aşağıdaki kontrol zinciri zorunludur:
1. **Mevcut Yapıyı İncele & Deseni Genişlet:** Projede bu işi yapan mevcut bir yardımcı (`src/`) var mı kontrol et; tekerleği yeniden icat etme.
2. **Modern Yerel API Tercihi:** Harici kütüphane yerine yerel modern web API'lerini (CSS Grid/Flexbox, `Intl`, `crypto.randomUUID`, Native Messaging) kullan.
3. **Merkezi Otoriteyi Koruma:** Yer imi verisi, senkronizasyon, ayarlar veya tema gibi merkezi veri otoriteleri alt bileşenlere kontrolsüzce dağıtılamaz.
4. **Mimari Bekçi ve Büyük Dosya Disiplini (Architecture Guard - BF-GOV-028):** Kaynak kodda (`src/`, `scripts/`) boş/sessiz `catch {}` blokları kullanılamaz; `1.500` satırı aşan dosyalara dokunulduğunda monolitik büyümeyi önlemek için yeni mantık modüler yardımcılara ayrıştırılır (`node scripts/check-architecture-guard.mjs` ve `.githooks/pre-commit`).

---

## 4. Zorunlu Nihai Rapor Şablonu (Mandatory Verbatim Evidence)

Nihai raporda özetleme yapmak veya kanıtları gizlemek KESİNLİKLE YASAKTIR. Her nihai yanıtta aşağıdaki bölümler eksiksiz sunulur:

### Bölüm 1: Canlı Doğrulama ve Konsol Kanıtları (Zorunlu Birebir Ham Çıktılar)
Aşağıdaki kontroller terminalde fiilen çalıştırılır ve çıktıları markdown kod bloğu içinde ham olarak sunulur:
1. **Birim ve Sözleşme Test Çıktısı (`npm test`)**
2. **Toplu Proje ve Açık Kaynak Doğrulaması (`npm run validate:all`)**
3. **Satır Sonu ve Boşluk Denetimi (`git diff --check`)**

### Bölüm 2: İncelenen Canlı Yüzeyler ve İkincil İyileştirmeler (P0-11)
### Bölüm 3: Yapılan Değişiklikler ve Dosyalar (Tıklanabilir `file:///` bağlantılarıyla)
### Bölüm 4: Proaktif Öneriler (CRITICAL & HIGH — Olası yan etkileriyle)
### Bölüm 5: Çalıştırılmayan Kontroller ve Kalan Riskler
### Bölüm 6: Zorunlu Son Satır (`Sonraki adım — [High|Medium|Low]: <somut tek bir eylem>`)

---

## 5. Kural ve Bellek Yönetişimi

- **Kural ve Bellek Rafinasyonu (More Precise Over Time, Not Larger by Accumulation):** Kök `AGENTS.md` tavan bütçesi 16 KB (tercihen ~12–13 KB), `PROJECT_STATE.md` tavan bütçesi 16 KB ile sınırlandırılmıştır (`scripts/validate-governance.mjs`).
- Kalıcı kural/mimari değişikliklerinde: `docs/agent-playbooks/rule_governance.md` işletilir, karar `docs/agent/DECISION_INDEX.md` ve `docs/agent/RULE_CHANGELOG.md` dosyalarına kaydedilir ve `node scripts/validate-governance.mjs` ile doğrulanır.
