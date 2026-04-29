# Développement

## Prérequis

- Node.js 24+
- npm
- [GitHub CLI (gh)](https://cli.github.com/) pour les releases (authentification requise)

## Commandes

| Commande       | Description                                              |
|----------------|----------------------------------------------------------|
| `npm install`  | Installer les dépendances                                |
| `npm run dev`  | Lancer le serveur de développement                       |
| `npm run build`| Build de production (sortie dans `dist/`)               |
| `npm run preview` | Prévisualiser le build (localement)                   |
| `npm run test` | Lancer les tests unitaires (Vitest)                       |
| `npm run test:watch` | Lancer les tests en mode watch                      |
| `npm run test:e2e` | Lancer les tests E2E (Playwright) — build, preview, puis tests |
| `npm run test:e2e:ui` | Lancer les tests E2E en mode UI interactif               |
| `npm run release -- --patch` | Créer une release (voir section Release)   |
| `./scripts/promote-to-stores.sh <tag>` | Promouvoir une version vers les stores (tag ou latest) |
| `npm run screenshots` | Générer les screenshots pour les stores (voir public/screenshots/README.md) |
| `npm run icons` | Régénérer les icônes PWA et iOS (dégradé, alignement Android) |

## Release

Pour créer une release avec version sémantique et publication sur les stores :

```bash
./scripts/release-version.sh --patch   # 0.1.0 → 0.1.1
./scripts/release-version.sh --minor   # 0.1.1 → 0.2.0
./scripts/release-version.sh --major   # 0.2.0 → 1.0.0
```

Ou via npm : `npm run release -- --patch` (idem pour --minor, --major).

**Étapes du script (local) :** vérification du working tree et de `gh`, tests, build PWA, bump de version, push (main + tags).

**Déclenchement du workflow** : le push de tag lance `.github/workflows/release-stores.yml` qui :
- crée la release GitHub avec changelog ;
- build Android (AAB) et iOS (IPA), les distribue sur Play Store (internal) et TestFlight ;
- attache les binaires à la release.

**Prérequis :** GitHub CLI installé et authentifié (`gh auth login`). Secrets GitHub configurés (voir [PUBLISHING_STORES.md](PUBLISHING_STORES.md#9-pipeline-cicd)). Détails d'implémentation et dépannage : [PUBLISHING_STORES.md](PUBLISHING_STORES.md) § 9.5.

### Promotion vers la production

Pour promouvoir une version déjà testée vers la production des stores :

```bash
./scripts/promote-to-stores.sh v0.1.2   # version spécifique
./scripts/promote-to-stores.sh latest   # dernière release
```

Le script déclenche le workflow `.github/workflows/promote-stores.yml` qui uploade l'AAB vers Play Store (production) et soumet le build TestFlight pour review App Store. Voir [PUBLISHING_STORES.md](PUBLISHING_STORES.md#94-promotion-vers-la-production).

## URL de développement

Avec `base: '/chrono-eps/'`, l'app est servie à :

- **Dev** : https://localhost:5173/chrono-eps/
- **Preview** : http://localhost:4173/chrono-eps/
- **Prod** : https://plamarque.github.io/chrono-eps/

Le serveur de développement utilise HTTPS avec un certificat auto-signé. Le navigateur affichera un avertissement « Connexion non sécurisée » : accepter ou faire une exception pour continuer (Chrome/Edge : « Paramètres avancés » → « Continuer vers localhost » ; Safari : « Afficher les détails » → « Visiter ce site web » ; Firefox : « Accepter le risque et continuer »). Sur téléphone ou tablette, la même confirmation est demandée.

Avec `host: true`, le serveur est exposé sur le réseau local. L'URL `https://192.168.x.x:5173/chrono-eps/` (adresse IP de la machine) permet de tester l'app et l'installation PWA depuis un appareil mobile sur le même réseau.

## Vérification manuelle avant release

Avant chaque déploiement ou release, valider manuellement les parcours critiques :

| Parcours | Vérifications |
|----------|---------------|
| Chronomètre | Démarrer, Arrêter, Réinitialiser fonctionnent ; confirmation avant réinitialisation si temps ou passages ; affichage mm:ss.ms correct |
| Tours | Bouton Tour enregistre les passages ; liste des tours affiche numéro, temps tour, temps total |
| Responsive | Affichage correct sur mobile/tablette ; zones tactiles ≥ 44px |
| PWA | Installation possible depuis le navigateur ; icônes 192/512 ; manifeste valide |
| Historique | Navigation Accueil / Historique ; confirmation si session non enregistrée sur l'accueil ; liste des courses ; détail lecture seule |

Les tests unitaires (Vitest) couvrent la logique ; cette checklist couvre les flux utilisateur complets. Les tests E2E (Playwright) couvrent les parcours critiques : chrono, mode individuel, relais, historique, replay. Les tests du courseStore utilisent fake-indexeddb (vitest.setup.js) pour IndexedDB en environnement Node.

## Déploiement

Le déploiement sur GitHub Pages est automatique à chaque push sur `main` via le workflow `.github/workflows/deploy.yml`.

Activer GitHub Pages : Settings → Pages → Source : **GitHub Actions**.
