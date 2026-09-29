import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../config';
import { LoadingButton } from '../components/Loader/Loader';
import { SchoolIcon } from './TeacherWorkspace';
import './TeacherWorkspace.css';
import './TeacherUnitTest.css';

type Subject = { subjectId: number; subjectName: string };
type Section = { id: number; sectionName: string; subjects: Subject[] };
type AssignedClass = { id: number; className: string; sections: Section[] };
type UnitTest = { id: number; name: string; classId: number; className: string; sectionId: number; sectionName: string; subjectId: number; subjectName: string; testDate: string; maxMarks: number; passingMarks: number; canEdit: boolean };
const emptyForm = () => ({ name: '', classId: '', sectionId: '', subjectId: '', testDate: '', maxMarks: '', passingMarks: '' });

const TeacherUnitTest: React.FC = () => {
  const [classes, setClasses] = useState<AssignedClass[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<UnitTest[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const headers = () => ({ accept: 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/Exam/teacher/unit-test/classes`, { headers: headers(), cache: 'no-store' })
      .then(async r => { const result = await r.json(); if (!r.ok || !result.success) throw new Error(result.message || 'Unable to load your teaching periods.'); return result; }).then(r => setClasses(r.data || []))
      .catch(() => setMessage({ text: 'Unable to load your teaching periods.', ok: false }))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const loadTests = async () => {
    setTestsLoading(true);
    try {
      const response = await fetch(API_BASE_URL + '/api/Exam/teacher/unit-test', { headers: headers(), cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to load unit tests.');
      setTests(result.data || []);
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Unable to load unit tests.', ok: false });
    } finally { setTestsLoading(false); }
  };

  useEffect(() => { void loadTests(); }, []); // eslint-disable-line
  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setMessage(null); setFormOpen(true); };
  const openEdit = (test: UnitTest) => {
    if (!test.canEdit) return;
    setEditingId(test.id);
    setForm({
      name: test.name, classId: String(test.classId), sectionId: String(test.sectionId),
      subjectId: String(test.subjectId), testDate: String(test.testDate).slice(0, 10),
      maxMarks: String(test.maxMarks), passingMarks: String(test.passingMarks),
    });
    setMessage(null); setFormOpen(true);
  };
  const selectedClass = classes.find(c => String(c.id) === form.classId);
  const sections = selectedClass?.sections || [];
  const selectedSection = sections.find(s => String(s.id) === form.sectionId);
  const subjects = useMemo(() => selectedSection?.subjects || [], [selectedSection]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjects.some(subject => String(subject.subjectId) === form.subjectId)) { setMessage({ text: 'Choose a subject assigned to your timetable period.', ok: false }); return; }
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(API_BASE_URL + '/api/Exam/teacher/unit-test' + (editingId === null ? '' : '/' + editingId), {
        method: editingId === null ? 'POST' : 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, classId: Number(form.classId), sectionId: Number(form.sectionId), subjectId: Number(form.subjectId), maxMarks: Number(form.maxMarks), passingMarks: Number(form.passingMarks) }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to save unit test.');
      await loadTests();
      setMessage({ text: result.message || (editingId === null ? 'Unit test created.' : 'Unit test updated.'), ok: true });
      setForm(emptyForm()); setEditingId(null); setFormOpen(false);
    } catch (error) { setMessage({ text: error instanceof Error ? error.message : 'Unable to save unit test.', ok: false }); }
    finally { setSaving(false); }
  };

  return <div className="tw tut-page">
    <section className="tw-hero"><div><span className="tw-eyebrow">ASSESSMENTS</span><h2>Unit tests</h2><p>Create a test for a subject you teach in a scheduled class period.</p></div><div className="tw-emblem"><SchoolIcon name="book" /></div></section>
    <section className="tw-panel tut-panel">
      <div className="tut-list-heading"><div><span className="tut-eyebrow">YOUR ASSESSMENTS</span><h3>Created unit tests</h3></div><button type="button" className="btn btn-primary" onClick={openCreate}>Add unit test</button></div>
      {message && !formOpen && <div className={message.ok ? 'tut-message tut-success' : 'tut-message tut-error'} role={message.ok ? 'status' : 'alert'}>{message.text}</div>}
      {testsLoading ? <p className="tut-empty" role="status">Loading unit tests...</p> : tests.length ? <div className="tut-list">{tests.map(test => <article className="tut-test-card" key={test.id}>
        <div><h4>{test.name}</h4><p>{test.className} · {test.sectionName} · {test.subjectName}</p><small>{new Date(test.testDate).toLocaleDateString('en-GB')} · {test.maxMarks} marks · Pass {test.passingMarks}</small></div>
        <button type="button" className="btn" disabled={!test.canEdit} title={test.canEdit ? 'Edit unit test' : 'Marks, results or a schedule already exist'} onClick={() => openEdit(test)}>Edit</button>
      </article>)}</div> : <p className="tut-empty">No unit tests created yet.</p>}
    </section>
    {formOpen && <section className="tw-panel tut-panel">
      <div className="tut-panel-heading"><div><span className="tut-eyebrow">{editingId === null ? 'NEW ASSESSMENT' : 'EDIT ASSESSMENT'}</span><h3>{editingId === null ? 'Create a unit test' : 'Edit unit test'}</h3><p>Choose a class, section and one of your scheduled subjects.</p></div><button type="button" className="btn" onClick={() => { setFormOpen(false); setMessage(null); }}>Cancel</button></div>
      {message && <div className={message.ok ? 'tut-message tut-success' : 'tut-message tut-error'} role={message.ok ? 'status' : 'alert'}>{message.text}</div>}
      {loading ? <p className="tut-empty" role="status">Loading your teaching periods...</p> : !classes.length ? <p className="tut-empty">No scheduled teaching periods were found. Ask your administrator to assign your subject and timetable periods.</p> :
      <form onSubmit={save} className="tut-form">
        <label className="tut-wide">Test name <span>*</span><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics Unit Test 1" /></label>
        <label>Test date <span>*</span><input type="date" required value={form.testDate} onChange={e => setForm(f => ({ ...f, testDate: e.target.value }))} /></label>
        <label>Class <span>*</span><select required value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value, sectionId: '', subjectId: '' }))}><option value="">Select class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select></label>
        <label>Section <span>*</span><select required disabled={!form.classId} value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value, subjectId: '' }))}><option value="">Select section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.sectionName}</option>)}</select></label>
        <label>Subject <span>*</span><select required disabled={!form.sectionId} value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}><option value="">Select subject</option>{subjects.map(s => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}</select></label>
        <label>Total marks <span>*</span><input type="number" min="1" required value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: e.target.value }))} placeholder="e.g. 50" /></label>
        <label>Passing marks <span>*</span><input type="number" min="0" max={form.maxMarks || undefined} required value={form.passingMarks} onChange={e => setForm(f => ({ ...f, passingMarks: e.target.value }))} placeholder="e.g. 20" /></label>
        <div className="tut-actions"><LoadingButton className="btn btn-primary" loading={saving} loadingText="Saving...">{editingId === null ? 'Create unit test' : 'Save changes'}</LoadingButton></div>
      </form>}
    </section>}
  </div>;
};

export default TeacherUnitTest;
