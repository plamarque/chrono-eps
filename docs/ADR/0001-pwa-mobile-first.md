# ADR 0001 — PWA et Mobile-First

## Statut

Accepté.

## Contexte

Chrono EPS cible les enseignants d'EPS en situation de terrain (gymnase, stade), avec usage principal sur tablette ou smartphone. L'application doit être rapide à lancer, installable, et utilisable sans connexion réseau fiable.

## Décision

- **PWA (Progressive Web App)** : L'application sera une PWA, sans application native (iOS/Android).
- **Mobile-first** : L'interface sera conçue d'abord pour tablettes et smartphones ; le responsive sur desktop est secondaire.

## Conséquences

- Développement unique (web) au lieu de deux codebases natives.
- Installation possible depuis le navigateur (ajout à l'écran d'accueil).
- Dépendance aux capacités PWA du navigateur (Service Worker, etc.).
- Pas d'accès à certaines APIs natives (ex. notifications push à préciser).
- Compatibilité variable selon navigateurs ; à tester sur Chrome, Safari, Firefox mobiles.
