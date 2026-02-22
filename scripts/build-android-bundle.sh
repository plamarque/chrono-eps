#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

# Charger .env si présent (mots de passe Bubblewrap)
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

ANDROID_DIR="${ROOT_DIR}/android-twa"
AAB_OUTPUT="${ROOT_DIR}/dist/chrono-eps-android.aab"

if [ ! -d "$ANDROID_DIR" ]; then
  echo "Erreur: le projet Android TWA n'existe pas. Exécutez d'abord la configuration one-time:"
  echo "  npx @bubblewrap/cli init --manifest=https://plamarque.github.io/chrono-eps/manifest.webmanifest --directory=android-twa"
  exit 1
fi

if [ ! -f "$ANDROID_DIR/twa-manifest.json" ]; then
  echo "Erreur: twa-manifest.json introuvable dans $ANDROID_DIR"
  exit 1
fi

if [ -z "$BUBBLEWRAP_KEYSTORE_PASSWORD" ] || [ -z "$BUBBLEWRAP_KEY_PASSWORD" ]; then
  echo "Erreur: définissez BUBBLEWRAP_KEYSTORE_PASSWORD et BUBBLEWRAP_KEY_PASSWORD"
  exit 1
fi

VERSION=$(node -p "require('./package.json').version")
echo "Version: $VERSION"

echo "Mise à jour du projet Android..."
npx @bubblewrap/cli update --appVersionName="$VERSION" --manifest="$ANDROID_DIR/twa-manifest.json"

echo "Build du bundle..."
npx @bubblewrap/cli build --manifest="$ANDROID_DIR/twa-manifest.json"

mkdir -p "$(dirname "$AAB_OUTPUT")"
BUNDLE_SRC="$ANDROID_DIR/app-release-bundle.aab"
if [ -f "$BUNDLE_SRC" ]; then
  cp "$BUNDLE_SRC" "$AAB_OUTPUT"
  echo "AAB généré: $AAB_OUTPUT"
else
  echo "Erreur: app-release-bundle.aab introuvable après le build"
  exit 1
fi
