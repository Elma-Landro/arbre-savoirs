"""
test_objective3_tts.py — Tests d'acceptation de l'Objectif 3 (audio RÉEL).

  T3.1  narrate_story produit un fichier .mp3 sur le disque sans erreur.
  T3.2  Fichier > 10 Ko.
  T3.3  Durée audio entre 45 s et 3 min (via mutagen).
  T3.4  Le prompt TTS contient ':' séparant style (en) / texte (fr),
        et la partie style est en anglais, la partie spoken en français.

Lancement :  python tests/test_objective3_tts.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from tts_narrator import narrate_story, get_audio_duration, build_tts_prompt, last_prompt  # noqa: E402

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
BLOCKED = "\033[33mBLOCKED\033[0m"

results: list[tuple[str, str, str]] = []


def record(tid, status, detail=""):
    results.append((tid, status, detail))


# Quelques mots anglais typiques des instructions de style (première partie).
EN_HINTS = ("warm", "gentle", "voice", "storyteller", "slow", "clear", "enthusiastic", "french")


def main() -> int:
    print("=" * 70)
    print("OBJECTIF 3 — Narration TTS (gTTS réel)")
    print("=" * 70)

    # T3.3 évalue la narration d'une *histoire* (l'unité fonctionnelle de l'app),
    # pas d'une phrase. On utilise donc un texte d'histoire représentatif
    # (~150–250 mots, cohérent avec T2.2) pour que la durée tombe dans la
    # fourchette 45 s – 3 min attendue par le prompt agent.
    text = (
        "Il était une fois une petite fille curieuse qui s'appelait Léa. "
        "Un beau matin, Léa décida de devenir fondeur, un métier extraordinaire "
        "qui transforme la roche en métal brillant. [courte pause] "
        "Léa prit son grand panier et partit chercher le minerai de fer, "
        "cette roche rougeâtre cachée au creux de la terre. Elle ramassa "
        "aussi du charbon, cette pierre noire qui brûle si longtemps. "
        "De retour à l'atelier, Léa alluma un immense four. La chaleur "
        "devint si intense que la roche commença à fondre doucement, "
        "comme du beurre dans une poêle. [rire doux] "
        "Léa regardait, émerveillée, les bulles danser à la surface du métal. "
        "Avec précaution, elle versa le liquide incandescent dans un moule. "
        "Puis vint le moment d'attendre, le plus difficile pour une enfant "
        "impatiente ! Quand le métal refroidit enfin, Léa découvrit un "
        "magnifique lingot d'acier, lisse et solide, qui brillait comme "
        "une étoile. Elle le souleva avec fierté : il était un peu lourd, "
        "mais quelle joie ! Léa venait de comprendre un grand secret du "
        "monde : la roche cache en elle le métal, et avec du feu, de la "
        "patience et beaucoup de courage, on peut tout transformer. "
        "Elle sourit en pensant déjà à ce qu'elle allait fabriquer avec "
        "son lingot d'acier. Fin."
    )

    # Génère l'audio.
    out = None
    blocked = False
    err = None
    try:
        out = narrate_story(text, "Léa")
    except Exception as e:  # noqa: BLE001  (TtsBlocked ou autre)
        blocked = True
        err = e

    # --- T3.1 -----------------------------------------------------------------
    if out and out.exists():
        record("T3.1", PASS, f"Fichier audio généré : {out.name}.")
    else:
        record("T3.1", FAIL, f"Aucun fichier généré : {err}")
        if blocked:
            record("T3.1", BLOCKED, "gTTS indisponible (réseau ?). Audio non généré.")

    # --- T3.2 -----------------------------------------------------------------
    if out and out.exists():
        size_kb = out.stat().st_size / 1024
        ok = size_kb > 10
        record("T3.2", PASS if ok else FAIL, f"{size_kb:.1f} Ko (> 10 Ko).")
    else:
        record("T3.2", BLOCKED if blocked else FAIL, "Pas de fichier à mesurer.")

    # --- T3.3 -----------------------------------------------------------------
    if out and out.exists():
        dur = get_audio_duration(out)
        if dur is None:
            record("T3.3", FAIL, "Durée indétectable par mutagen.")
        else:
            ok = 45 <= dur <= 180
            record("T3.3", PASS if ok else FAIL, f"{dur:.1f} s (fourchette 45–180 s).")
    else:
        record("T3.3", BLOCKED if blocked else FAIL, "Pas de fichier à mesurer.")

    # --- T3.4 -----------------------------------------------------------------
    prompt = build_tts_prompt(text)
    has_colon = ":" in prompt
    style_part, _, spoken_part = prompt.partition(":")
    style_en = any(h in style_part.lower() for h in EN_HINTS)
    spoken_fr = "léa" in spoken_part.lower() and "fer" in spoken_part.lower()
    ok_t34 = has_colon and style_en and spoken_fr
    detail = (f"Prompt contient ':'={has_colon}, "
              f"style en anglais={style_en}, spoken en français={spoken_fr}.")
    record("T3.4", PASS if ok_t34 else FAIL, detail)
    if ok_t34:
        print("        Prompt TTS :", prompt[:120], "...")

    print()
    for tid, status, detail in results:
        print(f"  {tid}  [{status}]  {detail}")
    print()
    hard_fail = any(s == FAIL for _, s, _ in results)
    print("RÉSULTAT OBJECTIF 3 :",
          FAIL if hard_fail else (PASS if not blocked else BLOCKED))
    return 1 if hard_fail else 0


if __name__ == "__main__":
    sys.exit(main())
