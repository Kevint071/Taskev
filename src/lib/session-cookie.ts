// Auth.js (v5) session cookie names: plain over HTTP, `__Secure-` prefixed
// over HTTPS. next.config.ts uses them to route `/` without running any code,
// so keep this file free of imports.
export const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
] as const;
