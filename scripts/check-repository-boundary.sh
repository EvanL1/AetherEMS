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

for forbidden in apps libs services tools extensions integrations examples workspace-hack; do
    [[ ! -e "$forbidden" ]] || fail "Kernel/integration owner is forbidden: $forbidden"
done

for forbidden in crates/aether-domain crates/aether-application crates/aether-sdk; do
    [[ ! -e "$forbidden" ]] || fail "copied Aether source is forbidden: $forbidden"
done

console_root=console
console_manifest="$console_root/package.json"
[[ -s "$console_manifest" ]] || fail "AetherEMS console manifest is missing"
[[ -s "$console_root/pnpm-lock.yaml" ]] || fail "AetherEMS console pnpm lockfile is missing"
[[ ! -e "$console_root/package-lock.json" ]] \
    || fail "AetherEMS console must use pnpm as its single package authority"
if [[ -s "$console_manifest" ]]; then
    rg -q '"name"[[:space:]]*:[[:space:]]*"aetherems-console"' "$console_manifest" \
        || fail "AetherEMS console package identity is invalid"
fi

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
mode=$(sed -n 's/^mode = "\([^"]*\)"$/\1/p' "$dependency_file")
version=$(sed -n 's/^aetheriot_version = "\([^"]*\)"$/\1/p' "$dependency_file")
schema=$(sed -n 's/^schema = "\([^"]*\)"$/\1/p' "$dependency_file")
repository=$(sed -n 's/^repository = "\([^"]*\)"$/\1/p' "$dependency_file")
[[ "$repository" == "https://github.com/EvanL1/AetherEdge.git" ]] \
    || fail "unexpected AetherEdge repository: $repository"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] \
    || fail "AetherEdge dependency version is not exact semver: $version"

pinned_commit=""
case "$mode" in
    bootstrap-git)
        [[ "$schema" == "aetherems.aetheriot-dependency.v1" ]] \
            || fail "bootstrap AetherEdge authority must use schema v1"
        commit=$(sed -n 's/^commit = "\([[:xdigit:]]\{40\}\)"$/\1/p' "$dependency_file")
        [[ ${#commit} -eq 40 ]] \
            || fail "bootstrap AetherEdge commit must be one full SHA-1"
        pinned_commit="$commit"
        ;;
    released-git)
        [[ "$schema" == "aetherems.aetheriot-dependency.v2" ]] \
            || fail "released AetherEdge authority must use schema v2"
        release_tag=$(sed -n 's/^release_tag = "\([^"]*\)"$/\1/p' "$dependency_file")
        release_commit=$(sed -n 's/^release_commit = "\([[:xdigit:]]\{40\}\)"$/\1/p' "$dependency_file")
        [[ "$release_tag" == "v$version" ]] \
            || fail "released AetherEdge tag must match version $version"
        [[ ${#release_commit} -eq 40 ]] \
            || fail "released AetherEdge commit must be one full SHA-1"
        pinned_commit="$release_commit"
        ;;
    *)
        fail "unsupported AetherEdge dependency mode: $mode"
        ;;
esac

if [[ -n "$pinned_commit" ]]; then
    pin_count=$(rg -c "rev = \"$pinned_commit\"" Cargo.toml || true)
    [[ "$pin_count" == 1 ]] \
        || fail "the SDK facade must use the exact recorded commit (found $pin_count)"
fi
git_dependency_count=$(rg -c 'git = "https://github.com/EvanL1/AetherEdge\.git"' Cargo.toml || true)
[[ "$git_dependency_count" == 1 ]] \
    || fail "AetherEMS must declare exactly one AetherEdge dependency (found $git_dependency_count)"
rg -q 'package = "aether-edge-sdk"' Cargo.toml \
    || fail "the single AetherEdge dependency must be aether-edge-sdk"
rg -q 'features = \["local-runtime"\]' Cargo.toml \
    || fail "the SDK facade must expose the local-runtime composition"
if rg -n 'aether-store-local' --glob 'Cargo.toml' .; then
    fail "AetherEMS must not depend directly on an AetherEdge implementation crate"
fi
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
