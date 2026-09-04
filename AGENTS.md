# BookmarkFlow Bar Proje Talimatları

Bu dosya AI kodlama ajanları (Codex, Antigravity vb.) için ana proje giriş sözleşmesidir. Ürün davranışı için gerçek kaynak kodu ve `README.md`, güvenlik için `SECURITY.md`, kalıcı iş durumu için `docs/backlog/OPEN_TASKS.md` otoritedir.

## Zorunlu başlangıç

- Her anlamlı işten önce bu dosyanın tamamını, `docs/backlog/OPEN_TASKS.md` dosyasını ve güncel Git durumunu oku.
- İşi mevcut bir backlog kimliğiyle eşleştir. Kalıcı ve yeni bir işse aynı turda benzersiz `BF-<ALAN>-NNN` kimliğiyle kayıt aç; aynı kök neden için ikinci kayıt oluşturma.
- Kullanıcıya ait mevcut değişiklikleri koru. İlgisiz dosyaları düzeltme, yeniden biçimlendirme, stage etme veya commit kapsamına alma.
- Önce kök nedeni ve yeniden üretim kanıtını belirle; yalnız belirtiye göre kod değiştirme.

## Backlog sürekliliği

- Tek kanonik durum kaydı `docs/backlog/OPEN_TASKS.md` dosyasıdır. Sohbet planı, geçici terminal çıktısı veya model belleği bu dosyanın yerine geçmez.
- Durumlar yalnız `OPEN`, `IN_PROGRESS`, `BLOCKED` ve `DONE` olabilir. İşe başlanınca `IN_PROGRESS`; cihaz, kullanıcı kararı, dış hesap/yetki veya harici kanıt gerekiyorsa açık gerekçeyle `BLOCKED` kullanılır.
- Her görev stabil kimlik, öncelik/durum, kök neden ve kanıt, kabul kriteri, doğrulama kapısı, sonraki adım ve son güncelleme tarihi taşır.
- Yeni kanıt eskisini silmeden eklenir. Konu değişmesi, kısmi kod, tek bir testin geçmesi veya planın yeniden yazılması açık işi düşürmez.
- Bir görev yalnız kabul kriteri ve doğrulama kapısı somut kanıtla geçtiğinde `DONE` olur. Tamamlanan görev silinmez; regresyon tarihli kanıtla görünür biçimde yeniden açılır veya eski kimliğe bağlı yeni görev oluşturulur.
- Her anlamlı işin sonunda aktif plan ile bütün açık kayıtları uzlaştır ve `node scripts/validate-backlog.mjs` ile `node --test scripts/backlog-contract.test.mjs` çalıştır.

## Uygulama ve doğrulama

- Manifest V3, yerel-öncelikli gizlilik, güvenli URL protokolleri, kapalı Shadow DOM, erişilebilirlik etiketleri ve klavye davranışını koru.
- Runtime bağımlılığı veya uzak servis ekleme; zorunluysa önce gizlilik, izin, güvenlik ve geri alma etkisini kanıtla.
- Kaynak değişikliğinde önce `node scripts/validate-project.mjs`, ardından `node scripts/verify-public-tree.mjs` çalıştır. Güvenlik veya tarayıcı davranışı etkileniyorsa `node scripts/security-regression.mjs` ve gerçek Chrome doğrulaması da zorunludur.
- Görünür UI değişikliği klavye, açık/koyu arka plan, ilgili viewport ve Chrome extension reload kanıtı olmadan tamamlanmış sayılmaz.
- Stage ve commit kapsamı yalnız bu işe ait dosyalardan oluşur; tarayıcı profili, yerel extension verisi, kişisel bookmark/geçmiş, output, paket veya secret eklenmez.
- Ajanlar ve araçlar projenin kök dizinine geçici dosya, test medyası (mp4/png), yedek dizin veya tarayıcı profili bırakamaz; geçici çıktılar `.gemini/.../scratch/` veya `.gitignore` kapsamındaki yollarda tutulur ve işlem sonunda temizlenir.

## GitHub işlem yetkilendirmesi

