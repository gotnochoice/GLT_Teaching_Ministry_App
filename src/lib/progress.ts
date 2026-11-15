import { eq } from "drizzle-orm";
import { db } from "./db";
import { assessments, courses, requirementLogs, results, settings } from "./schema";
import { TOTAL_CLASSES } from "./utils";

export type Rules = {
  passMark: number;
  prayersRequired: number;
  evangelismRequired: number;
  weightClasswork: number;
  weightExam: number;
  weightInternship: number;
};

const DEFAULTS: Record<string, string> = {
  pass_mark: "50",
  prayers_required: "2",
  evangelism_required: "2",
  weight_classwork: "50",
  weight_exam: "30",
  weight_internship: "20",
};

export async function getRules(): Promise<Rules> {
  const rows = await db.select().from(settings);
  const m = { ...DEFAULTS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
  return {
    passMark: Number(m.pass_mark),
    prayersRequired: Number(m.prayers_required),
    evangelismRequired: Number(m.evangelism_required),
    weightClasswork: Number(m.weight_classwork),
    weightExam: Number(m.weight_exam),
    weightInternship: Number(m.weight_internship),
  };
}

type Item = {
  assessmentId: string;
  kind: string;
  title: string;
  maxScore: number;
  dueDate: string | null;
  instructions: string | null;
  resultId: string | null;
  status: "not_started" | "submitted" | "graded";
  score: number | null;
  pct: number | null;
  feedback: string | null;
  submissionText: string | null;
  passed: boolean;
};

export type ClassProgress = {
  courseId: string;
  number: number;
  title: string;
  description: string | null;
  test: Item | null;
  assignment: Item | null;
  complete: boolean; // test + assignment graded and both >= pass mark
  unlocked: boolean; // student has reached this class
};

export type StudentProgress = {
  rules: Rules;
  classes: ClassProgress[];
  classesCompleted: number;
  exam: Item | null;
  internship: Item | null;
  prayers: { verified: number; pending: number; required: number };
  evangelism: { verified: number; pending: number; required: number };
  overall: number | null; // weighted %, null until something is graded
  eligibleToGraduate: boolean;
  missing: string[];
};

export async function getStudentProgress(studentId: string, currentClass: number): Promise<StudentProgress> {
  const rules = await getRules();
  const [allCourses, allAssessments, myResults, logs] = await Promise.all([
    db.select().from(courses).orderBy(courses.number),
    db.select().from(assessments),
    db.select().from(results).where(eq(results.studentId, studentId)),
    db.select().from(requirementLogs).where(eq(requirementLogs.studentId, studentId)),
  ]);
  const resultByAssessment = new Map(myResults.map((r) => [r.assessmentId, r]));

  const toItem = (a: (typeof allAssessments)[number] | undefined): Item | null => {
    if (!a) return null;
    const r = resultByAssessment.get(a.id);
    const graded = r?.status === "graded" && r.score !== null;
    const pct = graded ? Math.round((r!.score! / a.maxScore) * 100) : null;
    return {
      assessmentId: a.id,
      kind: a.kind,
      title: a.title,
      maxScore: a.maxScore,
      dueDate: a.dueDate,
      instructions: a.instructions,
      resultId: r?.id ?? null,
      status: !r ? "not_started" : graded ? "graded" : "submitted",
      score: r?.score ?? null,
      pct,
      feedback: r?.feedback ?? null,
      submissionText: r?.submissionText ?? null,
      passed: pct !== null && pct >= rules.passMark,
    };
  };

  const classes: ClassProgress[] = allCourses.map((c) => {
    const test = toItem(allAssessments.find((a) => a.courseId === c.id && a.kind === "TEST"));
    const assignment = toItem(allAssessments.find((a) => a.courseId === c.id && a.kind === "ASSIGNMENT"));
    return {
      courseId: c.id,
      number: c.number,
      title: c.title,
      description: c.description,
      test,
      assignment,
      complete: !!test?.passed && !!assignment?.passed,
      unlocked: c.number <= currentClass,
    };
  });

  const exam = toItem(allAssessments.find((a) => a.kind === "EXAM"));
  const internship = toItem(allAssessments.find((a) => a.kind === "INTERNSHIP"));

  const count = (kind: string, status: string) =>
    logs.filter((l) => l.kind === kind && l.status === status).length;
  const prayers = { verified: count("PRAYER", "verified"), pending: count("PRAYER", "pending"), required: rules.prayersRequired };
  const evangelism = { verified: count("EVANGELISM", "verified"), pending: count("EVANGELISM", "pending"), required: rules.evangelismRequired };

  // Weighted overall: each component only counts once it has a grade.
  const classworkPcts = classes.flatMap((c) => [c.test?.pct, c.assignment?.pct]).filter((p): p is number => p != null);
  const parts: { w: number; v: number }[] = [];
  if (classworkPcts.length) parts.push({ w: rules.weightClasswork, v: classworkPcts.reduce((a, b) => a + b, 0) / classworkPcts.length });
  if (exam?.pct != null) parts.push({ w: rules.weightExam, v: exam.pct });
  if (internship?.pct != null) parts.push({ w: rules.weightInternship, v: internship.pct });
  const totalW = parts.reduce((a, p) => a + p.w, 0);
  const overall = totalW ? Math.round(parts.reduce((a, p) => a + p.w * p.v, 0) / totalW) : null;

  const classesCompleted = classes.filter((c) => c.complete).length;
  const missing: string[] = [];
  if (classesCompleted < TOTAL_CLASSES) missing.push(`${TOTAL_CLASSES - classesCompleted} class(es) not yet passed`);
  if (!exam?.passed) missing.push("Final exam not passed");
  if (!internship?.passed) missing.push("Internship not passed");
  if (prayers.verified < prayers.required) missing.push(`Prayers: ${prayers.verified}/${prayers.required} verified`);
  if (evangelism.verified < evangelism.required) missing.push(`Evangelism: ${evangelism.verified}/${evangelism.required} verified`);

  return { rules, classes, classesCompleted, exam, internship, prayers, evangelism, overall, eligibleToGraduate: missing.length === 0, missing };
}

/** After grading: advance a student to the next class once their current class is passed. */
export async function maybeAdvance(studentId: string, currentClass: number): Promise<number> {
  const p = await getStudentProgress(studentId, currentClass);
  const cur = p.classes.find((c) => c.number === currentClass);
  if (cur?.complete && currentClass < TOTAL_CLASSES) return currentClass + 1;
  return currentClass;
}

