"""
test_objective4_scenario.py — Tests V2 de l'Objectif 4 (appels LLM RÉELS).

  T4.1 generate_scenario -> dict avec background (connu), elements (>=1),
       steps (>=2) valides selon validate_scenario.
  T4.2 Cohérence des actions : chaque source est un element de type 'draggable'.
  T4.3 Intégration du prénom : les textes TTS incluent le prénom de l'enfant.

Lancement :  python tests/test_objective4_scenario.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from graph_engine import load_graph, KnowledgeGraph  # noqa: E402
from scenario_generator import generate_scenario, ScenarioGenerationError  # noqa: E402

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
results = []


def record(tid, ok, detail):
    results.append((tid, PASS if ok else FAIL, detail))


def main() -> int:
    print("=" * 70)
    print("OBJECTIF 4 (V2) — Générateur de Scénarios par LLM (réel)")
    print("=" * 70)

    child = "Léa"
    g = load_graph()
    # On génère pour une recette où le LLM doit inventer les éléments.
    scenario = None
    err = None
    try:
        scenario = generate_scenario("recette_bucheronnage", child, graph=g)
    except ScenarioGenerationError as e:
        err = e

    # --- T4.1 : structure valide -----------------------------------------
    ok_t41 = False
    detail_t41 = ""
    if scenario:
        try:
            KnowledgeGraph.validate_scenario(scenario, "t41")
            n_steps = len(scenario.get("steps", []))
            n_elt = len(scenario.get("elements", []))
            ok_t41 = bool(scenario.get("background")) and n_elt >= 1 and n_steps >= 2
            detail_t41 = f"bg={scenario.get('background')}, {n_elt} elements, {n_steps} steps, validé."
        except Exception as e:
            detail_t41 = f"Invalide : {e}"
    else:
        detail_t41 = f"Génération échouée : {err}"
    record("T4.1", ok_t41, detail_t41)

    if not scenario:
        for tid in ("T4.2", "T4.3"):
            record(tid, False, "Pas de scénario généré.")
        hard_fail = any(s == FAIL for _, s, _ in results)
        print(); return 1

    # --- T4.2 : cohérence source -> draggable ----------------------------
    draggable_ids = {e["id"] for e in scenario["elements"] if e.get("type") == "draggable"}
    bad = [(j + 1, st["action_attendue"]["source"])
           for j, st in enumerate(scenario["steps"])
           if st["action_attendue"]["source"] not in draggable_ids]
    record("T4.2", not bad, "Toutes les sources sont draggables." if not bad else f"Sources non-draggables : {bad}")

    # --- T4.3 : prénom dans les textes TTS -------------------------------
    all_tts = []
    for st in scenario["steps"]:
        all_tts.append(st.get("instruction_tts", ""))
        all_tts.append(st.get("success_tts", ""))
    joined = " ".join(all_tts).lower()
    ok_t43 = child.lower() in joined
    record("T4.3", ok_t43,
           f"Prénom '{child}' présent dans {joined.count(child.lower())} textes TTS." if ok_t43
           else "Prénom absent des textes TTS.")

    print()
    for tid, status, detail in results:
        print(f"  {tid}  [{status}]  {detail}")
    print()
    hard_fail = any(s == FAIL for _, s, _ in results)
    print("RÉSULTAT OBJECTIF 4 :", FAIL if hard_fail else PASS)
    return 1 if hard_fail else 0


if __name__ == "__main__":
    sys.exit(main())
