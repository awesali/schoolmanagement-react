import React from 'react';
import { render, screen, within } from '@testing-library/react';
import TeacherExamTimetable from './TeacherExamTimetable';

test('groups exam papers by class and section into date and time cells', () => {
  render(<TeacherExamTimetable rows={[
    { id: 1, classId: 10, className: '10th', sectionId: 2, sectionName: 'A', subjectId: 1, subjectName: 'English', examDate: '2026-09-27T00:00:00', startTime: '09:00:00', endTime: '12:00:00', maxMarks: 100, passingMarks: 50 },
    { id: 2, classId: 10, className: '10th', sectionId: 2, sectionName: 'A', subjectId: 2, subjectName: 'Maths', examDate: '2026-09-28T00:00:00', startTime: '09:00:00', endTime: '12:00:00', maxMarks: 80, passingMarks: 32 },
    { id: 3, classId: 10, className: '10th', sectionId: 3, sectionName: 'B', subjectId: 1, subjectName: 'English', examDate: '2026-09-27T00:00:00', startTime: '09:00:00', endTime: '12:00:00' },
  ]} />);
  const classA = screen.getByRole('region', { name: '10th / A exam timetable' });
  const classB = screen.getByRole('region', { name: '10th / B exam timetable' });
  expect(within(classA).getAllByRole('row')).toHaveLength(3);
  expect(within(classA).getByText('Maths')).toBeInTheDocument();
  expect(within(classB).queryByText('Maths')).not.toBeInTheDocument();
  expect(within(classA).getByText('9:00 AM – 12:00 PM')).toBeInTheDocument();
});