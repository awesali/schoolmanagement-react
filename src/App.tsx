import StudentProfile from './Super_Admin_Dashboard/StudentProfile';
import StaffProfile from './Super_Admin_Dashboard/StaffProfile';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login/Login';
import Dashboard from './Super_Admin_Dashboard/Dashboard';
import AccountProfile from './Super_Admin_Dashboard/AccountProfile';
import { ToastProvider } from './components/Toast/Toast';
import { PermissionProvider } from './security/Permissions';
import './theme.css';

function App() {
  return (
    <ToastProvider>
      <PermissionProvider><BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard/schools/:schoolId/students/:studentId" element={<StudentProfile />} />
          <Route path="/dashboard/schools/:schoolId/staff/:staffId" element={<StaffProfile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<AccountProfile />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter></PermissionProvider>
    </ToastProvider>
  );
}

export default App;
