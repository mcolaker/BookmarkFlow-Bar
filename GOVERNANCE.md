# Project Governance

BookmarkFlow Bar is an independently maintained open-source project. This document explains how project decisions, contributions, releases, and maintainer responsibilities are handled.

## Primary maintainer

The primary maintainer is [Muhammed Colaker (`@mcolaker`)](https://github.com/mcolaker). The primary maintainer is responsible for release integrity, security coordination, repository administration, and final decisions when consensus cannot be reached.

## Decision process

- Product and maintenance proposals begin as a focused GitHub issue or discussion.
- Implementation changes are reviewed through pull requests and must pass the repository's validation gates.
- Decisions favor user safety, local-first privacy, accessibility, browser policy compliance, and maintainable scope.
- The maintainer will explain material rejections or requested changes in the relevant public thread whenever security or privacy does not require confidentiality.
- The primary maintainer makes the final decision when contributors do not reach consensus.

## Maintainer responsibilities

Maintainers are expected to:

- triage reproducible issues and focused feature proposals;
- review pull requests for correctness, privacy, security, accessibility, and maintainability;
- keep supported releases, public documentation, and the changelog aligned;
- coordinate vulnerability reports through GitHub Private Vulnerability Reporting; and
- avoid publishing contributor or user data that is not necessary for project maintenance.

## Becoming a maintainer

Maintainer access may be offered after a sustained record of constructive contributions, reliable reviews, respectful community participation, and sound security judgment. There is no contribution-count shortcut or paid path to repository access. Access is scoped to current project needs and may be reduced when responsibilities change.

## Releases

Official releases are created from reviewed commits on the protected `main` branch. Release packages must pass the documented validation suite, use a versioned tag, include a checksum, and match the public source for that version. Brand and official-build boundaries are described in [TRADEMARKS.md](TRADEMARKS.md).

## Security and conduct

Security reports follow [SECURITY.md](SECURITY.md). Community participation follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md) and the [Developer Certificate of Origin](DCO).

## Governance changes

Material governance changes are proposed and reviewed publicly through a pull request. License or trademark-policy changes require explicit approval from the relevant rights holder and cannot remove rights already granted for earlier open-source releases.
