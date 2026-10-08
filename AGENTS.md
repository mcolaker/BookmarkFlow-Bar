# AGENTS.md — BookmarkFlow Bar Operating Kernel

Bu dosya BookmarkFlow Bar projesinin her zaman yürürlükte olan ana işletim çekirdeği ve kural otoritesidir. Detaylı teknik kılavuzlar `docs/agent-playbooks/` altında yaşar ve Task Router aracılığıyla yalnızca mevcut işin ihtiyacına göre yüklenir.

---

## 0. Otorite ve Kalıcı Bellek

- Kök `AGENTS.md` birincil depo kural otoritesidir.
- Proje deposu kalıcı bellektir; proje için kritik kararlar için asla geçici sohbet belleğine güvenilmez.
- Kalıcı mimari ve ürün kararları `docs/agent/DECISION_INDEX.md` dosyasında kayıt altına alınır.
- Güncel mimari durum ve aktif sınırlar `docs/agent/PROJECT_STATE.md` dosyasında tutulur.
- Görev ve durum takibi `docs/backlog/OPEN_TASKS.md` kanonik defterindedir.
- Yeni sürüme kadar biriken yenilikler `docs/UNRELEASED_CHANGES.md` dosyasında not alınır.

---

## 1. P0 — Tavizsiz Kurallar (Non-Negotiable Invariants)

Geçerli herhangi bir P0 kuralı ihlal edilmişse hiçbir görev tamamlanmış sayılamaz:

