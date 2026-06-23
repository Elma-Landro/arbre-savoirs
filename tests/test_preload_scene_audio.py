"""
test_preload_scene_audio.py — Préchargement audio complet d'une scène.

Objectif : vérifier que l'API génère réellement en une seule requête les audios
`instruction_tts` et `success_tts` de toutes les étapes d'une recette, afin que
le frontend n'attende plus gTTS entre les actions.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import main  # noqa: E402

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"


def test_preload_scene_audio_contract() -> tuple[bool, str]:
    recipe = main.GRAPH.recipe("fondeur_naissance_acier")
    expected_count = len(recipe["scenario"]["steps"]) * 2

    req = main.PreloadSceneAudioRequest(recipe_id="fondeur_naissance_acier", child_name="Léa")
    data = main.api_preload_scene_audio(req)

    if data["recipe_id"] != "fondeur_naissance_acier":
        return False, f"recipe_id inattendu : {data['recipe_id']}"
    if data["count"] != expected_count:
        return False, f"count={data['count']} attendu={expected_count}"
    if set(data["audios"].keys()) != {str(s["id"]) for s in recipe["scenario"]["steps"]}:
        return False, f"clés audios inattendues : {data['audios'].keys()}"
    for step_id, pair in data["audios"].items():
        for key in ("instruction", "success"):
            if key not in pair:
                return False, f"{step_id}: clé manquante {key}"
            url = pair[key]["audio_url"]
            filename = pair[key]["filename"]
            if not url.startswith("/api/audio/"):
                return False, f"{step_id}/{key}: audio_url invalide {url}"
            if not filename.endswith(".mp3"):
                return False, f"{step_id}/{key}: filename invalide {filename}"
            path = main.AUDIO_OUT_DIR / filename
            if not path.exists() or path.stat().st_size <= 0:
                return False, f"{step_id}/{key}: fichier audio non généré {filename}"
    return True, f"{expected_count} pistes réelles préchargées pour fondeur_naissance_acier."


def main_test() -> int:
    print("=" * 70)
    print("PRIORITÉ UX — Préchargement audio d'une scène")
    print("=" * 70)
    try:
        ok, detail = test_preload_scene_audio_contract()
    except Exception as e:  # noqa: BLE001 — script d'acceptation lisible
        ok, detail = False, f"Exception : {type(e).__name__}: {e}"
    print(f"\n  T-PRELOAD-1  [{PASS if ok else FAIL}]  {detail}\n")
    print("RÉSULTAT PRELOAD AUDIO :", PASS if ok else FAIL)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main_test())
