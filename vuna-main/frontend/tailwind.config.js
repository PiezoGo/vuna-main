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
          DEFAULT: '#8B5A2B',
          dark: '#704822',
          light: '#A67343',
          bg: '#FAF8F5',
          accent: '#F3EFE9',
        },
        status: {
          pending: '#F59E0B',
          paid: '#10B981',
          assigned: '#3B82F6',
          collected: '#8B5CF6',
          in_transit: '#6366F1',
          delivered: '#059669',
          completed: '#047857',
          cancelled: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
