/**
 * Validation for an uploaded marks file, ahead of grading.
 *
 * This is deliberately separate from rules.ts: the grading engine assumes
 * well-formed input, and this module's job is to catch and explain
 * malformed input *before* it ever reaches the engine — one reason per
 * rejected row, quoting the actual value that was wrong.
 */
import { PRACTICAL_MAX, THEORY_MAX } from "./rules";
import type { ExamCase, RawMark, StudentRecord } from "./types";

export interface RowRejection {
  studentId: string;
  studentName: string;
  reason: string;
}

export interface ValidationReport {
  totalRows: number;
  acceptedCount: number;
  rejections: RowRejection[];
}

/** True if a value is a well-formed RawMark for a subject that has no
 *  practical component: a finite number in [0, 100], or the string "AB". */
function isValidWholeMark(v: unknown): v is number | "AB" {
  if (v === "AB") return true;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
}

/** True if a value is a well-formed {theory, practical} pair. */
function isValidPracticalMark(v: unknown): v is { theory: number; practical: number } {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  const t = obj.theory;
  const p = obj.practical;
  return (
    typeof t === "number" &&
    Number.isFinite(t) &&
    t >= 0 &&
    t <= THEORY_MAX &&
    typeof p === "number" &&
    Number.isFinite(p) &&
    p >= 0 &&
    p <= PRACTICAL_MAX
  );
}

/**
 * Validate one student's record against the subject list declared for the
 * case. Returns a rejection reason string, or null if the row is clean.
 */
export function validateStudentRow(examCase: ExamCase, student: StudentRecord): string | null {
  if (!student.id || !student.name) {
    return "Missing student id or name.";
  }
  if (!student.optional) {
    return "No optional subject named for this student.";
  }

  const subjectDefsByCode = new Map(examCase.subjects.map((s) => [s.code, s]));
  const requiredCodes = [...examCase.compulsory, student.optional];

  if (!subjectDefsByCode.has(student.optional)) {
    return `Optional subject "${student.optional}" is not a subject declared for this case.`;
  }

  for (const code of requiredCodes) {
    const def = subjectDefsByCode.get(code);
    const raw: RawMark | undefined = student.marks?.[code];

    if (raw === undefined) {
      return `Missing mark for ${code}${def ? ` (${def.name})` : ""}.`;
    }
    if (!def) continue;

    if (def.practical) {
      if (raw === "AB") continue; // absence is always valid
      if (!isValidPracticalMark(raw)) {
        return `${code} (${def.name}) must be a theory/practical pair within 0-${THEORY_MAX} and 0-${PRACTICAL_MAX} — got ${JSON.stringify(raw)}.`;
      }
    } else {
      if (!isValidWholeMark(raw)) {
        return `${code} (${def.name}) must be a whole mark from 0-100 or "AB" — got ${JSON.stringify(raw)}.`;
      }
    }
  }

  // Extra marks for subjects the student isn't taking are silently ignored
  // rather than rejected — they simply play no part in the GPA calculation.

  return null;
}

/** Validate an entire case's roster, producing a per-row report. */
export function validateCase(examCase: ExamCase): ValidationReport {
  const rejections: RowRejection[] = [];
  for (const student of examCase.students) {
    const reason = validateStudentRow(examCase, student);
    if (reason) {
      rejections.push({ studentId: student.id ?? "(no id)", studentName: student.name ?? "(no name)", reason });
    }
  }
  return {
    totalRows: examCase.students.length,
    acceptedCount: examCase.students.length - rejections.length,
    rejections,
  };
}
