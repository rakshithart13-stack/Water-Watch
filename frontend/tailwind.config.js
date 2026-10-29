/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#08111F",
        surface: "#111E30",
        surfaceCard: "#16253B",
        surfaceBorder: "#20334E",
        aqua: {
          DEFAULT: "#21D4E8",
          hover: "#1bb8ca",
          glow: "rgba(33, 212, 232, 0.25)"
        },
        electric: {
          DEFAULT: "#4EA8FF",
          hover: "#3b8ee6"
        },
        warn: "#F5A623",
        crit: "#EF4444",
        succ: "#22C55E"
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
