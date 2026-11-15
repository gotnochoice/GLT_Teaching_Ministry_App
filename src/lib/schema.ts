import { pgTable, text, integer, boolean, real, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const now = () => text("created_at").default(sql`(now() AT TIME ZONE 'UTC')::text`);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  role: text("role").default("STUDENT").notNull(), // STUDENT | TEACHER | ADMIN
  isPastor: boolean("is_pastor").default(false).notNull(), // may read private pastoral-care requests
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  notifyEmail: boolean("notify_email").default(true).notNull(),
  notifyWhatsapp: boolean("notify_whatsapp").default(true).notNull(),
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
  whatsappGroupUrl: text("whatsapp_group_url"), // chat.whatsapp.com invite link for the class group
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
  recordingUrl: text("recording_url"), // lets absent students make up the class
  createdAt: now(),
});

export const attendance = pgTable(
  "attendance",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id").notNull().references(() => classSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    status: text("status").notNull(), // present | absent | excused | makeup_pending | makeup
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


/** Public "join the next class" requests, reviewed by an admin. */
export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  preferredMode: text("preferred_mode").default("in-person").notNull(),
  message: text("message"),
  status: text("status").default("pending").notNull(), // pending | approved | rejected
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: text("reviewed_at"),
  userId: text("user_id").references(() => users.id),
  createdAt: now(),
});

/** One internship placement per student. */
export const internships = pgTable("internships", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().unique().references(() => students.id, { onDelete: "cascade" }),
  ministryUnit: text("ministry_unit").notNull(),
  supervisorName: text("supervisor_name").notNull(),
  supervisorContact: text("supervisor_contact"),
  startedAt: text("started_at"),
  signedOff: boolean("signed_off").default(false).notNull(),
  signedOffBy: text("signed_off_by").references(() => users.id),
  signedOffAt: text("signed_off_at"),
  supervisorRemarks: text("supervisor_remarks"),
});

export const internshipLogs = pgTable("internship_logs", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  activityDate: text("activity_date").notNull(),
  hours: real("hours").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(), // pending | verified | rejected
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: text("verified_at"),
  createdAt: now(),
});

/** Private concerns / prayer requests. Readable ONLY by pastors (users.is_pastor) and the requester. */
export const careRequests = pgTable("care_requests", {
  id: text("id").primaryKey(),
  requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").default("CONCERN").notNull(), // CONCERN | PRAYER | COUNSEL
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("open").notNull(), // open | in_progress | closed
  createdAt: now(),
  updatedAt: text("updated_at").default(sql`(now() AT TIME ZONE 'UTC')::text`),
});

export const careNotes = pgTable("care_notes", {
  id: text("id").primaryKey(),
  requestId: text("request_id").notNull().references(() => careRequests.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  note: text("note").notNull(),
  visibleToRequester: boolean("visible_to_requester").default(false).notNull(),
  createdAt: now(),
});

/** Append-only (enforced by a DB trigger). Who did what, and the before/after for grades. */
export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  detail: text("detail"), // JSON string
  createdAt: now(),
});

/** De-duplicates reminders so a cron re-run never double-sends. */
export const notificationLog = pgTable("notification_log", {
  key: text("key").primaryKey(),
  channel: text("channel").notNull(),
  createdAt: now(),
});
