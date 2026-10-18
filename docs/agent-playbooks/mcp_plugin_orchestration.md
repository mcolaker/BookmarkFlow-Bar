# MCP & Autonomous DevTools Orchestration Playbook — BookmarkFlow Bar

Bu kılavuz, BookmarkFlow Bar projesinde yapay zeka asistanının otonom olarak devreye aldığı geliştirici araçlarını, MCP sunucularını, zorunlu tetikleme sınırlarını (Mandatory Trigger Gates) ve kural-ötesi tam otonom karar inisiyatifini (`AGENTS.md` P0-19 ve P0-20) tanımlar.

---

## 1. Çift Hatlı Otonomi İlkesi (Mandatory Gates + Universal Autonomy)

1. **Zorunlu Alan Tetikleyicileri (Mandatory Trigger Gates)**: Aşağıdaki matriste tanımlanan kritik alanlarda model tahmin yürütemez; ilgili uzman aracı veya MCP sunucusunu doğrudan devreye alır.
2. **Kural-Ötesi Tam Model Karar İnisiyatifi (Beyond-Rules Autonomous Discretion - BF-GOV-022)**: Yapay zeka asistanı yalnızca bu tablodaki alanlarla kısıtlı değildir. Kod hijyeni, hız, güvenlik, mimari sağlamlık veya kök neden analizi için gerekli gördüğü her an, kurallarda açıkça yazmasa dahi kurulu herhangi bir MCP aracını veya yeteneği (skill) kullanıcıdan onay beklemeden tam yetkiyle çalıştırır.
3. **Runtime / Dev-Time İzolasyonu (P0-1)**: Tüm MCP, Jev 1.14, Clef, Stitch ve Playwright araçları yalnızca yerel geliştirme ve CI (dev-time) katmanında çalışır; son kullanıcı eklenti paketine (`src/`) asla uzak ağ çağrısı sızamaz.

---

## 2. Çekirdek Eklenti ve MCP Zorunlu Tetikleme Matrisi

| Araç / MCP / Yetenek | Zorunlu Tetikleme Alanı (Mandatory Trigger Domain) | Kanonik Eylem ve Doğrulama |
|---|---|---|
| **Chrome DevTools MCP & `a11y-debugging`** | **Arayüz, Performans & Kapalı Shadow DOM**: Sayfa içi çubuk kapalı Shadow DOM izolasyonu (`attachShadow({ mode: "closed" })`), CSS layout taşmaları, ARIA/klavye odak halkaları (`:focus-visible`), 4.5:1 kontrast, bellek sızıntısı ve LCP profilleme. | `npm run inspect:dom`, `npm run guard:console` ve DevTools MCP ile DOM/bellek/a11y ağacını doğrula. |
| **Modern Web Guidance & Chrome Extensions** | **Manifest V3 & Tarayıcı API Standartları**: MV3 kuralları, Service Worker yaşam döngüsü, depolama kotaları (`chrome.storage.local`), modern CSS (`:has()`, `forced-colors: active`) ve güvenli DOM manipülasyonu. | `npm run test:mv3` sözleşme kapısını çalıştır; eski MV2 senkron API'lerini sıfırla. |
| **Google Developer Knowledge & Context7** | **Resmi Dokümantasyon & Standartlar**: Chromium kaynak kodu, Chrome Extensions API spesifikasyonları, W3C WAI-ARIA (Tablist, Combobox, Dialog) ve Web API resmi belgeleri. | Tahmin yürütmek yerine resmi belgeleri sorgula. |
| **TypeSafe Jev 1.14 & Gemini Agentic Video** (`jev` MCP, `inspect-visual-boxes.mjs --360`, `qa:motion`) | **360° Multimodal Kutulama Hakemliği & Hareket QA**: Görsel sınırlayıcı kutular (`jev_box`), estetik puanlama (`jev_score` 0..4), ekran durumu (`choice`), hizalama/kontrast (`noul`), 60fps yay fiziği ve sıfır jank video analizi (`processing: "agentic"`). | `npm run inspect:boxes`, `node scripts/inspect-visual-boxes.mjs --360` ve `npm run qa:motion` ile doğrula. |
| **Cloudflare Clef & Microsoft Decision-1** (`clef` MCP) | **Çift Hakem Konsensüsü & Kesintisiz Failover**: Kritik niyet yönlendirmesi, UI durum geçişleri, i18n parite denetimi ve Jev 1.14 erişilemediğinde sıfır kesintili otomatik yedek hakemlik (`microsoft-decision-1` / `consensus`). | `clef_decide`, `clef_classify`, `clef_check`, `clef_score` araçlarını veya `--360` otomatik failover hattını çalıştır. |
| **Google Stitch & Google Nano Banana Pro** (`stitch` MCP, `image-generator` / `evaluateProactiveStitchBananaGate`) | **Otonom Tasarım & Glassmorphic Bento Yükseltme Kapısı (BF-QA-010)**: `inspect-visual-boxes.mjs` içinde `triggerActive: true` (`designScore < 2.25`, `marginAsymmetryPx >= 8`, `overlapCount > 0`, `crowdedGapsCount > 2` veya `plain_vertical_stack`) tetiklendiğinde. | Kullanıcı sormadan Google Stitch ve Nano Banana Pro ile ekran hiyerarşisini `STUDIO_GRADE_GLASS_BENTO` seviyesine yükselt veya `[HIGH]` proaktif öneri sun. |
| **Live Chrome Pilot (CDP 9222) & Auto-Allow Daemon** (`live-chrome-pilot.mjs`, `publish-cws.mjs`, `publish-social.mjs`) | **Canlı Kullanıcı Oturumu & Mağaza/Sosyal Yayın**: Kullanıcının çalışan Chrome profiline `DevToolsActivePort` WebSocket üzerinden bağlanarak CWS paket yükleme ve X/LinkedIn duyurularını yürütme. | Geçici profil açma (P0-22); `ensureAutoAllowDaemon()` ile izin modalını otonom onayla ve `assertPreSocialReleaseGate` sıra kapısını işlet. |
| **Sequential Thinking & Codebase Memory** | **Derin Mimari, Bağımlılık Grafı & Büyük Dosya Bölme**: Çok adımlı refaktör zincirleri, yarış durumları (`race condition`), `check-architecture-guard.mjs` büyük dosya bölme planlaması ve ADR yönetimi. | Karmaşık değişikliklerden önce bağımlılık grafını ve adım adım etki analizini çıkar. |
