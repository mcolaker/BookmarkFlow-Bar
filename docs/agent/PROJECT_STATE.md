# PROJECT_STATE.md — BookmarkFlow Bar Canlı Proje Durumu

Son güncelleme: 2026-10-02
Aktif Sürüm: `0.3.1`
Aktif Dal: `main` (Sürüm: `v0.3.1`)

---

## 1. Mimari Genel Bakış ve Platform Matrisi

BookmarkFlow Bar, modern tarayıcılar ve Windows masaüstü için geliştirilmiş, yerel-öncelikli (zero-cloud, offline-first), yüksek performanslı (<1ms tepki süresi) bir yer imi ve üretkenlik ekosistemidir.

| Platform / Bileşen | Mimari / Teknoloji | Durum / Doğrulama |
|---|---|---|
| **Google Chrome / Chromium** | Manifest V3, Service Worker, Closed Shadow DOM | Canlı & Tam Uyumlu (`v0.3.1` Chrome Web Store'da yayında) |
| **Mozilla Firefox** | Gecko MV3 (`scripts/package-cross-browser.mjs`) | Doğrulandı (Zip derleme & SHA-256) |
| **Microsoft Edge** | Chromium MV3 uyumlu paket | Doğrulandı (Zip derleme & SHA-256) |
| **Windows Desktop Companion** | Node.js Native Messaging Host, Win32 `RegisterHotKey`, UIA | Doğrulandı (IPC testleri yeşil) |
| **Windows System Tray** | `System.Windows.Forms.NotifyIcon`, PowerShell 5.1/7+ | Doğrulandı (Sıfır yetim süreç) |

---

## 2. Test ve Kalite Durumu

- **Birim ve Sözleşme Testleri**: `npm test` -> 104/104 PASS (%100 yeşil).
- **Statik ve Açık Kaynak Doğrulama**: `npm run validate:all` -> PASS (Açık kaynak lisans, DCO, public tree, manifest, backlog ve yönetişim sözleşmeleri temiz).
- **Biçim ve Satır Sonu**: `git diff --check` -> Sıfır hata (CRLF/LF normalize, EOF boş satırsız).
- **Gizli Veri Denetimi**: Sıfır API anahtarı, sıfır token, sıfır mutlak kullanıcı yolu.

---

## 3. v0.3.1 Sürümü ile Yayına Alınan Özellikler (Turkuaz Işıltı & Okyanus Atmosferi)

v0.3.1 sürümü başarıyla derlenmiş, test edilmiş, GitHub Release olarak etiketlenmiş ve Chrome Web Store üzerinde Google incelemesinden geçerek resmen canlıya alınmıştır:

1. **Turkuaz Işıltı Teması (Turquoise Glow - BF-UX-024)**: Yüksek kontrastlı canlı turkuaz vurgular (`#22d3ee`), derin okyanus zeminleri (`#061318`, `#0a1a20`) ve buz-turkuaz metin tonları (`#ecfeff`) ile 5. resmi tema; ayarlar ve popup üzerinden anında geçiş, tam TR/EN yerelleştirme paritesi.
2. **Turkuaz Uçurum Yeni Sekme Duvar Kağıdı & Klasör Işıltısı (BF-UX-025)**: Yeni Sekme başlangıç sayfası için derin okyanus degrade arka planı (`turquoise-abyss`) ve varsayılan nötr klasör ikonları için turkuaz mikro ışıltı.
3. **Turkuaz Kenar Tutamacı & Arama Aksiyon Vurguları (BF-UX-026)**: Çubuk gizlendiğinde ekranın en sağ sınırında beliren geri getirme tutamacı (`.bf-edge-restore`) ve arama eylem butonlarında canlı turkuaz ışıltı.
4. **Turkuaz Toast İlerleme Çubuğu & Arama Odak Halkaları (BF-UX-027)**: Toast bildirimlerinin altındaki zaman aşımı çubuğunda (`.bf-toast-progress`, `.nt-toast-progress`) akıcı turkuaz animasyonu ve klavye odağı için güçlendirilmiş turkuaz odak halkaları (`:focus`).
5. **Kısayol Kartları Işıltısı & Sağlık Denetleyicisi Tema Senkronizasyonu (BF-UX-028)**: Yeni Sekme kısayol kartlarında zarif turkuaz hover/focus çerçevesi ve Yer İmi Bakım Merkezinde sağlık metrik rozetleri ve filtrelerinin aktif temayla tam renk uyumu.
6. **Canlı Saat / Karşılama Metninde Turkuaz Gradyan & Klasör Birleştirme Buton Fiziği (BF-UX-029)**: Yeni Sekme dijital saati ve karşılama metninde modern buz-turkuaz degrade geçişi; yinelenen klasörleri birleştirme butonunda (`#merge.primary`) neon turkuaz gradyan ve aktif basılma yay fiziği.
7. **Sosyal Medya Çift Bağlantı (Store & GitHub) & 280 Karakter Bütçe Zorunluluğu (BF-GOV-015 / Karar 22)**: X ve sosyal medya paylaşımlarında istisnasız hem resmi Chrome Web Store hem GitHub linkinin yer alması; t.co ve Unicode emoji ağırlıkları gözetilerek 280 sınırının fail-closed korunması.
8. **Otonom Geliştirici Araçları ve Teftiş İnisiyatifi (BF-GOV-011 / Karar 20)**: Yapay zeka asistanının Chrome DevTools (Shadow DOM izolasyonu, CSS layout, a11y, bellek sızıntısı), Modern Web Guidance ve Gemini API araçlarını tam otonom çalıştırma yetkisi.
9. **JaponiGo Yönetişim & İşletim Çekirdeği Mimarisi (BF-GOV-010)**: `AGENTS.md` operating kernel, kanonik kararlar indeksi (`DECISION_INDEX.md`) ve modüler alan playbook'ları (`docs/agent-playbooks/`).
10. **Terminal-Öncelikli GitHub CLI Standardı (BF-GOV-016 / Karar 23)**: GitHub üzerinde PR açma (`gh pr create`), CI izleme (`gh pr checks --watch`), birleştirme (`gh pr merge --auto --merge`) ve sürüm yönetiminin tarayıcı açılmadan doğrudan resmi `gh` CLI ile terminalden yürütülmesi; tarayıcı bağımlılığının sıfırlanması.
11. **GitHub Actions Otomatik PR Birleştirme ve PowerShell Ortam Entegrasyonu (BF-GOV-017 / Karar 24)**: GitHub reposunda `allow_auto_merge=true` kalıcı olarak etkinleştirildi; Windows PowerShell profilinde `Test-Command` ve `gh` ikili yolu otomatik yükleme mekanizması kuruldu.

---

## 4. Aktif Sınırlar ve Bilinen Kısıtlamalar

- **Chrome Omnibox Bildirimi**: Chrome adres çubuğundan `bf <url>` ile ekleme yapıldığında sayfa DOM'una erişilemediği için aktif sekmeye hafif runtime mesajı iletimi ilerleyen fazda genişletilebilir.
- **Masaüstü Companion Kurulumu**: Windows Companion kullanıcı tarafından `tools/windows-companion/install-companion.ps1` ile tek seferlik kayıt gerektirir.
