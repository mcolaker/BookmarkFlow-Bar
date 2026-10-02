# RULE_CHANGELOG.md — BookmarkFlow Bar Kural Değişiklikleri Tarihçesi

Bu dosya, BookmarkFlow Bar projesinin `AGENTS.md` işletim çekirdeği ve yönetişim kurallarında yapılan tüm kalıcı değişiklikleri kayıt altında tutar.

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
