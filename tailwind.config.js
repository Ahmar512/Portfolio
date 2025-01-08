/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: { 
      fontFamily: {
        palanquin: ['Palanquin', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
      },
      colors:{
        'p-green':"#D8EFD3",
        's-green':"#55AD9B",
        'p-pink': "#E8C5E5"
      }
    },
  },
  plugins: [],
}