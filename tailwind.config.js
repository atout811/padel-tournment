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
          bg: '#020D16',
          surface: '#0A141E',
          wash: '#07111B',
          soft: '#0E1924',
          border: 'rgba(255,255,255,0.08)',
          borderStrong: 'rgba(190,220,69,0.32)',
          ink: '#F7F8F7',
          muted: '#8D99A6',
          green: '#BEDC45',
          greenDark: '#D3F05A',
          greenDeep: '#020D16',
          teal: '#1F60D1',
          tealDark: '#2F73E6',
          tealSoft: 'rgba(31,96,209,0.18)',
          tealBorder: '#1F60D1',
          gold: '#BEDC45',
          goldSoft: '#19232B',
          goldDark: '#BEDC45',
        },
      },
    },
  },
  plugins: [],
} 

