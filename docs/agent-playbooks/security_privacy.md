# Security & Privacy Playbook — BookmarkFlow Bar

Bu kılavuz, BookmarkFlow Bar güvenlik, yerel-öncelikli gizlilik ve hassas veri koruması standartlarını tanımlar.

---

## 1. Yerel-Öncelikli Gizlilik (Zero-Cloud Invariant)

- **Sıfır Uzak Servis**: Eklenti hiçbir uzak API, telemetri, izleme betiği, bulut veritabanı veya analitik servisi ile iletişim kuramaz.
- **Sıfır Ağ Çağrısı**: Tüm yer imi işlemleri, arama indekslemeleri, etiketlemeler ve sağlık denetimleri kullanıcının cihazında (`chrome.storage.local`, bellek) yerel olarak yürütülür.
- **Güvenli URL Protokolleri**:
  - `javascript:`, `data:` veya yetkisiz protokollere sahip linkler yer imine eklenmeden veya çalıştırılmadan önce `sanitizeUrl` ile filtrelenir.

---

## 2. İçerik Güvenlik Politikası (CSP) & Shadow DOM

- **Satır İçi Script Yasağı**: HTML dosyalarında satır içi `<script>` veya `onclick` gibi inline olay yöneticileri kullanılamaz; tüm mantık harici `.js` dosyalarından yürütülür.
- **`eval()` ve `Function()` Yasağı**: Dinamik kod çalıştırma kesinlikle yasaktır.
- **Kapalı Shadow DOM**: Barındırıcı web sitelerinin zararlı script'lerinin BookmarkFlow DOM öğelerine `querySelector` ile erişmesi engellenir.

---

## 3. Sıfır Gizli Veri & Secret Scanner Standardı

- **Yasaklı Desenler**:
  - API anahtarları, özel anahtarlar (`BEGIN PRIVATE KEY`), GitHub tokenları (`ghp_*`), AWS anahtarları.
  - Mutlak yerel kullanıcı profili yolları ve kişisel dizinler.
- **Doğrulama Kapısı**:
  - Her commit öncesinde `node scripts/verify-public-tree.mjs` çalıştırılır; izlenen hiçbir dosyada gizli veri veya kişisel profil verisi bulunamaz.

---

## 4. Yedekleme Bütünlüğü (`bookmarkflow-backup-v1`)

- Yerel yedekleme dosyaları (`BF_EXPORT_BACKUP`) doğrulanmış JSON şemasına sahip olmalıdır.
- Yedeği içe aktarırken (`BF_IMPORT_BACKUP`) bozuk veya manipüle edilmiş JSON verileri fail-closed olarak reddedilir; mevcut yerel veriler silinmez.
