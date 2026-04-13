import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-app": "#0A0A0F",
        "bg-card": "#12121A",
        "bg-card-hover": "#1A1A28",
        "border-subtle": "#1E1E2E",
        "accent-cyan": "#00D4FF",
        "text-primary": "#E8EAF0",
        "text-muted": "#6B7280",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
