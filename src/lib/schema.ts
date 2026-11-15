import { pgTable, text, integer, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const now = () => text("created_at").default(sql`(now() AT TIME ZONE 'UTC')::text`);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  role: text("role").default("STUDENT").notNull(), // STUDENT | TEACHER | ADMIN
  createdAt: now(),
});

/** The 9 curriculum classes, in order. */
export const courses = pgTable("courses", {
  id: text("id").primaryKey(),
  number: integer("number").notNull().unique(), // 1..9
  title: text("title").notNull(),
  description: text("description"),
});

/** A group of students that moves through the 9 classes together. */
export const cohorts = pgTable("cohorts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  mode: text("mode").default("in-person").notNull(), // in-person | online | hybrid
  startDate: text("start_date"),
  teacherId: text("teacher_id").references(() => users.id),
  status: text("status").default("active").notNull(), // active | completed
  createdAt: now(),
});

export const students = pgTable("students", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  cohortId: text("cohort_id").references(() => cohorts.id),
  currentClass: integer("current_class").default(1).notNull(),
  status: text("status").default("active").notNull(), // active | paused | withdrawn | graduated
  enrolledAt: text("enrolled_at"),
  graduatedAt: text("graduated_at"),
  notes: text("notes"),
});

/** A Sunday (or online) meeting of a cohort for one class. */
export const classSessions = pgTable("class_sessions", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  cohortId: text("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  mode: text("mode").default("in-person").notNull(), // in-person | online
  meetingLink: text("meeting_link"),
  topic: text("topic"),
  createdAt: now(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // present | absent | excused
  },
  (t) => [unique().on(t.sessionId, t.studentId)]
);

/**
 * Graded work. TEST + ASSIGNMENT belong to a course (one each per class);
 * EXAM + INTERNSHIP are programme-level (courseId = null).
 */
export const assessments = pgTable("assessments", {
  id: text("id").primaryKey(),
  courseId: text("course_id").references(() => courses.id),
  kind: text("kind").notNull(), // TEST | ASSIGNMENT | EXAM | INTERNSHIP
  title: text("title").notNull(),
  instructions: text("instructions"),
  maxScore: integer("max_score").default(100).notNull(),
  dueDate: text("due_date"),
  createdAt: now(),
});

export const results = pgTable(
  "results",
  {
    id: text("id").primaryKey(),
    assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    status: text("status").default("submitted").notNull(), // submitted | graded
    submissionText: text("submission_text"),
    score: integer("score"),
    feedback: text("feedback"),
    submittedAt: text("submitted_at"),
    gradedAt: text("graded_at"),
    gradedBy: text("graded_by").references(() => users.id),
  },
  (t) => [unique().on(t.assessmentId, t.studentId)]
);

/** Required but UNGRADED: prayers and evangelism outings. Verified, not scored. */
export const requirementLogs = pgTable("requirement_logs", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // PRAYER | EVANGELISM
  activityDate: text("activity_date").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(), // pending | verified | rejected
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: text("verified_at"),
  createdAt: now(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const announcements = pgTable("announcements", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: now(),
});

