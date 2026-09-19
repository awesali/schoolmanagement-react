import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import FinanceManagement from './FinanceManagement';
import { ToastProvider } from '../components/Toast/Toast';
jest.mock('../security/Permissions', () => ({ usePermissions: () => ({ can: () => true }) }));

test('edits an assigned fee and prevents reducing it below paid amount', async () => {
  global.fetch = jest.fn().mockImplementation(async (url, options) => ({ ok: true, json: async () => {
    if (options?.method === 'PUT') return { success: true };
    if (String(url).includes('enrollment-info')) return { success: true, data: {
      sessions: [{ id: 1, yearStart: '2026-01-01', yearEnd: '2027-01-01', isActive: true }],
      classes: [{ id: 2, name: '2nd' }], sections: [{ id: 3, name: 'A', classId: 2 }],
    } };
    if (String(url).includes('GetPendingFees')) return [{ studentFeeId: 9, studentId: 4, studentName: 'Student',
      feeTypeId: 1, feeType: 'Tuition', amount: 1000, paid: 400, balance: 600, status: 'Partial' }];
    return [];
  } }));
  const { container } = render(<ToastProvider><FinanceManagement selectedSchoolId={1} /></ToastProvider>);
  fireEvent.click(screen.getByRole('tab', { name: 'Assigned Fees' }));
  await screen.findByRole('option', { name: '2nd' });
  fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: '2' } });
  fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Load Assigned Fees' }));
  await screen.findByText('Manage (1)');
  fireEvent.click(screen.getByText('Manage (1)'));
  fireEvent.click(screen.getByRole('button', { name: 'Edit Tuition' }));
  fireEvent.change(screen.getByLabelText('Fee amount *'), { target: { value: '300' } });
  fireEvent.submit(container.querySelector('#edit-assigned-fee')!);
  expect((fetch as jest.Mock).mock.calls.filter(([, o]) => o?.method === 'PUT')).toHaveLength(0);
  fireEvent.change(screen.getByLabelText('Fee amount *'), { target: { value: '800' } });
  fireEvent.submit(container.querySelector('#edit-assigned-fee')!);
  await waitFor(() => expect(screen.queryByText('Edit Assigned Fee')).not.toBeInTheDocument());
  const saves = (fetch as jest.Mock).mock.calls.filter(([, o]) => o?.method === 'PUT');
  expect(JSON.parse(saves[0][1].body)).toEqual({ studentFeeId: 9, schoolId: 1, amount: 800 });
});
