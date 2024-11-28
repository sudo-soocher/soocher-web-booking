import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/react";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2A47CB",
          50: "#E8EBFA",
          100: "#D1D7F5",
          200: "#A3AFEB",
          300: "#7587E1",
          400: "#475FD7",
          500: "#2A47CB",
          600: "#2139A3",
          700: "#192B7A",
          800: "#111D52",
          900: "#080F29",
        },
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            background: "#FFFFFF",
            foreground: "#11181C",
            primary: {
              DEFAULT: "#2A47CB",
              foreground: "#FFFFFF",
            },
          },
        },
      },
    }),
  ],
};

export default config;
