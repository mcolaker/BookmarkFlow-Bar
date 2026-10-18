# Release & Distribution Playbook — BookmarkFlow Bar

Bu kılavuz, BookmarkFlow Bar sürüm yayını, paketleme, mağaza dağıtımı ve lansman sunum standartlarını tanımlar.

---

## 1. Sürüm Öncesi Hazırlık & Unreleased Uzlaştırması

- **Değişiklik Günlüğü**: Yeni sürüm kararı alındığında `docs/UNRELEASED_CHANGES.md` dosyasındaki tüm maddeler `CHANGELOG.md` altındaki yeni sürüm başlığına (`## [X.Y.Z] — YYYY-MM-DD`) taşınır.
- `docs/UNRELEASED_CHANGES.md` dosyası bir sonraki sürüm döngüsü için temizlenir.
- **Manifest Versiyonu**: `manifest.json` içindeki `version` alanı yeni sürüm numarasıyla (`x.y.z`) güncellenir.

---

## 2. Deterministik Paketleme & Çapraz Tarayıcı Derlemesi

- **Exact-Tag Paketleme**:
  - `node scripts/package-release.mjs v<semver>` komutuyla sadece manifest sürümüyle birebir eşleşen değişmez Git etiketi üzerinden ZIP ve SHA-256 özeti üretilir.
- **Çapraz Tarayıcı Paketleri**:
  - `node scripts/package-cross-browser.mjs` çalıştırılarak Chrome ZIP'inin yanı sıra Firefox (`bookmarkflow-bar-X.Y.Z-firefox.zip`, Gecko id içeren dönüştürülmüş manifest) ve Edge paketleri üretilir.
- **Paket Kapsamı**:
  - ZIP paketi yalnız runtime dosyalarını, `LICENSE.md`, `NOTICE` ve `TRADEMARKS.md` dosyalarını içerir; bakım belgeleri (`docs/`, `.git/`, `scripts/`) pakete giremez.

---

## 3. Profesyonel Tanıtım Görselleri ve Lansman Paketi

- **Görsel Standartları**:
  - X (Twitter) Lansman Görseli: 1200x675 piksel.
  - LinkedIn Lansman Görseli: 1200x627 piksel.
  - Koyu lacivert/altın (`#0b0f19` / `#f2c94c`) renk dili, sentetik yer imi verileri, temiz tipografi.
- **Zorunlu Tanıtım Görseli / Video Kartı Standardı (Mandatory Visual Media Invariant - Karar 40 - BF-GOV-026)**:
  - Sosyal medya paylaşımlarında (X, LinkedIn) yalnızca metin veya otomatik link önizlemesi (OG card) ile paylaşım yapılması KESİNLİKLE YASAKTIR.
  - Her paylaşımda hazırlanan özel tanıtım görsel kartı (X 1200x675, LinkedIn 1200x627) veya video tanıtımı gönderiye dosya olarak fiilen iliştirilmeli, görselin modal/editör içindeki önizlemesi CDP ekran görüntüsüyle doğrulandıktan sonra yayınlanmalıdır.
  - Asla link kartına (sarı/varsayılan CWS önizlemesi) güvenilerek görselsiz gönderi atılamaz.
- **Sosyal Medya Medya Kartı Ön-Kontrol Kapısı (Pre-Publish Visual Lint - Karar 41 - BF-GOV-027)**:
  - Paylaşım öncesinde `scripts/publish-social.mjs` içerisindeki `assertSocialCardVisualQuality(imagePath, platform)` fonksiyonu çalıştırılır.
  - X kartları için 16:9 (~1.777) en-boy oranı, LinkedIn kartları için 1.91:1 (~1.913) en-boy oranı, asgari çözünürlük (min 600x300, standart 1200x675 / 1200x627 veya 4x Retina 4800px) ve geçerli PNG dosya yapısı fail-closed doğrulanır; hatalı veya orantısız görseller yayınlanamaz.
