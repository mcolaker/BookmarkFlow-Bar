# BookmarkFlow Bar

Chrome'un kendi yer imi cubugu iki satira cevrilemez. Bu eklenti onun yerine sayfalarin ustune sabitlenen, favicon ve isimleri birlikte gosteren ozel bir yer imi bari ekler.

## Ozellikler

- Bookmark Bar klasorundeki yer imlerini okur; arama ve klasor eslestirmelerinde Chrome'un diger guvenli yer imi koklerindeki ayni adli klasorleri de yakalar.
- Ilk kurulum rehberiyle Dengeli, Yayinci/Gizlilik, Klavye odakli ve Klasor rayi profilleri sunar.
- Varsayilan olarak sag ustte kucuk kontrol grubu gosterir; `BF` dugmesiyle genisler.
- Normal durumda sadece kucuk kontrol grubu gorunur; yer imleri `BF` ile acilir.
- Favicon ve yer imi adini birlikte gosterir.
- Klasorleri acilir panel olarak gosterir.
- Klasor rayi varsayilan olarak solda acilir; popup icinden kapatilabilir veya saga alinabilir.
- Klasor rayi Google hesabindaki icerikli klasorlerle yalnizca cihazdaki Yer Isaretleri Cubugu klasorlerini birlikte listeler; ayni adli klasorlerde Google hesabindaki surumu tercih eder.
- Klasorlere sag tik menusuyle renk atanabilir; renkler bar, klasor rayi ve yeni sekmede gorunur.
- Cok fazla yer imi icin yatay kaydirma sunar.
- `+` dugmesiyle mevcut sayfayi veya elle yazilan adresi secili klasore ya da Bookmark Bar'a ekler.
- Yer imine veya klasore sag tiklayinca BookmarkFlow menusu acilir; acma, kopyalama, yeniden adlandirma, ekleme ve silme desteklenir.
- Sag tik menusuyle yer imini bir onceye, bir sonraya, en basa veya en sona tasiyabilir.
- Arama dugmesi, `Alt + Space`, `Ctrl + Shift + E` veya `Ctrl + K` ile yer imi arama paleti acilir/kapanir.
- Arama paletinde `Yukari` / `Asagi` tuslariyla sonuc secilir, `Enter` secili sonucu acar.
- `Alt + Shift + B` bari genisletir/daraltir, `Alt + Shift + H` gizler/geri getirir.
- `Alt + Shift + M` yayinci modunu acip kapatir; bu mod bar ve klasor menulerinde yer imi isimlerini ikon moduna alir.
- Kisa yollar Chrome'un `chrome://extensions/shortcuts` sayfasindan degistirilebilir.
- Kurulum rehberi popup icinden tekrar acilabilir.
- Popup'taki klasor birlestirme araci, yalnizca bu cihazdaki ayni adli klasorleri onizleyip secilenlerin icerigini Google hesabindaki klasore tasir; kaynak klasoru ancak bosaldigini dogruladiktan sonra kaldirir.
- Klasor birlestirme/bakim sayfasinda herhangi bir Chrome yer imi klasoru kimligiyle raya sabitlenebilir; bu secim klasorun agactaki konumundan etkilenmez.
- Yeni sekme ve web sayfasi panelleri sabitlenen klasor kimliklerini dogrudan yerel ayardan okuyup ray listesinin basina ekler.
- `x` dugmesi bari kalici kapatmaz, kucuk `BF` geri acma dugmesine indirir.
- Popup icinden ac/kapat, web sitelerinde gosterme, satir sayisi, yogun gorunum, klasor rayi, arama ve sayfa boslugu ayarlanir.
- `Web sitelerinde goster` kapatilirsa normal web sayfalarindaki kucuk BF paneli gizlenir; yeni sekme sayfasi acik kalir.
- Bos arama paletinde yer imlerini gizleyerek ekranda toplu yer imi listesi gostermez.
- Site bazli gizleme destekler.
- Istege bagli olarak giris, odeme ve banka sayfalarinda otomatik gizlenebilir.
- `javascript:` gibi guvensiz yer imi URL'lerini sayfaya basmaz.
- Chrome yeni sekme sayfasini Google aramali BookmarkFlow sayfasi olarak degistirir.
- Yeni sekme yer imi seridi de popup'taki satir sayisi ayarini kullanir.
- Yeni sekme sayfasi da klasor rayi ayarini kullanir.
- Yeni sekme yer imi seridi yatay kaydirma konumunu hatirlar.
- WordPress admin ve TradingView gibi sabit ust/yan panel kullanan sayfalarda genis bari otomatik alta alir.

## Kurulum

1. Chrome'da `chrome://extensions` sayfasini ac.
2. Sag ustten `Developer mode` secenegini ac.
3. `Load unpacked` ile bu klasoru sec:

   İndirdiğin veya klonladığın `BookmarkFlow-Bar` klasörünü seç.

4. Chrome'un kendi yer imi cubugunu kapat.

   Chrome'da native cubuga sag tiklayip `Show bookmarks bar` isaretini kapatabilir veya `Ctrl + Shift + B` kullanabilirsin. Brave'de kisayol yetmezse `Settings > Appearance > Show bookmarks` ayarini `Never` yap; `Only on new tab page` seciliyse cubuk sadece yeni sekmede gorunmeye devam eder. Bu islem yer imlerini silmez. Chrome/Brave'in kendi yer imi cubugu tarayici arayuzudur; BookmarkFlow onu otomatik kapatamaz, ayni Bookmark Bar verisini kendi barinda okumaya devam eder.

5. Ilk acilan BookmarkFlow kurulum rehberindeki GIF turunu izleyerek bar acma, arama, klasor rayi, yayinci modu ve sag tik aksiyonlarini kontrol et.

## Sinirlar

- `chrome://`, Chrome Web Store ve bazi tarayici ozel sayfalarinda content script calismaz.
- Chrome yeni sekme sayfasi ozel bir tarayici sayfasi oldugu icin eklenti burada kendi `newtab` sayfasini kullanir.
- Bar tarayicinin gercek yer imi alanina degil, web sayfasinin ustune eklenir.
- Bazi sitelerde sabit header kullanimindan dolayi `Sayfayi asagi it` veya `Cakisan ust panellerde alta al` ayari kapatilip acilabilir.
- Guvenlik nedeniyle yalnizca `http:`, `https:` ve `mailto:` yer imleri gosterilir.
- Bar kapali Shadow DOM ile calisir; sayfa scriptleri bar icerigini dogrudan okuyamaz.
- Klasor birlestirme araci Chrome 134 ve sonraki surumlerde sunulan `syncing` yer imi bilgisini kullanir.
