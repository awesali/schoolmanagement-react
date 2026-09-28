import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";
import { usePermissions } from "../security/Permissions";
import { profilePictureUrl } from "./ProfilePictureInput";
import StudentList from "./StudentList";
import ParentList from "./ParentList";
import StudentServicesManagement from "./StudentServicesManagement";
import { downloadCsv } from "../utils/csv";
import "./PrincipalDashboard.css";
import "./ReceptionistDashboard.css";

type Kind = "Visitor" | "Enquiry" | "Appointment" | "Call";
type Page =
  | "Overview"
  | "Visitors"
  | "Enquiries"
  | "Appointments"
  | "Calls"
  | "Follow-ups"
  | "Students"
  | "Parents"
  | "Student services"
  | "Reports";
export type ReceptionEntry = {
  id: number;
  kind: Kind;
  name: string;
  phone: string;
  contactPerson: string;
  purpose: string;
  status: string;
  scheduledAt: string;
  followUpDate: string | null;
  checkedOutAt: string | null;
  version: string;
};
type Data = {
  schoolId: number;
  schoolName: string;
  academicYear: string | null;
  generatedAt: string;
  entries: ReceptionEntry[];
  followUps: ReceptionEntry[];
  onSite: ReceptionEntry[];
};
type Props = {
  userName: string;
  profilePicture?: string | null;
  schoolName?: string;
  schoolLogoUrl?: string | null;
  onLogout: () => void;
  onProfile: () => void;
};
const localDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const stamp = (value: string | null, time = false) =>
  value
    ? new Date(value).toLocaleString(
        "en-IN",
        time
          ? {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }
          : { day: "numeric", month: "short", year: "numeric" },
      )
    : "—";
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
const kinds: Record<string, Kind> = {
  Visitors: "Visitor",
  Enquiries: "Enquiry",
  Appointments: "Appointment",
  Calls: "Call",
};
const destinations: Record<Kind, Page> = {
  Visitor: "Visitors",
  Enquiry: "Enquiries",
  Appointment: "Appointments",
  Call: "Calls",
};
const closed = (entry: ReceptionEntry) =>
  ["Checked out", "Resolved", "Closed", "Completed", "Cancelled"].includes(
    entry.status,
  );
