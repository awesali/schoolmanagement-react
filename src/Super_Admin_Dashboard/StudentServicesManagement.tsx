import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './TeacherStudentContent.css';

type Row = Record<string, any>;
const request = async (path: string, options?: RequestInit) => {
  const response = await fetch(`${API_BASE_URL}/api/SchoolStudentAdmin${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options?.headers },
  });
  const raw = await response.text(); let body: any;
  try { body = JSON.parse(raw); } catch { throw new Error('School API returned an invalid response.'); }
  if (!response.ok) throw new Error(body.message || 'Request failed.');
  return body;
};
export default function StudentServicesManagement({ schoolId }: { schoolId: number }) {
  const [tab, setTab] = useState<'Requests' | 'Announcements' | 'Events' | 'Achievements'>('Requests');
  const [rows, setRows] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [responses, setResponses] = useState<Record<number, { status: string; response: string }>>({});
  const [form, setForm] = useState({ studentId: '', title: '', body: '', description: '', eventDate: '', awardedAt: '', sectionId: '', expiresAt: '', isPinned: false });
  useEffect(() => {
    setError('');
    fetch(`${API_BASE_URL}/api/Student/students-by-school?schoolId=${schoolId}&page=1&pageSize=500`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(x => setStudents(x.data || [])).catch(() => setStudents([]));
  }, [schoolId]);
  const load = async () => {
    if (tab !== 'Requests') return;
    setLoading(true); setError('');
    try { const result = await request(`/requests?schoolId=${schoolId}`); setRows(result.data || []); }
    catch (failure: any) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [schoolId, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const respond = async (id: number) => {
    const value = responses[id];
    if (!value) return;
    setSaving(true); setError('');
    try { await request(`/requests/${id}/respond`, { method: 'POST', body: JSON.stringify(value) }); await load(); }
    catch (failure: any) { setError(failure.message); }
    finally { setSaving(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (tab === 'Announcements') await request('/announcements', { method: 'POST', body: JSON.stringify({
        schoolId, sectionId: form.sectionId ? Number(form.sectionId) : null, title: form.title,
        body: form.body, expiresAt: form.expiresAt || null, isPinned: form.isPinned, publish: true,
      }) });
      if (tab === 'Events') await request('/events', { method: 'POST', body: JSON.stringify({
        schoolId, sectionId: form.sectionId ? Number(form.sectionId) : null,
        title: form.title, description: form.description, eventDate: form.eventDate,
      }) });
      if (tab === 'Achievements') await request('/achievements', { method: 'POST', body: JSON.stringify({
        schoolId, studentId: Number(form.studentId), title: form.title,
        description: form.description, awardedAt: form.awardedAt,
      }) });
      setForm({ studentId: '', title: '', body: '', description: '', eventDate: '', awardedAt: '', sectionId: '', expiresAt: '', isPinned: false });
    } catch (failure: any) { setError(failure.message); }
    finally { setSaving(false); }
  };
  return <div className="tw tsc"><section className="tw-hero"><div><span className="tw-eyebrow">STUDENT SERVICES</span><h2>Student Services</h2><p>Manage student requests and publish school updates.</p></div></section>
    <div className="tw-tabs tsc-tabs">{(['Requests','Announcements','Events','Achievements'] as const).map(x => <button className={tab === x ? 'active' : ''} key={x} onClick={() => setTab(x)}>{x}</button>)}</div>
    {error && <div className="tw-error" role="alert">{error}</div>}{loading && <PageLoader label="Loading student services…" />}
    {tab === 'Requests' && <section className="tsc-list">{rows.length ? rows.map(x => <article className="tw-panel tsc-record" key={x.id}><span className="tw-pill">{x.status}</span><h4>{x.studentName} · {x.type}</h4><strong>{x.subject}</strong><p>{x.details}</p>{x.fromDate && <p>{new Date(x.fromDate).toLocaleDateString()} – {new Date(x.toDate).toLocaleDateString()}</p>}<div className="tsc-review"><label>Status<select value={responses[x.id]?.status || x.status} onChange={e => setResponses({ ...responses, [x.id]: { status: e.target.value, response: responses[x.id]?.response || x.response || '' } })}>{['Pending','Approved','Rejected','Resolved'].map(status => <option key={status}>{status}</option>)}</select></label><label className="tsc-full">Response<textarea rows={2} value={responses[x.id]?.response ?? x.response ?? ''} onChange={e => setResponses({ ...responses, [x.id]: { status: responses[x.id]?.status || x.status, response: e.target.value } })}/></label><button className="btn btn-primary" disabled={saving || !responses[x.id]} onClick={() => void respond(x.id)}>Save response</button></div></article>) : !loading && <p className="tw-empty">No student requests.</p>}</section>}
    {tab !== 'Requests' && <form className="tw-panel tsc-form" onSubmit={save}>
      {tab === 'Achievements' && <label>Student<select required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Choose student</option>{students.map(x => <option value={x.id || x.studentId} key={x.id || x.studentId}>{x.studentName || x.name}</option>)}</select></label>}
      <label className="tsc-full">Title<input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
      {tab === 'Announcements' ? <><label className="tsc-full">Message<textarea required rows={4} maxLength={4000} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}/></label><label>Expires (optional)<input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}/></label><label className="tsc-check"><input type="checkbox" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })}/> Pin announcement</label></> : <><label className="tsc-full">Description<textarea rows={3} maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label><label>{tab === 'Events' ? 'Event date' : 'Award date'}<input required type="date" value={tab === 'Events' ? form.eventDate : form.awardedAt} onChange={e => setForm({ ...form, [tab === 'Events' ? 'eventDate' : 'awardedAt']: e.target.value })}/></label></>}
      <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Publish'}</button>
    </form>}
  </div>;
}

