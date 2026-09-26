type Period = { id?: number; periodNumber: number; startTime?: string | null; endTime?: string | null };
type Slot = { periodId: number; dayOfWeek: number; subjectId: number; subjectName?: string | null };

export function staffTimetableSlots(periods: Period[], slots: Slot[]) {
  return slots.map(slot => {
    // The timetable API exposes slot.periodId as a period number, not the period row ID.
    const period = periods.find(item => Number(item.periodNumber) === Number(slot.periodId));
    return { ...slot, startTime: period?.startTime ?? null, endTime: period?.endTime ?? null,
      timeLabel: period?.startTime && period?.endTime
        ? `${period.startTime.slice(0, 5)} - ${period.endTime.slice(0, 5)}`
        : `Period ${slot.periodId} (time unavailable)` };
  });
}
