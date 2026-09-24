import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import { LoadingButton } from '../components/Loader/Loader';

type Row = Record<string, any>;
export default function StudentAssignment({ assignment, submission, onComplete, onClose }: {
  assignment: Row; submission?: Row; onComplete: () => Promise<void>; onClose: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const canSubmit = !submission || submission.status === 'Resubmission Required';
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!answer.trim() && !file) { setError('Add an answer or choose a file.'); return; }
    if (file && file.size > 10 * 1024 * 1024) { setError('Choose a file up to 10 MB.'); return; }
    setSaving(true); setError('');
    try {
      const body = new FormData();
      body.append('assignmentId', String(assignment.id));
      body.append('textAnswer', answer.trim());
      if (file) body.append('file', file);
      const response = await fetch(`${API_BASE_URL}/api/StudentPortal/submissions`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not submit assignment.');
      await onComplete();
      onClose();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not submit assignment.'); }
    finally { setSaving(false); }
  };
  const download = async () => {
    if (!submission) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/StudentPortal/submissions/${submission.id}/file`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('File could not be downloaded.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a'); link.href = url; link.download = 'my-submission';
      link.click(); URL.revokeObjectURL(url);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Download failed.'); }
  };
  return <div className="sp-modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-title" onMouseDown={e => e.stopPropagation()}>
      <button className="sp-modal-close" onClick={onClose} aria-label="Close">×</button>
      <span className="sp-tag">{assignment.subjectName}</span>
      <h2 id="assignment-title">{assignment.title}</h2>
      <p>{assignment.description}</p>
      <div className="sp-assignment-meta"><span>Assigned {new Date(assignment.assignedDate).toLocaleDateString()}</span><span>Due {new Date(assignment.dueDate).toLocaleString()}</span>{assignment.totalMarks != null && <span>{assignment.totalMarks} marks</span>}</div>
      {assignment.resourceUrl && /^https?:\/\//i.test(assignment.resourceUrl) && <a href={assignment.resourceUrl} target="_blank" rel="noreferrer">Open teacher's resource ↗</a>}
      {submission && <div className="sp-submission-status"><strong>{submission.status}</strong><span>Submitted {new Date(submission.submittedAt).toLocaleString()}</span>{submission.marks != null && <span>Marks: {submission.marks}</span>}{submission.teacherFeedback && <p>Teacher feedback: {submission.teacherFeedback}</p>}{submission.hasFile && <button className="sp-text-button" onClick={() => void download()}>Download my file</button>}</div>}
      {canSubmit && <form onSubmit={submit} className="sp-submit-form"><label>Text answer<textarea rows={5} maxLength={4000} value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your answer or add a note about the attached work"/></label><label>Upload PDF, Word or image<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={e => setFile(e.target.files?.[0] || null)}/></label>{error && <div className="sp-error" role="alert">{error}</div>}<LoadingButton className="btn btn-primary" loading={saving} loadingText="Submitting assignment…">Submit assignment</LoadingButton></form>}
      {!canSubmit && error && <div className="sp-error">{error}</div>}
    </section>
  </div>;
}

