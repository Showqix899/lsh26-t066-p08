/**
 * ---------------------------------------------------------------------------
 * P08 — School Result Processing & GPA Engine
 * ---------------------------------------------------------------------------
 * This module is the single source of truth for every grading decision. It
 * is deliberately framework-free (no React, no DOM) so it can be unit
 * tested in isolation and so the same logic could power a CLI, an API
 * route, or the UI without change.
 *
 * Every function below is annotated with the rule ID it implements, taken
 * verbatim from the published clarifications:
 *
 *   R-10  Grade-point bands (per subject) and letter-grade bands (final GPA)
 *   R-11  Theory/practical pass marks; failing either fails the subject
 *   R-12  Absence handling — compulsory vs. optional subjects differ
 *   R-13  GPA formula, rounding/cap, and the compulsory-failure override
 *   R-29  Checking-list membership definitions
 *
 * Design decision: the engine never *decides* what to do with a bad input
 * (e.g. a mark of 140, or a negative number) beyond flagging it — see
 * `validateStudentMarks` in ./validate.ts, which runs first and produces a
 * list of human-readable rejection reasons. Anything that reaches
 * `evaluateStudent` here is assumed to already be well-formed.
 * ---------------------------------------------------------------------------
 */

import type {
  ExamCase,
  RawMark,
  StudentRecord,
  StudentResult,
  SubjectTrace,
} from "./types";

/** Theory is out of 75, pass mark 25. Practical is out of 25, pass mark 8. (R-11) */
export const THEORY_MAX = 75;
export const THEORY_PASS = 25;
export const PRACTICAL_MAX = 25;
export const PRACTICAL_PASS = 8;
/** Every subject (practical or not) is graded out of this total. (R-10) */
export const SUBJECT_MAX = 100;

/**
 * Grade-point bands for a subject's total mark. (R-10)
 * Bands are checked from the top down; the first matching band wins.
 * Anything below 33 is a fail and worth 0 grade points.
 */
const GRADE_BANDS: { min: number; point: number }[] = [
  { min: 80, point: 5.0 },
  { min: 70, point: 4.0 },
  { min: 60, point: 3.5 },
  { min: 50, point: 3.0 },
  { min: 40, point: 2.0 },
  { min: 33, point: 1.0 },
  { min: 0, point: 0.0 },
];

/** Look up the grade point for a raw total mark out of 100. (R-10) */
export function gradePointForTotal(total: number): number {
  const band = GRADE_BANDS.find((b) => total >= b.min);
  return band ? band.point : 0;
}

/**
 * Letter-grade bands, applied to the *final* GPA (after any compulsory
 * failure override). (R-10)
 */
export function letterForGpa(gpa: number, hasCompulsoryFailure: boolean): string {
  if (hasCompulsoryFailure) return "F";
  if (gpa >= 5.0) return "A+"; // exactly 5.00
  if (gpa >= 4.0) return "A";
  if (gpa >= 3.5) return "A-";
  if (gpa >= 3.0) return "B";
  if (gpa >= 2.0) return "C";
  if (gpa >= 1.0) return "D";
  return "F";
}

/** Round to 2 decimal places the way a printed mark-sheet would. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Evaluate a single subject for a single student, producing a fully-worked
 * trace entry: the mark used, the grade point it produced, and the rule
 * that decided it — always phrased with this student's real numbers.
 */
export function evaluateSubject(
  code: string,
  name: string,
  hasPracticalPart: boolean,
  isOptional: boolean,
  rawMark: RawMark
): SubjectTrace {
  // --- Absence (R-12) -------------------------------------------------
  if (rawMark === "AB") {
    return {
      code,
      name,
      isOptional,
      hasPractical: hasPracticalPart,
      markDisplay: "AB",
      gradePoint: 0,
      failed: true,
      isAbsent: true,
      ruleId: "R-12",
      explanation: isOptional
        ? `Absent in optional subject ${name}. Contributes 0 to the optional grade point; student is added to the absent checking list.`
        : `Absent in compulsory subject ${name}. Grade point recorded as 0 and the overall result is F, regardless of other subjects.`,
    };
  }

  // --- Subject with a practical part (R-11) ---------------------------
  if (typeof rawMark === "object") {
    const { theory, practical } = rawMark;
    const total = theory + practical;
    const theoryPassed = theory >= THEORY_PASS;
    const practicalPassed = practical >= PRACTICAL_PASS;

    if (!theoryPassed || !practicalPassed) {
      const reasons: string[] = [];
      if (!theoryPassed) {
        reasons.push(`theory ${theory}/${THEORY_MAX} is below the pass mark of ${THEORY_PASS}`);
      }
      if (!practicalPassed) {
        reasons.push(`practical ${practical}/${PRACTICAL_MAX} is below the pass mark of ${PRACTICAL_PASS}`);
      }
      return {
        code,
        name,
        isOptional,
        hasPractical: true,
        markDisplay: `T:${theory} P:${practical}`,
        theory,
        practicalMark: practical,
        total,
        gradePoint: 0,
        failed: true,
        isAbsent: false,
        ruleId: "R-11",
        explanation: `${name}: ${reasons.join(" and ")}. Failing either part fails the subject, so the grade point is 0 even though the combined total (${total}/${SUBJECT_MAX}) would otherwise fall in a passing band.`,
      };
    }

    const gradePoint = gradePointForTotal(total);
    return {
      code,
      name,
      isOptional,
      hasPractical: true,
      markDisplay: `T:${theory} P:${practical}`,
      theory,
      practicalMark: practical,
      total,
      gradePoint,
      failed: gradePoint === 0,
      isAbsent: false,
      ruleId: gradePoint === 0 ? "R-10" : "R-10",
      explanation: `${name}: theory ${theory}/${THEORY_MAX} and practical ${practical}/${PRACTICAL_MAX} both clear their pass marks. Combined total ${total}/${SUBJECT_MAX} falls in the ${describeBand(total)} band → grade point ${gradePoint.toFixed(1)}.`,
    };
  }

  // --- Whole-number subject out of 100 (R-10) --------------------------
  const total = rawMark;
  const gradePoint = gradePointForTotal(total);
  return {
    code,
    name,
    isOptional,
    hasPractical: false,
    markDisplay: `${total}`,
    total,
    gradePoint,
    failed: gradePoint === 0,
    isAbsent: false,
    ruleId: "R-10",
    explanation:
      gradePoint === 0
        ? `${name}: mark ${total}/${SUBJECT_MAX} is below 33, so the subject is a fail worth 0 grade points.`
        : `${name}: mark ${total}/${SUBJECT_MAX} falls in the ${describeBand(total)} band → grade point ${gradePoint.toFixed(1)}.`,
  };
}

