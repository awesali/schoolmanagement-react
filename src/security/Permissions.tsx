import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { CRUD_PERMISSIONS_ENABLED } from './features';

export type CrudAction = 'create' | 'read' | 'update' | 'delete';
type PermissionContextValue = {
  loading: boolean;
  roleName: string;
  permissions: Set<string>;
  can: (page: string, action?: CrudAction) => boolean;
  refresh: () => Promise<void>;
};

const PermissionContext = createContext<PermissionContextValue>({
  loading: true,
  roleName: '',
  permissions: new Set(),
  can: () => false,
  refresh: async () => undefined,
});

const tokenRole = () => {
  const token = localStorage.getItem('token');
  if (!token) return '';
  try {
    return JSON.parse(atob(token.split('.')[1]))['RoleId'] || '';
  } catch {
    return '';
  }
};

export const PermissionProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [roleName, setRoleName] = useState('');
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!CRUD_PERMISSIONS_ENABLED) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/permissions/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setRoleName(data.roleName || '');
      setPermissions(new Set<string>((data.permissions || []).map((x: string) => x.toLowerCase())));
    } catch {
      setPermissions(new Set());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const value = useMemo(
    () => ({
      loading,
      roleName,
      permissions,
      refresh,
      can: (page: string, action: CrudAction = 'read') => (!CRUD_PERMISSIONS_ENABLED && !!tokenRole()) || tokenRole() === '1' || permissions.has(`${page}.${action}`.toLowerCase()),
    }),
    [loading, roleName, permissions, refresh],
  );
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
};

export const usePermissions = () => useContext(PermissionContext);

export const PermissionGate: React.FC<
  React.PropsWithChildren<{
    page: string;
    action?: CrudAction;
    fallback?: React.ReactNode;
  }>
> = ({ page, action = 'read', fallback = null, children }) => {
  const { can } = usePermissions();
  return can(page, action) ? <>{children}</> : <>{fallback}</>;
};

export const PAGE_PERMISSIONS: Record<string, string> = {
  'My Classes': 'academics.classes',
  'My Timetable': 'academics.class-schedule',
  'Unit Test': 'exams.academic-exam',
  'Syllabus Progress': 'academics.classes',
  'Homework & Assignments': 'academics.classes',
  Calendar: 'academics.class-schedule',
  'Study Material': 'academics.classes',
  'My Profile': 'dashboard.dashboard',
  Dashboard: 'dashboard.dashboard',
  'Academic Year': 'academics.sessions',
  'Student Enrollment': 'management.students',
  'Student Promotion': 'academics.student-promotion',
  'Promotion History': 'academics.promotion-history',
  'School List': 'management.schools',
  'Class List': 'academics.classes',
  'Class Schedule': 'academics.class-schedule',
  'Staff List': 'management.staff',
  Payroll: 'finance.salary',
  'Role & Permissions': 'security.roles',
  'Student List': 'management.students',
  'Student Services': 'management.students',
  'Hall Tickets': 'management.students',
  'Exam Preparation': 'academics.classes',
  'Parent List': 'management.parents',
  'Transport Management': 'management.transport',
  'Subject List': 'academics.subjects',
  'Fee Management': 'finance.fees',
  'Salary Management': 'finance.salary',
  'Exam Management': 'exams.academic-exam',
  'Marks Entry': 'exams.academic-exam',
};


