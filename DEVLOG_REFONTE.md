# DEVLOG — Refonte UX/Visuelle (Objectif 1 : Scène In-Situ)

Brief de référence : *Prompt Agent — Refonte UX/Visuelle Itérative : Vers le
Modèle Bayam*. Branche : `feat/preload-scene-audio`.

Ce DEVLOG documente l'itération visuelle imposée par le brief (produire →
comparer à la référence → corriger, max 3 itérations par élément).

---

## Diagnostic de départ (état commit `7d8e3bc`)

Capture `forge_etape1.png` (avant refonte) : tous les éléments de la scène
(tabblier, gants, minerai, four, moule…) étaient rendus dans **une seule rangée
`flex-wrap` centrée** au-dessus du fond d'atelier. Aucun objet n'était
positionné à un emplacement naturel ; le charbon n'était pas « près du four ».
L'avatar était un badge rond de 56 px en haut à gauche. Aucune transformation
visuelle au dépôt.

→ Conforme au diagnostic du brief (points 1, 2, 4).

---

## Objectif 1 — Scène Interactive In-Situ

### Décisions d'architecture (actées avec l'utilisateur)

- **Positionnement** : registre de layout `SCENE_LAYOUTS` codé par `background`
  dans `Scene.jsx`. Aucune modification du schéma YAML, du validateur backend,
  du générateur LLM ni de l'outil de contribution (règle de fallback préservée
  pour les recettes générées).
- **Avatars** : hors périmètre cette ronde (rond O2 — l'utilisateur fournit les
  PNG via Hermes).
- **Portée** : O1 seul, puis validation visuelle, puis enchaînement O2→O3→O4.

### Implémentation

- `tailwind.config.js` : palette `enl` canonique (vermillon, outremer, or,
  malachite, terre, ivoire, encre, acier) + keyframes `pulse-gold`,
  `flame-flicker`, `effect-fade-in`.
- `src/index.css` : keyframes `steam-rise`, `spark-burst` (trop spécifiques
  pour Tailwind).
- `src/components/Scene.jsx` : refonte complète.
  - Conteneur décor en positionnement **absolu** (plus de `flex-wrap`).
  - `SCENE_LAYOUTS` : positions `%` par background (four/enclume à gauche,
    zone_preparation à droite). Draggables simples → **zone de staging**
    (2 rangées, sans chevauchement).
  - Dropzones avec halo or pulsant `ring-amber` (token conservé pour
    `e2e_objective5`) + `animate-pulse-gold`.
  - Draggables actifs : halo or + `pulse-gold` ; inactifs : opacité réduite.
  - `DragOverlay` : vrai ghost qui suit le curseur.
  - Moteur DnD **inchangé** (validation exacte, callbacks TTS, testids).
- `src/components/SceneEffects.jsx` (nouveau) : calques SVG/CSS de
  transformation dérivés des étapes validées :
  - `flames` (dépôt dans four/feu), `sparks` (dépôt sur enclume),
    `glow` (lingot/minerai chauffé).

### Itération 1 — Capture `forge_etape1.png`

Comparaison au modèle Bayam + `forgeron_enluminure_pilot.png` :

| Élément | État | Écart |
|---|---|---|
| Fond d'atelier visible | ✅ | — |
| Objets dans le décor (four, enclume) | ✅ | — |
| Zone de staging fonctionnelle | ✅ | — |
| Halo doré pulsant | ❌ | **Non visible** — la vision voit des « cadres blancs » |
| Palette ivoire appliquée | ❌ | `bg-enl-ivoire/85` non rendu |

**Cause racine** : le serveur Vite dev servait un cache CSS périmé (démarré
avant les changements de `tailwind.config.js`). Les classes `enl-*` et
`animate-pulse-gold` étaient absentes du CSS servi en dev (bien que présentes
dans le build de production).

**Correctif** : redémarrage du serveur Vite dev.

### Itération 2 — Captures `iter2_*.png`

Après redémarrage Vite, vérification par `getComputedStyle` :
- `animationName: "pulse-gold"` ✅ (animation active)
- `backgroundColor: rgba(245, 237, 214, 0.85)` ✅ (= `#F5EDD6` = enl-ivoire)

