import type { ReactNode } from "react";
import { CloseIcon } from "@/components/ui/icons";
import type { PasswordRule } from "@/lib/password-checks";

/*
 * `data-motion-ok` on these: the motion is feedback, so it keeps running even
 * when the OS asks to reduce animations (Windows does that with "Show
 * animations" off, which is easy to have off without realising).
 */

/** Tick that draws itself in beside the label once the rule is met. */
function Tick({ ok }: { ok: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`shrink-0 text-status-done transition-[width,margin,opacity] duration-300 ease-out ${
        ok ? "mr-1 w-3.5 opacity-100" : "mr-0 w-0 opacity-0"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M4 10.5 8.3 14.8 16 5.5"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: ok ? 0 : 1,
          transition: ok
            ? "stroke-dashoffset 320ms ease-out 120ms"
            : "stroke-dashoffset 120ms ease-in",
        }}
      />
    </svg>
  );
}

/**
 * The rules a password has to meet, one segment each: a bar that fills green
 * when the rule is met, with its label underneath. Doubles as the strength
 * meter, and sits right under the field it describes.
 */
export function PasswordRequirements({
  rules,
  label = "Requisitos de la contraseña",
  className = "",
}: {
  rules: PasswordRule[];
  label?: string;
  className?: string;
}) {
  return (
    <ul
      data-motion-ok=""
      aria-label={label}
      className={`grid grid-cols-[1.3fr_1fr_1fr_1.25fr] gap-3 ${className}`}
    >
      {rules.map((rule) => (
        <li key={rule.id} className="flex min-w-0 flex-col gap-1.5">
          <span className="relative h-0.75 rounded-full bg-line-strong/50">
            <span
              className={`block size-full origin-left rounded-full bg-status-done transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                rule.ok ? "scale-x-100" : "scale-x-0"
              }`}
            />
            {rule.ok ? (
              <span
                aria-hidden="true"
                className="animate-ring-burst pointer-events-none absolute inset-0 rounded-full"
              />
            ) : null}
          </span>
          <span
            className={`flex items-center text-meta leading-tight font-medium transition-colors duration-300 ${
              rule.ok ? "text-ink" : "text-muted"
            }`}
          >
            <Tick ok={rule.ok} />
            {rule.short}
            <span className="sr-only">
              {rule.ok ? "(cumplido)" : "(pendiente)"}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Radio-style badge: the ring fills with a springy pop and its tick draws itself. */
function RadioMark({ ok }: { ok: boolean }) {
  return (
    <span className="relative size-4.5 shrink-0">
      <span
        className={`absolute inset-0 rounded-full border-2 transition-colors duration-300 ${
          ok ? "border-status-done" : "border-line-strong"
        }`}
      />
      <span
        className={`absolute inset-0 rounded-full bg-status-done transition-transform duration-380 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          ok ? "scale-100" : "scale-0"
        }`}
      />
      <svg
        viewBox="0 0 20 20"
        className="absolute inset-0 text-raised"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          d="M5.2 10.4 8.6 13.8 14.8 6.6"
          pathLength={1}
          style={{
            strokeDasharray: 1,
            strokeDashoffset: ok ? 0 : 1,
            transition: ok
              ? "stroke-dashoffset 300ms ease-out 110ms"
              : "stroke-dashoffset 120ms ease-in",
          }}
        />
      </svg>
      {ok ? (
        <span
          aria-hidden="true"
          className="animate-ring-burst pointer-events-none absolute inset-0 rounded-full"
        />
      ) : null}
    </span>
  );
}

/**
 * The rules a password has to meet as a plain list: a radio-style circle and
 * the full wording on each row. Rows light up as the person types, and the
 * list settles into a green "all set" state once every rule passes.
 */
export function PasswordChecklist({
  rules,
  label = "Requisitos de la contraseña",
  className = "",
}: {
  rules: PasswordRule[];
  label?: string;
  className?: string;
}) {
  return (
    <ul
      data-motion-ok=""
      aria-label={label}
      className={`flex flex-col gap-2 ${className}`}
    >
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-2.5 text-meta font-medium transition-colors duration-300 ${
            rule.ok ? "text-ink" : "text-muted"
          }`}
        >
          <RadioMark ok={rule.ok} />
          {rule.label}
          <span className="sr-only">
            {rule.ok ? "(cumplido)" : "(pendiente)"}
          </span>
        </li>
      ))}
    </ul>
  );
}

const STATUS_TONES = {
  ok: "text-status-done",
  idle: "text-muted",
  warn: "text-danger",
} as const;

/**
 * One line of live feedback under a field ("Coinciden", "Es igual a la
 * actual"). It unfolds when `show` turns on and its icon swaps with the tone.
 */
export function FieldStatus({
  show,
  tone,
  children,
}: {
  show: boolean;
  tone: keyof typeof STATUS_TONES;
  children: ReactNode;
}) {
  return (
    <div
      data-motion-ok=""
      aria-live="polite"
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">
        <p
          key={tone}
          className={`animate-caption-in flex items-center gap-1.5 text-meta font-medium ${STATUS_TONES[tone]}`}
        >
          <span className="flex size-3.5 items-center justify-center">
            {tone === "ok" ? (
              <svg
                viewBox="0 0 20 20"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 10.5 8.3 14.8 16 5.5" />
              </svg>
            ) : tone === "warn" ? (
              <CloseIcon className="size-3.5" />
            ) : (
              <span className="size-1.5 rounded-full bg-current opacity-60" />
            )}
          </span>
          {children}
        </p>
      </div>
    </div>
  );
}
