# Modèle de domaine

## Objet

Ce document définit le vocabulaire, les entités et les règles du domaine pour Chrono EPS : chronométrage de courses en EPS, identification des élèves, enregistrement des passages de tours et conservation des performances.

## Termes clés

| Terme | Définition |
|-------|------------|
| **Classe** | Ensemble d'élèves pouvant participer à une ou plusieurs courses. |
| **Élève** | Participant identifié par un nom (ou identifiant) ; participe aux courses. |
| **Course** | Session chronométrée : une activité à un instant donné (ex. course du jour, tour de piste). |
| **Tour** | Unité de parcours complétée (ex. un tour de piste, une longueur de bassin). |
| **Passage** | Traversée d'un point de contrôle par un élève à un instant donné ; enregistrement d'un tour complété. |
| **Passage (relais)** | Un tour de piste complété par un élève d'un groupe ; l'ordre cycle sur les élèves (ex. Alice, Bob, Claire, Daniel, Alice, Bob...) ; la course continue jusqu'à l'arrêt par le professeur. |
| **Groupe (relais)** | Ensemble ordonné d'élèves qui courent l'un après l'autre ; a une couleur (chasubles communes) et une liste de noms d'élèves. |
| **Performance** | Résultat associé à un élève pour une course : temps, nombre de tours complétés, etc. |
| **Replay** | Visualisation différée d'une course sauvegardée : relecture au fil du temps avec position des participants sur une piste virtuelle. |
| **Piste virtuelle** | Représentation graphique (ovale ou anneau) de la piste sur laquelle les positions des participants sont affichées pendant le replay. |

## Entités et relations

- **Classe** : agrège des élèves ; structure de regroupement pour les courses. [ASSUMPTION] Une classe peut être réutilisée entre plusieurs courses.
- **Élève** : nom, identifiant optionnel ; membre d'une ou plusieurs classes.
- **Course** : date, type (ex. tour de piste, demi-fond), liste d'élèves participants ; références les passages.
- **Tour** : unité de comptage ; [ASSUMPTION] numérotée (tour 1, tour 2, …) ou identifiée par un ordinal.
- **Passage** : associe un élève, un tour (ou ordinal), et un timestamp ; enregistre le moment du passage.
- **Performance** : dérivée des passages ; agrège temps total, nombre de tours, etc. pour un élève donné dans une course.

**Relations** :
- Une **course** a N **élèves** et N **passages**.
- Chaque **passage** lie un **élève**, un **tour** (ou ordinal), et un **timestamp**.
- Une **performance** est calculée à partir des **passages** d'un **élève** pour une **course**.

## Règles du domaine

1. Une course a au moins un élève participant et au plus 6 élèves participants (mode individuel). En mode relais, une course a au moins 1 groupe et au plus 8 groupes ; les groupes sont nommés Groupe 1 à Groupe 8 par défaut ; 6 couleurs (chasubles) sont réutilisées cycliquement au-delà de 6 groupes.
2. Chaque passage associe un élève à un tour (ou ordinal) et à un instant précis.
3. Les passages sont ordonnés chronologiquement ; le timestamp est non modifiable une fois enregistré. [ASSUMPTION]
4. Les performances sont dérivées des passages : temps du premier passage, du dernier, nombre de tours, etc.
5. [ASSUMPTION] Format temps : mm:ss.ms ou équivalent pour l'affichage et le stockage.

## Hypothèses et incertitudes

- [ASSUMPTION] L'unité de tour est fixée par course (ex. un tour = 400 m).
- [ASSUMPTION] Pas de correction manuelle des passages après enregistrement pour la version minimale.
- [UNCERTAIN] Modèle exact de la relation Classe ↔ Course (une classe par course, ou sélection libre d'élèves).