- **Lansman Metinleri & Çift Bağlantı Standardı**:
  - Kullanıcıya kopyalanıp paylaşılabilecek veya otonom yayınlanacak X duyuru metni, LinkedIn bülteni ve iki dilli (Türkçe & İngilizce) Chrome Web Store sürüm notları hazır bir paket olarak sunulur.
  - **Çift Bağlantı Zorunluluğu (Dual-Link Mandate)**: X (Twitter) ve sosyal medya duyurularında hem resmi **Chrome Web Store** bağlantısı (`https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf`) hem de **GitHub Sürüm/Release** bağlantısı istisnasız birlikte bulunmalıdır.
  - **X (Twitter) 280 Karakter Bütçe Disiplini**:
    - X algoritmasında her URL (`http`/`https`) t.co nedeniyle 23 karakter sayılır (2 URL = 46 karakter bütçe tüketir).
    - Emojiler (🌊, ✨, 💎 vb.) 2 karakter sayılır; satır sonları 1 karakterdir.
    - Metin taslakları her zaman 280 karakter sınırının altında güvenli marjla (en az 10-15 karakter boşluk) tasarlanmalı, asla sınır hatası vermemelidir.
  - **Kullanıcı Odaklı İlham Verici Dil & İç Teknik Jargon Yasağı (User-Centric Inspiring Copy Mandate - BF-GOV-025)**:
    - Kamuya açık sosyal medya (X/LinkedIn) paylaşımlarında ve Chrome Web Store mağaza bültenlerinde son kullanıcı deneyimini ve ürünün sağladığı doğrudan faydayı anlatan ilham verici, sıcak ve akıcı bir dil kullanılır.
    - İç yazılımsal bugfix jargonu ve DOM manipülasyon detayları (`DOM insertBefore`, `Shadow DOM focus trap`, `event stopImmediatePropagation`, `Map-based state` vb.) kamuya açık duyurularda KESİNLİKLE YASAKTIR.
    - Kullanıcıya daima "Işık hızında klavye dolaşımı", "Klasörlerinizde tek tıkla en çok ziyaret edilen sekmeler", "Göz yormayan okyanus ışıltısı ve akıllı kategori filtreleri" gibi değer odaklı ifadeler sunulur.
- **README Güncelleme Kuralı**:
  - `README.md` dosyası yeni sürüm yetenekleri, indirme linkleri, sürüm rozetleri ve vitrin görselleriyle eksiksiz güncellenir; asla ertelenemez.

---

## 4. DCO ve GitHub Doğrulama Kapıları

- Tüm commit'ler Developer Certificate of Origin 1.1 `Signed-off-by` satırı taşımalıdır.
- Merge öncesi tüm doğrulama betikleri (`npm run validate:all`) yerel olarak yeşil olmalı ve GitHub Actions terminal `success` vermelidir.

---

## 5. Terminal-Öncelikli GitHub CLI İş Akışı (Terminal-First GitHub CLI Mandate - BF-GOV-016)

- **Doğrudan Terminal İşlemleri**: PR açma, inceleme, CI bekleme ve birleştirme işlemleri tarayıcı açılmadan resmi `gh` CLI ile doğrudan terminalden icra edilir:
  - PR Açma: `gh pr create --title "..." --body "..." --base main --head <branch>`
  - CI Durumunu İzleme: `gh pr checks --watch`
  - Otomatik Birleştirme: `gh pr merge --auto --merge` veya `gh pr merge --merge --delete-branch`
  - Sürüm / Release Yönetimi: `gh release create vX.Y.Z --title "vX.Y.Z — ..." --notes "..." <varlıklar>`
- **Sıfır Tarayıcı Bağımlılığı**: GitHub işlemleri için tarayıcı açma (Browser harness/Playwright) devreden çıkarılmış olup işlemler doğrudan CLI üzerinden saniyeler içinde tamamlanır. Tarayıcı yalnız görsel/medya denetiminde ikincil olarak kullanılır.
- **Auto-Merge Yetkilendirmesi (BF-GOV-017)**: Repoda `allow_auto_merge` özelliği etkinleştirilmiş olup PR açıldığı anda `gh pr merge --auto --merge` komutu verilerek CI kontrolleri bittiği anda GitHub tarafından otomatik olarak ana dala katılması sağlanır.
- **Otomatik Release Betiği & Pre-Push Kalite Kancası (BF-GOV-018)**:
  - Dağıtım paketleri ve SHA-256 sağlama toplamları `npm run release:github` (`scripts/release-github-cli.mjs`) ile tek adımda GitHub Release'e aktarılır; `--dry-run` ile simüle edilebilir.
  - Yerel repoda `git push` öncesinde `.githooks/pre-push` kancası çalışarak governance kurallarını ve tüm birim/sözleşme testlerini (`npm test`) otomatik doğrular.
