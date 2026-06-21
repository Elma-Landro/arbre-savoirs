"""
test_audio_unique.py — Test de régression (bug "toujours la 1re piste").

Le nom de fichier audio doit dépendre du CONTENU, pas seulement du prénom,
sinon deux histoires différentes du même enfant s'écrasent et le navigateur
sert la version en cache (la première).

Reproduction : générer l'audio de 2 textes différents pour le même enfant doit
produire 2 fichiers distincts (noms différents + durées/tailles différentes).

Lancement :  python tests/test_audio_unique.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from tts_narrator import narrate_story, get_audio_duration  # noqa: E402

PASS = "\033[32mPASS\033[0m"
FAIL = "\033[31mFAIL\033[0m"
results = []


def record(ok, detail):
    results.append((PASS if ok else FAIL, detail))


def main() -> int:
    print("=" * 70)
    print("RÉGRESSION — Pistes audio uniques par contenu")
    print("=" * 70)

    text_a = (
        "Il était une fois Léa qui devint fondeur. "
        "Elle fit fondre le minerai de fer avec du charbon dans un grand four, "
        "et obtint un magnifique lingot d'acier brillant. Elle était très fière."
    )
    text_b = (
        "Léa devint bûcheron ce jour-là. Elle choisit un grand tronc d'arbre "
        "et, avec une scie bien aiguisée, le découpa en belles planches lisses. "
        "L'odeur du bois frais était délicieuse. Quel travail soigneux !"
    )

    pa = narrate_story(text_a, "Léa")
    pb = narrate_story(text_b, "Léa")

    # Critère 1 : noms de fichiers différents.
    record(pa.name != pb.name,
           f"Noms : {pa.name} vs {pb.name} -> {'différents' if pa.name != pb.name else 'IDENTIQUES (bug)'}")

    # Critère 2 : durées différentes (preuve que le contenu diffère).
    da = get_audio_duration(pa) or 0
    db = get_audio_duration(pb) or 0
    record(abs(da - db) > 1.0,
           f"Durées : {da:.1f}s vs {db:.1f}s -> {'différentes' if abs(da - db) > 1.0 else 'identiques (bug)'}")

    # Nettoyage.
    for p in (pa, pb):
        try:
            p.unlink()
        except OSError:
            pass

    print()
    for st, d in results:
        print(f"  [{st}]  {d}")
    hard_fail = any(s == FAIL for s, _ in results)
    print("\nRÉSULTAT :", FAIL if hard_fail else PASS)
    return 1 if hard_fail else 0


if __name__ == "__main__":
    sys.exit(main())
