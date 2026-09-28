# AGENTS.md — BookmarkFlow Bar Operating Kernel

Bu dosya BookmarkFlow Bar projesinin her zaman yürürlükte olan ana işletim çekirdeği ve kural otoritesidir. Detaylı teknik kılavuzlar `docs/agent-playbooks/` altında yaşar ve Task Router aracılığıyla yalnızca mevcut işin ihtiyacına göre yüklenir.

---

## 0. Otorite ve Kalıcı Bellek

- Kök `AGENTS.md` birincil depo kural otoritesidir.
- Proje deposu kalıcı bellektir; proje için kritik kararlar için asla geçici sohbet belleğine güvenilmez.
- Kalıcı mimari ve ürün kararları `docs/agent/DECISION_INDEX.md` dosyasında kayıt altına alınır.
- Güncel mimari durum ve aktif sınırlar `docs/agent/PROJECT_STATE.md` dosyasında tutulur.
- Görev ve durum takibi `docs/backlog/OPEN_TASKS.md` kanonik defterindedir.
- Yeni sürüme kadar biriken yenilikler `docs/UNRELEASED_CHANGES.md` dosyasında not alınır.

---

## 1. P0 — Tavizsiz Kurallar (Non-Negotiable Invariants)

Geçerli herhangi bir P0 kuralı ihlal edilmişse hiçbir görev tamamlanmış sayılamaz:

