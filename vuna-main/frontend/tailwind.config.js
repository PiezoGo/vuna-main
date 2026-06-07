/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B5A2B', // Earthy Brown
          dark: '#704822',    // Darker Earthy Brown
          light: '#A67343',   // Lighter Earthy Brown
          bg: '#FAF8F5',      // Warm white background
          accent: '#F3EFE9',  // Soft cream accent
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