/** Human-readable description of which grade band a total mark landed in. */
function describeBand(total: number): string {
  if (total >= 80) return "80-100";
  if (total >= 70) return "70-79";
  if (total >= 60) return "60-69";
  if (total >= 50) return "50-59";
  if (total >= 40) return "40-49";
  if (total >= 33) return "33-39";
  return "0-32";
}

/**
 * Evaluate every subject for a student and derive the final GPA, letter
 * grade, and checking-list membership. This is the main entry point used
 * by the UI.
 */
export function evaluateStudent(examCase: ExamCase, student: StudentRecord): StudentResult {
  const subjectDefsByCode = new Map(examCase.subjects.map((s) => [s.code, s]));
  const compulsorySet = new Set(examCase.compulsory);

  const subjects: SubjectTrace[] = [];

  // Compulsory subjects, in the order the case declares them, so the trace
  // reads the same way a printed mark-sheet would.
  for (const code of examCase.compulsory) {
    const def = subjectDefsByCode.get(code);
    if (!def) continue; // defensive: malformed fixture, skip rather than throw
    const raw = student.marks[code];
    subjects.push(evaluateSubject(code, def.name, def.practical, false, raw));
  }

  // The one optional subject named on the student record.
  const optDef = subjectDefsByCode.get(student.optional);
  const optRaw = student.marks[student.optional];
  const optionalTrace = optDef
    ? evaluateSubject(student.optional, optDef.name, optDef.practical, true, optRaw)
    : undefined;
  if (optionalTrace) subjects.push(optionalTrace);

  // --- GPA (R-13) -------------------------------------------------------
  const compulsoryTraces = subjects.filter((s) => compulsorySet.has(s.code));
  const compulsorySum = compulsoryTraces.reduce((sum, s) => sum + s.gradePoint, 0);
  const optionalGradePoint = optionalTrace ? optionalTrace.gradePoint : 0;
  const optionalContribution = Math.max(0, optionalGradePoint - 2);

  const uncancelledGpa = round2(Math.min(5, (compulsorySum + optionalContribution) / 6));

  const failingCompulsorySubjects = compulsoryTraces.filter((s) => s.failed).map((s) => s.code);
  const hasCompulsoryFailure = failingCompulsorySubjects.length > 0;

  const gpa = hasCompulsoryFailure ? 0.0 : uncancelledGpa;
  const letter = letterForGpa(gpa, hasCompulsoryFailure);

  // --- Checking lists (R-29) --------------------------------------------
  const onOptionalList = optionalGradePoint <= 2.0;
  const onPracticalFailList = subjects.some((s) => s.hasPractical && s.practicalMark !== undefined && s.practicalMark < PRACTICAL_PASS);
  const onAbsentList = subjects.some((s) => s.isAbsent);

  return {
    student,
    subjects,
    compulsorySum,
    optionalGradePoint,
    optionalContribution,
    uncancelledGpa,
    hasCompulsoryFailure,
    failingCompulsorySubjects,
    gpa,
    letter,
    onOptionalList,
    onPracticalFailList,
    onAbsentList,
  };
}

/** Evaluate every student in a case. */
export function evaluateCase(examCase: ExamCase): StudentResult[] {
  return examCase.students.map((student) => evaluateStudent(examCase, student));
}

/** Format a GPA to exactly 2 decimal places for display (R-13). */
export function formatGpa(gpa: number): string {
  return gpa.toFixed(2);
}
