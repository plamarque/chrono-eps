# Processus iOS — Screenshots et build App Store

Guide pas à pas pour regénérer les screenshots et le build iOS pour la soumission sur l'App Store Connect.

## Prérequis

- Mac avec Xcode installé
- Compte Apple Developer actif
- Runtime iOS installé (Xcode → Settings → Platforms → iOS)
- Projet iOS dans `ios/` (généré via PWABuilder)

---

## 1. Ouvrir le projet

```bash
open ios/Chrono\ EPS.xcworkspace
```

**Important** : ouvrir le `.xcworkspace`, pas le `.xcodeproj` (le projet utilise CocoaPods).

---

## 2. Générer les screenshots

### 2.1 Screenshots iPhone

1. Dans la barre d'outils Xcode, cliquer sur le sélecteur de destination (ex. « My Mac (Mac Catalyst) »).
2. Choisir **iPhone 17 Pro Max** (ou un simulateur iPhone équivalent).
3. Lancer l'app : **Cmd+R**.
4. Attendre le chargement de la PWA dans le simulateur.
5. Naviguer dans l'app pour afficher les écrans à capturer :
   - Chrono / mode individuel
   - Mode relais
   - Historique
   - Replay
   - Etc.
6. **Capture** : **Cmd+S** dans le simulateur (ou clic droit → Save Screen).
7. Les PNG sont sauvegardés sur le **Bureau** par défaut.
8. Déplacer les captures dans `public/screenshots/ios/iphone/` avec des noms explicites (ex. `chrono-eps-iphone-historique.png`).

**Tailles App Store** : iPhone 6.5" = 1284×2778 px (portrait). Le simulateur iPhone 17 Pro Max produit des dimensions conformes.

### 2.2 Screenshots iPad

1. Arrêter le simulateur : **Cmd+.**.
2. Choisir **iPad Pro 13-inch (M5)** ou **iPad Air 13-inch (M3)**.
3. Lancer : **Cmd+R**.
4. Capturer les mêmes écrans avec **Cmd+S**.
5. Déplacer vers `public/screenshots/ios/ipad/`.

**Tailles App Store** : iPad 13" = 2048×2732 px (portrait) ou 2732×2048 px (paysage).

---

## 3. Créer l'archive (build)

1. Sélectionner **Any iOS Device (arm64)** comme destination (section « Build » du menu).
2. Menu **Product → Archive**.
3. Si une fenêtre demande un mot de passe : saisir le **mot de passe de session macOS** (pour accéder au Keychain / certificat de développement). Optionnel : cocher « Toujours autoriser ».
4. Si erreur de signature :
   - Cliquer sur le projet **Chrono EPS** dans la sidebar
   - Target **Chrono EPS** → onglet **Signing & Capabilities**
   - Cocher **Automatically manage signing**
   - Sélectionner votre **Team** (compte Apple Developer)
5. Attendre la fin de la compilation.
6. L'**Organizer** s'ouvre automatiquement.

---

## 4. Uploader vers App Store Connect

1. Dans **Organizer** (Window → Organizer si fermé), sélectionner l'archive créée.
2. Cliquer **Distribute App**.
3. Choisir **App Store Connect** → Next.
4. Choisir **Upload** → Next.
5. Accepter les options par défaut → Next.
6. Sélectionner le profil de distribution → Next.
7. Cliquer **Upload**.
8. Attendre la fin (quelques minutes).
9. Le build apparaît dans App Store Connect après traitement (15–30 min ou plus).

---

## 5. Compléter App Store Connect

1. Aller sur [App Store Connect](https://appstoreconnect.apple.com/).
2. Sélectionner l'app **Chronomètre EPS** → Version iOS 1.0 (ou la version en cours).
3. Remplir le formulaire avec le contenu de [APP_STORE_CONNECT_CONTENT.md](APP_STORE_CONNECT_CONTENT.md).
4. Téléverser les screenshots depuis `public/screenshots/ios/` :
   - iPhone : onglet Phone → 6.5" Display
   - iPad : onglet iPad → 13" Display
5. Sélectionner le build uploadé dans la section « Build ».
6. Renseigner les informations de contact pour App Review.
7. Soumettre pour révision.

---

## Structure des screenshots

```
public/screenshots/
├── ios/                    # App Store (iPhone + iPad)
│   ├── iphone/
│   └── ipad/
└── android/                # Play Store
    ├── smartphone/
    └── tablet/
```

Les screenshots iOS sont conservés dans `public/screenshots/ios/` pour pouvoir les réutiliser lors des mises à jour sur l'App Store.

---

## Références

- [PUBLISHING_STORES.md](PUBLISHING_STORES.md) — vue d'ensemble publication stores
- [APP_STORE_CONNECT_CONTENT.md](APP_STORE_CONNECT_CONTENT.md) — texte à copier-coller
- [App Store Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
