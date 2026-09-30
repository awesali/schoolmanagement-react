// Dashboard Detail Layout: imports and dependencies
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { MenuIcon } from "../components/Icons/Icons";
import Sidebar from "./Sidebar";
import "./Dashboard.css";
import "./DashboardDetailLayout.css";

// Data types and contracts
type Kind = "staff" | "student";
type School = { id: number; schoolName: string; logoUrl?: string | null };

// Main component and state
export default function DashboardDetailLayout({
  kind,
  children,
}: React.PropsWithChildren<{ kind: Kind }>) {
  const { schoolId } = useParams();

  // Constants and helper functions
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 768);
  const [school, setSchool] = useState<School | null>(null);
  const token = localStorage.getItem("token");
  let userRole = "";
  try {
    userRole = String(
      JSON.parse(atob(token?.split(".")[1] || ""))?.RoleId || "",
    );
  } catch {
    /* The profile route handles invalid sessions. */
  }

  useEffect(() => {
    if (!token || !schoolId) return;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/Admin/School-by-superadmin`, {
      signal: controller.signal,
      headers: { accept: "*/*", Authorization: `Bearer ${token}` },
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!controller.signal.aborted)
          setSchool(
            (result?.data || []).find(
              (item: School) => Number(item.id) === Number(schoolId),
            ) || null,
          );
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [schoolId, token]);

  const onNavigate = (page: string, attendanceType?: "student" | "staff") => {
    const params = new URLSearchParams({ schoolId: schoolId || "", page });
    if (page === "Attendance" && attendanceType)
      params.set("attendanceType", attendanceType);
    navigate(`/dashboard?${params.toString()}`);
  };
  const activePage = kind === "staff" ? "Staff List" : "Student List";
  return (
    <div className="dashboard-wrapper dashboard-detail-layout">
      {!collapsed && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={() => setCollapsed(true)} />
      )}
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isCollapsed={collapsed}
        userRole={userRole}
        schoolName={school?.schoolName}
        schoolLogoUrl={school?.logoUrl}
      />
      <div className={`dashboard-main ${collapsed ? "sidebar-collapsed" : ""}`}>
        <header className="dashboard-header dashboard-detail-header">
          <div className="header-left">
            <button
              type="button"
              className="menu-toggle-btn"
              aria-label="Toggle navigation"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              <MenuIcon size={24} />
            </button>
            <div>
              <small>{school?.schoolName || "School management"}</small>
              <h1>{kind === "staff" ? "Staff details" : "Student details"}</h1>
            </div>
          </div>
        </header>
        <div className="dashboard-detail-body">{children}</div>
      </div>
    </div>
  );
}
