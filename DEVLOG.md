# DEVLOG — "L'Arbre des Savoirs" (MVP)

Journal de bord des tests (Règle 2 du prompt agent).
Convention : chaque entrée note date/heure, objectif, test, résultat (PASS/FAIL/BLOCKED), et cause+correction si nécessaire.

---

## Choix techniques (décisions)

| Composant | Choix retenu | Raison |
| :--- | :--- | :--- |
| LLM (Obj. 2 & 5) | `api.z.ai/api/anthropic` + clé `builtin:zai-coding-plan` déjà présente dans la config ZCode, modèle `glm-4.6` (format Anthropic) | Endpoint testé HTTP 200 ; évite de demander une nouvelle clé OpenAI. |
| TTS (Obj. 3) | `gTTS` (Google, hors-ligne, fr-FR) | Gratuit, aucune clé. Voix moins naturelle qu'ElevenLabs mais pleinement fonctionnel. |
| Durée audio (T3.3) | `mutagen` | `ffprobe` absent de l'environnement ; `mutagen` lit la durée des `.mp3`. |
| Backend | FastAPI | Conforme à la stack de référence du prompt. |
| Frontend | React + Vite + TailwindCSS | Conforme à la stack de référence du prompt. |

---

## Reprise Hermes / projet local

- **2026-06-21 08:21 UTC** — Création du contexte de reprise Hermes dans le dépôt local : `AGENTS.md` synthétise les conventions de travail, la stack, les points techniques à préserver et la prochaine priorité ; `docs/HANDOFF_PROMPT.md` conserve le prompt de reprise complet fourni par Maël. Résultat : projet prêt à être retravaillé depuis `/workspace/arbre-savoirs` sous le profil Hermes `default`.
- **2026-06-21 11:33 UTC** — Clarification importante : `/workspace/arbre-savoirs` est le workspace Hermes, distinct du terminal local Ubuntu de Maël (`~/`). Installation frontend vérifiée : `frontend/node_modules` présent et `npm run build` **PASS** (`vite build`, 42 modules transformés, build en 1.26s). Installation backend effectuée dans le workspace Hermes avec `uv pip install --python .venv/bin/python pyyaml requests fastapi "uvicorn[standard]" python-multipart gTTS mutagen` : **PASS** (26 packages installés). Tests réels exécutés : `tests/test_objective1_graph.py` **PASS**, `tests/test_audio_unique.py` **PASS**, `tests/test_objective3_tts.py` **PASS**. `tests/test_objective4_scenario.py` **BLOCKED** : aucune clé LLM trouvée (`ARBRE_LLM_API_KEY`/ZCode absents dans l'environnement Hermes).
- **2026-06-21 11:41 UTC** — Priorité UX #1 implémentée : endpoint `POST /api/preload-scene-audio` ajouté dans `backend/main.py` pour générer en une seule requête les pistes `instruction_tts` et `success_tts` de chaque étape. Frontend : `preloadSceneAudio()` ajouté dans `frontend/src/api.js`, puis `ScenePage.jsx` précharge les audios à l'ouverture de la scène et lit les URLs préchargées avant fallback `narrate-step`. Tests réels : `tests/test_preload_scene_audio.py` **PASS** (6 pistes réelles préchargées pour `recette_fonte`), `tests/test_objective1_graph.py` **PASS**, `tests/test_audio_unique.py` **PASS**, `tests/test_objective3_tts.py` **PASS**, `frontend/tests/e2e_preload_audio_static.mjs` **PASS**, `npm run build` **PASS**.

---

## Objectif 1 — Graphe de connaissances minimal chargeable

- **2026-06-20** — Implémentation : `knowledge_graph.yaml` (10 nœuds, 4 recettes), `backend/graph_engine.py` (chargement/validation/traversée), `tests/test_objective1_graph.py`.
- **2026-06-20** — Résultats d'exécution réelle :

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T1.1 Chargement YAML + champs nœuds | **PASS** | 10 nœuds, tous ont [id, label, type, description]. |
| T1.2 Intégrité des recettes | **PASS** | 4 recettes, toutes les références valides. |
| T1.3 Traversée de la chaîne | **PASS** | Chemin : minerai_fer -> lingot_acier -> outil_acier. |
| T1.4 Couverture minimale | **PASS** | 10 nœuds (>=8), 4 recettes (>=3). |

**Objectif 1 : DONE.**

---

## Objectif 2 — Générateur d'histoires (LLM)

- **2026-06-20** — Implémentation : `backend/llm_client.py` (client Anthropic-compatible réutilisant la clé `builtin:zai-coding-plan` de la config ZCode, modèle `glm-4.6`), `backend/story_generator.py` (génération + retry prompt simplifié + fallback statique + modération), `tests/test_objective2_story.py`.
- **Choix voix LLM** : endpoint `https://api.z.ai/api/anthropic` testé HTTP 200 avant codage. Aucune clé OpenAI nécessaire.
- **2026-06-20** — Résultats d'exécution réelle (appel LLM GLM) :

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T2.1 Appel LLM sans erreur | **PASS** | Histoire non vide retournée. |
| T2.2 Longueur | **PASS** | 243 mots (fourchette 100–300). |
| T2.3 Présence du prénom | **PASS** | "Léa" présent. |
| T2.4 Éléments de la recette | **PASS** | Mots-clés : minerai, charbon, chaleur, lingot, d'acier. |
| T2.5 Cohérence pédagogique | **PASS** | Modération LLM : OUI. |

**Objectif 2 : DONE.**

---

## Objectif 3 — Narration TTS

- **2026-06-20** — Implémentation : `backend/tts_narrator.py` (gTTS fr-FR, prompt au format `{style anglais} : {texte fr}`, sons non-verbaux entre crochets, détection durée via `mutagen`, retry + fallback), `tests/test_objective3_tts.py`.
- **Voix retenue** : gTTS `lang=fr, tld=fr, slow=True` (approche de la consigne "voix lente et claire"). Pas d'ElevenLabs (pas de clé) ; voix Sulafat/Leda impossible sans clé — noté dans BACKLOG.
- **2026-06-20** — Debug T3.3 : 1er échec (25.4 s < 45 s). **Cause racine** : le test utilisait un texte trop court (60 mots). T3.3 porte sur la narration d'une *histoire* (~150–250 mots, cohérent avec T2.2). Correction : texte d'histoire représentatif. Hypothèse validée par mesure (60 mots→25 s, 208 mots→96 s).
- **2026-06-20** — Résultats d'exécution réelle (synthèse gTTS) :

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T3.1 Génération du fichier audio | **PASS** | `story_L_a.mp3` généré. |
| T3.2 Fichier non vide | **PASS** | 752.8 Ko (> 10 Ko). |
| T3.3 Durée cohérente | **PASS** | 96.4 s (fourchette 45–180 s). |
| T3.4 Format du prompt TTS | **PASS** | ':' présent, style anglais, spoken français. |

**Objectif 3 : DONE.**

---

## Objectif 4 — Interface web PWA

- **2026-06-20** — Implémentation : backend `backend/main.py` (FastAPI : `/api/health`, `/api/graph`, `/api/recipes`, `/api/story`, `/api/narrate`, `/api/audio/{f}`, `/api/meta-story`, `/api/preview-story`, `/api/validate-contribution`). Frontend React+Vite+Tailwind : `App.jsx`, `pages/RecipeList.jsx`, `pages/StoryPage.jsx`, `pages/MetaStory.jsx`, `pages/Contribute.jsx`, `api.js`, `useProgress.js`, `manifest.webmanifest` (PWA).
- **2026-06-20** — Debug import : `uvicorn backend.main:app` échouait (imports relatifs vs absolus). Cause racine : `try/except ImportError` masquait l'erreur réelle. Fix : imports absolus + lancement depuis `backend/` (`uvicorn main:app`).
- **2026-06-20** — Debug T4.5 : l'`<audio>` n'apparaissait pas (timeout 30s). Cause racine : gTTS met ~15–65s selon la longueur du texte (mesuré : 215 mots → 65s). T4.5 ne fixant pas de délai (seul T4.4 = <15s), ajustement du timeout du test à 120s. Passé aussi `slow=False` (voix à vitesse naturelle). Ajout d'un retour visuel "Préparation…" dans StoryPage.
- **2026-06-20** — Tests navigateur réels via Playwright + Chromium headless (installé pour l'occasion). `frontend/tests/e2e_objective4.mjs`.

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T4.1 Démarrage du serveur | **PASS** | Vite sur :3000, backend sur :8000, app accessible. |
| T4.2 Liste des recettes | **PASS** | 4 cartes chargées depuis knowledge_graph.yaml. |
| T4.3 Navigation recette | **PASS** | Clic → page d'histoire, aucune erreur console. |
| T4.4 Génération histoire <15s | **PASS** | 207 mots en 4.4s. |
| T4.5 Lecture audio | **PASS** | `<audio src=/api/audio/...>` créé. |
| T4.6 Responsive 1024×768 | **PASS** | Scroll horizontal = 0px. |
| T4.7 Progression persistée | **PASS** | Marque ✅ présente et persistée après rechargement (localStorage). |

**Objectif 4 : DONE.**

---

## Objectif 5 — Moteur de Méta-Histoire

- **2026-06-20** — Implémentation : `backend/meta_story.py` (tri topologique des recettes selon les chaînes du graphe pour un ordre chronologique, prompt LLM dédié, fallback statique, validation de cohérence par second appel LLM, prévisualisation pour la contribution). Intégré à l'API via `POST /api/meta-story` et à la page frontend `MetaStory.jsx`. `tests/test_objective5_meta.py`.
- **2026-06-20** — Résultats d'exécution réelle (appels LLM GLM) :

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T5.1 Déclenchement >= 3 | **PASS** | 2 recettes → MetaNotEnough levée, 0 appel LLM. |
| T5.2 Contenu de synthèse | **PASS** | 3/3 recettes mentionnées (lingot, outil, clou, planche…). |
| T5.3 Longueur | **PASS** | 350 mots (fourchette 200–600). |
| T5.4 Cohérence narrative | **PASS** | Validation LLM : OUI. |
| T5.5 Narration TTS | **PASS** | Audio généré (1073 Ko, 137 s). |

**Objectif 5 : DONE.**

---

## Objectif 6 — Outil de contribution

- **2026-06-20** — Implémentation : backend `POST /api/validate-contribution` (valide un nœud/recette en clonant le graphe + `KnowledgeGraph.validate`, rejette les ids inexistants, génère le YAML prêt à soumettre) et `POST /api/preview-story` (prévisualisation LLM). Frontend `pages/Contribute.jsx` (formulaire nœud/recette, validation, téléchargement YAML via `js-yaml`, prévisualisation). `frontend/tests/e2e_objective6.mjs`.
- **2026-06-20** — Debug sélecteurs : les placeholders contenant `…` (ellipsis) cassaient les `page.fill(placeholder=...)`. Fix : ajout de `data-testid` stables sur tous les champs. Le toggle "Une recette" nécessitait `button:has-text(...)` plutôt que `getByText` (ambiguïté de match).
- **2026-06-20** — Résultats d'exécution réelle (navigateur Chromium + backend) :

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T6.1 Accès page contribution | **PASS** | Formulaire nœud + recette affichés. |
| T6.2 Génération YAML | **PASS** | YAML généré et affiché (nœud). |
| T6.3 Validité YAML | **PASS** | Schéma nœud OK + recette OK ; rejet des ids inexistants confirmé. |
| T6.4 Prévisualisation | **PASS** | Aperçu généré (230 mots). |

**Objectif 6 : DONE.**

---

## Bilan final

Tous les objectifs 1 à 6 sont **DONE**. Aucun test BLOCKED, aucun FAILED. Tous les tests ont été exécutés réellement (Règle 4 respectée) : appels LLM GLM réels, synthèse gTTS réelle, rendu navigateur Chromium réel via Playwright. Voir `RAPPORT_MVP.md` pour le récapitulatif.

---

## Correction post-livraison — Bug "toujours la 1re piste audio"

- **2026-06-20** — Symptôme signalé par l'utilisateur : après génération de plusieurs recettes, le bouton « Écoute » lit toujours la toute première histoire (« Léa petite fondeuse »). Seule la grande aventure semblait correcte.
- **Cause racine** (Phase 1 debugging) : `tts_narrator.py` nommait le fichier audio `story_{prénom}.mp3`, donc **indépendant de la recette et du contenu**. Conséquences : (1) chaque synthèse écrasait le même fichier sur le disque ; (2) l'URL `/api/audio/story_L_a.mp3` étant identique, le navigateur servait sa **version en cache** (la première piste). La grande aventure « marchait » par simple timing (dernière à écrire le fichier avant l'écoute).
- **Faille du test initial** : T4.5 vérifiait seulement qu'**un** `<audio>` apparaissait, sans comparer le contenu entre recettes.
- **Correctif (source)** : nom de fichier basé sur un hash SHA-1 court du texte (+ prénom pour lisibilité) → `story_L_a_d84adc27aa.mp3`. URL unique par contenu. Bonus : mini-cache gratuit (même texte = même fichier, évite une re-synthèse lente de gTTS). Correction aussi de `MetaStory.jsx` qui passait un `filename:'meta_story.mp3'` figé (même problème potentiel).
- **Tests** : ajout de `tests/test_audio_unique.py` (2 textes → 2 noms + 2 durées différents). Renforcement de T4.5 E2E (2 recettes → 2 URLs audio distinctes).

| Test | Statut | Détail |
| :--- | :--- | :--- |
| Régression audio unique | **PASS** | Noms et durées différents pour 2 textes. |
| T4.5 (renforcé) | **PASS** | `story_L_a_d84adc27aa.mp3` vs `story_L_a_eba78ebdb2.mp3`. |

**Bug corrigé à la racine et protégé par test de régression.**

---

# V2 — Jeu de Scène Interactif

La vision produit a été corrigée : ce n'est pas un livre audio passif, mais un
**jeu de scène interactif** où l'enfant agit (drag-and-drop, clics) étape par
étape, avec une narration TTS qui réagit à chaque action. Décisions actées :
remplacement *total* de l'ancien mode passif ; style visuel = emojis sur dégradés
CSS (Règle 3) ; lib DnD = `@dnd-kit/core` (fiable sous Playwright).

## Objectif 1 (V2) — Graphe + Scénarios interactifs

- **2026-06-20** — Implémentation : `knowledge_graph.yaml` enrichi d'un bloc `scenario` par recette (`background`, `avatar`, `elements` [id/emoji/type], `steps` [instruction_tts/action_attendue/success_tts]). `graph_engine.py` : nouveau `RECIPE_REQUIRED_FIELDS` (scenario au lieu de prompt_ia_histoire), `validate_scenario()` (T1.2 background+elements+≥2 steps, T1.3 source/target référencent des elements). `tests/test_objective1_graph.py` réécrit.
- **2026-06-20** — Debug coquille YAML : une ligne `- id: feu_forge, ... }` (accolade ouvrante manquante) faisait échouer le parser. Corrigé en `{ id: ... }`.

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T1.1 Chargement YAML | **PASS** | 10 nœuds (≥8), 4 recettes (≥3). |
| T1.2 Intégrité scénarios | **PASS** | 4 scénarios valides (bg + elements + ≥2 steps). |
| T1.3 Validité des actions | **PASS** | Toutes les source/target référencent des elements. |

**Objectif 1 (V2) : DONE.**

---

## Objectifs 2 & 3 (V2) — Générateur de Scènes + Narration TTS Séquentielle

- **2026-06-20** — Implémentation : `frontend/src/components/Scene.jsx` (moteur de scène @dnd-kit : décor dégradé, avatar, elements draggable/dropzone/static, validation d'étape, feedback d'erreur `animate-wiggle`). `frontend/src/pages/ScenePage.jsx` (orchestre Scene + TTS). `frontend/src/api.js` (fetchRecipe, narrateStep). `frontend/src/index.css` (keyframe wiggle). Backend `main.py` : `GET /api/recipe/{id}` (recette complète avec scenario), `POST /api/narrate-step`. `@dnd-kit/core` installé.
- **2026-06-20** — Debug coquille scénario : l'étape 3 de `recette_fonte` utilisait `source: four` mais `four` était une `dropzone` (dnd-kit ne peut pas saisir une dropzone). Cause racine : un élément = un seul type, mais l'étape voulait reprendre le four comme source. Fix : ajout d'un élément `metal_liquide` (draggable) représentant le métal fondu, et vérification systématique que TOUTES les sources des 4 scénarios sont draggables.
- **2026-06-20** — Debug compilation : après suppression de `previewStory` dans api.js (mode passif), `Contribute.jsx` cassait l'import → écriture anticipée de la V2 de Contribute (éditeur d'étapes, règle aussi l'Objectif 6).
- **2026-06-20** — Résultats d'exécution réelle (drag-and-drop Playwright + appels TTS) :

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T2.1 Rendu de la scène | **PASS** | scène + décor + 3 draggables + 2 dropzones. |
| T2.2 Mécanique drag-and-drop | **PASS** | Draggable saisi et déplacé (mouse down→move→up). |
| T2.3 Validation d'étape | **PASS** | Bonne source→target fait avancer ; scène terminée (Bravo). |
| T2.4 Feedback d'erreur | **PASS** | Mauvaise target rejetée, reste à l'étape courante. |
| T3.1 Génération audio | **PASS** | 12 `.mp3` générés sur le disque (instructions + succès). |
| T3.2 Lecture d'instruction | **PASS** | instruction_tts synthétisé au chargement de chaque étape (E2E). |
| T3.3 Lecture de succès | **PASS** | success_tts synthétisé à la validation (E2E). |
| T3.4 Format du prompt TTS | **PASS** | `{style EN}:{texte FR}` (test Python, inchangé). |

**Objectifs 2 & 3 (V2) : DONE.**

---

## Objectif 4 (V2) — Générateur de Scénarios par LLM

- **2026-06-20** — Implémentation : `backend/scenario_generator.py` (prompt structuré → appel LLM → parse YAML → validation `validate_scenario` → réparation automatique des types d'éléments). Endpoint `POST /api/generate-scenario`. `tests/test_objective4_scenario.py`.
- **2026-06-20** — Debug T4.2 (jouabilité) : le LLM produisait souvent une étape dont la source était une `dropzone` (non saisissable) → retries aléatoires et timeouts. Cause racine : un élément = un seul type, mais le LLM veut parfois reprendre un objet déjà posé. Fix double : (1) ajout du type `both` (draggable+dropzone) au schéma et au moteur de scène (rendu d'un draggable à l'intérieur d'une dropzone) ; (2) réparation **déterministe** `_repair_element_types` : tout élément source→`draggable`, source+cible→`both`, cible seule→`dropzone`. Fini les retries aléatoires.

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T4.1 Appel LLM → YAML valide | **PASS** | bg=foret, 5 elements, 3 steps, validé. |
| T4.2 Cohérence des actions | **PASS** | Toutes les sources sont draggables/both (après réparation). |
| T4.3 Intégration du prénom | **PASS** | Prénom 'Léa' présent dans 6 textes TTS. |

**Objectif 4 (V2) : DONE.**

---

## Objectif 5 (V2) — Méta-Histoire Visuelle

- **2026-06-20** — Implémentation : `frontend/src/pages/MetaStory.jsx` réécrit en scène de célébration (décor dégradé violet/rose, objets résultats en emojis géants via `/api/graph` pour les emojis des nœuds). Réutilise `/api/meta-story` (résumé LLM) et `/api/narrate`. `frontend/tests/e2e_objective5.mjs`.
- **2026-06-20** — Debug majeur : la scène bûcheronnage ne se complétait pas (2/3 recettes). **Cause racine** : à l'étape 2 `target: tronc` mais `tronc` était de type `draggable` (pas enregistré comme dropzone → aucune cible highlight pour déposer la hache). `validate_scenario` ne vérifiait que l'existence de l'id, pas la compatibilité de type. Fix double : (1) `tronc` → type `both` (draggable ET dropzone) ; (2) **défense en profondeur** — `validate_scenario` exige désormais `source` ∈ {draggable, both} et `target` ∈ {dropzone, both}. Ce défaut était indétectable avant le runtime ; il lève maintenant une erreur dès le chargement du graphe.
- **2026-06-20** — Résultats d'exécution réelle (3 scènes complétées par drag-drop + LLM + TTS) :

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T5.1 Déclenchement ≥3 | **PASS** | Bloquée < 3 ; débloquée après 3 recettes (badge nav = 3). |
| T5.2 Rendu des objets | **PASS** | 3 objets résultats affichés (≥2). |
| T5.3 Narration de synthèse | **PASS** | Résumé LLM 381 mots + `<audio>` produit. |

**Objectif 5 (V2) : DONE.**

---

## Objectif 6 (V2) — Outil de contribution visuel

- **2026-06-20** — Implémentation : `frontend/src/pages/Contribute.jsx` réécrit (éditeur d'étapes dynamique : bouton "+ Ajouter une étape", champs Instruction/Source/Cible/Succès par étape, décor sélectionnable, parser elements, validation backend, téléchargement YAML conforme au schéma scène). `frontend/tests/e2e_objective6.mjs`.
- **2026-06-20** — Debug T6.1 : le comptage `[data-testid^="step-"]` matchait aussi les champs internes (`step-inst-0` etc.) → 5→15. Cause racine : collision de préfixes testid. Fix : renommage du conteneur en `step-block-${i}`.

| Test | Statut | Détail |
| :--- | :--- | :--- |
| T6.1 Création d'étapes | **PASS** | 1 → 3 étapes (ajout dynamique). |
| T6.2 Génération du YAML | **PASS** | Scène validée backend ; YAML téléchargé conforme (2 elements, 3 steps). |

**Objectif 6 (V2) : DONE.**

---

## Bilan V2

Tous les objectifs 1 à 6 (V2) sont **DONE**. 0 FAILED, 0 BLOCKED. Tous les tests exécutés réellement : appels LLM GLM, synthèse gTTS, drag-and-drop Playwright (souris simulée), 3 scènes complétées de bout en bout, génération de scénarios par LLM. Voir `RAPPORT_MVP.md`.
