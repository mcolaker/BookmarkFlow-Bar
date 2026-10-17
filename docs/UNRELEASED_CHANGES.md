# Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log)

Bu dosya, bir sonraki sürüme dahil edilecek tüm yeni özellikleri, kullanıcı deneyimi iyileştirmelerini, mimari geliştirmeleri ve hata düzeltmelerini kayıt altında tutar.

> **Sürüm Hazırlık Standardı Kuralı**:
> Kullanıcı "yeni sürümü oluşturalım" dediğinde veya "bu sürümde neler yaptık?" diye sorduğunda, doğrudan bu dosyadaki doğrulanmış maddeler kullanılır. Sürüm yayınlandığında buradaki maddeler `CHANGELOG.md` dosyasına taşınır ve bu dosya yeni sürüm döngüsü için sıfırlanır.

---

## [Sıradaki Sürüm / Unreleased] — Hazırlık Aşamasında

### Kullanıcı Deneyimi ve Arayüz (UX & UI)
- **Tam Ekran (`fullscreenchange`) / `visualViewport` Geçiş Koruması ve Chromium/Brave Yerleşik Alt Çubuk (`NewTabFooterView`) Güvenli Boşluğu (BF-UX-050)**: Sayfa içi kayan çubukta (`src/content.js`) tam ekran video/oyun/sunum moduna (`document.fullscreenElement` / `webkitFullscreenElement`) girildiğinde açık menü/modalların kapatılması, sayfa üst boşluğunun (`clearPageOffset`) sıfırlanması ve çubuğun otomatik gizlenmesi (`host.hidden = true`); tam ekrandan çıkılırken işletim sistemi pencere boyutu geçişinden kaynaklanan alt-kenar (`bf-bottom`) veya koordinat takılmalarını önlemek üzere anlık, `requestAnimationFrame` ve `140ms` kademeli yerleşim senkronizasyonu (`syncLayoutAfterFullscreen`) ile `visualViewport` resize dinleyicisi eklendi. Ayrıca Yeni Sekme sayfasında (`src/newtab.css`, `src/newtab.js`) Chromium 138+ ve Brave tarayıcısının 36px'lik yerleşik `NewTabFooterView` (`#ntp-footer` / `"Brave'i özelleştir"`) çubuğuyla çakışmayı önleyen `--nt-native-footer-safe-offset: 44px` güvenli alt boşluğu tanımlandı.

### Kalite, Test ve Otonom Hakemlik (QA & DevTools)
- **Ham Ekran Görüntüsü Pikselleriyle Canlı Jev 1.14 Multimodal Hakemliği (BF-QA-009 / Karar 42)**: OpenRouter Decisions API üzerinden TypeSafe Jev 1.14 modeline ham PNG/JPG ekran görüntülerinin aktarıldığı, `assets` alanı ve `TypeSafe-Danger-Zone-Images: true` başlığıyla doğrudan görsel piksellerin native olarak incelenip `{top, bottom, left, right}` kutu koordinatlarının çıkarıldığı multimodal görsel regresyon hakemliği ve sözleşme testleri (`scripts/visual-boxes-contract.test.mjs`, `scripts/inspect-visual-boxes.mjs --screenshot <path> --target <element>`).
- **Bounding-Box Destekli Görsel Regresyon Hakemi (BF-QA-008 / `npm run inspect:boxes`)**: Jev 1.14 ve Clef kutulama mimarisinden esinlenerek eklenti arayüz bileşenlerinin (`.bf-bar-container`, `.bf-spotlight-modal`, `.bf-filter-chip`, `.bf-toast`) sınırlayıcı kutularını (bounding box) piksel düzeyinde denetleyen, viewport sınır taşmalarını, asgari dokunma hedeflerini ve istenmeyen eleman çakışmalarını yakalayan otonom görsel hakem aracı (`scripts/inspect-visual-boxes.mjs`), Playwright `--box-qa` entegrasyonu ve sözleşme testleri (`scripts/visual-boxes-contract.test.mjs`).
- **Sosyal Medya Medya Kartı Ön-Kontrol Kapısı (BF-GOV-027 / Pre-Publish Visual Lint)**: `scripts/publish-social.mjs` içerisine X (16:9 / ~1.777) ve LinkedIn (1.91:1 / ~1.913) lansman görsellerinin en-boy oranını, çözünürlüğünü ve dosya bütünlüğünü doğrulayan `assertSocialCardVisualQuality` ön-kontrol kapısı ve sözleşme testi (`scripts/publish-social.test.mjs`).

### Yönetişim ve Güvenlik (Governance & Privacy)
- **Runtime vs. Dev-Time Kesin İzolasyon Sözleşmesi (Karar 41)**: Son kullanıcı eklenti çalışma zamanının (client runtime: content script, background, popup, newtab, spotlight) %100 yerel-öncelikli ve sıfır-bulut kaldığı; harici multimodal, vizyon kutulama ve LLM hakemlik araçlarının yalnızca geliştirme/CI (dev-time) aşamasında kullanılabileceği kural sözleşmesinde kesin çizgilerle tescillendi.
