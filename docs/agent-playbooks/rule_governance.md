# Rule Governance Playbook — BookmarkFlow Bar

Bu kılavuz, BookmarkFlow Bar proje kurallarının, mimari kararlarının ve işletim çekirdeğinin (Operating Kernel) yaşam döngüsünü ve yönetişim standartlarını tanımlar.

---

## 1. Otorite Hiyerarşisi

1. Kullanıcının mevcut turdaki açık ve doğrudan talimatı.
2. `AGENTS.md` (Operating Kernel — Her zaman geçerli çekirdek anayasa).
3. `docs/agent/DECISION_INDEX.md` (Kalıcı mimari kararlar).
4. `docs/agent/PROJECT_STATE.md` (Canlı mimari durum ve kapsam).
5. `docs/agent-playbooks/` altındaki ilgili alan el kitabı.
6. `docs/backlog/OPEN_TASKS.md` (Kanonik iş ve kanıt defteri).
7. `docs/UNRELEASED_CHANGES.md` (Sürüm öncesi değişiklik günlüğü).

---

## 2. Kural Yaşam Döngüsü ve Bağlam Bütçesi (Context Budget)

- **Operating Kernel Hafifliği**:
  - `AGENTS.md` bir ansiklopediye dönüşemez; bağlam penceresini (context window) tüketmemek için tok, net ve P0 odaklı tutulur.
  - Alana özel teknik detaylar ve ayrıntılı kontrol listeleri `docs/agent-playbooks/` altına taşınır.
- **Kural Değişikliği Prosedürü**:
  - Kalıcı bir kural değiştiğinde veya yeni bir sistem eklendiğinde:
    1. İlgili playbook güncellenir veya yeni playbook oluşturulur.
    2. `docs/agent/RULE_CHANGELOG.md` dosyasına tarihli kayıt eklenir.
    3. Alınan kalıcı karar varsa `docs/agent/DECISION_INDEX.md` içine yeni satır olarak işlenir.
    4. `node scripts/validate-governance.mjs` çalıştırılarak kural bütünlüğü doğrulanır.

---

## 3. Karar İndeksi Standartları (`DECISION_INDEX.md`)

- Her karar artan sıra numarasıyla kaydedilir.
- Karar tanımı kısa, açık ve somut olmalıdır.
- Mutlaka gerekçe ve otorite referansı (`AGENTS.md`, ilgili playbook veya backlog ID) taşımalıdır.
