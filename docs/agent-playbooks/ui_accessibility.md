# UI & Accessibility Playbook — BookmarkFlow Bar

Bu kılavuz, BookmarkFlow Bar kullanıcı arayüzü, tasarım sistemi, erişilebilirlik ve bütünsel kalite güvencesi kurallarını tanımlar.

---

## 1. Tasarım Sistemi ve Renk Dili

- **Ana Palet**: Koyu lacivert derin zemin (`#0b0f19`, `rgba(15, 23, 42, 0.94)`) ve altın/amber vurgu (`#f2c94c`).
- **Cam Efekti (Glassmorphism)**: `backdrop-filter: blur(10px)` ve ince altın bordürler (`border: 1px solid rgba(242, 201, 76, 0.65)`).
- **Temalar**: Settings ekranındaki Obsidian Dark, Midnight Gradient, Emerald Aurora ve kullanıcı özel duvar kağıtlarına saygı duyulur.
- **Tipografi**: Sistem font yığını (`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`).

---

## 2. Erişilebilirlik (WCAG 2.1 AA) Standartları

- **Odak Yönetimi & Odak Tuzakları (Focus Trap)**:
  - Tüm modal pencerelerde (`#addDialog`, `.bf-modal`) odak içeri hapsedilir; `Tab` ve `Shift+Tab` ile çift yönlü döngü sağlanır.
  - `Escape` tuşu açık modalları, arama kartlarını ve çubuğu deterministik olarak kapatır.
- **Semantik ve Canlı Bölgeler**:
  - Durum bildirimleri için `role="status"` ve `aria-live="polite"` kullanılır (`.nt-toast`, `.bf-toast`).
  - İkon butonları mutlaka `aria-label` veya `title` taşır.
- **Kontrast Oranı**: Metin ve zemin kontrastı WCAG AA standardı olan en az 4.5:1 oranını sağlamalıdır.

---

## 3. Bütünsel İkincil İyileştirme Standardı (Proactive Holistic QA - P0-16)

- **Kapsam**: İncelenen ekranda sadece istenen birincil özelliğe bakıp bırakılamaz.
- **Zorunlu Denetim**: Ziyaret edilen tüm sayfalarda (Yeni Sekme, Sayfa İçi Çubuk, Spotlight, Ayarlar, Ekleme Diyalogları):
  - Hizalama ve taşma (`overflow`) kusurları,
  - Padding ve margin dengesizlikleri,
  - Dokunsal ve hover geri bildirim eksiklikleri,
  - Koyu/Açık zemin kontrast bozuklukları,
  - Klavye odak halkası (`:focus-visible`) görünürlüğü
  proaktif olarak tespit edilir ve aynı turda kodda yerinde onarılır.

---

## 4. Toast Bildirim ve Geri Bildirim Standardı

- Arama kartından hızlı kayıt yapıldığında 1.8 saniyelik altın çerçeveli hafif toast (`.nt-toast`, `.bf-toast`) tetiklenir.
- Toast mesajı dinamik olarak hedef klasörün adını içerir.
- Çıkışta `.is-leaving` yumuşak dikey kayma animasyonu işletilir.

---

## 5. Agentic Motion, Medya Kalite Standardı ve Otonom Video İnisiyatifi (`scripts/inspect-motion-qa.mjs`, `scripts/validate-media-qa.mjs`)

- **Yapay Zeka Otonom İnisiyatifi (Autonomous Video Authority)**:
  - Yapay zeka asistanı dinamik yüzeylerde (çubuk açılış/kapanışı, yüzen simge yay fiziği, Spotlight paleti açılışı ve arama öneri kartları geçişi, New Tab modal ve diyalog efektleri) KULLANICIDAN AÇIK TALİMAT VEYA EMİR BEKLEMEZ.
  - Yapay zeka modeli bu doğrulamayı gerekli gördüğü her senaryoda kendi inisiyatifiyle `scripts/inspect-motion-qa.mjs` (`npm run qa:motion` veya `npm run qa:motion:auto`) çalıştırarak video denetimini icra eder ve Gemini Agentic Video motorunun analizini rapora dahil eder.

- **Kullanım ve Ayrım**:
  - **Statik Yüzeyler (Birincil Otorite: DOM / Sözleşme Testleri)**: Metinler, rozetler, buton etiketleri, padding, tema renkleri, klavye odak halkaları ve layout taşmaları için milisaniyelik yerel sözleşme testleri (`npm test`) sıfır ek gecikmeyle ve sıfır token maliyetiyle yürütülür.
  - **Dinamik / Hareketli Yüzeyler (Agentic Video Otoritesi)**: Aşağıdaki alanlarda yapılan değişiklik veya doğrulamalarda 3-5 saniyelik Chromium video kaydı alınır ve Gemini Agentic Video motoruna iletilerek analiz edilir:
    1. **Sayfa İçi Çubuk (`Alt+Shift+B`)**: Genişleme/daralma yay animasyonları, yüzen simge (`.bf-mark`) mikro-etkileşimi, sayfa itilmesi (`offsetPage`) reflow sıfır-yırtılma garantisi.
    2. **Spotlight Paleti (`Alt+Shift+K`)**: Merkezde açılış yay fiziği, arama öneri kartları ve hızlı çip geçiş akıcılığı, klasör açılır seçici menü geçişleri.
    3. **Yeni Sekme (New Tab) ve Modallar**: Ekleme diyaloğu (`#addDialog`), URL sallanma (`shake`) animasyonu, arka plan geçişleri.
    4. **Akıcılık & Jank Denetimi**: 60 FPS akıcılık, kaydırma takılmaları (frame drop) veya anlık görsel yırtılma (glitch) tespiti.

