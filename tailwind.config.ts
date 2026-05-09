import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8ff",
          100: "#dbeefe",
          200: "#bfe2fe",
          300: "#93cffd",
          400: "#60b1fa",
          500: "#3b8ff6",
          600: "#2570eb",
          700: "#1d59d8",
          800: "#1e49af",
          900: "#1e408a",
          950: "#172a55"
        }
      }
    }
  },
  plugins: []
};

export default config;
