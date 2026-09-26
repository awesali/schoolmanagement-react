import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './TeacherStudentContent.css';

type Row = Record<string, any>;
type TicketForm = {
  classId: string; sectionId: string; studentId: string; examId: string;
  seatNumber: string; room: string; venue: string; documentUrl: string; publish: boolean;
};
const emptyForm: TicketForm = {
  classId: '', sectionId: '', studentId: '', examId: '', seatNumber: '', room: '',
  venue: '', documentUrl: '', publish: true,
};

export default function HallTicketManagement({ schoolId }: { schoolId: number }) {
  const [classes, setClasses] = useState<Row[]>([]);
  const [sections, setSections] = useState<Row[]>([]);
  const [students, setStudents] = useState<Row[]>([]);
  const [exams, setExams] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const request = async (path: string, options?: RequestInit) => {
    const response = await fetch(`${API_BASE_URL}/api/SchoolStudentAdmin${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...options?.headers },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || 'Request failed.');
    return body.data;
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [tickets, examOptions, options] = await Promise.all([
        request(`/hall-tickets?schoolId=${schoolId}`),
        request(`/exam-options?schoolId=${schoolId}`),
        request(`/hall-ticket-options?schoolId=${schoolId}`),
      ]);
      setRows(tickets || []);
      setExams(examOptions || []);
      setClasses(options?.classes || []);
      setSections(options?.sections || []);
      setStudents(options?.students || []);
    } catch (failure: any) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { setForm(emptyForm); setEditingId(null); void load(); }, [schoolId]);

  const classSections = sections.filter(x => String(x.classId) === form.classId);
  const sectionStudents = students.filter(x => String(x.classId) === form.classId && String(x.sectionId) === form.sectionId);
  const selectedStudent = sectionStudents.find(x => String(x.id) === form.studentId);
  const studentExams = exams.filter(x => selectedStudent && Number(x.sessionId) === Number(selectedStudent.sessionId));

  const edit = (ticket: Row) => {
    const student = students.find(x => Number(x.id) === Number(ticket.studentId) && Number(x.sessionId) === Number(ticket.sessionId));
    if (!student) {
      setError('This student has no active enrollment in the ticket exam session. Update their enrollment before editing.');
      return;
    }
    setError('');
    setEditingId(Number(ticket.id));
    setForm({
      classId: String(student.classId), sectionId: String(student.sectionId), studentId: String(ticket.studentId),
      examId: String(ticket.examId), seatNumber: ticket.seatNumber || '', room: ticket.room || '',
      venue: ticket.venue || '', documentUrl: ticket.documentUrl || '', publish: Boolean(ticket.isPublished),
    });
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setError(''); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError('');
    try {
      const path = editingId === null ? '/hall-tickets' : `/hall-tickets/${editingId}`;
      await request(path, {
        method: editingId === null ? 'POST' : 'PUT',
        body: JSON.stringify({ ...form, schoolId, classId: Number(form.classId), sectionId: Number(form.sectionId),
          studentId: Number(form.studentId), examId: Number(form.examId) }),
      });
      setEditingId(null); setForm(emptyForm);
      await load();
    } catch (failure: any) { setError(failure.message); }
    finally { setSaving(false); }
  };

  return <div className="tw tsc">
    <section className="tw-hero"><div><span className="tw-eyebrow">STUDENT SERVICES</span><h2>Hall tickets</h2><p>Assign exam seats and publish tickets for students.</p></div></section>
    {error && <div className="tw-error" role="alert">{error}</div>}
    {loading && <PageLoader label="Loading hall tickets…" />}
    <form ref={formRef} className="tw-panel tsc-form" onSubmit={save}>
      <div className="tsc-full tsc-form-heading"><h3>{editingId === null ? 'Create hall ticket' : 'Edit hall ticket'}</h3>{editingId !== null && <button type="button" className="btn" onClick={cancelEdit}>Cancel edit</button>}</div>
      <label>Class<select required value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value, sectionId: '', studentId: '', examId: '' })}><option value="">Choose class</option>{classes.map(x => <option key={x.id} value={x.id}>{x.className}</option>)}</select></label>
      <label>Section<select required disabled={!form.classId} value={form.sectionId} onChange={e => setForm({ ...form, sectionId: e.target.value, studentId: '', examId: '' })}><option value="">Choose section</option>{classSections.map(x => <option key={x.id} value={x.id}>{x.sectionName}</option>)}</select></label>
      <label>Student<select required disabled={!form.sectionId} value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value, examId: '' })}><option value="">Choose student</option>{sectionStudents.map(x => <option key={x.id} value={x.id}>{x.studentName}{x.rollNumber ? ` · Roll ${x.rollNumber}` : ''}</option>)}</select></label>
      <label>Exam<select required disabled={!form.studentId} value={form.examId} onChange={e => setForm({ ...form, examId: e.target.value })}><option value="">Choose exam</option>{studentExams.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      {form.studentId && !studentExams.length && <p className="tsc-full tw-error">No exams found for this student's academic session.</p>}
      <label>Seat number<input required maxLength={50} value={form.seatNumber} onChange={e => setForm({ ...form, seatNumber: e.target.value })} /></label>
      <label>Room<input required maxLength={100} value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} /></label>
      <label className="tsc-full">Venue<input maxLength={200} placeholder="Exam centre or school address" value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} /></label>
      <label className="tsc-full">Ticket link<input type="url" value={form.documentUrl} onChange={e => setForm({ ...form, documentUrl: e.target.value })} /></label>
      <label className="tsc-check"><input type="checkbox" checked={form.publish} onChange={e => setForm({ ...form, publish: e.target.checked })} />Publish now</label>
      <button className="btn btn-primary" disabled={saving || loading}>{saving ? 'Saving…' : editingId === null ? 'Create ticket' : 'Save changes'}</button>
    </form>
    <section className="tsc-list">{rows.map(x => <article className="tw-panel tsc-record" key={x.id}><h4>{x.studentName} · {x.examName}</h4><p>Seat {x.seatNumber} · Room {x.room} · Venue {x.venue || 'School address'} · {x.isPublished ? 'Published' : 'Draft'}</p><button type="button" className="btn" onClick={() => edit(x)}>Edit ticket</button></article>)}{!loading && !rows.length && <p className="tw-empty">No hall tickets yet.</p>}</section>
  </div>;
}
