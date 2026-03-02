import {
  chaiBuilderPlugin,
  getChaiBuilderTheme,
} from "@chaibuilder/next/utils";
import aspectRatio from "@tailwindcss/aspect-ratio";
import containerQueries from "@tailwindcss/container-queries";
import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@chaibuilder/next/dist/**/*.{js,cjs}",
  ],
  theme: {
    extend: {
      ...getChaiBuilderTheme(),
    },
  },
  plugins: [
    chaiBuilderPlugin,
    aspectRatio,
    containerQueries,
    forms,
    typography,
  ],
};
