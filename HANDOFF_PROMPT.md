# 📋 PROMPT DE REPRISE — "L'Arbre des Savoirs" (jeu éducatif interactif)

> **À copier-coller dans ton nouvel IDE (Hermes) pour reprendre le projet avec moi (ou un autre assistant).**
> Ce document est auto-suffisant : il contient la vision, l'état exact, la stack, les contraintes, et la feuille de route priorisée.

---

## 🎯 VISION DU PROJET

**"L'Arbre des Savoirs"** est un **jeu de scène interactif** pour enfants de 3 à 8 ans.
L'enfant explore des chaînes de savoir-faire (matériaux → transformations → objets)
en **jouant des scènes interactives** où il *agit* (glisser-déposer, clics) pour faire
avancer l'histoire, étape par étape, avec une **narration vocale (TTS)** qui réagit à
chaque action. Après plusieurs recettes, une **scène de célébration** récompense ses
créations. Inspiration : concept type *Bayam*. Le projet est **open source et contributif**.

### Exemple de boucle de jeu
1. L'enfant choisit « La naissance de l'acier » → une scène s'ouvre (décor de fonderie).
2. La voix annonce : *« Jette le minerai dans le four ! »* — l'élément à glisser est mis en valeur, la cible est surlignée.
3. Il glisse le 🪨 sur le 🔥. Succès → la voix félicite, l'étape suivante démarre.
4. S'il se trompe, l'objet se secoue en rouge, sans pénalité.
5. Après ≥ 3 recettes → **scène finale** affichant ses créations en grands emojis + récit audio de son épopée.

---

## 📍 ÉTAT ACTUEL — MVP V2 LIVRÉ ✅

**Statut : fonctionnel, 18/18 tests PASS, 0 FAIL.** Repo GitHub à jour.
L'ancienne version V1 (« livre audio passif ») a été entièrement remplacée par la V2 interactive.

### Repo
**https://github.com/Elma-Landro/arbre-savoirs** (public, branche `main`)

