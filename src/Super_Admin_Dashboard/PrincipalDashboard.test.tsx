import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrincipalDashboard, { PrincipalData, percentage } from './PrincipalDashboard';

const data: PrincipalData = {
  schoolId: 7, schoolName: 'School Seven', date: '2026-09-24', academicYear: '2026–27', generatedAt: '2026-09-24T04:00:00Z',
  students: { total: 10, present: 6, absent: 1, late: 1, recorded: 7, unmarked: 3, pendingClasses: 1, classes: [
    { id: 1, name: '8 A', total: 10, recorded: 7, present: 6, absent: 1, late: 1, pending: 3 },
  ] },
  staff: { total: 2, present: 1, absent: 0, late: 0, onLeave: 0, unmarked: 1, people: [
    { id: 1, name: 'Teacher One', status: 'Present' }, { id: 2, name: 'Teacher Two', status: 'Not marked' },
  ] },
  academics: { classes: 1, scheduledPeriods: 7, homeworkPosted: 2, classActivity: [{ id: 1, name: '8 A', scheduledPeriods: 7, homeworkPosted: 2 }] },
  leaveRequests: [{ id: 4, staffName: 'Teacher One', leaveType: 'Casual Leave', fromDate: '2026-09-25', toDate: '2026-09-26', reason: 'Personal work', createdDate: '2026-09-24' }],
  finance: null, examinations: [],
};
beforeEach(() => {
  localStorage.setItem('token', 'principal-token');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => data });
});
const show = () => render(<PrincipalDashboard userName="School Principal" onLogout={jest.fn()} onProfile={jest.fn()} />);

test('renders actual attendance and drills down to missing records', async () => {
  show();
  expect(await screen.findByText('School Seven')).toBeInTheDocument();
  expect(screen.getByText('85.7%')).toBeInTheDocument();
  expect(screen.getByText('70%')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Finance' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /1 classes have attendance pending/ }));
  expect(screen.getByLabelText('Attendance pending only')).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: '8 A' }));
  expect(screen.getByRole('region', { name: 'Class attendance detail' })).toHaveTextContent('Expected: 10 · Recorded: 7 · Still missing: 3');
  fireEvent.change(screen.getByLabelText('Search classes'), { target: { value: '9 B' } });
  expect(screen.getByText('No classes match this view.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/principal/dashboard?date='), expect.objectContaining({ headers: { Authorization: 'Bearer principal-token' } }));
});
test('opens the current leave queue without exposing decision controls', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: /1 leave requests awaiting review/ }));
  expect(screen.getByText('Personal work')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
});
test('failed refresh clears old data and supports retry', async () => {
  show();
  await screen.findByText('School Seven');
  (global.fetch as jest.Mock).mockImplementation(async (url: string) => url.includes('/dashboard?') ? { ok: false, status: 403, json: async () => ({}) } : { ok: true, json: async () => ({ academicYear: '2026-27', rows: [] }) });
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('You do not have access');
  expect(screen.queryByText('85.7%')).not.toBeInTheDocument();
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => data });
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('85.7%')).toBeInTheDocument();
});
test('date change requests new data and empty attendance does not imply zero attendance', async () => {
  show();
  await screen.findByText('School Seven');
  (global.fetch as jest.Mock).mockImplementation(async (url: string) => ({ ok: true, json: async () => url.includes('/dashboard?') ? ({ ...data, students: { ...data.students, total: 0, present: 0, recorded: 0, classes: [], pendingClasses: 0, unmarked: 0 } }) : ({ academicYear: '2026-27', rows: [] }) }));
  fireEvent.change(screen.getByLabelText('Overview date'), { target: { value: '2026-01-01' } });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('date=2026-01-01'), expect.anything()));
  await waitFor(() => expect(screen.queryByText('85.7%')).not.toBeInTheDocument());
  expect(percentage(0, 0)).toBeNull();
});

test('daily brief is a report with actionable follow-ups rather than dashboard cards', async () => {
  show();
  await screen.findByText('School Seven');
  fireEvent.click(screen.getByRole('button', { name: 'Daily school brief' }));
  expect(screen.getByText('DAILY SCHOOL REPORT')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Follow-up register' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Attention required' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Students absent/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Review attendance records' }));
  expect(screen.getByRole('heading', { name: 'Attendance by class' })).toBeInTheDocument();
  expect(screen.getByLabelText('Attendance pending only')).toBeChecked();
});

test('academic audit reviews execution and opens attendance for a specific gap', async () => {
  show();
  await screen.findByText('School Seven');
  fireEvent.click(screen.getByRole('button', { name: 'Academic audit' }));
  expect(screen.getByRole('heading', { name: 'Class execution checklist' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Homework posted' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Absent' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '3 attendance records missing' }));
  expect(screen.getByLabelText('Search classes')).toHaveValue('8 A');
  expect(screen.getByRole('columnheader', { name: 'Attendance rate' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'Homework posted' })).not.toBeInTheDocument();
});

test('attendance filters use presence rate rather than recording completion', async () => {
  show();
  await screen.findByText('School Seven');
  fireEvent.click(screen.getByRole('button', { name: 'Student attendance' }));
  fireEvent.change(screen.getByLabelText('Attendance rate filter'), { target: { value: '75' } });
  expect(screen.getByText('No classes match this view.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Attendance rate filter'), { target: { value: '90' } });
  expect(screen.getByRole('button', { name: '8 A' })).toBeInTheDocument();
});
