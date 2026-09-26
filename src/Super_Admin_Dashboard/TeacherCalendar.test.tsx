import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherCalendar from './TeacherCalendar';
import { localDate } from './TeacherWorkspace';
const response = (data: any) => ({ ok: true, text: async () => JSON.stringify({ success: true, data }) });
beforeEach(() => {
  localStorage.setItem('token', 'teacher-token');
  global.fetch = jest.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/timetable')) return { ok: true, text: async () => JSON.stringify({ success: true, slots: [{ id: 'one', day: new Date().getDay(), period: 1, start: '09:00', end: '09:45', className: '8 - A', subject: 'Mathematics', sectionId: 7 }] }) };
    if (url.includes('/calendar')) return response([{ date: localDate() + 'T10:00:00', title: 'Exam: Mathematics', type: 'Exam', detail: '10:00' }, { date: localDate(), title: 'Invigilate 8 - A', type: 'Invigilation', detail: '10:00-11:00 - Main duty' }, { date: localDate(), title: 'Founders Day', type: 'Holiday', detail: 'School closed' }]);
    if (url.includes('/StaffLeaveAllocations/mine')) return response({ sessionStart: '2026-04-01', sessionEnd: '2027-03-31', balances: [{ leaveType: 'Casual Leave', allotted: 8, used: 2, pending: 1, remaining: 5 }] });
    if (url.endsWith('/leave') && init?.method === 'POST') return response({ id: 9 });
    if (url.endsWith('/leave')) return response([]);
    throw new Error(url);
  }) as any;
});
test('shows the teacher timetable and this week events', async () => {
  render(<TeacherCalendar onNavigate={jest.fn()} />);
  expect(await screen.findByRole('button', { name: /Mathematics/ })).toBeInTheDocument();
  expect(await screen.findByText('Exam: Mathematics')).toBeInTheDocument();
  expect(document.querySelector('.tc-calendar-event-exam')).not.toBeInTheDocument();
  expect(document.querySelector('.tc-day-event-exam')).not.toBeInTheDocument();
  expect((await screen.findAllByText('Invigilate 8 - A')).some(node => !!node.closest('.tc-calendar-event-invigilation'))).toBe(true);
  expect(document.querySelector('.tc-calendar-event-invigilation')).toHaveStyle({ height: '84px' });
  expect(screen.getByText("This week's events")).toBeInTheDocument();
  expect(screen.getByText('Casual Leave')).toBeInTheDocument();
  expect(screen.getByText('5')).toBeInTheDocument();
  expect((await screen.findAllByText(/Founders Day/)).some(node => !!node.closest('.tc-day-event-holiday'))).toBe(true);
});
test('submits leave through the existing teacher leave endpoint', async () => {
  render(<TeacherCalendar onNavigate={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Apply for leave' }));
  fireEvent.change(screen.getByLabelText('Reason *'), { target: { value: 'Medical appointment' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/Teacher/leave'), expect.objectContaining({ method: 'POST', body: expect.stringContaining('Medical appointment') })));
});
