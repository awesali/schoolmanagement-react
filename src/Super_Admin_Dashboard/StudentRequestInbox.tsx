import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './TeacherWorkspace.css';
import './TeacherStudentContent.css';

type Row = { id: number; studentName: string; className: string; sectionName: string; type: string; subject: string; details: string; fromDate?: string; toDate?: string; status: string; response?: string; createdAt: string };
const showDate = (value?: string) => value ? new Date(value).toLocaleDateString('en-GB') : '';
const request = async (path: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}/api/StudentRequestInbox${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Could not load student requests.');
  return body;
};
export default function StudentRequestInbox() {
  const [rows, setRows] = useState<Row[]>([]);
  const [reviews, setReviews] = useState<Record<number, { status: string; response: string }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { const result = await request(''); setRows(result.data || []); }
    catch (failure: any) { setError(failure.message || 'Could not load student requests.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const respond = async (row: Row) => {
    const review = reviews[row.id];
    if (!review) return;
    setSavingId(row.id); setError(''); setNotice('');
    try {
      await request(`/${row.id}/respond`, { method: 'POST', body: JSON.stringify(review) });
      await load(); setNotice('Response saved.');
    } catch (failure: any) { setError(failure.message || 'Could not save response.'); }
    finally { setSavingId(null); }
  };
  return <div className="tw tsc">
    <section className="tw-hero"><div><span className="tw-eyebrow">STUDENT SERVICES</span><h2>Student requests</h2><p>Requests addressed to your account appear here.</p></div></section>
    {error && <div className="tw-error" role="alert">{error}</div>}
    {notice && <div className="tw-notice" role="status">{notice}</div>}
    {loading && <PageLoader label="Loading student requests..." />}
    {!loading && <section className="tsc-list">{rows.length ? rows.map(row => <article className="tw-panel tsc-record" key={row.id}>
      <span className="tw-pill">{row.status}</span><h4>{row.studentName} - {row.className} / {row.sectionName}</h4>
      <strong>{row.type}: {row.subject}</strong><p>{row.details}</p>
      {row.fromDate && <p>{showDate(row.fromDate)} to {showDate(row.toDate)}</p>}
      <small>Submitted {showDate(row.createdAt)}</small>
      <div className="tsc-review">
        <label>Status<select value={reviews[row.id]?.status || row.status} onChange={e => setReviews(current => ({ ...current, [row.id]: { status: e.target.value, response: current[row.id]?.response ?? row.response ?? '' } }))}>{['Pending','Approved','Rejected','Resolved'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="tsc-full">Response<textarea rows={2} maxLength={2000} value={reviews[row.id]?.response ?? row.response ?? ''} onChange={e => setReviews(current => ({ ...current, [row.id]: { status: current[row.id]?.status || row.status, response: e.target.value } }))}/></label>
        <button type="button" className="btn btn-primary" disabled={savingId !== null || !reviews[row.id]} onClick={() => void respond(row)}>Save response</button>
      </div>
    </article>) : <p className="tw-empty">No requests addressed to you yet.</p>}</section>}
  </div>;
}