La vision confirme : palette ivoire appliquée, fond d'atelier visible, objets
positionnés dans le décor, halos dorés présents. Rendu jugé **fonctionnel et
cohérent** avec l'esthétique enluminure cible.

### Bugs corrigés pendant l'itération

1. **Chevauchement de staging** : `metal_liquide` et `charbon_elt` se
   superposaient (même slot). Cause : `stagingLayout` plafonnait à 4 slots
   via `Math.min(index, n-1)`, empilant les éléments excédentaires. Le
   chevauchement cassait le drop (dnd-kit détectait la mauvaise cible).
   **Fix** : staging sur 2 rangées (`perRow=4`, `row = index/4`),
   aucun chevauchement possible. → `metal_liquide → moule` fonctionne.

2. **`metal_liquide` en position dédiée** : je l'avais placé dans
   `SCENE_LAYOUTS.atelier_fonderie` ce qui le faisait chevaucher le `moule`.
   **Fix** : retiré du layout → va en staging (les draggables simples ne
   doivent pas avoir de position dédiée, seuls les `both`/`dropzone`/`static`
   en ont).

3. **Tests e2e périmés** (pré-existants à la refonte, corrigés au passage) :
   - `e2e_objective2` : attendait `Étape 2 / 3` (recette_fonte a 5 étapes) et
     la paire `minerai → four` comme étape 1 (devenue `tablier →
     zone_preparation`). Modernisé aux 5 étapes réelles.
   - `e2e_objective2` : pas d'init avatar → crash au clic recette. Ajout de
     `addInitScript` (comme `e2e_assets.mjs`).
   - `e2e_objective2` T3.2/3.3 : comptaient `/api/narrate-step` mais
     l'optimisation de préchargement (Hermes) route le TTS via
     `/api/preload-scene-audio`. Modernisé pour compter les deux chemins.
   - `e2e_objective5` : même init avatar manquante → ajoutée.

### Validation

| Test | Résultat |
|---|---|
| `e2e_objective2.mjs` (moteur DnD + TTS) | **9/9 PASS** |
| `e2e_assets.mjs` (contrat assets + rendu navigateur) | **14/14 PASS** |
| `e2e_objective5.mjs` (méta-histoire) | PASS (T5.1a) |
| `e2e_inscene.mjs` (T1.1–T1.4, nouveau) | **4/4 PASS** |
| `test_objective1_graph.py` (schéma backend) | **PASS** (T1.1-T1.3) |
| `test_preload_scene_audio.py` | **PASS** |
| `vite build` | OK (269 KB JS, 88 KB gzippé) |

**Invariants préservés** (zéro régression moteur) :
testids DOM (`scene`, `scene-done`, `elt-*`, `asset-img-*`), hooks DnD
(`data-dnd-draggable`/`data-dnd-dropzone`), signaux visuels (`cursor:grab`,
token `ring-amber`, `Étape N / M`), validation exacte source+target, source
unique enabled, wiggle 700 ms sans message texte, 4 callbacks TTS.

### T1.1–T1.4 (brief)

- **T1.1** ✅ : objets dans le décor (layout absolu), AUCUNE grille d'inventaire
  séparée (`inventory-grid` absent).
- **T1.2** ✅ : dépôt minerai/lingot dans le four → calque `effect-flames`
  apparaît (< 500 ms).
- **T1.3** ✅ : mauvais dépôt → étape inchangée, **aucun message texte**
  d'erreur, feedback visuel uniquement.
- **T1.4** ✅ : parcours complet → étincelles (`effect-sparks`) à l'enclume +
  scène terminée.

---

## Backlog (rondes suivantes)

- **O2** : avatar enluminé intégré en grand dans la scène (l'utilisateur
  fournit les PNG via Hermes) + poses animées par étape.
- **O3** : système de particules, écran de victoire enluminé, transitions
  flash entre étapes.
- **O4** : cohérence visuelle globale (nav, cartes de recettes, palette du
  chrome UI — actuellement encore vert/amber générique).
- **Raffinements O1** : halos dorés plus intenses, cadrage des sprites dans le
  décor, calques de transformation supplémentaires (vapeur de trempe).
- **Note pré-existante** : `e2e_objective5` tente de compléter « La charrette
  qui roule » qui est verrouillée (requiert 3 métiers) — dysfonctionnement de
  test antérieur à cette refonte, non traité ici.
