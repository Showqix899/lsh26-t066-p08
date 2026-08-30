import { describe, expect, it } from "vitest";
import { evaluateStudent, gradePointForTotal, letterForGpa, formatGpa } from "./rules";
import type { ExamCase, StudentRecord } from "./types";

/** Minimal case shape shared by the boundary tests below. */
const CASE: ExamCase = {
  case_id: "TEST-CASE",
  subjects: [
    { code: "BAN", name: "Bangla", practical: false },
    { code: "ENG", name: "English", practical: false },
    { code: "MAT", name: "Mathematics", practical: false },
    { code: "PHY", name: "Physics", practical: true },
    { code: "CHE", name: "Chemistry", practical: true },
    { code: "BIO", name: "Biology", practical: true },
    { code: "HMT", name: "Higher Mathematics", practical: true },
    { code: "AGR", name: "Agriculture", practical: true },
    { code: "REL", name: "Religion", practical: false },
  ],
  compulsory: ["BAN", "ENG", "MAT", "PHY", "CHE", "BIO"],
  students: [],
};

describe("gradePointForTotal — R-10 grade bands", () => {
  it("maps the top of the 80-100 band to 5.0", () => {
    expect(gradePointForTotal(100)).toBe(5.0);
    expect(gradePointForTotal(80)).toBe(5.0);
  });
  it("treats 79/80 as the boundary between 4.0 and 5.0", () => {
    expect(gradePointForTotal(79)).toBe(4.0);
    expect(gradePointForTotal(80)).toBe(5.0);
  });
  it("treats 32/33 as the pass/fail boundary", () => {
    expect(gradePointForTotal(32)).toBe(0);
    expect(gradePointForTotal(33)).toBe(1.0);
  });
  it("covers every band", () => {
    expect(gradePointForTotal(69)).toBe(3.5);
    expect(gradePointForTotal(59)).toBe(3.0);
    expect(gradePointForTotal(49)).toBe(2.0);
    expect(gradePointForTotal(39)).toBe(1.0);
    expect(gradePointForTotal(0)).toBe(0);
  });
});

describe("letterForGpa — R-10 letter bands", () => {
  it("gives A+ only at exactly 5.00", () => {
    expect(letterForGpa(5.0, false)).toBe("A+");
    expect(letterForGpa(4.99, false)).toBe("A");
  });
  it("covers the remaining bands", () => {
    expect(letterForGpa(4.0, false)).toBe("A");
    expect(letterForGpa(3.99, false)).toBe("A-");
    expect(letterForGpa(3.5, false)).toBe("A-");
    expect(letterForGpa(3.49, false)).toBe("B");
    expect(letterForGpa(3.0, false)).toBe("B");
    expect(letterForGpa(2.99, false)).toBe("C");
    expect(letterForGpa(2.0, false)).toBe("C");
    expect(letterForGpa(1.99, false)).toBe("D");
    expect(letterForGpa(1.0, false)).toBe("D");
  });
  it("forces F whenever there is a compulsory failure, regardless of the numeric gpa passed in", () => {
    expect(letterForGpa(4.5, true)).toBe("F");
  });
});

describe("evaluateStudent — practical pass-mark boundary (R-11)", () => {
  it("fails the subject when practical is one mark below the pass mark, even if theory passes comfortably", () => {
    const student: StudentRecord = {
      id: "T1",
      name: "Boundary Case",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 60,
        ENG: 60,
        MAT: 60,
        PHY: { theory: 60, practical: 20 },
        CHE: { theory: 60, practical: 20 },
        BIO: { theory: 50, practical: 7 }, // theory clearly passes; practical is 7 < 8
        HMT: { theory: 40, practical: 10 },
      },
    };
    const result = evaluateStudent(CASE, student);
    const bio = result.subjects.find((s) => s.code === "BIO")!;
    expect(bio.failed).toBe(true);
    expect(bio.gradePoint).toBe(0);
    expect(bio.ruleId).toBe("R-11");
    expect(result.hasCompulsoryFailure).toBe(true);
    expect(result.gpa).toBe(0);
    expect(result.letter).toBe("F");
  });

  it("passes the subject when practical is exactly at the pass mark of 8", () => {
    const student: StudentRecord = {
      id: "T2",
      name: "Exact Pass",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 60,
        ENG: 60,
        MAT: 60,
        PHY: { theory: 60, practical: 20 },
        CHE: { theory: 60, practical: 20 },
        BIO: { theory: 30, practical: 8 }, // practical exactly at pass mark
        HMT: { theory: 40, practical: 10 },
      },
    };
    const result = evaluateStudent(CASE, student);
    const bio = result.subjects.find((s) => s.code === "BIO")!;
    expect(bio.failed).toBe(false);
    expect(bio.gradePoint).toBeGreaterThan(0);
  });
});

