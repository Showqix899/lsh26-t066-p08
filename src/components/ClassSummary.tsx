/**
 * Class summary — bonus feature: "Show a class summary: pass rate, grade
 * distribution and the subject that failed the most students."
 *
 * Kept dependency-free (no chart library) so the bars are just styled
 * <div>s — consistent with the minimal ledger aesthetic and avoids pulling
 * in a heavier package for a handful of bars.
 */
import { useMemo } from "react";
import type { ExamCase, StudentResult } from "../engine/types";

const LETTER_ORDER = ["A+", "A", "A-", "B", "C", "D", "F"];

export function ClassSummary({ examCase, results }: { examCase: ExamCase; results: StudentResult[] }) {
  const classes = useMemo(() => Array.from(new Set(results.map((r) => r.student.class))).sort(), [results]);

  return (
    <div className="space-y-10">
      {classes.map((cls) => {
        const rows = results.filter((r) => r.student.class === cls);
        const passCount = rows.filter((r) => r.letter !== "F").length;
        const passRate = rows.length ? Math.round((passCount / rows.length) * 100) : 0;

        const distribution = LETTER_ORDER.map((letter) => ({
          letter,
          count: rows.filter((r) => r.letter === letter).length,
        }));
        const maxCount = Math.max(1, ...distribution.map((d) => d.count));

        // Subject that failed the most students: count every compulsory
        // fail plus every optional fail across the class's roster.
        const failCounts = new Map<string, number>();
        for (const r of rows) {
          for (const s of r.subjects) {
            if (s.failed) failCounts.set(s.code, (failCounts.get(s.code) ?? 0) + 1);
          }
        }
        let worstSubject: { code: string; name: string; count: number } | null = null;
        for (const [code, count] of failCounts.entries()) {
          if (!worstSubject || count > worstSubject.count) {
            const def = examCase.subjects.find((s) => s.code === code);
            worstSubject = { code, name: def?.name ?? code, count };
          }
        }

        return (
          <section key={cls}>
            <h3 className="font-display text-xl mb-3">{cls}</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-soft">Pass rate</p>
                <p className="font-mono-num text-3xl font-semibold">{passRate}%</p>
                <p className="text-xs text-ink-soft">
                  {passCount} of {rows.length} students passed (letter ≠ F)
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-soft">Subject failing the most students</p>
                {worstSubject ? (
                  <>
                    <p className="font-display text-xl">{worstSubject.name}</p>
                    <p className="text-xs text-ink-soft font-mono-num">
                      {worstSubject.count} student(s) failed {worstSubject.code}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-ink-soft italic">No subject failures in this class.</p>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-ink-soft mb-1">Grade distribution</p>
                <div className="flex items-end gap-2 h-20">
                  {distribution.map((d) => (
                    <div key={d.letter} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-6 rounded-t-sm ${d.letter === "F" ? "bg-flag" : "bg-pass"}`}
                        style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? 3 : 0 }}
                        title={`${d.letter}: ${d.count}`}
                      />
                      <span className="text-[10px] font-mono-num text-ink-soft">{d.letter}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="ledger-rule mt-4" />
          </section>
        );
      })}
    </div>
  );
}
