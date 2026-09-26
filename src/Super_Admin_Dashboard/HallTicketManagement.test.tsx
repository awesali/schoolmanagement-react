import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HallTicketManagement from './HallTicketManagement';

const options = {
  classes: [{ id: 1, className: 'Class 6' }, { id: 2, className: 'Class 7' }],
  sections: [{ id: 11, classId: 1, sectionName: 'A' }, { id: 22, classId: 2, sectionName: 'B' }],
  students: [{ id: 101, classId: 1, sectionId: 11, sessionId: 9, studentName: 'Asha', rollNumber: '6' },
    { id: 202, classId: 2, sectionId: 22, sessionId: 9, studentName: 'Ravi', rollNumber: '7' }],
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

test('filters sections and students by class, then loads an existing ticket into edit mode', async () => {
  render(<HallTicketManagement schoolId={3} />);
  await screen.findByRole('option', { name: 'Class 6' });
  fireEvent.change(screen.getByLabelText('Class'), { target: { value: '1' } });
  expect(within(screen.getByLabelText('Section')).queryByRole('option', { name: 'B' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Section'), { target: { value: '11' } });
  expect(within(screen.getByLabelText('Student')).queryByRole('option', { name: /Ravi/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit ticket' }));
  expect(screen.getByLabelText('Class')).toHaveValue('1');
  expect(screen.getByLabelText('Section')).toHaveValue('11');
  expect(screen.getByLabelText('Student')).toHaveValue('101');
  expect(screen.getByLabelText('Exam')).toHaveValue('30');
  fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'R2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/hall-tickets/5'), expect.objectContaining({ method: 'PUT' })
  ));
});
