import type { NextConfig } from "next";

const proxyClientMaxBodySize = (process.env.NINEROUTER_PROXY_CLIENT_MAX_BODY_SIZE || "128mb") as any;

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "sql.js", "node:sqlite", "bun:sqlite", "open"],
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    proxyClientMaxBodySize,
  },
  allowedDevOrigins: ["192.168.1.106"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/v1/v1/:path*",
        destination: "/api/v1/:path*",
      },
      {
        source: "/v1/v1",
        destination: "/api/v1",
      },
      {
        source: "/codex/:path*",
        destination: "/api/v1/responses",
      },
      {
        source: "/responses",
        destination: "/api/v1/responses",
      },
      {
        source: "/v1beta/:path*",
        destination: "/api/v1beta/:path*",
      },
      {
        source: "/v1beta",
        destination: "/api/v1beta",
      },
      {
        source: "/v1/:path*",
        destination: "/api/v1/:path*",
      },
      {
        source: "/v1",
        destination: "/api/v1",
      },
      {
        source: "/dashboard/:path*",
        destination: "/gateway/:path*",
      },
      {
        source: "/dashboard",
        destination: "/gateway",
      },
    ];
  },
};

export default nextConfig;
