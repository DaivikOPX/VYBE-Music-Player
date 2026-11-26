/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spotify-green': '#1DB954',
        'spotify-green-hover': '#1ED760',
        'spotify-base': '#000000',
        'spotify-surface': '#121212',
        'spotify-card': '#181818',
        'spotify-card-hover': '#282828',
        'spotify-elevated': '#242424',
        'spotify-text': '#FFFFFF',
        'spotify-muted': '#B3B3B3',
        'spotify-subtle': '#535353',
        'spotify-border': '#282828'
      },
      fontFamily: {
        sans: ['CircularSp', 'Circular Std', 'CircularStd', 'Circular', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
