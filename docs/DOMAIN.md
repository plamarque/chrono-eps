# Modèle de domaine

## Objet

Ce document définit le vocabulaire, les entités et les règles du domaine pour Chrono EPS : chronométrage de courses en EPS, identification des coureurs, enregistrement des passages de tours et conservation des performances.

## Termes clés

| Terme | Définition |
|-------|------------|
| **Classe** | Ensemble de coureurs pouvant participer à une ou plusieurs courses. |
| **Coureur** | Participant identifié par un nom (ou identifiant) ; participe aux courses. |
| **Course** | Session chronométrée : une activité à un instant donné (ex. course du jour, tour de piste). |
| **Tour** | Unité de parcours complétée (ex. un tour de piste, une longueur de bassin). |
| **Passage** | Traversée d'un point de contrôle par un coureur à un instant donné ; enregistrement d'un tour complété. |
| **Tour (individuel)** | Passage enregistré pour la carte d'un coureur (drapeau pendant que son chrono est en course, ou **clic Coureur** pendant une course lancée pour le **dernier** coureur de la liste s’il est en course : enregistrement implicite du temps mono-tour puis arrivée du coureur suivant) ; par défaut, tant qu’aucun **drapeau** n’a été cliqué pour une carte, elle est considérée **mono-tour** et affiche seulement **Temps** (pas de liste Tour 1 / total ni de compteur Tour 2) ; un **Arrêter** global ou carte reste aussi un arrêt mono-tour si aucun drapeau n’a été cliqué ; après un passage enregistré au drapeau, le compteur principal reste **Temps** et affiche la somme des tours validés, tandis qu’un compteur près du drapeau affiche le prochain tour à capturer ; plusieurs tours par coureur possibles ; **coureur ajouté pendant la course** : le **tour 1** est mesuré depuis le **départ commun** (temps du chrono principal à l’enregistrement du tour, comme pour les autres coureurs partis ensemble) ; hors course lancée, le bouton **Coureur** (zone chronomètre) ajoute une carte sans tour : le temps affiché reprend le temps du chrono principal à l’instant du clic. |
| **Passage (relais)** | Un tour de piste complété par un coureur d'un groupe ; l'ordre cycle sur les coureurs (ex. Alice, Bob, Claire, Daniel, Alice, Bob...) ; la course continue jusqu'à l'arrêt par le professeur. |
| **Groupe (relais)** | Ensemble ordonné de coureurs qui courent l'un après l'autre ; a une couleur (chasubles communes) et une liste de noms de coureurs. |
| **Performance** | Résultat associé à un coureur pour une course : temps, nombre de tours complétés, etc. |
| **Arrêt individuel (historique)** | Ancien comportement : chrono parallèle par coureur avec Stop sur carte ; les **données** de courses déjà enregistrées sous ce modèle restent valides (affichage et export multi-tours). |
| **Replay** | Visualisation différée d'une course sauvegardée : relecture au fil du temps avec position des participants sur une piste virtuelle. |
| **Piste virtuelle** | Représentation graphique (ovale ou anneau) de la piste sur laquelle les positions des participants sont affichées pendant le replay. |
| **Nouvelle course** | Action (bouton barre d'outils) : réinitialisation complète ; efface participants, groupes, passages ; repart sur une course vierge. |
| **Dupliquer** | Action (bouton chronomètre) : conserve participants et groupes ; efface uniquement les temps et passages ; permet de refaire une course avec la même configuration. |

## Entités et relations

- **Classe** : agrège des coureurs ; structure de regroupement pour les courses. [ASSUMPTION] Une classe peut être réutilisée entre plusieurs courses.
- **Coureur** : nom, identifiant optionnel ; membre d'une ou plusieurs classes.
- **Course** : date, type (ex. tour de piste, demi-fond), liste de coureurs participants ; références les passages.
- **Tour** : unité de comptage ; [ASSUMPTION] numérotée (tour 1, tour 2, …) ou identifiée par un ordinal.
- **Passage** : associe un coureur, un tour (ou ordinal), et un timestamp ; enregistre le moment du passage.
- **Performance** : dérivée des passages ; agrège temps total, nombre de tours, etc. pour un coureur donné dans une course.

**Relations** :
- Une **course** a N **coureurs** et N **passages**.
- Chaque **passage** lie un **coureur**, un **tour** (ou ordinal), et un **timestamp**.
- Une **performance** est calculée à partir des **passages** d'un **coureur** pour une **course**.

## Règles du domaine

1. Une course a au moins un coureur participant et au plus 20 coureurs participants (mode individuel). En mode relais, une course a au moins 1 groupe et au plus 8 groupes ; les groupes sont nommés Groupe 1 à Groupe 8 par défaut ; 6 couleurs (chasubles) sont réutilisées cycliquement au-delà de 6 groupes. Chaque groupe relais a au moins un coureur ; le premier groupe reçoit « Coureur 1 » par défaut ; chaque nouveau groupe créé reçoit automatiquement un coureur « Coureur X » où X = N+1 et N est le nombre total de coureurs déjà engagés dans tous les groupes.
2. Chaque passage associe un coureur à un tour (ou ordinal) et à un instant précis.
3. Les passages sont ordonnés chronologiquement ; le timestamp est non modifiable une fois enregistré. [ASSUMPTION]
4. Les performances sont dérivées des passages : temps du premier passage, du dernier, nombre de tours, etc.
5. [ASSUMPTION] Format temps : mm:ss.ms ou équivalent pour l'affichage et le stockage.
6. En mode individuel, chaque coureur a un **état de chrono** (idle / running / paused) comme en relais par groupe ; le **démarrage global** met tous les coureurs listés en course ; l'**arrêt global** enregistre un passage pour chaque coureur encore en course puis met en pause. Les courses individuelles déjà stockées (y compris anciennes variantes à une horloge unique) restent affichées et exportées avec le détail par tour.

## Hypothèses et incertitudes

- [ASSUMPTION] L'unité de tour est fixée par course (ex. un tour = 400 m).
- [ASSUMPTION] Pas de correction manuelle des passages après enregistrement pour la version minimale.
- [UNCERTAIN] Modèle exact de la relation Classe ↔ Course (une classe par course, ou sélection libre de coureurs).
