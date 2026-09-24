# Principal dashboard

The primary role named Principal opens the dedicated portal at /dashboard. The role is resolved from /api/auth/profile even when the optional CRUD permission UI is disabled. No numeric Principal role ID is hard-coded.

GET /api/principal/dashboard?date=YYYY-MM-DD resolves the active user, Principal role and assigned school from the database. It does not accept a school ID. When CRUD permissions are enabled, dashboard.dashboard.read is required, and each data area also checks its existing read permission. Attendance, staff leave, academics, exams and finance are separately gated. Existing global permission feature flags still apply.

Implemented:
- Responsive Principal navigation and greeting, selected date, academic year, refresh/error states.
- Active enrollment counts, recorded attendance rate, explicit unmarked counts, class completion audit and drill-down.
- Staff attendance and approved leave visibility, current pending leave request review.
- Recurring scheduled teaching periods and published homework counts.
- Exam publication status and read-only fee collection/outstanding summaries.
- Printable daily school brief.

Definitions:
- Student attendance rate = present (including late) / recorded attendance. Recording completion = recorded / active enrolled students. Missing records are not absences.
- Enrollment metrics use the active academic session covering the selected date. There is no invented academic year fallback.
- Timetable figures are recurring scheduled periods, not confirmed lessons delivered. Holidays/closures are not currently modeled.
- Staff attendance takes precedence over an overlapping approved leave record.
- Leave requests show the current pending queue, independent of the selected overview date.
- Collections use active payments; outstanding is the sum of positive balances per active student fee in the selected academic year.
- Historical figures use current active enrollment/staff records, not immutable historical snapshots.

Not implemented in this dashboard increment:
Diary data models, planned assignment counts, marks completion, student 360, parent complaints, leave decisions and audited approval workflows, substitutions, follow-ups, announcements, transport monitoring, scheduled reports and AI. These require the later workflow phases from the supplied requirements. No placeholder sample statistics or nonfunctional approval controls are presented.

Validation:
Run the focused PrincipalDashboard.test.tsx and Dashboard.test.tsx suites. Build the .NET API. The repository-wide frontend type check currently has unrelated existing failures, including the bundler module-resolution setting with the installed TypeScript version.

## Syllabus tracking

Teachers now have Syllabus Progress in their menu. They record total chapters, chapters planned by the report date, and completed chapters for their assigned section/subject in the active academic year. Each save appends an attributed snapshot; earlier snapshots are retained.

Principal Dashboard and Academic Audit show class-wise chapter-weighted actual/planned completion, reporting coverage, and subject details. Any reported subject below its recorded plan triggers a warning. Missing records remain unreported, and dates are shown in the drill-down. Plans are the teacher-reported targets at the last snapshot date, not automatically projected targets.

Database setup: apply Api/SyllabusProgress_Migration.sql to the configured SQL Server database before recording data. It creates only the SyllabusProgress table, constraints and index, and can be run repeatedly. It does not seed sample percentages or change existing records. Missing-table errors appear as setup-pending messages while the rest of the dashboard remains usable.
