import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeacherStudentLeaveRequests from './TeacherStudentLeaveRequests';
import { teacherRequest } from './TeacherWorkspace';

jest.mock('./TeacherWorkspace', () => ({
  teacherRequest: jest.fn(),
}));
const request = teacherRequest as jest.Mock;

test('class teacher can approve a student leave request and refresh the inbox', async () => {
  request.mockReset();
  const row = {
    id: 1, studentName: 'Asha', className: '10th', sectionName: 'A',
    subject: 'Family visit', details: 'Two days', fromDate: '2026-10-01',
    toDate: '2026-10-02', status: 'Pending', response: null, createdAt: '2026-09-26',
  };
  request.mockImplementation(async (url: string, options?: RequestInit) => {
    if (options?.method === 'POST') {
      expect(url).toBe('/api/Teacher/student-leave-requests/1/respond');
      expect(JSON.parse(String(options.body))).toEqual({ status: 'Approved', response: 'Approved for two days' });
      row.status = 'Approved';
      return { success: true };
    }
    return { success: true, data: [row] };
  });
  render(<TeacherStudentLeaveRequests />);
  expect(await screen.findByText('Asha - 10th / A')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Response (optional)' }), { target: { value: 'Approved for two days' } });
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  await waitFor(() => expect(screen.getByText('Approved')).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
});
