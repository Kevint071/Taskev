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
        // Without `value`, Next forwards the matched cookie to the destination
        // as a query param, which would put the session JWT in the URL.
        has: [{ type: "cookie" as const, key, value: ".+" }],
        destination: "/hoy",
      })),
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
