# 🌳 L'Arbre des Savoirs — MVP V2 (Jeu de Scène Interactif)

Jeu éducatif interactif pour enfants de 3 à 8 ans : l'enfant explore des chaînes
de savoir-faire (matériaux → transformations → objets) en **jouant des scènes
interactives**. Il accomplit des gestes concrets (glisser le minerai au four,
marteler l'acier, scier le bois) via **glisser-déposer**, guidé pas à pas par
une **narration vocale** qui réagit à chaque action. Après plusieurs recettes,
une **scène de célébration** récompense ses créations.

## Démarrage rapide

### Prérequis
- Python 3.10+ (testé 3.12) · Node.js 18+ et npm · accès réseau (LLM + gTTS)

### 1. Backend (FastAPI)
```bash
cd arbre-savoirs
python3 -m venv .venv
.venv/bin/pip install pyyaml requests fastapi "uvicorn[standard]" python-multipart gTTS mutagen
cd backend
../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
La clé LLM est détectée automatiquement (config ZCode `zai-coding-plan`,
`ARBRE_LLM_API_KEY`, ou `.env`).

### 2. Frontend (React + Vite)
```bash
cd arbre-savoirs/frontend
npm install
npm run dev      # http://localhost:3000
```
Ouvre **http://localhost:3000**.

## Jouer
1. **Recettes** : choisis une aventure. Une scène interactive s'ouvre.
   - La voix annonce la consigne (ex : « Jette le minerai dans le four ! »).
   - Glisse l'élément mis en valeur vers la cible surlignée.
   - En cas d'erreur, l'objet se secoue en rouge, sans pénalité.
   - À chaque réussite, la voix félicite et l'étape suivante démarre.
2. **Ma grande aventure** : après ≥ 3 recettes, débloque la scène finale qui
   montre toutes tes créations et raconte ton épopée.
3. **Contribuer** : crée une recette avec son décor, ses éléments et ses étapes
   interactives ; valide et télécharge le YAML.

## Tests (exécution réelle)
```bash
# Backend / acceptation (Python)
cd arbre-savoirs
.venv/bin/python tests/test_objective1_graph.py     # graphe + scénarios
.venv/bin/python tests/test_objective3_tts.py        # TTS format + génération
.venv/bin/python tests/test_objective4_scenario.py   # générateur LLM de scénarios
.venv/bin/python tests/test_audio_unique.py          # régression cache audio

# Navigateur / E2E (Playwright) — backend ET vite doivent tourner
cd frontend
node tests/e2e_objective2.mjs   # moteur de scène + drag-and-drop
node tests/e2e_objective5.mjs   # méta-histoire visuelle
node tests/e2e_objective6.mjs   # outil de contribution
```

## Documentation
- `DEVLOG.md` — journal de bord complet (V1 + V2), décisions et debugging.
- `RAPPORT_MVP.md` — rapport final V2 (état de chaque test).
- `BACKLOG.md` — fonctionnalités futures identifiées.
- `knowledge_graph.yaml` — le graphe + 4 scénarios interactifs (format contributif).

## Stack
FastAPI · React · Vite · TailwindCSS · `@dnd-kit/core` · gTTS · GLM (z.ai,
Anthropic-compatible) · PyYAML · mutagen · Playwright (tests).
