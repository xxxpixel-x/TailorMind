import type { Config } from "tailwindcss";

// 颜色全部走 CSS 变量（globals.css）：象牙白海派画册主题。
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: v("ground"),
        scrim: v("scrim"),
        accent: {
          DEFAULT: v("accent"),
          hi: v("accent-hi"),
        },
        "on-accent": v("on-accent"),
        paper: {
          DEFAULT: v("paper"),
          warm: v("paper-warm"),
          card: v("card"),
          border: v("line"),
          control: v("line-strong"),
        },
        ink: {
          DEFAULT: v("ink"),
          body: v("ink-body"),
          muted: v("ink-muted"),
          light: v("ink-light"),
        },
        cinnabar: {
          DEFAULT: v("warn"),
          light: v("warn-soft"),
        },
        brocade: {
          DEFAULT: v("accent"),
          light: v("paper"),
          dark: v("ink"),
        },
        jade: {
          DEFAULT: v("ok"),
          light: v("ok-soft"),
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Songti SC"', '"SimSun"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
        num: ['"Cormorant Garamond"', '"Noto Serif SC"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
