import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable webpack cache to prevent chunk loading errors
  webpack: (config, { isServer }) => {
    // Disable filesystem cache which causes chunk load errors
    config.cache = false;

    return config;
  },

  // Add headers for API routes to prevent caching of user-specific data
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
