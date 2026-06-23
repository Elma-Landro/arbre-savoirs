# Assets — Recette 0 « Le Mineur »

Déposer ici les PNG enluminure (fond transparent pour les props).
Les noms doivent correspondre **exactement** au câblage de
`assets_manifest.json` / `sceneLayouts.js` :

| Fichier attendu                    | Rôle                                  |
| ---------------------------------- | ------------------------------------- |
| `mineur_bg_galerie.png`            | Fond de scène (16:9, galerie de mine) |
| `mineur_prop_pic.png`              | Pic de mineur (draggable)             |
| `mineur_prop_lanterne.png`         | Lanterne allumée (draggable)          |
| `mineur_prop_pepite_or.png`        | Pépite d'or bonus (draggable)         |
| `mineur_result_chariot_charge.png` | Chariot chargé (draggable / résultat) |
| `mineur_icon_recette.png`          | Médaillon icône recette               |

Tant qu'un fichier est absent, le jeu affiche le fallback emoji (et un
dégradé pour le fond) : la recette reste jouable.
