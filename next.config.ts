import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["unpdf"],
  // Allow public tunnel / LAN hosts during demo testing
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "192.168.0.135",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
