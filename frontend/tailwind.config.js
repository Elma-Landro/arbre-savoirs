/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Police manuscrite ronde pour le ton jeunesse.
        story: ['"Comic Sans MS"', '"Chalkboard SE"', '"Baloo"', 'system-ui', 'cursive'],
      },
    },
  },
  plugins: [],
}
