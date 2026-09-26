import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';
import { CRUD_PERMISSIONS_ENABLED, SECURITY_UI_ENABLED } from '../security/features';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
import { PermissionProvider } from '../security/Permissions';
import { ToastProvider } from '../components/Toast/Toast';
import Login from '../Login/Login';
jest.mock('./TeacherWorkspace', () => ({ __esModule: true, default: ({ timetable }: any) => <div>{timetable ? 'Teacher timetable content' : 'Teacher workspace content'}</div>, SchoolIcon: () => null }));
jest.mock('./CreateSchool', () => () => null);
jest.mock('./SchoolList', () => () => null);
jest.mock('./StaffList', () => () => null);
jest.mock('./StudentList', () => () => null);
jest.mock('./ParentList', () => () => null);
jest.mock('./StudentAttendance', () => () => null);
jest.mock('./StaffAttendance', () => () => null);
jest.mock('./ClassList', () => () => null);
jest.mock('./SubjectList', () => () => null);
jest.mock('./ExamList', () => () => null);
jest.mock('./ExamManagement', () => () => null);
jest.mock('./TeacherExamView', () => () => null);
jest.mock('./TeacherClassManagement', () => () => null);
jest.mock('./TeacherUnitTest', () => () => null);
jest.mock('./TeacherAttendance', () => () => null);
jest.mock('./TeacherStudentAttendance', () => () => null);
jest.mock('./TeacherPortal', () => ({
  __esModule: true,
  default: ({ page }: { page: string }) => <div>Teacher portal: {page}</div>,
}));
jest.mock('./AcademicYear', () => () => null);
jest.mock('./FinanceManagement', () => () => null);
jest.mock('./SalaryManagement', () => () => null);
jest.mock('./TransportManagement', () => () => null);
jest.mock('./PermissionManagement', () => () => null);
jest.mock('./StudentPromotion', () => () => null);



const permissionNames = ['dashboard.dashboard', 'academics.classes', 'academics.class-schedule', 'attendance.students', 'attendance.staff', 'exams.academic-exam'];
let loginRole: string | number = '2';
function token(role: string | number) {
  return 'header.' + btoa(JSON.stringify({ RoleId: role })) + '.signature';
}
function wrap(child: React.ReactNode) {
  return <ToastProvider><PermissionProvider>{child}</PermissionProvider></ToastProvider>;
}
beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockReset();
  window.history.replaceState({}, '', '/dashboard');
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => {
    if (String(url).includes('/auth/login')) return { token: token(loginRole), schoolId: 7 };
    if (String(url).includes('/auth/profile')) return { name: 'Account User', profilePictureUrl: '/uploads/user-profile.png', schoolName: 'Teacher School', schoolLogoUrl: '/uploads/teacher-school-logo.png' };
    if (String(url).includes('/permissions/me')) return { roleName: 'Teacher', permissions: permissionNames.map(p => p + '.read') };
    if (String(url).includes('School-by-superadmin')) return { success: true, data: [{ id: 7, schoolName: 'Admin School', logoUrl: '/uploads/school-logo.png' }] };
    return { success: true, data: [] };
  } } as Response));
});

