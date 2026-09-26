import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StaffCareerActions, StaffChangeHistory } from './StaffCareer';
const mockSuccess = jest.fn(), mockError = jest.fn();
jest.mock('../components/Toast/Toast', () => ({ useToast: () => ({ success: mockSuccess, error: mockError }) }));
const staff = { id: 7, roleId: 3, roleName: 'Teacher', name: 'Test Teacher', isActive: true };
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem('token', 'test'); global.fetch = jest.fn() as any; });
test('promotion requires a reason and submits the expected role and school', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, message: 'Promoted to Principal.' }) });
  const refresh = jest.fn();
  render(<StaffCareerActions staff={staff} schoolId={2} onSuccess={refresh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Promote to Principal' }));
  const submit = screen.getAllByRole('button', { name: 'Promote to Principal' })[1];
  expect(submit).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason for change'), { target: { value: 'Leadership appointment' } });
  fireEvent.click(submit);
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/staff-career/7/role'), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ schoolId: 2, expectedRoleId: 3, action: 'promote', reason: 'Leadership appointment' }) }));
});
test('principal can be demoted and a rejected change preserves the dialog', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ message: 'The role has changed. Refresh the profile and try again.' }) });
  const refresh = jest.fn();
  render(<StaffCareerActions staff={{ ...staff, roleName: 'Principal' }} schoolId={2} onSuccess={refresh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Demote to Teacher' }));
  fireEvent.change(screen.getByLabelText('Reason for change'), { target: { value: 'Returning to teaching' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Demote to Teacher' })[1]);
  await waitFor(() => expect(mockError).toHaveBeenCalledWith(expect.stringContaining('role has changed')));
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Reason for change')).toHaveValue('Returning to teaching');
});
test('inactive staff cannot change role', () => {
  render(<StaffCareerActions staff={{ ...staff, isActive: false }} schoolId={2} onSuccess={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Promote to Principal' })).toBeDisabled();
});
test('history shows before/after, actor, reason and paginates', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ success: true, totalPages: 2, data: [{ id: 1, action: 'Staff: Modified', createdAt: '2026-09-26T09:00:00Z', actor: 'School Admin', before: { RoleId: 'Teacher' }, after: { values: { RoleId: 'Principal' }, reason: 'Leadership appointment' } }] }) });
  render(<StaffChangeHistory staffId={7} schoolId={2} />);
  expect(await screen.findByText('Teacher → Principal')).toBeInTheDocument();
  expect(screen.getByText(/School Admin/)).toBeInTheDocument();
  expect(screen.getByText('Reason: Leadership appointment')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('schoolId=2&page=2'), expect.anything()));
});
test('history failure is distinct from empty history and can retry', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'History unavailable' }) }).mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [], totalPages: 0 }) });
  render(<StaffChangeHistory staffId={7} schoolId={2} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('History unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry history' }));
  expect(await screen.findByText('No changes recorded yet.')).toBeInTheDocument();
});