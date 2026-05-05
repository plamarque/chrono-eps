# Spécification fonctionnelle

## Objet

Chrono EPS est une application web PWA destinée aux enseignants d'EPS pour chronométrer facilement les courses d'une classe entière. Elle permet d'enregistrer les passages de tours, d'identifier les coureurs et de conserver les performances sans feuille papier. Compatible tablettes et smartphones.

## Périmètre

- **Dans le périmètre :**
  - Interface moderne, épurée et fonctionnelle (voir ARCH.md, section « Principes d'interface »)
  - Chronomètre multi-coureurs pour une course
  - Enregistrement des passages de tours par coureur (mode relais) ; en mode **individuel**, cartes par coureur (grille type relais) : **Démarrer** lance le chrono principal et le premier coureur actif ; tant qu’aucun drapeau n’a été cliqué pour un coureur, la carte est considérée **mono-tour** et affiche le **Temps** qui défile (pas « Tour en cours », pas de liste de tours) ; le **Stop** d’une carte marque l’**arrivée** du coureur et fige son temps ; le **drapeau** d’une carte enregistre un **passage** (tour) et le coureur continue ; tant que le chrono principal tourne, un nouveau coureur peut être ajouté automatiquement derrière le dernier coureur actif ; **Arrêter** global finalise tous les coureurs encore en course sans créer de nouveau coureur ; après un passage enregistré au **drapeau**, le compteur principal reste **Temps** et affiche la somme des tours validés, tandis qu’un compteur près du drapeau affiche le **prochain tour à capturer** (ex. « Tour 2 : 00:12.34 ») ; chaque carte a **Play/Stop** et un **drapeau** pour enregistrer d’autres **tours**
  - Mode relais : groupes de coureurs ; l'ordre cycle sur les coureurs ; la course continue jusqu'à l'arrêt par le professeur ; **hors course**, la configuration s’ouvre **uniquement** depuis l’**en-tête coloré** du groupe (le corps de carte ne déclenche pas la modale, pour cohérence avec l’individuel et pour réduire les faux taps) ; **pendant qu’un groupe est en course** (`running`), la configuration du groupe (modale prénoms / couleur / suppression) est **verrouillée** pour éviter les faux taps ; **zone tactile du drapeau** de passage dimensionnée pour le terrain
  - Configuration : jusqu'à 8 groupes, nom et couleur du groupe (chasubles, 6 couleurs réutilisées cycliquement), déclaration des noms des coureurs dans l'ordre du premier tour ; **libellés par défaut en relais** : « Coureur 1 », « Coureur 2 », … **par groupe** (chaque nouveau groupe recommence à Coureur 1 ; identifiant interne du coureur distinct du libellé) ; **suppression de coureurs** : chaque coureur peut être supprimé individuellement ; le groupe conserve au moins un coureur ; suppression interdite si le groupe a des passages (configuration avant course)
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

## Évolution validée (Slice 17, à implémenter)

### Mode capture terrain mono-tour (overlay central)

Objectif: permettre la capture d'arrivées en situation terrain sans viser des actions par carte.

- Activation en mode individuel, après démarrage de la session:
  - overlay plein écran
  - bouton central large `Capture temps` (icône stop)
  - bouton discret en bas à droite `Fin de session`
- Tant que l'overlay est actif:
  - toutes les autres actions de l'écran sont inactives
  - chaque tap sur `Capture temps`:
    1) finalise le coureur actif (arrivée, mono-tour)
    2) crée le coureur suivant
    3) démarre immédiatement ce coureur suivant
