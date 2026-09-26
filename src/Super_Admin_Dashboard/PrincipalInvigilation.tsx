import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';

type Schedule = { id: number; examDate: string; startTime: string; endTime: string; examName: string; className: string; sectionName: string; subjectName: string };
type Assignment = { id: number; examScheduleId: number; staffId: number; staffName: string; dutyType: string };
type Teacher = { id: number; name: string };
const dateText = (value: string) => new Date(value.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const timeText = (value: string) => value.slice(0, 5);

export default function PrincipalInvigilation() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [scheduleId, setScheduleId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [dutyType, setDutyType] = useState('Main');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const headers = () => ({ Authorization: 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' });
  async function request(path: string, init?: RequestInit) {
    const response = await fetch(API_BASE_URL + '/api/principal/' + path, { ...init, headers: headers() });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Unable to update invigilation.');
    return body;
  }
  async function load() {
    const result = await request('invigilation');
    setSchedules(result.data.schedules || []);
    setAssignments(result.data.assignments || []);
    setTeachers(result.data.teachers || []);
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function assign(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await request('invigilation', { method: 'POST', body: JSON.stringify({ scheduleId: Number(scheduleId), staffId: Number(staffId), dutyType }) });
      await load(); setMessage('Invigilator assigned. The duty will appear on the teacher calendar.');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(id: number) {
    setBusy(true); setError(''); setMessage('');
    try { await request('invigilation/' + id, { method: 'DELETE' }); await load(); setMessage('Invigilator removed.'); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  const label = (s: Schedule) => `${s.examName} - ${s.className} ${s.sectionName} - ${s.subjectName} - ${dateText(s.examDate)} ${timeText(s.startTime)}`;
  return <section className="principal-panel"><h2>Exam invigilation</h2><p>Assign a teacher to a scheduled class exam. Duties appear on the teacher calendar.</p>
    {error && <p role="alert" className="tw-error">{error}</p>}{message && <p role="status">{message}</p>}
    <form onSubmit={assign} className="principal-invigilation-form">
      <label>Scheduled exam<select required value={scheduleId} onChange={e => setScheduleId(e.target.value)}><option value="">Select scheduled exam</option>{schedules.map(s => <option key={s.id} value={s.id}>{label(s)}</option>)}</select></label>
      <label>Teacher<select required value={staffId} onChange={e => setStaffId(e.target.value)}><option value="">Select teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Duty<select value={dutyType} onChange={e => setDutyType(e.target.value)}><option>Main</option><option>Assistant</option></select></label>
      <button type="submit" disabled={busy || !schedules.length || !teachers.length}>Assign invigilator</button>
    </form>
    {!schedules.length && <p>No scheduled class exams are available.</p>}
    <div className="principal-table-scroll"><table><thead><tr><th>Exam and class</th><th>Invigilator</th><th>Duty</th><th>Action</th></tr></thead><tbody>
      {assignments.map(a => { const s = schedules.find(item => item.id === a.examScheduleId); return <tr key={a.id}><td>{s ? label(s) : 'Schedule #' + a.examScheduleId}</td><td>{a.staffName}</td><td>{a.dutyType}</td><td><button type="button" disabled={busy} onClick={() => remove(a.id)}>Remove</button></td></tr>; })}
      {!assignments.length && <tr><td colSpan={4}>No invigilators assigned yet.</td></tr>}
    </tbody></table></div>
  </section>;
}
