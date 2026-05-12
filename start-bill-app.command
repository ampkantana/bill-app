#!/bin/zsh
cd "$(dirname "$0")" || exit 1

echo "Starting Kantana Billing App..."
echo "Folder: $(pwd)"
echo
echo "Keep this window open while using the app."
PORT=8000
LOCAL_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
echo "Open on this Mac: http://localhost:${PORT}/"
if [ -n "$LOCAL_IP" ]; then
  echo "Open on phone / another device in the same Wi-Fi: http://${LOCAL_IP}:${PORT}/"
fi
echo

(sleep 1; open "http://localhost:${PORT}/") &
python3 -m http.server "$PORT" --bind 0.0.0.0
