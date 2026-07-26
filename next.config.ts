import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse / pdfjs / canvas 必須 external，否則 Vercel 找不到 worker.mjs
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // Allow public tunnel / LAN hosts during demo testing
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "192.168.0.135",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
