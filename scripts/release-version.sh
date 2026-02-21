#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: $0 --patch | --minor | --major"
  echo "  --patch  0.1.0 → 0.1.1"
  echo "  --minor  0.1.1 → 0.2.0"
  echo "  --major  0.2.0 → 1.0.0"
  exit 1
}

BUMP=""
for arg in "$@"; do
  case "$arg" in
    --patch) BUMP="patch" ;;
    --minor) BUMP="minor" ;;
    --major) BUMP="major" ;;
    *) usage ;;
  esac
done

if [ -z "$BUMP" ]; then
  usage
fi

# 1. Vérifier working tree propre
if [ -n "$(git status --porcelain)" ]; then
  echo "Erreur: working tree non propre. Committez ou stash vos changements."
  exit 1
fi

# 2. Vérifier gh
if ! command -v gh &>/dev/null; then
  echo "Erreur: GitHub CLI (gh) non installé. Voir https://cli.github.com/"
  exit 1
fi
if ! gh auth status &>/dev/null; then
  echo "Erreur: gh non authentifié. Exécutez: gh auth login"
  exit 1
fi

# 3. Tests et build
echo "Lancement des tests..."
npm run test
echo "Build..."
npm run build

# 4. Capturer changelog (avant bump)
PREV=$(git describe --tags --abbrev=0 2>/dev/null || true)
if [ -n "$PREV" ]; then
  CHANGELOG=$(git log "$PREV..HEAD" --pretty=format:"- %s (%h)")
else
  CHANGELOG=$(git log --pretty=format:"- %s (%h)")
fi

# Fallback si vide
if [ -z "$CHANGELOG" ]; then
  CHANGELOG="- Aucun commit depuis le dernier tag"
fi

# 5. Incrémenter version (crée commit + tag)
echo "Bump version ($BUMP)..."
NEW_TAG=$(npm version "$BUMP")
# NEW_TAG = "v0.1.1"

# 6. Pousser (tag doit exister sur GitHub avant gh release create)
echo "Push vers origin..."
git push origin main --tags

# 7. Créer release GitHub avec changelog
NOTES_FILE=$(mktemp)
trap "rm -f $NOTES_FILE" EXIT
echo "## Changements" > "$NOTES_FILE"
echo "" >> "$NOTES_FILE"
echo "$CHANGELOG" >> "$NOTES_FILE"

echo "Création de la release $NEW_TAG..."
gh release create "$NEW_TAG" --notes-file "$NOTES_FILE"

echo "Release $NEW_TAG créée et poussée."
