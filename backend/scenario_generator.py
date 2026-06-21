"""
scenario_generator.py — Générateur de Scénarios par LLM (Objectif 4 V2).

Prend une recette (ingrédients → résultat) et génère un bloc `scenario` YAML
complet (background, elements, steps avec instruction_tts/action_attendue/
success_tts) via un appel LLM. Le résultat est validé par
KnowledgeGraph.validate_scenario avant d'être retourné.

Tests visés :
  T4.1 generate_scenario(recipe_id) -> dict scenario avec background, elements,
       steps (≥2) valides.
  T4.2 Cohérence des actions : source est un "outil/matériau" logique,
       target est un "lieu/résultat" logique.
  T4.3 Intégration du prénom : les textes TTS incluent le prénom de l'enfant.
"""
from __future__ import annotations

import re
from typing import Optional

import yaml

from graph_engine import KnowledgeGraph, GraphError, load_graph
from llm_client import call_llm

# Le système exige une sortie YAML stricte (pas de prose autour).
SYSTEM_PROMPT = (
    "Tu es un concepteur de jeux éducatifs interactifs pour enfants de 4 à 6 ans. "
    "Tu crées des scénarios d'interactivité (drag-and-drop) au format YAML strict. "
    "Tu réponds UNIQUEMENT avec un bloc YAML valide, sans texte autour, sans markdown, "
    "sans backticks. Le YAML doit être directement parsable."
)

# Fond de scènes connus (pour guider le LLM vers des clés de dégradés existantes).
KNOWN_BACKGROUNDS = ["atelier_fonderie", "atelier_forgeron", "foret", "atelier_charron", "celebration"]


def _build_user_prompt(recipe: dict, graph: KnowledgeGraph, child_name: str) -> str:
    """Construit le prompt utilisateur à partir de la recette."""
    ingredients = [graph.node(i["id"])["label"] for i in recipe.get("ingredients", [])]
    results = [graph.node(r["id"])["label"] for r in recipe.get("resultat", [])]
    metier = recipe.get("metier", "")

    return f"""Génère un scénario interactif (drag-and-drop) pour cette recette éducative.

Recette : {recipe.get('titre', '')} (métier : {metier})
Ingrédients : {', '.join(ingredients)}
Résultat : {', '.join(results)}

L'enfant qui joue s'appelle {child_name}. Tu DOIS mentionner ce prénom dans les textes TTS.

Réponds avec UNIQUEMENT ce YAML (clés et indentation exactes) :

background: <une de ces valeurs : {', '.join(KNOWN_BACKGROUNDS)}>
avatar: "👧"
elements:
  - id: <id_unique>
    emoji: "<un emoji>"
    type: "draggable"
  - id: <id_unique>
    emoji: "<un emoji>"
    type: "dropzone"
steps:
  - id: 1
    instruction_tts: "<consigne où l'enfant doit faire l'action, avec le prénom {child_name}>"
    action_attendue:
      type: "drag_and_drop"
      source: "<id d'un element draggable>"
      target: "<id d'un element dropzone>"
    success_tts: "<félicitation, avec le prénom {child_name}>"
  - id: 2
    instruction_tts: "..."
    action_attendue:
      type: "drag_and_drop"
      source: "..."
      target: "..."
    success_tts: "..."

Règles :
- Au moins 2 étapes (3 c'est idéal).
- Chaque étape reprend une action logique de la recette (ex : glisser le matériau
  vers le four, glisser l'outil vers le résultat).
- Le `source` est TOUJOURS un element de type "draggable" (ou "both"), le `target`
  un element de type "dropzone" (ou "both"). Ne mets JAMAIS une source de type
  "dropzone" ou "static".
- Si une étape doit reprendre un objet déjà posé ailleurs (ex: déplacer ce qu'on
  vient de fabriquer vers un autre endroit), définis cet élément avec
  type: "both" (il sera à la fois saisissable et cible de dépôt).
- Les emojis doivent représenter concrètement chaque élément (ex : 🪨 marteau 🔥).
- Tous les texts TTS en français, avec le prénom {child_name}.
- Pas de texte hors du YAML."""


def _extract_yaml(raw: str) -> str:
    """Nettoie la sortie LLM : retire d'éventuels backticks/markdown autour du YAML."""
    txt = raw.strip()
    # Retire les fences ```yaml ... ``` si présentes.
    txt = re.sub(r"^```(?:ya?ml)?\s*\n", "", txt, flags=re.IGNORECASE)
    txt = re.sub(r"\n```\s*$", "", txt)
    # Si le LLM a mis "scenario:" au début, on garde la sous-partie.
    return txt


