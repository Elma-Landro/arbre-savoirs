"""
llm_client.py — Client LLM minimal (format Anthropic-compatible).

Réutilise la clé déjà présente dans la config ZCode (`builtin:zai-coding-plan`)
pour appeler l'endpoint GLM de z.ai. Aucune clé à fournir manuellement.

Hiérarchie de configuration (le premier gagnant l'emporte) :
  1. Variable d'environnement ARBRE_LLM_API_KEY / ARBRE_LLM_BASE_URL (override)
  2. Clé détectée dans ~/.zcode/v2/config.json (provider builtin:zai-coding-plan)
  3. Fichier .env à la racine du projet (ARBRE_LLM_API_KEY)

Permet de basculer vers OpenAI en positionnant ARBRE_LLM_BASE_URL + clé,
puisque l'API z.ai est compatible Anthropic.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional

import requests

# Endpoint Anthropic-compatible utilisé par défaut.
DEFAULT_BASE_URL = "https://api.z.ai/api/anthropic"
DEFAULT_MODEL = "glm-4.6"
ANTHROPIC_VERSION = "2023-06-01"


def _load_env_file() -> None:
    """Charge un éventuel .env à la racine du projet (clé=valeur, simple)."""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _key_from_zcode_config() -> Optional[str]:
    """Lit la clé du provider zai-coding-plan dans la config ZCode (best-effort)."""
    try:
        cfg = Path.home() / ".zcode" / "v2" / "config.json"
        if not cfg.exists():
            return None
        import json as _json
        data = _json.loads(cfg.read_text(encoding="utf-8"))
        provs = data.get("provider", {})
        # Préfère un provider activé avec une clé.
        for key in ("builtin:zai-coding-plan", "builtin:zai-start-plan", "builtin:zai"):
            p = provs.get(key, {})
            if p.get("options", {}).get("apiKey"):
                return p["options"]["apiKey"]
    except Exception:
        return None
    return None


def get_api_key() -> str:
    """Retourne la clé API à utiliser (env > config ZCode > .env). Lève si absente."""
    _load_env_file()
    key = (
        os.environ.get("ARBRE_LLM_API_KEY")
        or _key_from_zcode_config()
        or os.environ.get("ZAI_API_KEY")
    )
    if not key:
        raise RuntimeError(
            "Aucune clé LLM trouvée. Définis ARBRE_LLM_API_KEY dans un .env "
            "ou dans l'environnement."
        )
    return key


def get_base_url() -> str:
    _load_env_file()
    return os.environ.get("ARBRE_LLM_BASE_URL", DEFAULT_BASE_URL)


def get_model() -> str:
    _load_env_file()
    return os.environ.get("ARBRE_LLM_MODEL", DEFAULT_MODEL)


def call_llm(
    system: str,
    user: str,
    *,
    max_tokens: int = 600,
    temperature: float = 0.8,
    timeout: int = 60,
) -> str:
    """Appelle le LLM (format Anthropic) et renvoie le texte généré.

    Lève RuntimeError en cas d'erreur HTTP/API (le caller gère le retry/fallback).
    """
    url = get_base_url().rstrip("/") + "/v1/messages"
    headers = {
        "x-api-key": get_api_key(),
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    payload = {
        "model": get_model(),
        "max_tokens": max_tokens,
        "temperature": temperature,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=timeout)

    if resp.status_code >= 400:
        raise RuntimeError(f"LLM HTTP {resp.status_code}: {resp.text[:300]}")

    data = resp.json()
    # Format Anthropic : content = [{"type":"text","text": "..."}]
    blocks = data.get("content", [])
    text = "".join(
        b.get("text", "") for b in blocks if isinstance(b, dict) and b.get("type") == "text"
    ).strip()
    if not text:
        raise RuntimeError(f"Réponse LLM vide : {json.dumps(data)[:300]}")
    return text
