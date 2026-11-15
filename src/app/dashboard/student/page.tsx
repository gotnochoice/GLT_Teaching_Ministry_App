import Link from "next/link";
import { asc, desc, eq, gte, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { announcements, classSessions, courses } from "@/lib/schema";
import { requireRole } from "@/lib/session";
import { getMyStudent } from "@/lib/queries";
import { getStudentProgress } from "@/lib/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, ProgressBar, StatCard } from "@/components/ui/misc";
import { MessageCircle, BookOpen, Trophy, HandHeart } from "lucide-react";
import { formatDate, todayISO, TOTAL_CLASSES } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export default async function StudentHome() {
  const user = await requireRole("STUDENT");
  const { student, cohort } = await getMyStudent(user.id);
  const p = await getStudentProgress(student.id, student.currentClass);
  const current = p.classes.find((c) => c.number === student.currentClass);
  const [next] = student.cohortId
    ? await db.select({ s: classSessions, c: courses }).from(classSessions)
        .innerJoin(courses, eq(courses.id, classSessions.courseId))
        .where(and(eq(classSessions.cohortId, student.cohortId), gte(classSessions.date, todayISO())))
        .orderBy(asc(classSessions.date)).limit(1)
    : [];
  const news = await db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(3);

  const checklist = [
    { label: `Pass all ${TOTAL_CLASSES} classes`, done: p.classesCompleted === TOTAL_CLASSES, detail: `${p.classesCompleted}/${TOTAL_CLASSES}` },
    { label: "Final exam", done: !!p.exam?.passed, detail: p.exam?.status === "graded" ? `${p.exam.pct}%` : "Not graded" },
    { label: "Internship", done: !!p.internship?.passed, detail: p.internship?.status === "graded" ? `${p.internship.pct}%` : "Not graded" },
    ...(p.rules.internshipHoursRequired > 0 ? [{ label: "Internship hours", done: p.internshipWork.hoursVerified >= p.rules.internshipHoursRequired, detail: `${p.internshipWork.hoursVerified}/${p.rules.internshipHoursRequired} verified` }] : []),
    { label: "Internship sign-off", done: !!p.internshipWork.placement?.signedOff, detail: p.internshipWork.placement?.signedOff ? "Signed off" : p.internshipWork.placement ? "Awaiting" : "No placement yet" },
    ...(p.rules.minAttendancePct > 0 ? [{ label: "Attendance", done: p.attendance.pct !== null && p.attendance.pct >= p.rules.minAttendancePct, detail: p.attendance.pct === null ? "No sessions yet" : `${p.attendance.pct}% (need ${p.rules.minAttendancePct}%)` }] : []),
    { label: "Prayers", done: p.prayers.verified >= p.prayers.required, detail: `${p.prayers.verified}/${p.prayers.required} verified` },
    { label: "Evangelism", done: p.evangelism.verified >= p.evangelism.required, detail: `${p.evangelism.verified}/${p.evangelism.required} verified` },
  ];

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`${student.matricNo ?? "No matric number yet"} · ${cohort ? `${cohort.name} · ${cohort.mode}` : "not placed in a cohort yet"}`}
        action={student.status === "graduated" ? <Badge variant="orange">Graduated {formatDate(student.graduatedAt)}</Badge> : undefined}
      />
            {/* Phones: one roomy summary card instead of four cramped tiles */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-brand p-5 text-white sm:hidden">
        <p className="text-sm text-white/80">Current class</p>
        <p className="mt-1 text-4xl font-bold leading-none">{student.currentClass}<span className="ml-1.5 text-lg font-medium text-white/75">of {TOTAL_CLASSES}</span></p>
        {current && <p className="mt-2 text-sm font-medium text-white/90">{current.title}</p>}
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${(p.classesCompleted / TOTAL_CLASSES) * 100}%` }} /></div>
        <p className="mt-2 text-xs text-white/80">{p.classesCompleted} of {TOTAL_CLASSES} classes passed · pass mark {p.rules.passMark}%</p>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/25 pt-4">
          <div><p className="text-xs text-white/75">Overall grade</p><p className="mt-1 text-2xl font-bold">{p.overall === null ? "—" : `${p.overall}%`}</p></div>
          <div><p className="text-xs text-white/75">Prayer · Evangelism</p><p className="mt-1 text-2xl font-bold">{p.prayers.verified}/{p.prayers.required} · {p.evangelism.verified}/{p.evangelism.required}</p><p className="text-[11px] text-white/70">verified, not graded</p></div>
        </div>
      </div>
<div className="max-sm:hidden mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 max-sm:[&>*:last-child:nth-child(odd)]:col-span-2 auto-rows-fr">
        <StatCard icon={BookOpen} tone="brand" label="Current class" value={`${student.currentClass} of ${TOTAL_CLASSES}`} sub={current?.title} />
        <StatCard icon={CheckCircle2} tone="brand" label="Classes passed" value={p.classesCompleted} sub={`Pass mark ${p.rules.passMark}%`} />
        <StatCard icon={Trophy} tone="amber" label="Overall grade" value={p.overall === null ? "—" : `${p.overall}%`} accent />
        <StatCard icon={HandHeart} tone="blue" label="Prayer / Evangelism" value={`${p.prayers.verified}/${p.prayers.required} · ${p.evangelism.verified}/${p.evangelism.required}`} sub="Verified (not graded)" />
      </div>
      <Card className="mb-6 max-sm:hidden">
        <CardContent className="p-5">
          <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Class progress</span><span className="text-gray-500">{p.classesCompleted}/{TOTAL_CLASSES}</span></div>
          <ProgressBar value={p.classesCompleted} max={TOTAL_CLASSES} />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Graduation checklist</CardTitle></CardHeader>
          <CardContent className="divide-y divide-gray-100 px-5 pb-3 pt-0 sm:px-6">
            {checklist.map((c) => (
              <div key={c.label} className="flex items-center gap-3 py-3.5 text-sm">
                {c.done ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-gray-300" />}
                <span className="flex-1 font-medium">{c.label}</span>
                <span className="text-right text-gray-500">{c.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Next session</CardTitle></CardHeader>
            <CardContent className="text-sm">
              {next ? (
                <>
                  <p className="font-semibold">Class {next.c.number}: {next.c.title}</p>
                  <p className="text-gray-500">{formatDate(next.s.date)} · {next.s.mode}</p>
                  {next.s.mode === "online" && next.s.meetingLink && <a className="mt-1 inline-block font-medium text-brand hover:underline" href={next.s.meetingLink}>Join online</a>}
                </>
              ) : <p className="text-gray-500">No upcoming session scheduled. See <Link className="text-brand hover:underline" href="/dashboard/student/schedule">Schedule</Link>.</p>}
            </CardContent>
          </Card>
          {cohort?.whatsappGroupUrl && (
            <Card>
              <CardHeader><CardTitle className="text-base">Class WhatsApp group</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <p className="mb-3 text-gray-600">Reminders and updates for {cohort.name} are posted in the group.</p>
                <a href={cohort.whatsappGroupUrl} target="_blank" rel="noreferrer"><Button size="sm"><MessageCircle className="h-4 w-4" />Join the group</Button></a>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {news.length === 0 && <p className="text-gray-500">Nothing yet.</p>}
              {news.map((n) => (<div key={n.id}><p className="font-semibold">{n.title}</p><p className="text-gray-600">{n.body}</p></div>))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
