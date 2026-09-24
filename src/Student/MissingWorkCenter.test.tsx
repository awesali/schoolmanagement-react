import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import MissingWorkCenter from './MissingWorkCenter';

const date = (offset: number) => {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
};
const assignments = [
  { id: 1, title: 'Science worksheet', subjectName: 'Science', dueDate: date(-1), description: 'Chapter 4' },
  { id: 2, title: 'English essay', subjectName: 'English', dueDate: date(0), description: 'Write an essay' },
  { id: 3, title: 'Math exercise', subjectName: 'Mathematics', dueDate: date(2), description: 'Exercise 3' },
  { id: 4, title: 'History notes', subjectName: 'History', dueDate: date(-2), description: 'Chapter 2' },
];

test('shows only outstanding work, teacher resubmission feedback, and opens the chosen assignment', () => {
  const onOpen = jest.fn();
  render(<MissingWorkCenter homework={assignments} submissions={[
    { assignmentId: 3, status: 'Graded', submittedAt: '2026-09-23T10:00:00' },
    { assignmentId: 4, status: 'Resubmission Required', teacherFeedback: 'Add sources', submittedAt: '2026-09-23T11:00:00' },
  ]} onOpen={onOpen} />);
  expect(screen.getByText('Science worksheet')).toBeInTheDocument();
  expect(screen.getByText('English essay')).toBeInTheDocument();
  expect(screen.getByText('History notes')).toBeInTheDocument();
  expect(screen.queryByText('Math exercise')).not.toBeInTheDocument();
  expect(screen.getByText(/Teacher feedback:/).parentElement).toHaveTextContent('Add sources');
  fireEvent.click(screen.getByRole('button', { name: 'Resubmit (1)' }));
  expect(screen.queryByText('Science worksheet')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open and resubmit' }));
  expect(onOpen).toHaveBeenCalledWith(assignments[3]);
});

test('shows a completed state when all homework was submitted', () => {
  render(<MissingWorkCenter homework={[assignments[0]]} submissions={[{ assignmentId: 1, status: 'Submitted' }]} onOpen={jest.fn()} />);
  expect(screen.getByText('You have no outstanding assignments.')).toBeInTheDocument();
});

