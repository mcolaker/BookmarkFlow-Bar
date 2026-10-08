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
- **Lansman Metinleri & Çift Bağlantı Standardı**:
  - Kullanıcıya kopyalanıp paylaşılabilecek veya otonom yayınlanacak X duyuru metni, LinkedIn bülteni ve iki dilli (Türkçe & İngilizce) Chrome Web Store sürüm notları hazır bir paket olarak sunulur.
  - **Çift Bağlantı Zorunluluğu (Dual-Link Mandate)**: X (Twitter) ve sosyal medya duyurularında hem resmi **Chrome Web Store** bağlantısı (`https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf`) hem de **GitHub Sürüm/Release** bağlantısı istisnasız birlikte bulunmalıdır.
  - **X (Twitter) 280 Karakter Bütçe Disiplini**:
    - X algoritmasında her URL (`http`/`https`) t.co nedeniyle 23 karakter sayılır (2 URL = 46 karakter bütçe tüketir).
    - Emojiler (🌊, ✨, 💎 vb.) 2 karakter sayılır; satır sonları 1 karakterdir.
    - Metin taslakları her zaman 280 karakter sınırının altında güvenli marjla (en az 10-15 karakter boşluk) tasarlanmalı, asla sınır hatası vermemelidir.
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
- **Canlı Kullanıcı Profili Zorunluluğu (User's Live Chrome Invariant - Karar 27)**:
  - Chrome Web Store Developer Console, GitHub ve sosyal medya (X, LinkedIn) yayınlarında kesinlikle geçici/izole sahte profiller açılmaz; doğrudan kullanıcının varsayılan çalışan Chrome oturumuna CDP (`port 9222`) ile bağlanılır.
- **3-Kademeli Raw-Key ve Dil Güvencesi (BF-GOV-020 / Karar 27)**:
  - Sürüm paketlemesi öncesinde `npm run test:raw-keys` çalıştırılarak hiçbir arayüzde çevrilmemiş ham anahtar (`nt_*`, `bar_*`) veya bozuk karakter (mojibake) kalmadığı doğrulanır.
