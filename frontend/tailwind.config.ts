import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Shadcn semantic tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          // Design system primary scale
          50:  "oklch(0.97 0.03 55)",
          100: "oklch(0.93 0.06 55)",
          200: "oklch(0.87 0.11 55)",
          300: "oklch(0.80 0.15 55)",
          400: "oklch(0.74 0.18 52)",
          500: "oklch(0.68 0.19 50)",
          600: "oklch(0.61 0.19 46)",
          700: "oklch(0.52 0.17 42)",
          800: "oklch(0.42 0.14 40)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Teal accent (AI)
        teal: {
          50:  "oklch(0.96 0.03 195)",
          100: "oklch(0.92 0.06 195)",
          500: "oklch(0.62 0.12 195)",
          600: "oklch(0.54 0.12 192)",
          700: "oklch(0.46 0.11 192)",
        },
        // Warm neutrals
        neutral: {
          0:   "#ffffff",
          25:  "#fdfbf7",
          50:  "#faf7f2",
          100: "#f4efe7",
          200: "#e9e2d5",
          300: "#d8cfbf",
          400: "#b3a894",
          500: "#8a806d",
          600: "#5f5749",
          700: "#423c33",
          800: "#2a2620",
          900: "#1a1814",
        },
        // Semantic states
        success: {
          DEFAULT: "oklch(0.64 0.14 150)",
          bg:     "oklch(0.95 0.05 150)",
        },
        danger: {
          DEFAULT: "oklch(0.58 0.19 25)",
          bg:     "oklch(0.95 0.05 25)",
        },
        warning: {
          DEFAULT: "oklch(0.75 0.15 75)",
          bg:     "oklch(0.95 0.05 75)",
        },
        surface: {
          invert: "#f06b00",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Design system radii
        "r-sm":   "8px",
        "r-md":   "12px",
        "r-lg":   "16px",
        "r-xl":   "20px",
        "r-2xl":  "24px",
        pill:     "9999px",
      },
      boxShadow: {
        xs:   "0 1px 2px rgba(66,60,51,0.06)",
        sm:   "0 2px 8px rgba(66,60,51,0.06), 0 1px 2px rgba(66,60,51,0.04)",
        md:   "0 8px 24px rgba(66,60,51,0.08), 0 2px 4px rgba(66,60,51,0.04)",
        lg:   "0 20px 40px rgba(66,60,51,0.10), 0 4px 8px rgba(66,60,51,0.04)",
        glow: "0 0 0 4px oklch(0.68 0.19 50 / 0.15)",
      },
      fontFamily: {
        sans: ["VNMMono", "sans-serif"],
        vnmmono: ["VNMMono", "monospace"],
      },
      keyframes: {
        "chat-slide-up": {
          from: { opacity: "0", transform: "translateY(100%)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "chat-slide-down": {
          from: { opacity: "1", transform: "translateY(0)" },
          to:   { opacity: "0", transform: "translateY(100%)" },
        },
        "chat-appear": {
          from: { opacity: "0", transform: "translateY(20px) scale(0.95)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "chat-disappear": {
          from: { opacity: "1", transform: "translateY(0) scale(1)" },
          to:   { opacity: "0", transform: "translateY(20px) scale(0.95)" },
        },
        "contact-slide-in": {
          from: { opacity: "0", transform: "translateX(40px) scale(0.6)" },
          to:   { opacity: "1", transform: "translateX(0) scale(1)" },
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "40%":           { transform: "translateY(-6px)", opacity: "1" },
        },
      },
      animation: {
        "chat-slide-up":    "chat-slide-up 320ms cubic-bezier(0.22,1,0.36,1)",
        "chat-slide-down":  "chat-slide-down 280ms cubic-bezier(0.4,0,1,1) forwards",
        "chat-appear":      "chat-appear 240ms cubic-bezier(0.2,1,0.3,1)",
        "chat-disappear":   "chat-disappear 200ms cubic-bezier(0.4,0,1,1) forwards",
        "contact-slide-in": "contact-slide-in 360ms cubic-bezier(0.22,1,0.36,1) backwards",
        "dot-bounce":       "dot-bounce 1.2s ease-in-out infinite both",
      },
      transitionDuration: {
        "120": "120ms",
        "160": "160ms",
      },
      transitionTimingFunction: {
        "ease": "ease",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
