/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ok: {
          500: "#22c55e",
          600: "#16a34a"
        },
        warn: {
          500: "#f59e0b",
          600: "#d97706"
        },
        bad: {
          500: "#ef4444",
          600: "#dc2626"
        }
      }
    },
  },
  plugins: [],
}
