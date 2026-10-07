/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'media',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Un color por tipo de movimiento, el mismo en botones, chips y la lista.
        gasto: '#dc2626',
        ingreso: '#16a34a',
        traslado: '#2563eb',
      },
    },
  },
  plugins: [],
};
