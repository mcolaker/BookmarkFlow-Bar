# RULE_CHANGELOG.md — BookmarkFlow Bar Kural Değişiklikleri Tarihçesi

Bu dosya, BookmarkFlow Bar projesinin `AGENTS.md` işletim çekirdeği ve yönetişim kurallarında yapılan tüm kalıcı değişiklikleri kayıt altında tutar.

---

## [2026-09-28] — JaponiGo Yönetişim & Modüler Playbook Mimarisine Geçiş (BF-GOV-010)
- **Operating Kernel Mimarisi**: `AGENTS.md` dosyası JaponiGo standartlarında tok, hafif ve tavizsiz bir işletim çekirdeğine (Operating Kernel) dönüştürüldü.
- **Modüler Playbook'lar (`docs/agent-playbooks/`)**: Detaylı alan kılavuzları 6 bağımsız playbook'a ayrıldı (`browser_extension.md`, `windows_companion.md`, `ui_accessibility.md`, `security_privacy.md`, `release_distribution.md`, `rule_governance.md`).
- **Kalıcı Mimari Bellek**: `docs/agent/DECISION_INDEX.md` (16 kalıcı karar), `PROJECT_STATE.md` ve `RULE_CHANGELOG.md` oluşturuldu.
- **P0-11 Bütünsel İkincil İyileştirme Standardı (Proactive Holistic QA)**: Ziyaret edilen/incelenen her yüzeyde layout, padding, kontrast, klavye odağı ve CSS kusurlarının proaktif onarımı zorunlu kılındı.
- **P0-13 Son Kullanıcı Yapay Zeka / AI Terim Yasağı**: Arayüzde asla "AI", "Yapay Zeka" gibi teknik ibareler kullanılmaması prensibi bağlandı.
- **Zorunlu Nihai Rapor Şablonu**: Nihai raporda ham terminal çıktılarının (`npm test`, `validate:all`, `git diff --check`) verbatim kod blokları içinde sunulması kurala bağlandı.
- **Yönetişim Otomasyonu**: `scripts/validate-governance.mjs` fail-closed doğrulama kapısı eklendi.

---

## [2026-09-27] — Sürüm Öncesi Değişiklik Günlüğü (Unreleased Changes Log) Standardı
- Sürüm yayınlanana kadar geçen geliştirme turlarında yapılan tüm yeniliklerin `docs/UNRELEASED_CHANGES.md` ve `CHANGELOG.md [Unreleased]` altında sıcağı sıcağına not alınması kurala bağlandı.
- Kullanıcı sürüm istediğinde sürüm notlarının doğrudan bu belgeden derlenmesi güvenceye alındı.

---

## [2026-08-09] — GitHub İşlem Yetkilendirmesi (BF-GOV-007)
- Hak sahibi tarafından rutin GitHub iş akışı (dal oluşturma, push, PR açma, doğrulama kapıları yeşil olan PR'ları merge etme) için tur başına açık onay beklenmemesi kurala bağlandı.
- Sürüm yayını, harici platform duyuruları, force push ve repo silme işlemleri için açık onay şartı korundu.

---

## [2026-08-02] — Kanonik Backlog ve Kanıt Sözleşmesi (BF-GOV-001)
- `docs/backlog/OPEN_TASKS.md` dosyasının tek durum otoritesi olması kurala bağlandı.
- İzinli durumlar (`OPEN`, `IN_PROGRESS`, `BLOCKED`, `DONE`), stabil `BF-*` kimlikleri, zorunlu kabul kriterleri ve fail-closed doğrulama kapıları (`validate-backlog.mjs`) kuruldu.
