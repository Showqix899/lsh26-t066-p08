/**
 * Small, reusable presentational pieces shared across the roster, trace,
 * and checking-list views.
 */
import type { ReactNode } from "react";

/** A compact pill used for letter grades and list-membership flags. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "pass" | "flag" | "optional";
}) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-surface-sunken text-ink-soft border-paper-line",
    pass: "bg-pass-soft text-pass border-pass/20",
    flag: "bg-flag-soft text-flag border-flag/20",
    optional: "bg-optional-soft text-optional border-optional/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium leading-none font-mono-num ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

/** Letter-grade pill, coloured by outcome. */
export function LetterPill({ letter }: { letter: string }) {
  if (letter === "F") return <Pill tone="flag">F</Pill>;
  if (letter === "A+" || letter === "A") return <Pill tone="pass">{letter}</Pill>;
  return <Pill tone="neutral">{letter}</Pill>;
}

/**
 * The app's one signature visual device: a hand-drawn "red pen" circle,
 * evoking the mark a teacher makes around the specific number responsible
 * for an outcome. Rendered behind/around a value in the trace view so the
 * eye lands exactly on the number a rule flagged, mirroring the brief's
 * own words: "shows the teacher exactly which rule produced each number."
 */
export function RedPenCircle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center justify-center px-2 py-0.5">
      <svg
        aria-hidden="true"
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full text-flag"
      >
        <path
          d="M 8 22 C 6 8, 30 2, 50 3 C 76 4, 96 8, 93 22 C 96 37, 68 42, 48 41 C 26 42, 4 36, 8 22 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="relative font-mono-num font-semibold text-flag">{children}</span>
    </span>
  );
}
