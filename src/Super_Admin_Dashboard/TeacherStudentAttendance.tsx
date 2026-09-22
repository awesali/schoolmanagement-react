import React, { useEffect, useState } from "react";
import { usePermissions } from "../security/Permissions";
import {
  SchoolIcon,
  localDate,
  teacherRequest,
} from "./TeacherWorkspace";
import "./TeacherWorkspace.css";

type Student = {
  id: number;
  enrollmentId: number;
  studentName: string;
  rollNumber?: string;
  className: string;
  sectionName: string;
  sectionId: number;
};
type RecordRow = {
  studentId: number;
  studentName: string;
  sectionId: number;
  sectionName: string;
  className: string;
  enrollmentId: number;
  status: string;
};
type SectionOption = {
  sectionId: number;
  sectionName: string;
  className: string;
};
const statuses = ["Present", "Absent", "Late", "Half Day", "Leave", "Excused"];

export default function StudentAttendance({
  initialSection,
  onDirtyChange,
}: {
  initialSection?: number;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { can } = usePermissions();
  const [sectionOptions, setSectionOptions] = useState<SectionOption[]>([]);
  const [section, setSection] = useState(
    initialSection ? String(initialSection) : "",
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [date, setDate] = useState(localDate());
  const [history, setHistory] = useState(false);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const [revision, setRevision] = useState(0);

  // Step 1: load assigned sections once on mount
  useEffect(() => {
    let alive = true;
    setSectionsLoading(true);
    setError("");
    teacherRequest("/api/Teacher/student-attendance-roster")
      .then((result) => {
        if (!alive) return;
        const sections: SectionOption[] = result.sections || [];
        setSectionOptions(sections);
        setSection((prev) => {
          if (prev) return prev;
          if (initialSection && sections.some((s) => s.sectionId === initialSection))
            return String(initialSection);
          return sections.length > 0 ? String(sections[0].sectionId) : "";
        });
      })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setSectionsLoading(false); });
    return () => { alive = false; };
  }, []);

  // Step 2: whenever section or date changes, fetch students + history for that section
  useEffect(() => {
    if (!section) return;
    let alive = true;
    setStudentsLoading(true);
    setError("");
    setStudents([]);
    setRecords([]);
    Promise.all([
      teacherRequest(`/api/Teacher/section-students?sectionId=${section}`),
      teacherRequest(`/api/Teacher/student-attendance-history?sectionId=${section}&date=${date}`),
    ])
      .then(([rosterResult, historyResult]) => {
        if (!alive) return;
        setStudents(rosterResult.data || []);
        setRecords(historyResult.data || []);
      })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setStudentsLoading(false); });
    return () => { alive = false; };
  }, [section, date, revision]);

  const saved = records.filter((r) => r.sectionId === Number(section));
  const roster: Student[] = history
    ? saved.map((r) => ({
        id: r.studentId,
        enrollmentId: r.enrollmentId,
        studentName: r.studentName,
        sectionId: r.sectionId,
        sectionName: r.sectionName,
        className: r.className,
      }))
    : students;

  const locked = saved.length > 0 || !!receipt;
  const dirty = Object.keys(marks).length > 0 && !locked;
  const loading = sectionsLoading || studentsLoading;

  useEffect(() => {
    onDirtyChange?.(dirty || saving);
    return () => onDirtyChange?.(false);
  }, [dirty, saving, onDirtyChange]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const changeContext = (change: () => void) => {
    if (dirty && !window.confirm("Discard the attendance changes you have not submitted?"))
      return;
    setMarks({});
    setReceipt("");
    setFilter("All");
    change();
  };

  const displayStatus = (s: Student) =>
    saved.find((r) => r.studentId === s.id)?.status || marks[s.id] || "Unmarked";

  const visible = roster.filter(
    (s) =>
      s.studentName.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All" || displayStatus(s) === filter),
  );
  const unmarked = roster.filter((s) => !marks[s.id]).length;

  const submit = async () => {
    if (loading || saving || locked || !roster.length || unmarked || !can("attendance.students", "update"))
      return;
    setSaving(true);
    setError("");
    try {
      await teacherRequest("/api/Teacher/student-attendance", {
        method: "POST",
        body: JSON.stringify({
          sectionId: Number(section),
          attendanceDate: localDate(),
          students: roster.map((s) => ({
            studentId: s.id,
            enrollmentId: s.enrollmentId,
            status: marks[s.id],
          })),
        }),
      });
      setReceipt(
        "Attendance submitted at " +
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      );
      setRecords((prev) => [
        ...prev,
        ...roster.map((s) => ({
          studentId: s.id,
          studentName: s.studentName,
          sectionId: s.sectionId,
          sectionName: s.sectionName,
          className: s.className,
          enrollmentId: s.enrollmentId,
          status: marks[s.id],
        })),
      ]);
      setMarks({});
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tw">
      <section className="tw-hero">
        <div>
          <span className="tw-eyebrow">CLASSROOM REGISTER</span>
          <h2>Student attendance</h2>
          <p>Start with everyone present. Record exceptions, then submit the complete class.</p>
        </div>
        <div className="tw-emblem"><SchoolIcon name="people" /></div>
      </section>

      <div className="tw-tabs">
        <button aria-pressed={!history} disabled={saving}
          onClick={() => changeContext(() => { setHistory(false); setDate(localDate()); })}>
          Today's register
        </button>
        <button aria-pressed={history} disabled={saving}
          onClick={() => changeContext(() => setHistory(true))}>
          Attendance history
        </button>
      </div>

      <div className="tw-toolbar">
        <label>
          Class / section
          <select disabled={sectionsLoading || saving} value={section}
            onChange={(e) => changeContext(() => setSection(e.target.value))}>
            <option value="">Select your class</option>
            {sectionOptions.map((s) => (
              <option key={s.sectionId} value={s.sectionId}>
                {s.className} · {s.sectionName}
              </option>
            ))}
          </select>
        </label>
        {history && (
          <label>
            Attendance date
            <input type="date" value={date} max={localDate()} disabled={saving}
              onChange={(e) => { if (e.target.value) changeContext(() => setDate(e.target.value)); }} />
          </label>
        )}
        <label className="tw-search">
          Find a student
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by student name" />
        </label>
        <label>
          Status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {["All", ...statuses, "Unmarked"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div className="tw-error" role="alert">
          {error}{" "}
          <button onClick={() => setRevision((v) => v + 1)}>Reload records</button>
        </div>
      )}
      {locked && (
        <div className="tw-success" role="status">
          <strong>{receipt || "Attendance already submitted for this class."}</strong>
          <div>Saved records are read-only. Contact your school administrator for corrections.</div>
        </div>
      )}

      <div className="tw-actions">
        {["Present", "Absent", "Late", "Unmarked"].map((status) => (
          <span className="tw-pill" key={status}>
            {status}: {roster.filter((s) => displayStatus(s) === status).length}
          </span>
        ))}
      </div>

      {sectionsLoading ? (
        <p className="tw-empty" role="status">Loading your classes…</p>
      ) : !section ? (
        <p className="tw-empty">No classes assigned. Your administrator must assign you as class teacher.</p>
      ) : studentsLoading ? (
        <p className="tw-empty" role="status">Loading students…</p>
      ) : error ? (
        <p className="tw-empty">Resolve the error above before marking attendance.</p>
      ) : !roster.length ? (
        <p className="tw-empty">
          {history ? "No attendance records for this class and date." : "No students enrolled in this class yet."}
        </p>
      ) : (
        <>
          {!history && !locked && can("attendance.students", "update") && (
            <div className="tw-actions">
              <button disabled={saving}
                title="Marks every student in the selected class present"
                onClick={() => setMarks(Object.fromEntries(roster.map((s) => [s.id, "Present"])))}>
                <SchoolIcon name="check" />
                Mark all present ({roster.length})
              </button>
            </div>
          )}
          <div className="tw-roster">
            {visible.map((s) => (
              <article className="tw-student" key={s.id}>
                <span className="tw-avatar">
                  {s.studentName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
                <div>
                  <strong>{s.studentName}</strong>
                  <small>
                    {s.rollNumber ? "Roll " + s.rollNumber + " · " : ""}
                    {s.className} · {s.sectionName}
                  </small>
                </div>
                {history || locked || !can("attendance.students", "update") ? (
                  <span className="tw-pill">{displayStatus(s)}</span>
                ) : (
                  <select aria-label={"Attendance for " + s.studentName} disabled={saving}
                    value={marks[s.id] || ""}
                    onChange={(e) => setMarks((prev) => ({ ...prev, [s.id]: e.target.value }))}>
                    <option value="">Unmarked</option>
                    {statuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                )}
              </article>
            ))}
          </div>
          {!visible.length && <p className="tw-empty">No students match these filters.</p>}
          {!history && !locked && can("attendance.students", "update") && (
            <div className="tw-submit">
              <span>
                <strong>{roster.length - unmarked} of {roster.length}</strong>{" "}
                students marked · {localDate()}
              </span>
              <button className="btn btn-primary"
                disabled={saving || unmarked > 0 || !roster.length}
                onClick={submit}>
                {saving ? "Submitting…" : "Submit class attendance"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
