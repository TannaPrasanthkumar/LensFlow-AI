/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // High fidelity custom color theme
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#80a3ff',
          505: '#4d7cff',
          600: '#2651f5',
          700: '#1a3ecb',
          800: '#1734a6',
          900: '#183082',
          950: '#111e51',
        },
      },
    },
  },
  plugins: [],
}
