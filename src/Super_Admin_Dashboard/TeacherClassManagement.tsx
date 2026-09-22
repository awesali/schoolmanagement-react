import React, { useEffect, useState } from "react";
import { usePermissions } from "../security/Permissions";
import { SchoolIcon, teacherRequest } from "./TeacherWorkspace";
import "./TeacherWorkspace.css";

type Section = {
  id: number;
  sectionName: string;
  isClassTeacher: boolean;
  subjects: { subjectId: number; subjectName: string }[];
};
type AssignedClass = { id: number; className: string; sections: Section[] };
type Props = {
  onNavigate: (
    page: string,
    type?: "student" | "staff",
    sectionId?: number,
  ) => void;
};
export default function TeacherClassManagement({ onNavigate }: Props) {
  const { can } = usePermissions();
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    teacherRequest("/api/Teacher/classes")
      .then((result) => {
        if (alive) setClasses(result.classes || []);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  const sections = classes.flatMap((c) =>
    c.sections.map((section) => ({ ...section, className: c.className })),
  );
  const filtered = sections.filter((s) =>
    (
      s.className +
      " " +
      s.sectionName +
      " " +
      s.subjects.map((v) => v.subjectName).join(" ")
    )
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="tw">
      <section className="tw-hero">
        <div>
          <span className="tw-eyebrow">MY CLASSROOMS</span>
          <h2>Every class, one workspace</h2>
          <p>
            Your assigned classes and subjects, with daily actions close at
            hand.
          </p>
        </div>
        <div className="tw-emblem">
          <SchoolIcon name="people" />
        </div>
      </section>
      <div className="tw-toolbar">
        <label className="tw-search">
          Find a class, section or subject
          <input
            placeholder="Search your classes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span className="tw-pill">
          {loading ? "Loading…" : sections.length + " assigned sections"}
        </span>
      </div>
      {error && (
        <div className="tw-error" role="alert">
          {error}{" "}
          <button onClick={() => setRevision((v) => v + 1)}>Retry</button>
        </div>
      )}
      {loading ? (
        <p className="tw-empty">Loading your classes…</p>
      ) : !filtered.length ? (
        <p className="tw-empty">
          {classes.length
            ? "No classes match your search."
            : "No classes assigned. Contact your school administrator."}
        </p>
      ) : (
        <div className="tw-roster">
          {filtered.map((section) => (
            <article className="tw-panel" key={section.id}>
              <div className="tw-heading">
                <span className="tw-class-icon">
                  <SchoolIcon />
                </span>
                <span className="tw-pill">
                  {section.isClassTeacher ? "Class teacher" : "Subject teacher"}
                </span>
              </div>
              <h3>
                {section.className} · {section.sectionName}
              </h3>
              <p style={{ marginTop: 12 }}>
                {section.subjects.map((s) => s.subjectName).join(", ") ||
                  "No teaching subjects assigned"}
              </p>
              <div className="tw-actions">
                <button
                  aria-expanded={expanded === section.id}
                  onClick={() =>
                    setExpanded(expanded === section.id ? null : section.id)
                  }
                >
                  Class overview {expanded === section.id ? "−" : "+"}
                </button>
                {section.isClassTeacher &&
                  can("attendance.students", "read") && (
                    <button
                      title="Open the daily register for this class"
                      onClick={() =>
                        onNavigate("Attendance", "student", section.id)
                      }
                    >
                      <SchoolIcon name="check" />
                      Attendance
                    </button>
                  )}
              </div>
              {expanded === section.id && (
                <div>
                  <p>
                    <strong>Section:</strong> {section.sectionName}
                  </p>
                  <p>
                    <strong>Your role:</strong>{" "}
                    {section.isClassTeacher
                      ? "Class teacher"
                      : "Subject teacher"}
                  </p>
                  <p>
                    <strong>Your subjects:</strong>{" "}
                    {section.subjects.map((s) => s.subjectName).join(", ") ||
                      "None assigned"}
                  </p>
                  <div className="tw-actions">
                    {can("exams.academic-exam", "read") && (
                      <button onClick={() => onNavigate("Marks Entry")}>
                        Open gradebook
                      </button>
                    )}
                    {can("academics.class-schedule", "read") && (
                      <button onClick={() => onNavigate("My Timetable")}>
                        My timetable
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
