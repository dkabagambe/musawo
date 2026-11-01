/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Security headers
  async headers() {
    const isProduction = process.env.APP_ENV === "production";
    const base = [
      { key: "X-DNS-Prefetch-Control",   value: "on" },
      { key: "X-XSS-Protection",         value: "1; mode=block" },
      { key: "X-Frame-Options",          value: "DENY" },
      { key: "X-Content-Type-Options",   value: "nosniff" },
      { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://musawo.ug https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
          "media-src 'self' https://iframe.mediadelivery.net https://video.bunnycdn.com",
          "frame-src https://iframe.mediadelivery.net https://www.openstreetmap.org",
          "connect-src 'self'",
          "upgrade-insecure-requests",
        ].join("; "),
      },
    ];

    // Add noindex on staging / development
    if (!isProduction) {
      base.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
    }

    return [{ source: "/(.*)", headers: base }];
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
    serverComponentsExternalPackages: ["argon2", "@prisma/client", "prisma"],
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "learn.musawotraining.ug",
      ],
    },
  },

  webpack(config, { isServer }) {
    if (isServer) {
      // argon2 uses native bindings; keep it as an external for the server bundle
      const existing = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(existing) ? existing : [existing]),
        "argon2",
      ];
    } else {
      // Prevent webpack from trying to bundle Node built-ins for the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "node:crypto": false,
        "node:buffer": false,
        "node:stream": false,
        "node:util": false,
        "node:path": false,
        "node:fs": false,
        "node:os": false,
      };
    }
    return config;
  },
};

export default nextConfig;
