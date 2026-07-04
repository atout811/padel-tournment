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
          bg: 'rgb(var(--club-bg) / <alpha-value>)',
          surface: 'rgb(var(--club-surface) / <alpha-value>)',
          wash: 'rgb(var(--club-wash) / <alpha-value>)',
          soft: 'rgb(var(--club-soft) / <alpha-value>)',
          border: 'rgb(var(--club-border) / <alpha-value>)',
          borderStrong: 'rgb(var(--club-border-strong) / <alpha-value>)',
          ink: 'rgb(var(--club-ink) / <alpha-value>)',
          muted: 'rgb(var(--club-muted) / <alpha-value>)',
          green: 'rgb(var(--club-green) / <alpha-value>)',
          greenDark: 'rgb(var(--club-green-dark) / <alpha-value>)',
          greenDeep: 'rgb(var(--club-green-deep) / <alpha-value>)',
          shadow: 'rgb(var(--club-shadow) / <alpha-value>)',
          teal: 'rgb(var(--club-teal) / <alpha-value>)',
          tealDark: 'rgb(var(--club-teal-dark) / <alpha-value>)',
          tealSoft: 'rgb(var(--club-teal-soft) / <alpha-value>)',
          tealBorder: 'rgb(var(--club-teal-border) / <alpha-value>)',
          gold: 'rgb(var(--club-gold) / <alpha-value>)',
          goldSoft: 'rgb(var(--club-gold-soft) / <alpha-value>)',
          goldDark: 'rgb(var(--club-gold-dark) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
} 

