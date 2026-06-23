/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Police manuscrite ronde pour le ton jeunesse.
        story: ['"Comic Sans MS"', '"Chalkboard SE"', '"Baloo"', 'system-ui', 'cursive'],
      },
      // Palette canonique enluminure (cf. brief migration).
      // Référence : forgeron_enluminure_pilot.png.
      colors: {
        enl: {
          vermillon: '#C0392B',
          outremer: '#1A3A8F',
          or: '#D4A017',
          malachite: '#2D7A4F',
          terre: '#6B3A2A',
          ivoire: '#F5EDD6',
          encre: '#1A1A1A',
          acier: '#5A6472',
        },
      },
      keyframes: {
        // Halo or pulsant sur les éléments interactifs (O1 Modalité A).
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 160, 23, 0.55)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212, 160, 23, 0)' },
        },
        // Flammes du four : scintillement de couleur (O1 transformation).
        'flame-flicker': {
          '0%, 100%': { transform: 'scaleY(1) scaleX(1)', filter: 'hue-rotate(0deg)' },
          '25%': { transform: 'scaleY(1.1) scaleX(0.95)', filter: 'hue-rotate(-10deg)' },
          '50%': { transform: 'scaleY(0.95) scaleX(1.05)', filter: 'hue-rotate(8deg)' },
          '75%': { transform: 'scaleY(1.08) scaleX(0.98)', filter: 'hue-rotate(-5deg)' },
        },
        // Fade-in d'un calque d'effet (O1 transformations visuelles).
        'effect-fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        // Flash doré + scale au dépôt correct (brief O4.4).
        'drop-success': {
          '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(212,160,23,0)' },
          '40%': { transform: 'scale(1.15)', boxShadow: '0 0 0 12px rgba(212,160,23,0.6)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(212,160,23,0)' },
        },
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'flame-flicker': 'flame-flicker 0.8s ease-in-out infinite',
        'effect-fade-in': 'effect-fade-in 0.3s ease-out',
        'drop-success': 'drop-success 0.6s ease-out',
      },
    },
  },
  plugins: [],
}