- **Otomatik Kusur Saklama (Auto Artifact Preservation)**:
  - Video analizinde kusur (jank, glitch, frame drop, layout defect) tespit edilirse video dosyası silinmez; otomatik olarak `live_motion_qa_<surface>_<timestamp>_issue.webm` adıyla aktif Antigravity artifact dizinine taşınır ve konsola `[ARTIFACT: ...]` URI'si basılır.

- **Otomatik Yaşam Döngüsü (Auto-Purge Lifecycle)**:
  - Video kaydı temiz geçtiğinde geçici video dosyaları otomatik olarak silinir (`Auto-Purge`); disk ve bellek dolması engellenir (`--keep-video` veya `--artifact-trace` ile manuel saklanabilir).

- **Donanımsal Çerçeve Sayacı & Canlı Yolculuk Otonom Tetikleme (FPS Dropped-Frame Inspector)**:
  - Canlı kullanıcı yolculuğu simülasyonunda (`scripts/user-journey-live-qa.mjs`) Chromium CDP `Performance.enable` ve `Animation.enable` ile `requestAnimationFrame` zamanlaması dinlenir.
  - Dinamik yüzey geçişlerinde (Çubuk, Spotlight, New Tab) düşen kare sayısı eşiği aşıldığında (`droppedFrames > 2`) Agentic Video QA otonom olarak devreye girer ve milisaniyelik takılma analizi yürütür.

- **Medya Varlık Kalite Kapısı (`npm run qa:media`)**:
  - Tanıtım videoları, sosyal medya kesitleri ve tur GIF'leri sıfır kişisel veri, tam kadraj (kırpılmamış alt kenarlar) ve görsel hijyen için fail-closed doğrulanır.

- **Otonom Chrome DevTools ve Modern Web Guidance Teftişi (BF-GOV-011 / Karar 20)**:
  - Erişilebilirlik (ARIA etiketleri, kontrast oranları WCAG AA 4.5:1, klavye döngüsü), Largest Contentful Paint (LCP) ve bellek sızıntısı testlerinde Chrome DevTools MCP ve Modern Web Guidance ilkeleri yapay zeka tarafından doğrudan otonom işletilir.

---

## 6. Eklenti Kusursuz Kalite Dörtgeni (Extension Quality Quadrumvirate - Karar 31)

Eklenti arayüzlerinde (Sayfa İçi Çubuk, Spotlight Paleti, Yeni Sekme Paneli, Popup ve Ayarlar) yapılan görsel veya etkileşimli değişikliklerde yalnızca kodun derlenmesi veya sözleşme testlerinin geçmesi nihai yeterlilik sayılamaz. Tam kalite onayı için aşağıdaki 4 hakemli denetim çemberi uygulanır:

1. **Görsel & Hareket Hakemi (Visual & Motion Arbiter)**:
   - **Araçlar**: Playwright + Gemini Agentic Video (`npm run qa:motion`) + `scripts/validate-media-qa.mjs`.
   - **Kapsam**: Sayfa içi çubuk (`Alt+Shift+B`), Spotlight (`Alt+Shift+K`) ve New Tab geçişlerinde 60 FPS akıcılık, yay fiziği, sıfır jank ve sıfır layout taşması denetimi.
2. **Sayfa İzolasyonu ve Shadow DOM Hakemi (Shadow DOM & Isolation Arbiter)**:
   - **Araçlar**: Chrome DevTools MCP (`evaluate_script`, `get_computed_styles`) + `tests/content-contract.test.mjs`.
   - **Kapsam**: Sayfa içi çubuğun kapalı Shadow DOM (`attachShadow({ mode: "closed" })`) sızıntısızlığı, barındırıcı sayfanın CSS değişkenlerinden veya global sıfırlamalarından etkilenmeme garantisi.
3. **Erişilebilirlik ve Kontrast Hakemi (A11y & Contrast Arbiter)**:
   - **Araçlar**: `a11y-debugging` MCP + WCAG 2.1 AA kuralları + klavye odak halkaları (`:focus-visible`).
   - **Kapsam**: Minimum 4.5:1 kontrast oranı, tüm modal ve arama kartlarında çift yönlü döngüsel odak tuzağı (`focus trap`), `Escape` ile deterministik kapanma ve ekran okuyucu semantikleri (`role="status"`, `aria-live="polite"`).
4. **Yerel Gizlilik ve Manifest V3 Hakemi (Zero-Cloud & MV3 Arbiter)**:
   - **Araçlar**: `node scripts/mv3-api-audit.test.mjs` + `node scripts/verify-public-tree.mjs` + CSP denetimi.
   - **Kapsam**: Sıfır harici ağ isteği, sıfır eval / new Function, Service Worker DOM bağımsızlığı ve %100 yerel depolama (`chrome.storage.local`) veri bütünlüğü.