test.each(['2', 2])('teacher role %s opens workspace, timetable and logout without admin requests', async role => {
  localStorage.setItem('token', token(role));
  render(wrap(<Dashboard />));
  expect(await screen.findByText('Teacher workspace content')).toBeInTheDocument();
  expect(screen.getByText('Teacher Desk')).toBeInTheDocument();
  expect(await screen.findByRole('img', { name: 'Teacher School logo' })).toHaveAttribute('src', expect.stringContaining('/uploads/teacher-school-logo.png'));
  expect(screen.queryByRole('img', { name: 'Admin School logo' })).not.toBeInTheDocument();
  expect(screen.queryByText('Teachers Present Today')).not.toBeInTheDocument();
  expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/api/Admin/'))).toBe(false);
  expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('check-attendance'))).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'My timetable' }));
  expect(screen.getByText('Teacher timetable content')).toBeInTheDocument();
  for (const page of ['Homework & Assignments', 'Calendar', 'Study Material', 'My Profile']) {
    fireEvent.click(screen.getByRole('button', { name: page }));
    expect(screen.getByText(`Teacher portal: ${page}`)).toBeInTheDocument();
  }
  fireEvent.click(screen.getByRole('button', { name: /profile menu/ }));
  expect(screen.getByRole('menuitem', { name: 'Profile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
  expect(localStorage.getItem('token')).toBeNull();
  expect(mockNavigate).toHaveBeenCalledWith('/login');
});

test('admin retains current school selection, dashboard and all management menus', async () => {
  localStorage.setItem('token', token('1'));
  render(wrap(<Dashboard />));
  expect(await screen.findByRole('option', { name: 'Admin School' })).toBeInTheDocument();
  expect(await screen.findByText('Teachers Present Today')).toBeInTheDocument();
  expect(screen.getByText('SchoolAdmin')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Create School/ })).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  expect(screen.queryByText('Teacher workspace content')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Management/ }));
  expect(screen.queryByRole('button', { name: /Study Materials/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Inventory/ })).not.toBeInTheDocument();
  expect(!!screen.queryByRole('button', { name: /Security/ })).toBe(SECURITY_UI_ENABLED);
  expect(screen.getByRole('img', { name: 'Admin School logo' })).toHaveAttribute('src', expect.stringContaining('/uploads/school-logo.png'));
  expect(await screen.findByRole('img', { name: 'Account User profile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Import notifications' }));
  expect(screen.getByText('No import notifications.')).toBeInTheDocument();
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('DashboardCard?schoolId=7'))).toBe(true));
  expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('check-attendance'))).toBe(false);
});

test.each(['1', '2'])('existing login authenticates role %s and opens the correct dashboard without a reload', async role => {
  loginRole = role;
  const { container, rerender } = render(wrap(<Login />));
  fireEvent.change(container.querySelector('input[type="email"]')!, { target: { value: 'user@school.test' } });
  fireEvent.change(container.querySelector('input[type="password"]')!, { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Login' }));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  const call = (global.fetch as jest.Mock).mock.calls.find(([url]) => String(url).includes('/auth/login'));
  expect(JSON.parse(call![1].body)).toEqual({ email: 'user@school.test', password: 'test-password' });
  rerender(wrap(<Dashboard />));
  expect(await screen.findByText(role === '2' ? 'Teacher workspace content' : 'Teachers Present Today')).toBeInTheDocument();
  if (role === '2') {
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/permissions/me'))).toBe(CRUD_PERMISSIONS_ENABLED);
    expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/api/Admin/'))).toBe(false);
  }
});

test('principal login opens the dedicated school overview without requesting admin school lists', async () => {
  localStorage.setItem('token', token('6'));
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async (url, options) => {
    if (String(url).includes('/auth/profile')) return { ok: true, json: async () => ({ name: 'Principal User', roleName: 'Principal' }) } as Response;
    if (String(url).includes('/api/principal/dashboard')) return { ok: true, json: async () => ({
      schoolId: 7, schoolName: 'Principal School', academicYear: '2026–27', generatedAt: '2026-09-24T04:00:00Z',
      students: null, staff: null, academics: null, finance: null, examinations: null, leaveRequests: null,
    }) } as Response;
    return previousFetch(url, options);
  });
  render(wrap(<Dashboard />));
  expect(await screen.findByText('Principal School')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Principal navigation' })).toBeInTheDocument();
  expect((global.fetch as jest.Mock).mock.calls.some(([url]) => String(url).includes('/api/Admin/'))).toBe(false);
  expect(screen.queryByText('Create School')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Good .*Principal User/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Principal User profile menu' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
  expect(mockNavigate).toHaveBeenCalledWith('/login');
});
