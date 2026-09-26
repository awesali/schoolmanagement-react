import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import './AcademicHolidays.css';
type Session = { id: number; yearStart: string; yearEnd: string; isActive: boolean };
type Holiday = { id: number; title: string; description?: string; eventDate: string; endDate?: string };
const day = (value: string) => value.slice(0, 10);
const pretty = (value: string) => new Date(day(value) + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export default function AcademicHolidays({ schoolId, sessions }: { schoolId: number; sessions: Session[] }) {
  const [sessionId, setSessionId] = useState(0);
  const [rows, setRows] = useState<Holiday[]>([]);
  const [form, setForm] = useState({ title: '', description: '', fromDate: '', toDate: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const selected = sessions.find(s => s.id === sessionId);
  useEffect(() => { setSessionId(sessions.find(s => s.isActive)?.id || sessions[0]?.id || 0); }, [schoolId, sessions]);
  useEffect(() => {
    if (!sessionId) { setRows([]); return; }
    const controller = new AbortController();
    setError('');
    fetch(`${API_BASE_URL}/api/AcademicHolidays/school/${schoolId}?sessionId=${sessionId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal
    }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Unable to load holidays.'); return result; })
      .then(result => { if (!controller.signal.aborted) setRows(result.data || []); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [schoolId, sessionId, revision]);
  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || busy) return;
    if (form.fromDate > form.toDate || form.fromDate < day(selected.yearStart) || form.toDate > day(selected.yearEnd)) {
      setError('Choose dates within the selected academic session.'); return;
    }
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/AcademicHolidays`, { method: 'POST', headers: auth(), body: JSON.stringify({ schoolId, sessionId, ...form }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to add holiday.');
      setForm({ title: '', description: '', fromDate: '', toDate: '' }); setRevision(x => x + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add holiday.'); }
    finally { setBusy(false); }
  };
  const remove = async (holiday: Holiday) => {
    if (!window.confirm(`Remove ${holiday.title}?`)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/AcademicHolidays/${holiday.id}?schoolId=${schoolId}`, { method: 'DELETE', headers: auth() });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Unable to remove holiday.');
      setRevision(x => x + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove holiday.'); }
    finally { setBusy(false); }
  };
  return <section className="academic-holidays">
    <h3>Academic holidays</h3>
    <p>Holidays for this school appear on teacher and student calendars.</p>
    <label>Academic session <select value={sessionId} onChange={e => setSessionId(Number(e.target.value))}>
      {sessions.map(s => <option key={s.id} value={s.id}>{pretty(s.yearStart)} to {pretty(s.yearEnd)}{s.isActive ? ' (Active)' : ''}</option>)}
    </select></label>
    {error && <p role="alert" className="academic-holidays-error">{error}</p>}
    {selected && <form onSubmit={submit} className="academic-holidays-form">
      <label>Holiday name <input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Winter break" /></label>
      <label>From <input required type="date" min={day(selected.yearStart)} max={day(selected.yearEnd)} value={form.fromDate} onChange={e => setForm({ ...form, fromDate: e.target.value, toDate: e.target.value > form.toDate ? e.target.value : form.toDate })} /></label>
      <label>To <input required type="date" min={form.fromDate || day(selected.yearStart)} max={day(selected.yearEnd)} value={form.toDate} onChange={e => setForm({ ...form, toDate: e.target.value })} /></label>
      <label className="academic-holidays-wide">Details (optional) <input maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Add holiday'}</button>
    </form>}
    {!rows.length ? <p>No academic holidays added for this session.</p> : <ul className="academic-holidays-list">{rows.map(row => <li key={row.id}><div><strong>{row.title}</strong><span>{pretty(row.eventDate)}{row.endDate && day(row.endDate) !== day(row.eventDate) ? ` to ${pretty(row.endDate)}` : ''}</span>{row.description && <small>{row.description}</small>}</div><button type="button" disabled={busy} onClick={() => remove(row)}>Remove</button></li>)}</ul>}
  </section>;
}
