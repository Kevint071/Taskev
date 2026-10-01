"use client";

import type { CSSProperties } from "react";
import { FlowChip } from "./task-flow-chip";
import {
  CAPTIONS,
  CHIPS,
  COUNT,
  describe,
  STAGE_HEIGHT,
  TAGS,
} from "./task-flow-data";
import { useTaskFlow } from "./use-task-flow";

export function TaskFlow() {
  const { rootRef, frame, paused, togglePause } = useTaskFlow();

  const ordered = frame.phase !== "chaos";
  const lead = CHIPS[frame.k % COUNT];
  const pct = frame.pct ?? lead.progress;

  return (
    <figure
      ref={rootRef}
      data-motion-ok=""
      aria-label="Animación: las tareas llegan desordenadas, Taskev las ordena por lo que importa y, al completar la primera, queda lista la siguiente."
      className="min-w-0 w-full"
    >
      <div
        aria-hidden="true"
        className="relative mx-auto w-full max-w-140 [--spread:0.3] [--tag-spread:1] sm:[--spread:1.15] sm:[--tag-spread:1.7]"
        style={{ height: STAGE_HEIGHT }}
      >
        <div
          className="pointer-events-none absolute inset-x-[-12%] inset-y-[-8%] rounded-[50%] bg-accent blur-3xl transition-opacity duration-1000"
          style={{ opacity: ordered ? 0.2 : 0.08 }}
        />

        {TAGS.map((tag, i) => (
          <div
            key={tag.label}
            className="absolute top-0 left-1/2 z-40 hidden w-max transition-[transform,opacity] duration-900 ease-[cubic-bezier(0.2,0.9,0.25,1.1)] sm:block"
            style={{
              transform: ordered
                ? "translate(-50%, 170px) scale(0.5)"
                : `translate(calc(-50% + ${tag.x}% * var(--tag-spread)), ${tag.y}px) rotate(${tag.rot}deg)`,
              opacity: ordered ? 0 : 1,
              transitionDelay: `${i * 60}ms`,
            }}
          >
            <span
              className={`block rounded-full border border-line-strong bg-raised px-3 py-1.5 text-meta font-medium text-muted shadow-panel ${
                ordered ? "" : "animate-drift"
              }`}
              style={{ "--dur": `${tag.dur}s` } as CSSProperties}
            >
              {tag.label}
            </span>
          </div>
        ))}

        {CHIPS.map((chip, i) => (
          <FlowChip
            key={chip.id}
            chip={chip}
            index={i}
            view={describe(i, frame)}
            pct={pct}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p
          key={frame.phase}
          aria-hidden="true"
          className="animate-caption-in min-h-7 text-section font-semibold tracking-tight"
        >
          {CAPTIONS[frame.phase]}
        </p>
        <button
          type="button"
          onClick={togglePause}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1 text-meta font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <svg
            viewBox="0 0 20 20"
            className="size-4"
            fill="currentColor"
            aria-hidden="true"
          >
            {!paused ? (
              <path d="M6 4h2.6v12H6zM11.4 4H14v12h-2.6z" />
            ) : (
              <path d="M6.5 4.2v11.6a.6.6 0 0 0 .9.5l9-5.8a.6.6 0 0 0 0-1l-9-5.8a.6.6 0 0 0-.9.5Z" />
            )}
          </svg>
          {paused ? "Reproducir animación" : "Pausar animación"}
        </button>
      </div>
    </figure>
  );
}
