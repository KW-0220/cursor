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
  title: "SME Clinic｜企業妙手診所",
  description:
    "協助香港中小企以數碼方式完成貸款資料提交、文件檢查及初步資格評估。",
  applicationName: "SME Clinic",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
