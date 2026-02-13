# ADR 0002 — Stockage local (IndexedDB)

## Statut

Accepté.

## Contexte

Chrono EPS doit conserver les performances et l'historique des courses. Le contexte d'usage (terrain, connexion possiblement instable) impose de pouvoir fonctionner hors ligne. Pas de backend prévu pour la première version.

## Décision

- **Stockage local** : Les données (élèves, classes, courses, passages, performances) sont persistées localement dans le navigateur.
- **IndexedDB** : Utilisation d'IndexedDB (éventuellement via une librairie type idb, Dexie.js ou équivalent) pour le stockage structuré. [ASSUMPTION] Alternative : localStorage pour un MVP minimal si IndexedDB est différé.

## Conséquences

- Pas de synchronisation entre appareils par défaut ; chaque appareil a son propre jeu de données.
- Les données sont liées au navigateur/appareil ; changement d'appareil = perte des données locales sauf export manuel (à préciser).
- Fonctionnement hors ligne garanti pour la lecture et l'écriture des données.
- Pas de coût serveur pour le stockage.
- [UNCERTAIN] Export/import manuel pour sauvegarde ou transfert à définir.
