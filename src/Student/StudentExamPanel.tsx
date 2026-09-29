import StudentIcon from './StudentIcon';
import React, { useState } from 'react';
import StudentExamTimetable from './StudentExamTimetable';
import StudentHallTickets from './StudentHallTickets';
import './StudentExamPanel.css';

type Row = Record<string, any>;
type ExamTab = 'timetable' | 'unit-tests' | 'syllabus' | 'tickets';
type ExamData = { exams: Row[]; profile?: Row; parent?: Row | null; examResources?: Row[]; hallTickets?: Row[] };

export default function StudentExamPanel({ data, initialTab = 'timetable', initialTarget = null }: { data: ExamData; initialTab?: 'timetable' | 'unit-tests' | 'tickets'; initialTarget?: string | null }) {
  const [tab, setTab] = useState<ExamTab>(initialTab);
  const tabs: { id: ExamTab; label: string }[] = [
    { id: 'timetable', label: 'Exam timetable' },
    { id: 'unit-tests', label: 'Unit tests' },
    { id: 'syllabus', label: 'Syllabus and preparation' },
    { id: 'tickets', label: 'Hall tickets' },
  ];
  const unitTests = data.exams.filter(exam => String(exam.examTypeName || '').toLowerCase() === 'unit test');
  const examPapers = data.exams.filter(exam => String(exam.examTypeName || '').toLowerCase() !== 'unit test');
  const uniqueUnitTests = Array.from(new Map(unitTests.map(exam => [String(exam.examId ?? exam.id), exam])).values());
  return <>
    <div className="student-exam-tabs" role="tablist" aria-label="Exam sections">
      {tabs.map(item => <button type="button" role="tab" id={`student-exam-tab-${item.id}`}
        aria-controls={`student-exam-panel-${item.id}`} aria-selected={tab === item.id}
        className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)}><StudentIcon name={item.id === 'timetable' ? 'timetable' : item.id === 'tickets' ? 'id' : 'book'} />{item.label}</button>)}
    </div>
    <div role="tabpanel" id={`student-exam-panel-${tab}`} aria-labelledby={`student-exam-tab-${tab}`}>
      {tab === 'timetable' && <StudentExamTimetable papers={examPapers} initialExam={initialTab === 'timetable' ? initialTarget : null} />}
      {tab === 'unit-tests' && <section className="sp-panel"><div className="sp-panel-title"><h2>Unit tests</h2></div>
        {uniqueUnitTests.length ? <div className="student-unit-test-list">{uniqueUnitTests.map(test => {
          const testRows = unitTests.filter(row => String(row.examId ?? row.id) === String(test.examId ?? test.id));
          const names = Array.from(new Set(testRows.map(row => String(row.subjectName || '')).filter(Boolean)));
          const date = String(test.examDate || '').slice(0, 10);
          const [year, month, day] = date.split('-').map(Number);
          const shownDate = year && month && day ? new Date(year, month - 1, day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date not set';
          const time = String(test.startTime || '').match(/^(\d{1,2}):(\d{2})/);
          const shownTime = time ? (Number(time[1]) % 12 || 12) + ':' + time[2] + (Number(time[1]) >= 12 ? ' PM' : ' AM') : 'Time not set';
          return <article className={'student-unit-test-card' + (initialTarget === String(test.examName) ? ' selected' : '')} key={String(test.examId ?? test.id)}>
            <span className="sp-tag">{shownDate}</span><div><h3>{test.examName}</h3><p>{names.join(', ') || 'Subject not set'}</p></div><small>{shownTime}</small>
          </article>;
        })}</div> : <div className="sp-empty">No unit tests published for your class yet.</div>}
      </section>}      {tab === 'syllabus' && <section className="sp-panel"><div className="sp-panel-title"><h2>Syllabus and preparation</h2></div>
        {data.examResources?.length ? data.examResources.map(x => <div className="sp-line" key={x.id}><div><strong>{x.examName} · {x.subjectName}</strong><small>{x.syllabus}</small></div>{x.resourceUrl && /^https?:\/\//i.test(x.resourceUrl) && <a href={x.resourceUrl} target="_blank" rel="noreferrer">Resource <StudentIcon name="external" /></a>}</div>) : <div className="sp-empty">No exam syllabus published yet.</div>}
      </section>}
      {tab === 'tickets' && <section className="sp-panel"><div className="sp-panel-title"><h2>Hall tickets</h2></div><StudentHallTickets tickets={data.hallTickets} initialTicketId={initialTab === 'tickets' ? Number(initialTarget) || null : null} profile={data.profile} parent={data.parent} /></section>}
    </div>
  </>;
}