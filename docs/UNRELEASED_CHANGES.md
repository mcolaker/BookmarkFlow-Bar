# Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log)

Bu dosya, bir sonraki sürüme dahil edilecek tüm yeni özellikleri, kullanıcı deneyimi iyileştirmelerini, mimari geliştirmeleri ve hata düzeltmelerini kayıt altında tutar.

> **Sürüm Hazırlık Standardı Kuralı**:
> Kullanıcı "yeni sürümü oluşturalım" dediğinde veya "bu sürümde neler yaptık?" diye sorduğunda, doğrudan bu dosyadaki doğrulanmış maddeler kullanılır. Sürüm yayınlandığında buradaki maddeler `CHANGELOG.md` dosyasına taşınır ve bu dosya yeni sürüm döngüsü için sıfırlanır.

---

## [Sıradaki Sürüm / Unreleased] — Hazırlık Aşamasında

### Kalite, Test ve Otonom Hakemlik (QA & DevTools)
- **Bounding-Box Destekli Görsel Regresyon Hakemi (BF-QA-008 / `npm run inspect:boxes`)**: Jev 1.14 ve Clef kutulama mimarisinden esinlenerek eklenti arayüz bileşenlerinin (`.bf-bar-container`, `.bf-spotlight-modal`, `.bf-filter-chip`, `.bf-toast`) sınırlayıcı kutularını (bounding box) piksel düzeyinde denetleyen, viewport sınır taşmalarını, asgari dokunma hedeflerini ve istenmeyen eleman çakışmalarını yakalayan otonom görsel hakem aracı (`scripts/inspect-visual-boxes.mjs`), Playwright `--box-qa` entegrasyonu ve sözleşme testleri (`scripts/visual-boxes-contract.test.mjs`).
- **Sosyal Medya Medya Kartı Ön-Kontrol Kapısı (BF-GOV-027 / Pre-Publish Visual Lint)**: `scripts/publish-social.mjs` içerisine X (16:9 / ~1.777) ve LinkedIn (1.91:1 / ~1.913) lansman görsellerinin en-boy oranını, çözünürlüğünü ve dosya bütünlüğünü doğrulayan `assertSocialCardVisualQuality` ön-kontrol kapısı ve sözleşme testi (`scripts/publish-social.test.mjs`).

### Yönetişim ve Güvenlik (Governance & Privacy)
- **Runtime vs. Dev-Time Kesin İzolasyon Sözleşmesi (Karar 41)**: Son kullanıcı eklenti çalışma zamanının (client runtime: content script, background, popup, newtab, spotlight) %100 yerel-öncelikli ve sıfır-bulut kaldığı; harici multimodal, vizyon kutulama ve LLM hakemlik araçlarının yalnızca geliştirme/CI (dev-time) aşamasında kullanılabileceği kural sözleşmesinde kesin çizgilerle tescillendi.
