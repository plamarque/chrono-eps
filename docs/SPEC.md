# Spécification fonctionnelle

## Objet

Chrono EPS est une application web PWA destinée aux enseignants d'EPS pour chronométrer facilement les courses d'une classe entière. Elle permet d'enregistrer les passages de tours, d'identifier les élèves et de conserver les performances sans feuille papier. Compatible tablettes et smartphones.

## Périmètre

- **Dans le périmètre :**
  - Interface moderne, épurée et fonctionnelle (voir ARCH.md, section « Principes d'interface »)
  - Chronomètre multi-élèves pour une course
  - Enregistrement des passages de tours par élève
  - Identification et nommage des élèves
  - Stockage des performances (historique)
  - Interface adaptée tablettes et smartphones (responsive, tactile)
  - PWA installable

- **Hors périmètre :**
  - [ASSUMPTION] Compte utilisateur et authentification — non requis pour la première version
  - Gestion multi-établissements ou synchronisation cloud
  - Export vers logiciels tiers (à préciser ultérieurement)

## Capacités principales

1. **Chronomètre multi-élèves** — L'enseignant lance une course avec plusieurs élèves ; un chronomètre commun mesure le temps écoulé.
2. **Enregistrement des passages de tours** — À chaque passage d'un élève à un point de contrôle (ex. tour de piste), l'enseignant enregistre le passage par une action rapide (tap) ; l'heure du passage est associée automatiquement.
3. **Identification des élèves** — Les élèves sont identifiés par un nom ou un identifiant ; une liste d'élèves est associée à la course.
4. **Stockage des performances** — Les performances (temps, tours complétés) sont conservées localement ; l'historique est consultable ; les courses peuvent être chargées (affichage lecture seule avec temps total), supprimées ou servir de base à une nouvelle course.
5. **UI adaptée tablettes et smartphones** — Interface tactile, optimisée pour écran mobile et tablette, sans feuille papier.

## Comportement

- **Entrée** : L'enseignant saisit ou sélectionne les élèves, lance le chrono, enregistre les passages par touches/taps.
- **Sortie** : Données stockées localement (performances, historique) ; affichage en temps réel du chrono et des passages.
- **Flux** : Création/sélection d'une course → ajout des élèves → lancement du chrono → enregistrement des passages au fil du temps → enregistrement nommé → consultation des performances (lecture seule, temps total affiché) ou suppression.

## Limites

- **Entrées** : Touches/taps utilisateur ; données saisies localement (pas d'import automatique de listes d'élèves par défaut).
- **Sorties** : Données stockées localement ; affichage écran ; [UNCERTAIN] export (CSV, PDF, etc.).
- **Dépendances externes** : Aucune obligatoire pour la version minimale ; [UNCERTAIN] hébergement, analytics, service backend futur.

## Hypothèses et incertitudes

- [ASSUMPTION] Usage principal en contexte terrain (gymnase, stade) avec tablette ou smartphone.
- [ASSUMPTION] Pas de connexion réseau fiable en permanence ; le stockage local est prioritaire.
- [UNCERTAIN] Synchronisation multi-appareils ou partage entre enseignants.
- [UNCERTAIN] Export des données vers d'autres formats ou systèmes.
