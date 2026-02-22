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

# VersionCode Play Store : major*10000 + minor*100 + patch (+ run_number en CI pour unicité)
# Ex: 0.2.5 -> 205 ; 0.2.5 + run 42 -> 205042 (évite "version code already used" sur ré-upload)
VERSION_CODE=$(VERSION="$VERSION" RUN_NUMBER="${GITHUB_RUN_NUMBER:-0}" node -e "
  const v = process.env.VERSION.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!v) process.exit(1);
  const base = parseInt(v[1])*10000 + parseInt(v[2])*100 + parseInt(v[3]);
  const run = parseInt(process.env.RUN_NUMBER) || 0;
  const code = run > 0 ? base * 1000 + (run % 1000) : base;
  console.log(code);
")
echo "VersionCode: $VERSION_CODE"

echo "Mise à jour du projet Android..."
npx @bubblewrap/cli update --appVersionName="$VERSION" --manifest="$ANDROID_DIR/twa-manifest.json"

# Appliquer le versionCode calculé
MANIFEST="$ANDROID_DIR/twa-manifest.json"
node -e "
  const fs = require('fs');
  const m = JSON.parse(fs.readFileSync('$MANIFEST', 'utf8'));
  m.appVersionCode = $VERSION_CODE;
  fs.writeFileSync('$MANIFEST', JSON.stringify(m, null, 2));
"

echo "Build du bundle..."
npx @bubblewrap/cli build --manifest="$ANDROID_DIR/twa-manifest.json"

mkdir -p "$(dirname "$AAB_OUTPUT")"
# Bubblewrap génère l'AAB dans le cwd (racine du projet), pas dans android-twa
for BUNDLE_SRC in "$ROOT_DIR/app-release-bundle.aab" "$ANDROID_DIR/app-release-bundle.aab"; do
  if [ -f "$BUNDLE_SRC" ]; then
    cp "$BUNDLE_SRC" "$AAB_OUTPUT"
    echo "AAB généré: $AAB_OUTPUT"
    # Nettoyer les artefacts temporaires (voir .gitignore)
    rm -f "$ROOT_DIR/app-release-bundle.aab" "$ROOT_DIR/app-release-signed.apk" \
          "$ROOT_DIR/app-release-unsigned-aligned.apk" "$ROOT_DIR"/*.apk.idsig 2>/dev/null || true
    exit 0
  fi
done
echo "Erreur: app-release-bundle.aab introuvable après le build"
exit 1
