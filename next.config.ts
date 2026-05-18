import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const NO_STORE = "no-store, must-revalidate";
const STATIC_IMMUTABLE = "public, max-age=31536000, immutable";
/** Public folder assets (no content hash) — revalidate so replacements show up without hard refresh */
const PUBLIC_ASSET = "public, max-age=0, must-revalidate";

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
          { key: "Cache-Control", value: NO_STORE },
          { key: "Access-Control-Allow-Origin", value: "*" },
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
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_IMMUTABLE }],
      },
      {
        source: "/:path*.(js|css|png|jpg|jpeg|gif|ico|svg|webp)",
        headers: [{ key: "Cache-Control", value: PUBLIC_ASSET }],
      },
      // HTML document requests — always fetch fresh shell (picks up new JS chunk names after deploy)
      {
        source: "/",
        has: [{ type: "header", key: "accept", value: "(.*text/html.*)" }],
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
      {
        source: "/:path*",
        has: [{ type: "header", key: "accept", value: "(.*text/html.*)" }],
        headers: [{ key: "Cache-Control", value: NO_STORE }],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
