import React, { useState } from 'react';
import StudentExamTimetable from './StudentExamTimetable';
import StudentHallTickets from './StudentHallTickets';
import './StudentExamPanel.css';

type Row = Record<string, any>;
type ExamTab = 'timetable' | 'syllabus' | 'tickets';
type ExamData = { exams: Row[]; profile?: Row; parent?: Row | null; examResources?: Row[]; hallTickets?: Row[] };

export default function StudentExamPanel({ data, initialTab = 'timetable', initialTarget = null }: { data: ExamData; initialTab?: 'timetable' | 'tickets'; initialTarget?: string | null }) {
  const [tab, setTab] = useState<ExamTab>(initialTab);
  const tabs: { id: ExamTab; label: string }[] = [
    { id: 'timetable', label: 'Exam timetable' },
    { id: 'syllabus', label: 'Syllabus and preparation' },
    { id: 'tickets', label: 'Hall tickets' },
  ];
  return <>
    <div className="student-exam-tabs" role="tablist" aria-label="Exam sections">
      {tabs.map(item => <button type="button" role="tab" id={`student-exam-tab-${item.id}`}
        aria-controls={`student-exam-panel-${item.id}`} aria-selected={tab === item.id}
        className={tab === item.id ? 'active' : ''} key={item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
    </div>
    <div role="tabpanel" id={`student-exam-panel-${tab}`} aria-labelledby={`student-exam-tab-${tab}`}>
      {tab === 'timetable' && <StudentExamTimetable papers={data.exams} initialExam={initialTab === 'timetable' ? initialTarget : null} />}
      {tab === 'syllabus' && <section className="sp-panel"><div className="sp-panel-title"><h2>Syllabus and preparation</h2></div>
        {data.examResources?.length ? data.examResources.map(x => <div className="sp-line" key={x.id}><div><strong>{x.examName} · {x.subjectName}</strong><small>{x.syllabus}</small></div>{x.resourceUrl && /^https?:\/\//i.test(x.resourceUrl) && <a href={x.resourceUrl} target="_blank" rel="noreferrer">Resource ↗</a>}</div>) : <div className="sp-empty">No exam syllabus published yet.</div>}
      </section>}
      {tab === 'tickets' && <section className="sp-panel"><div className="sp-panel-title"><h2>Hall tickets</h2></div><StudentHallTickets tickets={data.hallTickets} initialTicketId={initialTab === 'tickets' ? Number(initialTarget) || null : null} profile={data.profile} parent={data.parent} /></section>}
    </div>
  </>;
}