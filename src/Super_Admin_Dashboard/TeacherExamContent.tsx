import React, { useEffect, useState } from 'react';
import { PageLoader, LoadingButton } from '../components/Loader/Loader';
import { teacherRequest } from './TeacherWorkspace';
import './TeacherStudentContent.css';
type Row = Record<string, any>;
export default function TeacherExamContent() {
  const [options, setOptions] = useState<Row[]>([]);
  const [exams, setExams] = useState<Row[]>([]);
  const [resources, setResources] = useState<Row[]>([]);
  const [examId, setExamId] = useState('');
  const [optionIndex, setOptionIndex] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [teaching, examOptions, syllabusRows] = await Promise.all([
        teacherRequest('/api/Teacher/teaching-options'),
        teacherRequest('/api/Teacher/exam-options'),
        teacherRequest('/api/Teacher/exam-resources'),
      ]);
      setOptions(teaching.data || []); setExams(examOptions.data || []); setResources(syllabusRows.data || []);
    } catch (failure: any) { setError(failure.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    const option = options[Number(optionIndex)];
    if (!option || !examId) { setError('Choose an exam and class.'); return; }
    setSaving(true); setError('');
    try {
      await teacherRequest('/api/Teacher/exam-resources', { method: 'POST', body: JSON.stringify({
        examId: Number(examId), sectionId: option.sectionId, subjectId: option.subjectId,
        syllabus, resourceUrl, publish,
      }) });
      await load();
    } catch (failure: any) { setError(failure.message); }
    finally { setSaving(false); }
  };
  return <div className="tw tsc">
    <section className="tw-hero"><div><span className="tw-eyebrow">ACADEMICS</span><h2>Exam preparation</h2><p>Publish syllabus for the classes you teach.</p></div></section>
    {error && <div role="alert" className="tw-error">{error}</div>}{loading && <PageLoader label="Loading exam tools…" />}
    <section className="tw-panel tsc-form"><label>Exam<select value={examId} onChange={e => setExamId(e.target.value)}><option value="">Choose exam</option>{exams.map(x => <option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>Class and subject<select value={optionIndex} onChange={e => setOptionIndex(e.target.value)}><option value="">Choose class</option>{options.map((x, i) => <option value={i} key={i}>{x.className} · {x.sectionName} · {x.subjectName}</option>)}</select></label></section>
    <section className="tw-panel tsc-form"><h3>Syllabus</h3><label className="tsc-full">Topics<textarea value={syllabus} onChange={e => setSyllabus(e.target.value)} maxLength={4000} rows={4} /></label><label className="tsc-full">Resource link<input type="url" value={resourceUrl} onChange={e => setResourceUrl(e.target.value)} /></label><label className="tsc-check"><input type="checkbox" checked={publish} onChange={e => setPublish(e.target.checked)} />Publish now</label><LoadingButton className="btn btn-primary" loading={saving} onClick={() => void save()}>Save syllabus</LoadingButton></section>
    <section className="tw-panel"><h3>Published syllabus</h3>{resources.map(x => <p key={x.id}><strong>{exams.find(e => e.id === x.examId)?.name}</strong> · {x.syllabus}</p>)}{!resources.length && <p className="tw-empty">No syllabus yet.</p>}</section>
  </div>;
}
