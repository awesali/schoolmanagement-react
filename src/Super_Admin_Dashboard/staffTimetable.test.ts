import { staffTimetableSlots } from './staffTimetable';

test('matches a slot to its period number and displays its times', () => {
  const rows = staffTimetableSlots(
    [{ id: 42, periodNumber: 2, startTime: '09:45:00', endTime: '10:30:00' }],
    [{ periodId: 2, dayOfWeek: 1, subjectId: 7 }],
  );
  expect(rows[0].timeLabel).toBe('09:45 - 10:30');
});

test('uses a readable label when a period has no saved times', () => {
  expect(staffTimetableSlots([], [{ periodId: 3, dayOfWeek: 1, subjectId: 7 }])[0].timeLabel)
    .toBe('Period 3 (time unavailable)');
});
