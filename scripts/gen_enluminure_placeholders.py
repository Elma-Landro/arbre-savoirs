#!/usr/bin/env python3
"""
gen_enluminure_placeholders.py — Génère des PNG placeholders transparents pour
la migration enluminure, dans la palette canonique du brief.

Ces placeholders permettent au pipeline (manifest, GameAsset, Scene, tests) d'être
fonctionnel immédiatement. Maël remplacera ensuite chaque fichier par le vrai
asset enluminure généré côté Hermes.

Palette :
  Vermillon #C0392B | Outremer #1A3A8F | Or chaud #D4A017 | Malachite #2D7A4F
  Terre d'ombre #6B3A2A | Ivoire #F5EDD6 | Noir d'encre #1A1A1A | Gris acier #5A6472
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PROPS = ROOT / "frontend/public/assets/props"
ZONES = ROOT / "frontend/public/assets/zones"
RESULTS = ROOT / "frontend/public/assets/results"
ICONS = ROOT / "frontend/public/assets/icons"

PALETTE = {
    "vermillon":  (192, 57, 43, 255),
    "outremer":   (26, 58, 143, 255),
    "or":         (212, 160, 23, 255),
    "malachite":  (45, 122, 79, 255),
    "ombre":      (107, 58, 42, 255),
    "ivoire":     (245, 237, 214, 255),
    "encre":      (26, 26, 26, 255),
    "acier":      (90, 100, 114, 255),
}

PROP_SIZE = 1024
BG_W, BG_H = 1920, 1080


def new_alpha(size, fill=(0, 0, 0, 0)):
    return Image.new("RGBA", size, fill)


def draw_circle(draw, cx, cy, r, color, outline=PALETTE["encre"], width=8):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color, outline=outline, width=width)


def draw_rect(draw, box, color, outline=PALETTE["encre"], width=8):
    draw.rectangle(box, fill=color, outline=outline, width=width)


def cernes_cross(draw, cx, cy, r, color=PALETTE["or"]):
    # Petite croix décorative dorée au centre (signature enluminure).
    w = 6
    draw.line([cx - r, cy, cx + r, cy], fill=color, width=w)
    draw.line([cx, cy - r, cx, cy + r], fill=color, width=w)


def make_prop(filename, base_color, accent_color):
    """Prop 1024x1024 : forme ronde centrée + accent + croix dorée."""
    img = new_alpha((PROP_SIZE, PROP_SIZE))
    d = ImageDraw.Draw(img)
    cx = cy = PROP_SIZE // 2
    # Disque principal.
    draw_circle(d, cx, cy, 360, base_color)
    # Cercle d'accent intérieur.
    draw_circle(d, cx, cy, 220, accent_color, outline=PALETTE["ivoire"], width=6)
    # Croix dorée centrale.
    cernes_cross(d, cx, cy, 90)
    img.save(PROPS / filename)


def make_zone(filename, base_color, accent_color):
    """Zone 1024x1024 : forme type 'cible de dépôt' (carré arrondi + cercle)."""
    img = new_alpha((PROP_SIZE, PROP_SIZE))
    d = ImageDraw.Draw(img)
    # Carré arrondi central.
    draw_rect(d, [180, 180, 844, 844], base_color)
    # Cercle intérieur (zone de dépôt).
    draw_circle(d, PROP_SIZE // 2, PROP_SIZE // 2, 240, accent_color, outline=PALETTE["ivoire"], width=6)
    cernes_cross(d, PROP_SIZE // 2, PROP_SIZE // 2, 70)
    img.save(ZONES / filename)


def make_result(filename, base_color, accent_color):
    """Result 1024x1024 : losange précieux (récompense)."""
    img = new_alpha((PROP_SIZE, PROP_SIZE))
    d = ImageDraw.Draw(img)
    cx = cy = PROP_SIZE // 2
    # Losange.
    d.polygon([(cx, cy - 360), (cx + 360, cy), (cx, cy + 360), (cx - 360, cy)],
              fill=base_color, outline=PALETTE["encre"], width=8)
    # Cercle doré intérieur.
    draw_circle(d, cx, cy, 180, accent_color, outline=PALETTE["ivoire"], width=6)
    cernes_cross(d, cx, cy, 80)
    img.save(RESULTS / filename)


def make_icon(filename, base_color, accent_color):
    """Icon 1024x1024 : médaillon circulaire bordé d'or."""
    img = new_alpha((PROP_SIZE, PROP_SIZE))
    d = ImageDraw.Draw(img)
    cx = cy = PROP_SIZE // 2
    # Couronne dorée extérieure.
    draw_circle(d, cx, cy, 400, PALETTE["or"])
    # Fond intérieur.
    draw_circle(d, cx, cy, 350, base_color, outline=None, width=0)
    # Cercle accent.
    draw_circle(d, cx, cy, 200, accent_color, outline=PALETTE["ivoire"], width=6)
    # Étoiles dorées (4 petits points).
    import math
    for ang in (0, 90, 180, 270):
        a = math.radians(ang)
        d.ellipse([cx + 280 * math.cos(a) - 12, cy + 280 * math.sin(a) - 12,
                   cx + 280 * math.cos(a) + 12, cy + 280 * math.sin(a) + 12],
                  fill=PALETTE["or"])
    img.save(ICONS / filename)


