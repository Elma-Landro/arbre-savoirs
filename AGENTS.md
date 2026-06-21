# AGENTS.md — L'Arbre des Savoirs

## Rôle du projet

**L'Arbre des Savoirs** est un jeu éducatif interactif open source pour enfants de 3 à 8 ans. L'enfant explore des chaînes de savoir-faire — matériaux → transformations → objets — à travers des scènes jouées : glisser-déposer, clics, feedback doux en cas d'erreur, narration vocale TTS, puis scène de célébration après plusieurs recettes.

## État de référence

- Repo GitHub : `https://github.com/Elma-Landro/arbre-savoirs`
- Branche de référence actuelle : `main`
- MVP V2 livré : moteur interactif, TTS, générateur LLM de scénarios, méta-histoire, contribution YAML.
- Le fichier central du contenu est `knowledge_graph.yaml`.
- Prochaine priorité validée : **précharger les audios à l'ouverture d'une scène** via un endpoint backend dédié, puis lecture instantanée côté frontend.

## Stack

- Backend : Python, FastAPI, PyYAML, gTTS, mutagen.
- Frontend : React 18, Vite 5, TailwindCSS 3, `@dnd-kit/core`.
- Tests navigateur : Playwright + Chromium headless.
- Persistance enfant : `localStorage`.
- LLM : z.ai / GLM, endpoint Anthropic-compatible, clé détectée par la configuration existante ou `.env`.

## Conventions impératives

1. **Pas de simulation** : un test n'est valide que s'il s'exécute réellement.
2. **Documentation systématique** : chaque test, décision importante, FAIL et correction doivent être consignés dans `DEVLOG.md`.
3. **Minimalisme** : n'ajouter que ce qui sert l'objectif courant ; le reste va dans `BACKLOG.md`.
4. **Tests d'acceptation ordonnés** : une fonctionnalité n'est DONE que lorsque tous ses tests passent.
5. **Prompt TTS** : respecter le format `{Instructions de style EN ANGLAIS} : {Texte spoken en français}`.
6. **Workflow git** : branche → commit → push → PR pour toute évolution fonctionnelle.

## Points techniques à préserver

- Un élément de scénario peut avoir le type `both` : à la fois draggable et dropzone.
- `validate_scenario` doit rester strict : `source ∈ {draggable, both}` et `target ∈ {dropzone, both}`.
- Les fichiers audio générés doivent inclure un hash de contenu dans leur nom pour éviter les collisions de cache navigateur.
- `_repair_element_types` corrige déterministiquement les types incohérents produits par le LLM : ne pas remplacer cela par un retry aléatoire.

## Commandes utiles

```bash
# Backend
cd /workspace/arbre-savoirs/backend
../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Frontend
cd /workspace/arbre-savoirs/frontend
npm run dev

# Tests Python
cd /workspace/arbre-savoirs
.venv/bin/python tests/test_objective1_graph.py
.venv/bin/python tests/test_objective3_tts.py
.venv/bin/python tests/test_objective4_scenario.py
.venv/bin/python tests/test_audio_unique.py

# Tests E2E — backend et frontend doivent tourner
cd /workspace/arbre-savoirs/frontend
node tests/e2e_objective2.mjs
node tests/e2e_objective5.mjs
node tests/e2e_objective6.mjs
```

## Documentation locale

- `docs/HANDOFF_PROMPT.md` : contexte complet de reprise fourni par Maël.
- `DEVLOG.md` : historique des décisions, tests et corrections.
- `RAPPORT_MVP.md` : état final du MVP V2.
- `BACKLOG.md` : fonctionnalités futures.
