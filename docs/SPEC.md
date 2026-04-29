# Spécification fonctionnelle

## Objet

Chrono EPS est une application web PWA destinée aux enseignants d'EPS pour chronométrer facilement les courses d'une classe entière. Elle permet d'enregistrer les passages de tours, d'identifier les coureurs et de conserver les performances sans feuille papier. Compatible tablettes et smartphones.

## Périmètre

- **Dans le périmètre :**
  - Interface moderne, épurée et fonctionnelle (voir ARCH.md, section « Principes d'interface »)
  - Chronomètre multi-coureurs pour une course
  - Enregistrement des passages de tours par coureur (mode relais) ; en mode **individuel**, cartes par coureur (grille type relais) : **Démarrer** lance le chrono de tous les coureurs déjà listés ; tant qu’aucun drapeau n’a été cliqué pour un coureur, la carte est considérée **mono-tour** et affiche le **Temps** qui défile (pas « Tour en cours », pas de liste de tours) ; le bouton bleu **Coureur** dans la zone chronomètre (après Démarrer / Arrêter) : **si le chrono est au repos ou en pause**, ajoute une carte dont le **temps affiché** reprend le **temps du chrono principal** au moment du clic (sans ligne de tour) ; **si la course est lancée** (chrono principal en cours) et que le **dernier** coureur de la liste est en course, le clic **enregistre implicitement le temps mono-tour** de ce dernier (Temps figé, sans afficher Tour 1 ni le prochain tour) puis ajoute **Coureur N+1** déjà **en course** et synchronisé sur le temps global ; **Arrêter** (global ou carte) enregistre aussi un temps mono-tour tant qu’aucun drapeau n’a été cliqué ; après un passage enregistré au **drapeau**, le compteur principal reste **Temps** et affiche la somme des tours validés, tandis qu’un compteur près du drapeau affiche le **prochain tour à capturer** (ex. « Tour 2 : 00:12.34 ») ; chaque carte a **Play/Stop** et un **drapeau** pour enregistrer d’autres **tours**
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
  - Export Excel des courses : bouton « Exporter » sur l'accueil (après enregistrement) et sur la vue détail d'une course (avec passages) ; le **total** affiché par coureur et la **durée max. course** (ou total groupe en relais) sont la **somme des durées de tour** (lapMs), pas seulement un cumul totalMs stocké ; en **individuel** avec au plus un tour par coureur : colonnes « Coureur » et « Temps d'arrivée » ; dès qu'au moins un coureur a plusieurs tours, export au format **tours en colonnes** ; en **relais** : coureurs en lignes, temps par tour en colonnes, ligne Total groupe ; partage via Web Share API native (ou téléchargement en fallback)

- **Hors périmètre :**
  - [ASSUMPTION] Compte utilisateur et authentification — non requis pour la première version
  - Gestion multi-établissements ou synchronisation cloud

## Capacités principales

1. **Chronomètre multi-coureurs** — L'enseignant lance une course ; le temps affiché reflète le maximum des temps coureurs en cours ou figés. **Mode individuel** : **Démarrer** met tous les coureurs de la liste en course ; le bouton **Coureur** (zone chronomètre, après Démarrer / Arrêter) hors course lancée ajoute une carte avec total = temps principal au clic ; **pendant la course**, le même bouton enregistre le tour du **dernier** coureur (s’il est en course) puis ajoute le suivant déjà synchronisé en course ; **Play/Stop**, **drapeau** et **Arrêter** complètent les enregistrements de tours. **Mode relais** : un chronomètre commun par groupe ; démarrage/arrêt par groupe comme auparavant.
2. **Enregistrement des passages** — **Relais** : à chaque passage, tap sur le groupe ; l'heure est associée au tour et au coureur du cycle. **Individuel** : avant le premier drapeau, le temps affiché sur une carte en course est **Temps** ; tap drapeau sur la carte d'un coureur dont le chrono est en **course** pour figer le tour courant, ajouter ce tour au **Temps**, puis afficher à côté du drapeau le temps du prochain tour à capturer ; pas de `studentIndex` (un seul coureur logique par carte). Les données déjà enregistrées restent lisibles et exportables.
3. **Identification des coureurs** — **Individuel** : renommage après coup (clic sur l'en-tête coloré de la carte, même logique que l'en-tête groupe en relais) ; **relais** : noms saisis dans la configuration des groupes avant ou pendant la préparation.
4. **Stockage des performances** — Les performances (temps, tours complétés) sont conservées localement ; l'historique est consultable ; les courses peuvent être chargées (affichage lecture seule avec temps total), supprimées ou servir de base à une nouvelle course. **Vue détail d'une course individuelle (historique)** : le nom et la couleur d'un coureur peuvent être modifiés après coup (même interaction que sur l'accueil : double-clic ou crayon, sans suppression de ligne ni changement des temps).
5. **UI adaptée tablettes et smartphones** — Interface tactile, optimisée pour écran mobile et tablette, sans feuille papier.
6. **Mode relais** — Chaque participant est un groupe de coureurs ; les coureurs courent l'un après l'autre en cycle ; configuration coureurs et couleurs avant course ; affichage « Couru » / « Prochain » ; la course continue jusqu'à l'arrêt par le professeur.
7. **Replay visuel** — Les courses sauvegardées peuvent être rejouées visuellement : piste virtuelle ovale, marqueurs colorés par participant ou groupe, position interpolée entre passages, nom du coureur actuel en mode relais ; contrôles play, pause et curseur temporel.

