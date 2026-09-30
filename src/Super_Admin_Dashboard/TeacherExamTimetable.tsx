// Teacher Exam Timetable: imports and dependencies
import React from "react";
import "./TimeTable.css";
import "./TeacherExamTimetable.css";

// Data types and contracts
export type ExamTimetableRow = {
  id?: number;
  classId: number;
  className?: string;
  sectionId?: number | null;
  sectionName?: string | null;
  subjectId: number;
  subjectName: string;
  examDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  maxMarks?: number | null;
  passingMarks?: number | null;
};

// Constants and helper functions
const dateKey = (value?: string | null) => (value ? value.slice(0, 10) : "");
const displayDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
const displayTime = (value?: string | null) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || "");
  if (!match) return "Time not set";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
};
const slotKey = (row: ExamTimetableRow) =>
  `${row.startTime || ""}|${row.endTime || ""}`;

// Main component and state
export default function TeacherExamTimetable({
  rows,
}: {
  rows: ExamTimetableRow[];
}) {
  // Constants and helper functions
  const groups = Array.from(
    new Map(
      rows.map((row) => [
        `${row.classId}:${row.sectionId ?? ""}`,
        {
          classId: row.classId,
          sectionId: row.sectionId,
          name: `${row.className || "Class"}${row.sectionName ? ` / ${row.sectionName}` : ""}`,
        },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="teacher-exam-timetable">
      {groups.map((group) => {
        const papers = rows.filter(
          (row) =>
            row.classId === group.classId && row.sectionId === group.sectionId,
        );
        const scheduled = papers.filter((row) => dateKey(row.examDate));
        const dates = Array.from(
          new Set(scheduled.map((row) => dateKey(row.examDate))),
        ).sort();
        const slots = Array.from(
          new Map(
            scheduled.map((row) => [
              slotKey(row),
              {
                key: slotKey(row),
                startTime: row.startTime,
                endTime: row.endTime,
              },
            ]),
          ).values(),
        ).sort((a, b) =>
          String(a.startTime || "").localeCompare(String(b.startTime || "")),
        );
        return (
          <section
            className="teacher-exam-section"
            key={`${group.classId}:${group.sectionId ?? ""}`}
          >
            <h3>{group.name}</h3>
            {dates.length ? (
              <div
                className="timetable-container"
                role="region"
                aria-label={`${group.name} exam timetable`}
                tabIndex={0}
              >
                <table className="timetable teacher-exam-grid">
                  <thead>
                    <tr>
                      <th scope="col" className="day-name">
                        Exam date
                      </th>
                      {slots.map((slot) => (
                        <th scope="col" key={slot.key}>
                          <div className="period-header">
                            <div className="period-title">
                              {displayTime(slot.startTime)} –{" "}
                              {displayTime(slot.endTime)}
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date) => (
                      <tr key={date}>
                        <th scope="row" className="day-name">
                          {displayDate(date)}
                        </th>
                        {slots.map((slot) => {
                          const matches = scheduled.filter(
                            (row) =>
                              dateKey(row.examDate) === date &&
                              slotKey(row) === slot.key,
                          );
                          return (
                            <td key={slot.key}>
                              {matches.length ? (
                                matches.map((row) => (
                                  <div
                                    className="teacher-exam-paper"
                                    key={row.id ?? row.subjectId}
                                  >
                                    <strong>{row.subjectName}</strong>
                                    <small>
                                      Max {row.maxMarks ?? "—"} · Pass{" "}
                                      {row.passingMarks ?? "—"}
                                    </small>
                                  </div>
                                ))
                              ) : (
                                <span className="teacher-exam-empty">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No dated papers scheduled for this class and section.</p>
            )}
            {papers.some((row) => !dateKey(row.examDate)) && (
              <p className="teacher-exam-undated">
                Some subjects do not have a paper date yet.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
