import React, { useEffect, useState } from 'react';
import { PageLoader } from '../components/Loader/Loader';
import { teacherRequest } from './TeacherWorkspace';
import './TeacherStudentContent.css';

type LeaveRow = {
  id: number; studentName: string; className: string; sectionName: string; type: string;
  subject: string; details: string; fromDate: string; toDate: string;
  status: string; response?: string | null; createdAt: string;
};
const showDate = (value: string) => value ? new Date(value).toLocaleDateString('en-GB') : '';

export default function TeacherStudentLeaveRequests() {
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const result = await teacherRequest('/api/Teacher/student-leave-requests');
      setRows(result.data || []);
    } catch (failure: any) { setError(failure.message || 'Could not load student leave requests.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const review = async (row: LeaveRow, status: 'Approved' | 'Rejected') => {
    setSavingId(row.id); setError(''); setNotice('');
    try {
      await teacherRequest(`/api/Teacher/student-leave-requests/${row.id}/respond`, {
        method: 'POST',
        body: JSON.stringify({ status, response: responses[row.id] ?? row.response ?? '' }),
      });
      await load();
      setNotice(`Student request ${status.toLowerCase()}.`);
    } catch (failure: any) { setError(failure.message || 'Could not update leave request.'); }
    finally { setSavingId(null); }
  };
  return <div className="tw tsc">
    <section className="tw-hero"><div><span className="tw-eyebrow">CLASS TEACHER</span><h2>Student requests</h2><p>Review requests addressed to you, including existing class leave requests.</p></div></section>
    {error && <div className="tw-error" role="alert">{error}</div>}
    {notice && <div className="tw-notice" role="status">{notice}</div>}
    {loading && <PageLoader label="Loading student requests..." />}
    <section className="tsc-list">{!loading && (rows.length ? rows.map(row =>
      <article className="tw-panel tsc-record" key={row.id}>
        <span className="tw-pill">{row.status}</span>
        <h4>{row.studentName} - {row.className} / {row.sectionName}</h4>
        <strong>{row.type}: {row.subject}</strong>
        {row.fromDate && <p>{showDate(row.fromDate)} to {showDate(row.toDate)}</p>}
        <p>{row.details}</p>
        {row.response && <p><strong>Teacher response:</strong> {row.response}</p>}
        {row.status === 'Pending' && <div className="tsc-leave-actions">
          <label>Response (optional)<textarea rows={2} maxLength={2000}
            value={responses[row.id] ?? row.response ?? ''}
            onChange={event => setResponses(current => ({ ...current, [row.id]: event.target.value }))}/></label>
          <div><button type="button" className="btn btn-primary" disabled={savingId !== null} onClick={() => void review(row, 'Approved')}>Approve</button>
          <button type="button" className="btn" disabled={savingId !== null} onClick={() => void review(row, 'Rejected')}>Reject</button></div>
        </div>}
      </article>) : <p className="tw-empty">No student requests addressed to you.</p>)}</section>
  </div>;
}
