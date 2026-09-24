import React, { useMemo, useState } from 'react';

type Row = Record<string, any>;
type Filter = 'All' | 'Missing' | 'Due today' | 'Upcoming' | 'Resubmit';
const dateOnly = (value: unknown) => String(value || '').slice(0, 10);
const localToday = () => {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
};
const formatDate = (value: unknown) => {
  const date = dateOnly(value);
  if (!date) return 'No due date';
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function MissingWorkCenter({ homework, submissions, onOpen }: {
  homework: Row[]; submissions: Row[]; onOpen: (assignment: Row) => void;
}) {
  const [filter, setFilter] = useState<Filter>('All');
  const today = localToday();
  const outstanding = useMemo(() => {
    const latest = new Map<number, Row>();
    (submissions || []).forEach(row => {
      const id = Number(row.assignmentId);
      const prior = latest.get(id);
      if (!prior || String(row.submittedAt || '') > String(prior.submittedAt || '')) latest.set(id, row);
    });
    return (homework || []).flatMap(assignment => {
      const submission = latest.get(Number(assignment.id));
      const needsResubmission = String(submission?.status || '').toLowerCase() === 'resubmission required';
      if (submission && !needsResubmission) return [];
      const due = dateOnly(assignment.dueDate);
      const status: Exclude<Filter, 'All'> = needsResubmission ? 'Resubmit' : due && due < today ? 'Missing' : due === today ? 'Due today' : 'Upcoming';
      return [{ assignment, submission, status, due }];
    }).sort((a, b) => {
      const rank = (status: string) => ({ Resubmit: 0, Missing: 1, 'Due today': 2, Upcoming: 3 }[status] ?? 4);
      return rank(a.status) - rank(b.status) || a.due.localeCompare(b.due);
    });
  }, [homework, submissions, today]);
  const shown = filter === 'All' ? outstanding : outstanding.filter(item => item.status === filter);
  const count = (status: Filter) => status === 'All' ? outstanding.length : outstanding.filter(item => item.status === status).length;
  return <>
    <div className="sp-section-intro"><h2>Missing Work Center</h2><p>Published assignments that still need your work. Open one to read the instructions and submit.</p></div>
    <div className="sp-filter" aria-label="Filter outstanding assignments">
      {(['All', 'Missing', 'Due today', 'Upcoming', 'Resubmit'] as Filter[]).map(item =>
        <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} aria-pressed={filter === item}>
          {item} ({count(item)})
        </button>)}
    </div>
    {shown.length ? <div className="sp-card-grid">{shown.map(({ assignment, submission, status }) =>
      <article className="sp-record" key={assignment.id}>
        <div className="sp-record-head"><span className="sp-tag">{status}</span><span>{assignment.subjectName}</span></div>
        <h3>{assignment.title}</h3><p>{assignment.description}</p>
        {submission?.teacherFeedback && <p><strong>Teacher feedback:</strong> {submission.teacherFeedback}</p>}
        <div className="sp-record-foot"><span>Due {formatDate(assignment.dueDate)}</span><button type="button" onClick={() => onOpen(assignment)}>{status === 'Resubmit' ? 'Open and resubmit' : 'Open assignment'}</button></div>
      </article>)}</div> : <div className="sp-empty">{filter === 'All' ? homework.length ? 'You have no outstanding assignments.' : 'Your teachers have not published homework yet.' : `No assignments marked ${filter.toLowerCase()}.`}</div>}
  </>;
}
