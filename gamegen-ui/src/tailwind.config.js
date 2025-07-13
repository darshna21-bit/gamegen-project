/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html", // Make sure this is included
  ],
  theme: {
    extend: {
      fontFamily: {
        // 'fantasy': ['Creepster', 'cursive'], // If you chose Creepster
        'alagard': ['Alagard', 'sans-serif'], // If you chose Alagard
        // You can add more fallback fonts or system fonts
      },
    },
  },
  plugins: [],
}