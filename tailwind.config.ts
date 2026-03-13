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
          DEFAULT: "#2e6dd4",
          50: "#edf4ff",
          100: "#d9e7ff",
          200: "#bcd4ff",
          300: "#8fb8ff",
          400: "#5a94ff",
          500: "#2e6dd4",
          600: "#2559b3",
          700: "#1e4791",
          800: "#183870",
          900: "#122950",
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
              DEFAULT: "#2e6dd4",
              foreground: "#FFFFFF",
            },
          },
        },
      },
    }),
  ],
};

export default config;
