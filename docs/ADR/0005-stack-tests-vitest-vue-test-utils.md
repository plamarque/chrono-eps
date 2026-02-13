# ADR 0005 — Stack de tests : Vitest + Vue Test Utils

## Statut

Accepté.

## Contexte

Chrono EPS nécessite des tests pour protéger les fonctionnalités (formatage temps, logique chronomètre, passages). Une stack de tests doit être intégrée à Vite et compatible avec Vue 3.

## Décision

- **Exécution et assertions** : Vitest — intégration native Vite, API compatible Jest.
- **Tests de composants Vue** : @vue/test-utils — montage, interactions, mocks.
- **Environnement DOM** : jsdom — exécution des tests en Node sans navigateur.

Les tests sont exécutés avant le build dans le workflow de déploiement GitHub Actions.

## Conséquences

- Un seul outil (Vitest) pour tests unitaires et composants.
- Conventions de nommage : `*.test.js` (utils, logique) et `*.spec.js` (composants).
- Pas de navigateur réel pour les tests (coût CI réduit).
- Dépendance à jsdom ; comportement légèrement différent d'un vrai navigateur si besoin de tests E2E ultérieurs.
