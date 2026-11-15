# GLT Teaching Ministry App

A school portal for GLT Church (God's Love Tabernacle International Church) discipleship classes, built on the same stack and layout as Masy Academy
(Next.js 16, Tailwind 4, NextAuth, Drizzle + Postgres), branded to match glt.church: green `#238021`, mint `#B8E5A5`, ink `#0E1510`, cream `#F6F5F0`, Anton display font. Colours are tokens in `src/app/globals.css`.

## How the programme works (as modelled)

- **9 classes**, taken in order. Students meet every Sunday, in person or online, as a **cohort**.
- Each class ends with a **test** and an **assignment** (both graded). Passing both (≥ pass mark) unlocks the next class.
- Programme-level: a graded **final exam** (opens after class 9) and a graded **internship**.
- **Required but ungraded**: 2 prayers and 2 evangelism outings, logged by the student and **verified** by a teacher.
- Students **graduate** (and leave the cohort) only when all of the above are met. Graduation is enforced server-side.
- Grade = weighted (default: classwork 50 / exam 30 / internship 20). Pass mark, required counts and weights are editable in Admin → Settings.

## Roles

| Role | Can do |
|---|---|
| Student | See progress, submit tests/assignments, log prayer & evangelism, view results/schedule |
| Teacher | Grade (and allow retakes), verify prayer/evangelism, schedule sessions, take attendance — for cohorts they lead |
| Admin | Everything, plus enrol students/teachers, cohorts, edit curriculum & tests, graduation, announcements, settings |

## Features added in round 2

- **Public join form** (`/join`) with admin approval. Approving creates the student account with a one-time temporary password, sent by email/WhatsApp if configured and also shown once to the admin. The student must choose a new password at first login (`/account`). Basic spam protection: hidden honeypot field, duplicate-request check, and a site-wide hourly cap. The form never reveals whether an email already has an account.
- **Attendance requirement.** Minimum attendance % (default 80, Admin → Settings) is required to graduate. Present and approved make-ups count; excused sessions are excluded; only sessions from the student's enrolment date onward count. A student who misses a class watches the recording, requests a make-up, and a teacher approves it. Teachers add the recording link per session.
- **Reminders** by email (Resend) and WhatsApp (Twilio), sent by a daily Vercel Cron (`/api/cron/reminders`): class tomorrow, tests due within 2 days (only to students who haven't submitted), and a daily digest to teachers for items waiting 3+ days. Sends are de-duplicated, so re-runs never message twice. Students can opt out on `/account`.
- **Internship details**: ministry unit, supervisor, hours log, teacher verification of hours, supervisor sign-off recording, plus the graded internship score. Verified hours (default 20) and sign-off are graduation requirements.
- **Pastoral care**: students send private concerns/prayer requests that only pastors can read (staff flagged "pastor" in Admin → Teachers & Admins). Admins who are not pastors cannot read them. Opening a request is audited (content is never written to the audit log).
- **Audit log** (Admin → Audit Log): who changed what and when, with old and new values for grades. Append-only: a database trigger rejects edits and deletes.

## Deploy: Vercel + Supabase

1. In Supabase, copy the connection string (Project Settings → Database). On Vercel use the **Transaction pooler** (port 6543).
2. In Vercel, set the environment variables from `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_NAME`, `CRON_SECRET`, and the Resend/Twilio ones if you want reminders).
3. Create the tables once, from your computer: `DATABASE_URL="<supabase url>" npm run db:init`. It is safe to re-run after updates (it only adds what is missing).
4. Create the first admin: run `npm run db:seed` only on a throwaway database, or insert one admin user manually. **Do not seed demo users into production.**
5. `db:init` turns on Row Level Security (with no policies) on every table. Supabase exposes tables to the public anon key unless RLS is on, so this keeps student data from being readable through Supabase's REST API. The app connects directly as the `postgres` role, which bypasses RLS and is unaffected. If you ever connect with a different role, give it `BYPASSRLS` or add policies.
6. Vercel Cron runs `/api/cron/reminders` daily at 07:00 UTC (08:00 Lagos). It requires `CRON_SECRET`; without it the endpoint returns 503.

**WhatsApp note:** WhatsApp only allows a business to start a conversation with pre-approved message templates (outside a 24-hour reply window). Reminders are sent as plain text, which works in Twilio's sandbox and for people who messaged you in the last 24 hours. For production, register templates with Twilio/Meta and send those instead. Email works without this restriction.

## Run locally

```bash
cp .env.example .env.local      # set DATABASE_URL and AUTH_SECRET
npm install
npm run db:reset                # create tables + demo data
npm run dev
```

Demo logins (password `password123`): `admin@church.test`, `teacher@church.test`, `tunde@church.test` (student).
**Change or remove demo users before going live.** The 9 class titles are placeholders: rename them in Admin → Curriculum.

Set `NEXT_PUBLIC_APP_NAME` to your church's name.

## Not built yet

Forgot-password by email, file uploads for assignments, per-student detail pages, PDF certificates/transcripts, branches, auto-graded multiple-choice tests, WhatsApp message templates.
