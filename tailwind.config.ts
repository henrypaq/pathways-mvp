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
        primary: {
          DEFAULT: "#534AB7",
          dark: "#3C3489",
          light: "#EEEDFE",
        },
        accent: {
          DEFAULT: "#1D9E75",
          light: "#E1F5EE",
        },
        neutral: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
      },
      borderRadius: {
        card: "12px",
        pill: "999px",
        input: "8px",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "400ms",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px 0 rgba(83,74,183,0.12)",
        subtle: "0 1px 2px 0 rgba(0,0,0,0.05)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "wave-1": "wave 1.2s ease-in-out infinite",
        "wave-2": "wave 1.2s ease-in-out 0.1s infinite",
        "wave-3": "wave 1.2s ease-in-out 0.2s infinite",
        "wave-4": "wave 1.2s ease-in-out 0.3s infinite",
        "wave-5": "wave 1.2s ease-in-out 0.4s infinite",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        "typing": "typing 1.5s steps(3) infinite",
      },
      keyframes: {
        wave: {
          "0%, 100%": { height: "4px" },
          "50%": { height: "40px" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        typing: {
          "0%": { content: "." },
          "33%": { content: ".." },
          "66%": { content: "..." },
        },
      },
    },
  },
  plugins: [],
};

export default config;
