/**
 * Shared type definitions for the P08 School Result Processing & GPA Engine.
 *
 * These types intentionally mirror the shape of the organiser-supplied
 * fixture file (P08_school_results_public.json) so that a fixture case can
 * be loaded and evaluated with no transformation step in between.
 */

/** A subject as declared for a given case (class/board). */
export interface SubjectDef {
  /** Short subject code, e.g. "PHY". Used as the key into a student's marks. */
  code: string;
  /** Human-readable name, e.g. "Physics". */
  name: string;
  /** Whether this subject is split into a theory + practical component. */
  practical: boolean;
}

/**
 * A subject's raw mark exactly as it appears in the source data.
 *
 * - `number`   -> a subject with no practical component, out of 100.
 * - `"AB"`     -> the student was absent for this subject entirely.
 * - `{theory, practical}` -> a subject with a practical component.
 *
 * IMPORTANT: absence and a genuine zero are different values on purpose.
 * A subject that was actually sat and scored 0 is `0`; a subject that was
 * never sat is the literal string `"AB"`. Collapsing these to the same
 * representation would make it impossible to tell them apart downstream,
 * which the constraints for this problem explicitly forbid.
 */
export type RawMark = number | "AB" | { theory: number; practical: number };

/** A single student record as declared in the fixture data. */
export interface StudentRecord {
  id: string;
  name: string;
  class: string;
  /** Subject code of this student's optional (4th) subject, e.g. "AGR". */
  optional: string;
  /** Marks keyed by subject code. Contains the 6 compulsory subjects plus
   *  the one subject named in `optional` — 7 entries in total. */
  marks: Record<string, RawMark>;
}

/** One exam "case": a shared subject list + compulsory list + a roster. */
export interface ExamCase {
  case_id: string;
  subjects: SubjectDef[];
  /** Subject codes that are compulsory for every student in this case. */
  compulsory: string[];
  students: StudentRecord[];
}

/** Top-level shape of the fixture file the organisers publish. */
export interface FixtureFile {
  schema_version: string;
  problem_id: string;
  format_note?: string;
  cases: ExamCase[];
}

// ---------------------------------------------------------------------------
// Engine output types — what evaluateStudent() produces.
// ---------------------------------------------------------------------------

/** Rule identifiers exactly as numbered in the published clarifications. */
export type RuleId =
  | "R-10" // grade-point band / letter-grade band
  | "R-11" // theory/practical pass-mark check
  | "R-12" // absence handling (compulsory vs optional)
  | "R-13" // GPA formula + compulsory-failure override
  | "R-29"; // checking-list membership

/** The fully-worked result for one subject, with the real numbers used. */
export interface SubjectTrace {
  code: string;
  name: string;
  isOptional: boolean;
  hasPractical: boolean;
  /** How the mark is displayed: "AB", a single number, or "T+P" pieces. */
  markDisplay: string;
  /** Raw pieces, so the UI can show theory/practical separately when present. */
  theory?: number;
  practicalMark?: number;
  total?: number;
  /** The subject's own grade point (0 if failed or absent). */
  gradePoint: number;
  /** True if this subject on its own is a fail (mark fail, or AB). */
  failed: boolean;
  isAbsent: boolean;
  /** The rule that decided this subject's grade point. */
  ruleId: RuleId;
  /** Human-readable explanation, always using this student's real numbers. */
  explanation: string;
}

/** The fully-worked result for one student. */
export interface StudentResult {
  student: StudentRecord;
  subjects: SubjectTrace[];
  /** Sum of the 6 compulsory grade points (before any optional contribution
   *  and before any compulsory-failure override — always shown in the trace
   *  per the "uncancelled average stays visible" requirement). */
  compulsorySum: number;
  /** The optional subject's own grade point (0 if it failed or was absent). */
  optionalGradePoint: number;
  /** max(0, optionalGradePoint - 2) — the amount the optional subject adds. */
  optionalContribution: number;
  /** (compulsorySum + optionalContribution) / 6, capped at 5, 2dp — the
   *  "uncancelled" GPA as if no compulsory subject had failed. Always shown
   *  in the trace even when the final GPA below is overridden to 0.00. */
  uncancelledGpa: number;
  /** True if any compulsory subject failed (raw fail OR absent). */
  hasCompulsoryFailure: boolean;
  /** The subject code(s) responsible for a compulsory failure, if any. */
  failingCompulsorySubjects: string[];
  /** Final GPA after applying the compulsory-failure override (R-13). */
  gpa: number;
  /** Final letter grade, derived from `gpa` (R-10). */
  letter: string;
  /** True if the optional subject changed nothing (grade point <= 2.0),
   *  i.e. this student belongs on the "optional" checking list (R-29). */
  onOptionalList: boolean;
  /** True if any subject (compulsory or optional) had a practical mark
   *  below the pass mark of 8 — checking list membership (R-29). */
  onPracticalFailList: boolean;
  /** True if any subject shows AB — checking list membership (R-29). */
  onAbsentList: boolean;
}
