#!/usr/bin/env python3
"""
sync_manifest_enluminure.py — Synchronise les DEUX manifests (src/assets et
public/assets/manifest) pour la migration enluminure.

Pour les 12 assets forge/fonte : ajoute la clé `src` (PNG enluminuré), conserve
`svg` (fallback), passe `status` à "enluminure_validated".
Ajoute aussi `bg_forge_enluminure`.
Écrit des fichiers STRICTEMENT identiques (les deux chemins restent miroirs).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATHS = [
    ROOT / "frontend/src/assets/assets_manifest.json",
    ROOT / "frontend/public/assets/manifest/assets_manifest.json",
]

# 12 assets forge/fonte migrés vers PNG enluminuré.
ENLUMINURE = {
    # props
    "prop_minerai_fer":      "/assets/props/prop_minerai_fer.png",
    "prop_charbon":          "/assets/props/prop_charbon.png",
    "prop_lingot_acier":     "/assets/props/prop_lingot_acier.png",
    "prop_metal_liquide":    "/assets/props/prop_metal_liquide.png",
    "prop_marteau":          "/assets/props/prop_marteau.png",
    # zones
    "zone_four_fonderie":    "/assets/zones/zone_four_fonderie.png",
    "zone_moule_lingot":     "/assets/zones/zone_moule_lingot.png",
    "zone_feu_forge":        "/assets/zones/zone_feu_forge.png",
    "zone_enclume":          "/assets/zones/zone_enclume.png",
    # result
    "result_outil_acier":    "/assets/results/result_outil_acier.png",
    # icons
    "icon_forgeron":         "/assets/icons/icon_forgeron.png",
    "icon_fondeur":          "/assets/icons/icon_fondeur.png",
}

# Nouveau fond de scène forge enluminé.
NEW_BG = {
    "bg_forge_enluminure": {
        "src": "/assets/zones/bg_forge_enluminure.png",
        "svg": "/assets/zones/bg_forge_enluminure.svg",
        "emoji": "🔥",
        "label": "Forge enluminée",
        "status": "enluminure_validated",
    }
}


def update(manifest_path: Path) -> None:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    changed = 0
    for asset_id, png_src in ENLUMINURE.items():
        if asset_id not in data:
            print(f"  ATTENTION: {asset_id} absent du manifest {manifest_path.name}")
            continue
        data[asset_id]["src"] = png_src          # nouveau PNG enluminuré
        # svg conservé tel quel (fallback)
        data[asset_id]["status"] = "enluminure_validated"
        changed += 1
    # Ajoute le fond (s'il n'existe pas).
    if "bg_forge_enluminure" not in data:
        data["bg_forge_enluminure"] = NEW_BG["bg_forge_enluminure"]
        changed += 1
    else:
        data["bg_forge_enluminure"].update(NEW_BG["bg_forge_enluminure"])
        data["bg_forge_enluminure"]["status"] = "enluminure_validated"
        changed += 1
    # Écrit avec indentation stable (2 espaces) + UTF-8 + clé triées comme l'original.
    manifest_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"  {manifest_path.name}: {changed} entrées mises à jour.")


def main():
    for p in PATHS:
        update(p)
    # Vérifie que les deux fichiers sont identiques.
    contents = [p.read_text(encoding="utf-8") for p in PATHS]
    assert contents[0] == contents[1], "Les deux manifests diffèrent !"
    print("Les deux manifests sont synchronisés (strictement identiques).")


if __name__ == "__main__":
    main()
