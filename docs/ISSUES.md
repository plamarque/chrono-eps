# Issues — bugs, limitations, travail différé

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

**Problème :** En mode individuel, les boutons Stop et Tour sont trop proches, ce qui augmente le risque d'appui involontaire pendant la saisie.

**État :** Résolu

**Solution :** Dans `TableauPassagesCompact.vue`, la rangée d'actions utilise désormais `justify-content: space-between` avec largeur complète, Stop à gauche et Tour à droite, espacement augmenté (`gap: 0.75rem`) et tailles tactiles portées à 44px.

### [UX] Perte de configuration au changement de mode sans enregistrer

**Problème :** En mode relais avec des groupes configurés (ou en mode individuel avec chrono en cours), un clic accidentel sur l'autre mode faisait perdre toute la configuration sans avertissement.

**État :** Résolu

**Solution :** Dialogue de confirmation (PrimeVue ConfirmDialog) affiché uniquement si le changement ferait perdre une configuration non sauvegardée (groupes, participants, passages, chrono en cours). Boutons Continuer / Annuler, Annuler en style secondaire.

## iOS / App Store Connect

### [iOS] Mise à jour SDK requise avant avril 2026

**Problème :** App Store Connect avertit (ITMS-90725) : à partir du 28 avril 2026, les apps doivent être compilées avec un SDK plus récent (iOS 26 / Xcode 26 selon le message, probablement une erreur de libellé).

**État :** Différé

**Impact :** Actuellement build avec iOS 18.5 SDK (macos-15, Xcode 16). Livraison OK. À traiter avant la date limite en passant à un runner macOS/Xcode plus récent dans le workflow.
