import React, { useEffect, useState } from 'react';
import { PageLoader, LoadingButton } from '../components/Loader/Loader';
import { localDate, teacherRequest } from './TeacherWorkspace';
import './TeacherWorkspace.css';
import './TeacherStudentContent.css';

type Row = Record<string, any>;
export type TeacherContentPage = 'Class Diary' | 'Submissions' | 'Announcements' | 'Messages';
export default function TeacherStudentContent({ page }: { page: TeacherContentPage }) {
  const [options, setOptions] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [assignments, setAssignments] = useState<Row[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [error, setError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ option: '', entryDate: localDate(), topic: '', pages: '', homework: '', title: '', body: '', expiresAt: '', isPinned: false, publish: true });
  const [reviews, setReviews] = useState<Record<number, { status: string; marks: string; feedback: string }>>({});
  const [replies, setReplies] = useState<Record<number, string>>({});
  const load = async () => {
    setLoading(true); setError('');
    try {
      const opts = await teacherRequest('/api/Teacher/teaching-options');
      setOptions(opts.data || []);
      if (page === 'Class Diary') {
        const result = await teacherRequest('/api/Teacher/diary');
        setRows(result.data || []);
      } else if (page === 'Announcements') {
        const result = await teacherRequest('/api/Teacher/announcements');
        setRows(result.data || []);
      } else {
        const result = await teacherRequest('/api/Teacher/homework');
        setAssignments(result.data || []);
      }
    } catch (failure: any) { setError(failure.message || 'Could not load teacher data.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (page !== 'Submissions' || !assignmentId) { setRows([]); return; }
    setLoading(true);
    teacherRequest(`/api/Teacher/submissions?assignmentId=${assignmentId}`)
      .then(result => setRows(result.data || []))
      .catch((failure: any) => setError(failure.message || 'Could not load submissions.'))
      .finally(() => setLoading(false));
  }, [assignmentId, page]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (page === 'Class Diary') {
        const option = options[Number(form.option)];
        if (!option) return;
        await teacherRequest('/api/Teacher/diary', { method: 'POST', body: JSON.stringify({
          sectionId: option.sectionId, subjectId: option.subjectId,
          entryDate: form.entryDate, topic: form.topic, pages: form.pages,
          homework: form.homework, publish: form.publish,
        }) });
      } else {
        const option = options[Number(form.option)];
        if (!option) return;
        await teacherRequest('/api/Teacher/announcements', { method: 'POST', body: JSON.stringify({
          sectionId: option.sectionId, title: form.title, body: form.body,
          expiresAt: form.expiresAt || null, isPinned: form.isPinned, publish: form.publish,
        }) });
      }
      setForm({ option: '', entryDate: localDate(), topic: '', pages: '', homework: '', title: '', body: '', expiresAt: '', isPinned: false, publish: true });
      await load();
    } catch (failure: any) { setError(failure.message || 'Could not save.'); }
    finally { setSaving(false); }
  };
  const reviewValue = (row: Row) => reviews[row.id] || {
    status: ['Graded', 'Returned', 'Resubmission Required'].includes(row.status) ? row.status : 'Graded',
    marks: row.marks == null ? '' : String(row.marks),
    feedback: row.teacherFeedback || '',
  };
  const review = async (id: number) => {
    const row = rows.find(item => item.id === id);
    if (!row || saving) return;
    const value = reviewValue(row);
    const marks = value.marks.trim() === '' ? null : Number(value.marks);
    const total = assignments.find(item => String(item.id) === assignmentId)?.totalMarks;
    setReviewSuccess('');
    if (value.status === 'Graded' && marks !== null &&
        (!Number.isFinite(marks) || marks < 0 || (total != null && marks > Number(total)))) {
      setError(total != null ? 'Marks must be between 0 and ' + total + '.' : 'Enter valid non-negative marks.');
      return;
    }
    setSaving(true); setError('');
    try {
      await teacherRequest(`/api/Teacher/submissions/${id}/review`, { method: 'POST', body: JSON.stringify({
        status: value.status, marks: value.status === 'Graded' ? marks : null, feedback: value.feedback,
      }) });
      setRows(current => current.map(item => item.id === id ? { ...item, status: value.status,
        marks: value.status === 'Graded' ? marks : null, teacherFeedback: value.feedback } : item));
      setReviewSuccess('Review saved successfully.');
      const result = await teacherRequest(`/api/Teacher/submissions?assignmentId=${assignmentId}`);
      setRows(result.data || []);
    } catch (failure: any) { setError(failure.message || 'Could not review submission.'); }
    finally { setSaving(false); }
  };
  const reply = async (studentId: number) => { const body = replies[studentId]?.trim(); if (!body) return; setSaving(true); setError(''); try { await teacherRequest('/api/Teacher/messages', { method: 'POST', body: JSON.stringify({ studentId, body }) }); setReplies({ ...replies, [studentId]: '' }); await load(); } catch (failure: any) { setError(failure.message || 'Could not send reply.'); } finally { setSaving(false); } };
  const download = async (id: number) => {
    try {
      const response = await fetch(`/api/Teacher/submissions/${id}/file`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!response.ok) throw new Error('Could not download the file.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'student-submission'; link.click(); URL.revokeObjectURL(url);
    } catch (failure: any) { setError(failure.message); }
  };
  return <div className="tw tsc">
    <section className="tw-hero"><div><span className="tw-eyebrow">CLASSROOM</span><h2>{page}</h2><p>{page === 'Class Diary' ? 'Record the lesson and homework for your class.' : page === 'Submissions' ? 'Read student work and return feedback.' : page === 'Messages' ? 'Reply to students in your classes.' : 'Publish updates to the classes you teach.'}</p></div></section>
    {error && <div className="tw-error" role="alert">{error}</div>}
    {reviewSuccess && <div className="tw-panel" role="status">{reviewSuccess}</div>}
    {loading && <PageLoader label="Loading classroom data…" />}
    {(page === 'Class Diary' || page === 'Announcements') && <form className="tw-panel tsc-form" onSubmit={save}>
      <label>Class and subject<select required value={form.option} onChange={e => setForm({ ...form, option: e.target.value })}><option value="">Select class and subject</option>{options.map((x,i) => <option value={i} key={i}>{x.className} - {x.sectionName} - {x.subjectName}</option>)}</select></label>
      {page === 'Class Diary' ? <>
        <label>Class date<input type="date" required max={localDate()} value={form.entryDate} onChange={e => setForm({ ...form, entryDate: e.target.value })}/></label>
        <label className="tsc-full">Topic taught<input required maxLength={500} value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}/></label>
        <label>Pages<input maxLength={100} value={form.pages} onChange={e => setForm({ ...form, pages: e.target.value })}/></label>
        <label className="tsc-full">Homework<textarea rows={3} maxLength={2000} value={form.homework} onChange={e => setForm({ ...form, homework: e.target.value })}/></label>
      </> : <>
        <label className="tsc-full">Title<input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}/></label>
        <label className="tsc-full">Message<textarea required rows={4} maxLength={4000} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}/></label>
        <label>Expires (optional)<input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}/></label>
        <label className="tsc-check"><input type="checkbox" checked={form.isPinned} onChange={e => setForm({ ...form, isPinned: e.target.checked })}/> Pin to top</label>
      </>}
      <label className="tsc-check"><input type="checkbox" checked={form.publish} onChange={e => setForm({ ...form, publish: e.target.checked })}/> Publish now</label>
      <LoadingButton className="btn btn-primary" loading={saving} loadingText="Saving…">{form.publish ? 'Publish' : 'Save draft'}</LoadingButton>
    </form>}
    {page === 'Submissions' && <section className="tw-panel tsc-select"><label>Assignment<select value={assignmentId} onChange={e => { setAssignmentId(e.target.value); setReviewSuccess(''); setError(''); }}><option value="">Choose an assignment</option>{assignments.map(x => <option key={x.id} value={x.id}>{x.title} - {x.className} {x.sectionName}</option>)}</select></label></section>}
    <section className="tsc-list"><h3>{page === 'Submissions' ? 'Student work' : page === 'Messages' ? 'Messages' : 'Published records'}</h3>{!rows.length && !loading && <p className="tw-empty">{page === 'Submissions' && !assignmentId ? 'Choose an assignment to see submissions.' : 'No records yet.'}</p>}
      {rows.map(x => <article className="tw-panel tsc-record" key={x.id}>
        {page === 'Class Diary' && <><span className="tw-pill">{x.isPublished ? 'Published' : 'Draft'}</span><h4>{x.subjectName} · {new Date(x.entryDate).toLocaleDateString()}</h4><p>{x.topic}</p>{x.pages && <p>Pages: {x.pages}</p>}{x.homework && <p>Homework: {x.homework}</p>}</>}
        {page === 'Announcements' && <><span className="tw-pill">{x.isPinned ? 'Pinned' : x.isPublished ? 'Published' : 'Draft'}</span><h4>{x.title}</h4><p>{x.body}</p></>}
        {page === 'Messages' && <><span className="tw-pill">{x.fromStudent ? 'Student' : 'You'}</span><h4>{x.studentName}</h4><p>{x.body}</p><small>{new Date(x.sentAt).toLocaleString()}</small><div className="tsc-reply"><textarea rows={2} maxLength={2000} aria-label={'Reply to ' + x.studentName} placeholder="Write a reply" value={replies[x.studentId] || ''} onChange={e => setReplies({ ...replies, [x.studentId]: e.target.value })}/><button className="btn btn-primary" disabled={saving || !replies[x.studentId]?.trim()} onClick={() => void reply(x.studentId)}>Reply</button></div></>}
        {page === 'Submissions' && <><span className="tw-pill">{x.status}</span><h4>{x.studentName}</h4><p>Submitted {new Date(x.submittedAt).toLocaleString()}</p><p>{x.textAnswer || 'File submission'}</p>{x.hasFile && <button className="btn" onClick={() => void download(x.id)}>Download file</button>}<div className="tsc-review"><label>Status<select value={reviewValue(x).status} onChange={e => setReviews({ ...reviews, [x.id]: { ...reviewValue(x), status: e.target.value } })}>{['Graded','Returned','Resubmission Required'].map(status => <option key={status}>{status}</option>)}</select></label><label>Marks<input type="number" min="0" step="0.5" value={reviews[x.id]?.marks ?? x.marks ?? ''} onChange={e => setReviews({ ...reviews, [x.id]: { ...reviewValue(x), marks: e.target.value } })}/></label><label>Feedback<textarea rows={2} value={reviews[x.id]?.feedback ?? x.teacherFeedback ?? ''} onChange={e => setReviews({ ...reviews, [x.id]: { ...reviewValue(x), feedback: e.target.value } })}/></label><LoadingButton className="btn btn-primary" loading={saving} loadingText="Saving review…" onClick={() => void review(x.id)}>Save review</LoadingButton></div></>}
      </article>)}
    </section>
  </div>;
}


