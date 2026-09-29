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

- **Medya Varlık Kalite Kapısı (`npm run qa:media`)**:
  - Tanıtım videoları, sosyal medya kesitleri ve tur GIF'leri sıfır kişisel veri, tam kadraj (kırpılmamış alt kenarlar) ve görsel hijyen için fail-closed doğrulanır.
