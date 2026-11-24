#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Starting Musify (macOS / Linux)..."

if [ ! -d "dist" ]; then
  echo "Building production frontend..."
  npm install && npm run build
fi

python3 -m pip install -q -r requirements.txt

if [ "${1:-}" = "--public" ]; then
  echo "Opening public HTTPS tunnel for phones & tablets..."
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:8000 nokey@localhost.run &
else
  echo "Musify is running at http://127.0.0.1:8000"
  echo "Tip: Run './start_musify.sh --public' to get an HTTPS link for phones & tablets."
  if command -v open >/dev/null 2>&1; then
    (sleep 2 && open "http://127.0.0.1:8000") &
  elif command -v xdg-open >/dev/null 2>&1; then
    (sleep 2 && xdg-open "http://127.0.0.1:8000") &
  fi
fi

python3 server.py
