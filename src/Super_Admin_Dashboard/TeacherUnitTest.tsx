import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { LoadingButton } from '../components/Loader/Loader';
import './StaffList.css';

type Subject = { subjectId: number; subjectName: string };
type Section = { id: number; sectionName: string; subjects: Subject[] };
type AssignedClass = { id: number; className: string; sections: Section[] };

const TeacherUnitTest: React.FC = () => {
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [form, setForm] = useState({ name: '', classId: '', sectionId: '', subjectId: '', testDate: '', maxMarks: '', passingMarks: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const headers = () => ({ accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Class/my-classes`, { headers: headers(), cache: 'no-store' })
      .then(r => r.json()).then(r => setClasses(r.data || []))
      .catch(() => setMessage({ text: 'Unable to load assigned classes.', ok: false }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const selectedClass = classes.find(c => String(c.id) === form.classId);
  const sections = selectedClass?.sections || [];
  const selectedSection = sections.find(s => String(s.id) === form.sectionId);
  const subjects = useMemo(() => selectedSection?.subjects || [], [selectedSection]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Exam/teacher/unit-test`, {
        method: 'POST', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, classId: Number(form.classId), sectionId: Number(form.sectionId), subjectId: Number(form.subjectId), maxMarks: Number(form.maxMarks), passingMarks: Number(form.passingMarks) }),
      });
      const result = await response.json();
      setMessage({ text: result.message || (response.ok ? 'Unit test created.' : 'Unable to create unit test.'), ok: response.ok && result.success });
      if (response.ok) setForm({ name: '', classId: '', sectionId: '', subjectId: '', testDate: '', maxMarks: '', passingMarks: '' });
    } catch { setMessage({ text: 'Unable to create unit test.', ok: false }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="staff-list-loading">Loading assigned classes...</div>;
  return <div className="staff-list-container">
    <div className="staff-list-header"><div><h2>Add Unit Test</h2><p style={{ color: '#718096' }}>You can add a unit test only for your assigned class and section.</p></div></div>
    {message && <div style={{ padding: 12, marginBottom: 15, borderRadius: 8, background: message.ok ? '#c6f6d5' : '#fed7d7', color: message.ok ? '#22543d' : '#742a2a' }}>{message.text}</div>}
    {!classes.length ? <div className="staff-list-loading">No class is assigned to you.</div> :
    <form onSubmit={save} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
      <label>Test Name *<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics Unit Test 1" /></label>
      <label>Test Date *<input type="date" required value={form.testDate} onChange={e => setForm(f => ({ ...f, testDate: e.target.value }))} /></label>
      <label>Class *<select required value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, sectionId: '', subjectId: '' }))}><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select></label>
      <label>Section *<select required value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value, subjectId: '' }))}><option value="">Select Section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.sectionName}</option>)}</select></label>
      <label>Subject *<select required value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}><option value="">Select Subject</option>{subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}</select></label>
      <label>Total Marks *<input type="number" min="1" required value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} /></label>
      <label>Passing Marks *<input type="number" min="0" required value={form.passingMarks} onChange={e => setForm(f => ({ ...f, passingMarks: e.target.value }))} /></label>
      <div style={{ alignSelf: 'end' }}><LoadingButton className="btn btn-primary" loading={saving} loadingText="Saving...">Create Unit Test</LoadingButton></div>
    </form>}
  </div>;
};

export default TeacherUnitTest;
