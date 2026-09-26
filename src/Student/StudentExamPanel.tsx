import React from 'react';
import StudentHallTickets from './StudentHallTickets';

type Row = Record<string, any>;
export default function StudentExamPanel({ data }: { data: { profile?: Row; parent?: Row | null; examResources?: Row[]; hallTickets?: Row[] } }) {
  return <>
    <section className="sp-panel"><div className="sp-panel-title"><h2>Syllabus and preparation</h2></div>
      {data.examResources?.length ? data.examResources.map(x => <div className="sp-line" key={x.id}><div><strong>{x.examName} · {x.subjectName}</strong><small>{x.syllabus}</small></div>{x.resourceUrl && /^https?:\/\//i.test(x.resourceUrl) && <a href={x.resourceUrl} target="_blank" rel="noreferrer">Resource ↗</a>}</div>) : <div className="sp-empty">No exam syllabus published yet.</div>}
    </section>
    <section className="sp-panel"><div className="sp-panel-title"><h2>Hall tickets</h2></div><StudentHallTickets tickets={data.hallTickets} profile={data.profile} parent={data.parent} /></section>
  </>;
}
