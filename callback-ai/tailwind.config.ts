import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdaff",
          300: "#8ec3ff",
          400: "#5aa3ff",
          500: "#3081ff",
          600: "#1f63ed",
          700: "#1a4fd0",
          800: "#1c44a8",
          900: "#1c3d85"
        }
      }
    }
  },
  plugins: []
};

export default config;
