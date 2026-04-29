# Screenshots — Chrono EPS

Captures d'écran pour les fiches App Store et Play Store.

## Structure

| Dossier | Usage |
|--------|-------|
| `ios/iphone/` | App Store — iPhone 6.5" (1284×2778 px) |
| `ios/ipad/` | App Store — iPad 13" (2732×2048 px paysage) |
| `android/smartphone/` | Play Store — smartphone (1080×1920 px portrait) |
| `android/tablet/` | Play Store — tablette (1920×1080 px paysage) |

Le script utilise des viewports logiques (CSS pixels) avec `deviceScaleFactor` pour produire les résolutions requises : viewport × deviceScaleFactor = résolution image.

## Génération automatisée

```bash
npm run screenshots
```

Le script Playwright génère tous les écrans dans les résolutions requises. Il lance le build, le serveur preview, puis capture chaque scénario.

**Écrans générés :** `relais`, `indiv`, `indiv-enregistrer`, `indiv-eleve`, `indiv-course`, `historique`, `groupe`, `groupe-perf`, `course`, `replay`

- `indiv-course` : mode individuel en direct, 12 arrivées enregistrées via le bouton **Arrivée** du chronomètre
- Courses relais : 5 groupes minimum
- Courses individuelles : 12 arrivées minimum (scénario `indiv`)
- Historique : 5 courses avec noms réalistes (2x500m - Terminale 1, 1500m - Second B, Cross 2km - Epreuve, Relais 4x100m - 3e, Demi-fond 800m - Première)

**Convention de nommage :** `chrono-eps-<ecran>-<device>-<orientation>.png`

| Dossier | Suffixe |
|---------|---------|
| `ios/iphone/` | `-iphone-portrait` |
| `ios/ipad/` | `-ipad-paysage` |
| `android/smartphone/` | `-smart-portrait` |
| `android/tablet/` | `-tablet-paysage` |

**Option :** `SCREENSHOTS_URL=https://plamarque.github.io/chrono-eps npm run screenshots` pour cibler une URL (ex. prod) au lieu du preview local.

## Régénération manuelle

- **iOS** : via simulateur Xcode (voir [docs/PUBLISHING_STORES.md](../../docs/PUBLISHING_STORES.md#53-générer-les-screenshots))
- **Android** : captures manuelles ou simulateur, tailles selon Play Console (voir [Annexe B](../../docs/PUBLISHING_STORES.md#annexe-b--spécifications-des-screenshots-référence))
