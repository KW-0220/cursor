import { Noto_Sans_TC, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "SME LoanFlow｜中小企貸款智能申請",
  description:
    "協助香港中小企以數碼方式完成貸款資料提交、文件檢查及初步資格評估。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${notoSansTC.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans text-text-primary">{children}</body>
    </html>
  );
}
