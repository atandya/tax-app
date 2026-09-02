import type { NextConfig } from "next";

// Proxy /api/be/* to the NestJS backend so browser requests stay same-origin
// (session cookie is first-party to the Next app, no CORS needed).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/be/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
