import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StudentExamPanel from './StudentExamPanel';

test('shows one exam tab at a time and highlights the selected tab', () => {
  render(<StudentExamPanel data={{
    exams: [{ id: 1, examName: 'Annual', subjectName: 'Maths', examDate: '2026-09-28', startTime: '09:00', endTime: '12:00' }],
    examResources: [{ id: 2, examName: 'Annual', subjectName: 'Maths', syllabus: 'Algebra' }],
    hallTickets: [{ id: 3, examName: 'Annual', seatNumber: 'A-1' }],
    profile: { studentName: 'Test Student', schoolName: 'Test School' },
  }} />);
  const timetable = screen.getByRole('tab', { name: 'Exam timetable' });
  const syllabus = screen.getByRole('tab', { name: 'Syllabus and preparation' });
  const tickets = screen.getByRole('tab', { name: 'Hall tickets' });
  expect(timetable).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: /Annual.*View timetable/ })).toBeInTheDocument();
  expect(screen.queryByText('Algebra')).not.toBeInTheDocument();
  fireEvent.click(syllabus);
  expect(syllabus).toHaveAttribute('aria-selected', 'true');
  expect(timetable).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByText('Algebra')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /View timetable/ })).not.toBeInTheDocument();
  fireEvent.click(tickets);
  expect(tickets).toHaveClass('active');
  expect(screen.getByRole('button', { name: /Annual.*View hall ticket/ })).toBeInTheDocument();
  expect(screen.queryByText('Algebra')).not.toBeInTheDocument();
});