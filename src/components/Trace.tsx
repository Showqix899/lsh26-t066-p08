/**
 * Trace view — item 3 of the spec: "For every subject, show the mark used,
 * the grade point it produced and the rule that decided it. Where a
 * student with a high average still failed, the trace must show the
 * subject that caused it."
 *
 * The subject(s) actually responsible for an outcome (a compulsory
 * failure, a practical-only failure, an absence) are wrapped in the app's
 * red-pen signature marker so they are impossible to miss.
 */
import type { StudentResult, SubjectTrace } from "../engine/types";
import { formatGpa } from "../engine/rules";
import { LetterPill, Pill, RedPenCircle } from "./Badges";

function SubjectRow({ s, flagged }: { s: SubjectTrace; flagged: boolean }) {
  return (
    <tr className="border-b border-paper-line/70 align-top">
      <td className="py-2 pr-3">
        <div className="font-medium">{s.name}</div>
        <div className="text-[11px] text-ink-soft font-mono-num">{s.code}</div>
      </td>
      <td className="py-2 pr-3 font-mono-num">
        {flagged ? <RedPenCircle>{s.markDisplay}</RedPenCircle> : s.markDisplay}
      </td>
      <td className="py-2 pr-3 text-right font-mono-num">
        {s.gradePoint.toFixed(1)}
      </td>
      <td className="py-2 pr-3">
        <Pill tone={s.failed ? "flag" : "neutral"}>{s.ruleId}</Pill>
      </td>
      <td className="py-2 text-ink-soft">{s.explanation}</td>
    </tr>
  );
}

export function Trace({ result }: { result: StudentResult }) {
  const { student } = result;
  const failingSet = new Set(result.failingCompulsorySubjects);

  return (
    <div data-print-area>
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-wide text-ink-soft">
          {student.class} · {student.id}
        </p>
        <h2 className="font-display text-2xl">{student.name}</h2>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-mono-num text-3xl font-semibold">{formatGpa(result.gpa)}</span>
          <LetterPill letter={result.letter} />
          {result.onAbsentList && <Pill tone="flag">On absent list</Pill>}
          {result.onPracticalFailList && <Pill tone="flag">On practical-fail list</Pill>}
          {result.onOptionalList && <Pill tone="optional">On optional list</Pill>}
        </div>
      </header>

      <div className="ledger-rule" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft">
            <th className="py-2 pr-3 font-medium">Subject</th>
            <th className="py-2 pr-3 font-medium">Mark used</th>
            <th className="py-2 pr-3 font-medium text-right">Grade pt</th>
            <th className="py-2 pr-3 font-medium">Rule</th>
            <th className="py-2 font-medium">Why</th>
          </tr>
        </thead>
        <tbody>
          {result.subjects
            .filter((s) => !s.isOptional)
            .map((s) => (
              <SubjectRow key={s.code} s={s} flagged={failingSet.has(s.code)} />
            ))}
          {result.subjects
            .filter((s) => s.isOptional)
            .map((s) => (
              <SubjectRow key={s.code} s={s} flagged={s.failed} />
            ))}
        </tbody>
      </table>
      <div className="ledger-rule mt-1" />

      <section className="mt-6 space-y-2 text-sm">
        <h3 className="font-display text-lg mb-2">GPA calculation (R-13)</h3>
        <Row label="Sum of 6 compulsory grade points" value={result.compulsorySum.toFixed(1)} />
        <Row
          label="Optional grade point"
          value={`${result.optionalGradePoint.toFixed(1)} → contributes max(0, ${result.optionalGradePoint.toFixed(
            1
          )} − 2) = ${result.optionalContribution.toFixed(1)}`}
        />
        <Row
          label="Uncancelled average"
          value={`(${result.compulsorySum.toFixed(1)} + ${result.optionalContribution.toFixed(
            1
          )}) ÷ 6 = ${formatGpa(result.uncancelledGpa)}`}
        />
        {result.hasCompulsoryFailure ? (
          <div className="mt-3 rounded-sm border border-flag/30 bg-flag-soft p-3">
            <p className="font-medium text-flag">
              Overridden to GPA 0.00 / F — compulsory failure in{" "}
              {result.failingCompulsorySubjects.map((code, i) => (
                <span key={code}>
                  {i > 0 && ", "}
                  <RedPenCircle>{code}</RedPenCircle>
                </span>
              ))}
            </p>
            <p className="mt-1 text-ink-soft">
              R-13: any compulsory failure gives GPA 0.00 and letter F, whatever the uncancelled
              average above says. The average is kept visible here so the reason for the override
              is traceable.
            </p>
          </div>
        ) : (
          <Row label="Final GPA" value={`${formatGpa(result.gpa)} → letter ${result.letter}`} strong />
        )}
      </section>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-paper-line/60 py-1.5">
      <span className="text-ink-soft">{label}</span>
      <span className={`font-mono-num text-right ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
