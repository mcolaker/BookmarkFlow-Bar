# BookmarkFlow Bar Açık İşler

Son güncelleme: 2026-08-02

Otorite: Bu dosya kanonik durum ve kanıt kaydıdır. Proje çalışma kuralları için [AGENTS.md](../../AGENTS.md) otoritedir.

## Kapanış sözleşmesi

`OPEN` çalışmaya hazır, `IN_PROGRESS` uygulaması veya doğrulaması başlamış, `BLOCKED` ise cihaz, kullanıcı kararı, dış hesap/yetki veya harici kanıt bekleyen iştir. Bir görev yalnız kod yazıldığı, kısmen ilerlediği veya başka işe geçildiği için kapanmaz. Kabul kriteri ve doğrulama kapısı somut kanıtla geçmeden `DONE` yapılamaz. Her kullanıcı işinin başında ve sonunda bu dosya okunur; yeni bulgular eklemeli yazılır, açık ya da tamamlanan kayıtlar kanıtsız silinmez.

## P1 - Ürün doğruluğu ve yönetişim

## BF-GOV-001 - Kanonik backlog ve kanıt sözleşmesini kur

- Öncelik ve durum: P1, DONE.
- Kök neden ve kanıt: Projede `AGENTS.md`, kanonik görev defteri ve makinece doğrulanan durum geçişi bulunmuyordu; `AGENTS.md`, bu backlog, fail-closed validator, negatif regresyon testleri ve CI kapısı eklendi.
- Kabul kriteri: Tek kanonik backlog, stabil görev kimlikleri, izinli durumlar, zorunlu kanıt/kabul/gate/sonraki-adım alanları ve başlangıç-kapanış uzlaştırması proje talimatlarında tanımlandı.
- Doğrulama kapısı: `node scripts/validate-backlog.mjs` ve `node --test scripts/backlog-contract.test.mjs` temizdir; CI aynı kapıları zorunlu çalıştırır.
- Sonraki adım: Yok; yeni veya yeniden açılan işler stabil `BF-*` kimliğiyle bu dosyaya eklenir.
- Son güncelleme: 2026-08-02.

## BF-I18N-001 - İngilizce/Türkçe yerelleştirme geçişini kanıtla

- Öncelik ve durum: P1, DONE.
- Kök neden ve kanıt: Ürün arayüzü Türkçe sabit metinlere bağlıydı ve global tanıtım için tarayıcı diline göre İngilizce/Türkçe sunum gerekiyordu. `_locales/`, `src/i18n.js`, yerelleştirilmiş manifest ve tüm ana UI yüzeyleri eklendi.
- Kabul kriteri: Manifest varsayılan locale'i, bütün kullanılan çeviri anahtarları, İngilizce/Türkçe anahtar paritesi, güvenli fallback, popup/new-tab/onboarding/content/settings yüzeyleri ve erişilebilir metinler tutarlıdır.
- Doğrulama kapısı: `validate-project` locale anahtar paritesini ve tüm kaynak referanslarını doğruladı. Güncel unpacked kaynak iki ayrı geçici gerçek Chrome profilinde `--lang=en` ve `--lang=tr` ile yüklendi; service worker, new-tab ve onboarding dili/metni iki çalışmada da beklenen değerlerle geçti. İki çalışmada da bookmark ekleme, content-script ve gizlilik regresyonları temizdi.
- Sonraki adım: Yok; yeni locale eklendiğinde aynı anahtar paritesi ve Chrome smoke matrisi genişletilir.
- Son güncelleme: 2026-08-02.

## BF-EXT-001 - Sayfa içi çubuğun hedef Chrome profilinde yüklenmesini doğrula

- Öncelik ve durum: P1, DONE.
- Kök neden ve kanıt: Önceki tanıda panel toolbar popup değil content script tarafından oluşturuluyordu. Kullanıcı ekran görüntülerinde çubuk ve klasör rayı artık görünür; güncel kaynakla geçici gerçek Chrome profilinde content script stili, kapalı Shadow DOM, güvenli ekleme akışı ve yerel host tercihi regresyonu geçmiştir.
- Kabul kriteri: Güncel kaynak unpacked olarak yüklenir; sıradan izinli HTTPS sayfasında kök ve stiller görünür, genel kapatma/devre dışı host/hassas host durumları ayrı ve anlaşılır sonuç verir.
- Doğrulama kapısı: Güncel kaynakla gerçek headless Chrome iki dilde yeniden yüklendi. Normal sayfada extension stili ve ikinci kapalı root oluştu; özel bookmark sayfaya sızmadı. `payment.example` hassas hostunda ve kullanıcı tarafından devre dışı bırakılan `127.0.0.1` hostunda yalnız sayfaya ait sentetik root kaldı; BookmarkFlow rootu oluşturulmadı. Güvenilir overlay ve new-tab bookmark ekleme akışları geçti.
- Sonraki adım: Yok; yeniden görülürse aynı smoke matrisini hedef kullanıcı profilinde tekrar çalıştır ve console/manifest kayıtlarını ekle.
- Son güncelleme: 2026-08-02.

## BF-REL-001 - Profesyonel global GitHub sürümünü yayımla

- Öncelik ve durum: P1, IN_PROGRESS.
- Kök neden ve kanıt: Genel repo kaynak kodu içeriyordu ancak global ürün sunumu, kalıcı gizlilik URL'si, erişilebilir iki dilli arayüz, açık lisans duruşu, korumalı ana dal ve indirilebilir sürüm paketi eksikti.
- Kabul kriteri: Kapsamlı İngilizce ürün sayfası, gizlilik/destek rotaları, açık lisans bildirimi, mağaza metinleri, doğrulanmış sürüm ZIP'i ve SHA-256 özeti yayımlanır; yalnız `BookmarkFlow-Bar` reposunun `main` dalı korunur.
- Doğrulama kapısı: Yerel doğrulamalar, GitHub Actions, Pages build ve release asset doğrulaması terminal başarı verir; repo dışına yazılmaz.
- Sonraki adım: Kapsamlı dalı PR ile birleştir, Pages'i etkinleştir, `main` korumasını doğrula ve `v0.1.35` sürümünü yayımla.
- Son güncelleme: 2026-08-02.
