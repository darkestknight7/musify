#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Musify (macOS / Linux)..."

if [ ! -d "dist" ]; then
  echo "Building frontend..."
  npm install && npm run build
fi

python3 -m pip install -q -r requirements.txt

echo "Musify is running at http://127.0.0.1:8000"
if command -v open >/dev/null 2>&1; then
  (sleep 2 && open "http://127.0.0.1:8000") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 2 && xdg-open "http://127.0.0.1:8000") &
fi

python3 server.py
