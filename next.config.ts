import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Local Supabase Storage lives on 127.0.0.1, which Next's SSRF guard blocks
    // by default. Only relaxed outside production.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    // Dish/review photos live in Supabase Storage's public bucket, either on a
    // hosted project (*.supabase.co) or the local dev stack (127.0.0.1).
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
