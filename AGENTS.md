# BookmarkFlow Bar Proje Talimatları

Bu dosya Codex için ana proje giriş sözleşmesidir. Ürün davranışı için gerçek kaynak kodu ve `README.md`, güvenlik için `SECURITY.md`, kalıcı iş durumu için `docs/backlog/OPEN_TASKS.md` otoritedir.

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
