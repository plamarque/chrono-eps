# ADR 0004 — Stack : Vite + Vue 3 + PrimeVue + PWA

## Statut

Accepté.

## Contexte

Chrono EPS nécessite une stack web moderne, une interface épurée et fonctionnelle, un déploiement simple (GitHub Pages) et une publication ultérieure possible sur les stores. L'utilisation de Tailwind a montré des difficultés de maintenance (code complexe à faire évoluer). Capacitor n'est pas retenu — stack web pure uniquement.

## Décision

- **Build** : Vite.
- **Framework** : Vue 3.
- **UI** : PrimeVue (framework de composants ; évite le « class soup » ; thèmes épurés Luna/Aura).
- **PWA** : vite-plugin-pwa (Workbox).
- **Déploiement phase 1** : GitHub Pages ; PWA installable depuis le navigateur.
- **Publication stores (phase 2)** : PWABuilder pour packaging Play Store (TWA) et App Store (wrapper WebKit).
- **Pas de Capacitor** : packaging natif exclusivement via PWABuilder.

## Conséquences

- Un seul codebase web ; pas de code natif.
- Dépendance à PWABuilder pour le packaging stores ; app doit être déployée sur URL HTTPS publique avant packaging.
- PrimeVue impose Vue 3 ; pas de React.
- Compatibilité Android (TWA) et iOS (wrapper WebKit via PWABuilder).
