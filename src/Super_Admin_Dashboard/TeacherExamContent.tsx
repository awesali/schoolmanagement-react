import React, { useEffect, useState } from 'react';
import { PageLoader, LoadingButton } from '../components/Loader/Loader';
import { teacherRequest } from './TeacherWorkspace';
import './TeacherStudentContent.css';
type Row = Record<string, any>;
export default function TeacherExamContent() {
  const [options, setOptions] = useState<Row[]>([]);
  const [exams, setExams] = useState<Row[]>([]);
  const [resources, setResources] = useState<Row[]>([]);
  const [questions, setQuestions] = useState<Row[]>([]);
  const [attempts, setAttempts] = useState<Row[]>([]);
  const [examId, setExamId] = useState('');
  const [optionIndex, setOptionIndex] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [publish, setPublish] = useState(true);
  const [question, setQuestion] = useState('');
  const [choices, setChoices] = useState(['','','','']);
  const [correctOption, setCorrectOption] = useState('A');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try {
    const [o,e,r] = await Promise.all([teacherRequest('/api/Teacher/teaching-options'), teacherRequest('/api/Teacher/exam-options'), teacherRequest('/api/Teacher/exam-resources')]);
    setOptions(o.data || []); setExams(e.data || []); setResources(r.data || []);
  } catch (failure: any) { setError(failure.message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (!examId) { setQuestions([]); setAttempts([]); return; } Promise.all([
    teacherRequest(`/api/Teacher/online-questions?examId=${examId}`), teacherRequest(`/api/Teacher/online-attempts?examId=${examId}`),
  ]).then(([q,a]) => { setQuestions(q.data || []); setAttempts(a.data || []); }).catch((failure: any) => setError(failure.message)); }, [examId]);
  const save = async (kind: 'resource' | 'question') => { const option=options[Number(optionIndex)]; if (!option || !examId) { setError('Choose an exam and class.'); return; } setSaving(true); setError(''); try {
    const scope={ examId:Number(examId), sectionId:option.sectionId, subjectId:option.subjectId };
    if (kind==='resource') await teacherRequest('/api/Teacher/exam-resources', { method:'POST', body:JSON.stringify({ ...scope, syllabus, resourceUrl, publish }) });
    else await teacherRequest('/api/Teacher/online-questions', { method:'POST', body:JSON.stringify({ ...scope, question, optionA:choices[0], optionB:choices[1], optionC:choices[2], optionD:choices[3], correctOption }) });
    setQuestion(''); setChoices(['','','','']); await load();
    const q=await teacherRequest(`/api/Teacher/online-questions?examId=${examId}`); setQuestions(q.data || []);
  } catch (failure: any) { setError(failure.message); } finally { setSaving(false); } };
  return <div className="tw tsc"><section className="tw-hero"><div><span className="tw-eyebrow">ACADEMICS</span><h2>Exam preparation</h2><p>Publish syllabus and questions for the classes you teach.</p></div></section>
    {error && <div role="alert" className="tw-error">{error}</div>}{loading && <PageLoader label="Loading exam tools…"/>}
    <section className="tw-panel tsc-form"><label>Exam<select value={examId} onChange={e => setExamId(e.target.value)}><option value="">Choose exam</option>{exams.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label><label>Class and subject<select value={optionIndex} onChange={e=>setOptionIndex(e.target.value)}><option value="">Choose class</option>{options.map((x,i)=><option value={i} key={i}>{x.className} · {x.sectionName} · {x.subjectName}</option>)}</select></label></section>
    <section className="tw-panel tsc-form"><h3>Syllabus</h3><label className="tsc-full">Topics<textarea value={syllabus} onChange={e=>setSyllabus(e.target.value)} maxLength={4000} rows={4}/></label><label className="tsc-full">Resource link<input type="url" value={resourceUrl} onChange={e=>setResourceUrl(e.target.value)}/></label><label className="tsc-check"><input type="checkbox" checked={publish} onChange={e=>setPublish(e.target.checked)}/>Publish now</label><LoadingButton className="btn btn-primary" loading={saving} onClick={()=>void save('resource')}>Save syllabus</LoadingButton></section>
    <section className="tw-panel tsc-form"><h3>Online question</h3><label className="tsc-full">Question<textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000}/></label>{choices.map((choice,i)=><label key={i}>Option {String.fromCharCode(65+i)}<input value={choice} maxLength={500} onChange={e=>setChoices(choices.map((x,j)=>j===i?e.target.value:x))}/></label>)}<label>Correct option<select value={correctOption} onChange={e=>setCorrectOption(e.target.value)}>{['A','B','C','D'].map(x=><option key={x}>{x}</option>)}</select></label><LoadingButton className="btn btn-primary" loading={saving} onClick={()=>void save('question')}>Add question</LoadingButton></section>
    <section className="tw-panel"><h3>Published syllabus</h3>{resources.map(x=><p key={x.id}><strong>{exams.find(e=>e.id===x.examId)?.name}</strong> · {x.syllabus}</p>)}{!resources.length && <p className="tw-empty">No syllabus yet.</p>}</section>
    <section className="tw-panel"><h3>Exam questions</h3>{questions.map((x,i)=><p key={x.id}>{i+1}. {x.question}</p>)}{!questions.length && <p className="tw-empty">No questions for this exam.</p>}</section>
    <section className="tw-panel"><h3>Student submissions</h3>{attempts.map((x,i)=><p key={i}>{x.studentName} · {x.correctCount}/{x.totalQuestions}</p>)}{!attempts.length && <p className="tw-empty">No submissions yet.</p>}</section>
  </div>;
}