### Les 6 objectifs validés
| # | Objectif | Statut |
|---|---|---|
| 1 | Graphe de connaissances + scénarios interactifs (`knowledge_graph.yaml`, bloc `scenario`) | ✅ |
| 2 | Moteur de scène frontend (drag-and-drop `@dnd-kit`, feedback erreur) | ✅ |
| 3 | Narration TTS séquentielle (gTTS, `instruction_tts`/`success_tts` par étape) | ✅ |
| 4 | Générateur de scénarios par LLM (GLM → YAML validé + réparé) | ✅ |
| 5 | Méta-histoire visuelle (scène de célébration, objets en emojis) | ✅ |
| 6 | Outil de contribution visuel (éditeur d'étapes dynamique, YAML) | ✅ |

### Contenu actuel du jeu
- **10 nœuds** (chaîne métal : minerai_fer → lingot_acier → outil_acier ; chaîne bois : bois_brut → planche_bois → charrette)
- **4 recettes/scènes** : La naissance de l'acier, Le souffle du forgeron, Le chant de la forêt, La charrette qui roule
- Chaque scène = décor (dégradé CSS) + avatar + éléments emoji + ≥3 étapes drag-and-drop

---

## 🛠️ STACK TECHNIQUE

| Composant | Technologie |
|---|---|
| Backend | Python 3.12, FastAPI, PyYAML, gTTS, mutagen |
| LLM | z.ai `glm-4.6` (endpoint Anthropic-compatible), clé détectée auto via config ZCode |
| TTS | gTTS (Google, fr-FR, gratuit, hors-ligne) |
| Frontend | React 18 + Vite 5 + TailwindCSS 3 |
| Drag-and-drop | `@dnd-kit/core` |
| Tests navigateur | Playwright + Chromium headless |
| Persistance | `localStorage` (progression de l'enfant) |

### Commandes de lancement
```bash
# Backend (port 8000)
cd arbre-savoirs/backend && ../.venv/bin/uvicorn main:app --reload

# Frontend (port 3000)
cd arbre-savoirs/frontend && npm run dev
# → http://localhost:3000
```

### Commandes de tests (tous au vert actuellement)
```bash
cd arbre-savoirs
.venv/bin/python tests/test_objective1_graph.py      # graphe + scénarios
.venv/bin/python tests/test_objective3_tts.py         # TTS format + génération
.venv/bin/python tests/test_objective4_scenario.py    # générateur LLM scénarios
.venv/bin/python tests/test_audio_unique.py           # régression cache audio
cd frontend
node tests/e2e_objective2.mjs    # moteur de scène + drag-and-drop
node tests/e2e_objective5.mjs    # méta-histoire visuelle
node tests/e2e_objective6.mjs    # outil de contribution
```

---

## 📂 STRUCTURE DU PROJET

```
arbre-savoirs/
├── knowledge_graph.yaml              # Graphe + scénarios (LE fichier central, éditable)
├── backend/
│   ├── graph_engine.py               # Charge/valide le graphe (validate_scenario)
│   ├── llm_client.py                 # Client LLM (clé auto via config ZCode / .env)
│   ├── tts_narrator.py               # gTTS + hash anti-cache (fix important)
│   ├── scenario_generator.py         # LLM → scénario YAML + réparation déterministe
│   ├── meta_summary.py               # Résumé de célébration (LLM)
│   ├── main.py                       # API FastAPI (10 endpoints)
│   └── audio_out/                    # .mp3 générés (gitignoré)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Navigation par état
│   │   ├── api.js                    # Client fetch vers backend
│   │   ├── useProgress.js            # Hook localStorage
│   │   ├── components/Scene.jsx      # MOTEUR DE SCÈNE (@dnd-kit) — cœur du jeu
│   │   └── pages/ RecipeList, ScenePage, MetaStory, Contribute
│   └── tests/ e2e_objective{2,5,6}.mjs
├── tests/ test_objective{1,3,4}*.py + test_audio_unique.py
├── DEVLOG.md                         # Journal de bord complet (V1+V2, debugging)
├── RAPPORT_MVP.md                    # État détaillé de chaque test
├── BACKLOG.md                        # Fonctionnalités futures identifiées
└── README.md
```

---

## ⚠️ CONTRAINTES & CONVENTIONS (important pour la suite)

1. **Pas de simulation** : tout nouveau test doit s'exécuter réellement (appels API réels, drag-drop Playwright réel). Un test « supposé passant » = FAIL.
2. **Documentation systématique** : chaque test et chaque décision vont dans `DEVLOG.md` (date, test, résultat PASS/FAIL, cause+correction si FAIL).
3. **Minimalisme** : n'ajouter que ce qui sert l'objectif courant ; le superflu va dans `BACKLOG.md`.
4. **Tests d'acceptation ordonnés** : un objectif n'est DONE que si TOUS ses tests passent.
5. **Format du prompt TTS** (impératif) : `{Instructions de style EN ANGLAIS} : {Texte spoken en français}`.
6. **Workflow git** : désormais, chaque évolution = branche → commit → push → (PR). Garder un historique propre.

---

## 🐛 CHOSES À SAVOIR (découvertes de la V2)

- **Type d'élément `both`** : un élément peut être à la fois `draggable` et `dropzone` (ex : le tronc qu'on pose puis qu'on scie). Le moteur de scène gère ça (un draggable à l'intérieur d'une dropzone).
- **Validation stricte** : `validate_scenario` exige `source` ∈ {draggable, both} et `target` ∈ {dropzone, both}. Sinon erreur au chargement (défense en profondeur).
- **Fix cache audio** : le nom du `.mp3` contient un hash du contenu (`story_Léa_d84adc27aa.mp3`) sinon le navigateur sert la 1re piste en cache. Protégé par `test_audio_unique.py`.
- **Réparation LLM** : `scenario_generator._repair_element_types` corrige les types d'éléments incohérents produits par le LLM (déterministe, pas de retry aléatoire).
- **Latence gTTS** : ~3-5s par phrase courte ; ~15-65s sur un texte long. C'est le point à améliorer en priorité (voir feuille de route).

---

## 🗺️ FEUILLE DE ROUTE PRIORISÉE (validée avec Mael)

### 🔴 Priorité haute (gain UX immédiat)
1. **Précharger les audios à l'ouverture d'une scène** — au lieu de synthétiser chaque `instruction_tts`/`success_tts` à la volée (attente gTTS entre les étapes). Endpoint `POST /api/preload-scene-audio` qui génère tous les `.mp3` d'une recette d'un coup, puis le frontend les lit instantanément. **L'enfant n'attend plus entre les étapes.**

2. **Action `click` dans le moteur** — le schéma prévoit `action_attendue.type: "click"` mais seul le drag-and-drop est implémenté. Brancher le clic (ex : « Clique sur le soufflet pour attiser le feu ! ») → variété d'interactions.

### 🟡 Priorité moyenne (enrichissement)
3. **Plus de recettes / chaînes** — verre (sable → verre), pain (blé → farine → pain), poterie (argile → pot). Étendre `knowledge_graph.yaml` avec leurs scénarios. Idéalement **générés par LLM** (Objectif 4) puis affinés.

4. **Avatar personnalisable** — l'enfant choisit son personnage (garçon 👦 / fille 👧 / animal 🦊 etc.) au début. Stocké dans `localStorage`. Tu avais cette vision dès le départ.

### 🟢 Priorité basse (polish)
5. **Assets réels et cohérents** — remplacer les emojis par de vrais SVG/illustrations (gérés via l'IDE Hermes qui a une gestion d'assets). Conserver les emojis en fallback.
6. Scène finale interactive, sons d'ambiance, multi-profils, PWA offline (voir `BACKLOG.md`).

---

## 💬 POUR L'ASSISTANT QUI REPREND

Tu reprends un projet **fonctionnel et propre**. Les bases sont solides.
L'utilisateur (Mael) travaille désormais via **Hermes**, un IDE avec gestion de mémoire
et d'assets. Il préfère :
- aller à l'essentiel (pas de sur-sécurisation inutile),
- un workflow git propre (branches + commits + push),
- qu'on lui propose des choix quand il y a une vraie décision, mais qu'on tranche
  seul les choix techniques évidents.

**Prochaine étape convenue : commencer par la priorité #1 (préchargement des audios).**

Pour toute nouvelle fonctionnalité : consulter `knowledge_graph.yaml` (structure des
scénarios), `backend/graph_engine.py` (`validate_scenario`), `frontend/src/components/Scene.jsx`
(moteur), et respecter les contraintes ci-dessus. Lire `DEVLOG.md` pour l'historique
complet des décisions et debugging.
