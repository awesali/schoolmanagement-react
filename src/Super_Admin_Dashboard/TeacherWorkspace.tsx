import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { usePermissions } from "../security/Permissions";
import "./TeacherWorkspace.css";

export const localDate = (date = new Date()) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
export async function teacherRequest(path: string, init?: RequestInit) {
  const response = await fetch(API_BASE_URL + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + localStorage.getItem("token"),
      ...init?.headers,
    },
  });
  const body =
    typeof response.text === "function"
      ? await response.text()
      : JSON.stringify(await response.json());
  let result: any = null;
  try {
    result = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid response. Please try again."
        : `The server could not complete this request (${response.status}). Please contact the administrator.`,
    );
  }
  if (!response.ok || result?.success === false)
    throw new Error(
      result?.message || "Unable to load records. Please try again.",
    );
  return result;
}
export async function allTeacherPages(path: string) {
  let rows: any[] = [];
  for (let page = 1; ; page++) {
    const result = await teacherRequest(
      path +
        (path.includes("?") ? "&" : "?") +
        "page=" +
        page +
        "&pageSize=100",
    );
    rows = rows.concat(result.data || []);
    if (page >= (result.totalPages || 1)) return rows;
  }
}
export function SchoolIcon({ name = "book" }: { name?: string }) {
  const paths: Record<string, string> = {
    book: "M3 4h6l3 2 3-2h6v15h-6l-3 2-3-2H3V4m9 2v15",
    check: "M4 12l5 5L20 6",
    calendar: "M4 5h16v16H4V5m0 5h16M8 2v6m8-6v6",
    people:
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m13-18a4 4 0 0 1 0 8m7 10v-2a4 4 0 0 0-3-3M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    clock: "M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
    home: "M3 10l9-7 9 7v11h-6v-7H9v7H3V10",
    assignment:
      "M9 5h6m-8 4h10M7 13h10M7 17h6M6 3h12a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2Z",
    material:
      "M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm4 3h8m-8 4h8m-8 4h5",
    profile: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    document: "M6 2h8l4 4v16H6V2Zm8 0v5h5M9 12h6m-6 4h6",
  };
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.book} />
    </svg>
  );
}
type AssignedClass = {
  id: number;
  className: string;
  sections: {
    id: number;
    sectionName: string;
    subjects: { subjectId: number; subjectName: string }[];
  }[];
};
type Slot = {
  id: string;
  day: number;
  period: number;
  start: string;
  end: string;
  className: string;
  subject: string;
  sectionId: number;
  attendanceStatus?: string;
};
type Props = {
  userName: string;
  onNavigate: (
    page: string,
    type?: "student" | "staff",
    sectionId?: number,
  ) => void;
  timetable?: boolean;
};
export default function TeacherWorkspace({
  userName,
  onNavigate,
  timetable = false,
}: Props) {
  const { can } = usePermissions();
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attendanceSummary, setAttendanceSummary] = useState<{
    pending: number | null;
    absent: number | null;
  }>({ pending: null, absent: null });
  const [query, setQuery] = useState("");
  const [day, setDay] = useState(new Date().getDay() || 7);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      const result = await teacherRequest(
        "/api/Teacher/" +
          (timetable ? "timetable" : "workspace") +
          "?date=" +
          localDate(),
      );
      if (alive) {
        setClasses(result.classes || []);
        setAttendanceSummary({
          pending: result.attendancePending,
          absent: result.studentsAbsent,
        });
        setSlots(
          (result.slots || []).sort((a: Slot, b: Slot) =>
            a.start.localeCompare(b.start),
          ),
        );
      }
    })()
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [retry, timetable]);
  const today = new Date();
  const todaySlots = slots.filter((s) => s.day === today.getDay());
  const actions: [string, string, string, "student" | "staff" | undefined][] = [
    ["Take attendance", "Attendance", "attendance.students", "student"],
    ["Enter marks", "Marks Entry", "exams.academic-exam", undefined],
    ["My attendance", "Attendance", "attendance.staff", "staff"],
  ];
  return (
    <div className="tw">
      <section className="tw-hero">
        <div>
          <span className="tw-eyebrow">YOUR TEACHING DAY</span>
          <h2>
            {timetable
              ? "My timetable"
              : "Good " +
                (today.getHours() < 12
                  ? "morning"
                  : today.getHours() < 17
                    ? "afternoon"
                    : "evening") +
                ", " +
                userName}
          </h2>
          <p>
            {today.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="tw-emblem">
          <SchoolIcon />
        </div>
      </section>
      <div className="tw-actions">
        {actions
          .filter((a) => can(a[2], "read"))
          .map(([label, page, , type]) => (
            <button
              key={label}
              onClick={() => onNavigate(page, type)}
              title={label}
            >
              <SchoolIcon
                name={
                  type === "student"
                    ? "people"
                    : type === "staff"
                      ? "check"
                      : "book"
                }
              />
              {label}
            </button>
          ))}
      </div>
      {error && (
        <div role="alert" className="tw-error">
          {error} <button onClick={() => setRetry((v) => v + 1)}>Retry</button>
        </div>
      )}
      <div className="tw-metrics">
        {[
          [
            "calendar",
            "Today's classes",
            loading || error ? "—" : todaySlots.length,
            "Scheduled periods",
          ],
          [
            "people",
            "Assigned classes",
            loading ? "—" : classes.length,
            "Assigned by your school",
          ],
          [
            "book",
            "Teaching sections",
            loading ? "—" : classes.reduce((n, c) => n + c.sections.length, 0),
            "Your classroom workspace",
          ],
        ].map(([icon, label, count, hint]) => (
          <div className="tw-metric" key={label}>
            <SchoolIcon name={String(icon)} />
            <span>{label}</span>
            <strong>{count}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      {attendanceSummary.pending !== null && (
        <div className="tw-actions">
          <button
            onClick={() => onNavigate("Attendance", "student")}
            title="Daily class registers awaiting submission"
          >
            <SchoolIcon name="check" />
            {loading || error ? "—" : attendanceSummary.pending} attendance
            pending
          </button>
          <span className="tw-pill">
            {loading || error ? "—" : attendanceSummary.absent} students absent
            today
          </span>
        </div>
      )}
      <div className="tw-columns">
        <section className="tw-panel">
          <div className="tw-heading">
            <div>
              <h3>{timetable ? "Weekly schedule" : "Today's schedule"}</h3>
              <p>Your assigned subjects, in teaching order.</p>
            </div>
            <SchoolIcon name="clock" />
          </div>
          {timetable && (
            <div className="tw-tabs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (label, index) => (
                  <button
                    key={label}
                    aria-pressed={day === index + 1}
                    onClick={() => setDay(index + 1)}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          )}
          {loading ? (
            <p className="tw-empty" role="status">
              Loading your schedule…
            </p>
          ) : error ? (
            <p className="tw-empty">
              Schedule unavailable. Retry to load your periods.
            </p>
          ) : (timetable
              ? slots.filter((s) => s.day === (day === 7 ? 0 : day))
              : todaySlots
            ).length === 0 ? (
            <p className="tw-empty">No periods scheduled for this day.</p>
          ) : (
            (timetable
              ? slots.filter((s) => s.day === (day === 7 ? 0 : day))
              : todaySlots
            ).map((s) => (
              <article className="tw-period" key={s.id}>
                <div className="tw-time">
                  <strong>{s.start}</strong>
                  <span>{s.end}</span>
                </div>
                <div>
                  <span className="tw-pill">Period {s.period}</span>
                  <h4>{s.className}</h4>
                  <p>{s.subject}</p>
                  {s.attendanceStatus && (
                    <span
                      className="tw-pill"
                      title="Daily class attendance, shared across periods"
                    >
                      Daily attendance · {s.attendanceStatus}
                    </span>
                  )}
                </div>
                <button
                  onClick={() =>
                    s.attendanceStatus === "Pending"
                      ? onNavigate("Attendance", "student", s.sectionId)
                      : onNavigate("My Classes")
                  }
                  title={
                    s.attendanceStatus === "Pending"
                      ? "Open this class register"
                      : "View your assigned classes and subjects"
                  }
                >
                  {s.attendanceStatus === "Pending"
                    ? "Take attendance"
                    : "Open classes →"}
                </button>
              </article>
            ))
          )}
        </section>
        <section className="tw-panel">
          <div className="tw-heading">
            <div>
              <h3>My classes</h3>
              <p>A space for every classroom.</p>
            </div>
            <SchoolIcon name="people" />
          </div>
          <label className="tw-search">
            Find a class or subject
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your assignments…"
            />
          </label>
          {classes
            .filter((c) =>
              (
                c.className +
                c.sections
                  .flatMap((s) => s.subjects.map((v) => v.subjectName))
                  .join(" ")
              )
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c) => (
              <button
                className="tw-class"
                key={c.id}
                onClick={() => onNavigate("My Classes")}
              >
                <span className="tw-class-icon">
                  <SchoolIcon />
                </span>
                <span>
                  <strong>{c.className}</strong>
                  <small>
                    {c.sections.map((s) => s.sectionName).join(" · ")} ·{" "}
                    {Array.from(
                      new Set(
                        c.sections.flatMap((s) =>
                          s.subjects.map((v) => v.subjectName),
                        ),
                      ),
                    ).join(", ") || "No subjects assigned"}
                  </small>
                </span>
                <span>→</span>
              </button>
            ))}
          {!loading && !classes.length && (
            <p className="tw-empty">
              No classes assigned. Contact your school administrator.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
