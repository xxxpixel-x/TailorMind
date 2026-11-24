import type { Metadata } from "next";
import "./globals.css";
import "./workbench.css";

export const metadata: Metadata = {
  title: "衣语 TailorMind · 海派定制企划助手",
  description:
    "上海服装集团海派高级定制与团体职业服企划工具：面谈记录、三方向定调与纸质工艺设计单。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Noto+Sans+SC:wght@300;400;500;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#ECE6DA" />
      </head>
      <body className="min-h-screen bg-ground font-sans text-ink antialiased selection:bg-cinnabar/15 selection:text-ink">
        {children}
      </body>
    </html>
  );
}
