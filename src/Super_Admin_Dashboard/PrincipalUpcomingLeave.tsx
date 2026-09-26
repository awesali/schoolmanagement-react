import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import './PrincipalUpcomingLeave.css';

type ApprovedLeave = { id: number; staffName: string; leaveType: string; fromDate: string; toDate: string };
const parseDate = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00');
const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

export default function PrincipalUpcomingLeave({ refresh }: { refresh: number }) {
  const [rows, setRows] = useState<ApprovedLeave[]>([]);
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${API_BASE_URL}/api/principal/leave/upcoming`, { signal: controller.signal, headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
      .then(async response => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'Unable to load upcoming leave.'); return body; })
      .then(body => { if (!controller.signal.aborted) { setRows(body.data || []); setStartDate(String(body.startDate || '').slice(0, 10)); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);
  const start = startDate ? parseDate(startDate) : null;
  const days = start ? Array.from({ length: 10 }, (_, index) => { const day = new Date(start); day.setDate(day.getDate() + index); return day; }) : [];
  return <section className="principal-panel pul-panel" aria-labelledby="pul-title">
    <div className="pul-heading"><div><span className="pul-eyebrow">COVERAGE PLANNER</span><h2 id="pul-title">Approved leave · next 10 days</h2><p>See who will be away on each day, including leave that is already in progress.</p></div><span className="pul-count">{rows.length} approved {rows.length === 1 ? 'request' : 'requests'}</span></div>
    {error && <p className="pul-error" role="alert">{error}</p>}
    {loading ? <p className="pul-empty" role="status">Loading upcoming leave...</p> : <div className="pul-grid">
      {days.map(day => { const key = dateKey(day); const onLeave = rows.filter(row => row.fromDate.slice(0, 10) <= key && row.toDate.slice(0, 10) >= key); return <div className={`pul-day${onLeave.length ? ' pul-day-busy' : ''}`} key={key}>
        <div className="pul-day-head"><span>{day.toLocaleDateString('en-IN', { weekday: 'short' })}</span><strong>{day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></div>
        <div className="pul-day-body">{onLeave.length ? onLeave.map(row => <div className="pul-person" key={row.id}><b>{row.staffName}</b><small>{row.leaveType}</small></div>) : <span className="pul-clear">No approved leave</span>}</div>
      </div>; })}
    </div>}
  </section>;
}
