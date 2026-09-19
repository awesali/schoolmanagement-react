import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddClass from './AddClass';

jest.mock('../components/Toast/Toast', () => ({
  useToast: () => ({ warning: jest.fn() }),
  useToastMessageState: () => require('react').useState(''),
}));

const setup = async (assigned: boolean, existingName = 'Class 1') => {
  global.fetch = jest.fn().mockImplementation(async (url, options) => ({ ok: true, json: async () => {
    if (options?.method === 'POST') return { success: true };
    if (String(url).includes('/Common/')) return { success: true, data: [{ id: 4, name: 'Teacher A' }] };
    return { success: true, totalPages: 1, data: assigned ? [{ className: existingName, sections: [{ staffId: 4, sectionName: 'A' }] }] : [] };
  } }));
  const onSuccess = jest.fn();
  const { container } = render(<AddClass isOpen schoolId={1} onSuccess={onSuccess} onClose={jest.fn()} />);
  await screen.findByText('Teacher A');
  fireEvent.change(screen.getByPlaceholderText('e.g., 1st, 2nd, Nursery'), { target: { value: 'Class 2nd' } });
  fireEvent.change(screen.getByPlaceholderText('Section Name (e.g., A, B, C)'), { target: { value: 'B' } });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '4' } });
  fireEvent.submit(container.querySelector('form')!);
  return onSuccess;
};
const posts = () => (fetch as jest.Mock).mock.calls.filter(([, options]) => options?.method === 'POST');

test('blocks duplicate class names before teacher confirmation or saving', async () => {
  await setup(true, '  CLASS 2 nd  ');
  expect(await screen.findByText('A class with this name already exists in this school. Please use a different name.')).toBeInTheDocument();
  expect(posts()).toHaveLength(0);
  expect(screen.queryByText('Confirm Class Teacher')).not.toBeInTheDocument();
});

test('requires app confirmation for an already assigned teacher', async () => {
  const onSuccess = await setup(true);
  expect(await screen.findByText('Teacher A is already the class teacher of Class 1, section A.')).toBeInTheDocument();
  expect(posts()).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Yes, Create Class' }));
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(posts()).toHaveLength(1);
  expect(JSON.parse(posts()[0][1].body).sections).toEqual([{ sectionName: 'B', staffId: 4 }]);
});

test('closing the confirmation does not create the class', async () => {
  await setup(true);
  const heading = await screen.findByText('Confirm Class Teacher');
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  fireEvent.click(heading.closest('.modal-content')!.querySelector('.modal-close')!);
  expect(posts()).toHaveLength(0);
  expect(screen.queryByText('Confirm Class Teacher')).not.toBeInTheDocument();
});

test('unassigned teacher can be used without confirmation', async () => {
  const onSuccess = await setup(false);
  await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  expect(posts()).toHaveLength(1);
  expect(screen.queryByText('Confirm Class Teacher')).not.toBeInTheDocument();
});
