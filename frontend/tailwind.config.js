/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#080D18",
        surface: "#0D1524",
        surfaceCard: "#111C2D",
        surfaceBorder: "#1a2744",
        aqua: {
          DEFAULT: "#21D4E8",
          hover: "#1bb8ca",
          glow: "rgba(33, 212, 232, 0.25)"
        },
        electric: {
          DEFAULT: "#65BFFF",
          hover: "#4fa8f0"
        },
        accent: {
          DEFAULT: "#43D9D0",
          hover: "#32c4bb"
        },
        muted: "#96A7BC",
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