describe("evaluateStudent — absence handling (R-12)", () => {
  it("forces overall F when AB falls on a compulsory subject, but keeps the uncancelled average visible", () => {
    const student: StudentRecord = {
      id: "T3",
      name: "Absent Compulsory",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 80,
        ENG: 80,
        MAT: 80,
        PHY: { theory: 60, practical: 20 },
        CHE: { theory: 60, practical: 20 },
        BIO: "AB",
        HMT: { theory: 60, practical: 20 },
      },
    };
    const result = evaluateStudent(CASE, student);
    expect(result.hasCompulsoryFailure).toBe(true);
    expect(result.failingCompulsorySubjects).toContain("BIO");
    expect(result.gpa).toBe(0);
    expect(result.letter).toBe("F");
    expect(result.onAbsentList).toBe(true);
    // the uncancelled figure must still be computed and exposed, per R-13
    expect(result.uncancelledGpa).toBeGreaterThan(0);
  });

  it("does not force an overall fail when AB falls on the optional subject, but does add 0 and flags the checking lists", () => {
    const student: StudentRecord = {
      id: "T4",
      name: "Absent Optional",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 80,
        ENG: 80,
        MAT: 80,
        PHY: { theory: 60, practical: 20 },
        CHE: { theory: 60, practical: 20 },
        BIO: { theory: 60, practical: 20 },
        HMT: "AB",
      },
    };
    const result = evaluateStudent(CASE, student);
    expect(result.hasCompulsoryFailure).toBe(false);
    expect(result.optionalGradePoint).toBe(0);
    expect(result.optionalContribution).toBe(0);
    expect(result.onAbsentList).toBe(true);
    expect(result.onOptionalList).toBe(true); // 0 <= 2.0
    expect(result.gpa).toBeGreaterThan(0);
    expect(result.letter).not.toBe("F");
  });
});

