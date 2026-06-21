"""
tts_narrator.py — Narrateur TTS (Objectif 3).

Convertit le texte d'une histoire en fichier audio `.mp3` en français,
avec une voix douce et enjouée adaptée aux enfants.

Contrainte de prompt TTS (impérative, cf. prompt agent Objectif 3) :
    {Instructions de style EN ANGLAIS} : {Texte spoken en français}
Les émotions sont dans les instructions de style (avant les deux-points),
jamais via des tags dans le texte. Sons non-verbaux ponctuels autorisés
dans le texte spoken (`[courte pause]`, `[rire doux]`).

Implémentation : gTTS (Google Text-to-Speech, fr-FR, hors-ligne, gratuit).
gTTS ne supporte pas nativement les "instructions de style", mais :
  - On construit quand même le prompt formé "{style anglais} : {texte fr}"
    (T3.4) et on le journalise (build_tts_prompt / last_prompt).
  - On transmet uniquement la partie française à gTTS pour la synthèse
    (les instructions anglaises de style ne sont pas parlées).
  - On applique le "slow=True" de gTTS pour se rapprocher de l'effet
    "voix lente et claire, comme une histoire du soir" demandé.

Règle 5 : en cas d'erreur réseau gTTS, on retente une fois, puis on lève
TtsBlocked (l'audio n'est pas généré). gTTS nécessite un accès à
translate.google.com ; si hors-ligne, le test sera BLOCKED.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path
from typing import Optional

from mutagen.mp3 import MP3
from mutagen.mp4 import MP4

# Style (EN ANGLAIS) appliqué à toutes les narrations.
STYLE_INSTRUCTIONS = (
    "Warm, gentle French female storyteller voice speaking to a 4-year-old child. "
    "Slow, clear, and wonderfully enthusiastic pace, as if reading a bedtime adventure story"
)

AUDIO_OUT_DIR = Path(__file__).resolve().parent / "audio_out"

# Variable de module : dernier prompt TTS construit (T3.4 — inspection de log).
last_prompt: str = ""


def build_tts_prompt(spoken_text: str) -> str:
    """Construit le prompt TTS au format requis : '{style anglais} : {texte fr}'."""
    return f"{STYLE_INSTRUCTIONS} : {spoken_text.strip()}"


def _strip_style_tags(spoken_text: str) -> str:
    """Retire les sons non-verbaux entre crochets avant l'envoi à gTTS
    (gTTS ne sait pas interpréter `[courte pause]`). Les crochets sont
    conservés dans le prompt journalisé pour respecter le format attendu."""
    return re.sub(r"\[[^\]]+\]", " ", spoken_text)


def _detect_duration(path: Path) -> Optional[float]:
    """Retourne la durée audio en secondes (mp3 via mutagen). None si indétectable."""
    try:
        if path.suffix.lower() == ".mp3":
            return float(MP3(str(path)).info.length)
        if path.suffix.lower() in (".m4a", ".mp4"):
            return float(MP4(str(path)).info.length)
    except Exception:
        return None
    return None


def narrate_story(
    text: str,
    child_name: str = "Léa",
    *,
    out_dir: Optional[Path] = None,
    filename: Optional[str] = None,
    slow: bool = False,  # gTTS slow=False : voix à vitesse naturelle (plus agréable)
) -> Path:
    """Génère un fichier audio `.mp3` pour le texte donné.

    Retourne le chemin du fichier produit. Lève TtsBlocked si la synthèse
    échoue durablement (Règle 5).

    T3.1 : produit un .mp3 sur le disque sans erreur.
    T3.2 : fichier > 10 Ko.
    T3.3 : durée 45s–3min (vérifiable via get_audio_duration).
    T3.4 : last_prompt contient ':' séparant style (en) / texte (fr).
    """
    global last_prompt

    out_dir = Path(out_dir) if out_dir else AUDIO_OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9_-]", "_", child_name)
    # Le nom de fichier DOIT dépendre du contenu (et pas seulement du prénom),
    # sinon deux histoires du même enfant s'écrasent et le navigateur sert sa
    # version en cache (la première piste). Un hash court du texte rend l'URL
    # unique par contenu — c'est aussi un mini-cache gratuit : même texte =>
    # même fichier, donc pas de re-synthèse lente de gTTS.
    if filename:
        fname = filename
    else:
        digest = hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]
        fname = f"story_{safe_name}_{digest}.mp3"
    out_path = out_dir / fname

    # T3.4 — on construit ET on journalise le prompt au format requis.
    last_prompt = build_tts_prompt(text)

    # gTTS ne parle que le français ; on ne lui transmet pas le style anglais.
    spoken_fr = _strip_style_tags(text)

    from gtts import gTTS  # import tardif pour ne pas pénérer le fallback

    last_err = None
    for attempt in (1, 2):  # Règle 5 : une retente
        try:
            tts = gTTS(text=spoken_fr, lang="fr", slow=slow, tld="fr")
            tts.save(str(out_path))
            if out_path.exists() and out_path.stat().st_size > 0:
                return out_path
        except Exception as e:  # noqa: BLE001
            last_err = e
            if attempt == 1:
                continue
    raise TtsBlocked(f"gTTS indisponible après 2 tentatives : {last_err}")


def get_audio_duration(path: Path | str) -> Optional[float]:
    """Durée en secondes (None si indétectable)."""
    return _detect_duration(Path(path))


class TtsBlocked(RuntimeError):
    """Levé quand la synthèse audio échoue durablement (Règle 5, BLOCKED)."""


if __name__ == "__main__":
    import sys

    texte = (
        "Il était une fois une petite fille prénommée Léa [courte pause] "
        "qui voulait apprendre comment on fabrique le fer. "
        "Avec beaucoup de courage, elle transforma le minerai de fer en un beau lingot d'acier."
    )
    name = sys.argv[1] if len(sys.argv) > 1 else "Léa"
    try:
        p = narrate_story(texte, name)
        print("Audio généré :", p, "| taille:", p.stat().st_size, "octets")
        print("Durée :", round(get_audio_duration(p) or 0, 1), "s")
        print("Prompt TTS :", build_tts_prompt(texte))
    except TtsBlocked as e:
        print("[BLOCKED]", e)
