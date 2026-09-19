import { sortStudentsByClass } from './studentOrder';

test('groups mixed classes before pagination, regardless of spelling or session', () => {
  const rows = ['9 Th', '10 Th', '8 th', '8th', '10 th', '9th', '8 th', '10th', '9 Th', '8th'].map((className, id) => ({
    id, className, studentName: `Student ${id}`, sectionName: 'A', rollNumber: String(id + 1),
  }));
  const sorted = sortStudentsByClass(rows);
  expect(sorted.map(s => s.id)).toEqual([2, 3, 6, 9, 0, 5, 8, 1, 4, 7]);
  expect(sorted.slice(5, 10).map(s => s.id)).toEqual([5, 8, 1, 4, 7]);
  expect(rows[0].id).toBe(0);
});

test('orders class numbers numerically and groups sections', () => {
  const rows = [
    { id: 1, className: '10th', sectionName: 'A', studentName: 'A' },
    { id: 2, className: '2nd', sectionName: 'B', studentName: 'B' },
    { id: 3, className: '2 nd', sectionName: 'A', studentName: 'C' },
    { id: 4, className: '1st', sectionName: 'A', studentName: 'D' },
  ];
  expect(sortStudentsByClass(rows).map(s => s.id)).toEqual([4, 3, 2, 1]);
});
