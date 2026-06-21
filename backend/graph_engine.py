"""
graph_engine.py — Moteur de Graphe de Connaissances (Objectif 1).

Charge, valide et parcourt `knowledge_graph.yaml`.
Fournit une API simple utilisée par le reste du backend (story_generator,
meta_story, API FastAPI).

Une "arête" de transformation est déduite implicitement de chaque recette :
    chaque ingredient --(recette)--> chaque resultat
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import yaml

# Champs obligatoires pour qu'un nœud / une recette soient valides.
NODE_REQUIRED_FIELDS = ("id", "label", "type", "description")
RECIPE_REQUIRED_FIELDS = ("id", "titre", "ingredients", "resultat", "scenario")

# Champs requis d'un bloc scenario (moteur de scène interactif).
SCENARIO_REQUIRED_FIELDS = ("background", "elements", "steps")
ELEMENT_REQUIRED_FIELDS = ("id", "emoji", "type")
STEP_REQUIRED_FIELDS = ("id", "instruction_tts", "action_attendue", "success_tts")
VALID_ELEMENT_TYPES = ("draggable", "dropzone", "static", "both")
VALID_ACTION_TYPES = ("drag_and_drop", "click")

# Chemin par défaut : remonte depuis backend/ vers la racine du projet.
DEFAULT_GRAPH_PATH = Path(__file__).resolve().parent.parent / "knowledge_graph.yaml"


class GraphError(Exception):
    """Levée quand le graphe est structurellement invalide (parsing, intégrité)."""


class KnowledgeGraph:
    """Représentation en mémoire du graphe de connaissances."""

    def __init__(self, nodes: list[dict], recipes: list[dict], source: str = ""):
        self.nodes = nodes
        self.recipes = recipes
        self.source = source
        # Index pour accès rapide : id -> nœud / recette.
        self.nodes_by_id = {n["id"]: n for n in nodes}
        self.recipes_by_id = {r["id"]: r for r in recipes}

    # ------------------------------------------------------------------ load
    @classmethod
    def load(cls, path: Optional[str | Path] = None) -> "KnowledgeGraph":
        """Charge et valide complètement un fichier YAML.

        Lève GraphError si le parsing échoue ou si l'intégrité n'est pas respectée.
        """
        path = Path(path) if path else DEFAULT_GRAPH_PATH
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
        except yaml.YAMLError as e:  # parsing cassé
            raise GraphError(f"Erreur de parsing YAML : {e}") from e
        except FileNotFoundError as e:
            raise GraphError(f"Fichier introuvable : {path}") from e

        if not isinstance(data, dict):
            raise GraphError("La racine du YAML doit être un dictionnaire.")

        nodes = data.get("nodes") or []
        recipes = data.get("recipes") or []
        cls.validate(nodes, recipes)  # lève si invalide
        return cls(nodes, recipes, source=str(path))

    # ------------------------------------------------------------- validation
    @staticmethod
    def validate(nodes: list[dict], recipes: list[dict]) -> None:
        """Valide T1.1 (champs) + T1.2 (intégrité des références). Lève GraphError."""
        if not isinstance(nodes, list) or not isinstance(recipes, list):
            raise GraphError("`nodes` et `recipes` doivent être des listes.")

        # T1.1 — champs obligatoires des nœuds + unicité des ids.
        seen = set()
        for i, node in enumerate(nodes):
            if not isinstance(node, dict):
                raise GraphError(f"Nœud #{i} : doit être un dictionnaire.")
            missing = [f for f in NODE_REQUIRED_FIELDS if f not in node or node[f] in (None, "")]
            if missing:
                raise GraphError(
                    f"Nœud #{i} '{node.get('id', '?')}' : champs manquants {missing}."
                )
            if node["id"] in seen:
                raise GraphError(f"Nœud #{i} : id dupliqué '{node['id']}'.")
            seen.add(node["id"])

        node_ids = seen

        # T1.2 — chaque recette référence des nœuds existants.
        seen_rec = set()
        for i, recipe in enumerate(recipes):
            if not isinstance(recipe, dict):
                raise GraphError(f"Recette #{i} : doit être un dictionnaire.")
            missing = [f for f in RECIPE_REQUIRED_FIELDS if f not in recipe or recipe[f] in (None, "", [])]
            if missing:
                raise GraphError(
                    f"Recette #{i} '{recipe.get('id', '?')}' : champs manquants {missing}."
                )
            rid = recipe["id"]
            if rid in seen_rec:
                raise GraphError(f"Recette #{i} : id dupliqué '{rid}'.")
            seen_rec.add(rid)

            # Vérifie que ingredients[] et resultat[] pointent vers des nœuds connus.
            for kind in ("ingredients", "resultat"):
                items = recipe[kind]
                if not isinstance(items, list) or len(items) == 0:
                    raise GraphError(
                        f"Recette '{rid}' : '{kind}' doit être une liste non vide."
                    )
                for j, item in enumerate(items):
                    ref = item.get("id") if isinstance(item, dict) else item
                    if ref not in node_ids:
                        raise GraphError(
                            f"Recette '{rid}' : {kind}[{j}] référence un nœud "
                            f"inconnu '{ref}'."
                        )

            # T1.2 + T1.3 — validation du bloc scenario (moteur de scène).
            KnowledgeGraph.validate_scenario(recipe["scenario"], rid)

    # ---------------------------------------------------- validation scenario
    @staticmethod
    def validate_scenario(scenario: dict, rid: str = "?") -> None:
        """T1.2 : chaque recette a un bloc scenario avec background, elements (>=1)
        et au moins 2 steps séquentielles.
        T1.3 : les action_attendue.source/target référencent des ids d'elements.
        Lève GraphError si invalide."""
        if not isinstance(scenario, dict):
            raise GraphError(f"Recette '{rid}' : 'scenario' doit être un dictionnaire.")
        for f in SCENARIO_REQUIRED_FIELDS:
            if f not in scenario or scenario[f] in (None, "", []):
                raise GraphError(
                    f"Recette '{rid}' : scenario.{f} manquant ou vide."
                )

        # elements : liste de dicts avec (id, emoji, type) ; ids uniques.
        elements = scenario["elements"]
        if not isinstance(elements, list) or len(elements) < 1:
            raise GraphError(f"Recette '{rid}' : scenario.elements doit avoir >=1 élément.")
        elt_ids = set()
        for j, el in enumerate(elements):
            if not isinstance(el, dict):
                raise GraphError(f"Recette '{rid}' : scenario.elements[{j}] doit être un dict.")
            miss = [f for f in ELEMENT_REQUIRED_FIELDS if f not in el or el[f] in (None, "")]
            if miss:
                raise GraphError(
                    f"Recette '{rid}' : scenario.elements[{j}] champs manquants {miss}."
                )
            if el["type"] not in VALID_ELEMENT_TYPES:
                raise GraphError(
                    f"Recette '{rid}' : scenario.elements[{j}] type '{el['type']}' "
                    f"invalide (attendu parmi {VALID_ELEMENT_TYPES})."
                )
            if el["id"] in elt_ids:
                raise GraphError(
                    f"Recette '{rid}' : scenario.elements[{j}] id dupliqué '{el['id']}'."
                )
            elt_ids.add(el["id"])

        # steps : au moins 2, séquentielles, avec instruction/success + action valide.
        steps = scenario["steps"]
        if not isinstance(steps, list) or len(steps) < 2:
            raise GraphError(
                f"Recette '{rid}' : scenario.steps doit avoir >=2 étapes "
                f"(reçu {len(steps) if isinstance(steps, list) else 0})."
            )
        for j, st in enumerate(steps):
            if not isinstance(st, dict):
                raise GraphError(f"Recette '{rid}' : scenario.steps[{j}] doit être un dict.")
            miss = [f for f in STEP_REQUIRED_FIELDS if f not in st or st[f] in (None, "", {})]
            if miss:
                raise GraphError(
                    f"Recette '{rid}' : scenario.steps[{j}] champs manquants {miss}."
                )
            action = st["action_attendue"]
            if not isinstance(action, dict) or "type" not in action:
                raise GraphError(
                    f"Recette '{rid}' : scenario.steps[{j}].action_attendue invalide."
                )
            if action["type"] not in VALID_ACTION_TYPES:
                raise GraphError(
                    f"Recette '{rid}' : scenario.steps[{j}] action.type "
                    f"'{action['type']}' invalide (attendu {VALID_ACTION_TYPES})."
                )
            # T1.3 — source et target référencent des ids d'elements, ET ont un
            # type compatible avec leur rôle (défense en profondeur : un élément
            # qui n'est ni draggable ni both ne peut être saisi ; un élément qui
            # n'est ni dropzone ni both ne peut recevoir de dépôt).
            elt_types = {e["id"]: e["type"] for e in elements}
            for role in ("source", "target"):
                ref = action.get(role)
                if ref not in elt_ids:
                    raise GraphError(
                        f"Recette '{rid}' : scenario.steps[{j}].action_attendue.{role} "
                        f"'{ref}' ne référence aucun element (attendu parmi {sorted(elt_ids)})."
                    )
            src_type = elt_types[action.get("source")]
            tgt_type = elt_types[action.get("target")]
            if src_type not in ("draggable", "both"):
                raise GraphError(
                    f"Recette '{rid}' : scenario.steps[{j}] source "
                    f"'{action.get('source')}' est de type '{src_type}' (doit être "
                    f"draggable ou both pour être saisie)."
                )
            if tgt_type not in ("dropzone", "both"):
                raise GraphError(
                    f"Recette '{rid}' : scenario.steps[{j}] target "
                    f"'{action.get('target')}' est de type '{tgt_type}' (doit être "
                    f"dropzone ou both pour recevoir un dépôt)."
                )

    # --------------------------------------------------------------- helpers
    def node(self, node_id: str) -> dict:
        if node_id not in self.nodes_by_id:
            raise KeyError(node_id)
        return self.nodes_by_id[node_id]

    def recipe(self, recipe_id: str) -> dict:
        if recipe_id not in self.recipes_by_id:
            raise KeyError(recipe_id)
        return self.recipes_by_id[recipe_id]

    def recipes_for_ingredient(self, node_id: str) -> list[dict]:
        """Recettes qui consomment un nœud donné comme ingrédient (arêtes sortantes)."""
        return [r for r in self.recipes if any(i.get("id") == node_id for i in r["ingredients"])]

    def recipes_producing(self, node_id: str) -> list[dict]:
        """Recettes qui produisent un nœud donné (arêtes entrantes)."""
        return [r for r in self.recipes if any(res.get("id") == node_id for res in r["resultat"])]

    def trace_chain(self, start_id: str, end_id: str) -> list[str] | None:
        """T1.3 — remonte/parcourt la chaîne de transformation de start_id à end_id.

        Suit les arêtes implicites (ingredient -> resultat). Retourne la liste
        ordonnée des ids de nœuds du chemin, ou None si aucun chemin n'existe.
        """
        # BFS sur le graphe orienté ingredient -> resultat.
        from collections import deque

        # Construit les arêtes : pour chaque recette, de chaque ingredient à chaque resultat.
        adj: dict[str, list[str]] = {n["id"]: [] for n in self.nodes}
        for r in self.recipes:
            for ing in r["ingredients"]:
                for res in r["resultat"]:
                    adj[ing.get("id")].append(res.get("id"))

        if start_id not in adj or end_id not in adj:
            return None

        q = deque([(start_id, [start_id])])
        seen = {start_id}
        while q:
            cur, path = q.popleft()
            if cur == end_id:
                return path
            for nxt in adj.get(cur, []):
                if nxt not in seen:
                    seen.add(nxt)
                    q.append((nxt, path + [nxt]))
        return None


def load_graph(path: Optional[str | Path] = None) -> KnowledgeGraph:
    """Raccourci : charge le graphe par défaut (ou un chemin donné)."""
    return KnowledgeGraph.load(path)


if __name__ == "__main__":
    # Permet de valider rapidement en ligne de commande : python graph_engine.py
    g = load_graph()
    print(f"OK : {len(g.nodes)} nœuds, {len(g.recipes)} recettes chargés depuis {g.source}")
