#!/bin/zsh
cd "$(dirname "$0")" || exit 1

echo "Starting Kantana Billing App..."
echo "Folder: $(pwd)"
echo
echo "Keep this window open while using the app."
echo "Open: http://localhost:8000/"
echo

(sleep 1; open "http://localhost:8000/") &
python3 -m http.server 8000
