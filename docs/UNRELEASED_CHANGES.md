# Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log)

Bu dosya, bir sonraki sürüme dahil edilecek tüm yeni özellikleri, kullanıcı deneyimi iyileştirmelerini, mimari geliştirmeleri ve hata düzeltmelerini kayıt altında tutar.

> **Sürüm Hazırlık Standardı Kuralı**:
> Kullanıcı "yeni sürümü oluşturalım" dediğinde veya "bu sürümde neler yaptık?" diye sorduğunda, doğrudan bu dosyadaki doğrulanmış maddeler kullanılır. Sürüm yayınlandığında buradaki maddeler `CHANGELOG.md` dosyasına taşınır ve bu dosya yeni sürüm döngüsü için sıfırlanır.

---

## [Sıradaki Sürüm / Unreleased] — Hazırlık Aşamasında

- **Windows 11 24H2+ WMI Süreç İzolasyonu ve Otonom Chrome Hata Ayıklama Onaylayıcısı (`BF-WIN-002`)**: Windows 11 24H2+ sürümlerinde kaldırılan `wmic.exe` komutu yerine `scripts/live-chrome-pilot.mjs` içindeki `ensureAutoAllowDaemon()` fonksiyonu `Get-CimInstance Win32_Process` ve `Invoke-CimMethod -ClassName Win32_Process -MethodName Create` (WMI bağımsız süreç oluşturma) mimarisine geçirildi; böylece `chrome_auto_allow_daemon.py` (`pythonw.exe`) terminal Job Object kapanışlarından etkilenmeden arka planda kesintisiz çalışacak şekilde güçlendirildi. Ayrıca `tools/windows-companion/windows-uia.ps1` içindeki `AutoConfirmChromeRemoteDebugging` fonksiyonu, Chrome'un ana pencere başlığı altında gömülü açılan `"Uzaktan hata ayıklamaya izin verilsin mi?"` balon diyaloğunu ve `"İzin ver"` / `"Allow"` butonunu doğrudan yakalayacak şekilde genişletildi.
- **Sosyal Medya Otomasyonu (`scripts/publish-social.mjs`) Yerel `<dialog>` ve Türkçe `'İleri'` (`U+0130`) Uyumluluğu**: `CdpClient.connect()` içerisine WebSocket el sıkışması sırasında eşzamanlı `ensureAutoAllowDaemon()` ve `triggerFastUiaAutoConfirm()` kancaları eklendi. LinkedIn medya yükleme akışında işletim sistemi dosya seçme penceresini (`Aç`) engelleyen `HTMLInputElement.prototype.click` koruması, `position: fixed` yerel `<dialog[open]>` elemanları için `getBoundingClientRect()` görünürlük kontrolü ve Türkçe büyük `'İ'` (`"İleri".toLocaleLowerCase('tr-TR') === 'ileri'`) karakter eşleşmesi tamamlandı.
