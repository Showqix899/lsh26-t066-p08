/**
 * App shell.
 *
 * Navigation is plain React state rather than a router: the whole app is
 * five views over one in-memory dataset, so a router would add a
 * dependency and a URL-sync layer for no real benefit at this scope. See
 * README.md "Design decisions" for the fuller reasoning.
 */
import { useEffect, useMemo, useState } from "react";
import { evaluateCase } from "./engine/rules";
import { loadFixtures, getDefaultCase, listCases, getCaseById } from "./data/loader";
import type { ExamCase, FixtureFile } from "./engine/types";
import { Roster } from "./components/Roster";
import { Trace } from "./components/Trace";
import { CheckingLists } from "./components/CheckingLists";
import { ClassSummary } from "./components/ClassSummary";
import { UploadPanel } from "./components/UploadPanel";

type View = "roster" | "trace" | "lists" | "summary" | "upload";

const TABS: { id: View; label: string }[] = [
  { id: "roster", label: "Roster" },
  { id: "trace", label: "Student trace" },
  { id: "lists", label: "Checking lists" },
  { id: "summary", label: "Class summary" },
  { id: "upload", label: "Upload / validate" },
];

export default function App() {
  const [fixtures, setFixtures] = useState<FixtureFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [examCase, setExamCase] = useState<ExamCase | null>(null);
  const [view, setView] = useState<View>("roster");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadFixtures()
      .then((f) => {
        setFixtures(f);
        setExamCase(getDefaultCase(f));
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const results = useMemo(() => (examCase ? evaluateCase(examCase) : []), [examCase]);
  const selectedResult = useMemo(
    () => results.find((r) => r.student.id === selectedId) ?? null,
    [results, selectedId]
  );

  function selectStudent(id: string) {
    setSelectedId(id);
    setView("trace");
  }

  function handleCaseChange(caseId: string) {
    if (!fixtures) return;
    const next = getCaseById(fixtures, caseId);
    if (next) {
      setExamCase(next);
      setSelectedId(null);
      setView("roster");
    }
  }

  function handleReset() {
    if (!fixtures) return;
    setExamCase(getDefaultCase(fixtures));
    setSelectedId(null);
    setView("roster");
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-center">
        <div>
          <p className="font-display text-xl text-flag">Could not load sample data</p>
          <p className="mt-2 text-sm text-ink-soft">{loadError}</p>
          <p className="mt-2 text-sm text-ink-soft">
            Try the "Upload / validate" panel to load a marks file manually once the app loads, or
            reload the page.
          </p>
        </div>
      </div>
    );
  }

  if (!fixtures || !examCase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <p className="text-sm text-ink-soft">Loading published fixture…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="no-print border-b border-paper-line bg-surface">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-ink-soft">P08 · LSH26-T066</p>
              <h1 className="font-display text-2xl">School Result &amp; GPA Ledger</h1>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-soft" htmlFor="case-select">
                Fixture case
              </label>
              <select
                id="case-select"
                value={examCase.case_id}
                onChange={(e) => handleCaseChange(e.target.value)}
                className="rounded-sm border border-paper-line bg-surface px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ink/20"
              >
                {listCases(fixtures).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleReset}
                className="rounded-sm border border-paper-line px-2 py-1 text-xs text-ink-soft hover:bg-surface-sunken"
              >
                Reset to default
              </button>
            </div>
          </div>

          <nav className="mt-4 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                disabled={t.id === "trace" && !selectedResult}
                className={`rounded-t-sm border-b-2 px-3 py-1.5 text-sm transition-colors disabled:opacity-30 ${
                  view === t.id
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {view === "roster" && <Roster results={results} onSelect={selectStudent} />}

        {view === "trace" &&
          (selectedResult ? (
            <div>
              <button
                onClick={() => window.print()}
                className="no-print mb-4 rounded-sm border border-paper-line px-2 py-1 text-xs text-ink-soft hover:bg-surface-sunken"
              >
                Print this marksheet
              </button>
              <Trace result={selectedResult} />
            </div>
          ) : (
            <p className="text-sm text-ink-soft">Select a student from the roster first.</p>
          ))}

        {view === "lists" && <CheckingLists results={results} onSelect={selectStudent} />}

        {view === "summary" && <ClassSummary examCase={examCase} results={results} />}

        {view === "upload" && (
          <UploadPanel
            onLoadCase={(c) => {
              setExamCase(c);
              setSelectedId(null);
              setView("roster");
            }}
          />
        )}
      </main>

      <footer className="no-print mx-auto max-w-5xl px-6 pb-10 pt-4 text-[11px] text-ink-soft">
        Case {examCase.case_id} · {examCase.students.length} students loaded ·{" "}
        {examCase.compulsory.length} compulsory subjects each, plus one optional subject.
      </footer>
    </div>
  );
}
