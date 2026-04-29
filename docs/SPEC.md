# Spécification fonctionnelle

## Objet

Chrono EPS est une application web PWA destinée aux enseignants d'EPS pour chronométrer facilement les courses d'une classe entière. Elle permet d'enregistrer les passages de tours, d'identifier les coureurs et de conserver les performances sans feuille papier. Compatible tablettes et smartphones.

## Périmètre

- **Dans le périmètre :**
  - Interface moderne, épurée et fonctionnelle (voir ARCH.md, section « Principes d'interface »)
  - Chronomètre multi-coureurs pour une course
  - Enregistrement des passages de tours par coureur (mode relais) ; en mode **individuel**, enregistrement des **arrivées** dans l'ordre (un temps par coureur créé à la volée, sans liste à préparer au départ)
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
  - Export Excel des courses : bouton « Exporter » sur l'accueil (après enregistrement) et sur la vue détail d'une course (avec passages) ; en **individuel** avec une arrivée par coureur : colonnes « Coureur » et « Temps d'arrivée » (plus ligne durée max.) ; pour les courses individuelles **historiques** avec plusieurs tours par coureur, export au format tours en colonnes comme auparavant ; en **relais** : coureurs en lignes, temps par tour en colonnes, ligne Total groupe ; partage via Web Share API native (ou téléchargement en fallback)

- **Hors périmètre :**
  - [ASSUMPTION] Compte utilisateur et authentification — non requis pour la première version
  - Gestion multi-établissements ou synchronisation cloud

## Capacités principales

1. **Chronomètre multi-coureurs** — L'enseignant lance une course ; un chronomètre mesure le temps écoulé. **Mode individuel** : un seul chrono de course ; le bouton **Arrivée** (à côté de Démarrer / Arrêter pendant la course) enregistre l'instant courant pour un nouveau coureur nommé automatiquement « Coureur 1 », « Coureur 2 », etc. ; **Arrêter** met fin à la course sans ajouter d'arrivée. **Mode relais** : un chronomètre commun par groupe ; démarrage/arrêt par groupe comme auparavant.
2. **Enregistrement des passages** — **Relais** : à chaque passage, tap sur le groupe ; l'heure est associée au tour et au coureur du cycle. **Individuel** : chaque tap sur **Arrivée** crée une ligne avec l'heure d'arrivée (pas de tours multiples par coureur dans cette version ; les courses déjà enregistrées avec plusieurs tours par coureur restent lisibles et exportables à l'ancien format).
3. **Identification des coureurs** — **Individuel** : renommage après coup (double-clic sur le nom ou bouton crayon) ; **relais** : noms saisis dans la configuration des groupes avant ou pendant la préparation.
4. **Stockage des performances** — Les performances (temps, tours complétés) sont conservées localement ; l'historique est consultable ; les courses peuvent être chargées (affichage lecture seule avec temps total), supprimées ou servir de base à une nouvelle course.
5. **UI adaptée tablettes et smartphones** — Interface tactile, optimisée pour écran mobile et tablette, sans feuille papier.
6. **Mode relais** — Chaque participant est un groupe de coureurs ; les coureurs courent l'un après l'autre en cycle ; configuration coureurs et couleurs avant course ; affichage « Couru » / « Prochain » ; la course continue jusqu'à l'arrêt par le professeur.
7. **Replay visuel** — Les courses sauvegardées peuvent être rejouées visuellement : piste virtuelle ovale, marqueurs colorés par participant ou groupe, position interpolée entre passages, nom du coureur actuel en mode relais ; contrôles play, pause et curseur temporel.

## Actions « Nouvelle course » et « Dupliquer »

Deux actions distinctes permettent de repartir sur une nouvelle course :

| Bouton | Emplacement | Effet | Quand visible |
|--------|-------------|-------|---------------|
| **Nouvelle course** | Barre d'outils (en haut à gauche, même ligne que Relais/Individuel) | Réinitialisation complète : efface participants, groupes, passages et chrono ; repart sur une course vierge (1 groupe avec 1 coureur par défaut en mode relais, ou liste vide en mode individuel) | Toujours sur l'écran d'accueil |
| **Dupliquer** | Sous le chronomètre (à la place de Réinitialiser) | Conserve participants et groupes ; efface uniquement les temps et passages ; permet de refaire une course avec la même configuration | Quand une course chargée a des passages ou a été lancée (pas une course « préparée » sans run) |
| **Réinitialiser** | Sous le chronomètre | Conserve la configuration ; remet le chrono à zéro et efface les passages ; dialogue de confirmation si un temps a été mesuré ou s'il existe des passages (sinon action immédiate) | Quand le chrono est en pause et que le bouton affiché n'est pas « Dupliquer » (course chargée avec passages ou lancée) |

Dialogue de confirmation : « Nouvelle course » et le switcher Relais/Individuel affichent le même dialogue si une configuration en cours serait perdue. « Réinitialiser » sur l'accueil (hors libellé « Dupliquer ») affiche un dialogue dédié lorsqu'un temps ou des passages seraient effacés ; les boutons d'action sont libellés pour éviter l'ambiguïté avec le bouton chronomètre. Quitter l'écran d'accueil (lien Historique ou autre navigation) avec une session non enregistrée au même sens affiche un dialogue (Quitter / Rester) ; pas de dialogue lorsque la course affichée est une course déjà enregistrée en lecture seule (données persistées).

## Comportement

- **Entrée** : **Relais** : configuration des groupes et coureurs, lancement du chrono, enregistrement des passages par tap sur les groupes. **Individuel** : lancement du chrono puis enregistrement des arrivées par le bouton **Arrivée** ; renommage des lignes si besoin.
- **Sortie** : Données stockées localement (performances, historique) ; affichage en temps réel du chrono et des passages.
- **Flux** : **Relais** : configuration → démarrage et passages → enregistrement. **Individuel** : démarrage → arrivées → renommage optionnel → enregistrement. Consultation (lecture seule) ou nouvelle course depuis l'historique.
- **Modale Enregistrer** : Le champ « Nom de la course » est prérempli avec « Course du [date] [heure] » (ex. « Course du 26 février 14:45 ») pour les nouvelles courses ; pour une course chargée, le nom existant est proposé.

## Limites

- **Entrées** : Touches/taps utilisateur ; données saisies localement (pas d'import automatique de listes de coureurs par défaut).
- **Sorties** : Données stockées localement ; affichage écran ; export Excel (.xlsx) via partage natif ou téléchargement.
- **Dépendances externes** : Aucune obligatoire pour la version minimale ; [UNCERTAIN] hébergement, analytics, service backend futur.

## Hypothèses et incertitudes

- [ASSUMPTION] Usage principal en contexte terrain (gymnase, stade) avec tablette ou smartphone.
- [ASSUMPTION] Pas de connexion réseau fiable en permanence ; le stockage local est prioritaire.
- [UNCERTAIN] Synchronisation multi-appareils ou partage entre enseignants.
