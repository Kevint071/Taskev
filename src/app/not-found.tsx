import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Brand } from "@/components/brand";
import { BackIcon } from "@/components/ui/icons";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

/**
 * Strokes of the two 4s, each traced as a single path from the bar's right
 * end, along the bar, up the diagonal and down the stem. `pathLength={1}` in
 * the markup lets `animate-stroke-draw` draw it without measuring.
 */
const FOUR = "M150 132 H14 L112 14 V186";

const STROKE = {
  fill: "none",
  strokeWidth: 28,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Sets the animation vars in one place; every animated node names all it uses. */
function vars(values: Record<string, string>) {
  return values as CSSProperties;
}

/**
 * `data-motion-ok` keeps the motion when the OS asks for reduced animation
 * (see globals.css): the page has a single moving idea, a zero that looks
 * around for the missing page, and it is the whole point of the screen.
 */
export default function NotFound() {
  return (
    <main
      data-motion-ok=""
      className="flex flex-1 flex-col overflow-hidden px-4 py-6"
    >
      <Link href="/" className="w-fit" aria-label="Taskev, ir al inicio">
        <Brand />
      </Link>

      <div className="relative mx-auto flex w-full max-w-140 flex-1 flex-col items-center justify-center gap-8 py-10 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[18%] left-1/2 h-56 w-[120%] -translate-x-1/2 rounded-[50%] bg-accent opacity-15 blur-3xl dark:opacity-25"
        />

        <div className="relative flex w-full justify-center px-6 sm:px-10">
          <svg
            role="img"
            aria-label="Error 404"
            viewBox="-40 -40 600 280"
            className="w-full max-w-130 overflow-visible"
          >
            <g
              className="animate-drift origin-center transform-fill"
              style={vars({ "--dur": "5.2s", "--delay": "1.4s" })}
            >
              <path
                d={FOUR}
                pathLength={1}
                {...STROKE}
                className="animate-stroke-draw stroke-ink"
                style={vars({ "--dur": "800ms", "--delay": "100ms" })}
              />
            </g>

            <g transform="translate(180 0)">
              <g
                className="animate-drift origin-center transform-fill"
                style={vars({ "--dur": "4.4s", "--delay": "2s" })}
              >
                <g
                  className="animate-orbit"
                  style={vars({ "--dur": "9s", "--delay": "1.6s" })}
                >
                  <circle
                    cx={80}
                    cy={100}
                    r={72}
                    pathLength={100}
                    {...STROKE}
                    strokeDasharray="82 18"
                    className="animate-ring-draw stroke-accent"
                    style={vars({ "--delay": "500ms" })}
                  />
                </g>
                <g
                  className="animate-wander-x"
                  style={vars({ "--range": "26px", "--delay": "-1.2s" })}
                >
                  <g
                    className="animate-wander-y"
                    style={vars({ "--range": "24px", "--delay": "-2.6s" })}
                  >
                    <circle
                      cx={80}
                      cy={100}
                      r={13}
                      className="animate-dot-pop fill-accent"
                      style={vars({ "--delay": "1500ms" })}
                    />
                  </g>
                </g>
              </g>
            </g>

            <g transform="translate(360 0)">
              <g
                className="animate-drift origin-center transform-fill"
                style={vars({ "--dur": "4.8s", "--delay": "1.8s" })}
              >
                <path
                  d={FOUR}
                  pathLength={1}
                  {...STROKE}
                  className="animate-stroke-draw stroke-ink"
                  style={vars({ "--dur": "800ms", "--delay": "900ms" })}
                />
              </g>
            </g>
          </svg>
        </div>

        <div className="relative flex flex-col items-center gap-3">
          <h1
            className="animate-rise text-headline font-semibold"
            style={vars({ "--delay": "1000ms" })}
          >
            No encontramos esta página
          </h1>
          <p
            className="animate-rise max-w-[44ch] text-body text-muted"
            style={vars({ "--delay": "1150ms" })}
          >
            Esta dirección no existe o cambió de lugar.
          </p>
        </div>

        <div className="animate-rise" style={vars({ "--delay": "1300ms" })}>
          <Link
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-line-strong px-5 py-2.5 text-body font-semibold text-ink transition-colors duration-200 hover:border-accent hover:text-accent"
          >
            <BackIcon className="size-5 transition-transform duration-300 group-hover:-translate-x-1" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
