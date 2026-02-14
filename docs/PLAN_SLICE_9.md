# Plan détaillé — Slice 9 Performances détaillées

## Contexte

Le panneau **Performances** affiche actuellement un résumé (nombre de tours, dernier total). Le Slice 9 exige une **liste explicite des temps de passage par tour** (P1, P2, P3, …) pour chaque participant ou groupe.

### Mode relais — Spécification utilisateur

En mode relais, l'affichage doit être :

1. **Temps total du groupe** (en premier)
2. **Liste des élèves** — pour chaque élève, sur **une seule ligne** :
   - Durée de chaque passage (P1, P2, …)
   - **Total** : somme des laps de l'élève (temps cumulé personnel)

---

## État actuel

| Mode | Fichier | Affichage Performances |
|------|---------|------------------------|
| Individuel | TableauPassages.vue | `nbTours` + `dernierTotalMs` uniquement |
| Relais | TableauPassagesRelay.vue | Header (nb passages, total) + liste chronologique nom élève + lapMs par passage |

### Structure des données (relais)

```js
// Chaque passage : { tourNum, lapMs, totalMs, studentIndex }
// studentIndex = indice de l'élève dans le groupe (0, 1, 2, ... cyclique)
passagesByParticipant[groupId] = [
  { tourNum: 1, lapMs: 30000, totalMs: 30000, studentIndex: 0 },  // Alice
  { tourNum: 2, lapMs: 28000, totalMs: 58000, studentIndex: 1 },  // Bob
  { tourNum: 3, lapMs: 27000, totalMs: 85000, studentIndex: 2 },  // Claire
  { tourNum: 4, lapMs: 29000, totalMs: 114000, studentIndex: 0 }  // Alice (2e passage)
]
```

---

## Tâches d'implémentation

### 1. Mode individuel — TableauPassages.vue

- Étendre `performancesByParticipant` pour inclure `passagesList: [{ label: 'P1', lapMs }, …]`
- Adapter le template : conserver résumé + ajouter liste P1, P2, P3…

### 2. Mode relais — TableauPassagesRelay.vue

**Nouvelle fonction `getPerformancesByStudent(groupId)`** :

- Grouper les passages par `studentIndex` (ordre des élèves)
- Pour chaque élève : `{ nom, passages: [{ pNum, lapMs }], totalLapMs }` (totalLapMs = somme des lapMs)
- Total du groupe = `totalMs` du dernier passage

**Structure du rendu** (section Performances) :

- **En-tête** : nom du groupe + **temps total du groupe**
- **Pour chaque élève** : une ligne contenant
  - Nom de l'élève
  - P1: xx  P2: xx  … (durée de chaque passage)
  - **Total** : temps cumulé de l'élève (somme de ses laps)

**Exemple avec 3 élèves (Alice, Bob, Claire), 4 passages** :

```
Groupe Rouge
Total : 01:54.00

Alice   P1: 00:30  P2: 00:29  Total : 00:59
Bob     P1: 00:28  Total : 00:28
Claire  P1: 00:27  Total : 00:27
```

Remplacer l'affichage chronologique actuel dans la section Performances par cette vue regroupée par élève. Conserver `getPassagesList` pour les cartes individuelles des groupes (corps de la carte).

### 3. Tests unitaires

- Mettre à jour les tests TableauPassages.spec.js pour P1, P2, P3
- TableauPassagesRelay.spec.js : section Performances (P1, P2, Total par élève)

### 4. Mise à jour doc

- Cocher les tâches du Slice 9 dans docs/PLAN.md

---

## Rendu attendu

**Mode individuel** :

```
Alice
2 tours · Dernier : 00:58.00
P1 : 00:30.00
P2 : 00:28.00
```

**Mode relais** :

```
Groupe Rouge
Total : 01:54.00

Alice   P1: 00:30  P2: 00:29  Total : 00:59
Bob     P1: 00:28  Total : 00:28
Claire  P1: 00:27  Total : 00:27
```

---

## Ordre d'exécution

1. Mode individuel (TableauPassages.vue)
2. Tests TableauPassages.spec.js
3. Mode relais (TableauPassagesRelay.vue)
4. Mise à jour PLAN.md
