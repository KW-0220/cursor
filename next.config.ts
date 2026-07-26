import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDF 抽字 + 掃描件渲頁（canvas／pdfjs 不可被 bundle 進 serverless）
  serverExternalPackages: ["unpdf", "pdfjs-dist", "@napi-rs/canvas"],
  // Allow public tunnel / LAN hosts during demo testing
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "192.168.0.135",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