describe("evaluateStudent — GPA formula and cap (R-13)", () => {
  it("adds only the amount of the optional grade point above 2.0, never subtracting", () => {
    const weakOptional: StudentRecord = {
      id: "T5",
      name: "Weak Optional",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 80,
        ENG: 80,
        MAT: 80,
        PHY: { theory: 60, practical: 20 },
        CHE: { theory: 60, practical: 20 },
        BIO: { theory: 60, practical: 20 },
        HMT: { theory: 30, practical: 9 }, // total 39 -> grade point 1.0, below 2.0
      },
    };
    const result = evaluateStudent(CASE, weakOptional);
    expect(result.optionalGradePoint).toBe(1.0);
    expect(result.optionalContribution).toBe(0); // max(0, 1.0 - 2) = 0, not negative
    expect(result.gpa).toBe(5.0); // six 5.0 compulsory subjects, optional adds nothing but doesn't subtract
    expect(result.onOptionalList).toBe(true); // 1.0 <= 2.0
  });

  it("caps the final GPA at 5.00 even when the optional contribution would push it higher", () => {
    const topStudent: StudentRecord = {
      id: "T6",
      name: "Top Student",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 100,
        ENG: 100,
        MAT: 100,
        PHY: { theory: 75, practical: 25 },
        CHE: { theory: 75, practical: 25 },
        BIO: { theory: 75, practical: 25 },
        HMT: { theory: 75, practical: 25 }, // grade point 5.0, contribution 3.0
      },
    };
    const result = evaluateStudent(CASE, topStudent);
    // raw = (30 + 3.0) / 6 = 5.5, capped to 5.0
    expect(result.gpa).toBe(5.0);
    expect(result.letter).toBe("A+");
  });

  it("matches Kamal Begum (S001) from the published PUB-01 fixture by hand", () => {
    const student: StudentRecord = {
      id: "S001",
      name: "Kamal Begum",
      class: "Class 9",
      optional: "AGR",
      marks: {
        BAN: 75,
        ENG: 69,
        MAT: 84,
        PHY: { theory: 52, practical: 19 },
        CHE: { theory: 54, practical: 19 },
        BIO: { theory: 64, practical: 19 },
        AGR: { theory: 56, practical: 18 },
      },
    };
    const result = evaluateStudent(CASE, student);
    expect(result.compulsorySum).toBeCloseTo(25.5);
    expect(result.optionalGradePoint).toBe(4.0);
    expect(result.gpa).toBeCloseTo(4.58);
    expect(result.letter).toBe("A");
    expect(formatGpa(result.gpa)).toBe("4.58");
  });

  it("matches Lamia Islam (S002) from PUB-01: two compulsory fails cancel a partly-decent record", () => {
    const student: StudentRecord = {
      id: "S002",
      name: "Lamia Islam",
      class: "Class 9",
      optional: "AGR",
      marks: {
        BAN: 50,
        ENG: 48,
        MAT: 39,
        PHY: { theory: 21, practical: 6 }, // fails both parts
        CHE: { theory: 30, practical: 14 },
        BIO: { theory: 24, practical: 14 }, // theory fails
        AGR: { theory: 27, practical: 9 },
      },
    };
    const result = evaluateStudent(CASE, student);
    expect(result.failingCompulsorySubjects.sort()).toEqual(["BIO", "PHY"]);
    expect(result.hasCompulsoryFailure).toBe(true);
    expect(result.gpa).toBe(0);
    expect(result.letter).toBe("F");
    expect(result.uncancelledGpa).toBeCloseTo(1.33);
  });

  it("matches Hasib Das (S010) from PUB-01: a practical-only failure on a subject with a passing theory mark", () => {
    const student: StudentRecord = {
      id: "S010",
      name: "Hasib Das",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 37,
        ENG: 43,
        MAT: 50,
        PHY: { theory: 23, practical: 9 }, // theory fails
        CHE: { theory: 27, practical: 7 }, // theory PASSES, practical fails
        BIO: { theory: 30, practical: 8 }, // exact boundary pass
        HMT: { theory: 28, practical: 5 },
      },
    };
    const result = evaluateStudent(CASE, student);
    const che = result.subjects.find((s) => s.code === "CHE")!;
    expect(che.failed).toBe(true);
    expect(che.theory).toBeGreaterThanOrEqual(25); // theory itself was a pass
    expect(che.ruleId).toBe("R-11");
    expect(result.gpa).toBe(0);
    expect(result.letter).toBe("F");
    expect(result.onPracticalFailList).toBe(true);
  });

  it("matches Hasib Khatun (S032) from PUB-01: AB on a compulsory subject overrides a decent record", () => {
    const student: StudentRecord = {
      id: "S032",
      name: "Hasib Khatun",
      class: "Class 9",
      optional: "HMT",
      marks: {
        BAN: 76,
        ENG: 58,
        MAT: 49,
        PHY: { theory: 40, practical: 17 },
        CHE: { theory: 45, practical: 19 },
        BIO: "AB",
        HMT: { theory: 46, practical: 16 },
      },
    };
    const result = evaluateStudent(CASE, student);
    expect(result.onAbsentList).toBe(true);
    expect(result.onOptionalList).toBe(false); // optional grade point 3.5 > 2.0
    expect(result.onPracticalFailList).toBe(false);
    expect(result.gpa).toBe(0);
    expect(result.letter).toBe("F");
    expect(result.uncancelledGpa).toBeCloseTo(2.83);
  });
});
