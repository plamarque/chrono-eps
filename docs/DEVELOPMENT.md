# Développement

## Prérequis

- Node.js 20+
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
| `npm run release -- --patch` | Créer une release (voir section Release)   |

## Release

Pour créer une release avec version sémantique et publication sur GitHub :

```bash
./scripts/release-version.sh --patch   # 0.1.0 → 0.1.1
./scripts/release-version.sh --minor   # 0.1.1 → 0.2.0
./scripts/release-version.sh --major   # 0.2.0 → 1.0.0
```

Ou via npm : `npm run release -- --patch` (idem pour --minor, --major).

**Étapes du script :** vérification du working tree et de `gh`, tests, build, génération du changelog à partir des commits depuis le dernier tag, bump de version, création de la release GitHub, push.

**Prérequis :** GitHub CLI installé et authentifié (`gh auth login`).

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
| Chronomètre | Démarrer, Arrêter, Réinitialiser fonctionnent ; affichage mm:ss.ms correct |
| Tours | Bouton Tour enregistre les passages ; liste des tours affiche numéro, temps tour, temps total |
| Responsive | Affichage correct sur mobile/tablette ; zones tactiles ≥ 44px |
| PWA | Installation possible depuis le navigateur ; icônes 192/512 ; manifeste valide |
| Historique | Navigation Accueil / Historique ; liste des courses ; détail lecture seule |

Les tests unitaires (Vitest) couvrent la logique ; cette checklist couvre les flux utilisateur complets. Tests E2E (Playwright) reportés au-delà du MVP (slice 6). Les tests du courseStore utilisent fake-indexeddb (vitest.setup.js) pour IndexedDB en environnement Node.

## Déploiement

Le déploiement sur GitHub Pages est automatique à chaque push sur `main` via le workflow `.github/workflows/deploy.yml`.

Activer GitHub Pages : Settings → Pages → Source : **GitHub Actions**.
