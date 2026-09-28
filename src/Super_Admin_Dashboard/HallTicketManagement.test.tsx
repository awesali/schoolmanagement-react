import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HallTicketManagement from './HallTicketManagement';

const options = {
  classes: [{ id: 1, className: 'Class 6' }, { id: 2, className: 'Class 7' }],
  sections: [{ id: 11, classId: 1, sectionName: 'A' }, { id: 22, classId: 2, sectionName: 'B' }],
  students: [
    { id: 101, classId: 1, sectionId: 11, sessionId: 9, studentName: 'Asha', rollNumber: '6' },
    { id: 102, classId: 1, sectionId: 11, sessionId: 9, studentName: 'Neha', rollNumber: '7' },
    { id: 202, classId: 2, sectionId: 22, sessionId: 9, studentName: 'Ravi', rollNumber: '7' },
  ],
};
const tickets = [{ id: 5, studentId: 101, studentName: 'Asha', examId: 30, examName: 'Annual', sessionId: 9,
  seatNumber: 'S1', room: 'R1', venue: 'Main Hall', documentUrl: '', isPublished: true }];

beforeEach(() => {
  localStorage.setItem('token', 'test-token');
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const data = url.includes('hall-ticket-options') ? options : url.includes('exam-options')
      ? [{ id: 30, name: 'Annual', sessionId: 9 }] : url.includes('hall-tickets') && !init?.method ? tickets : { id: 5 };
    return { ok: true, json: async () => ({ success: true, data }) } as Response;
  });
});

test('keeps the form closed until editing a ticket', async () => {
  render(<HallTicketManagement schoolId={3} />);
  await screen.findByRole('button', { name: 'Edit ticket' });
  expect(screen.queryByLabelText('Student')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit ticket' }));
  expect(screen.getByLabelText('Student')).toHaveValue('101');
  fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'R2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/hall-tickets/5'), expect.objectContaining({ method: 'PUT' })
  ));
});

test('creates every student ticket in class order with seats per room', async () => {
  render(<HallTicketManagement schoolId={3} />);
  await screen.findByRole('button', { name: 'Create class tickets' });
  fireEvent.click(screen.getByRole('button', { name: 'Create class tickets' }));
  fireEvent.change(screen.getByLabelText('Class'), { target: { value: '1' } });
  expect(within(screen.getByLabelText('Class')).queryByRole('option', { name: 'Class 7' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Exam'), { target: { value: '30' } });
  fireEvent.change(screen.getByLabelText('Seats per room'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create 2 tickets' }));
  await waitFor(() => expect((global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(2));
  const posts = (global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'POST');
  expect(posts.map(([, init]) => JSON.parse(init.body))).toEqual([
    expect.objectContaining({ studentId: 101, room: 'Room 1', seatNumber: '1' }),
    expect.objectContaining({ studentId: 102, room: 'Room 2', seatNumber: '1' }),
  ]);
});
test('deletes tickets only for the selected school after confirmation', async () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<HallTicketManagement schoolId={3} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete all existing tickets' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/hall-tickets?schoolId=3'), expect.objectContaining({ method: 'DELETE' })
  ));
  expect(confirm).toHaveBeenCalledWith(expect.stringContaining('1 existing hall tickets'));
  confirm.mockRestore();
});