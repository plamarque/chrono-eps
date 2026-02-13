# Développement

## Prérequis

- Node.js 20+
- npm

## Commandes

| Commande       | Description                                              |
|----------------|----------------------------------------------------------|
| `npm install`  | Installer les dépendances                                |
| `npm run dev`  | Lancer le serveur de développement                       |
| `npm run build`| Build de production (sortie dans `dist/`)               |
| `npm run preview` | Prévisualiser le build (localement)                   |
| `npm run test` | Lancer les tests unitaires (Vitest)                       |
| `npm run test:watch` | Lancer les tests en mode watch                      |

## URL de développement

Avec `base: '/chrono-eps/'`, l'app est servie à :

- **Dev** : http://localhost:5173/chrono-eps/
- **Preview** : http://localhost:4173/chrono-eps/
- **Prod** : https://plamarque.github.io/chrono-eps/

## Vérification manuelle avant release

Avant chaque déploiement ou release, valider manuellement les parcours critiques :

| Parcours | Vérifications |
|----------|---------------|
| Chronomètre | Démarrer, Arrêter, Réinitialiser fonctionnent ; affichage mm:ss.ms correct |
| Tours | Bouton Tour enregistre les passages ; liste des tours affiche numéro, temps tour, temps total |
| Responsive | Affichage correct sur mobile/tablette ; zones tactiles ≥ 44px |
| PWA | Installation possible depuis le navigateur (optionnel selon avancement) |

Les tests unitaires (Vitest) couvrent la logique ; cette checklist couvre les flux utilisateur complets. Tests E2E (Playwright) reportés au-delà du MVP (slice 6).

## Déploiement

Le déploiement sur GitHub Pages est automatique à chaque push sur `main` via le workflow `.github/workflows/deploy.yml`.

Activer GitHub Pages : Settings → Pages → Source : **GitHub Actions**.
