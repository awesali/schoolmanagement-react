import React, { useEffect, useState } from 'react';
import { profilePictureUrl } from '../Super_Admin_Dashboard/ProfilePictureInput';
import './StudentReportCards.css';

type Row = Record<string, any>;
type Props = { results: Row[]; gradeHistory: Row[]; resultSubjects?: Row[]; profile: Row; parent?: Row | null; showList?: boolean };
const amount = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
const percent = (value: number) => `${amount(Math.round(value * 100) / 100)}%`;

function SchoolMark({ name, url }: { name: string; url?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'S';
  return <div className="src-logo">{url && !failed
    ? <img src={profilePictureUrl(url)} alt={`${name} logo`} onError={() => setFailed(true)} />
    : <span aria-label="School avatar">{initials}</span>}</div>;
}

export default function StudentReportCards({ results, gradeHistory, resultSubjects, profile, parent, showList = true }: Props) {
  const [openExamId, setOpenExamId] = useState<string | null>(null);
  const activeResult = showList
    ? results.find((result, index) => String(result.examId ?? result.examName + '-' + index) === openExamId)
    : results[0];
  const reportTitle = activeResult
    ? (String(profile.studentName || 'Student').trim() + ' - Result of ' + String(activeResult.examName || 'Exam').trim())
        .replace(/[\\:*?"<>|]/g, ' ').replace(/\//g, ' ')
    : null;
  useEffect(() => {
    if (!reportTitle) return;
    const previousTitle = document.title;
    document.title = reportTitle;
    return () => { document.title = previousTitle; };
  }, [reportTitle]);
  if (!results.length) return <div className="sp-empty">No published results yet.</div>;
  if (showList && openExamId === null) return <div className="src-choices">{results.map((result, index) => {
    const key = String(result.examId ?? result.examName + '-' + index);
    return <button type="button" className="src-choice" key={key} onClick={() => setOpenExamId(key)}>
      <span><small>EXAM RESULT</small><strong>{result.examName}</strong></span><span>View result &#8594;</span>
    </button>;
  })}</div>;
  return <div className="src-list">{results.filter((result, index) =>
    !showList || String(result.examId ?? result.examName + '-' + index) === openExamId).map((result, index) => {
    const bySubject = new Map<string, Row>();
    (resultSubjects ?? gradeHistory).filter(mark => mark.examId == null && results.length === 1
      ? true
      : result.examId != null
      ? Number(mark.examId) === Number(result.examId)
      : mark.examName === result.examName).forEach(mark => {
      if (!bySubject.has(mark.subjectName)) bySubject.set(mark.subjectName, mark);
    });
    const subjects = Array.from(bySubject.values()).sort((a, b) => String(a.subjectName).localeCompare(String(b.subjectName)));
    const isComplete = result.isComplete !== false;
    const hasMarks = (mark: Row) => mark.obtainedMarks != null && Number.isFinite(Number(mark.obtainedMarks));
    const completeTotals = subjects.length > 0 && subjects.every(mark => Number(mark.maxMarks) > 0 && hasMarks(mark));
    const total = result.configuredTotalMarks != null ? Number(result.configuredTotalMarks) : completeTotals ? subjects.reduce((sum, mark) => sum + Number(mark.maxMarks), 0) : Number(result.totalMarks);
    const obtained = result.recordedObtainedMarks != null ? Number(result.recordedObtainedMarks) : completeTotals ? subjects.reduce((sum, mark) => sum + Number(mark.obtainedMarks), 0) : Number(result.obtainedMarks);
    const overall = isComplete && total > 0 ? obtained * 100 / total : NaN;
    const key = result.examId ?? `${result.examName}-${index}`;
    return <article className="src-card" key={key} aria-label={`${result.examName} report card`}>
      {showList && <button type="button" className="src-back" onClick={() => setOpenExamId(null)}>&#8592; Back to results</button>}
      <header className="src-header"><SchoolMark name={profile.schoolName || 'School'} url={profile.schoolLogoUrl} /><div><span className="src-eyebrow">STUDENT REPORT CARD</span><h2>{profile.schoolName || 'School'}</h2>{profile.schoolAddress && <p>{profile.schoolAddress}</p>}</div></header>
      <div className="src-exam-name"><span>Examination</span><strong>{result.examName}</strong></div>
      <dl className="src-identity"><div><dt>Student name</dt><dd>{profile.studentName || '—'}</dd></div><div><dt>Roll number</dt><dd>{profile.rollNumber || '—'}</dd></div><div><dt>Class / section</dt><dd>{[profile.className, profile.sectionName].filter(Boolean).join(' / ') || '—'}</dd></div><div><dt>Parent name</dt><dd>{parent?.name || '—'}</dd></div></dl>
      {!isComplete && <div className="src-pending" role="status">Marks pending: {result.recordedSubjectCount ?? subjects.filter(hasMarks).length}/{result.expectedSubjectCount ?? subjects.length} subjects recorded. Final result will update after all marks are entered.</div>}
      <div className="src-table-wrap"><table className="src-table"><thead><tr><th scope="col">Subject</th><th scope="col">Total marks</th><th scope="col">Obtained</th><th scope="col">Percentage</th></tr></thead><tbody>
        {subjects.length ? subjects.map(mark => {
          const maximum = Number(mark.maxMarks);
          const score = Number(mark.obtainedMarks);
          return <tr key={mark.subjectName}><th scope="row">{mark.subjectName}</th><td>{maximum > 0 ? amount(maximum) : '—'}</td><td>{hasMarks(mark) ? amount(score) : '—'}</td><td>{maximum > 0 && hasMarks(mark) ? percent(score * 100 / maximum) : '—'}</td></tr>;
        }) : <tr><td colSpan={4} className="src-no-subjects">Subject marks are not available for this published result.</td></tr>}
      </tbody><tfoot><tr><th scope="row">Overall total</th><td>{Number.isFinite(total) ? amount(total) : '—'}</td><td>{Number.isFinite(obtained) ? amount(obtained) : '—'}</td><td>{Number.isFinite(overall) ? percent(overall) : '—'}</td></tr></tfoot></table></div>
      <footer className="src-footer"><div><span>Result</span><strong className={isComplete ? String(result.resultStatus).toUpperCase() === 'PASS' ? 'src-pass' : 'src-fail' : ''}>{isComplete ? result.resultStatus || '—' : 'Pending'}</strong></div><div><span>Grade</span><strong>{isComplete ? result.grade || '—' : '—'}</strong></div><div><span>Percentage</span><strong>{Number.isFinite(overall) ? percent(overall) : '—'}</strong></div></footer>
      <div className="src-actions"><button type="button" className="btn" onClick={() => window.print()}>Print report card</button></div>
    </article>;
  })}</div>;
}
