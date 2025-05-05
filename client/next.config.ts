import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
