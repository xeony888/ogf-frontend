import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "shiny-gradient-1": "repeating-linear-gradient(45deg, #22c55e, #ffffff, #86efac, #ffffff, #22c55e)",
        "shiny-gradient-2": "repeating-linear-gradient(45deg, #ffffff, #22c55e, #ffffff, #86efac, #ffffff)",
        "shiny-gradient-3": "repeating-linear-gradient(45deg, #ffffff, #4d4d4d, #ffffff, #4d4d4d, #ffffff)"
      },
    },
  },
  plugins: [],
} satisfies Config;

