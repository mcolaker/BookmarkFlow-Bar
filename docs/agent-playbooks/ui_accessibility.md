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
