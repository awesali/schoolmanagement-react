import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
jest.mock('react-router-dom', () => ({
  useParams: () => ({ schoolId: '2', staffId: '7' }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
  Navigate: () => null,
}), { virtual: true });
import StaffProfile from './StaffProfile';
const mockError = jest.fn();
let mockCan = (_: string, __?: string) => true;
jest.mock('../security/Permissions', () => ({ usePermissions: () => ({ can: mockCan, loading: false }) }));
jest.mock('../components/Toast/Toast', () => ({ useToast: () => ({ error: mockError }) }));
jest.mock('./EditStaff', () => () => null);
const member = { id: 7, name: 'Test Teacher', schoolName: 'Test School', roleName: 'Teacher', email: 'staff@test.com', phone: '9876543210', documents: [], isActive: true };
const response = (data: any, status = 200) => Promise.resolve({ ok: status === 200, status, json: async () => data });
const mount = () => render(<StaffProfile />);
beforeEach(() => { localStorage.setItem('token', 'test'); mockCan = () => true; mockError.mockReset(); global.fetch = jest.fn((url: any) => response({ data: [member], totalPages: 1 })) as any; });
test('direct profile URL loads the requested school and staff and supports returning to the list', async () => {
  mount(); expect(await screen.findByRole('heading', { name: 'Test Teacher' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('schoolId=2&staffId=7'), expect.anything());
  expect(screen.getByRole('link', { name: 'Back to Staff List' })).toHaveAttribute('href', '/dashboard?schoolId=2&page=Staff%20List');
});
test('attendance uses staff ID and never mixes another staff with the same name', async () => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => url.includes('GetStaffAttendance') ? response([{ staffId: 7, status: 'Present', attendanceDate: '2026-09-01' }, { staffId: 8, status: 'Absent', attendanceDate: '2026-09-01' }]) : response({ data: [member] }));
  mount(); await screen.findByRole('heading', { name: 'Test Teacher' }); fireEvent.click(screen.getByRole('button', { name: 'Attendance' }));
  expect(await screen.findByText('1 Present - 0 Absent - 1 recorded days')).toBeInTheDocument();
});
test('empty attendance is an empty state and failures use the common toaster', async () => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => url.includes('GetStaffAttendance') ? response({}, 404) : response({ data: [member] }));
  mount(); await screen.findByRole('heading', { name: 'Test Teacher' }); fireEvent.click(screen.getByRole('button', { name: 'Attendance' }));
  expect(await screen.findByText('No attendance recorded for this month.')).toBeInTheDocument(); expect(mockError).not.toHaveBeenCalled();
  (global.fetch as jest.Mock).mockImplementation(() => response({}, 500)); fireEvent.click(screen.getByRole('button', { name: 'Salary' }));
  await waitFor(() => expect(mockError).toHaveBeenCalled()); expect(screen.getByRole('button', { name: 'Retry loading' })).toBeInTheDocument();
});
test('restricted salary and attendance tabs are hidden and their APIs are not requested', async () => {
  mockCan = (page: string) => page === 'management.staff'; mount(); await screen.findByRole('heading', { name: 'Test Teacher' });
  expect(screen.queryByRole('button', { name: 'Salary' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Attendance' })).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('salary is restricted to this staff and paid records expose a payslip', async () => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('assigned-salary')) return response({ isAssigned: true, data: { basicSalary: 25000, salaryType: 'monthly', effectiveFrom: '2026-01-01' } });
    if (url.includes('Staff/history')) return response([{ staffId: 7, salaryMonth: 9, salaryYear: 2026, netSalary: 25000, status: 'Paid', paymentMethod: 'Bank', remarks: 'Own salary' }, { staffId: 8, remarks: 'Other salary' }]);
    if (url.includes('Staff/pending')) return response([]);
    return response({ data: [member] });
  });
  mount(); await screen.findByRole('heading', { name: 'Test Teacher' }); fireEvent.click(screen.getByRole('button', { name: 'Salary' }));
  expect(await screen.findByText('Own salary')).toBeInTheDocument(); expect(screen.queryByText('Other salary')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View Payslip' })); expect(screen.getByRole('button', { name: 'Print Payslip' })).toBeInTheDocument();
});
test('classes and timetable use actual section teacher assignments', async () => {
  (global.fetch as jest.Mock).mockImplementation((url: string) => {
    if (url.includes('calss-list')) return response({ data: [{ className: '6th', sections: [{ id: 2, sectionName: 'A', staffId: 7, subjects: [{ subjectId: 1, subjectName: 'Maths', teacherId: 7 }, { subjectId: 2, subjectName: 'Science', teacherId: 8 }] }] }] });
    if (url.includes('subjects-by-school')) return response({ data: [{ id: 1, subjectName: 'Maths', teacherId: 7 }] });
    if (url.includes('get-timetable')) return response({ data: { periods: [{ id: 3, startTime: '09:00:00', endTime: '09:45:00' }], slots: [{ periodId: 3, subjectId: 1, subjectName: 'Maths', dayOfWeek: 1 }, { periodId: 3, subjectId: 2, subjectName: 'Science', dayOfWeek: 2 }] } });
    return response({ data: [member] });
  });
  mount(); await screen.findByRole('heading', { name: 'Test Teacher' }); fireEvent.click(screen.getByRole('button', { name: 'Timetable' }));
  expect(await screen.findByText('Maths')).toBeInTheDocument(); expect(screen.queryByText('Science')).not.toBeInTheDocument(); expect(screen.getByText('Monday')).toBeInTheDocument();
});
