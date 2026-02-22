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

**Intégration à la release :**

```bash
./scripts/release-version.sh --patch
```

Le AAB est automatiquement généré et attaché à la release GitHub.

### 4.1 Digital Asset Links

PWABuilder indique le `package name` et le fingerprint SHA-256. Il faut créer le fichier `/.well-known/assetlinks.json` sur le domaine (`plamarque.github.io`) pour lier l'app Android au site.

**Point d'attention :** GitHub Pages ne permet pas facilement de servir `/.well-known/` à la racine pour les sites de projet (`*.github.io/repo/`). Options :

- Utiliser un domaine personnalisé pointant vers GitHub Pages (ex. `chrono-eps.example.com`) et héberger `assetlinks.json` à la racine
- Ou vérifier si les GitHub Pages project sites offrent un moyen de servir ce fichier (à documenter selon la solution retenue)

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

### 5.1 Matériel et logiciel

- Mac avec Xcode installé
- Compte Apple Developer

### 5.2 Étapes de build et soumission

1. **Ouvrir le projet** : décompresser le paquet iOS, ouvrir le workspace `.xcworkspace` dans Xcode
2. **Configurer dans Apple Developer** : créer un App ID (Bundle ID) dans [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources) ; configurer les capabilities si nécessaire (push, in-app purchase, etc.)
3. **Build et signature** : signer l'app avec un certificat de distribution ; archiver (Product → Archive) ; uploader vers App Store Connect via Organizer
4. **App Store Connect** : créer une fiche app (nom, description, captures d'écran, politique de confidentialité) ; sélectionner le build uploadé ; soumettre pour révision

### 5.3 Notes importantes

Apple peut refuser les apps qui ressemblent à de simples « sites web dans une frame ». Chrono EPS fournit une vraie valeur (chronomètre terrain, stockage local, historique) — conforme aux recommandations PWABuilder.

### 5.4 Ressources iOS

- [PWABuilder iOS docs](https://docs.pwabuilder.com/#/builder/app-store)
- [Blog post : Publish your PWA to the iOS App Store](https://blog.pwabuilder.com/posts/publish-your-pwa-to-the-ios-app-store)

## 6. Pièces à préparer pour les deux stores

| Élément | Description |
|---------|-------------|
| Captures d'écran | Plusieurs tailles (téléphone, tablette) — cf. specs de chaque store |
| Icône 512×512 | Déjà présente dans le projet (`public/pwa-512x512.png`) |
| Image de présentation (1024×500) | Générer via `public/store-feature-graphic.html` : ouvrir dans un navigateur, cliquer « Télécharger l'image PNG » |
| Description courte | Ex. : « Chronomètre multi-élèves pour les enseignants d'EPS » |
| Description longue | Détail des fonctionnalités (chrono, passages, historique, hors ligne) |
| Politique de confidentialité | URL : `https://plamarque.github.io/chrono-eps/privacy.html` — Chrono EPS stocke les données localement ; l'absence de collecte serveur y est détaillée |
| Catégorie | Ex. : Éducation, Productivité |

## 7. Limitations et points d'attention (Chrono EPS)

| Point | Détail |
|-------|--------|
| **GitHub Pages + Digital Asset Links** | La contrainte `/.well-known/assetlinks.json` peut nécessiter un domaine personnalisé ou une configuration spécifique. Documenter la solution retenue. |
| **base path** | `base: '/chrono-eps/'` — vérifier que `start_url` et les chemins sont corrects dans le manifeste pour le packaging. |
| **Icône 512** | Non precachée (cf. [ISSUES.md](ISSUES.md)) ; acceptable pour le packaging stores. |

## 8. Liens et références

- [PWABuilder](https://pwabuilder.com/)
- [PWABuilder docs — Android](https://docs.pwabuilder.com/#/builder/android)
- [PWABuilder docs — App Store](https://docs.pwabuilder.com/#/builder/app-store)
- [web.dev — PWAs in app stores](https://web.dev/articles/pwas-in-app-stores)
- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com/)
