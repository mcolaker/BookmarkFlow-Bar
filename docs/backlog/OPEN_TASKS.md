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

- Öncelik ve durum: P1, DONE.
- Kök neden ve kanıt: Genel repo kaynak kodu içeriyordu ancak global ürün sunumu, kalıcı gizlilik URL'si, erişilebilir iki dilli arayüz, açık lisans duruşu, korumalı ana dal ve indirilebilir sürüm paketi eksikti.
- Kabul kriteri: Kapsamlı İngilizce ürün sayfası, gizlilik/destek rotaları, açık lisans bildirimi, mağaza metinleri, doğrulanmış sürüm ZIP'i ve SHA-256 özeti yayımlanır; yalnız `BookmarkFlow-Bar` reposunun `main` dalı korunur.
- Doğrulama kapısı: PR #3 için `validate` işi terminal `success` verdi ve `main` dalına birleştirildi. GitHub Pages build/deploy başarılı oldu; ürün ve gizlilik rotaları HTTPS üzerinden `200` döndürdü. `main` için zorunlu `validate`, güncel dal, PR, konuşma çözümü, admin uygulaması, force-push ve silme engelleri API ile doğrulandı. Private Vulnerability Reporting etkin; `v0.1.35` release ZIP'i ve SHA-256 dosyası `uploaded` durumda, GitHub asset digest'i `443197420831d42d467a5d4dc2bfa5f50eaba3b6f07c644ec8638facbded4bb5` değeriyle yerel özeti doğruluyor.
- Sonraki adım: Yok; sonraki sürümde manifest sürümünü artır, aynı kapıları çalıştır ve yeni etiket/paket özeti üret.
- Son güncelleme: 2026-08-02.

## BF-STORE-001 - Chrome Web Store inceleme gönderimini tamamla

- Öncelik ve durum: P1, IN_PROGRESS.
- Kök neden ve kanıt: Kullanıcı `v0.1.35` paketini doğru BookmarkFlow Bar kaydına yükledi; mağaza girişi, gizlilik, dağıtım ve test talimatları alanları ekran görüntüleri üzerinden dolduruldu. Yayın öncesi politika denetiminde yeni sekme aramasının Google'a sabitlendiği ve Chrome Web Store'un varsayılan arama tercihini korumak için Chrome Search API kullanımını zorunlu tuttuğu doğrulandı. Ayrıca Limited Use ve yerel sayfa başlığı/URL işleme açıklamalarının canlı gizlilik sayfasına çıkması gerekiyor.
- Kabul kriteri: `v0.1.36` Chrome Search API ile kullanıcının mevcut varsayılan arama motorunu korur; izin, iki dil, mağaza açıklamaları, reviewer notları ve gizlilik politikası davranışla tutarlıdır; doğrulanmış ZIP aynı mağaza kaydına yüklenir; kullanıcı nihai gönderimi onayladıktan sonra inceleme durumu kanıtlanır.
- Doğrulama kapısı: Backlog sözleşmesi, proje doğrulaması, public-tree, güvenlik regresyonu ve gerçek Chrome'da varsayılan arama sağlayıcısı akışı temiz olmalıdır. PR `validate` kontrolü terminal `success` vermeli, GitHub Pages gizlilik rotası yeni Limited Use metniyle HTTPS `200` dönmeli ve Dashboard yüklenen `0.1.36` sürümünü göstermelidir.
- Sonraki adım: `v0.1.36` değişikliğini doğrula, korumalı `main` için PR üzerinden yayımla, yeni ZIP ve SHA-256 üret; ardından kullanıcı aynı Dashboard kaydına yeni paketi yükler ve geri döndürülemez inceleme gönderiminden önce son ekran görüntüsüyle onay verir.
- Son güncelleme: 2026-08-02.

## BF-GOV-002 - Katkı topluluğu davranış standardını yayımla

- Öncelik ve durum: P2, IN_PROGRESS.
- Kök neden ve kanıt: Herkese açık repo katkı rehberi ve özel güvenlik bildirim kanalı içeriyor ancak katılımcılardan beklenen davranış, özel ihlal bildirimi, gizlilik, yaptırım sorumluluğu ve kademeli müdahale standardını tek bir kamusal sözleşmede tanımlamıyordu.
- Kabul kriteri: Contributor Covenant 3.0 temel alınarak BookmarkFlow Bar kapsamına uyarlanmış İngilizce `CODE_OF_CONDUCT.md` yayımlanır; beklenen ve yasak davranışlar, kapsam, özel bildirim kanalı, güvenlik bildirimi ayrımı, gizlilik, misilleme yasağı, yaptırım basamakları ve CC BY-SA 4.0 atfı açıkça tanımlanır; README ve katkı rehberi belgeye bağlanır.
- Doğrulama kapısı: Backlog sözleşmesi, proje doğrulaması ve public-tree taraması temiz olmalı; korumalı `main` için açılan PR'ın `validate` kontrolü terminal `success` vermeli ve PR birleştirilmelidir.
- Sonraki adım: Belgeleri yerel olarak doğrula, odaklı PR üzerinden yayımla; terminal CI ve merge kanıtını ekleyerek görevi `DONE` durumuna getir.
- Son güncelleme: 2026-08-02.
