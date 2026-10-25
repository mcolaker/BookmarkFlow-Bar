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

## 6. 6 Sütunlu & 7 Boyutlu Kalite Matrisi, Durum Deltası (`t0 -> t1 -> t2`) ve Çok Aşamalı Akış Denetimi (Karar 31, 34, 45, 47 - BF-QA-006, BF-QA-010, BF-QA-011)

Eklenti arayüzlerinde (Sayfa İçi Çubuk, Spotlight Paleti, Yeni Sekme Paneli, Popup ve Ayarlar) yapılan görsel veya etkileşimli değişikliklerde yalnızca kodun derlenmesi veya tek bir statik ekran görüntüsü alınması nihai yeterlilik sayılamaz. Tam kalite onayı için **6 Sütunlu ve 7 Boyutlu Denetim Çemberi** uygulanır:

1. **1. Sütun — Gören Göz (Görsel, PNG Magic-Byte & Hareket Hakemi - Visual & Motion Arbiter)**:
   - **Araçlar**: Playwright + TypeSafe Jev 1.14 (`npm run inspect:360`) + Gemini Agentic Video (`npm run qa:motion`) + `validateImageMagicBytes` + `evaluateIdleBlinkAndRebuildLoop`.
   - **Kapsam**:
     - **PNG / JPEG İkili Başlık Koruması (`validateImageMagicBytes`)**: PowerShell `>` yönlendirmesiyle eklenen UTF-8 BOM (`EF BB BF`) bozulmasını önlemek için her görsel okunmadan önce PNG (`89 50 4E 47 0D 0A 1A 0A`) veya JPEG (`FF D8 FF`) sihirli baytları fail-closed doğrulanır.
     - **Boşta Titreme & Sonsuz Yeniden Çizim Dedektörü (`evaluateIdleBlinkAndRebuildLoop`)**: 1 saniyelik boşta bekleme arasında kare farkı (`changedRatio > 0.035`) veya `BF_STATE_CHANGED` mesaj fırtınası (`stateBroadcastCount >= 6`) varsa `IDLE_BLINK_OR_REBUILD_LOOP` hatası fırlatılır.
2. **2. Sütun — Düşünen Hakem (Shadow DOM & Karar Hakemi - State & Arbiter)**:
   - **Araçlar**: Cloudflare Clef & Microsoft Decision-1 çift hakem ve failover (`clef` MCP / OpenRouter Decisions API) + `scripts/inspect-extension-dom.mjs` (`npm run inspect:dom` - BF-QA-007).
   - **Kapsam**: Sayfa içi çubuğun kapalı Shadow DOM (`attachShadow({ mode: "closed" })`) sızıntısızlığı, barındırıcı sayfanın CSS değişkenlerinden etkilenmeme garantisi ve Jev 1.14 erişilemezse `microsoft/decision-1` modeline sıfır kesintili otomatik failover.
3. **3. Sütun — Standartlar & MV3 Hakemi (A11y, W3C Tablist & Zero-Deprecation Arbiter)**:
   - **Araçlar**: `npm run test:mv3` + `npm run guard:console` (`0` hata) + `scripts/ui-behavior-contract.test.mjs` + WCAG 2.1 AA kuralları + W3C WAI-ARIA Tablist deseni.
   - **Kapsam**: Çiplerde yatay klavye dolaşımı (`ArrowLeft`/`ArrowRight`/`Home`/`End`) ve roving tabindex (`tabindex="0"` ve `-1`), çift yönlü döngüsel odak tuzağı (`focus trap`), `Escape` ile deterministik kapanma, ekran okuyucu semantikleri (`role="status"`, `aria-live="polite"`), eski MV2 senkron metotlarının bulunmaması.
4. **4. Sütun — Tasarım ve Estetik Hakemi (Design Tokens, Stitch/Banana Gate & Zero Truncation Arbiter - BF-QA-010, BF-QA-011)**:
   - **Araçlar**: Google Stitch (`stitch` MCP) + Google Nano Banana Pro (`image-generator`) + `evaluateProactiveStitchBananaGate` (`scripts/inspect-visual-boxes.mjs --360`) + Global Design Tokens (`src/content.css`, `spotlight.css`, `newtab.css`).
   - **Kapsam**: Glassmorphic zeminler, 5 resmi tema (`sakura`, `ocean`, `emerald`, `obsidian`, `turquoise`), minimum 4.5:1 / 7:1 kontrast oranı, Windows Yüksek Kontrast modu (`forced-colors: active`) ve **Sıfır Kesik Etiket (`truncatedLabelsCount === 0` — buton/çip metinlerinde `'...'` veya `'…'` bulunmaması)**.
   - **Otonom Tasarım Yükseltme Kapısı (`[1C]` Stitch + Nano Banana Pro Trigger)**: `inspect-visual-boxes.mjs` her kutu/ekran denetiminde yerel geometriyi sıfır gecikmeyle ölçer (`marginAsymmetryPx > 24`, `overlapCount > 0`, `crowdedGapsCount > 2`, `truncatedLabelsCount > 0`, `plain_vertical_stack` veya `visualDesignScore < 2.25`). `STUDIO_GRADE_GLASS_BENTO` sertifikası için `visualDesignScore >= 3.50` ve `truncatedLabelsCount === 0` zorunludur.
5. **5. Sütun — Dil ve Çapraz Sızıntı Hakemi (3-Tier Localization & Cross-Locale Purity Arbiter - BF-QA-011)**:
   - **Araçlar**: `npm run test:raw-keys` + `scanI18nSuspiciousPatterns(elementsOrStrings, activeLocale)`.
   - **Kapsam**: Ham çeviri anahtarları (`nt_*`, `bar_*`, `quick_*`, `app_*`), çözülmemiş yer tutucular (`{{var}}`, `{name}`, `%s`, `$1`, `undefined`, `NaN`) ve İngilizce (`en`) arayüzde sızmış Türkçe kelimeler/karakterler (`Kaydet`, `İptal`, `Klasör`, `Ayarlar`, `Yeni Sekme`, `[ğüşöçıİĞÜŞÖÇ]`) sıfır toleransla taranır.
6. **6. Sütun — Durum Deltası (`t0 -> t1 -> t2`), Kalıcılık ve Çok Aşamalı Akış Hakemi (State Delta & Re-Entry Persistence Gate - BF-QA-011)**:
   - **Araçlar**: `scripts/inspect-visual-boxes.mjs` (`--save-baseline <tag>`, `--verify-delta <tag>`, `--expect-changed "<val>"`, `--expect-persisted`) ve `.agents/agents/bookmarkflow_live_qa_agent.md`.
   - **Kapsam**:
     - Etkileşimli hiçbir değişiklik tek kare fotoğrafla "çalışıyor" kabul edilmez; mekanik olarak **Önce (`t0`, `--save-baseline`) -> Eylem Sonrası (`t1`, `--verify-delta --expect-changed`) -> Yeniden Yükleme / Kalıcılık (`t2`, `--verify-delta --expect-persisted`)** üçlüsüyle doğrulanır.
     - **Çok Aşamalı Akış Denetimi (Multi-Step Flow Verification)**: `Popup -> Yeni Sekme -> Spotlight (Alt+Shift+K) -> Sayfa İçi Çubuk (Alt+Shift+B) -> Native Host Senkronu` zinciri uçtan uca test edilir.
