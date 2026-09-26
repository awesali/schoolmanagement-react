import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import StudentReportCards from './StudentReportCards';

test('shows published subject marks, percentages, and a computed overall total', () => {
  window.print = jest.fn();
  const originalTitle = document.title;
  render(<StudentReportCards
    profile={{ studentName: 'Asha Khan', schoolName: 'Green Valley School', rollNumber: '42', className: '10th', sectionName: 'A' }}
    parent={{ name: 'Sara Khan' }}
    results={[{ examId: 7, examName: 'Annual 2026', totalMarks: 200, obtainedMarks: 155, percentage: 77.5, grade: 'B', resultStatus: 'PASS' }]}
    gradeHistory={[
      { examId: 7, subjectName: 'English', maxMarks: 100, obtainedMarks: 80 },
      { examId: 7, subjectName: 'Science', maxMarks: 50, obtainedMarks: 40 },
      { examId: 8, subjectName: 'Unpublished subject', maxMarks: 100, obtainedMarks: 90 },
    ]}
  />);
  fireEvent.click(screen.getByRole('button', { name: /View result/ }));
  expect(document.title).toBe('Asha Khan - Result of Annual 2026');
  expect(screen.getByText('Green Valley School')).toBeInTheDocument();
  expect(screen.getByText('Asha Khan')).toBeInTheDocument();
  expect(screen.getByText('42')).toBeInTheDocument();
  expect(screen.getByText('Sara Khan')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /English/ })).getByText('80%')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Science/ })).getByText('80%')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Overall total/ })).getByText('150')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Overall total/ })).getByText('120')).toBeInTheDocument();
  expect(screen.queryByText('Unpublished subject')).not.toBeInTheDocument();
  expect(screen.queryByText(/Get Yours At/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Print report card' }));
  expect(window.print).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Back to results/ }));
  expect(screen.getByRole('button', { name: /View result/ })).toBeInTheDocument();
  expect(screen.queryByText('Green Valley School')).not.toBeInTheDocument();
  expect(document.title).toBe(originalTitle);
});

test('shows pending subjects without presenting stale published totals as final', () => {
  render(<StudentReportCards
    profile={{ studentName: 'Asha Khan', schoolName: 'Green Valley School', rollNumber: '42' }}
    results={[{ examId: 7, examName: 'Annual 2026', totalMarks: 300, obtainedMarks: 80, percentage: 26.67, grade: 'F', resultStatus: 'FAIL', expectedSubjectCount: 2, recordedSubjectCount: 1, configuredTotalMarks: 200, recordedObtainedMarks: 80, isComplete: false }]}
    gradeHistory={[]}
    resultSubjects={[
      { examId: 7, subjectName: 'English', maxMarks: 100, obtainedMarks: 80 },
      { examId: 7, subjectName: 'Science', maxMarks: 100, obtainedMarks: null },
    ]}
  />);
  fireEvent.click(screen.getByRole('button', { name: /View result/ }));
  expect(screen.getByRole('status')).toHaveTextContent('Marks pending: 1/2 subjects recorded');
  expect(within(screen.getByRole('row', { name: /Science/ })).getAllByText('—')).toHaveLength(2);
  expect(within(screen.getByRole('row', { name: /Overall total/ })).getByText('200')).toBeInTheDocument();
  expect(screen.getByText('Pending')).toBeInTheDocument();
  expect(screen.queryByText('FAIL')).not.toBeInTheDocument();
  expect(screen.queryByText('26.67%')).not.toBeInTheDocument();
});

test('admin report uses the student and exam name for PDF and restores the page title on close', () => {
  const originalTitle = document.title;
  const { unmount } = render(<StudentReportCards
    showList={false}
    profile={{ studentName: 'Zoya Joshi', schoolName: 'Green Valley School' }}
    results={[{ examId: 15, examName: 'yearly 2026', totalMarks: 100, obtainedMarks: 62, resultStatus: 'PASS' }]}
    gradeHistory={[{ subjectName: 'Mathematics', maxMarks: 100, obtainedMarks: 62 }]}
  />);
  expect(document.title).toBe('Zoya Joshi - Result of yearly 2026');
  expect(screen.getByRole('row', { name: /Mathematics/ })).toBeInTheDocument();
  unmount();
  expect(document.title).toBe(originalTitle);
});