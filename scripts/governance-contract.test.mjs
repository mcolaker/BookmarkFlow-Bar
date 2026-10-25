import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("operating kernel and governance files contract (BF-GOV-010)", () => {
  const requiredDocs = [
    "AGENTS.md",
    "docs/agent/DECISION_INDEX.md",
    "docs/agent/PROJECT_STATE.md",
    "docs/agent/RULE_CHANGELOG.md",
    "docs/agent-playbooks/browser_extension.md",
    "docs/agent-playbooks/windows_companion.md",
    "docs/agent-playbooks/ui_accessibility.md",
    "docs/agent-playbooks/security_privacy.md",
    "docs/agent-playbooks/release_distribution.md",
    "docs/agent-playbooks/rule_governance.md",
  ];

  for (const relPath of requiredDocs) {
    const fullPath = path.join(root, relPath);
    assert.ok(existsSync(fullPath), `Missing required governance doc: ${relPath}`);

    const buffer = readFileSync(fullPath);
    const hasBom = buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    assert.strictEqual(hasBom, false, `File ${relPath} must not contain UTF-8 BOM`);
  }

  const agents = readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.match(agents, /# AGENTS\.md — BookmarkFlow Bar Operating Kernel/u, "AGENTS.md must declare Operating Kernel header");
  assert.match(agents, /P0 — Tavizsiz Kurallar/u, "AGENTS.md must contain P0 non-negotiables");
  assert.match(agents, /Task Router/u, "AGENTS.md must contain Task Router table");
  assert.match(agents, /Zorunlu Nihai Rapor Şablonu/u, "AGENTS.md must enforce mandatory verbatim final report");
  assert.match(agents, /Bütünsel İkincil İyileştirme Standardı/u, "AGENTS.md must enforce Proactive Holistic QA");
  assert.match(agents, /DECISION_INDEX\.md/u, "AGENTS.md must reference DECISION_INDEX.md");
  assert.match(agents, /Otonom Video İnisiyatifi/u, "AGENTS.md must declare Autonomous Video Trigger Authority");
  assert.match(agents, /Otonom Geliştirici Araçları ve Teftiş İnisiyatifi/u, "AGENTS.md must declare Autonomous DevTools, Web Guidance & Gemini API Authority");
  assert.match(agents, /Otonom Ara Kilometre Taşı Commit Yetkisi/u, "AGENTS.md must declare Milestone Commit Authority");
  assert.match(agents, /İki Kollu Tarayıcı Mimarisi/u, "AGENTS.md must declare Bifurcated Browser Architecture");
  assert.match(agents, /3-Kademeli Dil ve Canlı Arayüz Raw-Key Güvencesi/u, "AGENTS.md must declare 3-Tier Localization");
  assert.match(agents, /Asgari Ön İnceleme & Uygulama Sınırları/u, "AGENTS.md must declare Minimum Preflight Boundaries");

  const decisionIndex = readFileSync(path.join(root, "docs/agent/DECISION_INDEX.md"), "utf8");
  assert.match(decisionIndex, /# DECISION_INDEX\.md/u, "DECISION_INDEX.md must declare header");
  assert.match(decisionIndex, /Manifest V3 & Sıfır Uzak Servis/u, "DECISION_INDEX.md must contain Decision 1");
  assert.match(decisionIndex, /Bütünsel İkincil İyileştirme Standardı/u, "DECISION_INDEX.md must contain Decision 16");
  assert.match(decisionIndex, /Yerel Niyet ve Akıllı Yönlendirme Motoru/u, "DECISION_INDEX.md must contain Decision 17");
  assert.match(decisionIndex, /Agentic Motion & Medya Kalite Güvence Standardı/u, "DECISION_INDEX.md must contain Decision 18");
  assert.match(decisionIndex, /Yapay Zeka Otonom Video İnisiyatifi/u, "DECISION_INDEX.md must contain Decision 19");
  assert.match(decisionIndex, /Otonom Geliştirici Araçları ve Teftiş İnisiyatifi/u, "DECISION_INDEX.md must contain Decision 20");
  assert.match(decisionIndex, /Terminal-Öncelikli GitHub CLI Standardı/u, "DECISION_INDEX.md must contain Decision 23");
  assert.match(decisionIndex, /GitHub Actions Otomatik PR Birleştirme/u, "DECISION_INDEX.md must contain Decision 24");
  assert.match(decisionIndex, /GitHub CLI Otomatik Release Betiği/u, "DECISION_INDEX.md must contain Decision 25");
  assert.match(decisionIndex, /Tek Komutla Sürüm Etiketleme, Paketleme ve GitHub Release Orkestrasyonu/u, "DECISION_INDEX.md must contain Decision 26");
  assert.match(decisionIndex, /JaponiGo Çekirdek Sinerjisi/u, "DECISION_INDEX.md must contain Decision 27");
  assert.match(decisionIndex, /Tam Otonom Geliştirici Araçları\/MCP Ekosistemi/u, "DECISION_INDEX.md must contain Decision 28");
  assert.match(decisionIndex, /Kural-Bazlı Tetikleyiciler ve Kural-Ötesi Tam Otonom MCP/u, "DECISION_INDEX.md must contain Decision 29");

  assert.match(agents, /BF-QA-005/u, "AGENTS.md must document BF-QA-005");
  assert.match(decisionIndex, /BF-QA-005/u, "DECISION_INDEX.md must document BF-QA-005");
  assert.match(decisionIndex, /Manifest V3 API Uyumluluk ve Kullanımdan Kalkma/u, "DECISION_INDEX.md must contain Decision 30");

  const projectState = readFileSync(path.join(root, "docs/agent/PROJECT_STATE.md"), "utf8");
  assert.match(projectState, /# PROJECT_STATE\.md/u, "PROJECT_STATE.md must declare header");
  assert.match(projectState, /Google Chrome/u, "PROJECT_STATE.md must declare Chrome support");
  assert.match(projectState, /BF-GOV-011/u, "PROJECT_STATE.md must document BF-GOV-011");
  assert.match(projectState, /BF-GOV-016/u, "PROJECT_STATE.md must document BF-GOV-016");
  assert.match(projectState, /BF-GOV-017/u, "PROJECT_STATE.md must document BF-GOV-017");
  assert.match(projectState, /BF-GOV-018/u, "PROJECT_STATE.md must document BF-GOV-018");
  assert.match(projectState, /BF-GOV-019/u, "PROJECT_STATE.md must document BF-GOV-019");
  assert.match(projectState, /BF-GOV-020/u, "PROJECT_STATE.md must document BF-GOV-020");
  assert.match(projectState, /BF-GOV-021/u, "PROJECT_STATE.md must document BF-GOV-021");
  assert.match(projectState, /BF-GOV-022/u, "PROJECT_STATE.md must document BF-GOV-022");
  assert.match(projectState, /BF-QA-005/u, "PROJECT_STATE.md must document BF-QA-005");

  const ruleChangelog = readFileSync(path.join(root, "docs/agent/RULE_CHANGELOG.md"), "utf8");
  assert.match(ruleChangelog, /BF-GOV-010/u, "RULE_CHANGELOG.md must document BF-GOV-010");
  assert.match(ruleChangelog, /BF-UX-017/u, "RULE_CHANGELOG.md must document BF-UX-017");
  assert.match(ruleChangelog, /BF-QA-004/u, "RULE_CHANGELOG.md must document BF-QA-004");
  assert.match(ruleChangelog, /BF-GOV-011/u, "RULE_CHANGELOG.md must document BF-GOV-011");
  assert.match(ruleChangelog, /BF-GOV-016/u, "RULE_CHANGELOG.md must document BF-GOV-016");
  assert.match(ruleChangelog, /BF-GOV-017/u, "RULE_CHANGELOG.md must document BF-GOV-017");
  assert.match(ruleChangelog, /BF-GOV-018/u, "RULE_CHANGELOG.md must document BF-GOV-018");
  assert.match(ruleChangelog, /BF-GOV-019/u, "RULE_CHANGELOG.md must document BF-GOV-019");
  assert.match(ruleChangelog, /BF-GOV-020/u, "RULE_CHANGELOG.md must document BF-GOV-020");
  assert.match(ruleChangelog, /BF-GOV-021/u, "RULE_CHANGELOG.md must document BF-GOV-021");
  assert.match(ruleChangelog, /BF-GOV-022/u, "RULE_CHANGELOG.md must document BF-GOV-022");
  assert.match(ruleChangelog, /BF-QA-005/u, "RULE_CHANGELOG.md must document BF-QA-005");
});

test("agentic motion & media QA scripts contract (BF-QA-002, BF-QA-003, BF-QA-004)", () => {
  const inspectMotionPath = path.join(root, "scripts/inspect-motion-qa.mjs");
  assert.ok(existsSync(inspectMotionPath), "scripts/inspect-motion-qa.mjs must exist");
  const inspectMotion = readFileSync(inspectMotionPath, "utf8");
  assert.match(inspectMotion, /function getAgenticVideoScriptPath/u, "inspect-motion-qa.mjs must define getAgenticVideoScriptPath");
  assert.match(inspectMotion, /function recordMotionVideo/u, "inspect-motion-qa.mjs must define recordMotionVideo");
  assert.match(inspectMotion, /function analyzeWithAgenticVideo/u, "inspect-motion-qa.mjs must define analyzeWithAgenticVideo");
  assert.match(inspectMotion, /function getArtifactDirectory/u, "inspect-motion-qa.mjs must define getArtifactDirectory");
  assert.match(inspectMotion, /function detectAutonomousSurfaces/u, "inspect-motion-qa.mjs must define detectAutonomousSurfaces");
  assert.match(inspectMotion, /--autonomous/u, "inspect-motion-qa.mjs must support autonomous flag");

  const validateMediaPath = path.join(root, "scripts/validate-media-qa.mjs");
  assert.ok(existsSync(validateMediaPath), "scripts/validate-media-qa.mjs must exist");
  const validateMedia = readFileSync(validateMediaPath, "utf8");
  assert.match(validateMedia, /function inspectMediaWithGemini/u, "validate-media-qa.mjs must define inspectMediaWithGemini");
  assert.match(validateMedia, /--offline/u, "validate-media-qa.mjs must support offline fallback");

  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts?.["qa:motion"], "package.json must declare qa:motion script");
  assert.ok(pkg.scripts?.["qa:motion:auto"], "package.json must declare qa:motion:auto script");
  assert.ok(pkg.scripts?.["qa:media"], "package.json must declare qa:media script");
  assert.ok(pkg.scripts?.["pilot:chrome"], "package.json must declare pilot:chrome script");
  assert.ok(pkg.scripts?.["test:mv3"], "package.json must declare test:mv3 script");
  assert.ok(pkg.scripts?.["guard:arch"], "package.json must declare guard:arch script");
  assert.ok(pkg.scripts?.["inspect:360"], "package.json must declare inspect:360 script");
  assert.ok(existsSync(path.join(root, "scripts/live-chrome-pilot.mjs")), "scripts/live-chrome-pilot.mjs must exist");
  assert.ok(existsSync(path.join(root, "scripts/mv3-api-audit.test.mjs")), "scripts/mv3-api-audit.test.mjs must exist");
  assert.match(pkg.scripts?.["validate:all"], /validate-media-qa\.mjs --offline/u, "validate:all must run validate-media-qa.mjs in offline mode");
});

test("JaponiGo context diet, history archive, pre-commit hook, and architecture guard contract (BF-GOV-028)", async () => {
  const agentsBuf = readFileSync(path.join(root, "AGENTS.md"));
  const stateBuf = readFileSync(path.join(root, "docs/agent/PROJECT_STATE.md"));
  assert.ok(agentsBuf.length <= 16384, `AGENTS.md (${agentsBuf.length} bytes) must stay <= 16 KB`);
  assert.ok(stateBuf.length <= 16384, `PROJECT_STATE.md (${stateBuf.length} bytes) must stay <= 16 KB`);

  assert.ok(existsSync(path.join(root, "docs/agent/history/PROJECT_STATE_HISTORY_2026.md")), "PROJECT_STATE_HISTORY_2026.md must exist");
  assert.ok(existsSync(path.join(root, "docs/agent-playbooks/mcp_plugin_orchestration.md")), "mcp_plugin_orchestration.md must exist");
  assert.ok(existsSync(path.join(root, ".githooks/pre-commit")), ".githooks/pre-commit must exist");

  const { evaluateArchitectureGuard, parseAddedLines } = await import("./check-architecture-guard.mjs");

  const diffSample = [
    "+++ b/src/content.js",
    "+try { doSomething(); } catch {}",
    "+chrome.browserAction.setBadgeText({ text: '1' });",
  ].join("\n");
  const addedLines = parseAddedLines(diffSample);
  assert.equal(addedLines["src/content.js"].length, 2);

  const report = evaluateArchitectureGuard({
    numstat: { "src/content.js": { added: 25, removed: 5 } },
    addedLines,
    lineCounts: { "src/content.js": 6150 },
    maxLines: 1500,
  });

  assert.equal(report.valid, false, "Forbidden MV2 API in runtime src/ must fail validation");
  assert.equal(report.errorCount, 1);
  assert.equal(report.errors[0].rule, "forbidden-runtime-api");
  assert.equal(report.warningCount, 2);
  assert.ok(report.warnings.some((w) => w.rule === "silent-catch-block"));
  assert.ok(report.warnings.some((w) => w.rule === "large-file-growth"));
});

test("specialist subagents, rule router skill, and version drift guard contract (BF-GOV-029)", async () => {
  const requiredAgentFiles = [
    ".agents/agents/bookmarkflow_modular_refactor_agent.md",
    ".agents/agents/bookmarkflow_live_qa_agent.md",
    ".agents/agents/bookmarkflow_i18n_release_agent.md",
    ".agents/skills/bookmarkflow-rule-router/SKILL.md",
    ".agents/skills/bookmarkflow-browser-qa/SKILL.md",
    ".agents/skills/bookmarkflow-release/SKILL.md",
  ];

  for (const relPath of requiredAgentFiles) {
    const fullPath = path.join(root, relPath);
    assert.ok(existsSync(fullPath), `Missing required specialist agent/skill file: ${relPath}`);
    const buf = readFileSync(fullPath);
    const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
    assert.strictEqual(hasBom, false, `${relPath} must not contain UTF-8 BOM`);
    const text = buf.toString("utf8");
    assert.match(text, /^---\r?\nname:/u, `${relPath} must start with YAML frontmatter`);
    assert.match(text, /MANDATORY & PROACTIVE:/u, `${relPath} must declare MANDATORY & PROACTIVE trigger prefix`);
  }

  const { validateVersionDriftGuard } = await import("./validate-governance.mjs");
  const validDrift = validateVersionDriftGuard();
  assert.equal(validDrift.valid, true);

  assert.throws(
    () =>
      validateVersionDriftGuard({
        manifestVersion: "0.4.2",
        packageVersion: "0.4.1",
        projectStateText: "Aktif Sürüm: `0.4.1`",
      }),
    /Version mismatch detected/u
  );
});
