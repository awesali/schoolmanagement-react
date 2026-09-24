import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
import StudentPortal from './StudentPortal';

const overview = {
  profile: { studentName: 'Test Student', email: 'test@example.com', className: 'Class 8', sectionName: 'A', rollNumber: '12', schoolName: 'Test School' },
  subjects: [{ id: 1, subjectName: 'Mathematics' }], timetable: [], homework: [], materials: [],
  attendance: [], exams: [], results: [], parent: null, teachers: [], documents: [], fees: [],
  payments: [], transport: null, diary: [], submissions: [], announcements: [], libraryBooks: [],
  borrowedBooks: [], requests: [], messages: [], achievements: [], schoolEvents: [], gradeHistory: [],
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'test-token');
  window.scrollTo = jest.fn();
});

test('loads the student day and navigates to a real class section', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: overview }) }) as jest.Mock;
  render(<StudentPortal />);
  expect(await screen.findByText(/Good .*Test/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'My Classes' }));
  expect(screen.getByText('Mathematics')).toBeInTheDocument();
});

test('shows a useful error when the API returns plain text', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => 'System.InvalidOperationException' }) as jest.Mock;
  render(<StudentPortal />);
  await waitFor(() => expect(screen.getByText(/Student API is unavailable/)).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});



