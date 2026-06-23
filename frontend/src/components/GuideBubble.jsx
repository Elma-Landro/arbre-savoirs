// GuideBubble.jsx — Indicateur d'instruction minimaliste (Patch 4 révisé).
//
// À 4-8 ans, on ne sait pas lire : la consigne se vit par la VOIX (TTS), pas
// par le texte. Le bandeau doit donc être DISCRET — un petit témoin en bas de
// scène qui signale "on te parle" sans masquer le décor ni les objets.
//
// Le texte reste dans le DOM (aria-live) pour l'accessibilité et les tests
// e2e (data-testid="instruction"), mais visuellement c'est une pastille
// compacte avec un pictogramme son + le texte en tout petit, pas un bandeau
// pleine largeur.

export default function GuideBubble({ text, visible = true }) {
  if (!visible || !text) return null
  return (
    <div
      data-testid="instruction"
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex max-w-[70%] -translate-x-1/2 items-center gap-2 rounded-full border border-enl-or/50 bg-enl-encre/70 px-4 py-1.5 shadow-lg backdrop-blur-sm"
    >
      {/* Pictogramme son pulsant : signale "on t'écoute / écoute" */}
      <span
        className="shrink-0 text-base text-enl-or"
        style={{ animation: 'pulse-gold 2s ease-in-out infinite' }}
        aria-hidden="true"
      >
        🔊
      </span>
      {/* Texte en tout petit — pour le parent à côté, pas l'enfant */}
      <span className="truncate text-xs text-enl-ivoire/90" title={text}>
        {text}
      </span>
    </div>
  )
}
