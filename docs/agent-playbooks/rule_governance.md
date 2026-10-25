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

## 2. Kural Yaşam Döngüsü ve Bağlam Bütçesi (Context Budget - BF-GOV-028)

- **Operating Kernel & Çalışma Belleği Bütçeleri**:
  - Kök `AGENTS.md` tavan bütçesi **16.384 bayt (16 KB)** (tercihen ~12 KB) ile sınırlandırılmıştır. Alana özel teknik detaylar ve uzun tetikleyici tabloları `docs/agent-playbooks/` altına taşınır.
  - Aktif `docs/agent/PROJECT_STATE.md` çalışma belleği **16.384 bayt (16 KB)** altında tutulur. Tamamlanan sürümlerin madde madde uzun geçmişi `docs/agent/history/PROJECT_STATE_HISTORY_2026.md` arşivine aktarılır.
  - Tüm playbook dosyalarının (`docs/agent-playbooks/*.md`) toplam boyutu **120.000 bayt (120 KB)** tavanını aşamaz ve her playbook kök `AGENTS.md` içindeki Task Router tablosunda referanslanmalıdır.
- **Mekanik Kalite Kapıları, Sürüm Kayması Bekçisi ve Uzman Alt Ajanlar (Mechanical Enforcement & Version Drift Guard - BF-GOV-028, BF-GOV-029)**:
  - `.githooks/pre-commit` ve `.githooks/pre-push` kancaları depoda izlenir.
  - `scripts/check-architecture-guard.mjs` (`npm run guard:arch`), kaynak kodda sessiz `catch {}` bloklarını engeller ve `1.500` satırı aşan dosyalar büyümeye devam ettiğinde modüler ayrıştırma uyarısı üretir.
  - **Sürüm Kayması Bekçisi (Version Drift Guard)**: `scripts/validate-governance.mjs`, `manifest.json` (`version`), `package.json` (`version`) ve `docs/agent/PROJECT_STATE.md` (`Aktif Sürüm: \`vX.Y.Z\``) sürümlerinin birebir aynı olduğunu doğrular; herhangi bir kaymada doğrulamayı reddeder.
  - **Proje İçi Uzman Alt Ajanlar (`.agents/agents/*.md`) ve Kural Yönlendiricisi (`.agents/skills/bookmarkflow-rule-router/SKILL.md`)**: `validate-governance.mjs` tüm uzman alt ajan ve yetenek dosyalarının BOM-suz UTF-8 kodlamasını, YAML frontmatter yapısını ve `MANDATORY & PROACTIVE:` tetikleyici önekini denetler.
- **Kural Değişikliği Prosedürü**:
  - Kalıcı bir kural değiştiğinde veya yeni bir sistem eklendiğinde:
    1. İlgili playbook güncellenir veya yeni playbook oluşturulur.
    2. `docs/agent/RULE_CHANGELOG.md` dosyasına tarihli kayıt eklenir.
    3. Alınan kalıcı karar varsa `docs/agent/DECISION_INDEX.md` içine yeni satır olarak işlenir.
    4. `node scripts/validate-governance.mjs` çalıştırılarak kural bütünlüğü, BOM-suz UTF-8 kodlaması, bayt bütçeleri ve bayat referans (stale reference) yokluğu doğrulanır.

---

## 3. Karar İndeksi Standartları (`DECISION_INDEX.md`)

- Her karar artan sıra numarasıyla kaydedilir.
- Karar tanımı kısa, açık ve somut olmalıdır.
- Mutlaka gerekçe ve otorite referansı (`AGENTS.md`, ilgili playbook veya backlog ID) taşımalıdır.
