import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "IDEALAB · Less is More Dashboard",
  description: "1인 사업자를 위한 Less is More 컨설팅 대시보드",
  appleWebApp: { capable: true, title: "IDEALAB Dashboard" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
        <style>{`:root{--font-pretendard:Pretendard;}`}</style>
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
