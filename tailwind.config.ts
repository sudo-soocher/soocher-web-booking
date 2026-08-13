import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

// HeroUI bundles its own tailwindcss v4 types via a nested install. The plugin
// runs correctly under this project's v3 install — just relax the type here.
// (Same workaround as the doctor app.)
const herouiPlugin = heroui as unknown as (
  opts?: unknown
) => Config["plugins"] extends (infer P)[] ? P : never;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
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
    herouiPlugin({
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
