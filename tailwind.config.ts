import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f8ff",
          100: "#e3edff",
          200: "#c2d6ff",
          300: "#94b6ff",
          400: "#6188ff",
          500: "#3a5fff",
          600: "#243fef",
          700: "#1c2fc3",
          800: "#1c2a96",
          900: "#1c2a73",
        },
        ink: {
          900: "#0b1020",
          800: "#11162b",
          700: "#1a2140",
          500: "#5a6584",
          400: "#7a85a3",
          200: "#cdd3e3",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
