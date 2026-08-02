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

## BF-OSS-001 - Codex for Open Source uygunluk ve benimsenme kanıtını oluştur

- Öncelik ve durum: P1, BLOCKED.
- Kök neden ve kanıt: OpenAI Codex for Open Source programı aktif açık kaynak projelerin birincil veya çekirdek bakım sorumlularını; anlamlı kullanım, ekosistem önemi ve sürekli bakım kanıtlarıyla değerlendiriyor. Hak sahibi 2026-08-02 tarihinde `Apache-2.0 + ayrı marka politikası + inbound=outbound/DCO` modelini açıkça onayladı. Resmî Apache-2.0 ve DCO 1.1 metinleri, `NOTICE`, marka, yönetişim, yol haritası, destek ve katkı sözleşmeleri; PR commit aralığını fail-closed denetleyen CI; 14/14 binary varlık için boyut/SHA-256 köken kaydı ve sentetik verilerle yeniden üretilmiş beş pazarlama görseli hazırlandı. Açık kaynak kontratı 14/14, backlog kontratı 5/5, manifest `0.1.37` proje doğrulaması, 80 dosyalık public-tree ve İngilizce/Türkçe gerçek Chrome güvenlik regresyonları temizdir. PR #12'nin `validate` işi terminal `success` verdi; PR `79f500f` merge commit'iyle korumalı `main` dalına birleştirildi ve aynı commit'in `main` doğrulaması da terminal `success` oldu. `v0.1.37` etiketi bu merge commit'ine bağlıdır; GitHub Release içindeki ZIP `uploaded` durumunda ve GitHub asset digest'i `414ca7bbaf5c82999a39822c0759f3e968224af61bc30ab31fab1a00c2f19e47` değeriyle yerel SHA-256 özetini doğruluyor. GitHub lisansı `Apache-2.0` olarak tanıyor; Pages ürün ve gizlilik rotaları HTTPS `200` döndürüyor; Issues ve Discussions etkindir. ImgBot PR #2 birleştirilmeden kapatıldı ve uzak `imgbot` dalı silindi. Yayın anındaki canlı kanıt 3 yıldız, 2 izleyici, 0 fork, 0 açık issue/PR ve `v0.1.37` varlıklarında 0 indirme gösterdiğinden organik dış kullanım, sürdürülmüş bakım etkinliği, programa kabul ve altı aylık fayda etkinleştirmesi henüz kanıtlanmış değildir.
- Kabul kriteri: Hak sahibinin açık onayıyla gerçek bir açık kaynak lisans modeli seçilir; üçüncü taraf katkı ve görsel kaynak sahipliği çözülür; kod lisansı ile marka/resmî sürüm sınırı, gelecek katkıların inbound lisansı ve bakım yönetişimi açıkça belgelenir; doğrulanmış açık kaynak sürümü yayımlanır; mağaza kullanıcıları, sürüm indirmeleri, dış issue/PR/Discussion katkıları ve sürdürülen release faaliyeti gibi organik benimsenme kanıtları tarihli olarak kaydedilir; başvuru doğru ve eksiksiz bilgilerle gönderilir ve program kabulü ile fayda etkinleştirmesi kanıtlanır.
- Doğrulama kapısı: Seçilen lisans GitHub tarafından beklenen SPDX kimliğiyle tanınır; lisans/marka/katkı belgeleri birbiriyle çelişmez; public-tree, proje, backlog ve güvenlik regresyonları temizdir; yayımlanan kaynak etiketi ile mağaza paketi eşleşir; başvuru ölçümleri yeniden üretilebilir kamusal veya yönetici paneli kanıtına dayanır; OpenAI seçim ve etkinleştirme durumu son kullanıcıya ait gizli değerler yayımlanmadan doğrulanır.
- Sonraki adım: Chrome Web Store kararı ve temiz mağaza kurulum kanıtı tamamlandıktan sonra mağaza kullanıcılarını; GitHub release indirmelerini; dış issue, PR ve Discussion katkılarını; düzenli bakım ve sonraki release faaliyetini tarihli olarak izle. Organik kullanım ve bakım kanıtı anlamlı hale geldiğinde resmî Codex for Open Source formuna yalnız doğrulanmış ölçümlerle başvur; OpenAI seçim ve fayda etkinleştirme kanıtı gelene kadar görevi açık tut.
- Son güncelleme: 2026-08-02.

## BF-STORE-001 - Chrome Web Store inceleme gönderimini tamamla

