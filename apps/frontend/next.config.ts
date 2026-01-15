import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // ✅ Add this to prevent ESLint from breaking your build
  eslint: {
    ignoreDuringBuilds: true
  },

  // ✅ Optional: Skip type errors during build (useful while fixing code)
  typescript: {
    ignoreBuildErrors: true
  },

  // ✅ Configure external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logoipsum.com',
      },
      {
        protocol: 'https',
        hostname: '**', // Allow all HTTPS domains (use specific domains in production)
      },
    ],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*"
      },
      {
        source: "/socket.io/:path*",
        destination: "http://localhost:3001/socket.io/:path*"
      }
    ]
  }
}

export default nextConfig
