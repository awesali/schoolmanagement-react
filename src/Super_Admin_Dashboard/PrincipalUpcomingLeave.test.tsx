import React from 'react';
import { render, screen } from '@testing-library/react';
import PrincipalUpcomingLeave from './PrincipalUpcomingLeave';

test('shows approved leave on every overlapping day in the next ten day grid', async () => {
  localStorage.setItem('token', 'principal-token');
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ success: true, startDate: '2026-09-26', days: 10, data: [{ id: 7, staffName: 'Javed Ansari', leaveType: 'Casual Leave', fromDate: '2026-09-25', toDate: '2026-09-27' }] }) })) as any;
  render(<PrincipalUpcomingLeave refresh={0} />);
  expect((await screen.findAllByText('Javed Ansari'))).toHaveLength(2);
  expect(document.querySelectorAll('.pul-day')).toHaveLength(10);
});
