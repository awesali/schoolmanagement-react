import React, { useState } from 'react';
import { PreviewIcon } from '../components/Icons/Icons';
import '../Super_Admin_Dashboard/TimeTable.css';
import './StudentExamTimetable.css';

type Paper = { id?: number; examName: string; subjectName: string; examDate?: string | null; startTime?: string | null; endTime?: string | null };
const dateKey = (value?: string | null) => value ? value.slice(0, 10) : '';
const displayDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const displayTime = (value?: string | null) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(value || '');
  if (!match) return 'Time not set';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const slotKey = (paper: Paper) => `${paper.startTime || ''}|${paper.endTime || ''}`;

export default function StudentExamTimetable({ papers, initialExam = null }: { papers: Paper[]; initialExam?: string | null }) {
  const [openExam, setOpenExam] = useState<string | null>(initialExam);
  if (!papers.length) return <div className="sp-empty">No published exam schedule yet.</div>;
  const exams = Array.from(new Set(papers.map(paper => paper.examName)));
  if (!openExam || !exams.includes(openExam)) return <div className="student-exam-choices">{exams.map(examName => <button type="button" className="student-exam-choice" aria-label={examName + ' View timetable'} key={examName} onClick={() => setOpenExam(examName)}>
    <span><small>EXAM TIMETABLE</small><strong>{examName}</strong></span><span className="sp-view-eye" title="View timetable"><PreviewIcon size={21}/></span>
  </button>)}</div>;
  return <div className="student-exam-timetables"><button type="button" className="student-exam-back" onClick={() => setOpenExam(null)}>← Back to exam timetables</button>{exams.filter(name => name === openExam).map(examName => {
    const examPapers = papers.filter(paper => paper.examName === examName && dateKey(paper.examDate));
    const dates = Array.from(new Set(examPapers.map(paper => dateKey(paper.examDate)))).sort();
    const slots = Array.from(new Map(examPapers.map(paper => [slotKey(paper), {
      key: slotKey(paper), startTime: paper.startTime, endTime: paper.endTime,
    }])).values()).sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
    return <section className="sp-panel student-exam-section" key={examName}>
      <div className="sp-panel-title"><h2>{examName}</h2></div>
      {dates.length ? <div className="timetable-container" role="region" aria-label={`${examName} exam timetable`} tabIndex={0}>
        <table className="timetable student-exam-grid">
          <thead><tr><th scope="col" className="day-name">Exam date</th>{slots.map(slot => <th scope="col" key={slot.key}><div className="period-header"><div className="period-title">{displayTime(slot.startTime)} – {displayTime(slot.endTime)}</div></div></th>)}</tr></thead>
          <tbody>{dates.map(date => <tr key={date}><th scope="row" className="day-name">{displayDate(date)}</th>{slots.map(slot => {
            const matches = examPapers.filter(paper => dateKey(paper.examDate) === date && slotKey(paper) === slot.key);
            return <td key={slot.key}>{matches.length ? matches.map(paper => <strong className="student-exam-subject" key={paper.id ?? paper.subjectName}>{paper.subjectName}</strong>) : <span className="student-exam-empty">—</span>}</td>;
          })}</tr>)}</tbody>
        </table>
      </div> : <div className="sp-empty">Paper dates have not been scheduled yet.</div>}
    </section>;
  })}</div>;
}