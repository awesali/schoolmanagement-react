import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentProfile from './StudentProfile';
const mockError = jest.fn();
let mockCan = (_: string, __?: string) => true;
jest.mock('react-router-dom', () => ({ useParams: () => ({ schoolId: '2', studentId: '7' }), Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>, Navigate: () => null }), { virtual: true });
jest.mock('../security/Permissions', () => ({ usePermissions: () => ({ can: mockCan, loading: false }) }));
jest.mock('../components/Toast/Toast', () => ({ useToast: () => ({ error: mockError, success: jest.fn() }) }));
jest.mock('./EditStudent', () => () => null);
const student = { id: 7, schoolId: 2, studentName: 'Test Student', dob: '2014-01-01', classId: 3, sectionId: 4, className: '6th', sectionName: 'A', parentId: 9, parentName: 'Test Parent', parentRelationship: 'Mother', rollNumber: '12', documents: [], isActive: true };
const response = (data: any, status = 200) => Promise.resolve({ ok: status === 200, status, json: async () => data });
beforeEach(() => { mockCan = () => true; mockError.mockReset(); localStorage.setItem('token', 'test'); global.fetch = jest.fn(() => response({ success: true, data: student })) as any; });
const mount = () => render(<StudentProfile />);
test('profile loads by student ID, links parent and has printable ID card without edit inside it', async () => {
 mount(); await screen.findByRole('heading', { name: 'Test Student' });
 expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('student-by-id?studentId=7'), expect.anything());
 expect(screen.getByText('Test Parent')).toHaveAttribute('href', '/dashboard?schoolId=2&page=Parent%20List&parentId=9');
 fireEvent.click(screen.getByRole('button', { name: 'ID Card' }));
 expect(screen.getByRole('button', { name: 'Print ID Card' })).toBeInTheDocument();
 expect(screen.getAllByRole('button', { name: 'Edit Profile' })).toHaveLength(1);
});
test('school mismatch does not expose student profile or load connected data', async () => {
 (global.fetch as jest.Mock).mockImplementation(() => response({ data: { ...student, schoolId: 8 } }));
 mount(); expect(await screen.findByText('Student not found in this school.')).toBeInTheDocument(); expect(screen.queryByText('Test Student')).not.toBeInTheDocument();
});
test('attendance stays scoped to student ID and supports empty history', async () => {
 (global.fetch as jest.Mock).mockImplementation((url: string) => url.includes('profile-attendance') ? response([{ studentId: 7, attendanceDate: '2026-09-01', status: 'Present' }, { studentId: 8, attendanceDate: '2026-09-01', status: 'Absent' }]) : response({ data: student }));
 mount(); await screen.findByRole('heading', { name: 'Test Student' }); fireEvent.click(screen.getByRole('button', { name: 'Attendance' }));
 expect(await screen.findByText('1 Present / 0 Absent / 1 recorded days')).toBeInTheDocument();
});
test('all fee types and payment receipt are connected', async () => {
 (global.fetch as jest.Mock).mockImplementation((url: string) => {
  if (url.includes('GetStudentFees')) return response([{ feeType: 'School', totalAmount: 1000, paidAmount: 500, balance: 500 }, { feeType: 'Mess', totalAmount: 100, paidAmount: 0, balance: 100 }]);
  if (url.includes('GetPaymentHistory')) return response([{ paymentId: 33, feeType: 'School', amountPaid: 500 }]);
  if (url.includes('GetReceipt')) return response({ receiptNumber: 'R33', studentName: 'Test Student', amountPaid: 500 });
  return response({ data: student });
 });
 mount(); await screen.findByRole('heading', { name: 'Test Student' }); fireEvent.click(screen.getByRole('button', { name: 'Fees & Payments' }));
 expect(await screen.findByText('Mess')).toBeInTheDocument(); fireEvent.click(screen.getByRole('button', { name: 'View Receipt' }));
 expect(await screen.findByText('R33')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Print Receipt' })).toBeInTheDocument();
});
test('transport fee and payment linkage excludes other students', async () => {
 (global.fetch as jest.Mock).mockImplementation((url: string) => {
  if (url.includes('Transport/allocations')) return response({ data: [{ id: 10, studentId: 7, vehicleNumber: 'OWN', isActive: true }, { id: 11, studentId: 8, vehicleNumber: 'OTHER' }] });
  if (url.includes('Transport/fees')) return response({ data: [{ id: 20, studentTransportAllocationId: 10 }, { id: 21, studentTransportAllocationId: 11 }] });
  if (url.includes('Transport/payments')) return response({ data: [{ transportFeeId: 20, receiptNumber: 'OWN RECEIPT' }, { transportFeeId: 21, receiptNumber: 'OTHER RECEIPT' }] });
  return response({ data: student });
 });
 mount(); await screen.findByRole('heading', { name: 'Test Student' }); fireEvent.click(screen.getByRole('button', { name: 'Transport' }));
 expect(await screen.findByText('OWN RECEIPT')).toBeInTheDocument(); expect(screen.queryByText('OTHER RECEIPT')).not.toBeInTheDocument(); expect(screen.queryByText('OTHER')).not.toBeInTheDocument();
});
test('restricted tabs do not request protected APIs and errors use toaster', async () => {
 mockCan = page => page === 'management.students'; mount(); await screen.findByRole('heading', { name: 'Test Student' });
 expect(screen.queryByRole('button', { name: 'Fees & Payments' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Transport' })).not.toBeInTheDocument(); expect(global.fetch).toHaveBeenCalledTimes(1);
 (global.fetch as jest.Mock).mockImplementation(() => response({}, 500)); fireEvent.click(screen.getByRole('button', { name: 'Documents' })); await waitFor(() => expect(mockError).toHaveBeenCalled());
});
test('class teacher links to staff profile and timetable comes from the current section', async () => {
 (global.fetch as jest.Mock).mockImplementation((url: string) => {
  if (url.includes('calss-list')) return response({ data: [{ id: 3, sections: [{ id: 4, staffId: 15, subjects: [{ subjectId: 11, subjectName: 'Mathematics' }] }] }], totalPages: 1 });
  if (url.includes('Staff-by-school')) return response({ data: [{ id: 15, name: 'Class Teacher' }] });
  if (url.includes('get-timetable')) return response({ data: { periods: [{ id: 8, startTime: '09:00:00', endTime: '09:45:00' }], slots: [{ dayOfWeek: 1, periodId: 8, subjectName: 'Science' }] } });
  return response({ data: student });
 });
 mount(); await screen.findByRole('heading', { name: 'Test Student' }); fireEvent.click(screen.getByRole('button', { name: 'Class & Timetable' }));
 expect(await screen.findByText('Class Teacher')).toHaveAttribute('href', '/dashboard/schools/2/staff/15');
 expect(screen.getByText('Mathematics')).toBeInTheDocument(); expect(screen.getByText('Science')).toBeInTheDocument(); expect(screen.getByText('Monday')).toBeInTheDocument();
 expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('get-timetable?sectionId=4'), expect.anything());
});
