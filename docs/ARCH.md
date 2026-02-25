# Architecture

## Objet

Ce document décrit la structure cible, les composants et les choix technologiques de Chrono EPS.

## Vue d'ensemble

```mermaid
flowchart LR
    subgraph UI [Interface Enseignant]
        Chrono[Chronomètre]
        Liste[Liste Coureurs]
        Passage[Saisie Passages]
    end
    
    subgraph Data [Données]
        Course[Course]
        Coureur[Coureur]
        Perf[Performance]
    end
    
    Chrono --> Passage
    Liste --> Coureur
    Passage --> Course
    Passage --> Perf
```

Application PWA **client-only** : pas de backend obligatoire pour la première version. Stockage local (IndexedDB ou équivalent) pour données hors ligne. [UNCERTAIN] Backend léger ultérieur pour synchro ou sauvegarde cloud.

## Principes d'interface

| Principe | Description |
|----------|--------------|
| **Moderne** | Typographie claire, espacements généreux, animations discrètes, respect des guidelines tactiles (zones de tap suffisantes). |
| **Agréable** | Palette cohérente, contrastes lisibles en extérieur (usage terrain), feedback visuel immédiat sur les actions. |
| **Épuré** | Pas de surcharge visuelle ; hiérarchie d'information claire ; un objectif principal par écran. |
| **Fonctionnel** | Priorité à l'efficacité : actions fréquentes en un tap, chronos et listes participants toujours visibles ou rapidement accessibles. |

## Composants

| Composant | Responsabilité | Emplacement / Tech cible |
|-----------|----------------|--------------------------|
| **UI Chronomètre** | Affichage temps ; boutons Démarrer/Arrêter ; Réinitialiser (chrono en pause, garde la config) ou Dupliquer (course chargée avec passages, garde config et efface temps) ; en vue détail : Replay, Dupliquer. Voir SPEC « Actions Nouvelle course et Dupliquer ». | src/components/Chronometre.vue |
| **Vue Replay** | Replay visuel d'une course : piste virtuelle ovale, marqueurs par participant, contrôles play/pause/slider | src/views/ReplayView.vue |
| **useReplay** | Logique replay : interpolation position, coureur actuel (relais), playback | src/composables/useReplay.js |
| **Liste Coureurs** | Gestion et sélection des coureurs pour une course | src/ |
| **Saisie Passages** | Enregistrement des passages (tap sur coureur, enregistrement timestamp) | src/ |
| **Tableau relais** | Affichage « Couru » / « Prochain » par groupe, tap par groupe | src/components/ |
| **Vue compacte (individuel)** | Grille de cartes par coureur ; Stop/Start individuel ; carte stoppée = fond gris, temps affichés, bouton Play pour reprendre | src/components/TableauPassagesCompact.vue |
| **Stockage local** | Persistance des données (coureurs, courses, passages, performances) ; liste, chargement, suppression | IndexedDB (Dexie.js) |
| **Couche PWA** | Service worker, manifeste ; installation, cache, offline | public/, sw.js ou équivalent |
| **UI responsive** | Layout adapté tablette et smartphone | PrimeVue |

## Stack technologique

- **Build** : Vite.
- **Front-end** : Vue 3 + PrimeVue.
- **PWA** : vite-plugin-pwa (Workbox) ; manifeste et service worker générés automatiquement.
- **Tests** : Vitest (unitaires, composants) + @vue/test-utils + jsdom ; Playwright (E2E, flux utilisateur). Les tests E2E doivent être maintenus à jour lorsque le code ou les flux évoluent. Ils s'exécutent en CI (push sur `main`, push de tag) et bloquent le déploiement et la release en cas d'échec.
- **Données** : IndexedDB via Dexie.js ; pas de base distante pour la v1.
- **Déploiement** : GitHub Pages (phase 1) ; PWABuilder pour publication sur les stores (phase 2).

## Modèle d'exécution

- **SPA** : Une seule page applicative ; navigation interne par routes ou états.
- **Chargement** : L'utilisateur ouvre l'URL ; l'app charge depuis le serveur (ou cache PWA).
- **Données** : Lecture/écriture locale uniquement ; pas d'appels réseau obligatoires pour le cœur fonctionnel.
- **Offline** : [ASSUMPTION] Lecture et écriture des données en local possible hors connexion ; stratégie de cache PWA à définir.

## Fichiers et répertoires cibles

- `src/` : Code source de l'application (composants, logique, état).
- `src/**/*.test.js`, `src/**/*.spec.js` : Tests unitaires et de composants.
- `e2e/` : Tests E2E (Playwright) — parcours utilisateur critiques.
- `public/` : Fichiers statiques (index.html, favicon, manifeste PWA).
- `docs/` : Documentation (SPEC, DOMAIN, ARCH, WORKFLOW, ADR).
- `dist/` ou `build/` : Sortie du build de production.
- Fichier de config build (ex. `vite.config.js`) à la racine.

## Publication sur les stores (phase 2)

Voir le guide détaillé : [PUBLISHING_STORES.md](PUBLISHING_STORES.md).

Résumé : (1) App déployée sur URL HTTPS (ex. `https://xxx.github.io/chrono-eps/`) ; (2) Valider manifeste et service worker (Lighthouse PWA) ; (3) [PWABuilder](https://pwabuilder.com/) : saisir l'URL, « Package for stores », télécharger paquets Android et iOS ; (4) Soumettre à Play Store (TWA) et App Store (wrapper WebKit). Flux release (testeurs) et promote (production) automatisés via scripts et workflows — voir [PUBLISHING_STORES.md](PUBLISHING_STORES.md).

## Hypothèses et incertitudes

- [UNCERTAIN] Backend futur pour synchro ou multi-appareils.
- [UNCERTAIN] Stratégie de cache PWA précise (assets, données, etc.).
