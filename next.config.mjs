import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  eslint: {
    // Lint errors will not fail the production build.
    // Run `npm run lint` locally to catch issues during development.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors will not fail the production build either.
    // Run `npx tsc --noEmit` locally to check types.
    ignoreBuildErrors: true,
  },

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
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://musawo.ug https://*.musawo.ug https://learn.musawotraining.ug https://*.onrender.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
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
      {
        protocol: "https",
        hostname: "learn.musawotraining.ug",
      },
      {
        protocol: "https",
        hostname: "musawo.ug",
      },
      {
        protocol: "https",
        hostname: "**.musawo.ug",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Cache optimised images for 2 weeks on disk. Caddy also caches /_next/image
    // for 7 days at the proxy level so warm requests never hit Node.
    minimumCacheTTL: 1209600,
    // Limit the breakpoint ladder so Next.js generates fewer image variants.
    // Matches our Tailwind breakpoints: mobile, tablet, laptop, desktop.
    deviceSizes: [390, 640, 1024, 1280, 1920],
    imageSizes: [64, 128, 256, 384],
  },

  experimental: {
    serverComponentsExternalPackages: ["argon2", "@prisma/client", "prisma", "sharp", "@img/sharp-linux-x64", "@img/sharp-linuxmusl-x64"],
    serverActions: {
      // 10 MB limit for server action bodies (file uploads go through the upload API, not actions)
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "localhost:3000",
        "learn.musawotraining.ug",
      ],
    },
  },

  webpack(config, { isServer }) {
    // Explicitly register the @/ alias so Render's clean webpack build
    // always resolves it correctly, independent of tsconfig path reading.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };

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
