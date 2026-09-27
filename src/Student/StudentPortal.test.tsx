import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
import StudentPortal from './StudentPortal';
import { API_BASE_URL } from '../config';

const overview = {
  profile: { studentName: 'Test Student', email: 'test@example.com', className: 'Class 8', sectionName: 'A', rollNumber: '12', schoolName: 'Test School' },
  timetable: [], homework: [], materials: [],
  attendance: [], exams: [], results: [], parent: null, teachers: [], documents: [], fees: [],
  payments: [], transport: null, diary: [], submissions: [], announcements: [],
  requests: [], messages: [], achievements: [], schoolEvents: [], gradeHistory: [],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
  window.scrollTo = jest.fn();
});

test('loads the student day without My Classes and keeps Timetable available', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: overview }) }) as jest.Mock;
  render(<StudentPortal />);
  expect(await screen.findByText(/Good .*Test/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'My Classes' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('navigation', { name: 'Student navigation' }).querySelector('button')!.nextElementSibling as HTMLButtonElement);
  expect(screen.getByText('Weekly timetable')).toBeInTheDocument();
});

test('shows a useful error when the API returns plain text', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'System.InvalidOperationException' }) as jest.Mock;
  render(<StudentPortal />);
  await waitFor(() => expect(screen.getByText(/Student API is unavailable/)).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});




test('Upcoming excludes submitted work and Submitted shows it', async () => {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const withHomework = {
    ...overview,
    homework: [
      { id: 1, title: 'Already sent', subjectName: 'Mathematics', description: 'Done', dueDate: tomorrow },
      { id: 2, title: 'Still due', subjectName: 'Mathematics', description: 'Pending', dueDate: tomorrow },
    ],
    submissions: [{ id: 10, assignmentId: 1, status: 'Submitted', submittedAt: today.toISOString() }],
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: withHomework }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getAllByRole('button', { name: 'Homework' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }));
  expect(screen.queryByText('Already sent')).not.toBeInTheDocument();
  expect(screen.getByText('Still due')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Submitted' }));
  expect(screen.getByText('Already sent')).toBeInTheDocument();
  expect(screen.queryByText('Still due')).not.toBeInTheDocument();
});


test('study materials show clear download and link actions', async () => {
  const data = { ...overview, materials: [
    { id: 3, resourceType: 'PDF', title: 'Algebra notes', subjectName: 'Mathematics', description: 'Chapter one', resourceUrl: 'upload:sample.pdf' },
    { id: 4, resourceType: 'Link', title: 'Reading guide', subjectName: 'English', resourceUrl: 'https://example.com/guide' },
  ] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getByRole('button', { name: 'Study Materials' }));
  expect(screen.getByText('Algebra notes')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download file' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open link' })).toHaveAttribute('href', 'https://example.com/guide');
});

test('Exams shows the published timetable', async () => {
  const examDate = new Date(Date.now() + 86400000).toISOString();
  const data = { ...overview, exams: [{ id: 9, examName: 'Annual', subjectName: 'Science', examDate, startTime: '09:00', endTime: '10:00' }] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getByRole('navigation', { name: 'Student navigation' }).querySelector('button[title="Exams"]') || screen.getAllByRole('button', { name: 'Exams' })[0]);
  expect(screen.getByText('Exam schedule')).toBeInTheDocument();
  expect(screen.queryByText('Earlier exams')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Annual.*View timetable/ })).toBeInTheDocument();
});

