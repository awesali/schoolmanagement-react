// Librarian Dashboard: imports and dependencies
import React, { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import "./PrincipalDashboard.css";

// Data types and contracts
type Reservation = {
  id: number;
  studentName: string;
  bookName: string;
  status: string;
  requestedAt: string;
};
type Props = {
  userName: string;
  schoolName?: string;
  onLogout: () => void;
  onProfile: () => void;
};

// Main component and state
export default function LibrarianDashboard({
  userName,
  schoolName,
  onLogout,
  onProfile,
}: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [menuOpen, setMenuOpen] = useState(false);

  // Constants and helper functions
  const token = localStorage.getItem("token");
  let schoolId = 0;
  try {
    schoolId = Number(JSON.parse(atob((token || "").split(".")[1])).SchoolId);
  } catch {
    /* Invalid sessions cannot load school data. */
  }
  const validSchool = Number.isInteger(schoolId) && schoolId > 0;

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(
        `${API_BASE_URL}/api/SchoolCommunityAdmin${path}`,
        {
          ...init,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session has expired. Please log in again."
            : "Unable to access library reservations. Please try again.",
        );
      const body = await response.json();
      if (body.success === false)
        throw new Error(body.message || "Unable to load library reservations.");
      return body;
    },
    [token],
  );

  const load = useCallback(async () => {
    setError("");
    if (!validSchool) {
      setError(
        "Your account needs a school assignment. Please contact your administrator.",
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const body = await request(`/overview?schoolId=${schoolId}`);
      setReservations(body.data?.reservations || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load reservations.",
      );
    } finally {
      setLoading(false);
    }
  }, [request, schoolId, validSchool]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: number, nextStatus: string) => {
    if (saving || !validSchool) return;
    setSaving(true);
    setError("");
    try {
      await request(`/library-reservations/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ schoolId, status: nextStatus }),
      });
      setReservations((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status: nextStatus } : item,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update reservation.",
      );
    } finally {
      setSaving(false);
    }
  };
  const filtered = reservations.filter(
    (item) =>
      (status === "All" || item.status === status) &&
      `${item.bookName} ${item.studentName}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  return (
    <div className="principal-shell">
      <aside className={`principal-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="principal-brand">
          <span className="principal-monogram">L</span>
          <div>
            <strong>Library Desk</strong>
            <small>{schoolName || "School library"}</small>
          </div>
        </div>
        <nav aria-label="Library navigation">
          <button className="active" onClick={() => setMenuOpen(false)}>
            Library reservations
          </button>
          <button onClick={onProfile}>My profile</button>
        </nav>
        <div className="principal-sidebar-bottom">
          <button onClick={onLogout}>Logout</button>
        </div>
      </aside>
      <main className="principal-main">
        <header className="principal-topbar">
          <button
            className="principal-mobile-toggle"
            aria-label="Toggle library menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            Menu
          </button>
          <span>Librarian workspace</span>
          <button onClick={onProfile}>{userName}</button>
        </header>
        <div className="principal-scroll-area">
          <div className="principal-content">
            <div className="principal-heading">
              <div>
                <span className="principal-eyebrow">LIBRARY</span>
                <h1>Library reservations</h1>
                <p>Review student requests and prepare books for collection.</p>
              </div>
              <div className="principal-toolbar">
                <button
                  disabled={loading || saving}
                  onClick={() => void load()}
                >
                  Refresh
                </button>
              </div>
            </div>
            {error && (
              <div className="principal-notice" role="alert">
                {error}
              </div>
            )}
            <div className="principal-kpis">
              {["Pending", "Ready", "Collected", "Cancelled"].map((value) => (
                <button
                  key={value}
                  className="principal-metric"
                  aria-label={`Filter ${value} reservations`}
                  onClick={() => setStatus(value)}
                >
                  <span>{value}</span>
                  <strong>
                    {
                      reservations.filter((item) => item.status === value)
                        .length
                    }
                  </strong>
                  <small>In recent reservations</small>
                </button>
              ))}
            </div>
            <section className="principal-panel" aria-label="Reservation list">
              <div className="principal-filters">
                <label>
                  Search
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Book or student name"
                  />
                </label>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {["All", "Pending", "Ready", "Collected", "Cancelled"].map(
                      (value) => (
                        <option key={value}>{value}</option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              {loading ? (
                <p role="status">Loading reservations...</p>
              ) : (
                <>
                  {filtered.length ? (
                    <div className="principal-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Book</th>
                            <th>Student</th>
                            <th>Requested</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((item) => (
                            <tr key={item.id}>
                              <td>{item.bookName}</td>
                              <td>{item.studentName}</td>
                              <td>
                                {new Date(
                                  item.requestedAt,
                                ).toLocaleDateString()}
                              </td>
                              <td>
                                <span className="principal-badge">
                                  {item.status}
                                </span>
                              </td>
                              <td>
                                {(item.status === "Pending"
                                  ? ["Ready", "Cancelled"]
                                  : item.status === "Ready"
                                    ? ["Collected", "Cancelled"]
                                    : []
                                ).map((next) => (
                                  <button
                                    className="btn"
                                    key={next}
                                    disabled={saving}
                                    aria-label={`Mark ${item.bookName} for ${item.studentName} as ${next}`}
                                    onClick={() =>
                                      void updateStatus(item.id, next)
                                    }
                                  >
                                    {next}
                                  </button>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="principal-empty">
                      {search || status !== "All"
                        ? "No reservations match your filters."
                        : "No library reservations yet."}
                    </p>
                  )}
                </>
              )}
              <p className="principal-footnote">
                Showing up to 100 recent reservations for your school.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
