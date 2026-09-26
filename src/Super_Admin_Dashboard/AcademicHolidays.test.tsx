import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AcademicHolidays from './AcademicHolidays';
const sessions = [{ id: 14, yearStart: '2026-04-02T00:00:00', yearEnd: '2027-05-19T00:00:00', isActive: true }];
beforeEach(() => { localStorage.setItem('token', 'admin-token'); global.fetch = jest.fn(async (_: any, init?: RequestInit) => ({ ok: true, json: async () => init?.method === 'POST' ? { success: true } : { success: true, data: [{ id: 1, title: 'Founders Day', eventDate: '2026-09-23T00:00:00', endDate: '2026-09-23T00:00:00' }] } })) as any; });
test('lists holidays for the selected school year and submits valid dates', async () => {
  render(<AcademicHolidays schoolId={2} sessions={sessions} />);
  expect(await screen.findByText('Founders Day')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Holiday name'), { target: { value: 'Winter break' } });
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-12-20' } });
  fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-12-31' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add holiday' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/AcademicHolidays'), expect.objectContaining({ method: 'POST', body: expect.stringContaining('Winter break') })));
});
