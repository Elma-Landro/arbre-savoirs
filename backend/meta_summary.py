"""
meta_summary.py — Résumé de célébration pour la scène finale (Objectif 5 V2).

Génère un court texte narratif résumant les accomplissements de l'enfant,
pour la narration TTS de la scène de célébration. Réutilise llm_client.
"""
from __future__ import annotations

from typing import Optional

from graph_engine import KnowledgeGraph, load_graph
from llm_client import call_llm

SYSTEM_PROMPT = (
    "Tu es un conteur pour enfants de 4 à 6 ans. Tu écris en français, "
    "chaleureusement, pour féliciter un enfant de ses accomplissements. "
    "Tu n'écris QUE le texte, sans commentaire."
)


class MetaBlocked(RuntimeError):
    def __init__(self, msg, fallback):
        super().__init__(msg)
        self.fallback = fallback


def _fallback(recipe_titles: list[str], child_name: str) -> str:
    liste = ", ".join(recipe_titles[:-1]) + " et " + recipe_titles[-1] if len(recipe_titles) > 1 else recipe_titles[0]
    return (
        f"Bravo {child_name} ! Tu as accompli de grandes choses aujourd'hui. "
        f"Tu as appris {liste}. Quel parcours extraordinaire ! "
        f"Chaque métier t'a appris un secret du monde. Sois fier de toi, "
        f"{child_name}, tu es un vrai petit artisan. Fin. "
        f"(Résumé de démonstration — LLM indisponible.)"
    )


def generate_summary(
    recipe_ids: list[str],
    child_name: str = "Léa",
    *,
    graph: Optional[KnowledgeGraph] = None,
) -> str:
    """Génère un résumé de célébration (150-300 mots) des recettes complétées."""
    graph = graph or load_graph()
    titles = []
    for rid in recipe_ids:
        if rid in graph.recipes_by_id:
            titles.append(graph.recipe(rid).get("titre", rid))
    if not titles:
        return _fallback(["une belle aventure"], child_name)

    prompt = (
        f"L'enfant s'appelle {child_name}. Il vient de compléter ces aventures : "
        f"{', '.join(titles)}. Écris un texte de célébration de 150 à 300 mots "
        f"qui félicite {child_name} et résume fièrement ce qu'il a appris à fabriquer. "
        f"Mentionne son prénom plusieurs fois."
    )
    try:
        text = call_llm(SYSTEM_PROMPT, prompt, max_tokens=700, temperature=0.85)
        # Tronque un éventuel débordement.
        words = text.split()
        if len(words) > 320:
            text = " ".join(words[:320]) + "…"
        return text.strip()
    except Exception as e:
        raise MetaBlocked(f"LLM indisponible : {e}", _fallback(titles, child_name))
