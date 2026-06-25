#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

PORT=8000
BIND=0.0.0.0
URL="http://127.0.0.1:${PORT}"

printf "Starting local server for slither-n-slash on %s\n" "$URL"
printf "Open this URL in your browser or use your Codespace port-forwarding URL.\n\n"

if command -v python3 >/dev/null 2>&1; then
  printf "Running: python3 -m http.server %s --bind %s\n\n" "$PORT" "$BIND"
  python3 -m http.server "$PORT" --bind "$BIND"
else
  printf "ERROR: python3 is not installed in this environment.\n"
  exit 1
fi
