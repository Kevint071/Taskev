import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the routes reachable without a session; everything else redirects to /login.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${SITE_URL}/login`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
