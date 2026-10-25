import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const requiredplaybooks = [
  "docs/agent-playbooks/browser_extension.md",
  "docs/agent-playbooks/windows_companion.md",
  "docs/agent-playbooks/ui_accessibility.md",
  "docs/agent-playbooks/mcp_plugin_orchestration.md",
  "docs/agent-playbooks/security_privacy.md",
  "docs/agent-playbooks/release_distribution.md",
  "docs/agent-playbooks/rule_governance.md",
];

const requiredAgentDefinitions = [
  ".agents/agents/bookmarkflow_modular_refactor_agent.md",
  ".agents/agents/bookmarkflow_live_qa_agent.md",
  ".agents/agents/bookmarkflow_i18n_release_agent.md",
  ".agents/skills/bookmarkflow-rule-router/SKILL.md",
  ".agents/skills/bookmarkflow-browser-qa/SKILL.md",
  ".agents/skills/bookmarkflow-release/SKILL.md",
];

const requiredFiles = [
  "AGENTS.md",
  "docs/agent/DECISION_INDEX.md",
  "docs/agent/PROJECT_STATE.md",
  "docs/agent/RULE_CHANGELOG.md",
  "docs/agent/history/PROJECT_STATE_HISTORY_2026.md",
  ...requiredplaybooks,
  ...requiredAgentDefinitions,
  "AGENT_RULE_COMPLIANCE_BENCHMARK.md",
  ".githooks/pre-commit",
  ".githooks/pre-push",
  "scripts/check-architecture-guard.mjs",
];

export function validateVersionDriftGuard(options = {}) {
  const manifestVersion =
    options.manifestVersion ??
    JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")).version;
  const packageVersion =
    options.packageVersion ??
    JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  const projectStateText =
    options.projectStateText ??
    readFileSync(join(root, "docs/agent/PROJECT_STATE.md"), "utf8");

  const stateMatch = projectStateText.match(/Aktif Sürüm:\s*`v?(\d+\.\d+\.\d+)`/u);
  if (!stateMatch) {
    throw new Error(
      "Governance contract violation (Version Drift Guard): docs/agent/PROJECT_STATE.md missing 'Aktif Sürüm: `vX.Y.Z`' declaration."
    );
  }
  const stateVersion = stateMatch[1];

  if (manifestVersion !== packageVersion || manifestVersion !== stateVersion) {
    throw new Error(
      `Governance contract violation (Version Drift Guard): Version mismatch detected across manifest.json (${manifestVersion}), package.json (${packageVersion}), and PROJECT_STATE.md (${stateVersion}).`
    );
  }

  return {
    valid: true,
    version: manifestVersion,
  };
}

