# Spécification fonctionnelle

## Objet

Chrono EPS est une application web PWA destinée aux enseignants d'EPS pour chronométrer facilement les courses d'une classe entière. Elle permet d'enregistrer les passages de tours, d'identifier les coureurs et de conserver les performances sans feuille papier. Compatible tablettes et smartphones.

## Périmètre

- **Dans le périmètre :**
  - Interface moderne, épurée et fonctionnelle (voir ARCH.md, section « Principes d'interface »)
  - Chronomètre multi-coureurs pour une course
  - Enregistrement des passages de tours par coureur
  - Mode relais : groupes de coureurs ; l'ordre cycle sur les coureurs ; la course continue jusqu'à l'arrêt par le professeur
  - Configuration : jusqu'à 8 groupes, nom et couleur du groupe (chasubles, 6 couleurs réutilisées cycliquement), déclaration des noms des coureurs dans l'ordre du premier tour ; **suppression de coureurs** : chaque coureur peut être supprimé individuellement ; le groupe conserve au moins un coureur ; suppression interdite si le groupe a des passages (configuration avant course)
  - Dialogue de confirmation avant de changer de mode (Relais/Individuel) lorsque la configuration ou le chrono en cours serait perdu
  - Bouton « Nouvelle course » toujours visible sur l'écran d'accueil, en haut à gauche sur la même ligne que le switcher Relais/Individuel ; dialogue de confirmation avant de perdre une configuration en cours (même logique que le changement de mode)
  - Bouton « Dupliquer » (sous le chronomètre) : conserve participants et groupes, efface uniquement les temps et passages ; visible quand une course chargée a des passages ou a été lancée
  - Affichage en temps réel « Couru » / « Prochain » par groupe pendant la course
  - Identification et nommage des coureurs
  - Stockage des performances (historique)
  - Replay visuel des courses : piste virtuelle, marqueurs par participant, contrôles play/pause et curseur temporel
  - Interface adaptée tablettes et smartphones (responsive, tactile)
  - PWA installable

- **Hors périmètre :**
  - [ASSUMPTION] Compte utilisateur et authentification — non requis pour la première version
  - Gestion multi-établissements ou synchronisation cloud
  - Export vers logiciels tiers (à préciser ultérieurement)

## Capacités principales

1. **Chronomètre multi-coureurs** — L'enseignant lance une course avec plusieurs coureurs ; un chronomètre commun mesure le temps écoulé. En mode individuel, chaque coureur a un démarrage/arrêt individuel (Stop sur la carte = arrêt du chrono de ce coureur ; la carte reste visible sur fond gris avec temps affichés et bouton Start pour reprendre).
2. **Enregistrement des passages de tours** — À chaque passage d'un coureur à un point de contrôle (ex. tour de piste), l'enseignant enregistre le passage par une action rapide (tap) ; l'heure du passage est associée automatiquement.
3. **Identification des coureurs** — Les coureurs sont identifiés par un nom ou un identifiant ; une liste de coureurs est associée à la course.
4. **Stockage des performances** — Les performances (temps, tours complétés) sont conservées localement ; l'historique est consultable ; les courses peuvent être chargées (affichage lecture seule avec temps total), supprimées ou servir de base à une nouvelle course.
5. **UI adaptée tablettes et smartphones** — Interface tactile, optimisée pour écran mobile et tablette, sans feuille papier.
6. **Mode relais** — Chaque participant est un groupe de coureurs ; les coureurs courent l'un après l'autre en cycle ; configuration coureurs et couleurs avant course ; affichage « Couru » / « Prochain » ; la course continue jusqu'à l'arrêt par le professeur.
7. **Replay visuel** — Les courses sauvegardées peuvent être rejouées visuellement : piste virtuelle ovale, marqueurs colorés par participant ou groupe, position interpolée entre passages, nom du coureur actuel en mode relais ; contrôles play, pause et curseur temporel.

## Actions « Nouvelle course » et « Dupliquer »

Deux actions distinctes permettent de repartir sur une nouvelle course :

| Bouton | Emplacement | Effet | Quand visible |
|--------|-------------|-------|---------------|
| **Nouvelle course** | Barre d'outils (en haut à gauche, même ligne que Relais/Individuel) | Réinitialisation complète : efface participants, groupes, passages et chrono ; repart sur une course vierge (1 groupe avec 1 coureur par défaut en mode relais, ou 1 participant en mode individuel) | Toujours sur l'écran d'accueil |
| **Dupliquer** | Sous le chronomètre (à la place de Réinitialiser) | Conserve participants et groupes ; efface uniquement les temps et passages ; permet de refaire une course avec la même configuration | Quand une course chargée a des passages ou a été lancée (pas une course « préparée » sans run) |
| **Réinitialiser** | Sous le chronomètre | Conserve la configuration ; remet le chrono à zéro et efface les passages | Quand le chrono est en pause, sans course chargée |

Dialogue de confirmation : « Nouvelle course » et le switcher Relais/Individuel affichent le même dialogue si une configuration en cours serait perdue.

## Comportement

- **Entrée** : L'enseignant saisit ou sélectionne les coureurs, lance le chrono, enregistre les passages par touches/taps.
- **Sortie** : Données stockées localement (performances, historique) ; affichage en temps réel du chrono et des passages.
- **Flux** : Création/sélection d'une course → ajout des coureurs (ou équipes en relais) → [optionnel] démarrage du chrono et enregistrement des passages → enregistrement nommé → consultation (lecture seule) ou, pour une course préparée (sans temps ni passage), lancement depuis l'historique.

## Limites

- **Entrées** : Touches/taps utilisateur ; données saisies localement (pas d'import automatique de listes de coureurs par défaut).
- **Sorties** : Données stockées localement ; affichage écran ; [UNCERTAIN] export (CSV, PDF, etc.).
- **Dépendances externes** : Aucune obligatoire pour la version minimale ; [UNCERTAIN] hébergement, analytics, service backend futur.

## Hypothèses et incertitudes

- [ASSUMPTION] Usage principal en contexte terrain (gymnase, stade) avec tablette ou smartphone.
- [ASSUMPTION] Pas de connexion réseau fiable en permanence ; le stockage local est prioritaire.
- [UNCERTAIN] Synchronisation multi-appareils ou partage entre enseignants.
- [UNCERTAIN] Export des données vers d'autres formats ou systèmes.
