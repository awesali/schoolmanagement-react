import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StaffLeaveAllowanceEditor from './StaffLeaveAllowanceEditor';

const types = ['Casual Leave', 'Sick Leave', 'Planned Leave', 'Unpaid Leave', 'Earned Leave'];
const result = (data: unknown) => ({ ok: true, json: async () => ({ success: true, data }) });
beforeEach(() => {
  localStorage.setItem('token', 'admin-token');
  global.fetch = jest.fn(async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('academic-sessions')) return result({ data: [] });
    if (url.endsWith('/all') && init?.method === 'PUT') return result(null);
    if (url.includes('/StaffLeaveAllocations/staff/')) return result({ balances: types.map(leaveType => ({ leaveType, allotted: 0, used: 0, pending: 0, remaining: 0 })) });
    return result([{ id: 14, yearStart: '2026-04-02', yearEnd: '2027-05-19', isActive: true }]);
  }) as any;
});
test('saves all five allowances with one action', async () => {
  (global.fetch as jest.Mock).mockImplementation(async (input: any, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('academic-sessions')) return result([{ id: 14, yearStart: '2026-04-02', yearEnd: '2027-05-19', isActive: true }]);
    if (url.endsWith('/all') && init?.method === 'PUT') return result(null);
    return result({ balances: types.map(leaveType => ({ leaveType, allotted: 0, used: 0, pending: 0, remaining: 0 })) });
  });
  render(<StaffLeaveAllowanceEditor schoolId={3} staffId={8} canEdit />);
  fireEvent.change(await screen.findByLabelText('Casual Leave days'), { target: { value: '8' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save allowances' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/staff/8/all'), expect.objectContaining({ method: 'PUT', body: expect.stringContaining('"days":8') })));
  const call = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'PUT');
  expect(JSON.parse(call[1].body).allowances).toHaveLength(5);
});
