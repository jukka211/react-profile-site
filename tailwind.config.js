// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './index.html',
      './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'ui-sans-serif', 'system-ui'],
          heading: ['Playfair Display', 'serif'],
        },
        colors: {
          brand: {
            50: '#f5faff',
            500: '#3b82f6',
            700: '#1e40af',
          },
        },
        spacing: {
          72: '18rem',
          84: '21rem',
        },
      },
    },
    plugins: [],
  };
  