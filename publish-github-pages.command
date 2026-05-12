#!/bin/zsh
cd "$(dirname "$0")" || exit 1

set -e

echo "Publishing Kantana Billing App to GitHub Pages..."
echo "Folder: $(pwd)"
echo

git config user.name "ampkantana"
git config user.email "kantana.amp@gmail.com"

echo "Checking files..."
if command -v node >/dev/null 2>&1; then
  node --check app.js
  node tests/document-ui.test.js
else
  echo "Node.js was not found in this Terminal, so local checks were skipped."
fi
git diff --check

echo
echo "Preparing commit..."
git add app.js index.html styles.css tests/document-ui.test.js \
  start-bill-app.command start-public-tunnel.command publish-github-pages.command \
  .gitignore .nojekyll supabase/schema.sql

if git diff --cached --quiet; then
  echo "No new changes to publish."
else
  git commit -m "feat: deploy billing app to github pages"
fi

echo
echo "Pushing to GitHub..."
git push origin main

echo
echo "Done."
echo "Open GitHub Pages after the workflow finishes:"
echo "  https://ampkantana.github.io/bill-app/"
echo
echo "If this is the first time, set GitHub Pages Source to GitHub Actions:"
echo "  https://github.com/ampkantana/bill-app/settings/pages"
echo
read "REPLY?Press Enter to close..."
