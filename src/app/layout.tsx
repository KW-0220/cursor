import { Noto_Sans_TC, Geist_Mono, Cormorant_Garamond } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const notoSansTC = Noto_Sans_TC({
  variable: "--font-noto-sans-tc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-biz-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "開戶文件通｜公司成立及商業戶口文件管理",
  description:
    "按步驟提交公司、董事及業務資料，可中途儲存，並透過 WhatsApp 掌握文件處理進度。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${notoSansTC.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-text-primary">{children}</body>
    </html>
  );
}
