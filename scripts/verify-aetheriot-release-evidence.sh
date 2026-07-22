#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dependency_file="$ROOT_DIR/distribution/aetheriot-dependency.toml"
repo=EvanL1/AetherEdge

fail() {
    echo "AetherEdge release evidence verification failed: $*" >&2
    exit 1
}

quoted() {
    local key=$1
    sed -n "s/^${key} = \"\([^\"]*\)\"$/\1/p" "$dependency_file"
}

for command in curl gh python3 sha256sum; do
    command -v "$command" >/dev/null 2>&1 || fail "$command is required"
done

version=$(quoted aetheriot_version)
tag=$(quoted release_tag)
commit=$(quoted release_commit)
# Sigstore certificates keep the repository identity from signing time, so a
# renamed repository must verify against the recorded signer, not $repo.
signer_repository=$(quoted provenance_signer_repository)
[[ -n "$signer_repository" ]] || fail "provenance_signer_repository is not recorded"
release_url="https://github.com/$repo/releases/download/$tag"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

remote_commit=$(gh api "repos/$repo/commits/$tag" --jq .sha)
[[ "$remote_commit" == "$commit" ]] || fail "tag $tag resolves to $remote_commit, expected $commit"

asset_pairs=(
    source
    runtime_arm64 runtime_amd64
    runtime_manifest_arm64 runtime_manifest_amd64
    cli_linux_x86_64 cli_linux_aarch64
    cli_darwin_aarch64 cli_windows_x86_64
)
for prefix in "${asset_pairs[@]}"; do
    asset=$(quoted "${prefix}_asset")
    expected=$(quoted "${prefix}_sha256")
    checksum_file="$tmp/$asset.sha256"
    curl --fail --silent --show-error --location \
        "$release_url/$asset.sha256" -o "$checksum_file"
    read -r actual recorded_name < "$checksum_file"
    recorded_name=${recorded_name#\*}
    [[ "$actual" == "$expected" ]] || fail "$asset checksum differs from the recorded authority"
    [[ "$recorded_name" == "$asset" ]] || fail "$asset checksum file names '$recorded_name'"
done

source_asset=$(quoted source_asset)
source_sha=$(quoted source_sha256)
curl --fail --silent --show-error --location "$release_url/$source_asset" -o "$tmp/$source_asset"
printf '%s  %s\n' "$source_sha" "$tmp/$source_asset" | sha256sum -c - >/dev/null

manifest=$(quoted runtime_manifest_amd64_asset)
manifest_sha=$(quoted runtime_manifest_amd64_sha256)
curl --fail --silent --show-error --location "$release_url/$manifest" -o "$tmp/$manifest"
printf '%s  %s\n' "$manifest_sha" "$tmp/$manifest" | sha256sum -c - >/dev/null

bundle=$(quoted provenance_asset)
bundle_sha=$(quoted provenance_sha256)
curl --fail --silent --show-error --location "$release_url/$bundle" -o "$tmp/$bundle"
printf '%s  %s\n' "$bundle_sha" "$tmp/$bundle" | sha256sum -c - >/dev/null

verification="$tmp/verification.json"
gh attestation verify "$tmp/$source_asset" \
    --repo "$signer_repository" \
    --bundle "$tmp/$bundle" \
    --signer-workflow "$signer_repository/.github/workflows/release.yml" \
    --source-ref "refs/tags/$tag" \
    --source-digest "$commit" \
    --format json > "$verification"

python3 - "$dependency_file" "$verification" <<'PY'
import json
import os
import re
import sys

authority, verification = sys.argv[1:]
values = {}
for line in open(authority, encoding="utf-8"):
    match = re.fullmatch(r'([a-z0-9_]+) = "([^"]*)"\n?', line)
    if match:
        values[match.group(1)] = match.group(2)

required = {
    values[f"{prefix}_asset"]: values[f"{prefix}_sha256"]
    for prefix in (
        "source",
        "runtime_arm64",
        "runtime_amd64",
        "runtime_manifest_arm64",
        "runtime_manifest_amd64",
        "cli_linux_x86_64",
        "cli_linux_aarch64",
        "cli_darwin_aarch64",
        "cli_windows_x86_64",
    )
}
verified = json.load(open(verification, encoding="utf-8"))
subjects = {}
for result in verified:
    for subject in result["verificationResult"]["statement"]["subject"]:
        digest = subject.get("digest", {}).get("sha256")
        if digest:
            subjects[os.path.basename(subject["name"])] = digest
missing = {name: digest for name, digest in required.items() if subjects.get(name) != digest}
if missing:
    raise SystemExit(f"signed provenance is missing recorded release subjects: {sorted(missing)}")
PY

echo "Verified AetherEdge $tag source, release checksums, and signed provenance"
