# Extraction provenance

This repository was initialized from the AetherEdge integration workspace on
2026-07-13.

- Source repository: `https://github.com/EvanL1/AetherEdge`
- Source commit: `25a75263da04ea352124814cbf95826f12e63032`
- Extracted owners: `apps` (now `console`), `packs/energy`, `examples/energy-gateway`,
  `integrations/load-forecasting`, and
  `distributions/aetherems/runtime-io-features.txt`
- Excluded owners: AetherEdge `.git`, Kernel crates, libraries, services, tools,
  generic extensions, build output, caches, and deployment data

The composition was rewritten to remove workspace paths and private example or
runtime-catalog dependencies. The EMS console and Energy Pack content were
copied as closed asset trees. The source working tree contained an unpublished wording correction
in `packs/energy/knowledge/safe-operations.md` and the untracked runtime feature
authority; the initial AetherEMS commit is the authority for those downstream
files.
