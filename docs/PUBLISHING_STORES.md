# Publication sur les stores

## Objet

Ce guide décrit comment publier Chrono EPS (PWA) sur l'Apple App Store et le Google Play Store, en s'appuyant sur PWABuilder. Référence : [ARCH.md](ARCH.md), [ADR 0004](ADR/0004-stack-vite-vue-primevue.md).

## 1. Prérequis communs

- PWA déployée sur URL HTTPS publique : `https://plamarque.github.io/chrono-eps/`
- Manifeste complet (nom, icônes 192/512, description, `start_url`, etc.) — configuré dans [vite.config.js](../vite.config.js)
- Service worker valide
- Scores Lighthouse PWA acceptables

**Comptes développeur requis :**

| Store | Compte | Frais |
|-------|--------|-------|
| **Google Play** | [Google Play Console](https://play.google.com/console) | Frais unique (~25 USD) |
| **Apple** | [Apple Developer Program](https://developer.apple.com/programs/) | Abonnement annuel (99 USD) |

## 2. Validation avant packaging

Avant de générer les paquets :

1. Exécuter l'audit Lighthouse (onglet PWA) sur l'URL de production
2. Corriger les éventuels avertissements (cf. [ISSUES.md](ISSUES.md) : icône 512 non precachée — acceptable pour le MVP)
3. S'assurer que l'app fonctionne en mode standalone et offline

## 3. Packaging avec PWABuilder

Workflow PWABuilder :

1. Aller sur [PWABuilder](https://pwabuilder.com)
2. Saisir l'URL : `https://plamarque.github.io/chrono-eps/`
3. Cliquer sur *Next* pour afficher le rapport (scores, action items)
4. Cliquer sur *Package for Stores*
5. Pour chaque plateforme (Android, iOS), cliquer *Generate Package*
6. Fournir les métadonnées (nom, URL, icônes, etc.) — préremplies depuis le manifeste
7. Télécharger le paquet généré

## 4. Publication sur Google Play Store (Android — TWA)

PWABuilder génère un projet Android (Trusted Web Activity via Bubblewrap) ou un AAB prêt à uploader.

### 4.0 Génération du bundle Android (automatisée)

Le bundle AAB peut être généré en ligne de commande via [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

**Configuration one-time** (à exécuter une seule fois) :

```bash
npx @bubblewrap/cli init \
  --manifest="https://plamarque.github.io/chrono-eps/manifest.webmanifest" \
  --directory="android-twa"
```

Répondre aux questions (package name, domain, etc.). Une clé de signature est générée dans `android-twa/`. **Sauvegarder le keystore et ses mots de passe.** Le keystore est ignoré par git (`.gitignore`).

**Génération du AAB :**

Créer un fichier `.env` à la racine du projet (non commité) avec les mots de passe :

```bash
cp .env.example .env
# Éditer .env et renseigner BUBBLEWRAP_KEYSTORE_PASSWORD et BUBBLEWRAP_KEY_PASSWORD
```

Puis lancer :

```bash
npm run android:bundle
```

Le script charge automatiquement `.env`. Le AAB est produit dans `dist/chrono-eps-android.aab`.

**Intégration à la release :** exécuter `./scripts/release-version.sh --patch` déclenche le workflow CI qui génère l'AAB et le distribue sur Play Store (piste internal).

### 4.1 Digital Asset Links (apparence standalone)

Sans ce fichier, l'app Android ouvre le site dans Custom Tabs avec la **barre du navigateur visible**. Les Digital Asset Links permettent le mode **standalone** (plein écran, sans barre d'adresse).

Le fichier doit être accessible à : `https://plamarque.github.io/.well-known/assetlinks.json`

**Étapes :**

1. **Récupérer le fingerprint SHA-256** dans Play Console :
   - *Paramètres* → *Intégrité de l'application* (ou *App signing*)
   - Copier le **SHA-256 du certificat de signature de l'application** (clé gérée par Google, pas la clé de téléversement)

2. **Remplacer dans** `public/.well-known/assetlinks.json` :
   ```json
   "sha256_cert_fingerprints": ["XX:XX:XX:XX:..."]
   ```

3. **Héberger à la racine du domaine** — le site chrono-eps est en `plamarque.github.io/chrono-eps/`, donc `/.well-known/` doit être servi par `plamarque.github.io` :
   - Créer un dépôt **plamarque/plamarque.github.io** (s'il n'existe pas)
   - Y ajouter le dossier `.well-known/` avec `assetlinks.json`
   - Le fichier sera servi à `https://plamarque.github.io/.well-known/assetlinks.json`

4. **Vérifier** : https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://plamarque.github.io&relation=delegate_permission/common.handle_all_urls

### 4.2 Clé de signature

Générer une clé de signature pour l'AAB si PWABuilder ne le fait pas automatiquement. Conserver la clé en lieu sûr pour les mises à jour futures.

### 4.3 Google Play Console

1. Créer une application dans [Google Play Console](https://play.google.com/console)
2. Remplir la fiche store : description, captures d'écran, politique de confidentialité, catégorie
3. Uploader l'AAB dans *Production* ou *Testing*
4. Soumettre pour révision

### 4.4 Ressources Android

- [PWABuilder Android docs](https://docs.pwabuilder.com/#/builder/android)
- [Trusted Web Activity Quick Start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start)
- [Digital Asset Links](https://developers.google.com/digital-asset-links/v1/getting-started)

## 5. Publication sur Apple App Store (iOS)

PWABuilder génère un projet Xcode (Swift + WebKit) à compiler.

### 5.1 Prérequis

- Mac avec Xcode installé
- Compte Apple Developer actif
- Runtime iOS installé (Xcode → Settings → Platforms → iOS)
- Projet iOS dans `ios/` (généré via PWABuilder)

### 5.2 Ouvrir le projet

```bash
open ios/Chrono\ EPS.xcworkspace
```

**Important** : ouvrir le `.xcworkspace`, pas le `.xcodeproj` (le projet utilise CocoaPods).

### 5.3 Générer les screenshots

**Génération automatisée (recommandée) :** `npm run screenshots` produit tous les écrans (iOS + Android) dans les résolutions requises. Voir [public/screenshots/README.md](../public/screenshots/README.md).

**Génération manuelle** (simulateur Xcode) :

#### 5.3.1 Screenshots iPhone

1. Dans la barre d'outils Xcode, cliquer sur le sélecteur de destination (ex. « My Mac (Mac Catalyst) »).
2. Choisir **iPhone 17 Pro Max** (ou un simulateur iPhone équivalent).
3. Lancer l'app : **Cmd+R**.
4. Attendre le chargement de la PWA dans le simulateur.
5. Naviguer dans l'app pour afficher les écrans à capturer : Chrono / mode individuel, Mode relais, Historique, Replay, etc.
6. **Capture** : **Cmd+S** dans le simulateur (ou clic droit → Save Screen).
7. Les PNG sont sauvegardés sur le **Bureau** par défaut.
8. Déplacer les captures dans `public/screenshots/ios/iphone/` avec des noms explicites (ex. `chrono-eps-iphone-historique.png`).

**Tailles App Store** : iPhone 6.5" = 1284×2778 px (portrait). Le simulateur iPhone 17 Pro Max produit des dimensions conformes.

#### 5.3.2 Screenshots iPad

1. Arrêter le simulateur : **Cmd+.**.
2. Choisir **iPad Pro 13-inch (M5)** ou **iPad Air 13-inch (M3)**.
3. Lancer : **Cmd+R**.
4. Mettre le simulateur en **paysage** (Cmd+flèche ou Device → Rotate).
5. Capturer les mêmes écrans avec **Cmd+S**.
6. Déplacer vers `public/screenshots/ios/ipad/`.

**Tailles App Store** : iPad 13" = 2732×2048 px (paysage uniquement pour Chrono EPS).

### 5.4 Créer l'archive (build)

1. Sélectionner **Any iOS Device (arm64)** comme destination (section « Build » du menu).
2. Menu **Product → Archive**.
3. Si une fenêtre demande un mot de passe : saisir le **mot de passe de session macOS** (pour accéder au Keychain / certificat de développement). Optionnel : cocher « Toujours autoriser ».
4. Si erreur de signature :
   - Cliquer sur le projet **Chrono EPS** dans la sidebar
   - Target **Chrono EPS** → onglet **Signing & Capabilities**
   - Cocher **Automatically manage signing**
   - Sélectionner votre **Team** (compte Apple Developer)
5. Attendre la fin de la compilation.
6. L'**Organizer** s'ouvre automatiquement.

### 5.5 Uploader vers App Store Connect

1. Dans **Organizer** (Window → Organizer si fermé), sélectionner l'archive créée.
2. Cliquer **Distribute App**.
3. Choisir **App Store Connect** → Next.
4. Choisir **Upload** → Next.
5. Accepter les options par défaut → Next.
6. Sélectionner le profil de distribution → Next.
7. Cliquer **Upload**.
8. Attendre la fin (quelques minutes).
9. Le build apparaît dans App Store Connect après traitement (15–30 min ou plus).

### 5.6 Compléter App Store Connect

1. Aller sur [App Store Connect](https://appstoreconnect.apple.com/).
2. Sélectionner l'app **Chronomètre EPS** → Version iOS 1.0 (ou la version en cours).
3. Remplir le formulaire avec le contenu de l'[Annexe A — Contenu App Store Connect](#annexe-a-contenu-app-store-connect).
4. Téléverser les screenshots depuis `public/screenshots/ios/` :
   - iPhone : onglet Phone → 6.5" Display
   - iPad : onglet iPad → 13" Display
5. Sélectionner le build uploadé dans la section « Build ».
6. Renseigner les informations de contact pour App Review.
7. Soumettre pour révision.

**Structure des screenshots :**

```
public/screenshots/
├── ios/                    # App Store (iPhone + iPad)
│   ├── iphone/
│   └── ipad/
└── android/                # Play Store
    ├── smartphone/
    └── tablet/
```

Les screenshots iOS sont conservés dans `public/screenshots/ios/` pour pouvoir les réutiliser lors des mises à jour sur l'App Store.

### 5.7 Notes importantes

Apple peut refuser les apps qui ressemblent à de simples « sites web dans une frame ». Chrono EPS fournit une vraie valeur (chronomètre terrain, stockage local, historique) — conforme aux recommandations PWABuilder.

### 5.8 Ressources iOS

- [PWABuilder iOS docs](https://docs.pwabuilder.com/#/builder/app-store)
- [Blog post : Publish your PWA to the iOS App Store](https://blog.pwabuilder.com/posts/publish-your-pwa-to-the-ios-app-store)
- [App Store Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)

## 6. Pièces à préparer pour les deux stores

| Élément | Description |
|---------|-------------|
| Captures d'écran | Plusieurs tailles (téléphone, tablette) — cf. [Annexe B](#annexe-b--spécifications-des-screenshots-référence) |
| Icône 512×512 | Déjà présente dans le projet (`public/pwa-512x512.png`) |
| Image de présentation (1024×500) | Générer via `public/store-feature-graphic.html` : ouvrir dans un navigateur, cliquer « Télécharger l'image PNG » |
| Description courte | Ex. : « Chronomètre multi-coureurs pour les enseignants d'EPS » |
| Description longue | Détail des fonctionnalités (chrono, passages, historique, hors ligne) |
| Politique de confidentialité | URL : `https://plamarque.github.io/chrono-eps/privacy.html` — Chrono EPS stocke les données localement ; l'absence de collecte serveur y est détaillée |
| Catégorie | Ex. : Éducation, Productivité |

## 7. Limitations et points d'attention (Chrono EPS)

| Point | Détail |
|-------|--------|
| **GitHub Pages + Digital Asset Links** | La contrainte `/.well-known/assetlinks.json` peut nécessiter un domaine personnalisé ou une configuration spécifique. Documenter la solution retenue. |
| **base path** | `base: '/chrono-eps/'` — vérifier que `start_url` et les chemins sont corrects dans le manifeste pour le packaging. |
| **Icône 512** | Non precachée (cf. [ISSUES.md](ISSUES.md)) ; acceptable pour le packaging stores. |
| **Precache index.html** | `index.html` est exclu du precache Workbox pour que les apps TWA/iOS affichent la bonne version après mise à jour store sans refresh manuel. |

## 9. Pipeline CI/CD

Le workflow `.github/workflows/release-stores.yml` s'exécute à chaque push de tag `v*` et automatise la release complète.

### 9.1 Secrets GitHub requis

| Secret | Description |
|--------|-------------|
| `PLAY_STORE_SERVICE_ACCOUNT` | JSON du Service Account (Google Cloud) ayant accès à l'API Play Console |
| `ANDROID_KEYSTORE_BASE64` | Keystore encodé en base64 (`base64 -i android-twa/android.keystore`) |
| `BUBBLEWRAP_KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `BUBBLEWRAP_KEY_PASSWORD` | Mot de passe de la clé |
| `APPSTORE_ISSUER_ID` | Issuer ID (App Store Connect → Intégrations) |
| `APPSTORE_KEY_ID` | Key ID de la clé API |
| `APPSTORE_API_PRIVATE_KEY` | Contenu du fichier .p8 (clé API) |
| `MATCH_PASSWORD` | Mot de passe pour décrypter les certificats Match |
| `MATCH_GIT_URL` | URL HTTPS du dépôt privé contenant les certificats (ex. `https://github.com/user/certificates`) |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Base64 de `username:token` ou `x-access-token:TOKEN` pour cloner le dépôt Match |

### 9.2 Configuration Fastlane Match (iOS)

Avant la première exécution du job iOS :

1. Créer un dépôt Git privé (ex. `chrono-eps-certificates`)
2. Dans `ios/` : `bundle install` puis `bundle exec fastlane match appstore`
3. Suivre les invites (git_url, mot de passe) pour stocker certificat et provisioning profile
4. Ajouter les secrets `MATCH_*` dans GitHub

### 9.3 Flux complet

```
Release : ./scripts/release-version.sh --patch
    → push main + tag v*
    → workflow : create-release → build-android | build-ios (parallèle)
    → Release GitHub + Play Store internal + TestFlight + binaires attachés

Promote : ./scripts/promote-to-stores.sh v0.1.2
    → workflow promote-stores.yml (déclenché manuellement)
    → Play Store production + soumission App Store pour review
```

**Jobs du workflow release-stores.yml :**
- `create-release` : crée la release GitHub avec changelog (commits entre tags)
- `build-android` : build AAB via Bubblewrap, upload Play Store (internal), `releaseName` + changelog
- `build-ios` : build IPA via Fastlane, upload TestFlight, attache à la release

### 9.4 Promotion vers la production

Une fois une version validée par les testeurs (internal + TestFlight), elle peut être promue vers la production des stores.

**Distinction release / promote :**

| Action | Cible | Commande |
|--------|-------|----------|
| **Release** | Testeurs (internal, TestFlight) | `./scripts/release-version.sh --patch` |
| **Promote** | Production (stores publics) | `./scripts/promote-to-stores.sh v0.1.2` ou `latest` |

**Prérequis :** La version doit déjà avoir été release (présente sur internal + TestFlight avec binaires attachés à la release GitHub).

**Comportement :**
- **Android** : télécharge l'AAB depuis la release, l'uploade vers la piste `production` du Play Store
- **iOS** : soumet le build TestFlight correspondant pour review App Store (via Fastlane `deliver`)

**Rappel :** Une revue Apple et Google est obligatoire à chaque mise à jour en production ; les délais sont variables (souvent 24–48 h).

### 9.5 Détails d'implémentation du pipeline

Points techniques importants pour la maintenance du pipeline :

**Android (Bubblewrap) :**
- **Prompts interactifs** : Bubblewrap pose des questions (JDK, SDK, licences). En CI, `yes y` est pipé pour répondre automatiquement. Ne pas limiter avec `head` — trop de prompts, le pipe se ferme et le build échoue (exit 130).
- **Version écrasée par "y"** : La commande `update` lit stdin ; si elle reçoit "y", elle peut écraser la version. Le script utilise `update ... < /dev/null` pour isoler cette commande.
- **versionCode unique** : Le Play Store exige un versionCode strictement croissant. En CI, `GITHUB_RUN_NUMBER` est intégré (ex. 0.2.7 + run 42 → 207042) pour permettre les ré-uploads.
- **releaseName et changelog** : L'action `upload-google-play` reçoit `releaseName` (tag) et `whatsNewDirectory` (changelog depuis les commits entre tags) pour un affichage correct dans Play Console.

**iOS (Fastlane) :**
- **Authentification** : `upload_to_testflight` et `deliver` utilisent le paramètre `api_key` (pas `app_store_connect_api_key`).
- **CFBundleShortVersionString** : La version marketing est synchronisée avec le tag de release (ex. v0.3.1 → 0.3.1). Chaque nouvel upload doit avoir une version supérieure à la dernière approuvée sur l'App Store.
- **Build number unique** : TestFlight exige un CFBundleVersion strictement croissant. En CI, `GITHUB_RUN_NUMBER` est utilisé comme build number.
- **Runner** : `macos-15` (Xcode 16) pour compatibilité Firebase/CocoaPods.
- **SDK iOS** : À partir d'avril 2026, Apple exigera un SDK plus récent — voir [ISSUES.md](ISSUES.md).

**PWA :**
- **Cache index.html** : `index.html` est exclu du precache Workbox (vite.config.js). Sans cela, après une mise à jour Play Store, l'app afficherait l'ancienne version jusqu'à un refresh manuel.

**Play Console :**
- Le compte de service (Google Cloud) doit être ajouté dans Play Console avec les droits nécessaires à l'API. Sinon : « The caller does not have permission ».
- **Release notes** : Les notes de mise à jour sont limitées à 500 caractères par langue. Le workflow tronque automatiquement le changelog (commits entre tags) à cette limite.

**TestFlight :**
- Les testeurs reçoivent une notification (email/push) quand un build est disponible. La mise à jour se fait manuellement dans l'app TestFlight (pas d'auto-update).

## 10. Dépannage

### Erreur iOS : « CFBundleShortVersionString must contain a higher version than previously approved »

La version actuelle sur l'App Store est déjà approuvée. La prochaine version doit être strictement supérieure (ex. si la dernière est « 1 », utiliser « 1.0.1 » ou « 1.1 »).

**Solution :** Incrémenter la version dans `package.json` pour que le prochain tag soit > 1, puis lancer la release :

```bash
# Exemple : passer à 1.0.1 pour dépasser la version "1" déjà approuvée
npm version 1.0.1 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: version 1.0.1"
git tag v1.0.1
git push origin main --tags
```

Ou utiliser `release-version.sh --major` si vous êtes en 0.x (0.3.0 → 1.0.0). Si Apple considère 1.0.0 égal à 1, utilisez la méthode manuelle ci-dessus avec 1.0.1.

### Erreur Android : « release notes too long (max: 500) »

Les notes de mise à jour sont limitées à 500 caractères. Le workflow tronque désormais automatiquement le changelog. Si l'erreur persiste, vérifier que le workflow utilise la dernière version du fichier `release-stores.yml`.

## 11. Liens et références

- [PWABuilder](https://pwabuilder.com/)
- [PWABuilder docs — Android](https://docs.pwabuilder.com/#/builder/android)
- [PWABuilder docs — App Store](https://docs.pwabuilder.com/#/builder/app-store)
- [web.dev — PWAs in app stores](https://web.dev/articles/pwas-in-app-stores)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)

---

## Annexe B — Spécifications des screenshots (référence)

Source : Play Console (Fiche de l'application principale → Graphics) et [App Store Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).

### Google Play Store (Android)

Format : PNG ou JPEG, max 8 Mo par image. Ratio 16:9 ou 9:16.

| Cible | Côté min | Côté max |
|-------|----------|----------|
| **Téléphones** | 320 px | 3840 px |
| **Tablettes 7"** | 320 px | 3840 px |
| **Tablettes 10"** | 1080 px | 7680 px |

**Où modifier :** Play Console → Développer l'audience → Présence en magasin → Fiche de l'application principale → section Graphics (Phone screenshots, Tablet 7-inch screenshots, Tablet 10-inch screenshots).

### Apple App Store (iOS)

| Cible | Dimensions | Orientation |
|-------|------------|-------------|
| **iPhone 6.5"** | 1284 × 2778 px | Portrait |
| **iPad 13"** | 2732 × 2048 px | Paysage (Chrono EPS) |

---
- [PWABuilder docs — Android](https://docs.pwabuilder.com/#/builder/android)
- [PWABuilder docs — App Store](https://docs.pwabuilder.com/#/builder/app-store)
- [web.dev — PWAs in app stores](https://web.dev/articles/pwas-in-app-stores)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)

---

## Annexe A — Contenu App Store Connect

Tout le texte à copier-coller dans le formulaire App Store Connect (iOS App Version 1.0).

### Promotional Text (max 170 caractères)

Chronomètre multi-coureurs pour l'EPS : passages de tours par tap, mode relais, historique et replay. Optimisé tablette, hors ligne.

### Description

Chronomètre EPS est une application conçue pour les enseignants d'éducation physique. Chronométrez facilement les courses d'une classe entière, enregistrez les passages de tours, identifiez les coureurs et conservez les performances sans feuille papier.

Fonctionnalités :
• Chronomètre multi-coureurs avec arrêt individuel par coureur
• Enregistrement des passages de tours par simple tap
• Mode relais : groupes de coureurs, affichage Couru / Prochain
• Identification et nommage des participants
• Historique des courses sauvegardées
• Replay visuel des courses sur piste virtuelle
• Interface tactile optimisée pour tablette et smartphone
• Données stockées localement (fonctionne hors ligne)

### Keywords (max 100 caractères, virgules, sans espaces)

EPS,chronomètre,course,piste,relais,coureur,enseignant,éducation physique

### URLs

| Champ | Valeur |
|-------|--------|
| **Support URL** | https://github.com/plamarque/chrono-eps/issues |
| **Marketing URL** (optionnel) | https://github.com/plamarque/chrono-eps |
| **Politique de confidentialité** | https://plamarque.github.io/chrono-eps/privacy.html |

### Copyright

© 2026 Patrice Lamarque

(Adapter le nom si nécessaire.)

### App Review Information

**Sign-in required** : Ne pas cocher — Chrono EPS n'exige pas d'authentification.

**Notes (pour faciliter la revue)** : L'app est une PWA (Progressive Web App) wrappée pour iOS. Elle permet aux enseignants d'EPS de chronométrer des courses, enregistrer les passages de tours et conserver les performances. Les données sont stockées localement sur l'appareil. Aucun compte utilisateur n'est requis. L'app fonctionne hors ligne.

**Contact Information** : À remplir manuellement : First Name, Last Name, Phone Number, Email.

### What's New in This Version (si le champ est visible)

Pour une première version 1.0, optionnel :

Première version : chronomètre multi-coureurs, passages de tours par tap, mode relais, historique et replay. Interface optimisée iPad et iPhone.

### Checklist

- [ ] Promotional Text
- [ ] Description
- [ ] Keywords
- [ ] Support URL
- [ ] Marketing URL (optionnel)
- [ ] Copyright
- [ ] Screenshots iPhone (1284×2778)
- [ ] Screenshots iPad (2732×2048 paysage)
- [ ] Build uploadé
- [ ] App Review contact + Notes
- [ ] Politique de confidentialité (section App Privacy ou équivalent)
