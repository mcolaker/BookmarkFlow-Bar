---
name: bookmarkflow-release
description: "MANDATORY & PROACTIVE: Automatically activate for BookmarkFlow GitHub, Chrome Web Store, packaging, release, or publication work."
---

1. Follow the exact authorization matrix in `AGENTS.md` and `docs/agent-playbooks/release_distribution.md`.
2. Routine branch/push/PR/green-gate merge and the recorded Chrome Web Store routine are pre-authorized only within that contract. Require explicit user approval for release tags/GitHub Releases, direct or force pushes to main, remote deletion, license/trademark changes, and external social publication.
3. Verify **Version Drift Guard (`BF-GOV-029`)**: `manifest.json`, `package.json`, and `docs/agent/PROJECT_STATE.md` must declare the exact same active version (`node scripts/validate-governance.mjs`).
4. Every release cycle MUST automatically and proactively update `README.md` with new features, themes, shortcuts, badges, package downloads, and release showcase visuals—never skip or defer README updates.
5. Deliver a complete promotional asset kit (X/Twitter `1200x675`, LinkedIn `1200x627`, theme matrices, and English-only social copy) validated with `assertSocialCardVisualQuality` and `validateImageMagicBytes` (zero UTF-8 BOM corruption).
6. Enforce **Zero End-User AI & Zero Technical Jargon (`P0-13` & `P0-16` / `BF-GOV-029`)**: Public store descriptions and X/LinkedIn social copy must be strictly Benefit-First and pass `assertZeroTechnicalJargonInPublicCopy` (zero `<1ms`, `60fps`, `O(1)`, `Shadow DOM`, `Manifest V3`, `Service Worker`, `regression`, `refactor`, `AST`, or internal task IDs).
7. Always include BOTH the official Chrome Web Store link (`https://chromewebstore.google.com/detail/bookmarkflow-bar/iaikobkolclhhpcogacjkenijlfaibpf`) and the GitHub Release link (`https://github.com/mcolaker/BookmarkFlow-Bar...`), and verify `assertPreSocialReleaseGate` before any social publication.
8. Ensure DCO `Signed-off-by` requirements and all local/CI gates remain green.
