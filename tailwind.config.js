/* eslint-env node */
/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        club: {
          bg: '#F6F8F4',
          surface: '#FFFFFF',
          wash: '#F1F7F2',
          soft: '#E8F6EF',
          border: '#DDE7DE',
          borderStrong: '#BFD0C2',
          ink: '#18211C',
          muted: '#65736A',
          green: '#168A5B',
          greenDark: '#0F6F49',
          greenDeep: '#0D3B2E',
          teal: '#0E8F8A',
          tealDark: '#0E706B',
          tealSoft: '#E6FAF8',
          tealBorder: '#BDEDEA',
          gold: '#F5B84B',
          goldSoft: '#FFF4D6',
          goldDark: '#8A5A00',
        },
      },
    },
  },
  plugins: [],
} 

