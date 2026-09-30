# Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log)

Bu dosya, bir sonraki sürüme dahil edilecek tüm yeni özellikleri, kullanıcı deneyimi iyileştirmelerini, mimari geliştirmeleri ve hata düzeltmelerini kayıt altında tutar.

> **Sürüm Hazırlık Standardı Kuralı**:
> Kullanıcı "yeni sürümü oluşturalım" dediğinde veya "bu sürümde neler yaptık?" diye sorduğunda, doğrudan bu dosyadaki doğrulanmış maddeler kullanılır. Sürüm yayınlandığında buradaki maddeler `CHANGELOG.md` dosyasına taşınır ve bu dosya yeni sürüm döngüsü için sıfırlanır.

---

## [Sıradaki Sürüm / Unreleased] — Hazırlık Aşamasında

### Eklendi (Added)
- **Turkuaz Işıltı (Turquoise Glow) Teması ve Merkezi Tasarım Değişkeni Entegrasyonu (BF-UX-024)**:
  - Eklentinin 5. resmi renk teması olarak canlı ve yüksek kontrastlı Turkuaz Işıltı (`turquoise-glow`, parlak turkuaz vurgu `#22d3ee`, okyanus derinliğinde karanlık yüzeyler `#061318` ve buz turkuaz metin `#ecfeff`) geliştirildi.
  - Merkezi tasarım değişkenleri kütüphanesi (`src/design-tokens.css`), sayfa içi kayan çubuk (`src/content.css`), Spotlight & Komut Paleti (`src/spotlight.css`), Yeni Sekme sayfası (`src/newtab.css`), Popup kontrol kartı (`src/popup.css`), ve Ayarlar & Bakım yüzeyinde (`src/settings.css`) eksiksiz uygulandı.
  - `src/popup.html` arayüzüne 5'li şık segment seçicisi (`.segments-five`) ile `Turquoise / Turkuaz` seçeneği eklendi; `src/settings.js` içinde `SUPPORTED_THEMES` listesine dahil edildi.
  - İngilizce (`_locales/en`) ve Türkçe (`_locales/tr`) dil dosyalarında `themeTurquoise` anahtarı ile %100 dil paritesi sağlandı.
  - Eş zamanlı olarak eksik olan Siber İndigo (`cyber-indigo`) varyantı `src/design-tokens.css`, `src/spotlight.css` ve `src/settings.css` kütüphanelerine de işlenerek tasarım token bütünlüğü eksiksiz hale getirildi.
