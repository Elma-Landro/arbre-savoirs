"""
test_objective1_graph.py — Tests d'acceptation V2 de l'Objectif 1.

  T1.1  Chargement du fichier YAML : parsing OK ; >= 8 nœuds et >= 3 recettes.
  T1.2  Intégrité des scénarios : chaque recette possède un bloc `scenario`
        avec `background`, `elements` (>=1) et au moins 2 `steps` séquentielles.
  T1.3  Validité des actions : chaque `action_attendue.source`/`.target`
        référence un `id` d'élément défini dans le bloc `elements`.

Lancement :  python tests/test_objective1_graph.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from graph_engine import KnowledgeGraph, GraphError, DEFAULT_GRAPH_PATH  # noqa: E402

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
results: list[tuple[str, str, str]] = []


def record(tid: str, ok: bool, detail: str = "") -> None:
    results.append((tid, PASS if ok else FAIL, detail))


def test_t1_1() -> None:
    try:
        g = KnowledgeGraph.load(DEFAULT_GRAPH_PATH)
    except GraphError as e:
        record("T1.1", False, f"Erreur de chargement : {e}")
        return
    required = ("id", "label", "type", "description")
    bad = [(n.get("id", "?"), [f for f in required if f not in n or n[f] in (None, "")])
           for n in g.nodes
           if any(f not in n or n[f] in (None, "") for f in required)]
    ok = len(g.nodes) >= 8 and len(g.recipes) >= 3 and not bad
    detail = f"{len(g.nodes)} nœuds (>=8), {len(g.recipes)} recettes (>=3)."
    if bad:
        detail += f" | nœuds malformés: {bad}"
    record("T1.1", ok, detail)


def test_t1_2() -> None:
    try:
        g = KnowledgeGraph.load(DEFAULT_GRAPH_PATH)
    except GraphError as e:
        record("T1.2", False, f"Graphe invalide : {e}")
        return
    bad = []
    for r in g.recipes:
        sc = r.get("scenario", {})
        has_bg = bool(sc.get("background"))
        n_elt = len(sc.get("elements", [])) if isinstance(sc.get("elements"), list) else 0
        n_steps = len(sc.get("steps", [])) if isinstance(sc.get("steps"), list) else 0
        if not (has_bg and n_elt >= 1 and n_steps >= 2):
            bad.append((r["id"], f"bg={has_bg}, elements={n_elt}, steps={n_steps}"))
    record("T1.2", not bad,
           f"{len(g.recipes)} scénarios valides." if not bad else f"Scénarios incomplets : {bad}")


def test_t1_3() -> None:
    try:
        g = KnowledgeGraph.load(DEFAULT_GRAPH_PATH)
    except GraphError as e:
        record("T1.3", False, str(e))
        return
    bad = []
    for r in g.recipes:
        sc = r["scenario"]
        elt_ids = {e["id"] for e in sc["elements"]}
        for j, st in enumerate(sc["steps"]):
            a = st["action_attendue"]
            for role in ("source", "target"):
                if a.get(role) not in elt_ids:
                    bad.append((r["id"], j, role, a.get(role)))
    record("T1.3", not bad,
           "Toutes les actions référencent des elements valides." if not bad
           else f"Actions cassées : {bad}")


def main() -> int:
    print("=" * 70)
    print("OBJECTIF 1 (V2) — Graphe de connaissances + scénarios interactifs")
    print("=" * 70)
    for fn in (test_t1_1, test_t1_2, test_t1_3):
        fn()
    print()
    all_ok = True
    for tid, status, detail in results:
        print(f"  {tid}  [{status}]  {detail}")
        all_ok = all_ok and status == PASS
    print()
    print("RÉSULTAT OBJECTIF 1 :", PASS if all_ok else FAIL)
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
