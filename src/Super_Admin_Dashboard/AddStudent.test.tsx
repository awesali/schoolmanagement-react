import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddStudent from './AddStudent';

jest.mock('../components/Toast/Toast', () => ({ useToast: () => ({ warning: jest.fn() }) }));

test.each([true, false])('shows loader immediately and clears it after response, success=%s', async success => {
  let finishRequest: (value: any) => void = () => {};
  global.fetch = jest.fn().mockImplementation((_url, options) => options?.method === 'POST'
    ? new Promise(resolve => { finishRequest = resolve; })
    : Promise.resolve({ ok: true, json: async () => ({ success: true, data: {
      classes: [{ id: 1, name: 'Class 1' }], sections: [{ id: 2, name: 'A', classId: 1 }],
      sessions: [{ id: 3, yearStart: '2026-01-01', yearEnd: '2026-12-31', isActive: true }],
    } }) }));
  const onClose = jest.fn();
  const onSuccess = jest.fn();
  const { container } = render(<AddStudent isOpen schoolId={1} onClose={onClose} onSuccess={onSuccess} />);
  await screen.findByText('Class 1');
  const values: Record<string, string> = {
    studentName: 'Test Student', rollNumber: '1', dob: '2015-01-31', genderCode: 'M',
    email: 'student@example.com', phoneNumber: '9876543210', classId: '1', sectionId: '2',
    parentName: 'Parent', parentEmail: 'parent@example.com', parentPhone: '9876543211',
    parentRelationship: 'Father', parentAddress: 'Address',
  };
  for (const [name, value] of Object.entries(values)) {
    fireEvent.change(container.querySelector(`[name="${name}"]`)!, { target: { value } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Add Student' }));
  expect(screen.getByText('Adding student...')).toBeInTheDocument();
  expect(container.querySelector('.page-loader-overlay')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add Student' })).toBeDisabled();
  fireEvent.submit(container.querySelector('form')!);
  expect((fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1);
  expect(onClose).not.toHaveBeenCalled();
  await act(async () => finishRequest({ ok: success, json: async () => ({ success, message: 'Unable to save student.' }) }));
  await waitFor(() => expect(screen.queryByText('Adding student...')).not.toBeInTheDocument());
  expect(onSuccess).toHaveBeenCalledTimes(success ? 1 : 0);
  expect(onClose).toHaveBeenCalledTimes(success ? 1 : 0);
  if (!success) {
    expect(screen.getByText('Unable to save student.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Student' })).toBeEnabled();
  }
});