- Hak sahibi 2026-08-09 tarihinde rutin GitHub iş akışı ve Chrome Web Store dashboard işlemleri için tur başına açık onay beklenmemesine karar verdi; karar `docs/backlog/OPEN_TASKS.md` içinde `BF-GOV-007` kimliğiyle kalıcı kayıt altındadır.
- Onay gerektirmeyen rutin işlemler: dal oluşturma ve push, PR açma/güncelleme, doğrulama kapıları yeşil olan PR'ları merge etme, Chrome Web Store dashboard güncelleme ve inceleme gönderimleri, iş kapsamındaki DCO imzalı commit'ler.
- Açık kullanıcı onayı gerektiren işlemler: sürüm etiketi ve GitHub Release yayını, LinkedIn/X gibi harici platform yayınları, `main` dalına doğrudan veya force push, uzak dal veya repo silme, lisans/marka politikası değişiklikleri.
- Merge öncesi zorunlu kapılar: ilgili doğrulama betikleri yerel olarak geçmeli ve GitHub Actions terminal `success` vermelidir; tüm commit'ler DCO `Signed-off-by` satırı taşımalıdır.

## Açık kaynak ve yayın bütünlüğü

- Proje kodu `LICENSE.md` içindeki Apache License 2.0 koşullarıyla yayımlanır. `NOTICE` yalnız gerekli telif ve atıf bildirimlerini, `TRADEMARKS.md` ise kod lisansından ayrı marka kullanım sınırlarını tanımlar; Apache lisans haklarını marka metniyle daraltma.
- Katkılar yalnız Apache-2.0 altında, ek veya farklı koşul olmadan alınır. Her katkı commit'i `DCO` metnindeki Developer Certificate of Origin 1.1 beyanına uygun geçerli bir `Signed-off-by` satırı taşımalıdır.
- Yeni veya değiştirilen görsel/binary varlıkların kaynağını, üretim yöntemini, hak durumunu ve doğrulama özetini `docs/ASSET_PROVENANCE.md` içinde kaydet. Kişisel bookmark, gerçek profil verisi veya belgesiz üçüncü taraf marka/içeriği yayın varlıklarında kullanma.
- Yönetişim kararları `GOVERNANCE.md`, yön ve kapsam `ROADMAP.md`, kullanıcı/katkıcı destek rotaları `SUPPORT.md`, güvenlik bildirimleri `SECURITY.md` üzerinden yürütülür; bu belgeler arasındaki bağlantı ve sorumluluk sınırlarını birlikte güncelle.
- Sürüm yayınında manifest sürümü, `v<manifest-sürümü>` etiketi, kaynak commit'i, arşiv adı ve SHA-256 özeti birebir eşleşmelidir. Chrome ZIP'i `LICENSE.md`, `NOTICE` ve `TRADEMARKS.md` dosyalarını içerir; bakım belgeleri ve yerel üretim çıktıları pakete girmez.

## Profesyonel görsel ve sürüm sunum standardı

- Her yeni sürümde (release) veya görünür UI değişikliğinde; kullanıcının tur başına açık hatırlatması beklenmeksizin profesyonel tanıtım görselleri, sosyal medya duyuru metinleri (X ve LinkedIn için karakter, etiket ve link standartlarına uygun), iki dilli Chrome Web Store güncelleme notları ve eksiksiz sürüm belgeleri proaktif olarak hazırlanmalıdır.
- Tanıtım görselleri projenin koyu lacivert/altın (`#0b0f19` / `#f2c94c`) tasarım sistemiyle, temiz tipografiyle ve sentetik yer imi verileriyle deterministik araçlar üzerinden üretilmelidir.
- Ajanlar ve araçlar, arayüz veya sürüm teslimlerinde yalnız kod değişikliğiyle yetinemez; kullanıcıya her sürüm döngüsünde doğrudan kopyalanıp paylaşılabilecek lansman metinlerini ve görsel varlıkları hazır bir paket olarak sunmakla yükümlüdür.
- **Zorunlu README Güncelleme Kuralı**: Eklenti için her yeni sürüm (release) çıkarıldığında; `README.md` dosyası kullanıcının tur başına açık hatırlatması beklenmeksizin otomatik ve eksiksiz olarak güncellenmelidir. Bu güncelleme yeni sürümün getirdiği tüm temel yetenekleri (Spotlight klavye navigasyonu, yeni arayüzler, renk temaları, çapraz tarayıcı desteği vb.), güncel sürüm ve tarayıcı rozetlerini, doğrudan paket indirme linklerini ve doğrulanmış sürüm tanıtım görsellerini içermelidir; README güncellemesi asla sonraki turlara ertelenemez veya atlanamaz.
- **Doğrudan Görsel Sunum Standardı**: Yeni sürüm için üretilen lansman görselleri (X için 1200x675, LinkedIn için 1200x627, tema ve vitrin görselleri) yalnızca dosya sistemine yazılmakla bırakılamaz; kullanıcıya yanıt içerisinde hem doğrudan önizlenebilir biçimde sunulmalı hem de sosyal medya paylaşımlarında doğrudan kullanılabilmesi için disk yolları net olarak teslim edilmelidir.
