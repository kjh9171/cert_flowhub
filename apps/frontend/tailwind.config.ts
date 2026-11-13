import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 시맨틱 토큰 — globals.css의 CSS 변수와 1:1 (라이트/다크 자동 동기화)
        canvas: "var(--canvas)",
        card: "var(--card)",
        line: "var(--line)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        brand: {
          primary: "#2563EB",
          "primary-soft": "#DBEAFE",
        },
        surface: {
          base: "#FFFFFF",
          subtle: "#F8FAFC",
          muted: "#F1F5F9",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
