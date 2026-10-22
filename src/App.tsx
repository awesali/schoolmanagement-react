// App: imports and dependencies
import StudentProfile from "./Super_Admin_Dashboard/StudentProfile";
import StaffProfile from "./Super_Admin_Dashboard/StaffProfile";
import DashboardDetailLayout from "./Super_Admin_Dashboard/DashboardDetailLayout";
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login/Login";
import LandingPage from "./Landing/LandingPage";
import SupportPage from "./Support/SupportPage";
import StudentPortal from "./Student/StudentPortal";
import Dashboard from "./Super_Admin_Dashboard/Dashboard";
import AccountProfile from "./Super_Admin_Dashboard/AccountProfile";
import { ToastProvider } from "./components/Toast/Toast";
import { PermissionProvider } from "./security/Permissions";
import "./theme.css";

// Main component and state
function RequireLogin({ children }: { children: React.ReactElement }) {
  return localStorage.getItem("token") ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <ToastProvider>
      <PermissionProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/student" element={<RequireLogin><StudentPortal /></RequireLogin>} />
            <Route path="/support" element={<RequireLogin><SupportPage /></RequireLogin>} />
            <Route
              path="/dashboard/schools/:schoolId/students/:studentId"
              element={
                <RequireLogin><DashboardDetailLayout kind="student">
                  <StudentProfile />
                </DashboardDetailLayout></RequireLogin>
              }
            />
            <Route
              path="/dashboard/schools/:schoolId/staff/:staffId"
              element={
                <RequireLogin><DashboardDetailLayout kind="staff">
                  <StaffProfile />
                </DashboardDetailLayout></RequireLogin>
              }
            />
            <Route path="/dashboard" element={<RequireLogin><Dashboard /></RequireLogin>} />
            <Route path="/profile" element={<RequireLogin><AccountProfile /></RequireLogin>} />
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </BrowserRouter>
      </PermissionProvider>
    </ToastProvider>
  );
}

export default App;
