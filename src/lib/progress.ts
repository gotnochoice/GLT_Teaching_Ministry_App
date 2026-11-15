import { eq } from "drizzle-orm";
import { db } from "./db";
import { and, inArray } from "drizzle-orm";
import { assessments, attendance, classSessions, courses, internshipLogs, internships, requirementLogs, results, settings, students } from "./schema";
import { TOTAL_CLASSES, todayISO } from "./utils";

export type Rules = {
  passMark: number;
  prayersRequired: number;
  evangelismRequired: number;
  weightClasswork: number;
  weightExam: number;
  weightInternship: number;
  minAttendancePct: number; // 0 disables the attendance requirement
  internshipHoursRequired: number; // 0 disables the hours requirement
};

const DEFAULTS: Record<string, string> = {
  pass_mark: "50",
  prayers_required: "2",
  evangelism_required: "2",
  weight_classwork: "50",
  weight_exam: "30",
  weight_internship: "20",
  min_attendance_pct: "80",
  internship_hours_required: "20",
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
    minAttendancePct: Number(m.min_attendance_pct),
    internshipHoursRequired: Number(m.internship_hours_required),
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
  attendance: { attended: number; total: number; pct: number | null; required: number };
  internshipWork: {
    placement: typeof internships.$inferSelect | null;
    hoursVerified: number;
    hoursPending: number;
    hoursRequired: number;
  };
  overall: number | null; // weighted %, null until something is graded
  eligibleToGraduate: boolean;
  missing: string[];
};

export async function getStudentProgress(studentId: string, currentClass: number): Promise<StudentProgress> {
  const rules = await getRules();
  const [studentRow] = await db.select().from(students).where(eq(students.id, studentId));
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

  // Attendance: only sessions (up to today) where the teacher recorded attendance count.
  // present + approved make-up = attended; excused sessions are removed from the total.
  const att = { attended: 0, total: 0, pct: null as number | null, required: rules.minAttendancePct };
  if (studentRow?.cohortId) {
    const sessions = await db.select().from(classSessions).where(eq(classSessions.cohortId, studentRow.cohortId));
    // Only sessions from the day the student enrolled count: someone joining in week 5 is not marked absent for weeks 1-4.
    const past = sessions.filter((x) => x.date <= todayISO() && (!studentRow.enrolledAt || x.date >= studentRow.enrolledAt));
    const rows = past.length ? await db.select().from(attendance).where(inArray(attendance.sessionId, past.map((x) => x.id))) : [];
    const recorded = new Set(rows.map((r) => r.sessionId));
    const mine = new Map(rows.filter((r) => r.studentId === studentId).map((r) => [r.sessionId, r.status]));
    for (const sess of past) {
      if (!recorded.has(sess.id)) continue;
      const st = mine.get(sess.id);
      if (st === "excused") continue;
      att.total++;
      if (st === "present" || st === "makeup") att.attended++;
    }
    att.pct = att.total ? Math.round((att.attended / att.total) * 100) : null;
  }

  const [placement] = await db.select().from(internships).where(eq(internships.studentId, studentId));
  const hourLogs = await db.select().from(internshipLogs).where(and(eq(internshipLogs.studentId, studentId)));
  const sum = (st: string) => hourLogs.filter((h) => h.status === st).reduce((a, h) => a + h.hours, 0);
  const internshipWork = { placement: placement ?? null, hoursVerified: sum("verified"), hoursPending: sum("pending"), hoursRequired: rules.internshipHoursRequired };

  const classesCompleted = classes.filter((c) => c.complete).length;
  const missing: string[] = [];
  if (classesCompleted < TOTAL_CLASSES) missing.push(`${TOTAL_CLASSES - classesCompleted} class(es) not yet passed`);
  if (!exam?.passed) missing.push("Final exam not passed");
  if (!internship?.passed) missing.push("Internship not passed");
  if (rules.minAttendancePct > 0 && (att.pct === null || att.pct < rules.minAttendancePct))
    missing.push(att.pct === null ? "Attendance: no recorded sessions yet" : `Attendance ${att.pct}% (need ${rules.minAttendancePct}%)`);
  if (rules.internshipHoursRequired > 0 && internshipWork.hoursVerified < rules.internshipHoursRequired)
    missing.push(`Internship hours: ${internshipWork.hoursVerified}/${rules.internshipHoursRequired} verified`);
  if (!placement?.signedOff) missing.push("Internship supervisor sign-off");
  if (prayers.verified < prayers.required) missing.push(`Prayers: ${prayers.verified}/${prayers.required} verified`);
  if (evangelism.verified < evangelism.required) missing.push(`Evangelism: ${evangelism.verified}/${evangelism.required} verified`);

  return { rules, classes, classesCompleted, exam, internship, prayers, evangelism, attendance: att, internshipWork, overall, eligibleToGraduate: missing.length === 0, missing };
}

/** After grading: advance a student to the next class once their current class is passed. */
export async function maybeAdvance(studentId: string, currentClass: number): Promise<number> {
  const p = await getStudentProgress(studentId, currentClass);
  const cur = p.classes.find((c) => c.number === currentClass);
  if (cur?.complete && currentClass < TOTAL_CLASSES) return currentClass + 1;
  return currentClass;
}

