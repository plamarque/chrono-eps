# Issues — bugs, limitations, travail différé

## Bugs

### [Relais] Temps non enregistrés à l'arrêt du chronomètre

**Problème :** En mode relais, après Démarrer puis Arrêter (bouton principal du chronomètre), les temps n'étaient pas enregistrés dans les passages.

**État :** Résolu

**Solution :** `stopAll()` appelle désormais `recordPassage(id)` pour chaque participant en cours avant de les mettre en pause (aligné sur `stopParticipant`).

## PWA

### [PWA] Icône 512 px non precachée

**Problème :** L'icône 512x512 dépasse la limite Workbox (2 MiB) et n'est pas mise en cache pour le mode offline.

**État :** Différé

**Impact :** En installation PWA, l'icône haute résolution est chargée à la demande. L'icône 192px est precachée. Comportement acceptable pour le MVP.

## UX

### [UX] Temps en direct dans les cellules de tour

**Problème :** Les cellules tappables du tableau des passages n’affichaient que l’icône drapeau, sans les temps en cours.

**État :** Résolu

**Solution :** Affichage du temps du tour en cours et du temps total qui défilent en direct dans les cellules tappables, en plus de l’icône pour enregistrer le passage.

### [UX] Utilisation insuffisante du viewport

**Problème :** L’UI ne s’étend pas sur l’espace disponible. La hauteur et la largeur de la zone utile sont contraintes.

**État :** Résolu

**Pistes :** Adapter `HomeView` (supprimer ou assouplir `max-width: 36rem`, gérer le flex/height) et les styles globaux pour exploiter au maximum le viewport (100vh, 100vw ou équivalent).

### [UX] Texte « Enregistrez un passage… » à supprimer

**Problème :** Le message « Enregistrez un passage (bouton « Tour » ou tap sur une cellule) pour pouvoir enregistrer » s'affiche dans la barre d'actions de `HomeView.vue` (l.329, classe `home-save-hint`) et doit être retiré. Le `:title` du bouton Enregistrer (l.325) contient une formulation proche et pourra être ajusté ou supprimé en même temps.

**État :** Résolu

**Solution :** Suppression du span `home-save-hint`, du `:title` du bouton Enregistrer et du style `.home-save-hint`.

### [UX] Supprimer libellé « Relais » au-dessus des groupes

**Problème :** Supprimer le libellé « Relais » affiché au-dessus des groupes dans `TableauPassagesRelay.vue` ligne 160 (`<div class="tableau-passages-title">Relais</div>`).

**État :** Résolu

**Solution :** Suppression du div `tableau-passages-title` contenant « Relais » dans `TableauPassagesRelay.vue`.

### [UX] Espacer les boutons Stop et Tour en mode individuel

**Problème :** En mode individuel, les boutons Stop et Tour étaient trop proches sur les cartes coureur.

**État :** Supersédé — l'UX individuel terrain est en **cartes type relais** (Play/Stop, drapeau, tours) ; ajout par le bouton **Coureur** au chronomètre, total initial = chrono principal au clic (voir SPEC / ARCH).

### [UX] Perte de configuration au changement de mode sans enregistrer

**Problème :** En mode relais avec des groupes configurés (ou en mode individuel avec chrono en cours), un clic accidentel sur l'autre mode faisait perdre toute la configuration sans avertissement.

**État :** Résolu

**Solution :** Dialogue de confirmation (PrimeVue ConfirmDialog) affiché uniquement si le changement ferait perdre une configuration non sauvegardée (groupes, participants, passages, chrono en cours). Boutons Continuer / Annuler, Annuler en style secondaire.

## iOS / App Store Connect

### [iOS] Mise à jour SDK requise avant avril 2026

**Problème :** App Store Connect avertit (ITMS-90725) : à partir du 28 avril 2026, les apps doivent être compilées avec le **SDK iOS 26** (Xcode 26).

**État :** Fait — workflows `build-ios` et `promote-ios` utilisent le runner `macos-26` (Xcode 26 / iOS 26 SDK).

**Impact (avant correctif) :** Build avec iOS 18.x SDK sur `macos-15` ; avertissement puis blocage possible après la date limite.

## Évolutions potentielles

### [Relais] Réinitialiser ou modifier manuellement le temps d'un joueur

**Contexte :** La suppression d'un coureur dans un groupe relais est interdite dès que le groupe a des passages. Pour débloquer ce cas ou corriger des erreurs de saisie, il faudrait permettre de réinitialiser ou modifier manuellement le temps d'un joueur sur une course.

**État :** À évaluer à l'usage (retours terrain)
