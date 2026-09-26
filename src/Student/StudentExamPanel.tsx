import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

type Row = Record<string, any>;
export default function StudentExamPanel({ data, refresh }: { data: { examResources?: Row[]; hallTickets?: Row[]; onlineExams?: Row[]; onlineAttempts?: Row[] }; refresh: () => void }) {
  const [exam, setExam] = useState<Row | null>(null);
  const [questions, setQuestions] = useState<Row[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState('');
  const token = localStorage.getItem('token');
  const open = async (item: Row) => {
    setBusy(true); setError(''); setScore('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/StudentPortal/online-exams/${item.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Exam could not open.');
      setExam(item); setQuestions(body.data.questions); setAnswers({});
    } catch (failure: any) { setError(failure.message); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    if (!exam || questions.some(q => !answers[q.id])) { setError('Answer every question before submitting.'); return; }
    if (!window.confirm('Submit your exam answers? You can submit only once.')) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/StudentPortal/online-exams/${exam.id}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ answers }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Exam could not be submitted.');
      setScore(`Submitted: ${body.data.correctCount} / ${body.data.totalQuestions} correct`); setExam(null); setQuestions([]); refresh();
    } catch (failure: any) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <>
    <section className="sp-panel"><div className="sp-panel-title"><h2>Syllabus and preparation</h2></div>{data.examResources?.length ? data.examResources.map(x => <div className="sp-line" key={x.id}><div><strong>{x.examName} - {x.subjectName}</strong><small>{x.syllabus}</small></div>{x.resourceUrl && /^https?:\/\//i.test(x.resourceUrl) && <a href={x.resourceUrl} target="_blank" rel="noreferrer">Resource ?</a>}</div>) : <div className="sp-empty">No exam syllabus published yet.</div>}</section>
    <section className="sp-panel"><div className="sp-panel-title"><h2>Hall tickets</h2></div>{data.hallTickets?.length ? data.hallTickets.map(x => <div className="sp-line" key={x.id}><div><strong>{x.examName}</strong><small>Seat {x.seatNumber} - Room {x.room}</small></div>{x.documentUrl && /^https?:\/\//i.test(x.documentUrl) && <a href={x.documentUrl} target="_blank" rel="noreferrer">Open ticket ?</a>}</div>) : <div className="sp-empty">No hall tickets published yet.</div>}</section>
    <section className="sp-panel"><div className="sp-panel-title"><h2>Online exams</h2></div>{data.onlineExams?.length ? data.onlineExams.map(x => { const attempt = data.onlineAttempts?.find(a => a.examId === x.id); return <div className="sp-line" key={x.id}><div><strong>{x.name}</strong><small>{attempt ? `Submitted - ${attempt.correctCount}/${attempt.totalQuestions}` : `${String(x.startDate || '').slice(0,10)} - ${String(x.endDate || '').slice(0,10)}`}</small></div>{!attempt && <button className="btn" disabled={busy} onClick={() => void open(x)}>Start exam</button>}</div>; }) : <div className="sp-empty">No online exams available.</div>}{error && <p role="alert" className="sp-error">{error}</p>}{score && <p role="status">{score}</p>}{exam && <div><h3>{exam.name}</h3>{questions.map((q, index) => <fieldset key={q.id} className="sp-record"><legend>{index + 1}. {q.question}</legend>{(['A','B','C','D'] as const).map(choice => <label key={choice} style={{display:'block',margin:'8px 0'}}><input type="radio" name={`q-${q.id}`} checked={answers[q.id] === choice} onChange={() => setAnswers({ ...answers, [q.id]: choice })}/> {choice}. {q[`option${choice}`]}</label>)}</fieldset>)}<button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Submitting...' : 'Submit exam'}</button></div>}</section>
  </>;
}
