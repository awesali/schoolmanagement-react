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




test('Upcoming excludes submitted work and Submitted shows it', async () => {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
  const withHomework = {
    ...overview,
    homework: [
      { id: 1, title: 'Already sent', subjectName: 'Mathematics', description: 'Done', dueDate: tomorrow },
      { id: 2, title: 'Still due', subjectName: 'Mathematics', description: 'Pending', dueDate: tomorrow },
    ],
    submissions: [{ id: 10, assignmentId: 1, status: 'Submitted', submittedAt: today.toISOString() }],
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: withHomework }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getAllByRole('button', { name: 'Homework' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }));
  expect(screen.queryByText('Already sent')).not.toBeInTheDocument();
  expect(screen.getByText('Still due')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Submitted' }));
  expect(screen.getByText('Already sent')).toBeInTheDocument();
  expect(screen.queryByText('Still due')).not.toBeInTheDocument();
});


test('study materials show clear download and link actions', async () => {
  const data = { ...overview, materials: [
    { id: 3, resourceType: 'PDF', title: 'Algebra notes', subjectName: 'Mathematics', description: 'Chapter one', resourceUrl: 'upload:sample.pdf' },
    { id: 4, resourceType: 'Link', title: 'Reading guide', subjectName: 'English', resourceUrl: 'https://example.com/guide' },
  ] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getByRole('navigation', { name: 'Student navigation' }).querySelectorAll('button')[5]);
  expect(screen.getByText('Algebra notes')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download file' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open link' })).toHaveAttribute('href', 'https://example.com/guide');
});

test('Exams preserves the upcoming schedule and online exams', async () => {
  const examDate = new Date(Date.now() + 86400000).toISOString();
  const data = { ...overview, exams: [{ id: 9, examName: 'Annual', subjectName: 'Science', examDate, startTime: '09:00', endTime: '10:00' }], onlineExams: [{ id: 2, name: 'Old online exam' }] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data }) }) as jest.Mock;
  render(<StudentPortal />);
  await screen.findByText(/Good .*Test/);
  fireEvent.click(screen.getByRole('navigation', { name: 'Student navigation' }).querySelector('button[title="Exams"]') || screen.getAllByRole('button', { name: 'Exams' })[0]);
  expect(screen.getByText('Exam schedule')).toBeInTheDocument();
  expect(screen.queryByText('Earlier exams')).not.toBeInTheDocument();
  expect(screen.getByText('Online exams')).toBeInTheDocument();
  expect(screen.getByText('Old online exam')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Start exam' })).toBeInTheDocument();
});