- Öncelik ve durum: P1, BLOCKED.
- Kök neden ve kanıt: Kullanıcı `v0.1.35` paketini doğru BookmarkFlow Bar kaydına yükledi; yayın öncesi politika denetiminde yeni sekme aramasının Google'a sabitlendiği ve Chrome Web Store'un varsayılan arama tercihini korumak için Chrome Search API kullanımını zorunlu tuttuğu doğrulandı. `v0.1.36` bu davranışı düzeltti; mağaza girişi, gizlilik, dağıtım, test talimatları, `search` izin gerekçesi ve sağlayıcıdan bağımsız ekran görüntüsü güncellendi. Dashboard geniş ana makine izninin ayrıntılı inceleme gerektireceğini bildirdi; bu izin sıradan web sayfalarında otomatik çubuk gösterimi için korunarak kullanıcı uyarıyı kabul etti ve 2026-08-02 tarihinde incelemeye gönderdiğini doğruladı. Sonrasında GitHub kanonik sahibi `mcolaker` oldu; önceki `09mc.github.io` gizlilik URL'si 404 verdiği için dashboard'daki gizlilik ve destek URL'lerinin yeni kanonik adreslerle uzlaştırılması gerekiyor. Nihai Chrome Web Store kararı harici ve henüz kanıtlanmadı.
- Kabul kriteri: `v0.1.36` Chrome Search API ile kullanıcının mevcut varsayılan arama motorunu korur; izin, iki dil, mağaza açıklamaları, reviewer notları ve gizlilik politikası davranışla tutarlıdır; doğrulanmış ZIP aynı mağaza kaydına yüklenir; dashboard gizlilik ve destek URL'leri çalışan `mcolaker` kanonik adreslerini kullanır; kullanıcı nihai gönderimi onayladıktan sonra inceleme durumu kanıtlanır.
- Doğrulama kapısı: Backlog sözleşmesi, proje doğrulaması, public-tree, iki dilde güvenlik regresyonu ve gerçek Chrome'da varsayılan arama sağlayıcısı akışı temizdir. PR #5 `validate` kontrolü terminal `success` verdi ve `main` dalına birleştirildi; GitHub Pages gizlilik rotası Limited Use metniyle HTTPS `200` döndürdü. `v0.1.36` release ZIP'i ve SHA-256 dosyası `uploaded` durumda ve GitHub asset digest'i `d53fed4685fbf4b19c879a9180c08623d08a5f751ab0f3e5fdb649c809da9a33` değeriyle yerel paketi doğruluyor. Dashboard'a `0.1.36` yüklendi ve kullanıcı gönderimi tamamladığını bildirdi; mağaza onayı ve yayın sonrası temiz kurulum kanıtı bekleniyor.
- Sonraki adım: Chrome Web Store Dashboard'da gizlilik politikasını `https://mcolaker.github.io/BookmarkFlow-Bar/privacy/`, destek adresini `https://github.com/mcolaker/BookmarkFlow-Bar/issues` olarak doğrula veya güncelle; ardından dashboard ve yayıncı e-postasını izle. Durum `Approved` veya `Published` olduğunda herkese açık mağaza URL'sini, sürümü ve tarihi kaydet, mağazadan temiz kurulumla çubuk/yeni sekme/varsayılan arama akışını doğrula ve görevi `DONE` yap.
- Son güncelleme: 2026-08-02.

## BF-GOV-002 - Katkı topluluğu davranış standardını yayımla

- Öncelik ve durum: P2, DONE.
- Kök neden ve kanıt: Herkese açık repo katkı rehberi ve özel güvenlik bildirim kanalı içeriyor ancak katılımcılardan beklenen davranış, özel ihlal bildirimi, gizlilik, yaptırım sorumluluğu ve kademeli müdahale standardını tek bir kamusal sözleşmede tanımlamıyordu. Contributor Covenant 3.0 temel alınarak proje kapsamına uyarlanmış `CODE_OF_CONDUCT.md` eklendi; README ve katkı rehberi belgeye bağlandı, `.gitignore` allowlist'i ve proje doğrulayıcısı yeni zorunlu yönetişim dosyasını kapsayacak şekilde güncellendi.
- Kabul kriteri: Contributor Covenant 3.0 temel alınarak BookmarkFlow Bar kapsamına uyarlanmış İngilizce `CODE_OF_CONDUCT.md` yayımlanır; beklenen ve yasak davranışlar, kapsam, özel bildirim kanalı, güvenlik bildirimi ayrımı, gizlilik, misilleme yasağı, yaptırım basamakları ve CC BY-SA 4.0 atfı açıkça tanımlanır; README ve katkı rehberi belgeye bağlanır.
- Doğrulama kapısı: `node scripts/validate-backlog.mjs`, 5/5 backlog sözleşme testi, yedi zorunlu sunum dosyasını kapsayan `validate-project`, 68 dosyalık public-tree taraması ve `git diff --check` temizdir. PR #6 `validate` kontrolü terminal `success` verdi ve `ca17c3c8fe49342d2fb83c6a59a4fac5a6089367` merge commit'iyle `main` dalına birleştirildi; aynı commit için ana dal `validate` çalışması da terminal `success` verdi.
- Sonraki adım: Yok; gelecekte topluluk iletişim kanalı veya moderasyon sorumlusu değişirse belgeyi, bağlantıları ve özel bildirim rotasını birlikte güncelle.
- Son güncelleme: 2026-08-02.

