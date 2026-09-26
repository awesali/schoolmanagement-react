import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { LoadingButton } from '../components/Loader/Loader';
import { SchoolIcon } from './TeacherWorkspace';
import './TeacherWorkspace.css';
import './TeacherUnitTest.css';

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

  return <div className="tw tut-page">
    <section className="tw-hero"><div><span className="tw-eyebrow">ASSESSMENTS</span><h2>Unit tests</h2><p>Schedule an assessment for a class and subject you teach.</p></div><div className="tw-emblem"><SchoolIcon name="book" /></div></section>
    <section className="tw-panel tut-panel">
      <div className="tut-panel-heading"><div><span className="tut-eyebrow">NEW ASSESSMENT</span><h3>Create a unit test</h3><p>Choose the class first to see its available sections and subjects.</p></div></div>
      {message && <div className={message.ok ? 'tut-message tut-success' : 'tut-message tut-error'} role={message.ok ? 'status' : 'alert'}>{message.text}</div>}
      {loading ? <p className="tut-empty" role="status">Loading your assigned classes...</p> : !classes.length ? <p className="tut-empty">No classes are assigned to you yet. Ask your administrator to assign a class before creating a unit test.</p> :
      <form onSubmit={save} className="tut-form">
        <label className="tut-wide">Test name <span>*</span><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics Unit Test 1" /></label>
        <label>Test date <span>*</span><input type="date" required value={form.testDate} onChange={e => setForm(f => ({ ...f, testDate: e.target.value }))} /></label>
        <label>Class <span>*</span><select required value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, sectionId: '', subjectId: '' }))}><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select></label>
        <label>Section <span>*</span><select required disabled={!form.classId} value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value, subjectId: '' }))}><option value="">Select section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.sectionName}</option>)}</select></label>
        <label>Subject <span>*</span><select required disabled={!form.sectionId} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}><option value="">Select subject</option>{subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}</select></label>
        <label>Total marks <span>*</span><input type="number" min="1" required value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} placeholder="e.g. 50" /></label>
        <label>Passing marks <span>*</span><input type="number" min="0" max={form.maxMarks || undefined} required value={form.passingMarks} onChange={e => setForm(f => ({ ...f, passingMarks: e.target.value }))} placeholder="e.g. 20" /></label>
        <div className="tut-actions"><LoadingButton className="btn btn-primary" loading={saving} loadingText="Creating...">Create unit test</LoadingButton></div>
      </form>}
    </section>
  </div>;
};

export default TeacherUnitTest;
