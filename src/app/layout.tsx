import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { TIME_ZONE_INIT_SCRIPT } from "@/lib/time-zone";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Taskev",
  description: "Grupos y tareas ordenados por lo que más importa hoy",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${instrumentSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme bootstrap that must run before first paint
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static time zone cookie bootstrap so server renders know the viewer's day
          dangerouslySetInnerHTML={{ __html: TIME_ZONE_INIT_SCRIPT }}
        />
      </head>
      <body
        className="flex min-h-full flex-col bg-surface font-sans text-ui text-ink"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
