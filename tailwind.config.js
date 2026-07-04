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
          bg: '#050607',
          surface: '#101214',
          wash: '#0A0C0F',
          soft: '#15181C',
          border: 'rgba(255,255,255,0.07)',
          borderStrong: 'rgba(255,255,255,0.14)',
          ink: '#F4F5F2',
          muted: '#989FA6',
          green: '#B9D94C',
          greenDark: '#C8EB5A',
          greenDeep: '#071006',
          teal: '#A4ADB5',
          tealDark: '#C0C8CE',
          tealSoft: 'rgba(255,255,255,0.06)',
          tealBorder: 'rgba(255,255,255,0.14)',
          gold: '#B9D94C',
          goldSoft: '#15181C',
          goldDark: '#C8EB5A',
        },
      },
    },
  },
  plugins: [],
} 

