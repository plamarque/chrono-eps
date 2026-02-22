#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: $0 --patch | --minor | --major"
  echo "  --patch   0.1.0 → 0.1.1"
  echo "  --minor   0.1.1 → 0.2.0"
  echo "  --major   0.2.0 → 1.0.0"
  echo ""
  echo "Le workflow release-stores.yml (déclenché par le tag) crée la release,"
  echo "build iOS/Android, distribue sur TestFlight et Play Store, et attache les binaires."
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

# 4. Incrémenter version (crée commit + tag)
echo "Bump version ($BUMP)..."
NEW_TAG=$(npm version "$BUMP")
# NEW_TAG = "v0.1.1"

# 5. Pousser (déclenche le workflow release-stores.yml)
echo "Push vers origin..."
git push origin main --tags

echo ""
echo "Release $NEW_TAG poussée. Le workflow GitHub Actions va :"
echo "  - Créer la release avec le changelog"
echo "  - Builder et distribuer sur Play Store (internal) et TestFlight"
echo "  - Attacher les binaires AAB et IPA à la release"
