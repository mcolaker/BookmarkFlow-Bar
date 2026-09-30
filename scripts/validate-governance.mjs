import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

const requiredFiles = [
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

const agentsContent = readFileSync(join(root, "AGENTS.md"), "utf8");
const mandatoryPatterns = [
  "DECISION_INDEX.md",
  "PROJECT_STATE.md",
  "docs/agent-playbooks",
  "P0 — Tavizsiz Kurallar",
  "Bütünsel İkincil İyileştirme Standardı",
  "Task Router",
  "Zorunlu Nihai Rapor Şablonu",
];

for (const pattern of mandatoryPatterns) {
  if (!agentsContent.includes(pattern)) {
    throw new Error(`Governance contract violation: AGENTS.md missing mandatory pattern: "${pattern}"`);
  }
}

const decisionContent = readFileSync(join(root, "docs/agent/DECISION_INDEX.md"), "utf8");
if (!decisionContent.includes("| 1 |") || !decisionContent.includes("Manifest V3")) {
  throw new Error("Governance contract violation: docs/agent/DECISION_INDEX.md missing valid decision entries.");
}

console.log("BookmarkFlow governance, decision index, and playbook contracts are valid.");