for (const relPath of requiredFiles) {
  const fullPath = join(root, relPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Governance contract violation: Missing required file: ${relPath}`);
  }

  const rawBuffer = readFileSync(fullPath);
  if (rawBuffer.length >= 3 && rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF) {
    throw new Error(`Governance contract violation: BOM detected in ${relPath}. Files must be BOM-less UTF-8.`);
  }
}

const MAX_AGENTS_BYTES = 16384; // 16 KB ceiling budget (BF-GOV-028 context diet)
const agentsBuffer = readFileSync(join(root, "AGENTS.md"));
if (agentsBuffer.length > MAX_AGENTS_BYTES) {
  throw new Error(`Governance contract violation: AGENTS.md exceeds context ceiling budget (${agentsBuffer.length} bytes > ${MAX_AGENTS_BYTES} bytes). Refactor domain details into playbooks.`);
}

const MAX_PROJECT_STATE_BYTES = 16384; // 16 KB working memory ceiling (BF-GOV-028)
const stateBuffer = readFileSync(join(root, "docs/agent/PROJECT_STATE.md"));
if (stateBuffer.length > MAX_PROJECT_STATE_BYTES) {
  throw new Error(`Governance contract violation: docs/agent/PROJECT_STATE.md exceeds working memory ceiling (${stateBuffer.length} bytes > ${MAX_PROJECT_STATE_BYTES} bytes). Archive completed items to docs/agent/history/PROJECT_STATE_HISTORY_2026.md.`);
}

const agentsContent = agentsBuffer.toString("utf8");
const MAX_PLAYBOOK_TOTAL_BYTES = 120000;
let totalPlaybookBytes = 0;

for (const pb of requiredplaybooks) {
  const pbBuf = readFileSync(join(root, pb));
  totalPlaybookBytes += pbBuf.length;
  if (!agentsContent.includes(pb)) {
    throw new Error(`Governance contract violation: AGENTS.md Task Router does not reference playbook: ${pb}`);
  }
}

if (totalPlaybookBytes > MAX_PLAYBOOK_TOTAL_BYTES) {
  throw new Error(`Governance contract violation: Total playbook byte size (${totalPlaybookBytes} bytes) exceeds ceiling (${MAX_PLAYBOOK_TOTAL_BYTES} bytes).`);
}

const mandatoryPatterns = [
  "DECISION_INDEX.md",
  "PROJECT_STATE.md",
  "AGENT_RULE_COMPLIANCE_BENCHMARK.md",
  "docs/agent-playbooks",
  "P0 — Tavizsiz Kurallar",
  "Sessiz Nihai Yanıt Kapısı",
  "Bütünsel İkincil İyileştirme Standardı",
  "Task Router",
  "Zorunlu Nihai Rapor Şablonu",
  "check-architecture-guard.mjs",
];

for (const pattern of mandatoryPatterns) {
  if (!agentsContent.includes(pattern)) {
    throw new Error(`Governance contract violation: AGENTS.md missing mandatory pattern: "${pattern}"`);
  }
}

const stateContent = stateBuffer.toString("utf8");
for (const statePattern of [
  "PROJECT_STATE_HISTORY_2026.md",
  "Ürün Kapsam Dışı İlkeleri (Product Non-Goals",
  "Aktif Proaktif Backlog",
]) {
  if (!stateContent.includes(statePattern)) {
    throw new Error(`Governance contract violation: PROJECT_STATE.md missing mandatory section/reference: "${statePattern}"`);
  }
}

// Stale reference scan across playbooks and governance docs
const stalePattern = /https:\/\/(?:github\.com\/09mc|09mc\.github\.io)|\/webstore\/devconsole\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu;
for (const docPath of ["AGENTS.md", "docs/agent/PROJECT_STATE.md", "docs/agent/DECISION_INDEX.md", ...requiredplaybooks]) {
  const txt = readFileSync(join(root, docPath), "utf8");
  if (stalePattern.test(txt)) {
    throw new Error(`Governance contract violation: Stale reference or hardcoded UUID found in ${docPath}`);
  }
}

const benchmarkContent = readFileSync(join(root, "AGENT_RULE_COMPLIANCE_BENCHMARK.md"), "utf8");
const benchmarkPatterns = ["MUST Behavioural Checks", "Test Prompt", "Pass Rule", "P0-9", "P0-10"];
for (const bp of benchmarkPatterns) {
  if (!benchmarkContent.includes(bp)) {
    throw new Error(`Governance contract violation: AGENT_RULE_COMPLIANCE_BENCHMARK.md missing mandatory pattern: "${bp}"`);
  }
}

const decisionContent = readFileSync(join(root, "docs/agent/DECISION_INDEX.md"), "utf8");
if (!decisionContent.includes("| 1 |") || !decisionContent.includes("Manifest V3")) {
  throw new Error("Governance contract violation: docs/agent/DECISION_INDEX.md missing valid decision entries.");
}

for (const agentPath of requiredAgentDefinitions) {
  const content = readFileSync(join(root, agentPath), "utf8");
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    throw new Error(`Governance contract violation: ${agentPath} must begin with YAML frontmatter (---).`);
  }
  if (!content.includes("MANDATORY & PROACTIVE:")) {
    throw new Error(`Governance contract violation: ${agentPath} frontmatter description must include 'MANDATORY & PROACTIVE:'.`);
  }
}

validateVersionDriftGuard();

console.log("BookmarkFlow governance, decision index, version drift guard, subagents, and playbook contracts are valid.");
