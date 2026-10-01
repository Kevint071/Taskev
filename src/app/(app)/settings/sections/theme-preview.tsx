import type { ThemePreference } from "@/lib/theme";

const PALETTES = {
  dark: {
    surface: "#0a0c10",
    raised: "#14171d",
    line: "#23272f",
    ink: "#f2f4f8",
    accent: "#8fa4f5",
  },
  light: {
    surface: "#f4f6f9",
    raised: "#ffffff",
    line: "#e0e5ec",
    ink: "#1a2332",
    accent: "#3553c7",
  },
};

/** Hand-drawn miniature of the app in a given palette. */
function ThemeMock({ dark }: { dark: boolean }) {
  const p = dark ? PALETTES.dark : PALETTES.light;
  return (
    <span
      className="absolute inset-0 flex gap-1.5 p-2"
      style={{ background: p.surface }}
    >
      <span
        className="flex w-1/4 flex-col gap-1 rounded-sm p-1"
        style={{ background: p.raised }}
      >
        <span
          className="h-1 w-3/4 rounded-full"
          style={{ background: p.accent }}
        />
        <span
          className="h-1 w-full rounded-full"
          style={{ background: p.line }}
        />
        <span
          className="h-1 w-2/3 rounded-full"
          style={{ background: p.line }}
        />
      </span>
      <span className="flex flex-1 flex-col gap-1.5">
        <span
          className="h-1.5 w-1/2 rounded-full"
          style={{ background: p.ink }}
        />
        <span
          className="flex flex-1 flex-col gap-1 rounded-sm border p-1.5"
          style={{ background: p.raised, borderColor: p.line }}
        >
          <span
            className="h-1 w-full rounded-full"
            style={{ background: p.line }}
          />
          <span
            className="h-1 w-3/4 rounded-full"
            style={{ background: p.line }}
          />
          <span
            className="mt-auto h-1.5 w-1/3 rounded-full"
            style={{ background: p.accent }}
          />
        </span>
      </span>
    </span>
  );
}

/** "Sistema" shows the light mock split diagonally with the dark one. */
export function ThemePreview({ theme }: { theme: ThemePreference }) {
  if (theme !== "system") return <ThemeMock dark={theme === "dark"} />;
  return (
    <>
      <ThemeMock dark={false} />
      <span
        className="absolute inset-0"
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      >
        <ThemeMock dark />
      </span>
    </>
  );
}
