import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "zcejeej0ras6rj8h.public.blob.vercel-storage.com",
      "d0jo4e8kojckav6k.public.blob.vercel-storage.com",
      "example.com",
      "res.cloudinary.com",
      "api.dicebear.com",
      "v3.fal.media",
      "fal.media",
      "res.cloudinary.com",
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add API rewrites and headers for better CORS handling
  async rewrites() {
    return [
      {
        source: "/api/nominatim-proxy/:path*",
        destination: "/api/nominatim-proxy/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
