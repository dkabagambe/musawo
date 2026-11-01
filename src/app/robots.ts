import type { MetadataRoute } from "next";
import { isProduction } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (isProduction()) {
    return {
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${process.env.AUTH_URL ?? "https://learn.musawotraining.ug"}/sitemap.xml`,
    };
  }

  // Staging / development: disallow everything
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