## Actions « Nouvelle course » et « Dupliquer »

Deux actions distinctes permettent de repartir sur une nouvelle course :

| Bouton | Emplacement | Effet | Quand visible |
|--------|-------------|-------|---------------|
| **Nouvelle course** | Barre d'outils (en haut à gauche, même ligne que Relais/Individuel) | Réinitialisation complète : efface participants, groupes, passages et chrono ; repart sur une course vierge (1 groupe avec 1 coureur par défaut en mode relais, ou **1 coureur (Coureur 1)** par défaut en mode individuel) | Toujours sur l'écran d'accueil |
| **Dupliquer** | Sous le chronomètre (à la place de Réinitialiser) | Conserve participants et groupes ; efface uniquement les temps et passages ; permet de refaire une course avec la même configuration | Quand une course chargée a des passages ou a été lancée (pas une course « préparée » sans run) |
| **Réinitialiser** | Sous le chronomètre | Conserve la configuration ; remet le chrono à zéro et efface les passages ; dialogue de confirmation si un temps a été mesuré ou s'il existe des passages (sinon action immédiate) | Quand le chrono est en pause et que le bouton affiché n'est pas « Dupliquer » (course chargée avec passages ou lancée) |

Dialogue de confirmation : « Nouvelle course » et le switcher Relais/Individuel affichent le même dialogue si une configuration en cours serait perdue. « Réinitialiser » sur l'accueil (hors libellé « Dupliquer ») affiche un dialogue dédié lorsqu'un temps ou des passages seraient effacés ; les boutons d'action sont libellés pour éviter l'ambiguïté avec le bouton chronomètre. Quitter l'écran d'accueil (lien Historique ou autre navigation) avec une session non enregistrée au même sens affiche un dialogue (Quitter / Rester) ; pas de dialogue lorsque la course affichée est une course déjà enregistrée en lecture seule (données persistées).

## Comportement

- **Entrée** : **Relais** : configuration des groupes et coureurs, lancement du chrono, enregistrement des passages par tap sur les groupes. **Individuel** : une carte **Coureur 1** par défaut ; le bouton **Coureur** au chronomètre ajoute des cartes (au repos : total au clic ; **en course** : passage implicite sur le dernier coureur + nouveau coureur synchronisé), lancement global, tours aussi par drapeau ; renommage depuis l'en-tête de carte si besoin.
- **Sortie** : Données stockées localement (performances, historique) ; affichage en temps réel du chrono et des passages.
- **Flux** : **Relais** : configuration → démarrage et passages → enregistrement. **Individuel** : coureurs → démarrages / tours → renommage optionnel → enregistrement. Consultation (lecture seule) ou nouvelle course depuis l'historique.
- **Modale Enregistrer** : Le champ « Nom de la course » est prérempli avec « Course du [date] [heure] » (ex. « Course du 26 février 14:45 ») pour les nouvelles courses ; pour une course chargée, le nom existant est proposé.

## Limites

- **Entrées** : Touches/taps utilisateur ; données saisies localement (pas d'import automatique de listes de coureurs par défaut).
- **Sorties** : Données stockées localement ; affichage écran ; export Excel (.xlsx) via partage natif ou téléchargement.
- **Dépendances externes** : Aucune obligatoire pour la version minimale ; [UNCERTAIN] hébergement, analytics, service backend futur.

## Hypothèses et incertitudes

- [ASSUMPTION] Usage principal en contexte terrain (gymnase, stade) avec tablette ou smartphone.
- [ASSUMPTION] Pas de connexion réseau fiable en permanence ; le stockage local est prioritaire.
- [UNCERTAIN] Synchronisation multi-appareils ou partage entre enseignants.
