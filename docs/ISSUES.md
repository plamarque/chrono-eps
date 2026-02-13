# Issues — bugs, limitations, travail différé

## UX

### [UX] Utilisation insuffisante du viewport

**Problème :** L’UI ne s’étend pas sur l’espace disponible. La hauteur et la largeur de la zone utile sont contraintes.

**État :** Ouvert

**Pistes :** Adapter `HomeView` (supprimer ou assouplir `max-width: 36rem`, gérer le flex/height) et les styles globaux pour exploiter au maximum le viewport (100vh, 100vw ou équivalent).
