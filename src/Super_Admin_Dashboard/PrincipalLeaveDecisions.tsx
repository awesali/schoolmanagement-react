import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import './PrincipalLeaveDecisions.css';

type Leave = { id: number; staffName: string; leaveType: string; fromDate: string; toDate: string; reason: string; createdDate: string };
const dateText = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function PrincipalLeaveDecisions({ requests, onChanged }: { requests: Leave[]; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const visibleRequests = requests.filter(request => request.staffName.toLocaleLowerCase().includes(nameSearch.trim().toLocaleLowerCase()));
  async function decide(id: number, status: 'Approved' | 'Rejected') {
    setBusyId(id); setError('');
    try {
      const response = await fetch(API_BASE_URL + '/api/principal/leave/' + id + '/decision', {
        method: 'PUT', headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Unable to decide this request.');
      onChanged();
    } catch (e: any) { setError(e.message); } finally { setBusyId(null); }
  }
  return <section className="principal-panel pld-panel">
    <div className="pld-heading"><div><span className="pld-eyebrow">STAFF TIME OFF</span><h2>Leave approvals</h2><p>Review the dates and reason before making a decision.</p></div><span className="pld-count">{requests.length} pending</span></div>
    {requests.length > 0 && <label className="pld-search">Search by teacher name<input type="search" value={nameSearch} onChange={event => setNameSearch(event.target.value)} placeholder="Enter a teacher's name" /></label>}
    {error && <div className="pld-error" role="alert">{error}</div>}
    {!visibleRequests.length ? <div className="pld-empty"><span className="pld-empty-icon" aria-hidden="true">✓</span><h3>{requests.length ? 'No matching requests' : 'All caught up'}</h3><p>{requests.length ? 'Try a different teacher name.' : 'No leave requests are waiting for approval.'}</p></div> : <div className="pld-list">
      {visibleRequests.map(l => <article className="pld-request" key={l.id}>
        <div className="pld-request-head"><div className="pld-person"><span className="pld-avatar" aria-hidden="true">{l.staffName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span><div><h3>{l.staffName}</h3><span>Request #{l.id} · Submitted {dateText(l.createdDate)}</span></div></div><span className="pld-type">{l.leaveType}</span></div>
        <div className="pld-details"><div><span className="pld-label">FROM</span><strong>{dateText(l.fromDate)}</strong></div><span className="pld-date-arrow" aria-hidden="true">→</span><div><span className="pld-label">TO</span><strong>{dateText(l.toDate)}</strong></div><div className="pld-reason"><span className="pld-label">REASON</span><p>{l.reason || 'No reason provided'}</p></div></div>
        <div className="pld-actions"><span>Decision updates the teacher's leave balance.</span><div><button className="pld-reject" type="button" disabled={busyId !== null} onClick={() => decide(l.id, 'Rejected')}>Reject</button><button className="pld-approve" type="button" disabled={busyId !== null} onClick={() => decide(l.id, 'Approved')}>{busyId === l.id ? 'Processing...' : 'Approve leave'}</button></div></div>
      </article>)}
    </div>}
  </section>;
}
