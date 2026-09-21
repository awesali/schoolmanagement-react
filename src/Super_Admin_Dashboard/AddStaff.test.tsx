import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddStaff from './AddStaff';

jest.mock('../components/Toast/Toast', () => ({
  useToastMessageState: () => require('react').useState(''),
}));

afterEach(() => jest.restoreAllMocks());

test.each([false, true])('adds staff with optional photo selected: %s and uses the common overlay', async withPhoto => {
  let finishRequest: (value: any) => void = () => {};
  global.fetch = jest.fn().mockImplementation((_url, options) => options?.method === 'POST'
    ? new Promise(resolve => { finishRequest = resolve; })
    : Promise.resolve({ ok: true, json: async () => ({ success: true, data: [{ id: 1, roleName: 'Teacher' }] }) }));
  jest.spyOn(console, 'log').mockImplementation(() => {});
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  const onSuccess = jest.fn();
  const { container } = render(<AddStaff isOpen schoolId={1} onClose={jest.fn()} onSuccess={onSuccess} />);
  await screen.findByText('Teacher');
  const dates = container.querySelectorAll('input[type="date"]');
  fireEvent.change(dates[0], { target: { value: '1990-01-31' } });
  fireEvent.change(dates[1], { target: { value: '2026-04-01' } });
  fireEvent.change(screen.getByLabelText('PIN Code'), { target: { value: '444601' } });
  fireEvent.change(screen.getByLabelText('Qualification'), { target: { value: 'B.Ed.' } });
  fireEvent.change(screen.getByLabelText('Previous School / Organization'), { target: { value: 'Previous School' } });
  fireEvent.change(screen.getByLabelText('Certification Name'), { target: { value: 'Teacher Training' } });
  const photoInput = container.querySelector('#staff-profile-picture')!;
  expect(photoInput).not.toBeRequired();
  const photo = new File(['image'], 'photo.png', { type: 'image/png' });
  if (withPhoto) fireEvent.change(photoInput, { target: { files: [photo] } });
  fireEvent.submit(container.querySelector('form')!);
  expect(screen.getByRole('status', { name: '' })).toHaveClass('page-loader-overlay');
  expect(screen.getByText('Adding staff...')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add Staff' })).toBeDisabled();
  const body = (fetch as jest.Mock).mock.calls.find(([, options]) => options?.method === 'POST')[1].body as FormData;
  expect(body.has('Files')).toBe(withPhoto);
  expect(body.get('PinCode')).toBe('444601');
  expect(body.get('Qualification')).toBe('B.Ed.');
  expect(body.get('PreviousEmployer')).toBe('Previous School');
  expect(body.get('CertificationName')).toBe('Teacher Training');
  expect(body.get('DocumentNames')).toBe(withPhoto ? 'Profile Picture' : null);
  await act(async () => finishRequest({ ok: true, json: async () => ({ success: true }) }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(screen.queryByText('Adding staff...')).not.toBeInTheDocument();
});
