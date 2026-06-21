# RAPPORT MVP V2 — "L'Arbre des Savoirs" (Jeu de Scène Interactif)

Date : 2026-06-20
Statut : **LIVRÉ — tous les objectifs DONE, 0 échec.**

La V1 (livre audio passif) a été remplacée par la V2 : un **jeu de scène
interactif** où l'enfant agit (glisser-déposer) étape par étape, avec une
narration TTS qui réagit à chaque action, et une scène finale de célébration.

---

## 1. Synthèse des objectifs

| Objectif | Description | Statut | Tests |
| :--- | :--- | :--- | :--- |
| 1 | Graphe + scénarios interactifs | **DONE** | T1.1–T1.3 ✅ |
| 2 | Générateur de Scènes (drag-and-drop) | **DONE** | T2.1–T2.4 ✅ |
| 3 | Narration TTS Séquentielle | **DONE** | T3.1–T3.4 ✅ |
| 4 | Générateur de Scénarios LLM | **DONE** | T4.1–T4.3 ✅ |
| 5 | Méta-Histoire Visuelle | **DONE** | T5.1–T5.3 ✅ |
| 6 | Outil de contribution visuel | **DONE** | T6.1–T6.2 ✅ |

**18 tests d'acceptation : 18 PASS, 0 FAIL, 0 BLOCKED.** (+ régression audio PASS)

---

## 2. Détail des tests (exécution réelle)

### Objectif 1 — Graphe + Scénarios
- T1.1 ✅ 10 nœuds (≥8), 4 recettes (≥3), parsing OK.
- T1.2 ✅ 4 scénarios valides (background + elements + ≥2 steps).
- T1.3 ✅ Toutes les sources/targets référencent des elements valides **et de type compatible** (source ∈ {draggable, both}, target ∈ {dropzone, both}).

### Objectif 2 — Générateur de Scènes (drag-and-drop réel via Playwright)
- T2.1 ✅ Scène + décor (dégradé) + 3 draggables + 2 dropzones.
- T2.2 ✅ Draggable saisi et déplacé (mouse down→move→up).
- T2.3 ✅ Bonne source→target fait avancer ; scène terminée (Bravo).
- T2.4 ✅ Mauvaise target rejetée, reste à l'étape courante (feedback wiggle).

### Objectif 3 — Narration TTS Séquentielle
- T3.1 ✅ 12 `.mp3` générés sur le disque (instructions + succès).
- T3.2 ✅ instruction_tts synthétisé au chargement de chaque étape (7 appels /api/narrate-step).
- T3.3 ✅ success_tts synthétisé à la validation.
- T3.4 ✅ Prompt au format `{style EN}:{texte FR}`.

### Objectif 4 — Générateur de Scénarios LLM (appels GLM réels)
- T4.1 ✅ YAML valide généré (bg, 5 elements, 3 steps).
- T4.2 ✅ Toutes les sources sont draggables/both (réparation déterministe).
- T4.3 ✅ Prénom 'Léa' présent dans 6 textes TTS.

### Objectif 5 — Méta-Histoire Visuelle (3 scènes complétées par drag-drop + LLM + TTS)
- T5.1 ✅ Bloquée < 3 recettes ; débloquée après 3 (badge nav = 3).
- T5.2 ✅ 3 objets résultats affichés en emojis géants (≥2).
- T5.3 ✅ Résumé LLM (187 mots) + `<audio>` produit.

### Objectif 6 — Contribution visuelle
- T6.1 ✅ Éditeur d'étapes dynamique (1 → 3 étapes).
- T6.2 ✅ Scène validée backend + YAML téléchargé conforme au schéma scène.

---

## 3. Choix techniques (V2)

| Composant | Choix | Raison |
| :--- | :--- | :--- |
| Moteur de scène | `@dnd-kit/core` | Drag-and-drop fiable sous Playwright (Règle 4). |
| Style visuel | Emojis sur dégradés CSS | Règle 3 du prompt (pas de beaux assets). |
| Type d'élément | `draggable` / `dropzone` / `static` / **`both`** | `both` = un élément saisissable ET cible (ex: tronc qu'on pose puis qu'on scie). |
| LLM | z.ai `glm-4.6` (Anthropic-compatible), clé ZCode réutilisée | Déjà opérationnel. |
| TTS | gTTS fr-FR, par phrase courte | Gratuit, synthèse rapide (~3-5s par étape). |
| Résumé final | `meta_summary.py` (LLM court) | Scène de célébration. |
| Tests navigateur | Playwright + Chromium headless | Drag-and-drop *réellement* testé. |

---

## 4. Découvertes notables (debugging)

1. **Élément = un seul type** était trop restrictif : un objet peut devoir être à la fois saisi et cible (tronc, métal fondu). → Ajout du type `both` + défense en profondeur dans `validate_scenario` (exige maintenant la compatibilité de type source/target).
2. **Le LLM produit des scénarios incohérents** (source non-draggable). Plutôt que retry aléatoirement, **réparation déterministe** `_repair_element_types`.
3. **Bug cache audio V1 corrigé** (fix hash du contenu) — conservé et revalidé en V2.

---

## 5. Livrables

```
arbre-savoirs/
├── knowledge_graph.yaml          # Graphe + 4 scénarios interactifs
├── backend/
│   ├── graph_engine.py           # Moteur + validate_scenario (Obj. 1)
│   ├── llm_client.py             # Client LLM Anthropic-compatible
│   ├── tts_narrator.py           # TTS gTTS + hash anti-cache (Obj. 3)
│   ├── scenario_generator.py     # Générateur de scénarios LLM (Obj. 4)
│   ├── meta_summary.py           # Résumé de célébration (Obj. 5)
│   ├── main.py                   # API FastAPI (10 endpoints)
│   └── audio_out/                # .mp3 générés
├── frontend/
│   ├── src/
│   │   ├── App.jsx, api.js, useProgress.js, index.css
│   │   ├── components/Scene.jsx  # Moteur de scène dnd-kit (Obj. 2)
│   │   └── pages/ ScenePage, RecipeList, MetaStory, Contribute
│   └── tests/ e2e_objective{2,5,6}.mjs
├── tests/ test_objective{1,3,4}*.py + test_audio_unique.py
├── DEVLOG.md, BACKLOG.md, RAPPORT_MVP.md, README.md
```

---

## 6. Conclusion

Le MVP V2 incarne fidèlement la vision du "jeu de scène interactif" : l'enfant
incarne un artisan, accomplit des gestes concrets (jeter le minerai au four,
marteler l'acier, scier le bois) via glisser-déposer, guidé pas à pas par une
voix bienveillante, et célèbre ses créations dans une scène finale. L'outil de
contribution et le générateur LLM permettent d'enrichir le jeu sans coder.
Tous les tests sont au vert, exécutés réellement.
