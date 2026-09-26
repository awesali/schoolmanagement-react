import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PrincipalLeaveDecisions from './PrincipalLeaveDecisions';

test('shows a readable leave request and sends an approval decision', async () => {
  localStorage.setItem('token', 'principal-token');
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true }) })) as any;
  const onChanged = jest.fn();
  render(<PrincipalLeaveDecisions onChanged={onChanged} requests={[{ id: 1, staffName: 'Javed Ansari', leaveType: 'Casual Leave', fromDate: '2026-09-30', toDate: '2026-09-30', reason: 'Family appointment', createdDate: '2026-09-26' }]} />);
  expect(screen.getByText('Javed Ansari')).toBeInTheDocument();
  expect(screen.getByText('Family appointment')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search by teacher name'), { target: { value: 'nobody' } });
  expect(screen.getByText('No matching requests')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search by teacher name'), { target: { value: 'Javed' } });
  fireEvent.click(screen.getByRole('button', { name: 'Approve leave' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/principal/leave/1/decision'), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ status: 'Approved' }) })));
  await waitFor(() => expect(onChanged).toHaveBeenCalled());
});
