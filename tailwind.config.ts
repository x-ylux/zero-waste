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
        cream: {
          50: "rgb(var(--rr-cream-50) / <alpha-value>)",
          100: "rgb(var(--rr-cream-100) / <alpha-value>)",
          200: "rgb(var(--rr-cream-200) / <alpha-value>)",
          300: "rgb(var(--rr-cream-300) / <alpha-value>)",
          400: "rgb(var(--rr-cream-400) / <alpha-value>)",
        },
        panel: {
          DEFAULT: "var(--rr-surface)",
          raised: "var(--rr-surface-2)",
        },
        warmgray: {
          50: "rgb(var(--rr-warmgray-50) / <alpha-value>)",
          100: "rgb(var(--rr-warmgray-100) / <alpha-value>)",
          200: "rgb(var(--rr-warmgray-200) / <alpha-value>)",
          300: "rgb(var(--rr-warmgray-300) / <alpha-value>)",
          400: "rgb(var(--rr-warmgray-400) / <alpha-value>)",
          500: "rgb(var(--rr-warmgray-500) / <alpha-value>)",
          600: "rgb(var(--rr-warmgray-600) / <alpha-value>)",
          700: "rgb(var(--rr-warmgray-700) / <alpha-value>)",
          800: "rgb(var(--rr-warmgray-800) / <alpha-value>)",
          900: "rgb(var(--rr-warmgray-900) / <alpha-value>)",
        },
        brand: {
          50: "rgb(var(--rr-brand-50) / 0.12)",
          100: "rgb(var(--rr-brand-100) / 0.18)",
          200: "rgb(var(--rr-brand-200) / 0.28)",
          300: "rgb(var(--rr-brand-300) / <alpha-value>)",
          400: "rgb(var(--rr-brand-400) / <alpha-value>)",
          500: "rgb(var(--rr-brand-500) / <alpha-value>)",
          600: "rgb(var(--rr-brand-600) / <alpha-value>)",
          700: "rgb(var(--rr-brand-700) / <alpha-value>)",
          800: "rgb(var(--rr-brand-800) / <alpha-value>)",
          900: "rgb(var(--rr-brand-900) / <alpha-value>)",
          950: "rgb(var(--rr-brand-950) / <alpha-value>)",
        },
        white: "rgb(var(--rr-white) / <alpha-value>)",
      },
      boxShadow: {
        panel: "0 10px 30px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
