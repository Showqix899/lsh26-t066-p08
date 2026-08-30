/**
 * Roster view: every student in the loaded case, one row each, sortable by
 * class and searchable by name/id. Clicking a row opens that student's
 * full trace (item 3 of the spec) in the Trace view.
 */
import { useMemo, useState } from "react";
import type { StudentResult } from "../engine/types";
import { formatGpa } from "../engine/rules";
import { LetterPill, Pill } from "./Badges";

type SortKey = "name" | "class" | "gpa";

export function Roster({
  results,
  onSelect,
}: {
  results: StudentResult[];
  onSelect: (studentId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const classes = useMemo(
    () => Array.from(new Set(results.map((r) => r.student.class))).sort(),
    [results]
  );

  const filtered = useMemo(() => {
    let rows = results;
    if (classFilter !== "all") rows = rows.filter((r) => r.student.class === classFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.student.name.toLowerCase().includes(q) || r.student.id.toLowerCase().includes(q)
      );
    }
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortKey === "gpa") return b.gpa - a.gpa;
      if (sortKey === "class") return a.student.class.localeCompare(b.student.class);
      return a.student.name.localeCompare(b.student.name);
    });
    return sorted;
  }, [results, classFilter, query, sortKey]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wide text-ink-soft mb-1" htmlFor="roster-search">
            Search
          </label>
          <input
            id="roster-search"
            type="text"
            placeholder="Name or ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-48 rounded-sm border border-paper-line bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wide text-ink-soft mb-1" htmlFor="roster-class">
            Class
          </label>
          <select
            id="roster-class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-sm border border-paper-line bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wide text-ink-soft mb-1" htmlFor="roster-sort">
            Sort by
          </label>
          <select
            id="roster-sort"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-sm border border-paper-line bg-surface px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          >
            <option value="name">Name</option>
            <option value="class">Class</option>
            <option value="gpa">GPA (high → low)</option>
          </select>
        </div>
        <p className="ml-auto text-xs text-ink-soft font-mono-num">
          {filtered.length} of {results.length} students
        </p>
      </div>

      <div className="ledger-rule" />
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink-soft">
            <th className="py-2 pr-2 font-medium">ID</th>
            <th className="py-2 pr-2 font-medium">Name</th>
            <th className="py-2 pr-2 font-medium">Class</th>
            <th className="py-2 pr-2 font-medium">Optional</th>
            <th className="py-2 pr-2 font-medium text-right">GPA</th>
            <th className="py-2 pr-2 font-medium">Letter</th>
            <th className="py-2 pr-2 font-medium">Flags</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr
              key={r.student.id}
              onClick={() => onSelect(r.student.id)}
              className="cursor-pointer border-b border-paper-line/70 hover:bg-surface-sunken"
            >
              <td className="py-1.5 pr-2 font-mono-num text-ink-soft">{r.student.id}</td>
              <td className="py-1.5 pr-2">{r.student.name}</td>
              <td className="py-1.5 pr-2 text-ink-soft">{r.student.class}</td>
              <td className="py-1.5 pr-2 text-ink-soft">{r.student.optional}</td>
              <td className="py-1.5 pr-2 text-right font-mono-num">{formatGpa(r.gpa)}</td>
              <td className="py-1.5 pr-2">
                <LetterPill letter={r.letter} />
              </td>
              <td className="py-1.5 pr-2">
                <div className="flex gap-1">
                  {r.onAbsentList && <Pill tone="flag">AB</Pill>}
                  {r.onPracticalFailList && <Pill tone="flag">Practical</Pill>}
                  {r.onOptionalList && <Pill tone="optional">Optional</Pill>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-soft">No students match this search.</p>
      )}
    </div>
  );
}
