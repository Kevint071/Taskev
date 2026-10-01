import { Landing } from "@/components/home/landing";
import { SITE_JSON_LD } from "@/lib/site";

export const metadata = { alternates: { canonical: "/" } };

// Static on purpose: visitors with a session cookie never reach this page,
// next.config.ts rewrites `/` to the dashboard (`/hoy`) for them.
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD built from constants, "<" escaped against script breakout
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <Landing />
    </>
  );
}
