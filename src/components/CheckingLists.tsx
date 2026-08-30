/**
 * Checking-list view — item 4 of the spec: "Give the office a checking
 * list before results go out: every student whose result was changed by
 * the optional subject rule, by a practical fail, or by an absent mark."
 *
 * Definitions follow R-29 exactly: a student can appear on more than one
 * list, and each list's membership test is independent of the others.
 */
import type { StudentResult } from "../engine/types";
import { LetterPill, Pill } from "./Badges";

function ListSection({
  title,
  ruleNote,
  rows,
  onSelect,
  reasonFor,
}: {
  title: string;
  ruleNote: string;
  rows: StudentResult[];
  onSelect: (id: string) => void;
  reasonFor: (r: StudentResult) => string;
}) {
  return (
    <section className="mb-8">
      <h3 className="font-display text-lg">{title}</h3>
      <p className="mb-3 text-xs text-ink-soft">{ruleNote}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft italic">No students on this list.</p>
      ) : (
        <>
          <div className="ledger-rule" />
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Class</th>
                <th className="py-2 pr-3 font-medium">Letter</th>
                <th className="py-2 font-medium">Reason to verify by hand</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.student.id}
                  onClick={() => onSelect(r.student.id)}
                  className="cursor-pointer border-b border-paper-line/70 hover:bg-surface-sunken"
                >
                  <td className="py-1.5 pr-3 font-mono-num text-ink-soft">{r.student.id}</td>
                  <td className="py-1.5 pr-3">{r.student.name}</td>
                  <td className="py-1.5 pr-3 text-ink-soft">{r.student.class}</td>
                  <td className="py-1.5 pr-3">
                    <LetterPill letter={r.letter} />
                  </td>
                  <td className="py-1.5 text-ink-soft">{reasonFor(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

export function CheckingLists({
  results,
  onSelect,
}: {
  results: StudentResult[];
  onSelect: (id: string) => void;
}) {
  const optional = results.filter((r) => r.onOptionalList);
  const practicalFail = results.filter((r) => r.onPracticalFailList);
  const absent = results.filter((r) => r.onAbsentList);

  const inMultiple = results.filter(
    (r) => [r.onOptionalList, r.onPracticalFailList, r.onAbsentList].filter(Boolean).length > 1
  );

  return (
    <div>
      <p className="mb-6 text-sm text-ink-soft">
        {optional.length + practicalFail.length + absent.length === 0
          ? "No students require hand verification in this case."
          : `${new Set([...optional, ...practicalFail, ...absent].map((r) => r.student.id)).size} student(s) need a hand check, ${inMultiple.length} of them for more than one reason.`}
      </p>

      <ListSection
        title={`Optional-subject list (${optional.length})`}
        ruleNote="R-29: every student whose optional grade point is 2.0 or below — including an absent optional, which counts as 0."
        rows={optional}
        onSelect={onSelect}
        reasonFor={(r) => `Optional (${r.student.optional}) grade point is ${r.optionalGradePoint.toFixed(1)} — contributed nothing to the GPA.`}
      />

      <ListSection
        title={`Practical-fail list (${practicalFail.length})`}
        ruleNote="R-29: every student with a practical part below the pass mark of 8 in any subject."
        rows={practicalFail}
        onSelect={onSelect}
        reasonFor={(r) => {
          const subs = r.subjects.filter((s) => s.hasPractical && s.practicalMark !== undefined && s.practicalMark < 8);
          return subs.map((s) => `${s.code} practical ${s.practicalMark}/25`).join(", ");
        }}
      />

      <ListSection
        title={`Absent list (${absent.length})`}
        ruleNote="R-29: every student with AB in any subject."
        rows={absent}
        onSelect={onSelect}
        reasonFor={(r) => {
          const subs = r.subjects.filter((s) => s.isAbsent);
          return subs
            .map((s) => `AB in ${s.code}${s.isOptional ? " (optional)" : " (compulsory → overall F)"}`)
            .join(", ");
        }}
      />

      {inMultiple.length > 0 && (
        <p className="mt-2 text-xs text-ink-soft">
          <Pill tone="flag">Note</Pill> {inMultiple.length} student(s) above appear on more than one
          list — that's expected per R-29 and not a data error.
        </p>
      )}
    </div>
  );
}
