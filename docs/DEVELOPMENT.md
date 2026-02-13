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

## URL de développement

Avec `base: '/chrono-eps/'`, l'app est servie à :

- **Dev** : http://localhost:5173/chrono-eps/
- **Preview** : http://localhost:4173/chrono-eps/
- **Prod** : https://plamarque.github.io/chrono-eps/

## Déploiement

Le déploiement sur GitHub Pages est automatique à chaque push sur `main` via le workflow `.github/workflows/deploy.yml`.

Activer GitHub Pages : Settings → Pages → Source : **GitHub Actions**.
