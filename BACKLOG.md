# BACKLOG — Fonctionnalités futures identifiées (Règle 3)

Améliorations pertinentes relevées pendant la V2 (jeu de scène interactif), non
implémentées par respect du minimalisme. Classées par thème.

## Moteur de scène & Interactions
- **Clic comme action** : le schéma prévoit `action_attendue.type: "click"`, mais le moteur ne gère actuellement que le drag-and-drop. Brancher un mode clic (ex : "clique sur le soufflet").
- **Éléments `both` plus riches** : aujourd'hui un draggable dans une dropzone ; prévoir aussi des éléments composés (panier qui contient plusieurs objets).
- **Animations de transformation** : quand une étape réussit, animer la transformation (ex : le minerai devient métal fondu) plutôt qu'un simple changement d'étape.
- **Sons d'ambiance** : un bruitage de décor (feu crépitant, forêt) en boucle douce derrière la narration.
- **Surlignement synchrone** : mettre en évidence le mot parlé au fil de la narration (aide à la lecture).

## Génération de scénarios (LLM)
- **Cache des scénarios générés** : éviter de régénérer le même scénario (coût API).
- **Validation par second LLM** : faire valider la cohérence pédagogique du scénario généré.
- **Niveau de difficulté** : adapter le nombre d'étapes et le vocabulaire à l'âge réel.

## Méta-Histoire / Célébration
- **Scène finale interactive** : la célébration pourrait être une mini-scène (assembler ses créations).
- **Trophées persistants** : un "musée" des objets fabriqués au fil des sessions.
- **Export souvenir** : générer une image ou un petit PDF de la grande aventure.

## TTS & Audio
- **Voix ElevenLabs (Sulafat/Leda)** : brancher si clé présente, avec fallback gTTS.
- **Streaming audio** : précharger la phrase suivante pendant la lecture courante.
- **Choix de la voix** : laisser l'enfant sélectionner sa voix.

## Contribution & Communauté
- **Validation par les pairs** : Pull Requests / modération communautaire.
- **Éditeur visuel d'éléments** : positionner les éléments par glisser-déposer dans la scène.
- **Testeur de scène intégré** : jouer la scène en cours de création.
- **Bibliothèque d'emojis** : palette cliquable plutôt que saisie manuelle.

## UX & Plateforme
- **Avatar personnalisable**, **multi-profils**, **PWA offline**, **i18n**, **routage URL** (React Router).

## Technique
- **Tests unitaires fins** (pytest par module), **CI**, **Docker**, **schéma JSON formel**.
- **Prégénération des audios** : synthétiser les phrases d'une recette au chargement de la scène pour une lecture instantanée.

