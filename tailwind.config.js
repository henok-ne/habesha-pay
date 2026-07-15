/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#14231A',
        forest: '#1A5C38',
        'forest-dark': '#123F27',
        clay: '#B5652E',
        parchment: '#F6F3EC',
        line: '#DDD6C7',
        gold: '#C9A24B',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        mono: ['"IBM Plex Mono"', '"SF Mono"', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      borderRadius: {
        sharp: '5px',
      },
    },
  },
  plugins: [],
};
