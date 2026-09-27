import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentServicesManagement from './StudentServicesManagement';

test('events show a list, open Add on demand, and edit an existing record', async () => {
  localStorage.setItem('token', 'test-token');
  const events = [{ id: 8, title: 'Sports day', description: 'On campus', eventDate: '2026-10-05T00:00:00', sectionId: null }];
  global.fetch = jest.fn(async (input: RequestInfo, options?: RequestInit) => {
    const url = String(input);
    if (url.includes('students-by-school')) return { json: async () => ({ data: [] }) } as Response;
    if (url.includes('/events?')) return { ok: true, text: async () => JSON.stringify({ data: events }) } as Response;
    if (url.endsWith('/events')) {
      events.push({ id: 9, ...JSON.parse(String(options?.body)) });
      return { ok: true, text: async () => JSON.stringify({ success: true }) } as Response;
    }
    if (url.endsWith('/events/8')) {
      Object.assign(events[0], JSON.parse(String(options?.body)));
      return { ok: true, text: async () => JSON.stringify({ success: true }) } as Response;
    }
    return { ok: true, text: async () => JSON.stringify({ data: [] }) } as Response;
  }) as jest.Mock;

  render(<StudentServicesManagement schoolId={7} />);
  fireEvent.click(screen.getByRole('button', { name: 'Events' }));
  expect(await screen.findByText('Sports day')).toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Title' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Add event' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Science fair' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), { target: { value: 'Exhibits' } });
  fireEvent.change(screen.getByLabelText('Event date'), { target: { value: '2026-10-10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save', exact: true }));
  expect(await screen.findByText('Science fair')).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
  expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue('Sports day');
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Sports festival' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.getByText('Sports festival')).toBeInTheDocument());
  expect((global.fetch as jest.Mock).mock.calls.some(([url, options]) =>
    String(url).endsWith('/events/8') && options?.method === 'PUT')).toBe(true);
});


test('announcement and achievement tabs load records and open populated edit forms', async () => {
  localStorage.setItem('token', 'test-token');
  global.fetch = jest.fn(async (input: RequestInfo) => {
    const url = String(input);
    if (url.includes('students-by-school')) return { json: async () => ({ data: [{ id: 4, studentName: 'Asha' }] }) } as Response;
    if (url.includes('/announcements?')) return { ok: true, text: async () => JSON.stringify({ data: [{ id: 2, title: 'Holiday', body: 'Closed Monday', isPinned: true, isPublished: true }] }) } as Response;
    if (url.includes('/achievements?')) return { ok: true, text: async () => JSON.stringify({ data: [{ id: 3, studentId: 4, studentName: 'Asha', title: 'Gold medal', description: 'Sports', awardedAt: '2026-10-01T00:00:00' }] }) } as Response;
    return { ok: true, text: async () => JSON.stringify({ data: [] }) } as Response;
  }) as jest.Mock;
  render(<StudentServicesManagement schoolId={7} />);
  fireEvent.click(screen.getByRole('button', { name: 'Announcements' }));
  expect(await screen.findByText('Holiday')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  expect(screen.getByRole('textbox', { name: 'Message' })).toHaveValue('Closed Monday');
  fireEvent.click(screen.getByRole('button', { name: 'Achievements' }));
  expect(await screen.findByText('Gold medal')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  expect(screen.getByRole('combobox', { name: 'Student' })).toHaveValue('4');
  expect(screen.getByLabelText('Award date')).toHaveValue('2026-10-01');
});
