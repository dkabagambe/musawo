import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand palette ─────────────────────────────────────────────
        // Primary: deep teal-navy (sampled from musawo.ug)
        primary: {
          DEFAULT: "#0B6B5D",
          50:  "#E6F4F2",
          100: "#C2E4DE",
          200: "#85C9BA",
          300: "#48AE96",
          400: "#1A9278",
          500: "#0B6B5D",
          600: "#095549",
          700: "#073F36",
          800: "#042A24",
          900: "#021512",
          // Deep teal used for footer, hero boxes, auth panels
          dark: "#07241F",
        },
        // Accent: warm amber
        accent: {
          DEFAULT: "#F2A32E",
          50:  "#FEF7EA",
          100: "#FCE9C1",
          200: "#F9D38A",
          300: "#F6BC52",
          400: "#F4AB38",
          500: "#F2A32E",
          600: "#D88A18",
          700: "#A86B12",
          800: "#784C0D",
          900: "#482D07",
        },
        // Supporting
        success: "#00C47A",
        warning: "#F59E0B",
        danger:  "#EF4444",
        "body-text": "#1F2937",
        muted:       "#4B5563",
        surface:     "#F8FAF9",
        "surface-alt": "#F1F7F5",
        border:      "#E4EAE8",
        "border-dark": "#E5E7EB",
        // Legacy aliases kept so existing pages don't break
        teal: {
          DEFAULT: "#0B6B5D",
        },
      },
      fontFamily: {
        sans:    ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"],
        heading: ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"],
        body:    ["Inter", "var(--font-jakarta)", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      screens: {
        xs: "375px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        "card-hover": "0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        cta: "0 8px 24px -4px rgb(242 163 46 / 0.40)",
        "primary-glow": "0 8px 24px -4px rgb(11 107 93 / 0.35)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out both",
        "fade-in": "fadeIn 0.4s ease-out both",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