## BF-GOV-003 - GitHub Discussions ve destek katılım yolunu yayımla

- Öncelik ve durum: P2, DONE.
- Kök neden ve kanıt: Herkese açık repo Issues, katkı rehberi ve güvenlik politikası içeriyor ancak topluluk soruları ile fikirlerini iş kapsamına alınmış bir issue açmadan konuşabilecekleri GitHub Discussions kapalıydı; README desteği de katkı kanallarını ve kaynak-görünür lisans sınırlarını tek bir bölümde açıklamıyordu.
- Kabul kriteri: Repo düzeyinde GitHub Discussions etkinleştirilir; README yıldız, sürüm takibi, Discussions, Issues, test, erişilebilirlik, yerelleştirme, dokümantasyon ve paylaşım yollarını açıkça sunar; güvenlik bildirimlerini özel kanala yönlendirir; fork ve katkıların `LICENSE.md` ile `CONTRIBUTING.md` koşullarına tabi olduğunu belirtir.
- Doğrulama kapısı: GitHub repo API'si `has_discussions: true` döndürdü ve herkese açık Discussions rotası HTTPS `200` verdi. Backlog doğrulaması, 5/5 sözleşme testi, `validate-project`, 68 dosyalık public-tree taraması, güvenlik regresyonu ve `git diff --check` temizdir. PR #8 `validate` kontrolü terminal `success` verdi ve `855d3a1d85a9c6a733c70a2a7752f87dbf2daf7f` merge commit'iyle `main` dalına birleştirildi; aynı commit için ana dal `Validate extension` çalışması `30755465039` ve Pages çalışması `30755464506` terminal `success` verdi.
- Sonraki adım: Yok; yeni topluluk kanalı eklenirse README yönlendirmelerini, lisans sınırlarını ve fail-closed destek doğrulamasını birlikte güncelle.
- Son güncelleme: 2026-08-02.

## BF-GOV-004 - Kanonik GitHub sahibi ve Pages bağlantılarını uzlaştır

- Öncelik ve durum: P1, DONE.
- Kök neden ve kanıt: GitHub repo API'si kanonik sahibi `mcolaker` olarak döndürürken kaynak ve mağaza belgelerinde önceki `09mc` sahibi kalmıştı; GitHub repo bağlantıları yönlendirilse de `https://09mc.github.io/BookmarkFlow-Bar/` 404, `https://mcolaker.github.io/BookmarkFlow-Bar/` ise 200 döndü. Pages dağıtımı da geçiş sırasında eski OIDC audience değeri nedeniyle başarısız oldu.
- Kabul kriteri: Manifest, README, yönetişim belgeleri, issue şablonu, Pages canonical/Open Graph bağlantıları, mağaza metinleri ve doğrulayıcı kanonik `mcolaker` repo/Pages adreslerini kullanır; geçmiş kanıt kaydı dışında eski `09mc` sahibi canlı bağlantı hedefi olarak kalmaz.
- Doğrulama kapısı: `validate-project` canlı bağlantı yüzeylerinde eski repo/Pages URL'lerini fail-closed reddediyor. Repo API'si `mcolaker/BookmarkFlow-Bar`, `has_discussions: true` ve `public` görünürlük döndürdü; kanonik Discussions, ürün ve gizlilik rotalarının üçü de HTTPS `200` verdi. Yerel backlog doğrulaması, 5/5 sözleşme testi, `validate-project`, 68 dosyalık public-tree taraması, güvenlik regresyonu ve `git diff --check` temizdir. PR #10 `validate` kontrolü terminal `success` verdi ve `702d393fe42bfa3855e6a1088b388296610a63ef` merge commit'iyle `main` dalına birleştirildi; aynı commit için ana dal `Validate extension` çalışması `30755763562` ve Pages çalışması `30755763218` terminal `success` verdi.
- Sonraki adım: Yok; Chrome Web Store dashboard URL uzlaştırması `BF-STORE-001` kapsamında açık tutulur.
- Son güncelleme: 2026-08-02.
