import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrincipalInvigilation from './PrincipalInvigilation';

const data = { schedules: [{ id: 12, examDate: '2026-09-26', startTime: '09:00:00', endTime: '10:00:00', examName: 'Half Yearly', className: '8', sectionName: 'A', subjectName: 'Maths' }], teachers: [{ id: 4, name: 'Ms Rao' }], assignments: [] };
beforeEach(() => {
  localStorage.setItem('token', 'principal-token');
  global.fetch = jest.fn(async (_input: any, init?: RequestInit) => ({ ok: true, json: async () => init?.method === 'POST' ? { success: true } : { success: true, data } })) as any;
});
test('principal assigns a teacher to a scheduled exam', async () => {
  render(<PrincipalInvigilation />);
  await screen.findByRole('option', { name: /Half Yearly/ });
  fireEvent.change(screen.getByLabelText('Scheduled exam'), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText('Teacher'), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Assign invigilator' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/principal/invigilation'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ scheduleId: 12, staffId: 4, dutyType: 'Main' }) })));
});
