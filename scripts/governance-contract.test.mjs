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

  const decisionIndex = readFileSync(path.join(root, "docs/agent/DECISION_INDEX.md"), "utf8");
  assert.match(decisionIndex, /# DECISION_INDEX\.md/u, "DECISION_INDEX.md must declare header");
  assert.match(decisionIndex, /Manifest V3 & Sıfır Uzak Servis/u, "DECISION_INDEX.md must contain Decision 1");
  assert.match(decisionIndex, /Bütünsel İkincil İyileştirme Standardı/u, "DECISION_INDEX.md must contain Decision 16");
  assert.match(decisionIndex, /Yerel Niyet ve Akıllı Yönlendirme Motoru/u, "DECISION_INDEX.md must contain Decision 17");

  const projectState = readFileSync(path.join(root, "docs/agent/PROJECT_STATE.md"), "utf8");
  assert.match(projectState, /# PROJECT_STATE\.md/u, "PROJECT_STATE.md must declare header");
  assert.match(projectState, /Google Chrome/u, "PROJECT_STATE.md must declare Chrome support");

  const ruleChangelog = readFileSync(path.join(root, "docs/agent/RULE_CHANGELOG.md"), "utf8");
  assert.match(ruleChangelog, /BF-GOV-010/u, "RULE_CHANGELOG.md must document BF-GOV-010");
  assert.match(ruleChangelog, /BF-UX-017/u, "RULE_CHANGELOG.md must document BF-UX-017");
});

test("agentic motion & media QA scripts contract (BF-QA-002, BF-QA-003)", () => {
  const inspectMotionPath = path.join(root, "scripts/inspect-motion-qa.mjs");
  assert.ok(existsSync(inspectMotionPath), "scripts/inspect-motion-qa.mjs must exist");
  const inspectMotion = readFileSync(inspectMotionPath, "utf8");
  assert.match(inspectMotion, /function getAgenticVideoScriptPath/u, "inspect-motion-qa.mjs must define getAgenticVideoScriptPath");
  assert.match(inspectMotion, /function recordMotionVideo/u, "inspect-motion-qa.mjs must define recordMotionVideo");
  assert.match(inspectMotion, /function analyzeWithAgenticVideo/u, "inspect-motion-qa.mjs must define analyzeWithAgenticVideo");

  const validateMediaPath = path.join(root, "scripts/validate-media-qa.mjs");
  assert.ok(existsSync(validateMediaPath), "scripts/validate-media-qa.mjs must exist");
  const validateMedia = readFileSync(validateMediaPath, "utf8");
  assert.match(validateMedia, /function inspectMediaWithGemini/u, "validate-media-qa.mjs must define inspectMediaWithGemini");
  assert.match(validateMedia, /--offline/u, "validate-media-qa.mjs must support offline fallback");

  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts?.["qa:motion"], "package.json must declare qa:motion script");
  assert.ok(pkg.scripts?.["qa:media"], "package.json must declare qa:media script");
});
