import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import './PrincipalLeaveHistory.css';

type Leave = { id: number; staffName: string; leaveType: string; fromDate: string; toDate: string; reason: string; status: string; adminRemarks?: string | null; createdDate: string };
const dateLabel = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const pageSize = 20;

export default function PrincipalLeaveHistory({ refresh }: { refresh: number }) {
  const [rows, setRows] = useState<Leave[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('Decided');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateQuery, setDateQuery] = useState({ fromDate: '', toDate: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set('status', status);
    if (query) params.set('search', query);
    if (dateQuery.fromDate) params.set('fromDate', dateQuery.fromDate);
    if (dateQuery.toDate) params.set('toDate', dateQuery.toDate);
    setLoading(true); setError('');
    fetch(`${API_BASE_URL}/api/principal/leave/history?${params}`, { signal: controller.signal, headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })
      .then(async response => { const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.message || 'Unable to load leave history.'); return body; })
      .then(body => { if (!controller.signal.aborted) { setRows(body.data || []); setTotal(body.total || 0); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, status, query, dateQuery, refresh]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <section className="principal-panel plh-panel" aria-labelledby="plh-title">
    <div className="plh-heading"><div><span className="plh-eyebrow">STAFF TIME OFF</span><h2 id="plh-title">Leave history</h2><p>Review previous decisions for your school.</p></div><span className="plh-total">{total} {total === 1 ? 'request' : 'requests'}</span></div>
    <form className="plh-filters" onSubmit={event => { event.preventDefault(); if (fromDate && toDate && fromDate > toDate) { setError('The From date must be on or before the To date.'); return; } setError(''); setPage(1); setQuery(search.trim()); setDateQuery({ fromDate, toDate }); }}>
      <label>Search staff<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Staff name" /></label>
      <label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="Decided">Approved &amp; rejected</option><option value="">All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></label>
      <label>Leave from<input type="date" value={fromDate} max={toDate || undefined} onChange={event => setFromDate(event.target.value)} /></label>
      <label>Leave to<input type="date" value={toDate} min={fromDate || undefined} onChange={event => setToDate(event.target.value)} /></label>
      <button type="submit">Apply filters</button>
    </form>
    {error && <div className="plh-error" role="alert">{error}</div>}
    {loading ? <p className="plh-empty" role="status">Loading leave history...</p> : !rows.length ? <p className="plh-empty">No leave requests match this view.</p> : <div className="plh-list">
      {rows.map(row => <article className="plh-row" key={row.id}>
        <div className="plh-row-top"><div><strong>{row.staffName}</strong><span>Request #{row.id} · {row.leaveType}</span></div><span className={`plh-status plh-${row.status.toLowerCase()}`}>{row.status}</span></div>
        <div className="plh-row-body"><div><small>LEAVE DATES</small><b>{dateLabel(row.fromDate)} - {dateLabel(row.toDate)}</b></div><div><small>REASON</small><span>{row.reason}</span></div><div><small>REQUESTED</small><span>{dateLabel(row.createdDate)}</span></div></div>
        {row.adminRemarks && <p className="plh-remarks"><strong>Decision remarks:</strong> {row.adminRemarks}</p>}
      </article>)}
    </div>}
    {total > pageSize && <div className="plh-pages"><span>Page {page} of {pages}</span><div><button type="button" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><button type="button" disabled={page >= pages || loading} onClick={() => setPage(value => value + 1)}>Next</button></div></div>}
  </section>;
}
