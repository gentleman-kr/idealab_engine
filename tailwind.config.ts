import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-pretendard)", "Pretendard", "system-ui", "sans-serif"],
      },
      colors: {
        bg: "#000000",
        card: "#111111",
        border: "#2A2A2A",
        text: "#FFFFFF",
        cyan: "#00FAFF",
        danger: "#FF4D4D",
        warning: "#FFAA00",
        good: "#00CC66",
      },
    },
  },
  plugins: [],
};

export default config;