1. **Manifest V3 & Yerel-Öncelikli Gizlilik (Zero-Cloud Invariant)**: Eklenti tüm işlevlerini yerel olarak yürütür. Hiçbir yer imi, arama sorgusu, etiket veya gezinme verisi harici sunucuya veya uzak API'ye gönderilemez. Uzak runtime bağımlılığı eklenemez.
2. **Kapalı Shadow DOM & Sayfa İzolasyonu**: Sayfa içi kayan çubuk (`src/content.js`) barındırıcı sayfanın global DOM ve CSS ağacından `attachShadow({ mode: "closed" })` ile tam izole edilir; ana sayfanın stilleri çubuğu bozamaz.
3. **Sıfır Gizli Veri & Sıfır Mutlak Yol**: Kaynak koda, testlere, belgelere veya commit'lere API anahtarı, token, şifre veya mutlak yerel kullanıcı yolları yazılamaz. `node scripts/verify-public-tree.mjs` sıfır hatayla geçmelidir.
4. **Kullanıcı Verisini Asla Düşürme**: Mevcut yer imleri, klasör renkleri, etiketler, okuma listesi veya kullanıcı ayarları hiçbir güncelleme, geçiş veya hata durumunda sıfırlanamaz, silinemez veya ezilemez.
5. **Kök Nedene Öncelik (Root-Cause First)**: Hata veya beklenmeyen davranışlarda tahmin yürüterek kod değiştirilemez. Önce ilk gerçek hata, loglar ve yeniden üretim adımları incelenir; kök neden somutlaştırılmadan yama yapılamaz.
6. **Çalışma Ağacına Saygı**: Kullanıcıya ait mevcut değişiklikler korunur. Görev kapsamı dışındaki ilgisiz dosyalar düzeltilemez, biçimlendirilemez veya commit kapsamına alınamaz.
7. **Sabit UI Metni Yasağı & Tam TR/EN Dil Paritesi**: Arayüzde hardcoded metin kullanılamaz; `_locales/en` ve `_locales/tr` arasında %100 anahtar paritesi korunur.
8. **Kanıtsız Doğrulama İddiası Yasağı**: Fiilen çalıştırılmayan hiçbir test veya kontrol "geçti" olarak raporlanamaz; çalıştırılmayan maddeler kalan risk olarak açıkça belirtilir.
9. **Türkçe Yanıt Kuralı (Turkish Response Invariant)**: Kullanıcı aksini talep etmedikçe kullanıcıya verilen tüm yanıtlar istisnasız Türkçe olmak zorundadır. Kod sembolleri, değişken adları ve commit mesajları İngilizce kalır.
10. **Sonraki Adım ve Proaktif Öneriler (CRITICAL & HIGH)**: Her nihai yanıt, önem derecesi belirtilmiş tek bir somut sonraki adım (`Sonraki adım — [High|Medium|Low]: ...`) ve sayı sınırı olmaksızın tespit edilen tüm CRITICAL/HIGH proaktif önerileri (olası yan etkileri parantez içinde belirterek) içerir.
11. **Bütünsel İkincil İyileştirme Standardı (Proactive Holistic QA)**: Ziyaret edilen veya test edilen her arayüz yüzeyinde sadece birincil göreve bakılmaz; ekrandaki layout taşmaları, font/kontrast kusurları, padding dengesizlikleri, klavye odak halkaları ve kod hijyeni sorunları aynı turda proaktif olarak yerinde onarılır.
12. **Uçtan Uca Sıfır Hata & Sıfır Teknik Borç (Zero Technical Debt)**: Kod değişikliği yapılan her turda ilgili doğrulama ve linter araçları çalıştırılır; sözdizimi, erişilebilirlik ve tip hataları yerinde sıfırlanır.
13. **Son Kullanıcı Yapay Zeka / AI Terim Yasağı (Zero End-User AI Invariant)**: Eklenti arayüzünde (UI metinleri, rozetler, tooltip'ler, diyaloglar, mağaza açıklamaları vb.) son kullanıcıya ASLA "yapay zeka", "AI", "LLM" gibi teknik terimler gösterilemez. Kullanıcıya daima "Akıllı Arama", "Akıllı Sıralama", "Otomatik Öneri" gibi doğal ve ürün odaklı ifadeler sunulur.
14. **Açık Kaynak & DCO 1.1 Bütünlüğü**: Proje Apache License 2.0 koşullarıyla korunur. Her katkı commit'i geçerli bir `Signed-off-by` satırı taşımalıdır (`git commit -s`).
15. **Sürüm Öncesi Değişiklik Günlüğü (`UNRELEASED_CHANGES.md`)**: Yeni sürüm çıkana kadar yapılan tüm geliştirmeler unreleased olarak not alınır; sürüm istendiğinde notlar doğrudan buradan derlenir.
16. **Profesyonel Görsel ve Sürüm Sunum Standardı**: Her sürümde profesyonel tanıtım görselleri (X 1200x675, LinkedIn 1200x627) hazır sunulur; `README.md` yeni sürüm yetenekleriyle eksiksiz güncellenir.
17. **GitHub İşlem Yetkilendirmesi (BF-GOV-007)**: Dal oluşturma, push ve PR işlemleri onay beklenmeden yürütülür; sürüm etiketi, harici platform duyuruları ve force push açık kullanıcı onayı gerektirir.

---

## 2. Task Router — Yalnızca İhtiyaç Duyulanı Yükle

İşe başlamadan önce görevin türünü sınıflandırın ve yalnızca ilgili kılavuzu inceleyin:

| Görev Türü | Yüklenecek Kılavuz (Playbook) |
|---|---|
| `BUGFIX` | İlgili kaynak kod + en yakın ilgili alan playbook'u |
| `BROWSER_EXTENSION` | `docs/agent-playbooks/browser_extension.md` |
| `WINDOWS_COMPANION` | `docs/agent-playbooks/windows_companion.md` |
| `UI_ACCESSIBILITY` | `docs/agent-playbooks/ui_accessibility.md` |
| `SECURITY_PRIVACY` | `docs/agent-playbooks/security_privacy.md` |
| `RELEASE_DISTRIBUTION` | `docs/agent-playbooks/release_distribution.md` |
| `RULE_GOVERNANCE` | `docs/agent-playbooks/rule_governance.md` |

---

## 3. Zorunlu Nihai Rapor Şablonu (Mandatory Verbatim Evidence)

Nihai raporda özetleme yapmak, kanıtları gizlemek veya "tüm kontroller temiz geçti" deyip geçmek KESİNLİKLE YASAKTIR. Her nihai yanıtta aşağıdaki bölümler eksiksiz sunulur:

### Bölüm 1: Canlı Doğrulama ve Konsol Kanıtları (Zorunlu Birebir Ham Çıktılar)
Aşağıdaki kontroller terminalde fiilen çalıştırılır ve konsolun ürettiği çıktı markdown kod bloğu (` ``` `) içinde ham olarak sunulur:
1. **Birim ve Sözleşme Test Çıktısı (`npm test`):**
   - 67/67 testin geçtiğini gösteren terminal çıktısı eksiksiz yer almalıdır.
2. **Toplu Proje ve Açık Kaynak Doğrulaması (`npm run validate:all`):**
   - Açık kaynak, DCO, public tree, manifest, governance ve backlog doğrulama çıktısı ham olarak yer almalıdır.
3. **Satır Sonu ve Boşluk Denetimi (`git diff --check`):**
   - Sıfır hata çıktısı ham olarak sunulmalıdır.

### Bölüm 2: İncelenen Canlı Yüzeyler ve İkincil İyileştirmeler (P0-11)
- Ziyaret edilen/incelenen yüzeylerde (Yeni Sekme, Spotlight, Sayfa İçi Çubuk, Ayarlar vb.) tespit edilen layout, kontrast, padding, klavye odağı ve CSS kusurları ile kodda uygulanan doğrudan onarımlar açıklanır.

### Bölüm 3: Yapılan Değişiklikler ve Dosyalar
- Değiştirilen dosyalar tıklanabilir `file:///` formatında listelenir ve teknik işler özetlenir.

### Bölüm 4: Proaktif Öneriler (CRITICAL & HIGH)
- Sayı sınırlaması olmaksızın tüm CRITICAL ve HIGH önem derecesindeki öneriler (olası yan etkileriyle).

### Bölüm 5: Çalıştırılmayan Kontroller ve Kalan Riskler

### Bölüm 6: Zorunlu Son Satır
- `Sonraki adım — [High|Medium|Low]: <somut tek bir eylem>`.

---

## 4. Kural ve Bellek Yönetişimi

- Proje kurallarında veya mimaride kalıcı değişiklik yapıldığında:
  1. `docs/agent-playbooks/rule_governance.md` prosedürü işletilir.
  2. Alınan kalıcı karar `docs/agent/DECISION_INDEX.md` dosyasına eklenir.
  3. Değişiklik `docs/agent/RULE_CHANGELOG.md` dosyasına kaydedilir.
  4. `node scripts/validate-governance.mjs` ile kural sözleşmesi doğrulanır.
