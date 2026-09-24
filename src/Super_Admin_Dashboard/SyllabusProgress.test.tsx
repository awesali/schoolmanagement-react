import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SyllabusProgress, { SyllabusRow, syllabusClasses } from './SyllabusProgress';
jest.mock('../security/Permissions', () => ({ usePermissions: () => ({ can: () => true }) }));
const row: SyllabusRow = { classId: 8, className: 'Class 8', sectionId: 1, sectionName: 'A', subjectId: 2, subjectName: 'Mathematics',
  totalChapters: 100, plannedChapters: 62, completedChapters: 51, progressDate: '2026-09-24' };
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ academicYear: '2026–27', rows: [row] }) });
});
test('class percentages use chapter weights and flag a behind-plan subject', () => {
  const [result] = syllabusClasses([row, { ...row, subjectId: 3, totalChapters: 20, completedChapters: 20, plannedChapters: 10 }]);
  expect(result.actual).toBe(59.2);
  expect(result.planned).toBe(60);
  expect(result.behind).toBe(1);
});
test('unreported subjects are counted in coverage, not as zero completion', () => {
  const [result] = syllabusClasses([{ ...row, totalChapters: null, plannedChapters: null, completedChapters: null, progressDate: null }]);
  expect(result.actual).toBeNull();
  expect(result.reported).toBe(0);
  expect(result.expected).toBe(1);
});
test('principal sees actual percentage, warning and subject details without editing', async () => {
  render(<SyllabusProgress date="2026-09-24" />);
  expect(await screen.findByText('51%')).toBeInTheDocument();
  expect(screen.getByText(/Behind plan/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Class 8/ }));
  expect(screen.getByRole('region', { name: 'Class 8 syllabus details' })).toHaveTextContent('A / Mathematics');
  expect(screen.getByText('-11 pp')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Record progress' })).not.toBeInTheDocument();
});
test('teacher records counts against assigned subject and selected date', async () => {
  render(<SyllabusProgress date="2026-09-24" teacher />);
  await screen.findByText('51%');
  fireEvent.change(screen.getByLabelText('Class and subject'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Completed chapters'), { target: { value: '64' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record progress' }));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/Teacher/syllabus'), expect.objectContaining({
    method: 'POST', body: JSON.stringify({ sectionId: 1, subjectId: 2, progressDate: '2026-09-24', totalChapters: 100, plannedChapters: 62, completedChapters: 64 }),
  })));
  expect(await screen.findByText('Syllabus progress recorded.')).toBeInTheDocument();
});
test('failed reload removes old percentages and offers retry', async () => {
  const { rerender } = render(<SyllabusProgress date="2026-09-24" />);
  await screen.findByText('51%');
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Service unavailable' }) });
  rerender(<SyllabusProgress date="2026-09-23" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
  expect(screen.queryByText('51%')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Retry syllabus' })).toBeInTheDocument();
});
