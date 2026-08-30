/**
 * Upload panel — bonus feature: "Let the user paste or upload a marks
 * sheet and report which rows were rejected and exactly why."
 *
 * Accepts a JSON file in the same shape as the published fixture (a
 * FixtureFile with a `cases` array, or a single ExamCase). Runs every
 * row through validate.ts and reports rejections with the actual bad
 * value quoted, before handing the file off to be loaded as the active
 * case.
 */
import { useState } from "react";
import { parseUploadedJson } from "../data/loader";
import { validateCase } from "../engine/validate";
import type { ExamCase } from "../engine/types";

export function UploadPanel({ onLoadCase }: { onLoadCase: (examCase: ExamCase) => void }) {
  const [text, setText] = useState("");
  const [report, setReport] = useState<ReturnType<typeof validateCase> | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pendingCase, setPendingCase] = useState<ExamCase | null>(null);

  function runValidation(rawText: string) {
    const { cases, error } = parseUploadedJson(rawText);
    if (error || cases.length === 0) {
      setParseError(error ?? "No case found in the file.");
      setReport(null);
      setPendingCase(null);
      return;
    }
    setParseError(null);
    const examCase = cases[0];
    setPendingCase(examCase);
    setReport(validateCase(examCase));
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setText(content);
      runValidation(content);
    };
    reader.readAsText(file);
  }

  return (
    <div className="rounded-sm border border-paper-line bg-surface p-4">
      <h3 className="font-display text-lg mb-1">Upload a marks sheet</h3>
      <p className="mb-3 text-xs text-ink-soft">
        Accepts a JSON file shaped like the published fixture — either a single case object with a
        "students" array, or a full file with a top-level "cases" array. Rows that don't fit the
        expected shape are listed below with the reason, rather than silently skipped.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm"
        />
        <span className="text-xs text-ink-soft">or paste JSON below</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{"case_id": "...", "subjects": [...], "compulsory": [...], "students": [...]}'
        rows={6}
        className="mt-3 w-full rounded-sm border border-paper-line bg-surface-sunken p-2 font-mono-num text-xs focus:outline-none focus:ring-2 focus:ring-ink/20"
      />

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => runValidation(text)}
          disabled={!text.trim()}
          className="rounded-sm border border-ink bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-40"
        >
          Validate
        </button>
        {pendingCase && report && (
          <button
            onClick={() => onLoadCase(pendingCase)}
            className="rounded-sm border border-pass px-3 py-1.5 text-xs font-medium text-pass"
          >
            Load as active case ({report.acceptedCount} clean rows)
          </button>
        )}
      </div>

      {parseError && <p className="mt-3 text-sm text-flag">{parseError}</p>}

      {report && (
        <div className="mt-4">
          <p className="text-sm">
            <span className="font-mono-num font-semibold">{report.acceptedCount}</span> of{" "}
            <span className="font-mono-num">{report.totalRows}</span> rows accepted.
          </p>
          {report.rejections.length > 0 && (
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs">
              {report.rejections.map((rej, i) => (
                <li key={i} className="rounded-sm bg-flag-soft px-2 py-1 text-flag">
                  <span className="font-mono-num">{rej.studentId}</span> ({rej.studentName}):{" "}
                  {rej.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
