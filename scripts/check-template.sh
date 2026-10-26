#!/usr/bin/env bash
# Verify that a bundled template compiles: copy it out, install, typecheck, build.
# Usage: scripts/check-template.sh <template-id>
set -euo pipefail

id="${1:?usage: scripts/check-template.sh <template-id>}"
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if [ ! -d "$root/templates/$id" ]; then
  echo "template '$id' not found under $root/templates" >&2
  exit 1
fi

cp -r "$root/templates/$id" "$tmp/project"
cd "$tmp/project"

# Give the package a valid provisional name before installing.
sed -i "s/{{projectName}}/$id/g; s/{{projectTitle}}/$id/g" package.json index.html README.md

bun install
bun run typecheck
bun run build

echo "template $id: OK"
