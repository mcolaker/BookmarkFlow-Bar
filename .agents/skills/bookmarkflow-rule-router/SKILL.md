---
name: bookmarkflow-rule-router
description: "MANDATORY & PROACTIVE: Automatically activate at the start of every task to classify the work, load only the required docs/agent-playbooks/*.md guide, activate matching MCP servers, and delegate context-heavy work to .agents/agents/* specialists."
---

# BookmarkFlow Rule Router & Smart Subagent Delegation (`BF-GOV-029`)

Execute this routing protocol at the start of every task to keep context lean (`AGENTS.md <= 16 KB`) while guaranteeing 100% compliance with all P0 invariants:

## 1. Classify Task & Load Only Required Playbooks
| Task Category | Playbook to Read | Mandatory Autonomous MCP / Skills | Specialist Subagent (`.agents/agents/`) |
|---|---|---|---|
| `BUGFIX` | Closest domain playbook | `deep-debug`, `codebase-memory` (`search_graph`, `trace_path`), `chrome-devtools` | `bookmarkflow_live_qa_agent` (for multi-surface verification) |
| `BROWSER_EXTENSION` | `docs/agent-playbooks/browser_extension.md` | `modern-web-guidance`, `chrome-extensions`, `codebase-memory` | `bookmarkflow_modular_refactor_agent` (when touching files `>1,500` lines) |
| `WINDOWS_COMPANION` | `docs/agent-playbooks/windows_companion.md` | Live Chrome Pilot (`CDP 9222`), `security-audit` | `bookmarkflow_live_qa_agent` |
| `UI_ACCESSIBILITY` | `docs/agent-playbooks/ui_accessibility.md` | `bookmarkflow-browser-qa`, `a11y-debugging`, `jev` (`inspect:360`), `clef`, `stitch` | `bookmarkflow_live_qa_agent` |
| `MCP_ORCHESTRATION` | `docs/agent-playbooks/mcp_plugin_orchestration.md` | `jev`, `clef`, `stitch`, `context7`, `codebase-memory` | `bookmarkflow_live_qa_agent` |
| `SECURITY_PRIVACY` | `docs/agent-playbooks/security_privacy.md` | `security-audit`, `verify-public-tree.mjs` | — |
| `RELEASE_DISTRIBUTION` | `docs/agent-playbooks/release_distribution.md` | `bookmarkflow-release`, Live Chrome Pilot (`publish:cws`, `publish:social`) | `bookmarkflow_i18n_release_agent` |
| `RULE_GOVERNANCE` | `docs/agent-playbooks/rule_governance.md` | `skill-manager`, `codebase-memory`, `validate-governance.mjs` | — |

## 2. Smart Subagent Delegation Protocol
1. **When to Delegate**:
   - **Modularizing or editing files `>1,500` lines** (`src/content.js`, `src/newtab.js`, `src/background.js`): Consult or delegate to `bookmarkflow_modular_refactor_agent` so `codebase-memory` call graphs are audited first.
   - **Full 6-Pillar Browser/Visual QA & Multi-Step Flows**: Delegate heavy Playwright/CDP runs and `t0 -> t1 -> t2` state delta checks to `bookmarkflow_live_qa_agent` to keep raw screenshots and DOM dumps out of the main conversation context.
   - **Localization Audits & Release Packaging**: Delegate full TR/EN key/placeholder parity scans and store/social copy jargon checks to `bookmarkflow_i18n_release_agent`.
2. **When to Execute Directly**:
   - Targeted single-file fixes, unit tests, and final mandatory verification commands (`npm test`, `npm run validate:all`, `git diff --check`) required for Section 4 of the final response.
