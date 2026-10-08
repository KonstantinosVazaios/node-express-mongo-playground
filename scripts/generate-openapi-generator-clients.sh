#!/usr/bin/env bash
# OPTIONAL, for comparison only: generates clients from the same openapi.json
# with openapi-generator-cli (the Java-based classic) through its Docker image,
# so you can diff its output against packages/api-client side by side.
#
#   npm run generate:client:compare
#
# Output goes to compare/openapi-generator/ (git-ignored, outside packages/
# so npm workspaces never pick it up).
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=compare/openapi-generator
IMAGE=openapitools/openapi-generator-cli:v7.26.0

rm -rf "$OUT"
mkdir -p "$OUT"

for generator in typescript-fetch typescript-axios; do
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -v "$PWD:/local" \
    "$IMAGE" generate \
    --input-spec /local/openapi.json \
    --generator-name "$generator" \
    --output "/local/$OUT/$generator" \
    --additional-properties=supportsES6=true,withInterfaces=true \
    > "$OUT/$generator.log"
  echo "Generated $OUT/$generator ($(find "$OUT/$generator" -name '*.ts' | wc -l | tr -d ' ') .ts files)"
done
