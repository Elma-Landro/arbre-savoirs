"""
main.py — API FastAPI pour "L'Arbre des Savoirs" (Objectifs 4, 5, 6).

Endpoints :
  GET  /api/health                  -> ping
  GET  /api/graph                   -> nœuds + recettes du graphe
  GET  /api/recipes                 -> liste des recettes (pour l'accueil)
  POST /api/story                   -> génère une histoire (body: recipe_id, child_name)
  POST /api/narrate                 -> synthétise l'audio d'un texte (body: text, child_name)
  GET  /api/audio/{filename}        -> sert un fichier audio .mp3 généré
  POST /api/meta-story              -> génère une méta-histoire (body: recipe_ids[], child_name)
  POST /api/preview-story           -> prévisualise une recette contributive (Objectif 6)
  POST /api/validate-contribution   -> valide un nœud/recette soumis (Objectif 6)

L'API est servie sur le même port que le frontend via Vite proxy (dev) ou
montage statique (prod). Le frontend tourne sur localhost:3000.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Le backend est lancé depuis le dossier backend/ (voir README / npm scripts),
# donc les imports sont en absolu, comme dans les scripts de test.
from graph_engine import KnowledgeGraph, GraphError, load_graph
from tts_narrator import narrate_story, TtsBlocked, AUDIO_OUT_DIR
from scenario_generator import generate_scenario, ScenarioGenerationError
from meta_summary import generate_summary, MetaBlocked
import yaml

app = FastAPI(title="L'Arbre des Savoirs — API MVP")

# En dev : ARBRE_FRONTEND_ORIGIN non définie → localhost:3000.
# En prod : définir ARBRE_FRONTEND_ORIGIN=https://ton-domaine.fr
_ALLOWED_ORIGIN = os.getenv("ARBRE_FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_ALLOWED_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Graphe chargé une fois au démarrage.
GRAPH: KnowledgeGraph = load_graph()


# ============================================================================
# Modèles de requête
# ============================================================================
class NarrateRequest(BaseModel):
    text: str
    child_name: str = "Léa"
    filename: Optional[str] = None


class MetaStoryRequest(BaseModel):
    recipe_ids: list[str]
    child_name: str = "Léa"


class GenerateScenarioRequest(BaseModel):
    recipe_id: str
    child_name: str = "Léa"


class PreloadSceneAudioRequest(BaseModel):
    recipe_id: str
    child_name: str = "Léa"


class ContributionRequest(BaseModel):
    """Une contribution (nœud OU recette) soumise via /contribute."""
    kind: str  # "node" | "recipe"
    data: dict


# ============================================================================
# Endpoints de base
# ============================================================================
@app.get("/api/health")
def health():
    return {"status": "ok", "nodes": len(GRAPH.nodes), "recipes": len(GRAPH.recipes)}


@app.get("/api/graph")
def get_graph():
    return {"nodes": GRAPH.nodes, "recipes": GRAPH.recipes}


@app.get("/api/recipes")
def get_recipes():
    """Liste des recettes enrichie des labels (pour les cartes d'accueil)."""
    out = []
    for r in GRAPH.recipes:
        ingredients = [GRAPH.node(i["id"])["label"] for i in r["ingredients"]]
        results = [GRAPH.node(x["id"])["label"] for x in r["resultat"]]
        out.append({
            "id": r["id"],
            "titre": r["titre"],
            "metier": r.get("metier", ""),
            "description_pedagogique": r.get("description_pedagogique", ""),
            "ingredients": ingredients,
            "resultat": results,
            # Node ids des résultats (pour l'inventaire / chaîne causale Patch 6b).
            "resultat_ids": [x["id"] for x in r["resultat"]],
            # Chaîne causale v2.0 : recette à compléter avant celle-ci (null = libre).
            "prerequis": r.get("prerequis"),
        })
    return out


@app.get("/api/recipe/{recipe_id}")
def get_recipe(recipe_id: str):
    """Récupère une recette COMPLÈTE avec son scenario (pour le moteur de scène)."""
    if recipe_id not in GRAPH.recipes_by_id:
        raise HTTPException(404, f"Recette inconnue : {recipe_id}")
    r = GRAPH.recipe(recipe_id)
    return r


# ============================================================================
# Objectif 3 : narration TTS
# ============================================================================
@app.post("/api/narrate")
def api_narrate(req: NarrateRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Texte vide.")
    try:
        path = narrate_story(req.text, req.child_name, filename=req.filename)
    except TtsBlocked as e:
        raise HTTPException(503, f"Synthèse audio indisponible : {e}")
    return {"audio_url": f"/api/audio/{path.name}", "filename": path.name}


@app.get("/api/audio/{filename}")
def api_audio(filename: str):
    # Sécurité : pas de traversal de chemin.
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(400, "Nom de fichier invalide.")
    path = AUDIO_OUT_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Audio introuvable.")
    return FileResponse(str(path), media_type="audio/mpeg", filename=filename)


# ============================================================================
# Objectif 3 (V2) : narration TTS séquentielle (une phrase courte par étape)
# ============================================================================
@app.post("/api/narrate-step")
def api_narrate_step(req: NarrateRequest):
    """Synthétise l'audio d'UNE phrase courte (instruction_tts / success_tts).
    Réutilise tts_narrator (format de prompt conservé, hash du contenu)."""
    if not req.text or not req.text.strip():
        raise HTTPException(400, "Texte vide.")
    try:
        path = narrate_story(req.text, req.child_name)
    except TtsBlocked as e:
        raise HTTPException(503, f"Synthèse audio indisponible : {e}")
    return {"audio_url": f"/api/audio/{path.name}", "filename": path.name}


@app.post("/api/preload-scene-audio")
def api_preload_scene_audio(req: PreloadSceneAudioRequest):
    """Pré-génère tous les audios courts d'une scène.

    Produit les pistes `instruction_tts` et `success_tts` de chaque étape en une
    seule requête. Le nom de fichier hashé par `narrate_story` sert de cache :
    un texte déjà synthétisé n'est pas régénéré inutilement.
    """
    if req.recipe_id not in GRAPH.recipes_by_id:
        raise HTTPException(404, f"Recette inconnue : {req.recipe_id}")
    recipe = GRAPH.recipe(req.recipe_id)
    scenario = recipe.get("scenario") or {}
    steps = scenario.get("steps") or []
    if not steps:
        raise HTTPException(422, "La recette ne contient aucun scénario audio préchargeable.")

    audios: dict[str, dict[str, dict[str, str]]] = {}
    count = 0
    try:
        for step in steps:
            step_id = str(step.get("id"))
            audios[step_id] = {}
            for field, label in (("instruction_tts", "instruction"), ("success_tts", "success")):
                text = (step.get(field) or "").strip()
                # Une étape dont le texte n'est pas encore rédigé ne doit pas
                # faire échouer le préchargement de toute la scène : on la saute,
                # le frontend retombera sur /narrate-step à la volée pour cette étape.
                if not text:
                    continue
                path = narrate_story(text, req.child_name)
                audios[step_id][label] = {
                    "audio_url": f"/api/audio/{path.name}",
                    "filename": path.name,
                }
                count += 1
    except TtsBlocked as e:
        raise HTTPException(503, f"Préchargement audio indisponible : {e}")

    return {"recipe_id": req.recipe_id, "count": count, "audios": audios}


# ============================================================================
# Objectif 4 (V2) : générateur de scénarios par LLM
# ============================================================================
@app.post("/api/generate-scenario")
def api_generate_scenario(req: GenerateScenarioRequest):
    """Génère un bloc scenario (YAML) pour une recette via le LLM, puis le valide."""
    try:
        scenario = generate_scenario(req.recipe_id, req.child_name, graph=GRAPH)
    except ScenarioGenerationError as e:
        raise HTTPException(502, str(e))
    return {"recipe_id": req.recipe_id, "scenario": scenario}


# ============================================================================
# Objectif 5 : résumé de célébration (scène finale)
# ============================================================================
@app.post("/api/meta-story")
def api_meta_story(req: MetaStoryRequest):
    """Génère un résumé narratif des recettes complétées (pour la scène finale)."""
    blocked = False
    try:
        text = generate_summary(req.recipe_ids, req.child_name, graph=GRAPH)
    except MetaBlocked as b:
        text = b.fallback
        blocked = True
    return {"text": text, "blocked": blocked, "count": len(req.recipe_ids)}


# ============================================================================
# Objectif 6 : contribution
# ============================================================================
@app.post("/api/validate-contribution")
def api_validate_contribution(req: ContributionRequest):
    """Valide une contribution (nœud ou recette) sans l'ajouter au graphe.
    Retourne le YAML généré si valide."""
    if req.kind not in ("node", "recipe"):
        raise HTTPException(400, "kind doit être 'node' ou 'recipe'.")
    # On valide en clonant le graphe + la contribution.
    new_nodes = [dict(n) for n in GRAPH.nodes]
    new_recipes = [dict(r) for r in GRAPH.recipes]
    try:
        if req.kind == "node":
            new_nodes.append(req.data)
        else:
            new_recipes.append(req.data)
        KnowledgeGraph.validate(new_nodes, new_recipes)
    except GraphError as e:
        raise HTTPException(422, str(e))
    # Génère le YAML prêt à soumettre (PR).
    yaml_block = yaml.safe_dump(
        {"nodes": [req.data] if req.kind == "node" else [],
         "recipes": [req.data] if req.kind == "recipe" else []},
        allow_unicode=True, sort_keys=False)
    return {"valid": True, "yaml": yaml_block}


# ============================================================================
# Montage du frontend (build) en production
# ============================================================================
_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if _FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIST), html=True), name="frontend")
