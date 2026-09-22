import React, { useEffect, useState } from "react";
import { usePermissions } from "../security/Permissions";
import { SchoolIcon, teacherRequest, localDate } from "./TeacherWorkspace";
import "./TeacherWorkspace.css";
type Entry = { attendanceDate: string; status: string };
export default function TeacherAttendance() {
  const { can } = usePermissions();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [records, setRecords] = useState<Entry[]>([]);
  const [todayStatus, setTodayStatus] = useState("");
  const [status, setStatus] = useState("Present");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    const last = new Date(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0,
    ).getDate();
    setLoading(true);
    setError("");
    Promise.all([
      teacherRequest(
        "/api/Staff/staff/attendance-history?fromDate=" +
          month +
          "-01&toDate=" +
          month +
          "-" +
          last,
      ),
      teacherRequest(
        "/api/Staff/staff/attendance-history?fromDate=" +
          localDate() +
          "&toDate=" +
          localDate(),
      ),
    ])
      .then(([history, today]) => {
        if (alive) {
          setRecords(Array.isArray(history) ? history : []);
          setTodayStatus(Array.isArray(today) ? today[0]?.status || "" : "");
        }
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
  }, [month, revision]);
  const submit = async () => {
    if (saving || todayStatus || loading) return;
    setSaving(true);
    setError("");
    try {
      await teacherRequest("/api/Staff/staff/mark-attendance", {
        method: "POST",
        body: JSON.stringify({ attendanceDate: localDate(), status }),
      });
      setTodayStatus(status);
      setRevision((v) => v + 1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="tw">
      <section className="tw-hero tw-personal">
        <div>
          <span className="tw-eyebrow">MY WORKDAY</span>
          <h2>My attendance</h2>
          <p>Your personal attendance and monthly record.</p>
        </div>
        <div className="tw-emblem">
          <SchoolIcon name="check" />
        </div>
      </section>
      {error && (
        <div className="tw-error" role="alert">
          {error}{" "}
          <button onClick={() => setRevision((v) => v + 1)}>Retry</button>
        </div>
      )}
      <div className="tw-columns" style={{ marginTop: 24 }}>
        <section className="tw-panel">
          <div className="tw-heading">
            <div>
              <h3>Today's check-in</h3>
              <p>
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
            <SchoolIcon name="clock" />
          </div>
          {loading ? (
            <p role="status">Checking today's attendance…</p>
          ) : todayStatus ? (
            <div className="tw-success" role="status">
              <strong>{todayStatus} · Recorded</strong>
              <div>Your attendance has been saved for today.</div>
            </div>
          ) : (
            <>
              <p>Select your status and confirm your attendance.</p>
              <div className="tw-tabs">
                {["Present", "Absent"].map((value) => (
                  <button
                    key={value}
                    disabled={saving}
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <button
                className="btn btn-primary"
                disabled={
                  saving || !!error || !can("attendance.staff", "update")
                }
                onClick={submit}
              >
                {saving ? "Saving…" : "Confirm my attendance"}
              </button>
            </>
          )}
          <p style={{ marginTop: 20 }}>
            Saved attendance is read-only. Contact your administrator if a
            correction is needed.
          </p>
        </section>
        <section className="tw-panel">
          <div className="tw-heading">
            <div>
              <h3>Monthly overview</h3>
              <p>Counts reflect recorded days only.</p>
            </div>
            <SchoolIcon name="calendar" />
          </div>
          <label className="tw-search">
            Month
            <input
              type="month"
              value={month}
              max={localDate().slice(0, 7)}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <div className="tw-actions">
            {["Present", "Absent", "Late", "Leave"].map((s) => (
              <span className="tw-pill" key={s}>
                {s}:{" "}
                {loading || error
                  ? "—"
                  : records.filter((r) => r.status === s).length}
              </span>
            ))}
          </div>
        </section>
      </div>
      <section className="tw-panel" style={{ marginTop: 24 }}>
        <div className="tw-heading">
          <div>
            <h3>Attendance journal</h3>
            <p>A day-by-day view of your saved records.</p>
          </div>
        </div>
        {loading ? (
          <p className="tw-empty">Loading records…</p>
        ) : error ? (
          <p className="tw-empty">Records could not be loaded.</p>
        ) : !records.length ? (
          <p className="tw-empty">No attendance recorded for this month.</p>
        ) : (
          <div className="tw-history-grid">
            {records
              .slice()
              .sort((a, b) => a.attendanceDate.localeCompare(b.attendanceDate))
              .map((record, index) => (
                <article className="tw-day" key={record.attendanceDate + index}>
                  <strong>
                    {new Date(
                      record.attendanceDate.slice(0, 10) + "T12:00:00",
                    ).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      weekday: "short",
                    })}
                  </strong>
                  <span className="tw-pill">{record.status}</span>
                </article>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
