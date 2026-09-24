import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { usePermissions } from '../security/Permissions';
import './SyllabusProgress.css';

export type SyllabusRow = {
  classId: number; className: string; sectionId: number; sectionName: string; subjectId: number; subjectName: string;
  totalChapters: number | null; plannedChapters: number | null; completedChapters: number | null; progressDate: string | null;
};
type SyllabusData = { academicYear: string | null; rows: SyllabusRow[] };
const rate = (n: number, total: number) => Math.round(n / total * 1000) / 10;
const reported = (r: SyllabusRow) => r.totalChapters !== null && r.totalChapters > 0 && r.completedChapters !== null && r.plannedChapters !== null;
export function syllabusClasses(rows: SyllabusRow[]) {
  const ids = Array.from(new Set(rows.map(r => r.classId)));
  return ids.map(id => {
    const subjects = rows.filter(r => r.classId === id);
    const entries = subjects.filter(reported);
    const total = entries.reduce((sum, r) => sum + r.totalChapters!, 0);
    const actual = total ? rate(entries.reduce((sum, r) => sum + r.completedChapters!, 0), total) : null;
    const planned = total ? rate(entries.reduce((sum, r) => sum + r.plannedChapters!, 0), total) : null;
    const behind = entries.filter(r => r.completedChapters! < r.plannedChapters!).length;
    return { id, name: subjects[0].className, subjects, actual, planned, behind, reported: entries.length, expected: subjects.length };
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
async function request(path: string, signal?: AbortSignal, body?: object): Promise<SyllabusData> {
  const response = await fetch(API_BASE_URL + path, {
    method: body ? 'POST' : 'GET', signal, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + localStorage.getItem('token'), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'Unable to load syllabus progress. Please try again.');
  return result;
}

export default function SyllabusProgress({ date, refresh = 0, teacher = false }: { date: string; refresh?: number; teacher?: boolean }) {
  const { can } = usePermissions();
  const [data, setData] = useState<SyllabusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [form, setForm] = useState({ option: '', total: '', planned: '', completed: '' });
  const path = teacher ? '/api/Teacher/syllabus' : '/api/principal/syllabus';
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null); setSelectedClass(null);
    request(path + '?date=' + date, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refresh, reload, path]);
  const rows = data?.rows || [];
  const classes = syllabusClasses(rows);
  const selected = classes.find(c => c.id === selectedClass);
  const choose = (value: string) => {
    const row = rows[Number(value)];
    setSaved(''); setSaveError('');
    setForm({ option: value, total: row?.totalChapters?.toString() || '', planned: row?.plannedChapters?.toString() ?? '', completed: row?.completedChapters?.toString() ?? '' });
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const row = rows[Number(form.option)];
    if (form.option === '' || !row) return;
    const total = Number(form.total), planned = Number(form.planned), completed = Number(form.completed);
    if (!form.total || !form.planned || !form.completed || ![total, planned, completed].every(Number.isInteger) || total < 1 || total > 5000 || Math.min(planned, completed) < 0 || Math.max(planned, completed) > total) {
      setSaveError('Enter whole chapter counts. Planned and completed chapters must be between zero and the total.'); return;
    }
    setSaving(true); setSaveError(''); setSaved('');
    try {
      await request(path, undefined, { sectionId: row.sectionId, subjectId: row.subjectId, progressDate: date, totalChapters: total, plannedChapters: planned, completedChapters: completed });
      setSaved('Syllabus progress recorded.'); setForm({ option: '', total: '', planned: '', completed: '' }); setReload(v => v + 1);
    } catch (e) { setSaveError(e instanceof Error ? e.message : 'Unable to save progress.'); }
    finally { setSaving(false); }
  };
  return <section className="principal-panel syllabus-panel" aria-label="Syllabus progress">
    <div className="syllabus-heading"><div><h2>Syllabus Progress</h2><p>Completed chapters compared with the teaching plan, as of {date}.</p></div><span className="principal-badge">{teacher ? 'Teacher updates' : 'Academic monitoring'}</span></div>
    {loading ? <p role="status">Loading syllabus progress…</p> : error ? <div role="alert"><p>{error}</p><button className="principal-link" onClick={() => setReload(v => v + 1)}>Retry syllabus</button></div> : <>
      {!data?.academicYear ? <p>No active academic year covers this date.</p> : !rows.length ? <p>No active class-subject teaching assignments found.</p> : <>
        {teacher && can('academics.classes', 'create') && <form className="syllabus-form" onSubmit={submit}>
          <label>Class and subject<select required value={form.option} onChange={e => choose(e.target.value)} disabled={saving}><option value="">Select class and subject</option>{rows.map((r, i) => <option key={r.sectionId + '-' + r.subjectId} value={i}>{r.className} {r.sectionName} — {r.subjectName}</option>)}</select></label>
          <label>Total chapters<input required type="number" min="1" max="5000" step="1" value={form.total} disabled={saving} onChange={e => setForm({ ...form, total: e.target.value })} /></label>
          <label>Planned by this date<input required type="number" min="0" max={form.total || '5000'} step="1" value={form.planned} disabled={saving} onChange={e => setForm({ ...form, planned: e.target.value })} /></label>
          <label>Completed chapters<input required type="number" min="0" max={form.total || '5000'} step="1" value={form.completed} disabled={saving} onChange={e => setForm({ ...form, completed: e.target.value })} /></label>
          <button className="btn btn-primary" disabled={saving || form.option === ''}>{saving ? 'Saving…' : 'Record progress'}</button>
          {saveError && <p role="alert">{saveError}</p>}
        </form>}
        <div className="syllabus-classes">{classes.map(c => {
          const status = c.actual === null ? 'Not reported' : c.behind > 0 ? 'Behind plan' : c.reported < c.expected ? 'Partial reporting' : 'On track';
          return <button key={c.id} type="button" className="syllabus-class" aria-expanded={selectedClass === c.id} onClick={() => setSelectedClass(selectedClass === c.id ? null : c.id)}>
            <span className="syllabus-class-name">{c.name}</span>
            <span className="syllabus-track" aria-hidden="true"><span style={{ width: (c.actual ?? 0) + '%' }} />{c.planned !== null && <i style={{ left: c.planned + '%' }} />}</span>
            <strong>{c.actual === null ? '—' : c.actual + '%'}</strong>
            <span className={'syllabus-state ' + (status === 'On track' ? 'on-track' : 'needs-review')}>{status === 'On track' ? '✓ ' : c.behind ? '⚠ ' : ''}{status}</span>
            <small>{c.planned === null ? 'Plan not recorded' : 'Planned ' + c.planned + '%'} · {c.reported}/{c.expected} section-subjects reported</small>
          </button>;
        })}</div>
        <p className="principal-footnote">Class percentages are weighted by chapter count across reported section-subjects. A warning means at least one subject is below its recorded plan. The vertical marker shows planned progress; open a class for reporting dates and details.</p>
        {selected && <div className="syllabus-detail" role="region" aria-label={selected.name + ' syllabus details'}><h3>{selected.name}: subject progress</h3><div className="principal-table-scroll"><table><thead><tr><th>Section / subject</th><th>Completed / total</th><th>Actual</th><th>Planned</th><th>Gap</th><th>Last reported</th></tr></thead><tbody>{selected.subjects.map(r => {
          const known = reported(r);
          const actual = known ? rate(r.completedChapters!, r.totalChapters!) : null;
          const planned = known ? rate(r.plannedChapters!, r.totalChapters!) : null;
          const gap = known ? rate(r.completedChapters! - r.plannedChapters!, r.totalChapters!) : null;
          return <tr key={r.sectionId + '-' + r.subjectId}><td>{r.sectionName} / {r.subjectName}</td><td>{known ? r.completedChapters + ' / ' + r.totalChapters : 'Not reported'}</td><td>{actual === null ? '—' : actual + '%'}</td><td>{planned === null ? '—' : planned + '%'}</td><td>{gap === null ? '—' : (gap > 0 ? '+' : '') + gap + ' pp'}</td><td>{r.progressDate || '—'}</td></tr>;
        })}</tbody></table></div></div>}
      </>}
    </>}
    {saved && <p role="status">{saved}</p>}
  </section>;
}
