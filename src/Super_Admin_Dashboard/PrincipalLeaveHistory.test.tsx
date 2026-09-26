import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrincipalLeaveHistory from './PrincipalLeaveHistory';

test('shows leave decisions and filters history by status', async () => {
  localStorage.setItem('token', 'principal-token');
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true, total: 1, data: [{ id: 3, staffName: 'Javed Ansari', leaveType: 'Casual Leave', fromDate: '2026-09-30', toDate: '2026-09-30', reason: 'Family appointment', status: 'Approved', adminRemarks: 'Approved', createdDate: '2026-09-26' }] }) })) as any;
  render(<PrincipalLeaveHistory refresh={0} />);
  expect(await screen.findByText('Javed Ansari')).toBeInTheDocument();
  expect(screen.getByText('Family appointment')).toBeInTheDocument();
  expect(screen.getByText(/Decision remarks:/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Approved' } });
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('status=Approved'), expect.anything()));
  fireEvent.change(screen.getByLabelText('Leave from'), { target: { value: '2026-09-01' } });
  fireEvent.change(screen.getByLabelText('Leave to'), { target: { value: '2026-09-30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('fromDate=2026-09-01&toDate=2026-09-30'), expect.anything()));
});
