#!/bin/zsh
cd "$(dirname "$0")" || exit 1

PORT=8000
APP_URL="http://localhost:${PORT}"

echo "Starting Kantana Billing App public tunnel..."
echo "Folder: $(pwd)"
echo

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed yet."
  echo
  echo "Install with Homebrew:"
  echo "  brew install cloudflared"
  echo
  echo "Or download from:"
  echo "  https://developers.cloudflare.com/tunnel/downloads/"
  echo
  echo "After installing, double-click this file again."
  echo
  read "REPLY?Press Enter to close..."
  exit 1
fi

SERVER_STARTED=0
if curl -fsS "${APP_URL}/" >/dev/null 2>&1; then
  echo "Local app is already running at ${APP_URL}"
else
  echo "Starting local app at ${APP_URL}"
  python3 -m http.server "${PORT}" --bind 127.0.0.1 >/tmp/kantana-bill-app.log 2>&1 &
  SERVER_PID=$!
  SERVER_STARTED=1
  sleep 2
fi

cleanup() {
  if [ "${SERVER_STARTED}" = "1" ] && [ -n "${SERVER_PID}" ]; then
    kill "${SERVER_PID}" >/dev/null 2>&1
  fi
}
trap cleanup EXIT

echo
echo "Cloudflare will show a public https://....trycloudflare.com link below."
echo "Keep this window open while sharing the app."
echo

cloudflared tunnel --url "${APP_URL}"
