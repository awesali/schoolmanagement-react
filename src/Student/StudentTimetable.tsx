import React from 'react';
import '../Super_Admin_Dashboard/TimeTable.css';

type Slot = { dayOfWeek?: number; periodNumber?: number; startTime?: string; endTime?: string; isBreak?: boolean; subjectName?: string };
export default function StudentTimetable({ slots, formatTime }: { slots: Slot[]; formatTime: (value?: string) => string }) {
  const periods = Array.from(new Map(slots.map(slot => [Number(slot.periodNumber), slot])).values())
    .sort((a, b) => Number(a.periodNumber) - Number(b.periodNumber));
  if (!periods.length) return <p className="sp-empty">No timetable published for your section.</p>;
  const days = [1, 2, 3, 4, 5, 6, ...(slots.some(slot => Number(slot.dayOfWeek) === 0) ? [0] : [])];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return <div className="timetable-container" role="region" aria-label="Weekly class timetable" tabIndex={0}>
    <table className="timetable">
      <thead>
        <tr><th scope="col">Day</th>{periods.map(period => <th scope="col" key={period.periodNumber}><div className="period-header"><div className="period-title">{period.isBreak ? 'Break' : `Period ${period.periodNumber}`}</div></div></th>)}</tr>
        <tr className="time-row"><th className="time-label" scope="row">Time</th>{periods.map(period => <th key={period.periodNumber} className="time-config"><div className="time-inputs">{formatTime(period.startTime)}<span>–</span>{formatTime(period.endTime)}</div></th>)}</tr>
      </thead>
      <tbody>{days.map(day => <tr key={day}><th scope="row" className="day-name">{dayNames[day]}</th>{periods.map(period => {
        const slot = slots.find(item => Number(item.dayOfWeek) === day && Number(item.periodNumber) === Number(period.periodNumber));
        return <td key={period.periodNumber}>{slot?.isBreak ? <span className="break-cell">BREAK</span> : <div className="period-cell"><span>{slot?.subjectName || '—'}</span></div>}</td>;
      })}</tr>)}</tbody>
    </table>
  </div>;
}
