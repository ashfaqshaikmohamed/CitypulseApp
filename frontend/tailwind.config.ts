// FILE: frontend/tailwind.config.ts
// ROLE: Configures Tailwind CSS styling paths and customized theme additions.

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: '#040d1a',
        blue: {
          primary: '#2563c4',
          interactive: '#3b82f6',
          light: '#60a5fa',
        }
      },
      fontFamily: {
        syne: ['var(--font-syne)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'sans-serif'],
      }
    }
  },
  plugins: []
};

export default config;
