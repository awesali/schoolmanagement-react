import AdminActionIcon from './AdminActionIcon';
import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './TeacherStudentContent.css';

type Row = Record<string, any>;
type Tab = 'Requests' | 'Announcements' | 'Events' | 'Achievements';
type ClassOption = { id: number; name: string };
type SectionOption = { id: number; name: string; classId: number };
type FormState = {
  classId: string; studentId: string; title: string; body: string; description: string;
  eventDate: string; awardedAt: string; sectionId: string; expiresAt: string;
  isPinned: boolean; publish: boolean;
};
const emptyForm = (): FormState => ({
  classId: '', studentId: '', title: '', body: '', description: '', eventDate: '', awardedAt: '',
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
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [responses, setResponses] = useState<Record<number, { status: string; response: string }>>({});
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const headers = { Authorization: 'Bearer ' + localStorage.getItem('token') };
    const loadOptions = async () => {
      try {
        const infoResponse = await fetch(API_BASE_URL + '/api/Student/enrollment-info?schoolId=' + schoolId, { headers });
        const info = await infoResponse.json();
        if (!infoResponse.ok || !info.success) throw new Error('Could not load classes and sections.');
        const allStudents: Row[] = [];
        let page = 1;
        let totalPages = 1;
        do {
          const response = await fetch(API_BASE_URL + '/api/Student/students-by-school?schoolId=' + schoolId + '&page=' + page + '&pageSize=500', { headers });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error('Could not load students.');
          allStudents.push(...(result.data || []));
          totalPages = Math.max(1, Number(result.totalPages) || 1);
          page++;
        } while (page <= totalPages);
        if (cancelled) return;
        setClasses(info.data?.classes || []);
        setSections(info.data?.sections || []);
        setStudents(allStudents.filter(student => student.isActive !== false));
      } catch (failure) {
        if (!cancelled) {
          setClasses([]); setSections([]); setStudents([]);
          setError(failure instanceof Error ? failure.message : 'Could not load achievement options.');
        }
      }
    };
    void loadOptions();
    return () => { cancelled = true; };
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
  const studentSectionId = (student: Row) => {
    if (student.sectionId) return String(student.sectionId);
    return String(sections.find(section => Number(section.classId) === Number(student.classId) &&
      section.name.toLowerCase() === String(student.sectionName || '').toLowerCase())?.id || '');
  };
  const matchingStudents = students.filter(student => String(student.classId) === form.classId &&
    studentSectionId(student) === form.sectionId)
    .filter((student, index, list) => list.findIndex(item => Number(item.id || item.studentId) === Number(student.id || student.studentId)) === index);
  const edit = (row: Row) => {
    const selectedStudent = students.find(student => Number(student.id || student.studentId) === Number(row.studentId));
    setEditingId(Number(row.id));
    setForm({
      classId: selectedStudent?.classId ? String(selectedStudent.classId) : '',
      studentId: String(row.studentId ?? ''), title: row.title ?? '', body: row.body ?? '',
      description: row.description ?? '', eventDate: dateValue(row.eventDate),
      awardedAt: dateValue(row.awardedAt), sectionId: tab === 'Achievements' && selectedStudent ? studentSectionId(selectedStudent) : String(row.sectionId ?? ''),
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
    event.preventDefault();
    if (tab === 'Achievements' && !matchingStudents.some(student => Number(student.id || student.studentId) === Number(form.studentId))) {
      setError('Choose a student from the selected class and section.'); return;
    }
    setSaving(true); setError('');
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
          <button type="button" className="tsc-icon-button tsc-text-button" aria-label="Save response" title="Save response" disabled={saving || !responses[x.id]} onClick={() => void respond(x.id)}><AdminActionIcon action="save" />Save response</button>
        </div>
      </article>) : !loading && <p className="tw-empty">No student requests.</p>}</section>}
    {tab !== 'Requests' && <>
      <div className="tsc-actions"><h3>{tab}</h3><button type="button" className="tsc-icon-button tsc-text-button" aria-label={"Add " + (tab === 'Achievements' ? 'achievement' : tab === 'Events' ? 'event' : 'announcement')} title={"Add " + (tab === 'Achievements' ? 'achievement' : tab === 'Events' ? 'event' : 'announcement')} onClick={add}><AdminActionIcon action="add" />Add {tab === 'Achievements' ? 'achievement' : tab === 'Events' ? 'event' : 'announcement'}</button></div>
      {formOpen && <form className="tw-panel tsc-form" onSubmit={save}>
        <div className="tsc-form-head"><h3>{editingId === null ? 'Add' : 'Edit'} {tab.toLowerCase()}</h3><button type="button" className="tsc-icon-button" aria-label="Cancel" title="Cancel" onClick={() => setFormOpen(false)}><AdminActionIcon action="close" /></button></div>
        {tab === 'Achievements' && <div className="tsc-achievement-pickers">
          <label>Class<select required value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value, sectionId: '', studentId: '' })}><option value="">Choose class</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Section<select required disabled={!form.classId} value={form.sectionId} onChange={e => setForm({ ...form, sectionId: e.target.value, studentId: '' })}><option value="">Choose section</option>{sections.filter(item => String(item.classId) === form.classId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Student<select required disabled={!form.sectionId} value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })}><option value="">Choose student</option>{matchingStudents.map(student => <option value={student.id || student.studentId} key={student.id || student.studentId}>{student.studentName || student.name}{student.rollNumber ? ' (Roll ' + student.rollNumber + ')' : ''}</option>)}</select></label>
        </div>}
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
        <button type="submit" className="tsc-icon-button tsc-text-button tsc-submit-icon" aria-label={saving ? "Saving..." : editingId === null ? "Save" : "Save changes"} title={editingId === null ? "Save" : "Save changes"} disabled={saving}><AdminActionIcon action="save" />{saving ? 'Saving...' : editingId === null ? 'Save' : 'Save changes'}</button>
      </form>}
      <section className="tsc-list" aria-label={`${tab} list`}>{rows.length ? rows.map(row =>
        <article className="tw-panel tsc-record" key={row.id}>
          <div className="tsc-record-head"><h4>{row.title}</h4><button type="button" className="tsc-icon-button" aria-label="Edit" title="Edit" onClick={() => edit(row)}><AdminActionIcon action="edit" /></button></div>
          <small>{listMeta(row)}</small>
          {listDetail(row) && <p>{listDetail(row)}</p>}
        </article>) : !loading && <p className="tw-empty">No {tab.toLowerCase()} added yet.</p>}</section>
    </>}
  </div>;
}
