#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: AETHER_CLI=/verified/aether AETHER_RUNTIME_MANIFEST=/verified/runtime-manifest.json $0 <output.bundle>" >&2
    exit 2
fi

: "${AETHER_CLI:?AETHER_CLI must identify a verified released Aether CLI}"
: "${AETHER_RUNTIME_MANIFEST:?AETHER_RUNTIME_MANIFEST must identify the matching target runtime manifest}"

[[ -x "$AETHER_CLI" ]] || { echo "AETHER_CLI is not executable: $AETHER_CLI" >&2; exit 1; }
[[ -s "$AETHER_RUNTIME_MANIFEST" ]] \
    || { echo "runtime manifest is missing or empty: $AETHER_RUNTIME_MANIFEST" >&2; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT=$1
mkdir -p "$(dirname "$OUTPUT")"

"$AETHER_CLI" --json packs build \
    --pack-root "$ROOT_DIR/packs/energy" \
    --runtime-manifest "$AETHER_RUNTIME_MANIFEST" \
    --output "$OUTPUT"