def make_bg_forge():
    """Fond 1920x1080 : outremer + bordure enluminée + zone forge à gauche."""
    img = new_alpha((BG_W, BG_H), PALETTE["outremer"])
    d = ImageDraw.Draw(img)
    # Bordure enluminée (4 côtés) : bandes or + vermillon + malachite.
    bw = 60
    d.rectangle([0, 0, BG_W, bw], fill=PALETTE["or"])
    d.rectangle([0, BG_H - bw, BG_W, BG_H], fill=PALETTE["or"])
    d.rectangle([0, 0, bw, BG_H], fill=PALETTE["or"])
    d.rectangle([BG_W - bw, 0, BG_W, BG_H], fill=PALETTE["or"])
    d.rectangle([bw, bw, BG_W - bw, bw + 18], fill=PALETTE["vermillon"])
    d.rectangle([bw, BG_H - bw - 18, BG_W - bw, BG_H - bw], fill=PALETTE["vermillon"])
    d.rectangle([bw, bw, bw + 18, BG_H - bw], fill=PALETTE["malachite"])
    d.rectangle([BG_W - bw - 18, bw, BG_W - bw, BG_H - bw], fill=PALETTE["malachite"])
    # Étoiles dorées dans le fond.
    import math
    for i in range(40):
        x = 120 + (i * 173) % (BG_W - 240)
        y = 120 + (i * 97) % (BG_H - 240)
        d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=PALETTE["or"])
    # Sol Terre d'ombre (bande basse).
    d.rectangle([bw + 18, int(BG_H * 0.72), BG_W - bw - 18, BG_H - bw - 18], fill=PALETTE["ombre"])
    # Forge (arche) à gauche : pierre acier + feu vermillon/or.
    fx0, fy0, fx1, fy1 = 180, int(BG_H * 0.32), 560, int(BG_H * 0.72)
    d.rectangle([fx0, fy0, fx1, fy1], fill=PALETTE["acier"], outline=PALETTE["encre"], width=10)
    # Arche (demi-cercle).
    d.pieslice([fx0 + 60, fy0 - 160, fx1 - 60, fy0 + 160], 180, 360, fill=PALETTE["acier"], outline=PALETTE["encre"], width=10)
    # Feu à l'intérieur.
    d.ellipse([fx0 + 140, fy1 - 220, fx1 - 140, fy1 - 40], fill=PALETTE["vermillon"], outline=PALETTE["or"], width=8)
    # Enclume au centre-gauche.
    ex0, ey0, ex1, ey1 = 720, int(BG_H * 0.58), 920, int(BG_H * 0.72)
    d.rectangle([ex0, ey0, ex1, ey1], fill=PALETTE["acier"], outline=PALETTE["encre"], width=8)
    d.rectangle([ex0 - 30, ey0 - 30, ex1 + 30, ey0 + 10], fill=PALETTE["acier"], outline=PALETTE["encre"], width=8)
    # Médaillon or sur l'enclume.
    draw_circle(d, (ex0 + ex1) // 2, ey0 - 10, 22, PALETTE["or"], outline=None, width=0)
    img.save(ZONES / "bg_forge_enluminure.png")


def main():
    for d in (PROPS, ZONES, RESULTS, ICONS):
        d.mkdir(parents=True, exist_ok=True)
    # Props (palette dominante acier/ombre, accent vermillon/or).
    make_prop("prop_minerai_fer.png", PALETTE["acier"], PALETTE["vermillon"])
    make_prop("prop_charbon.png", PALETTE["encre"], PALETTE["vermillon"])
    make_prop("prop_lingot_acier.png", PALETTE["acier"], PALETTE["or"])
    make_prop("prop_metal_liquide.png", PALETTE["vermillon"], PALETTE["or"])
    make_prop("prop_marteau.png", PALETTE["ombre"], PALETTE["or"])
    # Zones.
    make_zone("zone_four_fonderie.png", PALETTE["acier"], PALETTE["vermillon"])
    make_zone("zone_moule_lingot.png", PALETTE["acier"], PALETTE["or"])
    make_zone("zone_feu_forge.png", PALETTE["acier"], PALETTE["vermillon"])
    make_zone("zone_enclume.png", PALETTE["acier"], PALETTE["or"])
    # Résultat.
    make_result("result_outil_acier.png", PALETTE["acier"], PALETTE["or"])
    # Icônes (médaillons).
    make_icon("icon_forgeron.png", PALETTE["outremer"], PALETTE["or"])
    make_icon("icon_fondeur.png", PALETTE["vermillon"], PALETTE["or"])
    # Fond.
    make_bg_forge()
    print("13 PNG placeholders générés.")


if __name__ == "__main__":
    main()
