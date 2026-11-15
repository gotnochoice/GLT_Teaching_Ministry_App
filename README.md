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

Self-registration, password reset email, file uploads for assignments, per-student detail pages, PDF certificates/transcripts, SMS/email reminders.
