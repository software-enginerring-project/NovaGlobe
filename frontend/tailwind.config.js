/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#e0fcfb',
        'ink-dim': 'rgba(224, 252, 251, 0.7)',
        cyan: '#08c9c0',
        aqua: '#0aeae0',
        teal: '#06968f',
        navy: '#0b1c2e',
        deep: '#050a12',
      }
    },
  },
  plugins: [],
}
