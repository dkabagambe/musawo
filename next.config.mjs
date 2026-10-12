/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Next.js dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://musawo.ug",
              "media-src 'self' https://iframe.mediadelivery.net https://video.bunnycdn.com",
              "frame-src https://iframe.mediadelivery.net",
              "connect-src 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      // Only allow images from domains we control — no hotlinking from musawo.ug in production
      {
        protocol: "https",
        hostname: "learn.musawotraining.ug",
      },
    ],
    formats: ["image/webp", "image/avif"],
  },

  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "learn.musawotraining.ug"],
    },
  },
};

export default nextConfig;
