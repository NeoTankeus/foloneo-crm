/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        foloneo: {
          navy: "#0B1E3F",
          "navy-light": "#142A52",
          gold: "#C9A961",
          "gold-light": "#F8F0DC",
          bg: "#F7F8FA",
          red: "#E53E3E",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
