# Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log)

Bu dosya, bir sonraki sürüme dahil edilecek tüm yeni özellikleri, kullanıcı deneyimi iyileştirmelerini, mimari geliştirmeleri ve hata düzeltmelerini kayıt altında tutar.

> **Sürüm Hazırlık Standardı Kuralı**:
> Kullanıcı "yeni sürümü oluşturalım" dediğinde veya "bu sürümde neler yaptık?" diye sorduğunda, doğrudan bu dosyadaki doğrulanmış maddeler kullanılır. Sürüm yayınlandığında buradaki maddeler `CHANGELOG.md` dosyasına taşınır ve bu dosya yeni sürüm döngüsü için sıfırlanır.

---

## [Sıradaki Sürüm / Unreleased] — Hazırlık Aşamasında

### Yönetişim ve Geliştirici Deneyimi
- **Terminal-Öncelikli GitHub CLI Standardı (BF-GOV-016 / Karar 23)**: Pull Request açma, CI durumunu izleme ve birleştirme süreçlerinde tarayıcı ihtiyacını tamamen ortadan kaldıran resmi GitHub CLI (`gh`) entegrasyonu; `AGENTS.md` P0-17 kuralı altında otonom terminal iş akışının kurala bağlanması.
- **GitHub Actions Otomatik PR Birleştirme ve PowerShell Ortam Entegrasyonu (BF-GOV-017 / Karar 24)**: GitHub reposunda `allow_auto_merge` yetkilendirmesi ile CI sonrasında sıfır gecikmeli birleştirme; Windows PowerShell profilinde `Test-Command` ve dinamik `gh` yolu ile tüm yerel kabuklarda anında CLI erişimi.
- **GitHub CLI Otomatik Release Betiği ve Pre-Push Kalite Kancası (BF-GOV-018 / Karar 25)**: `npm run release:github` (`scripts/release-github-cli.mjs`) ile GitHub Release'e tek adımda paket ve SHA-256 sağlama toplamı yükleme otomasyonu; hatalı push'ları engelleyen yerel `.githooks/pre-push` kalite kancası.
- **Tek Komutla Sürüm Etiketleme, Paketleme ve GitHub Release Orkestrasyonu (BF-GOV-019 / Karar 26)**: `npm run release:full` (`scripts/release-pipeline.mjs`) ile test doğrulama, çalışma ağacı denetimi, Git annotated imzalı etiketleme, Chromium/Firefox/Edge paketleme ve GitHub Release yükleme adımlarının tek bir orkestrasyon betiğinde birleştirilmesi.
- **JaponiGo Çekirdek Sinerjisi ve 3-Kademeli Raw-Key Güvencesi (BF-GOV-020 / Karar 27)**: Otonom ara kilometre taşı commit yetkisi (`git commit -s`), iki kollu tarayıcı mimarisi (`User's Live Chrome Invariant - CDP 9222`), asgari ön inceleme & uygulama sınırları (Minimum Preflight) ve canlı arayüzlerde çevrilmemiş ham anahtar/mojibake taranmasını sağlayan `npm run test:raw-keys` sözleşme testi.