class ScenarioGenerationError(RuntimeError):
    """Le LLM n'a pas produit un scenario valide après retries."""


def _ensure_sources_are_draggable(scenario: dict) -> None:
    """T4.2 — vérifie que chaque step.action_attendue.source est un element dont
    le type permet la préhension ('draggable' ou 'both'). Lève ValueError sinon
    (=> déclenche un retry du LLM). Conservée pour les tests, mais la réparation
    automatique (_repair_element_types) est désormais privilégiée."""
    grabbable = {
        e["id"] for e in scenario.get("elements", [])
        if e.get("type") in ("draggable", "both")
    }
    for j, st in enumerate(scenario.get("steps", [])):
        src = st["action_attendue"].get("source")
        if src not in grabbable:
            raise ValueError(
                f"step {j + 1}: source '{src}' n'est pas un element préhensible "
                f"(draggable/both)."
            )


def _repair_element_types(scenario: dict) -> None:
    """T4.2 (réparation déterministe) — garantit la jouabilité :
       - un element utilisé comme `source` mais pas comme `target` -> 'draggable'
       - un element utilisé à la fois comme source et target -> 'both'
       - un element utilisé uniquement comme `target` -> 'dropzone'
       - les autres gardent leur type (ex: 'static' décoratif).
    Modifie scenario en place."""
    sources = set()
    targets = set()
    for st in scenario.get("steps", []):
        a = st.get("action_attendue", {})
        sources.add(a.get("source"))
        targets.add(a.get("target"))
    for el in scenario.get("elements", []):
        eid = el.get("id")
        is_src = eid in sources
        is_tgt = eid in targets
        if is_src and is_tgt:
            el["type"] = "both"
        elif is_src:
            el["type"] = "draggable"
        elif is_tgt:
            el["type"] = "dropzone"
        # sinon : on laisse le type tel quel (static décoratif, etc.)


def generate_scenario(
    recipe_id: str,
    child_name: str = "Léa",
    *,
    graph: Optional[KnowledgeGraph] = None,
) -> dict:
    """T4.1 — génère un bloc scenario valide pour la recette donnée.

    Retourne un dict conforme au schéma (background, elements, steps).
    Lève ScenarioGenerationError si le LLM échoue à produire du YAML valide
    et cohérent après 2 tentatives.
    """
    graph = graph or load_graph()
    if recipe_id not in graph.recipes_by_id:
        raise ScenarioGenerationError(f"Recette inconnue : {recipe_id}")
    recipe = graph.recipe(recipe_id)
    user_prompt = _build_user_prompt(recipe, graph, child_name)

    last_err = None
    for attempt in (1, 2):
        try:
            raw = call_llm(SYSTEM_PROMPT, user_prompt, max_tokens=1200, temperature=0.8)
            yaml_text = _extract_yaml(raw)
            scenario = yaml.safe_load(yaml_text)
            if isinstance(scenario, str):
                # Cas : le LLM a retourné "scenario:\n ..." au premier niveau.
                scenario = yaml.safe_load(scenario)
            # Normalise : accepte {"scenario": {...}} ou {...}.
            if isinstance(scenario, dict) and "scenario" in scenario and isinstance(scenario["scenario"], dict):
                scenario = scenario["scenario"]
            if not isinstance(scenario, dict):
                raise ValueError("Le YAML n'est pas un dictionnaire.")
            # Valide la structure (lève GraphError si invalide).
            KnowledgeGraph.validate_scenario(scenario, recipe_id)
            # T4.2 (jouabilité) — on NE rejette plus : on répare. Tout élément
            # utilisé comme `source` (mais pas comme `target`) devient draggable ;
            # tout élément utilisé à la fois comme source et target devient "both".
            _repair_element_types(scenario)
            return scenario
        except (yaml.YAMLError, GraphError, ValueError) as e:
            last_err = e
            continue
        except Exception as e:  # erreur API
            last_err = e
            continue
    raise ScenarioGenerationError(
        f"Impossible de générer un scénario valide pour '{recipe_id}' : {last_err}"
    )


if __name__ == "__main__":
    import sys

    rid = sys.argv[1] if len(sys.argv) > 1 else "recette_fonte"
    name = sys.argv[2] if len(sys.argv) > 2 else "Léa"
    try:
        sc = generate_scenario(rid, name)
    except ScenarioGenerationError as e:
        print("ÉCHEC :", e)
        sys.exit(1)
    print(yaml.safe_dump(sc, allow_unicode=True, sort_keys=False))
