import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeacherStudentContent from './TeacherStudentContent';
import { teacherRequest } from './TeacherWorkspace';
jest.mock('./TeacherWorkspace', () => ({ localDate: () => '2026-09-24', teacherRequest: jest.fn() }));
const request = teacherRequest as jest.Mock;
beforeEach(() => {
  request.mockReset();
  request.mockImplementation(async (path: string) => ({ success: true, data:
    path === '/api/Teacher/homework' ? [{ id: 1, title: 'Math', totalMarks: 10 }] :
    path.includes('submissions?') ? [{ id: 2, studentName: 'Student', status: 'Graded', marks: 8, teacherFeedback: 'Good', submittedAt: '2026-09-24' }] : [] }));
});
async function openReview() {
  render(<TeacherStudentContent page="Submissions"/>);
  await screen.findByRole('option', { name: /Math/ });
  fireEvent.change(screen.getByLabelText('Assignment'), { target: { value: '1' } });
  await screen.findByText('Student');
}
test('editing feedback preserves the existing grade and confirms a successful save', async () => {
  await openReview();
  fireEvent.change(screen.getByLabelText('Feedback'), { target: { value: 'Well done' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
  await screen.findByText('Review saved successfully.');
  const call = request.mock.calls.find(([path]) => path.endsWith('/review'));
  expect(JSON.parse(call![1].body)).toEqual({ status: 'Graded', marks: 8, feedback: 'Well done' });
});
test('marks above the assignment total are rejected with an explanation', async () => {
  await openReview();
  fireEvent.change(screen.getByLabelText('Marks'), { target: { value: '11' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Marks must be between 0 and 10.');
  expect(request.mock.calls.some(([path]) => path.endsWith('/review'))).toBe(false);
});
test('a server rejection is visible and never reported as saved', async () => {
  await openReview();
  request.mockImplementationOnce(async () => { throw new Error('Review could not be saved'); });
  fireEvent.click(screen.getByRole('button', { name: 'Save review' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Review could not be saved'));
  expect(screen.queryByText('Review saved successfully.')).not.toBeInTheDocument();
});

test('class diary opens from a compact Add button and keeps saved entries below', async () => {
 request.mockImplementation(async (path: string) => ({ success: true, data:
  path === '/api/Teacher/teaching-options' ? [{ sectionId: 4, subjectId: 5, className: '10th', sectionName: 'A', subjectName: 'English' }] :
  path === '/api/Teacher/diary' ? [{ id: 9, subjectName: 'English', entryDate: '2026-09-24', topic: 'Poetry', isPublished: true }] : [] }));
 render(<TeacherStudentContent page="Class Diary" />);
 expect(screen.queryByLabelText('Topic taught')).not.toBeInTheDocument();
 expect(await screen.findByText('Poetry')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
 expect(screen.getByLabelText('Topic taught')).toBeInTheDocument();
 expect(screen.getByText('Poetry')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
 expect(screen.queryByLabelText('Topic taught')).not.toBeInTheDocument();
});
test('announcements open from Add and saved records stay visible below', async () => {
 request.mockImplementation(async (path: string) => ({ success: true, data:
  path === '/api/Teacher/teaching-options' ? [{ sectionId: 4, subjectId: 5, className: '10th', sectionName: 'A', subjectName: 'English' }] :
  path === '/api/Teacher/announcements' ? [{ id: 3, title: 'School trip', body: 'Friday', isPublished: true }] : [] }));
 render(<TeacherStudentContent page="Announcements" />);
 expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
 expect(await screen.findByText('School trip')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Add announcement' }));
 expect(screen.getByLabelText('Title')).toBeInTheDocument();
 expect(screen.getByText('School trip')).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
 expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
});