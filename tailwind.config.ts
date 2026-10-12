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
        // Musawo brand colours extracted from musawo.ug
        primary: {
          DEFAULT: "#111A3F",
          50: "#E8EAEF",
          100: "#C7CCE0",
          200: "#8895C0",
          300: "#4A5EA0",
          400: "#1F3080",
          500: "#111A3F",
          600: "#0D1430",
          700: "#090E22",
          800: "#050913",
          900: "#020305",
        },
        accent: {
          DEFAULT: "#FF6900",
          50: "#FFF0E5",
          100: "#FFD9B8",
          200: "#FFB57A",
          300: "#FF913C",
          400: "#FF7B0F",
          500: "#FF6900",
          600: "#CC5400",
          700: "#993F00",
          800: "#662A00",
          900: "#331500",
        },
        success: "#00D084",
        warning: "#FCB900",
        danger: "#FE2D2D",
        "body-text": "#313131",
        surface: "#F5F7FA",
        border: "#E5E7EB",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      screens: {
        xs: "375px",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