const statuses: Record<Kind, string[]> = {
  Visitor: ["Checked out"],
  Enquiry: ["Follow-up", "Resolved", "Closed"],
  Appointment: ["Completed", "Cancelled"],
  Call: ["Follow-up", "Resolved"],
};
const blank = {
  name: "",
  phone: "",
  contactPerson: "",
  purpose: "",
  scheduledAt: "",
  followUpDate: "",
};
export const filterReceptionEntries = (
  entries: ReceptionEntry[],
  search: string,
  status: string,
) =>
  entries.filter(
    (e) =>
      (!status || e.status === status) &&
      [e.name, e.phone, e.contactPerson, e.purpose, String(e.id)]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

export default function ReceptionistDashboard({
  userName,
  profilePicture,
  schoolName,
  schoolLogoUrl,
  onLogout,
  onProfile,
}: Props) {
  const { can, loading: permissionsLoading } = usePermissions();
  const [data, setData] = useState<Data | null>(null);
  const [date, setDate] = useState(localDate);
  const [page, setPage] = useState<Page>("Overview");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [onSiteOnly, setOnSiteOnly] = useState(false);
  const [menu, setMenu] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [failedLogo, setFailedLogo] = useState(false);
  const [failedAvatar, setFailedAvatar] = useState(false);
  const [createKind, setCreateKind] = useState<Kind | null>(null);
  const [editing, setEditing] = useState<ReceptionEntry | null>(null);
  const [form, setForm] = useState(blank);
  const [nextStatus, setNextStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [parentId, setParentId] = useState<number | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    fetch(API_BASE_URL + "/api/receptionist/dashboard?date=" + date, {
      headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.message ||
              (response.status === 403
                ? "An active receptionist account with an assigned school is required."
                : "Unable to load the front desk records. Please try again."),
          );
        }
        return response.json();
      })
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [date, refresh]);

  useEffect(() => {
    if (!profileOpen) return;
    const outside = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node))
        setProfileOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
        avatarRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [profileOpen]);

  const modalOpen = !!createKind || !!editing;
  useEffect(() => {
    if (modalOpen) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
      triggerRef.current?.focus();
    }
  }, [modalOpen]);
  const go = (next: Page) => {
    setPage(next);
    setSearch("");
    setStatus("");
    setOnSiteOnly(false);
    setParentId(null);
    setMenu(false);
    contentRef.current?.scrollTo?.(0, 0);
  };
  const closeForm = () => {
    if (!savingRef.current) {
      setCreateKind(null);
      setEditing(null);
    }
  };
  const openCreate = (kind: Kind) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setCreateKind(kind);
    setEditing(null);
    setForm(blank);
    setFormError("");
    setNotice("");
  };
  const openUpdate = (entry: ReceptionEntry) => {
    triggerRef.current = document.activeElement as HTMLElement;
    setEditing(entry);
    setCreateKind(null);
    setForm({ ...blank, followUpDate: entry.followUpDate?.slice(0, 10) || "" });
    setNextStatus(statuses[entry.kind][0]);
    setFormError("");
    setNotice("");
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingRef.current) return;
    if (createKind && (!form.name.trim() || !form.purpose.trim())) {
      setFormError("Enter a name and purpose.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setFormError("");
    const kind = createKind;
    try {
      const response = await fetch(
        API_BASE_URL +
          "/api/receptionist/entries" +
          (editing ? "/" + editing.id + "/status" : ""),
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify(
            editing
              ? {
                  status: nextStatus,
                  version: editing.version,
                  followUpDate:
                    nextStatus === "Follow-up"
                      ? form.followUpDate || null
                      : null,
                }
              : {
                  ...form,
                  kind,
                  scheduledAt: form.scheduledAt || null,
                  followUpDate: form.followUpDate || null,
                },
          ),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          body.message ||
            (body.errors
              ? Object.values(body.errors).flat().join(" ")
              : "The record could not be saved. Please retry."),
        );
      setCreateKind(null);
      setEditing(null);
      setNotice(
        editing
          ? "Record updated successfully."
          : kind + " recorded successfully.",
      );
      if (kind) {
        go(destinations[kind]);
        setDate(
          kind === "Appointment" ? form.scheduledAt.slice(0, 10) : localDate(),
        );
      }
      setRefresh((n) => n + 1);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save this record.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const school = data?.schoolName || schoolName || "Your school";
  const services = [
    {
      page: "Students" as Page,
      permission: "management.students",
      note: "Admissions, student profiles and ID cards",
    },
    {
      page: "Parents" as Page,
      permission: "management.parents",
      note: "Parent contacts and linked students",
    },
    {
      page: "Student services" as Page,
      permission: "management.students",
      note: "Certificates and student requests",
    },
  ].filter((s) => !permissionsLoading && can(s.permission, "read"));
  const groups: { title: string; pages: Page[] }[] = [
    {
      title: "FRONT DESK",
      pages: [
        "Overview",
        "Visitors",
        "Appointments",
        "Enquiries",
        "Calls",
        "Follow-ups",
      ],
    },
    { title: "SCHOOL SERVICES", pages: services.map((s) => s.page) },
    { title: "RECORDS", pages: ["Reports"] },
  ];
  const baseEntries =
    page === "Follow-ups"
      ? data?.followUps || []
      : page === "Visitors" && onSiteOnly
        ? data?.onSite || []
        : (data?.entries || []).filter(
            (e) => !kinds[page] || e.kind === kinds[page],
          );
  const visibleEntries = filterReceptionEntries(baseEntries, search, status);
  const exportRows = (rows: ReceptionEntry[], title: string) => {
    const safe = (value: unknown) =>
      /^[\s]*[=+@-]/.test(String(value ?? "")) ? "'" + value : value;
    downloadCsv(
      "reception-" +
        title.toLowerCase().replace(/\s+/g, "-") +
        "-" +
        date +
        ".csv",
      [
        "Reference",
        "Register",
        "Name",
        "Phone",
        "Contact person",
        "Purpose",
        "Status",
        "Date / time (IST)",
        "Follow-up date",
        "Checkout (IST)",
      ],
      rows.map((e) =>
        [
          e.id,
          e.kind,
          e.name,
          e.phone,
          e.contactPerson,
          e.purpose,
          e.status,
          e.scheduledAt,
          e.followUpDate,
          e.checkedOutAt,
        ].map(safe),
      ),
    );
  };
  const table = (rows: ReceptionEntry[], compact = false) => (
    <div className="principal-table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name / reference</th>
            {!compact && <th>Contact</th>}
            <th>Visit / purpose</th>
            <th>{page === "Follow-ups" ? "Follow-up" : "Date & time"}</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry.id}>
              <td>
                <b>{entry.name}</b>
                <small className="principal-block">
                  {entry.kind} · #{entry.id}
                </small>
              </td>
              {!compact && (
                <td>
                  {entry.phone ? (
                    <a href={"tel:" + entry.phone}>{entry.phone}</a>
                  ) : (
                    "—"
                  )}
                  <small className="principal-block">
                    {entry.contactPerson || "No contact person"}
                  </small>
                </td>
              )}
              <td className="reception-purpose">
                {entry.purpose}
                {entry.checkedOutAt && (
                  <small className="principal-block">
                    Checked out {stamp(entry.checkedOutAt, true)}
                  </small>
                )}
              </td>
              <td>
                {stamp(
                  page === "Follow-ups"
                    ? entry.followUpDate
                    : entry.scheduledAt,
                  page !== "Follow-ups",
                )}
              </td>
              <td>
                <span
                  className={
                    "principal-badge" + (!closed(entry) ? " warning" : "")
                  }
                >
                  {entry.status}
                </span>
              </td>
              <td>
                {!closed(entry) ? (
                  <button
                    className="principal-link"
                    onClick={() => openUpdate(entry)}
                  >
                    {entry.kind === "Visitor" ? "Check out" : "Update"}
                  </button>
                ) : (
                  <span className="principal-muted">Complete</span>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={compact ? 5 : 6}>
                <div className="reception-empty">
                  <span aria-hidden="true">✓</span>
                  <b>
                    {search || status
                      ? "No matching records"
                      : "No records to show"}
                  </b>
                  <p>
                    {search || status
                      ? "Try another search or clear the status filter."
                      : "Records will appear here as the front desk logs activity."}
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="principal-shell reception-shell">
      {menu && (
        <button
          className="reception-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={"principal-sidebar" + (menu ? " is-open" : "")}>
        <div className="principal-brand">
          <span className="principal-school-logo">
            {schoolLogoUrl && !failedLogo ? (
              <img
                src={profilePictureUrl(schoolLogoUrl)}
                alt={school + " logo"}
                onError={() => setFailedLogo(true)}
              />
            ) : (
              initials(school)
            )}
          </span>
          <div>
            <strong>Reception</strong>
            <small>{school}</small>
          </div>
        </div>
        <nav aria-label="Receptionist navigation">
          {groups
            .filter((g) => g.pages.length)
            .map((group) => (
              <React.Fragment key={group.title}>
                <p className="principal-nav-group">{group.title}</p>
                {group.pages.map((p) => (
                  <button
                    key={p}
                    className={page === p ? "active" : ""}
                    aria-current={page === p ? "page" : undefined}
                    onClick={() => go(p)}
                  >
                    {p}
                    {p === "Follow-ups" && !!data?.followUps.length && (
                      <span>{data.followUps.length}</span>
                    )}
                  </button>
                ))}
              </React.Fragment>
            ))}
        </nav>
        <div className="principal-sidebar-bottom reception-sidebar-note">
          <span className="reception-live-dot" /> School front office
          <small>A welcoming start to every school day.</small>
        </div>
      </aside>
      <main className="principal-main">
        <header className="principal-topbar">
          <button
            className="principal-mobile-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu((v) => !v)}
          >
            ☰
          </button>
          <span>
            Front office <span className="principal-muted">/ {page}</span>
          </span>
          <div className="principal-account">
            <span className="principal-account-name">
              Welcome, <strong>{userName}</strong>
            </span>
            <div className="profile-menu" ref={profileRef}>
              <button
                className="user-avatar"
                ref={avatarRef}
                aria-label={userName + " profile menu"}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen((v) => !v)}
              >
                {profilePicture && !failedAvatar ? (
                  <img
                    src={profilePictureUrl(profilePicture)}
                    alt={userName}
                    onError={() => setFailedAvatar(true)}
                  />
                ) : (
                  <span>{initials(userName)}</span>
                )}
              </button>
              {profileOpen && (
                <div className="profile-dropdown" role="menu">
                  <button
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      onProfile();
                    }}
                  >
                    My profile
                  </button>
                  <button role="menuitem" onClick={onLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="principal-scroll-area" ref={contentRef}>
          <div className="principal-content">
            <div className="principal-heading">
              <div>
                <span className="principal-eyebrow">
                  RECEPTION & SCHOOL SERVICES
                </span>
                <h1>{page === "Overview" ? "Front desk overview" : page}</h1>
                <p>
                  {school} · Academic year{" "}
                  {data?.academicYear || "not configured"}
                </p>
              </div>
              <div className="principal-toolbar">
                <label>
                  Register date (IST)
                  <input
                    type="date"
                    aria-label="Register date"
                    value={date}
                    min="2000-01-01"
                    onChange={(e) => {
                      if (e.target.value) setDate(e.target.value);
                    }}
                  />
                </label>
                <button
                  disabled={loading}
                  onClick={() => setRefresh((n) => n + 1)}
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
            {notice && (
              <div className="reception-success" role="status">
                {notice}
                <button
                  aria-label="Dismiss confirmation"
                  onClick={() => setNotice("")}
                >
                  ×
                </button>
              </div>
            )}
            {loading && (
              <section className="principal-panel" role="status">
                Loading front desk records…
              </section>
            )}
            {error && (
              <section className="principal-panel" role="alert">
                <h2>Front desk records unavailable</h2>
                <p>{error}</p>
                <button onClick={() => setRefresh((n) => n + 1)}>
                  Try again
                </button>
              </section>
            )}
            {!loading && data && (
              <>
                {page === "Overview" && (
                  <>
                    <section className="reception-welcome">
                      <div>
                        <span className="principal-eyebrow">
                          WELCOME TO YOUR WORKSPACE
                        </span>
                        <h2>Every school day starts here.</h2>
                        <p>
                          Welcome visitors, support families and keep your front
                          desk organised.
                        </p>
                        <div className="reception-hero-actions">
                          <button onClick={() => openCreate("Visitor")}>
                            ＋ Check in a visitor
                          </button>
                          <button onClick={() => openCreate("Enquiry")}>
                            New enquiry
                          </button>
                        </div>
                      </div>
                      <div className="reception-date">
                        <span>
                          {new Date(date + "T12:00:00").toLocaleDateString(
                            "en-IN",
                            { weekday: "long" },
                          )}
                        </span>
                        <strong>
                          {new Date(date + "T12:00:00").toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" },
                          )}
                        </strong>
                        <small>Front desk register · IST</small>
                      </div>
                    </section>
                    <div className="principal-kpis">
                      {[
                        {
                          label: "Visitors registered",
                          value: data.entries.filter(
                            (e) => e.kind === "Visitor",
                          ).length,
                          note: "Check-ins on the selected date",
                          to: "Visitors" as Page,
                        },
                        {
                          label: "Currently on campus",
                          value: data.onSite.length,
                          note: "All visitors still checked in",
                          to: "Visitors" as Page,
                          onSite: true,
                        },
                        {
                          label: "Appointments",
                          value: data.entries.filter(
                            (e) => e.kind === "Appointment",
                          ).length,
                          note: "Scheduled for the selected date",
                          to: "Appointments" as Page,
                        },
                        {
                          label: "Follow-ups due",
                          value: data.followUps.length,
                          note: "Open items due through this date",
                          to: "Follow-ups" as Page,
                        },
                      ].map((m) => (
                        <button
                          className="principal-metric"
                          key={m.label}
                          onClick={() => {
                            go(m.to);
                            if (m.onSite) setOnSiteOnly(true);
                          }}
                        >
                          <span>
                            {m.label}
                            <span aria-hidden="true">↗</span>
                          </span>
                          <strong>{m.value}</strong>
                          <small>{m.note}</small>
                        </button>
                      ))}
                    </div>
                    <div className="principal-columns">
                      <section className="principal-panel">
                        <div className="principal-section-title">
                          <h2>Appointments for the day</h2>
                          <button
                            className="principal-link"
                            onClick={() => openCreate("Appointment")}
                          >
                            ＋ Schedule
                          </button>
                        </div>
                        {data.entries
                          .filter((e) => e.kind === "Appointment")
                          .sort((a, b) =>
                            a.scheduledAt.localeCompare(b.scheduledAt),
                          )
                          .slice(0, 5)
                          .map((e) => (
                            <div className="reception-appointment" key={e.id}>
                              <time>
                                {new Date(e.scheduledAt).toLocaleTimeString(
                                  "en-IN",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </time>
                              <div>
                                <b>{e.name}</b>
                                <small>
                                  {e.contactPerson
                                    ? "Meeting " + e.contactPerson
                                    : e.purpose}
                                </small>
                              </div>
                              <button
                                className="principal-link"
                                disabled={closed(e)}
                                onClick={() => openUpdate(e)}
                              >
                                {e.status}
                              </button>
                            </div>
                          ))}
                        {!data.entries.some(
                          (e) => e.kind === "Appointment",
                        ) && (
                          <p className="principal-empty">
                            No appointments scheduled for this date.
                          </p>
                        )}
                        <button
                          className="principal-link"
                          onClick={() => go("Appointments")}
                        >
                          View appointment register →
                        </button>
                      </section>
                      <section className="principal-panel">
                        <div className="principal-section-title">
                          <h2>Needs your attention</h2>
                          <span className="principal-badge warning">
                            {data.followUps.length} due
                          </span>
                        </div>
                        {data.followUps.slice(0, 3).map((e) => (
                          <button
                            className="principal-alert"
                            key={e.id}
                            onClick={() => openUpdate(e)}
                          >
                            <span className="principal-alert-dot" />
                            <span>
                              <b>
                                {e.name} · {e.kind}
                              </b>
                              <small>
                                {e.purpose} · Due {stamp(e.followUpDate)}
                              </small>
                            </span>
                            <span aria-hidden="true">→</span>
                          </button>
                        ))}
                        {!data.followUps.length && (
                          <p className="principal-empty">
                            You're up to date. No open follow-ups are due
                            through this date.
                          </p>
                        )}
                        <button
                          className="principal-link"
                          onClick={() => go("Follow-ups")}
                        >
                          Open follow-up queue →
                        </button>
                      </section>
                    </div>
                    <section className="principal-panel">
                      <div className="principal-section-title">
                        <h2>Quick actions</h2>
                        <span className="principal-muted">
                          Daily front desk tasks
                        </span>
                      </div>
                      <div className="reception-actions">
                        {(
                          [
                            "Visitor",
                            "Appointment",
                            "Enquiry",
                            "Call",
                          ] as Kind[]
                        ).map((kind, i) => (
                          <button key={kind} onClick={() => openCreate(kind)}>
                            <span
                              className="reception-action-icon"
                              aria-hidden="true"
                            >
                              {["↗", "◷", "?", "☎"][i]}
                            </span>
                            <b>
                              {
                                [
                                  "Check in visitor",
                                  "Book appointment",
                                  "Record enquiry",
                                  "Log a call",
                                ][i]
                              }
                            </b>
                            <small>
                              {
                                [
                                  "Maintain the visitor register",
                                  "Plan a school meeting",
                                  "Track admission and general enquiries",
                                  "Capture a conversation and follow-up",
                                ][i]
                              }
                            </small>
                          </button>
                        ))}
                      </div>
                    </section>
                    <section className="principal-panel">
                      <div className="principal-section-title">
                        <h2>Recent front desk records</h2>
                        <button
                          className="principal-link"
                          onClick={() => go("Reports")}
                        >
                          View all records →
                        </button>
                      </div>
                      {table(data.entries.slice(0, 6), true)}
                    </section>
                    {!!services.length && (
                      <section className="principal-panel">
                        <h2>School services</h2>
                        <div className="reception-actions">
                          {services.map((s) => (
                            <button key={s.page} onClick={() => go(s.page)}>
                              <b>{s.page} →</b>
                              <small>{s.note}</small>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}
                {(kinds[page] ||
                  page === "Follow-ups" ||
                  page === "Reports") && (
                  <section className="principal-panel">
                    <div className="principal-section-title">
                      <div>
                        <h2>
                          {page === "Reports"
                            ? "Daily front desk register"
                            : page + " register"}
                        </h2>
                        <p>
                          {page === "Follow-ups"
                            ? "Open follow-ups due on or before the selected date."
                            : onSiteOnly
                              ? "Current visitors on campus, including earlier check-ins."
                              : "Records for " +
                                stamp(date + "T12:00:00") +
                                ". Statuses reflect the latest updates."}
                        </p>
                      </div>
                      <div className="reception-register-actions">
                        {kinds[page] && (
                          <button
                            className="reception-primary"
                            onClick={() => openCreate(kinds[page])}
                          >
                            {page === "Visitors"
                              ? "＋ Check in visitor"
                              : "＋ Add " + kinds[page].toLowerCase()}
                          </button>
                        )}
                        <button
                          className="principal-link"
                          disabled={!visibleEntries.length}
                          onClick={() => exportRows(visibleEntries, page)}
                        >
                          Export CSV
                        </button>
                        {page === "Reports" && (
                          <button
                            className="principal-link"
                            onClick={() => window.print()}
                          >
                            Print report
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="principal-filters">
                      <input
                        aria-label="Search register"
                        placeholder="Search name, phone, purpose or reference…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <label>
                        Status
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                        >
                          <option value="">All statuses</option>
                          {Array.from(new Set(baseEntries.map((e) => e.status)))
                            .sort()
                            .map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                        </select>
                      </label>
                      {page === "Visitors" && (
                        <label>
                          <input
                            type="checkbox"
                            checked={onSiteOnly}
                            onChange={(e) => {
                              setOnSiteOnly(e.target.checked);
                              setStatus("");
                            }}
                          />
                          Currently on campus
                        </label>
                      )}
                      {(search || status) && (
                        <button
                          className="principal-link"
                          onClick={() => {
                            setSearch("");
                            setStatus("");
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                    <p className="principal-footnote">
                      {visibleEntries.length} records · School local time (IST)
                    </p>
                    {table(visibleEntries)}
                  </section>
                )}
                {page === "Students" && can("management.students", "read") && (
                  <StudentList
                    selectedSchoolId={data.schoolId}
                    onViewParent={
                      can("management.parents", "read")
                        ? (id) => {
                            go("Parents");
                            setParentId(id);
                          }
                        : undefined
                    }
                  />
                )}
                {page === "Parents" && can("management.parents", "read") && (
                  <ParentList
                    selectedSchoolId={data.schoolId}
                    initialParentId={parentId}
                  />
                )}
                {page === "Student services" &&
                  can("management.students", "read") && (
                    <StudentServicesManagement schoolId={data.schoolId} />
                  )}
                <p className="principal-updated">
                  Updated {new Date(data.generatedAt).toLocaleString("en-IN")} ·
                  Registers show the selected date; on-campus visitors and
                  record statuses are current.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
      <dialog
        ref={dialogRef}
        className="reception-dialog"
        aria-labelledby="reception-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          closeForm();
        }}
      >
        <form onSubmit={save}>
          <div className="reception-dialog-heading">
            <div>
              <span className="principal-eyebrow">FRONT DESK REGISTER</span>
              <h2 id="reception-dialog-title">
                {editing
                  ? editing.kind === "Visitor"
                    ? "Check out visitor"
                    : "Update " + editing.kind.toLowerCase()
                  : createKind === "Visitor"
                    ? "Check in a visitor"
                    : "New " + createKind?.toLowerCase()}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close form"
              disabled={saving}
              onClick={closeForm}
            >
              ×
            </button>
          </div>
          {formError && (
            <p className="principal-notice" role="alert">
              {formError}
            </p>
          )}
          {editing ? (
            <>
              <div className="reception-record-summary">
                <b>{editing.name}</b>
                <p>{editing.purpose}</p>
                <small>
                  #{editing.id} · {editing.status}
                </small>
              </div>
              <label>
                New status
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value)}
                >
                  {statuses[editing.kind].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              {nextStatus === "Follow-up" && (
                <label>
                  Follow-up date
                  <input
                    required
                    type="date"
                    min={localDate()}
                    value={form.followUpDate}
                    onChange={(e) =>
                      setForm({ ...form, followUpDate: e.target.value })
                    }
                  />
                </label>
              )}
            </>
          ) : (
            <div className="reception-form-grid">
              <label>
                Full name *
                <input
                  autoFocus
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Phone number
                <input
                  type="tel"
                  maxLength={30}
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className="reception-full">
                {createKind === "Visitor" || createKind === "Appointment"
                  ? "Person to meet / department"
                  : "Assigned contact / department"}
                <input
                  maxLength={150}
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                />
              </label>
              <label className="reception-full">
                Purpose / notes *
                <textarea
                  required
                  rows={3}
                  maxLength={1000}
                  value={form.purpose}
                  onChange={(e) =>
                    setForm({ ...form, purpose: e.target.value })
                  }
                />
              </label>
              {createKind === "Appointment" && (
                <label className="reception-full">
                  Appointment date & time (IST) *
                  <input
                    required
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) =>
                      setForm({ ...form, scheduledAt: e.target.value })
                    }
                  />
                </label>
              )}
              {(createKind === "Enquiry" || createKind === "Call") && (
                <label className="reception-full">
                  Follow-up date
                  <input
                    type="date"
                    min={localDate()}
                    value={form.followUpDate}
                    onChange={(e) =>
                      setForm({ ...form, followUpDate: e.target.value })
                    }
                  />
                </label>
              )}
            </div>
          )}
          <div className="reception-dialog-footer">
            <button type="button" disabled={saving} onClick={closeForm}>
              Cancel
            </button>
            <button
              type="submit"
              className="reception-primary"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : editing
                  ? "Save update"
                  : createKind === "Visitor"
                    ? "Check in visitor"
                    : "Save record"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
