/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        musify: {
          blue: '#3b82f6',
          cyan: '#00d4ff',
          magenta: '#ec4899',
          purple: '#a855f7',
          black: '#000000',
          base: '#0d0d14',
          elevated: '#141420',
          cardHover: '#1f1f30',
          subdued: '#a1a1b5',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
