import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StudentExamPanel from './StudentExamPanel';

test('unit tests have their own tab and stay out of the exam timetable', () => {
  render(<StudentExamPanel data={{
    exams: [
      { id: 1, examId: 10, examName: 'Annual', examTypeName: 'Yearly', subjectName: 'Maths', examDate: '2026-10-05', startTime: '09:00' },
      { id: -2, examId: 11, examName: 'English quiz', examTypeName: 'Unit Test', subjectName: 'English', examDate: '2026-10-07', startTime: null },
    ],
  }} />);
  expect(screen.getByRole('tab', { name: 'Exam timetable' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('button', { name: /Annual.*View timetable/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /English quiz.*View timetable/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Unit tests' }));
  expect(screen.getByRole('tab', { name: 'Unit tests' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('English quiz')).toBeInTheDocument();
  expect(screen.getByText('Time not set')).toBeInTheDocument();
});