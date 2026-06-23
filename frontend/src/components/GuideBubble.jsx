// GuideBubble.jsx — Bulle guide enfant (Patch 4 du brief refonte UX).
//
// Remplace la carte blanche d'instruction (div.card) qui donnait un aspect
// "web app" à la scène. Bulle de dialogue chaleureuse, fond ivoire semi-opaque,
// bordure or, police font-story en gros. data-testid="instruction" préservé
// (les tests E2E e2e_objective2/5 l'utilisent).

export default function GuideBubble({ text, visible = true }) {
  if (!visible || !text) return null
  return (
    <div
      data-testid="instruction"
      role="status"
      aria-live="polite"
      className="relative z-20 mb-4 flex items-center gap-3 rounded-3xl border-2 border-enl-or/60 bg-enl-ivoire/90 px-5 py-3 shadow-lg"
    >
      {/* Médaillon guide (style enluminure) */}
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-enl-or bg-enl-terre text-2xl shadow-inner"
        aria-hidden="true"
      >
        🗣️
      </span>
      {/* Texte d'instruction — gros, manuscrit, lisible par un adulte à côté */}
      <p className="font-story text-xl leading-snug text-enl-encre drop-shadow-sm">
        {text}
      </p>
    </div>
  )
}
