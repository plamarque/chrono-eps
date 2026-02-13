# Workflow de documentation

## Rôle de ce document

Ce document décrit quand mettre à jour quel document, et comment maintenir la cohérence entre les documents normatifs et le code.

## Documents et moments de mise à jour

| Document | Mettre à jour quand… |
|----------|----------------------|
| **SPEC.md** | Le comportement fonctionnel change (nouvelles capacités, périmètre modifié, limites ajustées). |
| **DOMAIN.md** | Les entités, termes ou règles du domaine changent (nouveau concept, modification de relations). |
| **ARCH.md** | La structure technique, les composants ou la stack changent (nouveau composant, technologie, déploiement). |
| **ADR/** | Une décision d'architecture significative est prise — créer une nouvelle ADR numérotée. |
| **PLAN.md** | L'avancement, les tranches ou les tâches changent (uniquement tracking). |
| **ISSUES.md** | Un bug est identifié, une limitation connue, ou du travail est différé (uniquement tracking). |
| **DEVELOPMENT.md** | Les étapes de setup, les commandes ou les conventions de contribution changent. |

## Mode prescriptif vs descriptif

- **Bootstrap (projet neuf)** : SPEC, DOMAIN et ARCH sont **prescriptifs** — ils définissent ce que le système *doit* faire et *comment* il sera structuré. Marquer les choix non validés avec `[ASSUMPTION]` ou `[UNCERTAIN]`.
- **Regain de contrôle (code existant)** : SPEC, DOMAIN et ARCH commencent en mode **descriptif** — ils décrivent ce qui existe. Après stabilisation, on affine vers un contrat prescriptif.

Pour Chrono EPS : mode **bootstrap** — documents prescriptifs.

## Conventions

- Les documents normatifs ne doivent pas se contredire. En cas de conflit, harmoniser SPEC, DOMAIN et ARCH.
- Ne jamais documenter de fonctionnalités ou comportements non observables en mode descriptif.
- Les marqueurs `[ASSUMPTION]` et `[UNCERTAIN]` restent jusqu'à résolution ; les retirer une fois le choix validé ou implémenté.

## Référence

Pour les patterns et templates complets : voir le skill docs-governance-workflow et son fichier `reference.md`.
