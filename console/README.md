# AetherEMS Console

AetherEMS Console is the optional energy-operations reference application for
[AetherIot](https://github.com/EvanL1/AetherIot). It demonstrates how an
energy-domain UI can consume AetherIot contracts without turning the browser
into a live-state, configuration, authorization, or safety authority.

The Console is owned and released by AetherEMS. It is not bundled with the
headless AetherIot kernel and is not required to operate an AetherIot site.

## Application boundary

The browser has exactly one runtime origin: authenticated `aether-api` on port
6005.

```text
browser -> /api/v1/* and /ws -> aether-api:6005 -> loopback services
```

- Never connect to the IO, automation, history, uplink, or alarm process ports.
- Never read SHM or SQLite from the UI.
- Never let a form choose an internal service address.
- Preserve value quality, freshness, topology epoch, desired revision, and
  reconciliation state instead of displaying an optimistic merged state.
- Keep commands separate from read-only views. Server-side permission,
  confirmation, idempotency, revision, and audit policy remain authoritative.

Development and production proxy configurations enforce this boundary. The
source test `applicationGatewayBoundary.test.ts` fails if a retired API prefix
or internal process port returns.

## Local development

Requirements: Node.js 22.13+ in the Node 22 LTS line and Corepack. pnpm is an internal Console build
tool; it is not an AetherEMS product installation requirement.

```bash
corepack pnpm install --frozen-lockfile
AETHER_API_ORIGIN=http://127.0.0.1:6005 corepack pnpm run dev
```

`AETHER_API_ORIGIN` is used only by the Vite development proxy. Browser code
continues to use same-origin `/api/v1/*` and `/ws` paths. In production, nginx
serves the static application and forwards those two namespaces to
the `aether-api:6005` service on a private container network.

## Verification

```bash
corepack pnpm run type-check:only
corepack pnpm run lint:check
corepack pnpm run test:coverage
corepack pnpm run build
```

The maintained stack is Vue 3, TypeScript, Vite, Pinia, Vue Router, Element
Plus, Axios, and Vitest. API wrappers live in `src/api/`; application views must
consume those wrappers rather than introduce an alternate transport client.

## Role in an AI-native product

This repository keeps the Console as a tested example and operator baseline,
not as the universal AetherIot UI. New site-specific applications should be
generated from the active runtime manifest, Energy Pack, OpenAPI contracts,
and agent-readable documentation. If a required public capability is missing,
add it to the AetherIot application boundary; do not expose a process port as a
shortcut.

See the AetherIot guide
[Build Applications with AI](https://docs.aetheriot.workers.dev/guides/build-applications-with-ai/)
for the contract-first workflow.