test('requests show history first and open the form on demand', async () => {
  const data = { ...overview, requests: [{ id: 9, type: 'General', subject: 'Bus query', status: 'Pending', details: 'Question', createdAt: '2026-09-27T09:00:00' }] };
  global.fetch = jest.fn().mockImplementation(async (url: string) => String(url).includes('request-recipients')
    ? { ok: true, json: async () => ({ success: true, data: { roles: [], recipients: [] } }) }
    : { ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getByRole('button', { name: 'Requests' }));
  expect(screen.getByText(/Bus query/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Subject')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'New request' }));
  expect(screen.getByLabelText('Subject')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByLabelText('Subject')).not.toBeInTheDocument();
});
test('fees show total, paid and pending balances after partial payments', async () => {
  const data = {
    ...overview,
    fees: [
      { id: 1, feeType: 'Tuition', amount: 1000, status: 'Partial' },
      { id: 2, feeType: 'Transport', amount: 300, status: 'Pending' },
    ],
    payments: [
      { id: 10, studentFeeId: 1, amountPaid: 200, payment_Date: '2026-09-27T09:00:00', receipt_Number: 'R1', payment_Mode: 'Cash' },
      { id: 11, studentFeeId: 1, amountPaid: 100, payment_Date: '2026-09-27T10:00:00', receipt_Number: 'R2', payment_Mode: 'Cash' },
    ],
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getByRole('button', { name: 'Fees' }));
  expect(screen.getByText('₹1,300')).toBeInTheDocument();
  expect(screen.getByText('₹300')).toBeInTheDocument();
  expect(screen.getByText('₹1,000')).toBeInTheDocument();
  expect(screen.getByText('Pending ₹700')).toBeInTheDocument();
  expect(screen.getByText('Pending ₹300')).toBeInTheDocument();
});
test('transport shows route, billed totals and its own payment history', async () => {
  const data = {
    ...overview,
    transport: { routeName: 'North Route', vehicleNumber: 'BUS-12', monthlyFee: 750, feeType: 'Monthly', pickupStop: 'Main Gate' },
    transportFees: [
      { id: 31, feeMonth: 9, feeYear: 2026, amount: 750, paidAmount: 500, status: 'Partial', dueDate: '2026-09-10T00:00:00' },
      { id: 32, feeMonth: 10, feeYear: 2026, amount: 750, paidAmount: 0, status: 'Pending', dueDate: '2026-10-10T00:00:00' },
    ],
    transportPayments: [
      { id: 41, transportFeeId: 31, amount: 500, paymentDate: '2026-09-12T00:00:00', paymentMode: 'Cash', receiptNumber: 'TR-41' },
    ],
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getByRole('button', { name: 'Transport' }));
  expect(screen.getByText('North Route')).toBeInTheDocument();
  expect(screen.getByText('BUS-12')).toBeInTheDocument();
  expect(screen.getByText('₹750 / Monthly')).toBeInTheDocument();
  expect(screen.getByText('₹1,500')).toBeInTheDocument();
  expect(screen.getAllByText('₹500').length).toBeGreaterThan(0);
  expect(screen.getByText('₹1,000')).toBeInTheDocument();
  expect(screen.getByText('Receipt TR-41')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^View receipt:/ }));
  expect(screen.getByRole('dialog', { name: 'Transport receipt' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Print / Save PDF' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close transport receipt' }));
  expect(screen.queryByRole('dialog', { name: 'Transport receipt' })).not.toBeInTheDocument();
  expect(screen.getByText('October 2026')).toBeInTheDocument();
});
test('documents open backend-relative files and profile actions live in the header', async () => {
  mockNavigate.mockReset();
  const data = { ...overview, documents: [
    { id: 5, documentName: 'Birth certificate', fileUrl: '/studentdocs/10/birth.pdf', createdDate: '2026-09-27T00:00:00' },
    { id: 6, documentName: 'Old document', fileUrl: '', createdDate: '2026-09-27T00:00:00' },
  ] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  expect(screen.queryByText('Personal')).not.toBeInTheDocument();
  const header = screen.getByRole('banner');
  expect(header).toHaveTextContent('Welcome, Test Student');
  expect(header).toContainElement(screen.getByRole('button', { name: 'Student profile menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
  expect(document.querySelector('.sp-layout')).toHaveClass('sp-sidebar-collapsed');
  fireEvent.click(screen.getAllByRole('button', { name: 'Documents' })[0]);
  expect(screen.getByRole('link', { name: /^View document:/ })).toHaveAttribute('href', new URL('/studentdocs/10/birth.pdf', API_BASE_URL).toString());
  expect(screen.getByText('File unavailable')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Student profile menu' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Profile' }));
  expect(screen.getByText('My profile')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Student profile menu' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Logout' }));
  expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
});
test('Recent results opens the selected report card without showing marks on Today', async () => {
  const data = { ...overview, results: [
    { examId: 4, examName: 'Midterm', totalMarks: 100, obtainedMarks: 70 },
    { examId: 5, examName: 'Annual', totalMarks: 100, obtainedMarks: 80 },
  ] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText('Recent results');
  expect(screen.queryByText('70 / 100')).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: /^View result:/ })[1]);
  expect(screen.getByRole('article', { name: 'Annual report card' })).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'Midterm report card' })).not.toBeInTheDocument();
});
test('Today counts upcoming exams rather than subject papers', async () => {
  const examDate = new Date(Date.now() + 86400000).toISOString();
  const data = { ...overview, exams: [
    { id: 10, examId: 4, examName: 'Annual', subjectName: 'Maths', examDate },
    { id: 11, examId: 4, examName: 'Annual', subjectName: 'English', examDate },
    { id: 12, examId: 5, examName: 'Midterm', subjectName: 'Science', examDate },
  ] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  expect(screen.getByText('Upcoming exams').closest('div')).toHaveTextContent('2');
});
test('header bell opens a notice, tracks unread count, and keeps deleted items hidden', async () => {
  const data = { ...overview, announcements: [
    { id: 21, title: 'Sports day', body: 'Friday assembly', createdAt: '2026-09-27T09:00:00' },
    { id: 22, title: 'Library hours', body: 'New schedule', createdAt: '2026-09-27T10:00:00' },
  ] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  const view = render(<StudentPortal />);
  await screen.findByRole('button', { name: 'Notifications, 2 unread' });
  expect(screen.queryByRole('button', { name: 'Notifications' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete notification: Library hours' }));
  expect(screen.queryByText('Library hours')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Sports day New school announcement/ }));
  expect(screen.getAllByRole('heading', { name: 'Announcements' }).length).toBeGreaterThan(0);
  expect(localStorage.getItem('student-notifications:test@example.com')).toContain('"notice:21":"read"');
  view.unmount();
  render(<StudentPortal />);
  await screen.findByRole('button', { name: 'Notifications, 0 unread' });
  fireEvent.click(screen.getByRole('button', { name: 'Notifications, 0 unread' }));
  expect(screen.queryByText('Library hours')).not.toBeInTheDocument();
});