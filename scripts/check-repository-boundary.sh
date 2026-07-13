#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
    echo "ERROR: ripgrep (rg) is required for repository boundary checks" >&2
    exit 1
fi

failures=0
fail() {
    echo "ERROR: $*" >&2
    failures=$((failures + 1))
}

for forbidden in libs services tools extensions integrations examples workspace-hack; do
    [[ ! -e "$forbidden" ]] || fail "Kernel/integration owner is forbidden: $forbidden"
done

for forbidden in crates/aether-domain crates/aether-application crates/aether-sdk; do
    [[ ! -e "$forbidden" ]] || fail "copied Aether source is forbidden: $forbidden"
done

if rg -n '(^|[,{[:space:]])path[[:space:]]*=' --glob 'Cargo.toml' .; then
    fail "local Cargo path dependencies are forbidden"
fi
if rg -n '(^|[,{[:space:]])branch[[:space:]]*=' --glob 'Cargo.toml' .; then
    fail "moving Git branch dependencies are forbidden"
fi
if rg -n '(\.\./)+(Aether|crates|libs|services|tools|extensions)' \
    --glob 'Cargo.toml' --glob '*.rs' --glob '*.sh' .; then
    fail "downstream source reaches into a neighboring Kernel checkout"
fi

dependency_file=distribution/aetheriot-dependency.toml
[[ -s "$dependency_file" ]] || fail "missing $dependency_file"
commit=$(sed -n 's/^commit = "\([[:xdigit:]]\{40\}\)"$/\1/p' "$dependency_file")
repository=$(sed -n 's/^repository = "\([^"]*\)"$/\1/p' "$dependency_file")
[[ ${#commit} -eq 40 ]] || fail "AetherIot dependency commit must be one full SHA-1"
[[ "$repository" == "https://github.com/EvanL1/AetherIot.git" ]] \
    || fail "unexpected AetherIot repository: $repository"

pin_count=$(rg -c "rev = \"$commit\"" Cargo.toml || true)
[[ "$pin_count" == 2 ]] \
    || fail "both AetherIot packages must use the exact recorded commit (found $pin_count)"
git_dependency_count=$(rg -c 'git = "https://github.com/EvanL1/AetherIot\.git"' Cargo.toml || true)
[[ "$git_dependency_count" == 2 ]] \
    || fail "unexpected number of AetherIot Git dependencies: $git_dependency_count"
[[ -s Cargo.lock ]] || fail "Cargo.lock must be committed for downstream reproducibility"

pack_root=packs/energy
[[ -s "$pack_root/pack.yaml" ]] || fail "Energy Pack manifest is missing"
if find "$pack_root" -type l -print -quit | grep -q .; then
    fail "Energy Pack contains a symlink"
fi
model_count=$(find "$pack_root/models" -maxdepth 1 -type f -name '*.json' | wc -l | tr -d ' ')
knowledge_count=$(find "$pack_root/knowledge" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
[[ "$model_count" == 13 ]] || fail "expected 13 Energy model files, found $model_count"
[[ "$knowledge_count" == 5 ]] || fail "expected 5 Energy knowledge files, found $knowledge_count"
for index in mappings/index.yaml rules/index.yaml evaluations/index.yaml data-processing/tasks/index.yaml; do
    [[ -s "$pack_root/$index" ]] || fail "missing closed Pack index: $index"
done
[[ -s processors/load-forecasting/uv.lock ]] \
    || fail "load-forecasting processor must commit its uv lockfile"
rg -q '^  commissioned: false$' "$pack_root/pack.yaml" \
    || fail "Pack examples must be uncommissioned"
rg -q '^auto_load_instances: false$' \
    "$pack_root/examples/config/automation/automation.yaml" \
    || fail "instance auto-loading must remain disabled"
rg -q '"enabled"[[:space:]]*:[[:space:]]*false' \
    "$pack_root/rules/battery_soc_management.json" \
    || fail "bundled control rule must remain disabled"
for task in "$pack_root"/data-processing/tasks/*.yaml; do
    [[ $(basename "$task") == index.yaml ]] && continue
    rg -q '^enabled: false$' "$task" || fail "data-processing task is enabled: $task"
done
rg -q '^enabled: false$' "$pack_root/data-processing/bindings/example-site.yaml" \
    || fail "example data-processing binding must remain disabled"
rg -q '^commissioned: false$' "$pack_root/data-processing/bindings/example-site.yaml" \
    || fail "example data-processing binding must remain uncommissioned"

if rg -n 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' . \
    --glob '!scripts/check-repository-boundary.sh'; then
    fail "private key material is forbidden"
fi
if rg -n '^[[:space:]]*(password|auth_token):[[:space:]]*"[^"]+"' \
    "$pack_root/examples"; then
    fail "Pack examples must not embed credentials or credential placeholders"
fi
if rg -n '^[[:space:]]*Authorization:[[:space:]]*"[^"]+"' \
    "$pack_root/examples"; then
    fail "Pack examples must not embed Authorization values"
fi
if rg -n '\]\((\.\./)+(extensions|integrations|concepts|libs|services|tools|crates)/' \
    packs --glob '*.md'; then
    fail "Pack documentation contains a link into the former monorepo"
fi

if ((failures > 0)); then
    echo "AetherEMS repository boundary failed with $failures error(s)" >&2
    exit 1
fi

echo "AetherEMS repository boundary passed"
