import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import './StaffLeaveAllowanceEditor.css';

const types = ['Casual Leave', 'Sick Leave', 'Planned Leave', 'Unpaid Leave', 'Earned Leave'];
type Session = { id: number; yearStart: string; yearEnd: string; isActive: boolean };
type Balance = { leaveType: string; allotted: number; used: number; pending: number; remaining: number };
const dateLabel = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function StaffLeaveAllowanceEditor({ schoolId, staffId, canEdit }: { schoolId: number; staffId: number; canEdit: boolean }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState(0);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    fetch(`${API_BASE_URL}/api/Admin/academic-sessions?schoolId=${schoolId}`, { headers: token() })
      .then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.message || 'Unable to load academic years.'); return body; })
      .then(body => { if (active) { const items: Session[] = body.data || []; setSessions(items); setSessionId(items.find(x => x.isActive)?.id || items[0]?.id || 0); if (!items.length) setLoading(false); } })
      .catch(e => { if (active) { setError(e.message); setLoading(false); } });
    return () => { active = false; };
  }, [schoolId]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setLoading(true); setError(''); setSuccess('');
    fetch(`${API_BASE_URL}/api/StaffLeaveAllocations/staff/${staffId}?schoolId=${schoolId}&sessionId=${sessionId}`, { headers: token() })
      .then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.message || 'Unable to load leave allowances.'); return body; })
      .then(body => { if (active) { const rows: Balance[] = body.data?.balances || []; setBalances(rows); setDraft(Object.fromEntries(rows.map(x => [x.leaveType, String(x.allotted)]))); } })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [schoolId, staffId, sessionId]);

  const changed = types.some(type => Number(draft[type] ?? 0) !== (balances.find(x => x.leaveType === type)?.allotted ?? 0));
  const invalid = types.some(type => draft[type] === '' || !Number.isInteger(Number(draft[type])) || Number(draft[type]) < 0 || Number(draft[type]) > 366);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (invalid || !changed) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/StaffLeaveAllocations/staff/${staffId}/all`, {
        method: 'PUT', headers: { ...token(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, sessionId, allowances: types.map(leaveType => ({ leaveType, days: Number(draft[leaveType]) })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save leave allowances.');
      const refreshed = await fetch(`${API_BASE_URL}/api/StaffLeaveAllocations/staff/${staffId}?schoolId=${schoolId}&sessionId=${sessionId}`, { headers: token() });
      const body = await refreshed.json();
      if (!refreshed.ok) throw new Error(body.message || 'Allowances were saved, but the latest balances could not be loaded.');
      const rows: Balance[] = body.data?.balances || [];
      setBalances(rows); setDraft(Object.fromEntries(rows.map(x => [x.leaveType, String(x.allotted)])));
      setSuccess('Leave allowances saved for this academic year.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save leave allowances.'); }
    finally { setSaving(false); }
  };

  return <div className="sla">
    <div className="sla-intro"><div><span className="sla-eyebrow">ANNUAL ENTITLEMENT</span><h3>Set leave allowances</h3><p>Assign the number of days this staff member can take during the selected academic year.</p></div></div>
    <div className="sla-toolbar"><label htmlFor="sla-session">Academic year</label><select id="sla-session" value={sessionId} disabled={!sessions.length || saving} onChange={e => setSessionId(Number(e.target.value))}>
      {!sessions.length && <option value={0}>No academic year available</option>}
      {sessions.map(s => <option key={s.id} value={s.id}>{dateLabel(s.yearStart)} - {dateLabel(s.yearEnd)}{s.isActive ? ' (Active)' : ''}</option>)}
    </select></div>
    {error && <div className="sla-message sla-error" role="alert">{error}</div>}
    {success && <div className="sla-message sla-success" role="status">{success}</div>}
    {!sessionId ? <p className="sla-empty">Create an academic year before assigning leave.</p> : loading ? <p className="sla-empty" role="status">Loading leave allowances...</p> :
      <form onSubmit={save}>
        <div className="sla-table-wrap"><table className="sla-table"><thead><tr><th scope="col">Leave type</th><th scope="col">Yearly allowance</th><th scope="col">Approved</th><th scope="col">Pending</th><th scope="col">Available</th></tr></thead><tbody>
          {types.map(type => { const row = balances.find(x => x.leaveType === type); const allotted = Number(draft[type] ?? 0); const available = Math.max(0, allotted - (row?.used ?? 0) - (row?.pending ?? 0)); return <tr key={type}>
            <th scope="row"><span className="sla-type-icon" aria-hidden="true">{type.charAt(0)}</span>{type}</th>
            <td>{canEdit ? <label className="sla-number"><input aria-label={type + ' days'} type="number" min="0" max="366" step="1" required value={draft[type] ?? '0'} onChange={e => setDraft(previous => ({ ...previous, [type]: e.target.value }))} /><span>days</span></label> : <strong>{row?.allotted ?? 0} days</strong>}</td>
            <td>{row?.used ?? 0}</td><td>{row?.pending ?? 0}</td><td><span className="sla-available">{canEdit ? available : row?.remaining ?? 0} days</span></td>
          </tr>; })}
        </tbody></table></div>
        <div className="sla-footer"><p>Pending and approved requests reserve days. Rejected requests release them.</p>{canEdit && <button className="sla-save" type="submit" disabled={saving || !changed || invalid}>{saving ? 'Saving allowances...' : 'Save allowances'}</button>}</div>
      </form>}
  </div>;
}
