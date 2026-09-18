import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditClass from './EditClass';

jest.mock('../components/Toast/Toast', () => ({ useToastMessageState: () => require('react').useState('') }));

const setup = async (changeTeacher: boolean, assigned = true) => {
  const classData = { id: 2, className: 'Class 2', schoolId: 1, createdDate: '', isActive: true, sectionCount: 1, sections: [{ id: 20, sectionName: 'A', staffId: 3 }] };
  global.fetch = jest.fn().mockImplementation(async (url, options) => ({ ok: true, json: async () => {
    if (options?.method === 'PUT') return { success: true };
    if (String(url).includes('/Common/')) return { success: true, data: [{ id: 3, name: 'Current Teacher' }, { id: 4, name: 'Other Teacher' }] };
    return { success: true, totalPages: 1, data: [classData, ...(assigned ? [{ id: 1, className: 'Class 1', sections: [{ id: 10, sectionName: 'B', staffId: 4 }] }] : [])] };
  } }));
  const onSuccess = jest.fn();
  const { container } = render(<EditClass isOpen classData={classData} onSuccess={onSuccess} onClose={jest.fn()} />);
  await screen.findByText('Other Teacher');
  if (changeTeacher) fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
  fireEvent.submit(container.querySelector('form')!);
  return onSuccess;
};
const saves = () => (fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'PUT');

test('conflicting teacher needs confirmation before updating', async () => {
  const onSuccess = await setup(true);
  expect(await screen.findByText('Other Teacher is assigned to Class 1, section B.')).toBeInTheDocument();
  expect(saves()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Yes, Update Class' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(saves()).toHaveLength(1);
});

test('closing the confirmation keeps the existing assignment unsaved', async () => {
  await setup(true);
  const heading = await screen.findByText('Confirm Class Teacher');
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  fireEvent.click(heading.closest('.modal-content')!.querySelector('.modal-close')!);
  expect(saves()).toHaveLength(0);
  expect(screen.queryByText('Confirm Class Teacher')).not.toBeInTheDocument();
});

test.each([false, true])('unchanged or unassigned teacher saves without confirmation: changed=%s', async changed => {
  const onSuccess = await setup(changed, false);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(saves()).toHaveLength(1);
  expect(screen.queryByText('Confirm Class Teacher')).not.toBeInTheDocument();
});