1. **Manifest V3 & Yerel-Öncelikli Gizlilik (Zero-Cloud Invariant)**: Eklenti tüm işlevlerini yerel olarak yürütür. Hiçbir yer imi, arama sorgusu, etiket veya gezinme verisi harici sunucuya veya uzak API'ye gönderilemez. Uzak runtime bağımlılığı eklenemez.
2. **Kapalı Shadow DOM & Sayfa İzolasyonu**: Sayfa içi kayan çubuk (`src/content.js`) barındırıcı sayfanın global DOM ve CSS ağacından `attachShadow({ mode: "closed" })` ile tam izole edilir; ana sayfanın stilleri çubuğu bozamaz.
3. **Sıfır Gizli Veri & Sıfır Mutlak Yol**: Kaynak koda, testlere, belgelere veya commit'lere API anahtarı, token, şifre veya mutlak yerel kullanıcı yolları yazılamaz. `node scripts/verify-public-tree.mjs` sıfır hatayla geçmelidir.
4. **Kullanıcı Verisini Asla Düşürme**: Mevcut yer imleri, klasör renkleri, etiketler, okuma listesi veya kullanıcı ayarları hiçbir güncelleme, geçiş veya hata durumunda sıfırlanamaz, silinemez veya ezilemez.
5. **Kök Nedene Öncelik (Root-Cause First)**: Hata veya beklenmeyen davranışlarda tahmin yürüterek kod değiştirilemez. Önce ilk gerçek hata, loglar ve yeniden üretim adımları incelenir; kök neden somutlaştırılmadan yama yapılamaz.
6. **Çalışma Ağacına Saygı**: Kullanıcıya ait mevcut değişiklikler korunur. Görev kapsamı dışındaki ilgisiz dosyalar düzeltilemez, biçimlendirilemez veya commit kapsamına alınamaz.
7. **Sabit UI Metni Yasağı & Tam TR/EN Dil Paritesi**: Arayüzde hardcoded metin kullanılamaz; `_locales/en` ve `_locales/tr` arasında %100 anahtar paritesi korunur.
8. **Kanıtsız Doğrulama İddiası Yasağı**: Fiilen çalıştırılmayan hiçbir test veya kontrol "geçti" olarak raporlanamaz; çalıştırılmayan maddeler kalan risk olarak açıkça belirtilir.
9. **Türkçe Yanıt Kuralı (Turkish Response Invariant)**: Kullanıcı aksini talep etmedikçe kullanıcıya verilen tüm yanıtlar istisnasız Türkçe olmak zorundadır. Kod sembolleri, değişken adları ve commit mesajları İngilizce kalır.
10. **Sonraki Adım ve Proaktif Öneriler (CRITICAL & HIGH)**: Her nihai yanıt, önem derecesi belirtilmiş tek bir somut sonraki adım (`Sonraki adım — [High|Medium|Low]: ...`) ve sayı sınırı olmaksızın tespit edilen tüm CRITICAL/HIGH proaktif önerileri (olası yan etkileri parantez içinde belirterek) içerir.
11. **Bütünsel İkincil İyileştirme Standardı (Proactive Holistic QA)**: Ziyaret edilen veya test edilen her arayüz yüzeyinde sadece birincil göreve bakılmaz; ekrandaki layout taşmaları, font/kontrast kusurları, padding dengesizlikleri, klavye odak halkaları ve kod hijyeni sorunları aynı turda proaktif olarak yerinde onarılır.
12. **Uçtan Uca Sıfır Hata & Sıfır Teknik Borç (Zero Technical Debt)**: Kod değişikliği yapılan her turda ilgili doğrulama ve linter araçları çalıştırılır; sözdizimi, erişilebilirlik ve tip hataları yerinde sıfırlanır.
13. **Son Kullanıcı Yapay Zeka / AI Terim Yasağı (Zero End-User AI Invariant)**: Eklenti arayüzünde (UI metinleri, rozetler, tooltip'ler, diyaloglar, mağaza açıklamaları vb.) son kullanıcıya ASLA "yapay zeka", "AI", "LLM" gibi teknik terimler gösterilemez. Kullanıcıya daima "Akıllı Arama", "Akıllı Sıralama", "Otomatik Öneri" gibi doğal ve ürün odaklı ifadeler sunulur.
14. **Açık Kaynak & DCO 1.1 Bütünlüğü**: Proje Apache License 2.0 koşullarıyla korunur. Her katkı commit'i geçerli bir `Signed-off-by` satırı taşımalıdır (`git commit -s`).
15. **Sürüm Öncesi Değişiklik Günlüğü (`UNRELEASED_CHANGES.md`)**: Yeni sürüm çıkana kadar yapılan tüm geliştirmeler unreleased olarak not alınır; sürüm istendiğinde notlar doğrudan buradan derlenir.
16. **Profesyonel Görsel, Çift Bağlantı ve Sürüm Sunum Standardı (Dual-Link Mandate & 280-Char Budget)**: Her sürümde profesyonel tanıtım görselleri (X 1200x675, LinkedIn 1200x627) hazır sunulur; `README.md` yeni sürüm yetenekleriyle eksiksiz güncellenir. X (Twitter) ve tüm sosyal medya lansman paylaşımlarında istisnasız hem resmi **Chrome Web Store** bağlantısı (`https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf`) hem de **GitHub Sürüm** bağlantısı birlikte yer alır. X paylaşımlarında 280 karakter sınırı (t.co ile her URL = 23 karakter, 2 URL = 46 karakter, emojiler = 2 karakter) katı şekilde gözetilir ve metin taslakları asla sınır engeline takılmayacak güvenlik payıyla tasarlanır.
17. **GitHub İşlem Yetkilendirmesi & Terminal-Öncelikli GitHub CLI Standardı (Terminal-First GitHub CLI Mandate - BF-GOV-007 & BF-GOV-016)**: Dal oluşturma, push, PR açma (`gh pr create`), CI durumunu izleme (`gh pr checks --watch`), PR birleştirme (`gh pr merge --auto --merge`) ve sürüm işlemleri tarayıcı açmaya ihtiyaç duymadan doğrudan terminalden resmi GitHub CLI (`gh`) aracılığıyla otonom yürütülür. Tarayıcı tabanlı GitHub etkileşimi tamamen terk edilmiş olup yalnızca görsel/medya doğrulaması gereken durumlarda ikincil kalır. Sürüm etiketi, harici platform duyuruları ve force push açık kullanıcı onayı gerektirir.
18. **Yerel Niyet ve Akıllı Yönlendirme Motoru (Zero-Latency Intent Engine)**: Arama ve Spotlight paletine girilen girdiler harici ağ isteği olmadan yerel kural motoruyla (`BookmarkIntentRoutingEngine`: URL, komut, etiket, klasör, sekme, arama) anında sınıflandırılır; kullanıcıya ne olacağını canlı gösteren akıllı rozet (`Smart Routing Badge`) sunulur. UI'da son kullanıcıya dönük AI/JEV teknik terimleri kullanılamaz (P0-13 ile tam uyumlu).
19. **Agentic Motion, Medya Kalite Standardı ve Otonom Video İnisiyatifi (Autonomous Video Trigger Authority & Zero-Jank QA)**: Sayfa içi çubuk (`Alt+Shift+B`), Spotlight (`Alt+Shift+K`) ve New Tab geçişlerinde animasyon akıcılığı Playwright ve Gemini Agentic Video motoruyla (`npm run qa:motion`) denetlenir; tanıtım videoları ve GIF'ler (`npm run qa:media`) sıfır kişisel veri ve tam kadraj için fail-closed doğrulanır. **Otonom Video İnisiyatifi (Autonomous Video Authority):** Yapay zeka asistanı, dinamik hareket, animasyon akıcılığı, geçiş fiziği veya kaydırma jank şüphesi gördüğü her durumda kullanıcının açık komut vermesini (örneğin 'videoyu incele' demesini) KESİNLİKLE BEKLEMEZ. Yapay zeka modeli bu doğrulamayı gerekli gördüğü her an kendi inisiyatifiyle `scripts/inspect-motion-qa.mjs` çalıştırarak video denetimini icra eder. Kusur tespit edildiğinde video otomatik kalıcı arşive alınır (`[ARTIFACT: ...]`), temiz videolarda auto-purge işletilir.
20. **Tam Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (Autonomous DevTools, MCP Ecosystem, Web Guidance & Gemini API Authority - Karar 20 & Karar 28 - BF-GOV-021)**: Yapay zeka asistanı; sayfa içi kapalı Shadow DOM izolasyon denetimi, CSS/layout hata ayıklama, konsol ve ağ incelemeleri, bellek sızıntısı tespiti ve performans/LCP profillemede (**Chrome DevTools MCP**); modern web ve tarayıcı API standartları, CSS optimizasyonu, erişilebilirlik (a11y) ve MV3 mimarisinde (**Modern Web Guidance** & **Chrome Extensions**); Chromium ve resmi Web/Extension API spesifikasyonlarını taramada (**Google Developer Knowledge** & **Context7**); çok adımlı mimari analiz ve kod bağımlılık izlemede (**Sequential Thinking** & **Codebase Memory**); multimodal/video akıcılık ve medya kalite analizlerinde (**Gemini API** & **Agentic Video**); P0-22 canlı tarayıcı oturum denetiminde (**Live Chrome Pilot - CDP 9222**); ve lansman dokümantasyonu ile sürüm raporu organizasyonunda yerel gizliliği koruyarak (**Google Workspace / Docs & Sheets**) kullanıcının açık komut veya talimat vermesini KESİNLİKLE BEKLEMEZ. Yapay zeka modeli, projenin ihtiyaç duyduğu her analiz, kodlama, optimizasyon, test ve doğrulama anında bu araç ve MCP ekosistemini kendi inisiyatifiyle tam otonom devreye sokar, analizleri yürütür ve bulguları projeye proaktif olarak uygular.
21. **Otonom Ara Kilometre Taşı Commit Yetkisi (Autonomous Local Milestone Commit Authority - Karar 19 & Karar 27)**: Model; testleri yeşil (`npm test`, `validate`) ve statik analizi hatasız olan her mantıksal ara kilometre taşında kullanıcıya sormadan otonom olarak DCO imzalı yerel Git commit'i (`git commit -s`) oluşturur. Uzak repoya `push`, `PR` ve `release` operasyonları ise P0-17 uyarınca kesinlikle kullanıcının kontrolünde ve terminal-first yürütülür.
22. **İki Kollu Tarayıcı Mimarisi ve Canlı Kullanıcı Profili Zorunluluğu (Bifurcated Browser & User's Live Chrome Invariant - Karar 27)**: Tarayıcı işlemlerinde: (1) Kamuya açık araştırmalar, teknik inceleme ve web API dokümantasyonu için sıfır izinli, <500ms çalışan Chrome DevTools MCP kullanılır; (2) Oturum gerektiren işlemler (Chrome Web Store Developer Console, GitHub PR/issue, X, LinkedIn) için ASLA geçici/sahte profiller açılmaz! Doğrudan kullanıcının varsayılan çalışan Chrome penceresine ve profiline CDP (`port 9222`) ile bağlanılır (`User's Live Chrome Invariant`). Böylece oturum ve 2FA engelleri tamamen ortadan kalkar.
23. **3-Kademeli Dil ve Canlı Arayüz Raw-Key Güvencesi (Three-Tier Localization & Raw-Key Gate - Karar 27)**: Eklenti arayüzlerinde (Sayfa İçi Çubuk, Spotlight, Yeni Sekme, Popup, Ayarlar) ham çeviri anahtarı (`nt_*`, `bar_*`, `quick_*`, `app_*`) veya bozuk metin (mojibake) gösterilmesi kesinlikle yasaktır. (1) Statik anahtar paritesi kuralı; (2) `test:raw-keys` canlı arayüz ve DOM tarama testi; (3) Otomatik yerelleştirme tamamlayıcı kapısı ile %100 parite korunur.

---

## 2. Task Router — Yalnızca İhtiyaç Duyulanı Yükle

İşe başlamadan önce görevin türünü sınıflandırın ve yalnızca ilgili kılavuzu inceleyin:

| Görev Türü | Yüklenecek Kılavuz (Playbook) | Devreye Girecek Otonom MCP / Geliştirici Araçları |
|---|---|---|
| `BUGFIX` | İlgili kaynak kod + en yakın ilgili alan playbook'u | Chrome DevTools, Context7, Sequential Thinking |
| `BROWSER_EXTENSION` | `docs/agent-playbooks/browser_extension.md` | Modern Web Guidance, Chrome Extensions, Chrome DevTools |
| `WINDOWS_COMPANION` | `docs/agent-playbooks/windows_companion.md` | Native Messaging, Live Chrome Pilot (CDP 9222) |
| `UI_ACCESSIBILITY` | `docs/agent-playbooks/ui_accessibility.md` | a11y-debugging, Modern Web Guidance, Agentic Motion |
| `SECURITY_PRIVACY` | `docs/agent-playbooks/security_privacy.md` | Public Tree Scanner, Secret Detection |
| `RELEASE_DISTRIBUTION` | `docs/agent-playbooks/release_distribution.md` | Live Chrome Pilot (CDP 9222), GitHub CLI, Raw-Key Gate |
| `RULE_GOVERNANCE` | `docs/agent-playbooks/rule_governance.md` | Codebase Memory, Governance Contract |

---

## 3. Asgari Ön İnceleme & Uygulama Sınırları (Minimum Preflight & Implementation Boundaries)

Yeni soyutlama, bileşen veya yardımcı kod yazmadan önce aşağıdaki kontrol zinciri zorunludur:
1. **Mevcut Yapıyı İncele:** Projede bu işi yapan mevcut bir yardımcı (`utils/`, `src/`) veya servis var mı?
2. **Deseni Genişlet:** Tekerleği yeniden icat etmek yerine mevcut mimari desenleri genişlet.
3. **Modern Yerel API Tercihi:** Harici kütüphane eklemek yerine tarayıcının yerel modern web API'lerini (CSS Grid/Flexbox, `Intl`, `crypto.randomUUID`, Native Messaging) kullan.
4. **Merkezi Otoriteyi Koruma:** Yer imi verisi, senkronizasyon, ayarlar veya tema gibi merkezi veri otoriteleri asla alt UI bileşenlerine kontrolsüzce dağıtılamaz.

---

## 4. Zorunlu Nihai Rapor Şablonu (Mandatory Verbatim Evidence)

Nihai raporda özetleme yapmak, kanıtları gizlemek veya "tüm kontroller temiz geçti" deyip geçmek KESİNLİKLE YASAKTIR. Her nihai yanıtta aşağıdaki bölümler eksiksiz sunulur:

### Bölüm 1: Canlı Doğrulama ve Konsol Kanıtları (Zorunlu Birebir Ham Çıktılar)
Aşağıdaki kontroller terminalde fiilen çalıştırılır ve konsolun ürettiği çıktı markdown kod bloğu (` ``` `) içinde ham olarak sunulur:
1. **Birim ve Sözleşme Test Çıktısı (`npm test`):**
   - Tüm sözleşme testlerinin geçtiğini gösteren terminal çıktısı eksiksiz yer almalıdır.
2. **Toplu Proje ve Açık Kaynak Doğrulaması (`npm run validate:all`):**
   - Açık kaynak, DCO, public tree, manifest, governance, raw-key ve backlog doğrulama çıktısı ham olarak yer almalıdır.
3. **Satır Sonu ve Boşluk Denetimi (`git diff --check`):**
   - Sıfır hata çıktısı ham olarak sunulmalıdır.

### Bölüm 2: İncelenen Canlı Yüzeyler ve İkincil İyileştirmeler (P0-11)
- Ziyaret edilen/incelenen yüzeylerde (Yeni Sekme, Spotlight, Sayfa İçi Çubuk, Ayarlar vb.) tespit edilen layout, kontrast, padding, klavye odağı ve CSS kusurları ile kodda uygulanan doğrudan onarımlar açıklanır.

### Bölüm 3: Yapılan Değişiklikler ve Dosyalar
- Değiştirilen dosyalar tıklanabilir `file:///` formatında listelenir ve teknik işler özetlenir.

### Bölüm 4: Proaktif Öneriler (CRITICAL & HIGH)
- Sayı sınırlaması olmaksızın tüm CRITICAL ve HIGH önem derecesindeki öneriler (olası yan etkileriyle).

### Bölüm 5: Çalıştırılmayan Kontroller ve Kalan Riskler

### Bölüm 6: Zorunlu Son Satır
- `Sonraki adım — [High|Medium|Low]: <somut tek bir eylem>`.

---

## 5. Kural ve Bellek Yönetişimi

- **Kural ve Bellek Rafinasyonu (More Precise Over Time, Not Larger by Accumulation):** Kural sistemi zamanla yığılarak bağlamı şişirmemeli; zaman geçtikçe eskiyen kurallar ayıklanmalı, detaylar playbook'lara aktarılmalı ve çekirdek sistem daha keskin, öz ve modüler hale getirilmelidir.
- Proje kurallarında veya mimaride kalıcı değişiklik yapıldığında:
  1. `docs/agent-playbooks/rule_governance.md` prosedürü işletilir.
  2. Alınan kalıcı karar `docs/agent/DECISION_INDEX.md` dosyasına eklenir.
  3. Değişiklik `docs/agent/RULE_CHANGELOG.md` dosyasına kaydedilir.
  4. `node scripts/validate-governance.mjs` ile kural sözleşmesi doğrulanır.
