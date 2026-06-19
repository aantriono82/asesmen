import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        field: "#f8fafc",
        line: "#d1d5db",
        brand: "#0f766e",
        accent: "#b45309"
      }
    }
  },
  plugins: []
};

export default config;
