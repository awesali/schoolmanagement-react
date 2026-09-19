import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ParentList from './ParentList';
import { ToastProvider } from '../components/Toast/Toast';

jest.mock('../security/Permissions', () => ({ usePermissions: () => ({ can: () => true }) }));

test('shows student photos and initials in parent details and opens a larger photo', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, headers: { get: () => 'application/json' },
    json: async () => ({ success: true, data: [{ id: 7, name: 'Parent', students: [
      { id: 41, studentName: 'First Child', profilePictureUrl: '/profilepictures/child.jpg' },
      { id: 42, studentName: 'Second Child' },
    ] }], currentPage: 1, totalPages: 1, totalRecords: 1 }) });
  const { container } = render(<ToastProvider><ParentList selectedSchoolId={3} /></ToastProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'View' }));
  expect(screen.getByRole('img', { name: 'Second Child initials' })).toHaveTextContent('SC');
  fireEvent.click(screen.getByRole('button', { name: "View First Child's profile photo" }));
  expect(screen.getByText('Profile Photo - First Child')).toBeInTheDocument();
  expect(container.querySelector('.staff-photo-preview img')).toHaveAttribute('src', expect.stringContaining('/profilepictures/child.jpg'));
  fireEvent.click(container.querySelector('.modal-close')!);
  expect(screen.getByText('Parent Details - Parent')).toBeInTheDocument();
});

test.each([true, false])('opens the clicked linked student ID card or shows a toast, success=%s', async success => {
  let finish: (value: any) => void = () => {};
  global.fetch = jest.fn().mockImplementation(url => String(url).includes('student-by-id')
    ? new Promise(resolve => { finish = resolve; })
    : Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({
      success: true, data: [{ id: 7, name: 'Parent', relationship: 'Father', students: [
        { id: 41, studentName: 'First Child' }, { id: 42, studentName: 'Second Child' },
      ] }], currentPage: 1, totalPages: 1, totalRecords: 1,
    }) }));
  const { container } = render(<ToastProvider><ParentList selectedSchoolId={3} /></ToastProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'View' }));
  fireEvent.click(screen.getByRole('button', { name: 'Second Child' }));
  expect(screen.getByText('Loading student profile...')).toBeInTheDocument();
  expect((fetch as jest.Mock).mock.calls[1][0]).toContain('student-by-id?studentId=42');
  await act(async () => finish({ ok: success, json: async () => ({ success, message: 'Unable to load profile.',
    data: { id: 42, studentName: 'Second Child', className: 'Class 2', sectionName: 'A',
      email: 'child@example.com', isActive: true } }) }));
  if (success) {
    expect(await screen.findByText('Student Identity Card')).toBeInTheDocument();
    expect(screen.getByText('Student ID: 42')).toBeInTheDocument();
    expect(screen.getByText('child@example.com')).toBeInTheDocument();
    expect(screen.getByText('Father', { selector: 'dd' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Parent' }).find(button => button.classList.contains('parent-profile-link'))!);
  } else {
    expect(await screen.findByText('Unable to load profile.')).toBeInTheDocument();
  }
  expect(screen.getByText('Parent Details - Parent')).toBeInTheDocument();
});

test('opens the requested parent even when absent from the first list page', async () => {
  global.fetch = jest.fn().mockImplementation(url => Promise.resolve({
    ok: true, headers: { get: () => 'application/json' }, json: async () => ({
      success: true, data: String(url).includes('parentId=77')
        ? [{ id: 77, name: 'Linked Parent', relationship: 'Mother', students: [] }]
        : [{ id: 1, name: 'Different Parent', students: [] }],
      currentPage: 1, totalPages: 8, totalRecords: 80,
    }),
  }));
  render(<ToastProvider><ParentList selectedSchoolId={3} initialParentId={77} /></ToastProvider>);
  expect(await screen.findByText('Parent Details - Linked Parent')).toBeInTheDocument();
  expect(screen.getByText('Mother')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Different Parent' })).toBeInTheDocument();
});

test.each([true, false])('edits parent from name with immediate loader and toast, success=%s', async success => {
  let finish: (value: any) => void = () => {};
  const parent = { id: 7, name: 'Test Parent', email: 'parent@example.com', phoneNumber: '9876543210',
    address: 'Old address', relationship: 'Father', isActive: true, students: [] };
  global.fetch = jest.fn().mockImplementation((_url, options) => options?.method === 'PUT'
    ? new Promise(resolve => { finish = resolve; })
    : Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({
      success: true, data: [parent], currentPage: 1, totalPages: 1, totalRecords: 1,
    }) }));
  const { container } = render(<ToastProvider><ParentList selectedSchoolId={3} /></ToastProvider>);
  fireEvent.click(await screen.findByRole('button', { name: 'Test Parent' }));
  expect(screen.getByLabelText('Email')).toHaveValue('parent@example.com');
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated Parent' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update Parent' }));
  expect(screen.getByText('Updating parent...')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Update Parent' })).toBeDisabled();
  fireEvent.submit(container.querySelector('#edit-parent-form')!);
  const saves = (fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'PUT');
  expect(saves).toHaveLength(1);
  expect(JSON.parse(saves[0][1].body)).toMatchObject({ id: 7, schoolId: 3, name: 'Updated Parent' });
  await act(async () => finish({ ok: success, json: async () => ({ success, message: 'This email is already used.' }) }));
  await waitFor(() => expect(screen.queryByText('Updating parent...')).not.toBeInTheDocument());
  if (success) {
    expect(screen.queryByText('Edit Parent')).not.toBeInTheDocument();
    expect(screen.getByText('Parent details updated successfully.')).toBeInTheDocument();
  } else {
    expect(screen.getByLabelText('Name')).toHaveValue('Updated Parent');
    expect(screen.getByText('This email is already used.').closest('.custom-toast')).toHaveClass('custom-toast--error');
  }
});
