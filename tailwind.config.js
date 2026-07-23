/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: '#0F1B3D',
        'night-deep': '#0A1230',
        gold: '#C9973B',
        'gold-soft': '#D9AE5A',
        brick: '#B23A3A',
        canvas: '#F7F6F2',
        ink: '#1A1F2B',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
