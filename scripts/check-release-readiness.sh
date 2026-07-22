#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dependency_file="$ROOT_DIR/distribution/aetheriot-dependency.toml"

fail() {
    echo "AetherEMS release blocked: $*" >&2
    exit 1
}

quoted() {
    local key=$1
    sed -n "s/^${key} = \"\([^\"]*\)\"$/\1/p" "$dependency_file"
}

require_exact() {
    local key=$1 expected=$2 actual
    actual=$(quoted "$key")
    [[ "$actual" == "$expected" ]] || fail "$key is '$actual', expected '$expected'"
}

require_sha256() {
    local key=$1 value
    value=$(quoted "$key")
    [[ "$value" =~ ^[0-9a-f]{64}$ ]] || fail "$key is not a lowercase SHA-256"
}

[[ -s "$dependency_file" ]] || fail "dependency authority is missing"
require_exact schema aetherems.aetheriot-dependency.v2
require_exact mode released-git
require_exact repository https://github.com/EvanL1/AetherEdge.git

version=$(quoted aetheriot_version)
tag=$(quoted release_tag)
commit=$(quoted release_commit)
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "AetherEdge version is not exact semver"
[[ "$tag" == "v$version" ]] || fail "release tag does not match AetherEdge version"
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || fail "release commit is not one full Git SHA"
require_exact release_url "https://github.com/EvanL1/AetherEdge/releases/tag/$tag"
[[ $(sed -n 's/^release_evidence_complete = \(.*\)$/\1/p' "$dependency_file") == true ]] \
    || fail "signed release evidence is incomplete"

declare -A expected_assets=(
    [source_asset]="aetheriot-source-$tag.tar.gz"
    [runtime_arm64_asset]="AetherEdge-arm64-$version.run"
    [runtime_amd64_asset]="AetherEdge-amd64-$version.run"
    [runtime_manifest_arm64_asset]="aetheriot-runtime-manifest-arm64-$version.json"
    [runtime_manifest_amd64_asset]="aetheriot-runtime-manifest-amd64-$version.json"
    [cli_linux_x86_64_asset]="aether-linux-x86_64.tar.gz"
    [cli_linux_aarch64_asset]="aether-linux-aarch64.tar.gz"
    [cli_darwin_aarch64_asset]="aether-darwin-aarch64.tar.gz"
    [cli_windows_x86_64_asset]="aether-windows-x86_64.zip"
    [provenance_asset]="aetheriot-$tag-provenance.sigstore.json"
)
for key in "${!expected_assets[@]}"; do
    require_exact "$key" "${expected_assets[$key]}"
done

for key in \
    source_sha256 \
    runtime_arm64_sha256 runtime_amd64_sha256 \
    runtime_manifest_arm64_sha256 runtime_manifest_amd64_sha256 \
    cli_linux_x86_64_sha256 cli_linux_aarch64_sha256 \
    cli_darwin_aarch64_sha256 cli_windows_x86_64_sha256 \
    provenance_sha256; do
    require_sha256 "$key"
done

if rg -n '(^|[,{[:space:]])(path|branch)[[:space:]]*=' --glob 'Cargo.toml' "$ROOT_DIR"; then
    fail "Cargo manifests retain a local path or moving branch dependency"
fi
git_dependency_count=$(rg -c 'git = "https://github.com/EvanL1/AetherEdge\.git"' "$ROOT_DIR/Cargo.toml" || true)
[[ "$git_dependency_count" == 1 ]] || fail "exactly one AetherEdge SDK dependency is required"
rg -q 'package = "aether-edge-sdk"' "$ROOT_DIR/Cargo.toml" \
    || fail "the AetherEdge dependency is not the supported SDK facade"
rg -q "rev = \"$commit\"" "$ROOT_DIR/Cargo.toml" \
    || fail "the SDK facade is not pinned to the recorded release commit"
rg -q 'features = \["local-runtime"\]' "$ROOT_DIR/Cargo.toml" \
    || fail "the SDK facade does not expose the local runtime composition"
rg -q "const AETHER_VERSION: &str = \"$version\";" \
    "$ROOT_DIR/crates/aetherems-composition/src/lib.rs" \
    || fail "AETHER_VERSION in the composition does not match the recorded aetheriot_version"
if rg -n 'aether-store-local' --glob 'Cargo.toml' "$ROOT_DIR"; then
    fail "AetherEMS directly depends on an AetherEdge implementation package"
fi

expected_source="source = \"git+https://github.com/EvanL1/AetherEdge.git?rev=$commit#$commit\""
awk -v version="$version" -v expected_source="$expected_source" '
    $0 == "[[package]]" { in_package = 0; found_name = 0; found_version = 0; found_source = 0 }
    $0 == "name = \"aether-edge-sdk\"" { in_package = 1; found_name = 1 }
    in_package && $0 == "version = \"" version "\"" { found_version = 1 }
    in_package && $0 == expected_source { found_source = 1 }
    in_package && found_name && found_version && found_source { ok = 1 }
    END { exit(ok ? 0 : 1) }
' "$ROOT_DIR/Cargo.lock" || fail "aether-edge-sdk@$version is not locked to release commit $commit"

if [[ ${AETHEREMS_OFFLINE_RELEASE_CHECK:-0} != 1 ]]; then
    "$ROOT_DIR/scripts/verify-aetheriot-release-evidence.sh"
fi

echo "AetherEMS release dependency gate passed for AetherEdge $tag ($commit)"
