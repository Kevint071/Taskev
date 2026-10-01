import type { NextConfig } from "next";
import { SESSION_COOKIE_NAMES } from "./src/lib/session-cookie";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // `/` is the static landing for anonymous visitors and the dashboard for
  // anyone carrying a session cookie. The cookie only picks the page; real
  // authorization stays in getCurrentUser() and the route guards.
  async rewrites() {
    return {
      beforeFiles: SESSION_COOKIE_NAMES.map((key) => ({
        source: "/",
        has: [{ type: "cookie" as const, key }],
        destination: "/hoy",
      })),
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
