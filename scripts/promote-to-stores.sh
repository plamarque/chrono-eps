#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  echo "Usage: $0 <tag|latest>"
  echo "  tag     Version à promouvoir (ex. v0.1.2)"
  echo "  latest  Dernière release"
  echo ""
  echo "Le workflow promote-stores.yml (déclenché manuellement) uploade l'AAB vers"
  echo "Play Store production et soumet le build TestFlight pour review App Store."
  exit 1
}

if [ $# -ne 1 ]; then
  usage
fi

ARG="$1"

# 1. Vérifier gh
if ! command -v gh &>/dev/null; then
  echo "Erreur: GitHub CLI (gh) non installé. Voir https://cli.github.com/"
  exit 1
fi
if ! gh auth status &>/dev/null; then
  echo "Erreur: gh non authentifié. Exécutez: gh auth login"
  exit 1
fi

# 2. Résoudre le tag
if [ "$ARG" = "latest" ]; then
  TAG=$(gh release list --limit 1 --json tagName -q '.[0].tagName')
  if [ -z "$TAG" ]; then
    echo "Erreur: Aucune release trouvée."
    exit 1
  fi
  echo "Dernière release: $TAG"
else
  TAG="$ARG"
fi

# 3. Vérifier que la release existe et contient les assets
if ! gh release view "$TAG" &>/dev/null; then
  echo "Erreur: Release $TAG introuvable."
  exit 1
fi

ASSETS=$(gh release view "$TAG" --json assets -q '.assets[].name' 2>/dev/null || true)
if ! echo "$ASSETS" | grep -q 'chrono-eps-android.aab'; then
  echo "Erreur: Release $TAG ne contient pas chrono-eps-android.aab"
  exit 1
fi
if ! echo "$ASSETS" | grep -q 'ChronoEPS.ipa'; then
  echo "Erreur: Release $TAG ne contient pas ChronoEPS.ipa"
  exit 1
fi

# 4. Lancer le workflow
echo "Lancement de la promotion de $TAG vers les stores..."
gh workflow run promote-stores.yml -f tag="$TAG"

echo ""
echo "Workflow promote-stores.yml déclenché. Suivre l'exécution :"
echo "  gh run list --workflow=promote-stores.yml"
echo "  gh run watch  # (après avoir identifié le run_id)"