- Tap sur `Fin de session`:
  - finalise les coureurs encore actifs
  - ferme l'overlay
  - repasse en mode édition/consultation (renommage, suppression d'un coureur superflu, etc.)

Contraintes de la slice:

- Mono-tour uniquement dans ce mode (multi-tour hors scope).
- Temps affiché par coureur = temps total absolu à l'arrivée depuis le départ global.
- Un seul coureur actif logique à la fois.

### Contrat UX de l'overlay

États:

1. **Armé** (session lancée, overlay visible):
   - bouton `Capture temps` actif
   - bouton `Fin de session` actif
   - contrôles hors overlay inactifs (chrono, édition cartes, navigation destructive)
2. **Capture en cours** (tap traité):
   - anti-double-tap court (protection contre multi-clic involontaire)
   - enregistrement atomique: arrivée courante puis création/démarrage du suivant
3. **Terminé** (fin de session):
   - overlay masqué
   - contrôles standards restaurés
   - post-édition autorisée (renommage, suppression coureur non utilisé)

Règles d'activation/désactivation:

- Activation: uniquement en mode individuel quand la session est démarrée.
- Désactivation: uniquement via `Fin de session` ou fin explicite de course.
- Pendant l'overlay, aucune autre action ne doit modifier l'ordre de capture.

## Capacités principales

1. **Chronomètre multi-coureurs** — L'enseignant lance une course ; le temps affiché reflète le maximum des temps coureurs en cours ou figés. **Mode individuel** : **Démarrer** lance la course avec le coureur actif ; le **Stop carte** marque l’arrivée du coureur ; le **drapeau carte** enregistre un passage ; tant que la course globale tourne, ces actions peuvent déclencher l’ajout automatique du coureur suivant ; **Arrêter** global finalise les coureurs encore en course sans auto-ajout. **Play/Stop**, **drapeau** et **Arrêter** complètent les enregistrements de tours. **Mode relais** : un chronomètre commun par groupe ; démarrage/arrêt par groupe comme auparavant.
2. **Enregistrement des passages** — **Relais** : à chaque passage, tap sur le groupe ; l'heure est associée au tour et au coureur du cycle. **Individuel** : avant le premier drapeau, le temps affiché sur une carte en course est **Temps** ; tap drapeau sur la carte d'un coureur dont le chrono est en **course** pour figer le tour courant, ajouter ce tour au **Temps**, puis afficher à côté du drapeau le temps du prochain tour à capturer ; pas de `studentIndex` (un seul coureur logique par carte). Les données déjà enregistrées restent lisibles et exportables.
3. **Identification des coureurs** — **Individuel** : renommage après coup **uniquement** depuis l’en-tête coloré de la carte (le corps de carte ne déclenche pas la modale) ; **pendant que le chrono de ce coureur est en course** (`running`), la modale de renommage / couleur est **inaccessible** (parité avec le relais). **Relais** : configuration des noms et couleurs **uniquement** depuis l’en-tête du groupe ; la modale est **inaccessible** tant que le groupe est **en course** (`running`).
4. **Stockage des performances** — Les performances (temps, tours complétés) sont conservées localement ; l'historique est consultable ; les courses peuvent être chargées (affichage lecture seule avec temps total), supprimées ou servir de base à une nouvelle course. **Vue détail d'une course individuelle (historique)** : le nom et la couleur d'un coureur peuvent être modifiés après coup (même interaction que sur l'accueil : double-clic ou crayon, sans suppression de ligne ni changement des temps).
5. **UI adaptée tablettes et smartphones** — Interface tactile, optimisée pour écran mobile et tablette, sans feuille papier.
6. **Mode relais** — Chaque participant est un groupe de coureurs ; les coureurs courent l'un après l'autre en cycle ; configuration coureurs et couleurs (y compris libellés par défaut locaux « Coureur 1 »… par groupe) **uniquement depuis l’en-tête** hors course ; pendant le **running** du groupe, pas d’ouverture de la modale de configuration ; affichage « Couru » / « Prochain » ; la course continue jusqu'à l'arrêt par le professeur.
7. **Replay visuel** — Les courses sauvegardées peuvent être rejouées visuellement : piste virtuelle ovale, marqueurs colorés par participant ou groupe, position interpolée entre passages, nom du coureur actuel en mode relais ; contrôles play, pause et curseur temporel.
8. **Capture terrain mono-tour (Slice 17)** — En mode individuel, un overlay centralise la capture des arrivées: bouton principal `Capture temps` pour enchaîner les arrivées et auto-créer le coureur suivant, bouton `Fin de session` pour clôturer la course et revenir en post-édition.

## Actions « Nouvelle course » et « Dupliquer »

Deux actions distinctes permettent de repartir sur une nouvelle course :

| Bouton | Emplacement | Effet | Quand visible |
|--------|-------------|-------|---------------|
| **Nouvelle course** | Barre d'outils (en haut à gauche, même ligne que Relais/Individuel) | Réinitialisation complète : efface participants, groupes, passages et chrono ; repart sur une course vierge (1 groupe avec 1 coureur par défaut en mode relais, ou **1 coureur (Coureur 1)** par défaut en mode individuel) | Toujours sur l'écran d'accueil |
| **Dupliquer** | Sous le chronomètre (à la place de Réinitialiser) | Conserve participants et groupes ; efface uniquement les temps et passages ; permet de refaire une course avec la même configuration | Quand une course chargée a des passages ou a été lancée (pas une course « préparée » sans run) |
| **Réinitialiser** | Sous le chronomètre | Conserve la configuration ; remet le chrono à zéro et efface les passages ; dialogue de confirmation si un temps a été mesuré ou s'il existe des passages (sinon action immédiate) | Quand le chrono est en pause et que le bouton affiché n'est pas « Dupliquer » (course chargée avec passages ou lancée) |

Dialogue de confirmation : « Nouvelle course » et le switcher Relais/Individuel affichent le même dialogue si une configuration en cours serait perdue. « Réinitialiser » sur l'accueil (hors libellé « Dupliquer ») affiche un dialogue dédié lorsqu'un temps ou des passages seraient effacés ; les boutons d'action sont libellés pour éviter l'ambiguïté avec le bouton chronomètre. Quitter l'écran d'accueil (lien Historique ou autre navigation) avec une session non enregistrée au même sens affiche un dialogue (Quitter / Rester) ; pas de dialogue lorsque la course affichée est une course déjà enregistrée en lecture seule (données persistées).

## Comportement

- **Entrée** : **Relais** : configuration des groupes et coureurs **uniquement depuis l’en-tête** (verrouillée pour un groupe tant que son chrono est en course), lancement du chrono, enregistrement des passages par tap sur les groupes. **Individuel** : une carte **Coureur 1** par défaut ; lancement global ; le **Stop carte** sert d’arrivée ; le **drapeau carte** enregistre les passages ; l’ajout de coureurs se fait automatiquement dans le flux de course ; renommage **uniquement depuis l’en-tête**, **pas pendant** le `running` du coureur concerné.
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
