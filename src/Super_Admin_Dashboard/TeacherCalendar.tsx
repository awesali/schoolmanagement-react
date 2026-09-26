import React, { useEffect, useState } from "react";
import { SchoolIcon, localDate, teacherRequest } from "./TeacherWorkspace";
import "./TeacherWorkspace.css";
import "./TeacherCalendar.css";

type Slot = {
  id: string;
  day: number; // 0=Sun … 6=Sat
  period: number;
  start: string; // "HH:MM"
  end: string;
  className: string;
  subject: string;
  sectionId: number;
};
type Leave = {
  id: number;
  fromDate: string;
  toDate: string;
  leaveType: string;
  reason: string;
  status: string;
  adminRemarks?: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Planned Leave", "Earned Leave", "Unpaid Leave"];
const STATUS_COLOR: Record<string, string> = {
  Pending: "#f59e0b",
  Approved: "#16a34a",
  Rejected: "#dc2626",
};

function weekStart(d: Date) {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay()); // Sunday
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(d.getDate() + n);
  return copy;
}
function isoDate(d: Date) {
  return localDate(d);
}
function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const DAY_START = 7 * 60; // 07:00
const DAY_END = 19 * 60;  // 19:00
const PX_PER_MIN = 1.4;

export default function TeacherCalendar({
  onNavigate,
}: {
  onNavigate: (page: string, type?: "student" | "staff", sectionId?: number) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [weekOf, setWeekOf] = useState(() => weekStart(new Date()));
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    fromDate: localDate(),
    toDate: localDate(),
    leaveType: "Casual Leave",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [events, setEvents] = useState<Array<{ date: string; title: string; type: string; detail: string }>>([]);
  const [leaveBalance, setLeaveBalance] = useState<{ sessionStart: string; sessionEnd: string; balances: Array<{ leaveType: string; allotted: number; used: number; pending: number; remaining: number }> } | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    Promise.all([
      teacherRequest("/api/Teacher/timetable?date=" + localDate()),
      teacherRequest("/api/Teacher/leave"),
      teacherRequest("/api/StaffLeaveAllocations/mine"),
    ])
      .then(([tt, lv, balance]) => {
        if (!alive) return;
        setSlots((tt.slots || []).sort((a: Slot, b: Slot) => a.start.localeCompare(b.start)));
        setLeaves(lv.data || []);
        setLeaveBalance(balance.data || null);
      })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekOf, i));
  useEffect(() => {
    let active = true;
    const from = isoDate(weekOf), to = isoDate(addDays(weekOf, 6));
    teacherRequest(`/api/Teacher/calendar?from=${from}&to=${to}`)
      .then(result => { if (active) setEvents(result.data || []); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [weekOf]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Map JS day (0=Sun) to timetable day (same)
  const slotsForDay = (jsDay: number) => slots.filter((s) => s.day === jsDay);

  const isLeaveDay = (d: Date) =>
    leaves.some(
      (l) =>
        l.status !== "Rejected" &&
        new Date(l.fromDate.slice(0, 10) + "T00:00:00") <= d &&
        new Date(l.toDate.slice(0, 10) + "T00:00:00") >= d,
    );

  const leaveForDay = (d: Date) =>
    leaves.find(
      (l) =>
        l.status !== "Rejected" &&
        new Date(l.fromDate.slice(0, 10) + "T00:00:00") <= d &&
        new Date(l.toDate.slice(0, 10) + "T00:00:00") >= d,
    );

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!leaveForm.reason.trim()) { setFormError("Reason is required."); return; }
    setSubmitting(true);
    try {
      await teacherRequest("/api/Teacher/leave", {
        method: "POST",
        body: JSON.stringify(leaveForm),
      });
      const refreshed = await teacherRequest("/api/Teacher/leave");
      setLeaves(refreshed.data || []);
      const balance = await teacherRequest("/api/StaffLeaveAllocations/mine");
      setLeaveBalance(balance.data || null);
      const from = isoDate(weekOf), to = isoDate(addDays(weekOf, 6));
      const calendar = await teacherRequest(`/api/Teacher/calendar?from=${from}&to=${to}`);
      setEvents(calendar.data || []);
      setFormSuccess("Leave application submitted successfully.");
      setLeaveForm({ fromDate: localDate(), toDate: localDate(), leaveType: "Casual Leave", reason: "" });
      setTimeout(() => { setShowLeaveForm(false); setFormSuccess(""); }, 2000);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const eventsForDay = (day: Date) => events.filter(item => String(item.date).slice(0, 10) === isoDate(day));
  const eventMinutes = (item: { date: string; type: string; detail: string }) => {
    if (item.type === 'Holiday' || item.type === 'Leave') return null;
    const clock = item.type === 'Invigilation' ? item.detail.match(/^(\d{1,2}):(\d{2})/) : String(item.date).match(/T(\d{2}):(\d{2})/);
    if (!clock) return null;
    const minutes = Number(clock[1]) * 60 + Number(clock[2]);
    return minutes >= DAY_START && minutes < DAY_END ? minutes : null;
  };
  const eventHeight = (item: { type: string; detail: string }, start: number) => {
    if (item.type !== 'Invigilation') return 48;
    const end = item.detail.match(/^\d{1,2}:\d{2}-(\d{1,2}):(\d{2})/);
    if (!end) return 48;
    const endMinutes = Number(end[1]) * 60 + Number(end[2]);
    return Math.max(48, (Math.min(endMinutes, DAY_END) - start) * PX_PER_MIN);
  };
  const calendarHeight = (DAY_END - DAY_START) * PX_PER_MIN;
  const hourLabels = Array.from({ length: DAY_END / 60 - DAY_START / 60 }, (_, i) => DAY_START / 60 + i);

  return (
    <div className="tw">
      {/* Hero */}
      <section className="tw-hero">
        <div>
          <span className="tw-eyebrow">MY SCHEDULE</span>
          <h2>Calendar &amp; Leave</h2>
          <p>Teaching periods, exams, deadlines, academic holidays and leave on your weekly calendar.</p>
        </div>
        <div className="tw-emblem"><SchoolIcon name="calendar" /></div>
      </section>

      {error && (
        <div className="tw-error" role="alert">
          {error} <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {/* Week nav + Apply Leave button */}
      <div className="tc-nav">
        <button className="tc-nav-btn" onClick={() => setWeekOf(weekStart(addDays(weekOf, -7)))}>
          ← Prev week
        </button>
        <span className="tc-week-label">
          {weekDays[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          {" – "}
          {weekDays[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <button className="tc-nav-btn" onClick={() => setWeekOf(weekStart(new Date()))}>
          Today
        </button>
        <button className="tc-nav-btn" onClick={() => setWeekOf(weekStart(addDays(weekOf, 7)))}>
          Next week →
        </button>
        <button
          className="tc-leave-btn"
          onClick={() => { setShowLeaveForm((v) => !v); setFormError(""); setFormSuccess(""); }}
        >
          <SchoolIcon name="document" />
          Apply for leave
        </button>
      </div>

      <section className="tw-panel tc-balance" aria-labelledby="tc-balance-title">
        <div className="tc-balance-heading">
          <div><span className="tc-section-eyebrow">TIME OFF</span><h3 id="tc-balance-title">Leave balance</h3></div>
          {leaveBalance && <span className="tc-session-pill">Academic year {new Date(leaveBalance.sessionStart.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} - {new Date(leaveBalance.sessionEnd.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </div>
        {leaveBalance ? <>
          {leaveBalance.balances.every(item => item.allotted === 0) && <p className="tc-balance-unassigned">Your leave allowances have not been allotted for this academic year. Your administrator can set them in your staff profile.</p>}
          <div className="tc-balance-grid">{leaveBalance.balances.map(item => <article className="tc-balance-card" key={item.leaveType}>
            <span className="tc-balance-type">{item.leaveType}</span>
            <div className="tc-balance-amount"><strong>{item.remaining}</strong><span>{item.remaining === 1 ? 'day' : 'days'} available</span></div>
            <div className="tc-balance-track" aria-hidden="true"><span style={{ width: `${item.allotted ? Math.min(100, Math.max(0, item.remaining / item.allotted * 100)) : 0}%` }} /></div>
            <div className="tc-balance-meta"><span><b>{item.allotted}</b> allotted</span><span><b>{item.used}</b> used</span><span><b>{item.pending}</b> pending</span></div>
          </article>)}</div>
          <p className="tc-balance-note">Pending requests are reserved until a decision is made. Contact your administrator if an allowance has not been assigned.</p>
        </> : <p className="tc-balance-note">No active academic session or leave allowance is configured.</p>}
      </section>

      {/* Leave application form */}
      {showLeaveForm && (
        <div className="tc-leave-form-wrap" >
          <div className="tc-leave-form-header">
            <h3>Leave Application</h3>
            <button className="tc-close-btn" onClick={() => setShowLeaveForm(false)}>✕</button>
          </div>
          {formSuccess && <div className="tw-success" role="status"><strong>{formSuccess}</strong></div>}
          {formError && <div className="tw-error" role="alert">{formError}</div>}
          <form onSubmit={submitLeave} className="tp-form">
            <label>
              From date *
              <input type="date" value={leaveForm.fromDate} min={localDate()}
                onChange={(e) => setLeaveForm((p) => ({ ...p, fromDate: e.target.value, toDate: e.target.value > p.toDate ? e.target.value : p.toDate }))} required />
            </label>
            <label>
              To date *
              <input type="date" value={leaveForm.toDate} min={leaveForm.fromDate}
                onChange={(e) => setLeaveForm((p) => ({ ...p, toDate: e.target.value }))} required />
            </label>
            <label>
              Leave type *
              <select value={leaveForm.leaveType}
                onChange={(e) => setLeaveForm((p) => ({ ...p, leaveType: e.target.value }))}>
                {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="tp-wide">
              Reason *
              <textarea rows={3} value={leaveForm.reason} maxLength={500}
                placeholder="Briefly describe the reason for your leave…"
                onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))} required />
            </label>
            <div className="tp-wide tc-form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </button>
              <button type="button" onClick={() => setShowLeaveForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Weekly calendar grid */}
      <div className="tc-calendar-wrap">
        {/* Day headers */}
        <div className="tc-header-row">
          <div className="tc-time-gutter" />
          {weekDays.map((d, i) => {
            const isToday = d.getTime() === today.getTime();
            const onLeave = isLeaveDay(d);
            return (
              <div key={i} className={`tc-day-header${isToday ? " tc-today" : ""}${onLeave ? " tc-on-leave" : ""}`}>
                <span className="tc-day-name">{DAYS[d.getDay()]}</span>
                <span className={`tc-day-num${isToday ? " tc-today-num" : ""}`}>
                  {d.getDate()}
                </span>
                {eventsForDay(d).filter(item => item.type !== 'Exam' && eventMinutes(item) === null).map((item, index) =>
                  <div key={index} className={`tc-day-event tc-day-event-${item.type.toLowerCase()}`} title={`${item.title} - ${item.detail}`}>
                    <strong>{item.type}</strong> {item.title}
                  </div>)}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="tc-grid-body" style={{ height: calendarHeight + 32 }}>
          {/* Hour lines + labels */}
          <div className="tc-time-gutter tc-time-labels">
            {hourLabels.map((h) => (
              <div key={h} className="tc-hour-label"
                style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((d, colIdx) => {
            const jsDay = d.getDay();
            const daySlots = slotsForDay(jsDay);
            const onLeave = isLeaveDay(d);
            const isToday = d.getTime() === today.getTime();
            return (
              <div key={colIdx} className={`tc-day-col${isToday ? " tc-today-col" : ""}`}>
                {/* Hour grid lines */}
                {hourLabels.map((h) => (
                  <div key={h} className="tc-hour-line"
                    style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }} />
                ))}

                {/* Leave overlay */}
                {onLeave && (
                  <div className="tc-leave-overlay">
                    <span>{leaveForDay(d)?.leaveType}</span>
                  </div>
                )}

                {/* Timetable slots */}
                {!loading && daySlots.map((slot) => {
                  const startMin = timeToMinutes(slot.start);
                  const endMin = timeToMinutes(slot.end);
                  const top = (startMin - DAY_START) * PX_PER_MIN;
                  const height = Math.max((endMin - startMin) * PX_PER_MIN, 28);
                  return (
                    <button key={slot.id} className="tc-slot"
                      style={{ top, height }}
                      title={`${slot.subject} · ${slot.className}\n${slot.start}–${slot.end}`}
                      onClick={() => onNavigate("Attendance", "student", slot.sectionId)}>
                      <span className="tc-slot-subject">{slot.subject}</span>
                      <span className="tc-slot-class">{slot.className}</span>
                      <span className="tc-slot-time">{slot.start}–{slot.end}</span>
                    </button>
                  );
                })}

                {eventsForDay(d).filter(item => item.type !== 'Exam' && eventMinutes(item) !== null).map((item, index) => {
                  const minutes = eventMinutes(item)!;
                  return <div key={index} className={`tc-calendar-event tc-calendar-event-${item.type.toLowerCase()}`}
                    style={{ top: (minutes - DAY_START) * PX_PER_MIN, height: eventHeight(item, minutes) }} title={`${item.title} - ${item.detail}`}>
                    <span>{item.type} {item.detail}</span><strong>{item.title}</strong>
                  </div>;
                })}

                {/* Current time indicator */}
                {isToday && (() => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  if (nowMin < DAY_START || nowMin > DAY_END) return null;
                  return <div className="tc-now-line" style={{ top: (nowMin - DAY_START) * PX_PER_MIN }} />;
                })()}
              </div>
            );
          })}
        </div>

        {loading && <p className="tw-empty" role="status">Loading your schedule…</p>}
      </div>

      <section className="tw-panel tc-agenda" style={{ marginTop: 24 }}>
        <div className="tw-heading"><div><h3>This week's events</h3><p>Exams, invigilation, deadlines, holidays and leave.</p></div></div>
        {!events.length ? <p className="tw-empty">No events scheduled this week.</p> :
          [...events].sort((a, b) => a.date.localeCompare(b.date)).map((item, index) =>
            <div className={`tp-event tp-event-${item.type.toLowerCase().replace(/\s+/g, '-')}`} key={`${item.date}-${item.title}-${index}`}>
              <strong>{new Date(item.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              <span>{item.type}</span><b>{item.title}</b><small>{item.detail}</small>
            </div>)}
      </section>

      {/* Leave history */}
      <section className="tw-panel" style={{ marginTop: 28 }}>
        <div className="tw-heading">
          <div>
            <h3>My leave applications</h3>
            <p>All submitted applications and their current status.</p>
          </div>
          <SchoolIcon name="document" />
        </div>
        {!leaves.length ? (
          <p className="tw-empty">No leave applications yet.</p>
        ) : (
          <div className="tc-leave-list">
            {leaves.map((l) => (
              <article key={l.id} className="tc-leave-card">
                <div className="tc-leave-card-top">
                  <div>
                    <strong>{l.leaveType} Leave</strong>
                    <span className="tc-leave-dates">
                      {new Date(l.fromDate.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {l.fromDate.slice(0, 10) !== l.toDate.slice(0, 10) && (
                        <> – {new Date(l.toDate.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</>
                      )}
                    </span>
                  </div>
                  <span className="tc-status-badge" style={{ background: STATUS_COLOR[l.status] + "22", color: STATUS_COLOR[l.status] }}>
                    {l.status}
                  </span>
                </div>
                <p className="tc-leave-reason">{l.reason}</p>
                {l.adminRemarks && (
                  <p className="tc-admin-remarks"><strong>Admin:</strong> {l.adminRemarks}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
