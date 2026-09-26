import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './TeacherStudentContent.css';

type Row = Record<string, any>;
type Tab = 'Requests' | 'Announcements' | 'Events' | 'Achievements';
type FormState = {
  studentId: string; title: string; body: string; description: string;
  eventDate: string; awardedAt: string; sectionId: string; expiresAt: string;
  isPinned: boolean; publish: boolean;
};
const emptyForm = (): FormState => ({
  studentId: '', title: '', body: '', description: '', eventDate: '', awardedAt: '',
  sectionId: '', expiresAt: '', isPinned: false, publish: true,
});
const dateValue = (value: unknown) => value ? String(value).slice(0, 10) : '';
const todayValue = () => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); };
const displayDate = (value: unknown) => dateValue(value) ? new Date(String(value)).toLocaleDateString('en-GB') : '';
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
  const [tab, setTab] = useState<Tab>('Requests');
  const [rows, setRows] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [responses, setResponses] = useState<Record<number, { status: string; response: string }>>({});
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Student/students-by-school?schoolId=${schoolId}&page=1&pageSize=500`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    }).then(r => r.json()).then(x => setStudents(x.data || [])).catch(() => setStudents([]));
  }, [schoolId]);

  useEffect(() => {
    let cancelled = false;
    setRows([]); setError(''); setNotice(''); setLoading(true);
    request(`/${tab.toLowerCase()}?schoolId=${schoolId}`)
      .then(result => { if (!cancelled) setRows(result.data || []); })
      .catch(failure => { if (!cancelled) setError(failure.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [schoolId, tab]);

  const reload = async () => {
    const result = await request(`/${tab.toLowerCase()}?schoolId=${schoolId}`);
    setRows(result.data || []);
  };
  const changeTab = (next: Tab) => {
    setTab(next); setFormOpen(false); setEditingId(null); setForm(emptyForm());
  };
  const add = () => {
    setEditingId(null); setForm(emptyForm()); setFormOpen(true); setError(''); setNotice('');
  };
  const edit = (row: Row) => {
    setEditingId(Number(row.id));
    setForm({
      studentId: String(row.studentId ?? ''), title: row.title ?? '', body: row.body ?? '',
      description: row.description ?? '', eventDate: dateValue(row.eventDate),
      awardedAt: dateValue(row.awardedAt), sectionId: String(row.sectionId ?? ''),
      expiresAt: dateValue(row.expiresAt), isPinned: Boolean(row.isPinned),
      publish: row.isPublished !== false,
    });
    setFormOpen(true); setError(''); setNotice('');
  };
  const respond = async (id: number) => {
    const value = responses[id];
    if (!value) return;
    setSaving(true); setError('');
    try {
      await request(`/requests/${id}/respond`, { method: 'POST', body: JSON.stringify(value) });
      await reload();
      setNotice('Response saved.');
    } catch (failure: any) { setError(failure.message); }
    finally { setSaving(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      let body: Record<string, unknown>;
      if (tab === 'Announcements') body = {
        schoolId, sectionId: form.sectionId ? Number(form.sectionId) : null,
        title: form.title, body: form.body, expiresAt: form.expiresAt || null,
        isPinned: form.isPinned, publish: form.publish,
      };
      else if (tab === 'Events') body = {
        schoolId, sectionId: form.sectionId ? Number(form.sectionId) : null,
        title: form.title, description: form.description, eventDate: form.eventDate,
      };
      else body = {
        schoolId, studentId: Number(form.studentId), title: form.title,
        description: form.description, awardedAt: form.awardedAt,
      };
      const path = `/${tab.toLowerCase()}${editingId === null ? '' : '/' + editingId}`;
      await request(path, { method: editingId === null ? 'POST' : 'PUT', body: JSON.stringify(body) });
      await reload();
      setNotice(editingId === null ? 'Record added.' : 'Record updated.');
      setFormOpen(false); setEditingId(null); setForm(emptyForm());
    } catch (failure: any) { setError(failure.message); }
    finally { setSaving(false); }
  };
  const listDetail = (row: Row) => tab === 'Announcements' ? row.body : row.description;
  const listMeta = (row: Row) => tab === 'Announcements'
    ? `${row.isPublished ? 'Published' : 'Draft'}${row.isPinned ? ' | Pinned' : ''}${row.expiresAt ? ' | Expires ' + displayDate(row.expiresAt) : ''}`
    : tab === 'Events' ? displayDate(row.eventDate)
    : `${row.studentName || students.find(x => Number(x.id || x.studentId) === Number(row.studentId))?.studentName || 'Student'} | ${displayDate(row.awardedAt)}`;

  return <div className="tw tsc">
    <section className="tw-hero"><div><span className="tw-eyebrow">STUDENT SERVICES</span><h2>Student Services</h2><p>Review requests addressed to you and publish school updates.</p></div></section>
    <div className="tw-tabs tsc-tabs">{(['Requests','Announcements','Events','Achievements'] as Tab[]).map(x =>
      <button type="button" className={tab === x ? 'active' : ''} key={x} onClick={() => changeTab(x)}>{x}</button>)}</div>
    {error && <div className="tw-error" role="alert">{error}</div>}
    {notice && <div className="tw-notice" role="status">{notice}</div>}
    {loading && <PageLoader label="Loading student services..." />}
    {tab === 'Requests' && <section className="tsc-list">{rows.length ? rows.map(x =>
      <article className="tw-panel tsc-record" key={x.id}>
        <span className="tw-pill">{x.status}</span><h4>{x.studentName} - {x.type}</h4>
        <strong>{x.subject}</strong><p>{x.details}</p>
        {x.fromDate && <p>{displayDate(x.fromDate)} - {displayDate(x.toDate)}</p>}
        <div className="tsc-review">
          <label>Status<select value={responses[x.id]?.status || x.status} onChange={e => setResponses({ ...responses, [x.id]: { status: e.target.value, response: responses[x.id]?.response || x.response || '' } })}>{['Pending','Approved','Rejected','Resolved'].map(status => <option key={status}>{status}</option>)}</select></label>
          <label className="tsc-full">Response<textarea rows={2} value={responses[x.id]?.response ?? x.response ?? ''} onChange={e => setResponses({ ...responses, [x.id]: { status: responses[x.id]?.status || x.status, response: e.target.value } })}/></label>
          <button type="button" className="btn btn-primary" disabled={saving || !responses[x.id]} onClick={() => void respond(x.id)}>Save response</button>
        </div>
      </article>) : !loading && <p className="tw-empty">No student requests.</p>}</section>}
    {tab !== 'Requests' && <>
      <div className="tsc-actions"><h3>{tab}</h3><button type="button" className="btn btn-primary" onClick={add}>Add {tab === 'Achievements' ? 'achievement' : tab === 'Events' ? 'event' : 'announcement'}</button></div>
      {formOpen && <form className="tw-panel tsc-form" onSubmit={save}>
        <div className="tsc-form-head"><h3>{editingId === null ? 'Add' : 'Edit'} {tab.toLowerCase()}</h3><button type="button" className="btn" onClick={() => setFormOpen(false)}>Cancel</button></div>
        {tab === 'Achievements' && <label>Student<select required value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Choose student</option>{students.map(x => <option value={x.id || x.studentId} key={x.id || x.studentId}>{x.studentName || x.name}</option>)}</select></label>}
        <label className="tsc-full">Title<input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
        {tab === 'Announcements' ? <>
          <label className="tsc-full">Message<textarea required rows={4} maxLength={4000} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}/></label>
          <label>Expires (optional)<input type="date" min={todayValue()} value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}/></label>
          <label className="tsc-check"><input type="checkbox" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })}/> Pin announcement</label>
          <label className="tsc-check"><input type="checkbox" checked={form.publish} onChange={e => setForm({ ...form, publish: e.target.checked })}/> Published</label>
        </> : <>
          <label className="tsc-full">Description<textarea rows={3} maxLength={1000} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label>
          <label>{tab === 'Events' ? 'Event date' : 'Award date'}<input required type="date" value={tab === 'Events' ? form.eventDate : form.awardedAt} onChange={e => setForm({ ...form, [tab === 'Events' ? 'eventDate' : 'awardedAt']: e.target.value })}/></label>
        </>}
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId === null ? 'Save' : 'Save changes'}</button>
      </form>}
      <section className="tsc-list" aria-label={`${tab} list`}>{rows.length ? rows.map(row =>
        <article className="tw-panel tsc-record" key={row.id}>
          <div className="tsc-record-head"><h4>{row.title}</h4><button type="button" className="btn" onClick={() => edit(row)}>Edit</button></div>
          <small>{listMeta(row)}</small>
          {listDetail(row) && <p>{listDetail(row)}</p>}
        </article>) : !loading && <p className="tw-empty">No {tab.toLowerCase()} added yet.</p>}</section>
    </>}
  </div>;
}
