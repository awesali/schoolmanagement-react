import { importDateError, isValidImportDate, toApiDate, formatImportDate } from './importDate';

test.each(['01-31-2010', '02-29-2000', '02-29-2024', '04-30-2026'])('accepts valid date %s', date => {
  expect(isValidImportDate(date)).toBe(true);
  expect(importDateError('DOB', date)).toBeNull();
});

test.each(['31/01/2010', '01/02-2010', '2010-1-31', '02-30-2026', '02-29-1900', '04-31-2026', '13-01-2026', '01-01-0000', '2010-01-31T00:00:00', ''])('explains invalid date %s', date => {
  expect(isValidImportDate(date)).toBe(false);
  expect(importDateError('DOB', date)).toContain('DOB:');
  expect(importDateError('DOB', date)).toContain('MM-DD-YYYY');
  expect(importDateError('DOB', date)).toContain('01-31-2010');
});

test('identifies only invalid dates in a mixed list', () => {
  const dates = ['01-31-2010', '31/01/2010', '02-29-2024', '02-29-2026'];
  expect(dates.map((date, index) => ({ row: index + 2, error: importDateError('DOB', date) })).filter(row => row.error).map(row => row.row)).toEqual([3, 5]);
});

test('converts month-first CSV dates to unambiguous API dates and back', () => {
  expect(toApiDate('08-31-2000')).toBe('2000-08-31');
  expect(toApiDate('01-02-2010')).toBe('2010-01-02');
  expect(formatImportDate('2000-08-31T00:00:00')).toBe('08-31-2000');
  expect(toApiDate('02-30-2026')).toBe('');
  expect(toApiDate('2000-08-31')).toBe('');
});

 test.each(['7/18/1991', '07/18/1991', '07-18-1991', '7-18-1991'])('accepts slash/dash and normalizes %s', value => {
 expect(isValidImportDate(value)).toBe(true);
 expect(toApiDate(value)).toBe('1991-07-18');
 });
 test('keeps month-first interpretation with single digits', () => {
 expect(toApiDate('1/2/2010')).toBe('2010-01-02');
 expect(toApiDate('1-2-2010')).toBe('2010-01-02');
 expect(toApiDate('29/6/1997')).toBe('');
 expect(toApiDate('2/29/2026')).toBe('');
 });