- **Tek Komutla Sürüm Etiketleme, Paketleme ve GitHub Release Orkestrasyonu (BF-GOV-019)**:
  - `npm run release:full` (`scripts/release-pipeline.mjs`) komutu ile test doğrulaması, çalışma ağacı denetimi, Git annotated imzalı etiket oluşturma, Chromium, Firefox ve Edge paketleme ve GitHub Release yayınlama işlemleri uçtan uca tek adımda icra edilir.
  - Sürüm öncesi testler `--dry-run` bayrağı ile risksiz şekilde simüle edilebilir.
- **Otonom Yerel Ara Commit Yetkisi (BF-GOV-020 / Karar 27)**:
  - Model; ara kilometre taşlarında testler yeşil (`npm test` 110+/110+) ve analizi temiz olduğunda kullanıcıya sormadan otonom olarak DCO imzalı yerel commit (`git commit -s`) oluşturur; uzak push/PR ise kullanıcı onayıyla yürütülür.
- **Canlı Kullanıcı Profili ve Auto-Allow Daemon Güvencesi (User's Live Chrome & Auto-Allow Daemon Invariant - Karar 27, 39 - BF-WIN-002)**:
  - Chrome Web Store Developer Console, GitHub ve sosyal medya (X, LinkedIn) yayınlarında kesinlikle geçici/izole sahte profiller açılmaz; doğrudan kullanıcının varsayılan çalışan Chrome oturumuna CDP (`port 9222` / `DevToolsActivePort` WebSocket) ile bağlanılır.
  - Modern Chrome v128+ ortamında HTTP discovery uç noktaları 404 döndüğü için doğrudan `DevToolsActivePort` WebSocket uç noktası (`ws://...`) kullanılır.
  - Chromium güvenlik modalı ("Uzaktan hata ayıklamaya izin verilsin mi?") açıldığında, arka planda çalışan JaponiGo çekirdekli `chrome_auto_allow_daemon.py` ve `ensureAutoAllowDaemon()` kancası (ve Windows UIA `InvokePattern`) izin penceresini anında ve otonom onaylar; kullanıcıya kesinlikle manuel tıklama yükü bindirilmez.
- **Dış Sosyal Medya Duyuru Dili Kuralı (BF-GOV-025 / Karar 39)**:
  - X ve LinkedIn kamuya açık duyuruları küresel profesyonel standart gereği İSTİSNASIZ İNGİLİZCE yayınlanır.
- **3-Kademeli Raw-Key ve Dil Güvencesi (BF-GOV-020 / Karar 27)**:
  - Sürüm paketlemesi öncesinde `npm run test:raw-keys` çalıştırılarak hiçbir arayüzde çevrilmemiş ham anahtar (`nt_*`, `bar_*`) veya bozuk karakter (mojibake) kalmadığı doğrulanır.
- **Tek Komutla Chrome Web Store Paket Yükleme ve İncelemeye Gönderme (`npm run publish:cws` - BF-REL-016 / Karar 43)**:
  - `npm run publish:cws` (`scripts/publish-cws.mjs`) komutu ile `dist/bookmarkflow-bar-<version>.zip` arşivinin varlığı ve ZIP imzası doğrulanır, ardından kullanıcının canlı Chrome oturumuna (`t.type === "page"` filtresiyle) bağlanılarak Chrome Web Store Developer Console (`.../edit/package`) üzerinden paket yükleme (`HTMLInputElement.prototype.click` koruması + `DOM.setFileInputFiles`), mağaza girişinde `"İnceleme için gönder"` ve onay modalında `"İnceleme İçin Gönder"` adımları tek komutla yürütülür.
  - Google oturumu şifre doğrulamasına (`accounts.google.com/v3/signin/...`) düşerse, ilgili sekme `Target.activateTarget` ile öne getirilir ve `[REAUTH_REQUIRED]` fail-closed hatası döndürülür; şifre girilmeden veya mağaza tablosunda `Sürüm <version> — İncelenmeyi bekliyor` / `Yayımlandı` durumu görülmeden işlem başarılı sayılamaz.
  - Yalnızca mevcut mağaza durumunu denetlemek için `node scripts/publish-cws.mjs --check-only`, ağ yan etkisi olmadan simüle etmek için `--dry-run` kullanılır.
- **Sosyal Medya Öncesi Zorunlu Sürüm Sıra Kapısı (`assertPreSocialReleaseGate` - BF-REL-016 / Karar 43)**:
  - `scripts/publish-social.mjs` içinde X veya LinkedIn duyurusu başlatılmadan önce `assertPreSocialReleaseGate(version)` fail-closed kapısı otomatik çalışır:
    1. GitHub Release `v<version>` yayında mı (`isDraft === false`) ve `bookmarkflow-bar-<version>.zip` varlığı yüklü mü (`checkGitHubReleasePublished`)?
    2. Chrome Web Store Developer Console üzerinde `Sürüm <version>` `"İncelenmeyi bekliyor"` (`pending_review`) veya `"Yayımlandı"` (`published`) durumunda mı (`verifyCwsReleaseStatus`)?
  - Her iki koşul da kanıtlanmadan sosyal medya duyurusu atılması teknik olarak engellenir (`[Pre-Social Release Gate Blocked]`). Kapı durumu `node scripts/publish-social.mjs --check-gate` ile bağımsız doğrulanabilir.
- **Otomatik Sosyal Medya Lansmanı ve Yayınlama Orkestrasyonu (`npm run publish:social` - BF-GOV-025)**:
  - `npm run publish:social` (`scripts/publish-social.mjs`) komutu ile önce `assertPreSocialReleaseGate` doğrulanır, ardından hem X (Twitter) hem LinkedIn lansman gönderileri kullanıcının canlı Chrome oturumu üzerinden sıfır manuel müdahaleyle otonom yayınlanır.
  - X (Twitter) Yayını: `https://x.com/compose/post` adresine yönlenir, metin ve `output/social-vX.Y.Z/bookmarkflow-vX.Y.Z-x-card.png` kart görseli eklenerek gönderi butonuna basılır.
  - LinkedIn Yayını: `https://www.linkedin.com/feed/` adresinde "Fotoğraf" tetikleyicisi açılarak CDP `DOM.setFileInputFiles` ile hazırlanan `bookmarkflow-vX.Y.Z-linkedin-card.png` (1200x627) kartı editöre iliştirilir, yerel `<dialog[open]>` içindeki "İleri" (`toLocaleLowerCase('tr-TR') === 'ileri'`) ile onaylanır, ardından `.tiptap.ProseMirror` alanına İngilizce duyuru metni girilerek yayınlanır. Görsel iliştirilmeden kesinlikle yayınlanamaz.
  - Gerektiğinde tek platform hedeflenebilir: `node scripts/publish-social.mjs x` veya `node scripts/publish-social.mjs linkedin`.
- **Live Chrome Pilot & Dağıtım Öncesi Raw-Key Güvencesi (BF-GOV-021 / Karar 28)**:
  - `npm run pilot:chrome` (`scripts/live-chrome-pilot.mjs`) ile kullanıcının port 9222 üzerindeki canlı tarayıcı oturumu denetlenerek Chrome Web Store konsolu, GitHub ve sosyal medya hazırlığı taranır.
  - Dağıtım arşivleri (`scripts/package-release.mjs` ve `scripts/package-cross-browser.mjs`) oluşturulmadan önce `assertRawKeyIntegrity` fail-closed kapısı çalıştırılarak hiçbir pakete çevrilmemiş ham anahtar veya mojibake karakter sızamayacağı garanti edilir.
  - GitHub Actions CI iş akışında (`.github/workflows/validate.yml`) `Run raw-key & mojibake gate` adımı bağımsız kontrol olarak çalışır.
