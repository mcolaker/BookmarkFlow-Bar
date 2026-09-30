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
- **Turkuaz Okyanus Arka Planı (Turquoise Abyss) ve Canlı Klasör Rozeti Vurgusu (BF-UX-025)**:
  - Yeni Sekme sayfasına temadan bağımsız seçilebilen 5. duvar kağıdı olarak derin okyanus degrade geçişine sahip Turkuaz Uçurum (`turquoise-abyss`, `radial-gradient(circle at 50% 25%, #0e303d 0%, #061318 65%, #02070a 100%)`) eklendi.
  - `src/popup.html` içerisindeki yeni sekme arka planı kontrol kartı 5'li segment gridine (`.segments-five`) genişletildi ve `turquoise-abyss` seçeneği yerleştirildi.
  - `src/settings.js` içinde `SUPPORTED_NEWTAB_BACKGROUNDS` dizisine `"turquoise-abyss"` eklendi ve normalizasyon fonksiyonuyla güvenceye alındı.
  - Turkuaz temada yer imi klasörleri için okyanus derinliğinde yüzeyler (`--bf-folder-bg: #09202a`, `--bf-folder-border: #184656`, `--bf-folder-text: #ecfeff`, `--bf-folder-accent: #22d3ee`) ve klasör simgelerine (`.bf-folder-icon`, `.nt-folder-icon`) parlak turkuaz mikro ışıltı (`filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.45))`) uygulandı.
  - `_locales/en` ve `_locales/tr` yerelleştirme sözlüklerine `bgTurquoise` anahtarı eklenerek %100 dil paritesi korundu.
- **Ekran Kenarı Tutamacı (Edge Peek) ve Arama Aksiyon Butonlarında Turkuaz Işıltı (BF-UX-026)**:
  - Sayfa içi çubuk gizlendiğinde ekranın en sağ sınırında beliren minimalist geri getirme tutamacı (`.bf-edge-restore`), Turkuaz Işıltı (`turquoise-glow`) temasında parlak turkuaz dikey gradyan (`linear-gradient(180deg, transparent, rgba(34, 211, 238, 0.35) 15%, rgba(34, 211, 238, 0.95) 50%, rgba(34, 211, 238, 0.35) 85%, transparent)`) ve canlı gölge (`-2px 0 14px rgba(34, 211, 238, 0.65)`) ile temasal bütünlüğe kavuşturuldu; tıklama durumunda (`:active`) derin turkuaz parlama uygulandı.
  - Spotlight arama paleti (`Alt+Shift+K`), sayfa içi arama kartı ve Yeni Sekme arama sonuçlarında doğrudan kaydetme/hızlı klasör butonları (`.bf-command-action-chip`, `.nt-search-action-chip`, `.nt-inline-save-btn`), Turkuaz temada canlı turkuaz odak ve hover ışıltısı (`border-color: #22d3ee; color: #ecfeff; box-shadow: 0 0 10px rgba(34, 211, 238, 0.35);`) ile belirginleştirildi.
