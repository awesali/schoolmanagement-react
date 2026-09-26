import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import { useToast } from '../components/Toast/Toast';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });
type StaffRole = { id: number; roleId: number; roleName: string; name: string; isActive: boolean };
export function StaffCareerActions({ staff, schoolId, onSuccess }: { staff: StaffRole; schoolId: number; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const role = staff.roleName.toLowerCase();
  if (!['teacher', 'principal'].includes(role)) return null;
  const action = role === 'teacher' ? 'promote' : 'demote';
  const label = action === 'promote' ? 'Promote to Principal' : 'Demote to Teacher';
  const submit = async () => {
    if (saving || !reason.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/staff-career/${staff.id}/role`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ schoolId, expectedRoleId: staff.roleId, action, reason: reason.trim() })
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || 'Unable to change the role.');
      toast.success(result.message); setOpen(false); setReason(''); onSuccess();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to change the role.'); }
    finally { setSaving(false); }
  };
  return <>
    <button type="button" className="btn btn-secondary" disabled={!staff.isActive} onClick={() => { setReason(''); setOpen(true); }}>{label}</button>
    <Modal isOpen={open} onClose={() => { if (!saving) setOpen(false); }} title={label} showCancel={false} submitLabel={label} submitDisabled={!reason.trim() || saving} submitLoading={saving} onSubmit={submit}>
      <p>{staff.name}: {staff.roleName} → {action === 'promote' ? 'Principal' : 'Teacher'}</p>
      <p>This updates the staff profile and login role. The employee must sign in again. Existing teaching assignments are retained.</p>
      <label htmlFor="staff-role-reason">Reason for change</label>
      <textarea id="staff-role-reason" required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', minHeight: 100 }} />
    </Modal>
  </>;
}

type HistoryRow = { id: number; action: string; createdAt: string; actor: string; before: Record<string, string | null>; after: { values: Record<string, string | null>; reason?: string } };
const fieldLabel = (name: string) => ({ RoleId: 'Role', StaffId: 'Staff', SubjectId: 'Subject', SectionId: 'Section', ClassId: 'Class', IsActive: 'Active', Adress: 'Address' }[name] || name.replace(/([a-z])([A-Z])/g, '$1 $2'));
const actionLabel = (action: string) => action.replace('SectionSubjectTeachers', 'Section subject assignment').replace('SubjectTeachers', 'Subject assignment').replace('SectionDetails', 'Class teacher assignment').replace('StaffDocument', 'Document').replace('ProfilePicture', 'Profile picture').replace('Staff:', 'Profile:').replace('Modified', 'Updated').replace('Deleted', 'Removed');
export function StaffChangeHistory({ staffId, schoolId }: { staffId: number; schoolId: number }) {
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`${API_BASE_URL}/api/staff-career/${staffId}/history?schoolId=${schoolId}&page=${page}`, { headers: headers(), signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok || result.success === false) throw new Error(result.message || 'Unable to load change history.'); return result; })
      .then(result => { if (!controller.signal.aborted) { setRows(result.data || []); setPages(result.totalPages || 0); } })
      .catch(e => { if (!controller.signal.aborted) setError(e.message || 'Unable to load change history.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [staffId, schoolId, page, retry]);
  return <>
    <p>Profile, role, employment, document, photo, class and subject assignment changes are recorded from the time change tracking was enabled.</p>
    {loading ? <p role="status">Loading change history…</p> : error ? <p role="alert">{error} <button onClick={() => setRetry(r => r + 1)}>Retry history</button></p> : <>
      {!rows.length && <p>No changes recorded yet.</p>}
      {rows.map(row => <article key={row.id} style={{ borderBottom: '1px solid #ddd', padding: '12px 0' }}>
        <h3>{row.after.values.RoleId && row.before.RoleId ? `${row.before.RoleId} → ${row.after.values.RoleId}` : actionLabel(row.action)}</h3>
        <p>{new Date(row.createdAt).toLocaleString()} · {row.actor}</p>
        {row.after.reason && <p>Reason: {row.after.reason}</p>}
        <div className="staff-profile-table"><table><thead><tr><th>Field</th><th>Previous value</th><th>New value</th></tr></thead><tbody>
          {Object.entries(row.after.values).map(([field, value]) => <tr key={field}><td>{fieldLabel(field)}</td><td>{row.before[field] ?? '—'}</td><td>{value ?? '—'}</td></tr>)}
        </tbody></table></div>
      </article>)}
      {pages > 1 && <div><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button> <span>Page {page} of {pages}</span> <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    </>}
  </>;
}