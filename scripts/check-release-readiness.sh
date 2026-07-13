#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dependency_file="$ROOT_DIR/distribution/aetheriot-dependency.toml"

mode=$(sed -n 's/^mode = "\([^"]*\)"$/\1/p' "$dependency_file")
evidence=$(sed -n 's/^release_evidence_complete = \(.*\)$/\1/p' "$dependency_file")

if [[ "$mode" != released || "$evidence" != true ]]; then
    echo "AetherEMS release blocked: AetherIot dependency is $mode and signed release evidence is incomplete" >&2
    exit 1
fi

if rg -q 'git[[:space:]]*=' "$ROOT_DIR/Cargo.toml"; then
    echo "AetherEMS release blocked: Git dependencies remain in Cargo.toml" >&2
    exit 1
fi

echo "AetherEMS release dependency gate passed"
