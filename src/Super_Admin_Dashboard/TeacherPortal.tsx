import React, { useEffect, useMemo, useState } from "react";
import { profilePictureUrl } from "./ProfilePictureInput";
import { localDate, SchoolIcon, teacherRequest } from "./TeacherWorkspace";
import "./TeacherWorkspace.css";
import SyllabusProgress from "./SyllabusProgress";

export type TeacherPortalPage =
  "Homework & Assignments" | "Syllabus Progress" | "Calendar" | "Study Material" | "My Profile";
type Navigate = (page: string, type?: "student" | "staff") => void;
type TeachingOption = {
  sectionId: number;
  sectionName: string;
  className: string;
  subjectId: number;
  subjectName: string;
};

function Header({
  eyebrow,
  title,
  text,
  icon,
}: {
  eyebrow: string;
  title: string;
  text: string;
  icon: string;
}) {
  return (
    <section className="tw-hero">
      <div>
        <span className="tw-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <div className="tw-emblem">
        <SchoolIcon name={icon} />
      </div>
    </section>
  );
}

function Empty({ children }: React.PropsWithChildren<{}>) {
  return <p className="tw-empty">{children}</p>;
}

function Homework() {
  const [options, setOptions] = useState<TeachingOption[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    option: "",
    title: "",
    description: "",
    assignedDate: localDate(),
    dueDate: localDate(),
    totalMarks: "",
    resourceUrl: "",
    publish: true,
  });
  const load = async () => {
    setError("");
    try {
      const [a, b] = await Promise.all([
        teacherRequest("/api/Teacher/teaching-options"),
        teacherRequest("/api/Teacher/homework"),
      ]);
      setOptions(a.data || []);
      setRows(b.data || []);
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const option = options[Number(form.option)];
    if (!option) return;
    setSaving(true);
    setError("");
    try {
      await teacherRequest("/api/Teacher/homework", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          sectionId: option.sectionId,
          subjectId: option.subjectId,
          totalMarks: form.totalMarks ? Number(form.totalMarks) : null,
        }),
      });
      setOpen(false);
      setForm({
        option: "",
        title: "",
        description: "",
        assignedDate: localDate(),
        dueDate: localDate(),
        totalMarks: "",
        resourceUrl: "",
        publish: true,
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="tw">
      <Header
        eyebrow="CLASSWORK"
        title="Homework & Assignments"
        text="Create clear classwork, set deadlines, and keep every assigned class organised."
        icon="assignment"
      />
      <div className="tp-title-row">
        <div>
          <h3>Recent assignments</h3>
          <p>{rows.length} assignments created</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={!options.length}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "+ New assignment"}
        </button>
      </div>
      {error && (
        <div className="tw-error" role="alert">
          {error}
        </div>
      )}
      {open && (
        <form className="tw-panel tp-form" onSubmit={submit}>
          <label>
            Class and subject
            <select
              required
              value={form.option}
              onChange={(e) => setForm({ ...form, option: e.target.value })}
            >
              <option value="">Select assignment</option>
              {options.map((o, i) => (
                <option key={`${o.sectionId}-${o.subjectId}`} value={i}>
                  {o.className} · {o.sectionName} — {o.subjectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              required
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Linear equations practice"
            />
          </label>
          <label className="tp-wide">
            Instructions
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Explain what students need to complete…"
            />
          </label>
          <label>
            Assigned date
            <input
              type="date"
              required
              value={form.assignedDate}
              onChange={(e) =>
                setForm({ ...form, assignedDate: e.target.value })
              }
            />
          </label>
          <label>
            Due date
            <input
              type="datetime-local"
              required
              value={form.dueDate}
              min={form.assignedDate + "T00:00"}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </label>
          <label>
            Total marks (optional)
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.totalMarks}
              onChange={(e) => setForm({ ...form, totalMarks: e.target.value })}
            />
          </label>
          <label>
            Supporting link (optional)
            <input
              type="url"
              value={form.resourceUrl}
              onChange={(e) =>
                setForm({ ...form, resourceUrl: e.target.value })
              }
              placeholder="https://…"
            />
          </label>
          <label className="tp-check">
            <input
              type="checkbox"
              checked={form.publish}
              onChange={(e) => setForm({ ...form, publish: e.target.checked })}
            />{" "}
            Publish immediately
          </label>
          <button className="btn btn-primary" disabled={saving}>
            {saving
              ? "Saving…"
              : form.publish
                ? "Publish assignment"
                : "Save draft"}
          </button>
        </form>
      )}
      {!rows.length && !error ? (
        <Empty>
          No assignments yet. Create the first assignment for one of your
          teaching classes.
        </Empty>
      ) : (
        <div className="tp-card-grid">
          {rows.map((row) => (
            <article className="tw-panel tp-record" key={row.id}>
              <div className="tp-record-top">
                <span className="tw-pill">{row.status}</span>
                <span>{new Date(row.dueDate).toLocaleDateString("en-GB")}</span>
              </div>
              <h3>{row.title}</h3>
              <p>
                {row.className} · {row.sectionName} · {row.subjectName}
              </p>
              <p>{row.description}</p>
              <div className="tp-meta">
                <span>Due {new Date(row.dueDate).toLocaleString("en-GB")}</span>
                {row.totalMarks != null && <span>{row.totalMarks} marks</span>}
                {row.resourceUrl && (
                  <a href={row.resourceUrl} target="_blank" rel="noreferrer">
                    Open resource ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StudyMaterial() {
  const [options, setOptions] = useState<TeachingOption[]>([]),
    [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    option: "",
    title: "",
    description: "",
    resourceType: "Link",
    resourceUrl: "",
  });
  const load = async () => {
    setError("");
    try {
      const [a, b] = await Promise.all([
        teacherRequest("/api/Teacher/teaching-options"),
        teacherRequest("/api/Teacher/study-materials"),
      ]);
      setOptions(a.data || []);
      setRows(b.data || []);
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const option = options[Number(form.option)];
    if (!option) return;
    setSaving(true);
    try {
      await teacherRequest("/api/Teacher/study-materials", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          sectionId: option.sectionId,
          subjectId: option.subjectId,
        }),
      });
      setOpen(false);
      setForm({
        option: "",
        title: "",
        description: "",
        resourceType: "Link",
        resourceUrl: "",
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="tw">
      <Header
        eyebrow="LEARNING LIBRARY"
        title="Study Material"
        text="Share trusted notes, videos, practice sheets, and reference links with assigned classes."
        icon="material"
      />
      <div className="tp-title-row">
        <div>
          <h3>Shared resources</h3>
          <p>Resources are visible only to the selected class and subject.</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={!options.length}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "+ Share material"}
        </button>
      </div>
      {error && (
        <div className="tw-error" role="alert">
          {error}
        </div>
      )}
      {open && (
        <form className="tw-panel tp-form" onSubmit={submit}>
          <label>
            Class and subject
            <select
              required
              value={form.option}
              onChange={(e) => setForm({ ...form, option: e.target.value })}
            >
              <option value="">Select class</option>
              {options.map((o, i) => (
                <option key={`${o.sectionId}-${o.subjectId}`} value={i}>
                  {o.className} · {o.sectionName} — {o.subjectName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Resource type
            <select
              value={form.resourceType}
              onChange={(e) =>
                setForm({ ...form, resourceType: e.target.value })
              }
            >
              {["Link", "Video", "PDF", "Worksheet", "Notes"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Resource link
            <input
              type="url"
              required
              placeholder="https://…"
              value={form.resourceUrl}
              onChange={(e) =>
                setForm({ ...form, resourceUrl: e.target.value })
              }
            />
          </label>
          <label className="tp-wide">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? "Sharing…" : "Share with class"}
          </button>
        </form>
      )}
      {!rows.length && !error ? (
        <Empty>No study material shared yet.</Empty>
      ) : (
        <div className="tp-card-grid">
          {rows.map((row) => (
            <a
              className="tw-panel tp-resource"
              href={row.resourceUrl}
              target="_blank"
              rel="noreferrer"
              key={row.id}
            >
              <span className="tw-class-icon">
                <SchoolIcon name="material" />
              </span>
              <div>
                <span className="tw-pill">{row.resourceType}</span>
                <h3>{row.title}</h3>
                <p>
                  {row.className} · {row.sectionName} · {row.subjectName}
                </p>
                <small>{row.description || "Open learning resource"}</small>
              </div>
              <strong>↗</strong>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Calendar() {
  const initial = localDate().slice(0, 7),
    [month, setMonth] = useState(initial),
    [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    const [year, value] = month.split("-").map(Number);
    const from = `${month}-01`;
    const to = `${month}-${new Date(year, value, 0).getDate()}`;
    setError("");
    teacherRequest(`/api/Teacher/calendar?from=${from}&to=${to}`)
      .then((x) => setRows(x.data || []))
      .catch((e) => setError(e.message));
  }, [month]);
  const grouped = useMemo<Record<string, any[]>>(
    () =>
      rows.reduce((all: Record<string, any[]>, item) => {
        const key = String(item.date).slice(0, 10);
        (all[key] ||= []).push(item);
        return all;
      }, {} as Record<string, any[]>),
    [rows],
  );
  return (
    <div className="tw">
      <Header
        eyebrow="PLANNER"
        title="Calendar"
        text="See assignment deadlines, examinations, and approved or pending leave in one place."
        icon="calendar"
      />
      <div className="tp-title-row">
        <div>
          <h3>
            {new Date(month + "-02").toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <p>{rows.length} scheduled items</p>
        </div>
        <label className="tp-month">
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <div className="tw-error" role="alert">
          {error}
        </div>
      )}
      {!rows.length && !error ? (
        <Empty>Your calendar is clear for this month.</Empty>
      ) : (
        <div className="tp-calendar">
          {Object.entries(grouped)
            .sort()
            .map(([date, items]) => (
              <article className="tw-panel" key={date}>
                <time>
                  {new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </time>
                {items.map((item, index) => (
                  <div
                    className={`tp-event ${item.type.toLowerCase()}`}
                    key={index}
                  >
                    <span>{item.type}</span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </div>
                ))}
              </article>
            ))}
        </div>
      )}
    </div>
  );
}

function Profile({ onNavigate }: { onNavigate: Navigate }) {
  const [tab, setTab] = useState("Personal Details"),
    [data, setData] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [open, setOpen] = useState(false);
  const [leave, setLeave] = useState({
    leaveType: "Casual Leave",
    fromDate: "",
    toDate: "",
    reason: "",
  });
  const tabs = [
    "Personal Details",
    "My Timetable",
    "Attendance",
    "Leave",
    "Payslips",
    "Documents",
  ];
  const load = async (selected: string) => {
    setError("");
    setRows([]);
    try {
      if (selected === "Personal Details")
        setData((await teacherRequest("/api/Teacher/profile-summary")).data);
      else if (["Leave", "Payslips", "Documents"].includes(selected))
        setRows(
          (await teacherRequest(`/api/Teacher/${selected.toLowerCase()}`))
            .data || [],
        );
    } catch (e: any) {
      setError(e.message);
    }
  };
  useEffect(() => {
    void load(tab);
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (value: string) => {
    if (value === "My Timetable") return onNavigate("My Timetable");
    if (value === "Attendance") return onNavigate("Attendance", "staff");
    setTab(value);
  };
  const apply = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await teacherRequest("/api/Teacher/leave", {
        method: "POST",
        body: JSON.stringify(leave),
      });
      setOpen(false);
      setLeave({
        leaveType: "Casual Leave",
        fromDate: "",
        toDate: "",
        reason: "",
      });
      await load("Leave");
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div className="tw">
      <Header
        eyebrow="SELF SERVICE"
        title="My Profile"
        text="Your employment details, schedule, attendance, leave, salary records, and documents."
        icon="profile"
      />
      <div className="tw-tabs tp-profile-tabs">
        {tabs.map((value) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => choose(value)}
          >
            {value}
          </button>
        ))}
      </div>
      {error && (
        <div className="tw-error" role="alert">
          {error}
        </div>
      )}
      {tab === "Personal Details" &&
        (data ? (
          <section className="tw-panel">
            <div className="tw-heading">
              <div>
                <h3>{data.name}</h3>
                <p>
                  {data.designation} · {data.schoolName}
                </p>
              </div>
              <SchoolIcon name="profile" />
            </div>
            <dl className="tp-details">
              {[
                ["Email", data.email],
                ["Phone", data.phone],
                [
                  "Date of birth",
                  data.dob && new Date(data.dob).toLocaleDateString("en-GB"),
                ],
                [
                  "Joining date",
                  data.doj && new Date(data.doj).toLocaleDateString("en-GB"),
                ],
                ["Employment", data.employmentType],
                ["Qualification", data.qualification],
                ["Specialization", data.specialization],
                [
                  "Experience",
                  data.experienceYears != null
                    ? `${data.experienceYears} years`
                    : null,
                ],
                [
                  "Address",
                  [
                    data.adress,
                    data.addressLine2,
                    data.city,
                    data.state,
                    data.pinCode,
                  ]
                    .filter(Boolean)
                    .join(", "),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <p>
              Contact the administration to correct protected employment
              information.
            </p>
          </section>
        ) : (
          <Empty>Loading personal details…</Empty>
        ))}
      {tab === "Leave" && (
        <>
          <div className="tp-title-row">
            <div>
              <h3>Leave requests</h3>
              <p>Submit dates for administrator approval.</p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Close" : "+ Apply leave"}
            </button>
          </div>
          {open && (
            <form className="tw-panel tp-form" onSubmit={apply}>
              <label>
                Leave type
                <select
                  value={leave.leaveType}
                  onChange={(e) =>
                    setLeave({ ...leave, leaveType: e.target.value })
                  }
                >
                  {[
                    "Casual Leave",
                    "Sick Leave",
                    "Earned Leave",
                    "Unpaid Leave",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                From
                <input
                  required
                  type="date"
                  min={localDate()}
                  value={leave.fromDate}
                  onChange={(e) =>
                    setLeave({ ...leave, fromDate: e.target.value })
                  }
                />
              </label>
              <label>
                To
                <input
                  required
                  type="date"
                  min={leave.fromDate || localDate()}
                  value={leave.toDate}
                  onChange={(e) =>
                    setLeave({ ...leave, toDate: e.target.value })
                  }
                />
              </label>
              <label className="tp-wide">
                Reason
                <textarea
                  required
                  rows={3}
                  value={leave.reason}
                  onChange={(e) =>
                    setLeave({ ...leave, reason: e.target.value })
                  }
                />
              </label>
              <button className="btn btn-primary">Submit request</button>
            </form>
          )}
          <div className="tp-card-grid">
            {rows.map((row) => (
              <article className="tw-panel tp-record" key={row.id}>
                <div className="tp-record-top">
                  <span className="tw-pill">{row.status}</span>
                  <span>
                    {new Date(row.createdDate).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <h3>{row.leaveType}</h3>
                <p>
                  {new Date(row.fromDate).toLocaleDateString("en-GB")} –{" "}
                  {new Date(row.toDate).toLocaleDateString("en-GB")}
                </p>
                <p>{row.reason}</p>
                {row.adminRemarks && <small>Admin: {row.adminRemarks}</small>}
              </article>
            ))}
          </div>
          {!rows.length && !open && <Empty>No leave requests submitted.</Empty>}
        </>
      )}
      {tab === "Payslips" && (
        <>
          {!rows.length ? (
            <Empty>No payslips available yet.</Empty>
          ) : (
            <div className="tp-card-grid">
              {rows.map((row) => (
                <article className="tw-panel tp-record" key={row.id}>
                  <div className="tp-record-top">
                    <span className="tw-pill">{row.status}</span>
                    <span>
                      {new Date(
                        row.salaryYear,
                        row.salaryMonth - 1,
                      ).toLocaleDateString("en-GB", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <h3>₹{Number(row.netSalary).toLocaleString("en-IN")}</h3>
                  <div className="tp-meta">
                    <span>
                      Basic ₹{Number(row.basicSalary).toLocaleString("en-IN")}
                    </span>
                    <span>
                      Bonus ₹{Number(row.bonus).toLocaleString("en-IN")}
                    </span>
                    <span>
                      Deductions ₹
                      {Number(row.deduction).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <button onClick={() => window.print()}>Print payslip</button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      {tab === "Documents" && (
        <>
          {!rows.length ? (
            <Empty>No documents available.</Empty>
          ) : (
            <div className="tp-card-grid">
              {rows.map((row) => (
                <a
                  className="tw-panel tp-resource"
                  href={profilePictureUrl(row.documentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  key={row.id}
                >
                  <span className="tw-class-icon">
                    <SchoolIcon name="document" />
                  </span>
                  <div>
                    <h3>{row.documentName}</h3>
                    <small>
                      Added{" "}
                      {new Date(row.createdDate).toLocaleDateString("en-GB")}
                    </small>
                  </div>
                  <strong>View ↗</strong>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TeacherPortal({
  page,
  onNavigate,
}: {
  page: TeacherPortalPage;
  onNavigate: Navigate;
}) {
  if (page === "Syllabus Progress") return <SyllabusProgress date={localDate()} teacher />;
  if (page === "Homework & Assignments") return <Homework />;
  if (page === "Calendar") return <Calendar />;
  if (page === "Study Material") return <StudyMaterial />;
  return <Profile onNavigate={onNavigate} />;
}
