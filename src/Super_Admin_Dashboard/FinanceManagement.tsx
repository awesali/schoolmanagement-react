import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './StaffList.css';
import './ManagementTabs.css';
import './FeeReceipt.css';
import Modal from './Modal';
import { useToast } from '../components/Toast/Toast';
import { usePermissions } from '../security/Permissions';

type FinanceView = 'feeTypes' | 'assign' | 'pending' | 'history';

interface ClassItem { id: number; name: string; }
interface SectionItem { id: number; name: string; classId: number; }
interface SessionItem { id: number; yearStart: string; yearEnd: string; }

interface StudentFee {
  studentId: number;
  studentName: string;
  rollNumber?: string;
  className?: string;
  sectionName?: string;
}

interface FeeRecord {
  studentFeeId: number;
  studentId: number;
  studentName: string;
  rollNumber?: string;
  classId: number;
  className: string;
  sectionId: number;
  sectionName: string;
  feeTypeId: number;
  feeType?: string;
  amount: number;
  paid: number;
  balance: number;
  status: string;
}

interface StudentPendingFees {
  studentId: number; studentName: string; className: string; sectionName: string;
  items: FeeRecord[]; amount: number; paid: number; balance: number; status: string;
}

interface PaymentRecord {
  paymentId: number;
  studentName: string;
  feeType: string;
  amountPaid: number;
  paymentMode: string;
  paymentDate: string;
  acknowledgementId?: string;
}

interface FeeType {
  id: number;
  name: string;
  isActive: boolean;
}

const PAYMENT_MODES = ['Cash', 'Online', 'Cheque', 'DD'];

const statusStyle = (status: string) => ({
  display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
  fontSize: '12px', fontWeight: 600 as const,
  background: status === 'Paid' ? '#c6f6d5' : status === 'Pending' ? '#fed7d7' : '#fef3c7',
  color: status === 'Paid' ? '#22543d' : status === 'Pending' ? '#742a2a' : '#78350f',
});

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0',
  fontSize: '14px', minWidth: '160px', background: 'white',
};

const FinanceManagement: React.FC<{ selectedSchoolId: number | null }> = ({ selectedSchoolId }) => {
  const toast = useToast();
  const { can } = usePermissions();
  const [editFee, setEditFee] = useState<FeeRecord | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const updateAssignedFee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editFee || savingFee || !can('finance.fees', 'update')) return;
    const value = Number(editAmount);
    if (!editAmount.trim() || !Number.isFinite(value) || value <= 0 || value < editFee.paid) {
      toast.error('Enter a positive fee amount that is not less than the amount already paid.');
      return;
    }
    setSavingFee(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Student/UpdateAssignedFee`, {
        method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentFeeId: editFee.studentFeeId, schoolId: selectedSchoolId, amount: value }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Unable to update the fee.');
      setEditFee(null);
      toast.success('Assigned fee updated successfully.');
      await loadPendingFees();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to update the fee.'); }
    finally { setSavingFee(false); }
  };
  const [pendingLoads, setPendingLoads] = useState(0);
  const [view, setView] = useState<FinanceView>('feeTypes');

  // Fee Types
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [feeTypesLoading, setFeeTypesLoading] = useState(false);
  const [showAddFeeType, setShowAddFeeType] = useState(false);
  const [newFeeTypeName, setNewFeeTypeName] = useState('');
  const [savingFeeType, setSavingFeeType] = useState(false);
  const [feeTypeMsg, setFeeTypeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Enrollment dropdowns
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // Students for fees
  const [students, setStudents] = useState<StudentFee[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

  // Assign fee form
  const [feeTypeId, setFeeTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Pay fee modal
  const [payModal, setPayModal] = useState<FeeRecord | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [acknowledgementId, setAcknowledgementId] = useState('');
  const [paying, setPaying] = useState(false);

  // Pending fees
  const [pendingFees, setPendingFees] = useState<FeeRecord[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const pendingStudents = React.useMemo<StudentPendingFees[]>(() => {
    const grouped = new Map<number, StudentPendingFees>();
    pendingFees.forEach(f => {
      const row = grouped.get(f.studentId) || { studentId:f.studentId, studentName:f.studentName,
        className:f.className, sectionName:f.sectionName, items:[], amount:0, paid:0, balance:0, status:'Pending' };
      row.items.push(f); row.amount += Number(f.amount || 0); row.paid += Number(f.paid || 0); row.balance += Number(f.balance || 0);
      row.status = row.balance <= 0 ? 'Paid' : row.paid > 0 ? 'Partial' : 'Pending';
      grouped.set(f.studentId, row);
    });
    return Array.from(grouped.values());
  }, [pendingFees]);

  // History
  const [historyStudentId, setHistoryStudentId] = useState('');
  const [historyStudentSearch, setHistoryStudentSearch] = useState('');
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Receipt
  const [receipt, setReceipt] = useState<any>(null);

  const token = () => localStorage.getItem('token');
  const headers = () => ({ 'accept': '*/*', 'Authorization': `Bearer ${token()}` });
  const jsonHeaders = () => ({ ...headers(), 'Content-Type': 'application/json' });

  useEffect(() => {
    if (selectedSchoolId) {
      fetchEnrollmentInfo();
      fetchFeeTypes();
    }
  }, [selectedSchoolId]); // eslint-disable-line

  const fetchFeeTypes = async () => {
    try {
      setFeeTypesLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/Student/GetFeeTypes?schoolId=${selectedSchoolId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setFeeTypes(Array.isArray(data) ? data : (data?.data ?? []));
      }
    } catch { } finally { setFeeTypesLoading(false); }
  };

  const handleAddFeeType = async () => {
    if (!newFeeTypeName.trim()) { toast.error('Fee type name is required.'); return; }
    try {
      setSavingFeeType(true);
      setFeeTypeMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Student/CreateFeeType`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ id: 0, name: newFeeTypeName.trim(), schoolId: selectedSchoolId, isActive: true, studentFees: [] }),
      });
      const result = await res.json();
      if (res.ok) {
        setFeeTypeMsg({ text: result.message || 'Fee type created!', ok: true });
        setNewFeeTypeName('');
        setShowAddFeeType(false);
        fetchFeeTypes();
      } else {
        toast.error(result.message || 'Failed to create fee type.');
      }
    } catch { toast.error('Error creating fee type.'); }
    finally { setSavingFeeType(false); }
  };

  const handleDeleteFeeType = async (id: number) => {
    if (!window.confirm('Delete this fee type?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/DeleteFeeType?id=${id}`, {
        method: 'DELETE', headers: headers(),
      });
      if (res.ok) fetchFeeTypes();
    } catch { }
  };

  const fetchEnrollmentInfo = async () => {
    setPendingLoads(count => count + 1);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${selectedSchoolId}`, { headers: headers() });
      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          setSessions(result.data.sessions || []);
          setClasses(result.data.classes || []);
          setSections(result.data.sections || []);
          const activeSession = result.data.sessions?.find((session: any) => session.isActive);
          if (activeSession) setSelectedSession(activeSession.id.toString());
          else if (result.data.sessions?.length === 1) setSelectedSession(result.data.sessions[0].id.toString());
        }
      }
    } catch { } finally {
      setPendingLoads(count => count - 1);
    }
  };

  const filteredSections = sections.filter(s => s.classId === Number(selectedClass));
  const normalizedHistorySearch = historyStudentSearch.trim().toLowerCase();
  const matchingHistoryStudents = students.filter(student =>
      !normalizedHistorySearch ||
        student.studentName.toLowerCase().includes(normalizedHistorySearch) ||
        String(student.rollNumber || '').toLowerCase().includes(normalizedHistorySearch));

  const loadStudents = async () => {
    if (!selectedSession || !selectedClass || !selectedSection) return;
    try {
      setStudentsLoading(true);
      setStudents([]);
      setSelectedStudentIds([]);
      const res = await fetch(
        `${API_BASE_URL}/api/Student/GetStudentsForFees?schoolId=${selectedSchoolId}&classId=${selectedClass}&sectionId=${selectedSection}&sessionId=${selectedSession}`,
        { headers: headers() }
      );
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch { } finally { setStudentsLoading(false); }
  };

  const handleAssignFees = async () => {
    if (!selectedStudentIds.length || !feeTypeId || !amount) {
      setAssignMsg({ text: 'Select students, fee type and amount.', ok: false });
      return;
    }
    try {
      setAssigning(true);
      setAssignMsg(null);
      const res = await fetch(`${API_BASE_URL}/api/Student/AssignStudentFees`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          feeTypeId: Number(feeTypeId),
          amount: Number(amount),
          sessionId: Number(selectedSession),
          schoolId: selectedSchoolId,
        }),
      });
      const result = await res.json();
      setAssignMsg({ text: result.message || (res.ok ? 'Fees assigned!' : 'Failed'), ok: res.ok && result.success !== false });
      if (res.ok) { setSelectedStudentIds([]); setFeeTypeId(''); setAmount(''); }
    } catch { setAssignMsg({ text: 'Error assigning fees', ok: false }); }
    finally { setAssigning(false); }
  };

  const loadPendingFees = async () => {
    if (!selectedSession || !selectedClass || !selectedSection) return;
    try {
      setPendingLoading(true);
      setPendingFees([]);
      const res = await fetch(
        `${API_BASE_URL}/api/Student/GetPendingFees?schoolId=${selectedSchoolId}&classId=${selectedClass}&sectionId=${selectedSection}&sessionId=${selectedSession}&includePaid=true`,
        { headers: headers() }
      );
      if (res.ok) {
        const data = await res.json();
        setPendingFees(Array.isArray(data) ? data : []);
      }
    } catch { } finally { setPendingLoading(false); }
  };

  const handlePayFee = async () => {
    if (!payModal || !amountPaid || paying) return;
    if ((paymentMode === 'Online' || paymentMode === 'Cheque') && !acknowledgementId.trim()) return;
    try {
      setPaying(true);
      const res = await fetch(`${API_BASE_URL}/api/Student/PayFee`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          studentFeeId: payModal.studentFeeId,
          amountPaid: Number(amountPaid),
          paymentMode,
          acknowledgementId: acknowledgementId.trim() || null,
          schoolId: selectedSchoolId,
        }),
      });
      if (res.ok) {
        setPayModal(null);
        setAmountPaid('');
        setAcknowledgementId('');
        loadPendingFees();
      }
    } catch { } finally { setPaying(false); }
  };

  const loadHistory = async (studentId?: number | string) => {
    const targetStudentId = String(studentId || historyStudentId);
    if (!targetStudentId) return;
    try {
      setHistoryLoading(true);
      setPaymentHistory([]);
      const res = await fetch(`${API_BASE_URL}/api/Student/GetPaymentHistory?studentId=${targetStudentId}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setPaymentHistory(Array.isArray(data) ? data : []);
      }
    } catch { } finally { setHistoryLoading(false); }
  };

  const fetchReceipt = async (paymentId: number) => {
    setPendingLoads(count => count + 1);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/GetReceipt?paymentId=${paymentId}`, { headers: headers() });
      if (res.ok) setReceipt(await res.json());
    } catch { } finally {
      setPendingLoads(count => count - 1);
    }
  };

  const toggleStudent = (id: number) =>
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelectedStudentIds(selectedStudentIds.length === students.length ? [] : students.map(s => s.studentId));

  const TAB_LABELS: Record<FinanceView, string> = {
    feeTypes: 'Fee Types',
    assign: 'Assign Fees',
    pending: 'Assigned Fees',
    history: 'Payment History',
  };

  const sessionLabel = (s: SessionItem) =>
    `${s.yearStart?.split('-')[0] || ''}-${s.yearEnd?.split('-')[0] || ''}`;

  if (!selectedSchoolId) return <div className="staff-list-loading">Please select a school</div>;

  const filterBar = (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
      <select style={selectStyle} value={selectedSession} onChange={e => setSelectedSession(e.target.value)}>
        <option value="">Select Session</option>
        {sessions.map(s => <option key={s.id} value={s.id}>{sessionLabel(s)}</option>)}
      </select>
      <select style={selectStyle} value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }}>
        <option value="">Select Class</option>
        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select style={selectStyle} value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass}>
        <option value="">Select Section</option>
        {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    </div>
  );

  return (
    <div className="staff-list-container">
      {(pendingLoads > 0 || feeTypesLoading || studentsLoading || pendingLoading || historyLoading) && <PageLoader label="Loading fee data..." />}
      {/* Header + Tabs */}
      <div className="staff-list-header">
        <h2>Finance Management</h2>
      </div>

      <div className="management-tabs" role="tablist" aria-label="Finance management sections">
        {(['feeTypes', 'assign', 'pending', 'history'] as FinanceView[]).map(v => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={`management-tab ${view === v ? 'active' : ''}`}
            onClick={() => setView(v)}
          >
            {TAB_LABELS[v]}
          </button>
        ))}
      </div>

      {/* ── FEE TYPES ── */}
      {view === 'feeTypes' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={() => { setShowAddFeeType(true); setFeeTypeMsg(null); }}>
              + Add Fee Type
            </button>
          </div>

          {feeTypeMsg && (
            <div style={{ marginBottom: '12px', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
              background: feeTypeMsg.ok ? '#c6f6d5' : '#fed7d7', color: feeTypeMsg.ok ? '#22543d' : '#742a2a' }}>
              {feeTypeMsg.ok ? '✅' : '⚠️'} {feeTypeMsg.text}
            </div>
          )}

          {feeTypesLoading ? (
            null
          ) : feeTypes.length === 0 ? (
            <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>No fee types found. Add one to get started.</p>
          ) : (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                  <tr><th>S. No.</th><th>Fee Type Name</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {feeTypes.map((ft, i) => (
                    <tr key={ft.id}>
                      <td>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{ft.name}</td>
                      <td><span style={statusStyle(ft.isActive ? 'Paid' : 'Pending')}>{ft.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <button className="btn-delete" onClick={() => handleDeleteFeeType(ft.id)}
                          style={{ padding: '5px 14px', fontSize: '12px' }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Fee Type Modal */}
          <Modal isOpen={showAddFeeType} title="Add Fee Type" showCancel={false}
            formId="add-fee-type-form" submitLabel="Save" submitLoading={savingFeeType} loadingText="Saving fee type..."
            onClose={() => { if (!savingFeeType) { setShowAddFeeType(false); setNewFeeTypeName(''); setFeeTypeMsg(null); } }}>
            <form id="add-fee-type-form" style={{ padding: 24 }} onSubmit={event => { event.preventDefault(); if (!savingFeeType) handleAddFeeType(); }}>
              <div className="form-group">
                <label htmlFor="fee-type-name">Name *</label>
                <input id="fee-type-name" required disabled={savingFeeType} value={newFeeTypeName}
                  onChange={event => setNewFeeTypeName(event.target.value)} placeholder="e.g. Tuition Fee"
                  style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
            </form>
          </Modal>
        </>
      )}

      {/* ── ASSIGN FEES ── */}
      {view === 'assign' && (
        <>
          {filterBar}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={loadStudents} disabled={!selectedSession || !selectedClass || !selectedSection || studentsLoading}>
              {studentsLoading ? 'Loading...' : 'Load Students'}
            </button>
          </div>

          {students.length > 0 && (
            <>
              <div className="staff-table-wrapper" style={{ marginBottom: '20px' }}>
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={selectedStudentIds.length === students.length} onChange={toggleAll} /></th>
                       <th>S. No.</th>
                      <th>Name</th>
                      <th>Roll No.</th>
                      <th>Class</th>
                      <th>Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.studentId}>
                        <td><input type="checkbox" checked={selectedStudentIds.includes(s.studentId)} onChange={() => toggleStudent(s.studentId)} /></td>
                        <td>{i + 1}</td>
                        <td>{s.studentName}</td>
                        <td>{s.rollNumber || '-'}</td>
                        <td>{s.className || '-'}</td>
                        <td>{s.sectionName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', padding: '16px', background: '#f7fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#4a5568' }}>Fee Type *</div>
                  <select style={selectStyle} value={feeTypeId} onChange={e => setFeeTypeId(e.target.value)}>
                    <option value="">Select Fee Type</option>
                    {feeTypes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#4a5568' }}>Amount (₹) *</div>
                  <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                    style={{ ...selectStyle, minWidth: '120px' }} placeholder="0.00" />
                </div>
                <button className="btn btn-primary" onClick={handleAssignFees} disabled={assigning || !selectedStudentIds.length}>
                  {assigning ? 'Assigning...' : `Assign to ${selectedStudentIds.length} Student(s)`}
                </button>
              </div>

              {assignMsg && (
                <div style={{ marginTop: '12px', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
                  background: assignMsg.ok ? '#c6f6d5' : '#fed7d7', color: assignMsg.ok ? '#22543d' : '#742a2a' }}>
                  {assignMsg.ok ? '✅' : '⚠️'} {assignMsg.text}
                </div>
              )}
            </>
          )}

          {!studentsLoading && students.length === 0 && selectedSection && (
            <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>No students found. Click "Load Students".</p>
          )}
        </>
      )}

      {/* ── PENDING FEES ── */}
      {view === 'pending' && (
        <>
          {filterBar}
          <div style={{ marginBottom: '16px' }}>
            <button className="btn btn-primary" onClick={loadPendingFees} disabled={!selectedSession || !selectedClass || !selectedSection || pendingLoading}>
              {pendingLoading ? 'Loading...' : 'Load Assigned Fees'}
            </button>
          </div>

          {pendingStudents.length > 0 ? (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                   <tr><th>S. No.</th><th>Student</th><th>Roll No.</th><th>Class</th><th>Section</th><th>Fee Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {pendingStudents.map((student, i) => (
                    <tr key={student.studentId}>
                      <td>{i + 1}</td>
                      <td>{student.studentName}</td>
                      <td>{student.items[0]?.rollNumber || '-'}</td>
                      <td>{student.className}</td>
                      <td>{student.sectionName}</td>
                       <td>{student.items.map(item => <div key={item.studentFeeId} style={{padding:'5px 0',fontWeight:600}}>{item.feeType || feeTypes.find(ft => ft.id === item.feeTypeId)?.name || `Type ${item.feeTypeId}`}</div>)}</td>
                      <td>{student.items.map(item => <div key={item.studentFeeId} style={{padding:'5px 0'}}>₹{item.amount?.toLocaleString()}</div>)}<strong>Total: ₹{student.amount.toLocaleString()}</strong></td>
                      <td>{student.items.map(item => <div key={item.studentFeeId} style={{padding:'5px 0'}}>₹{item.paid?.toLocaleString()}</div>)}<strong>Total: ₹{student.paid.toLocaleString()}</strong></td>
                      <td>{student.items.map(item => <div key={item.studentFeeId} style={{padding:'5px 0'}}>₹{item.balance?.toLocaleString()}</div>)}<strong>Total: ₹{student.balance.toLocaleString()}</strong></td>
                      <td><span style={statusStyle(student.status)}>{student.status}</span></td>
                      <td>
                        <details>
                          <summary className="btn btn-primary" style={{padding:'6px 12px',fontSize:'13px',cursor:'pointer'}}>Manage ({student.items.length})</summary>
                          <div style={{display:'grid',gap:'8px',marginTop:'8px',minWidth:'170px'}}>
                            {can('finance.fees', 'update') && student.items.map(item => <button key={`edit-${item.studentFeeId}`} className="btn" onClick={() => { setEditFee(item); setEditAmount(String(item.amount)); }}>
                              Edit {item.feeType || feeTypes.find(ft => ft.id === item.feeTypeId)?.name || 'Fee'}
                            </button>)}
                            {student.items.filter(item=>item.balance>0).map(item=><button key={item.studentFeeId} className="btn" style={{padding:'6px 8px',fontSize:'12px',border:'1px solid #cbd5e1'}} onClick={()=>{setPayModal(item);setAmountPaid(item.balance.toString())}}>Collect {feeTypes.find(ft=>ft.id===item.feeTypeId)?.name||`Type #${item.feeTypeId}`}</button>)}
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !pendingLoading && <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>Select class & section, then click "Load Assigned Fees".</p>
          )}
        </>
      )}

      {/* ── PAYMENT HISTORY ── */}
      {view === 'history' && (
        <>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select style={selectStyle} value={selectedSession} onChange={e => { setSelectedSession(e.target.value); setHistoryStudentId(''); setHistoryStudentSearch(''); setPaymentHistory([]); }}>
              <option value="">Select Session</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{sessionLabel(s)}</option>)}
            </select>
            <select style={selectStyle} value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); setHistoryStudentId(''); setHistoryStudentSearch(''); setPaymentHistory([]); }}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={selectStyle} value={selectedSection} onChange={e => { setSelectedSection(e.target.value); setHistoryStudentId(''); setHistoryStudentSearch(''); setPaymentHistory([]); }} disabled={!selectedClass}>
              <option value="">Select Section</option>
              {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={async () => { setHistoryStudentId(''); setHistoryStudentSearch(''); setPaymentHistory([]); await loadStudents(); }} disabled={!selectedSession || !selectedClass || !selectedSection || studentsLoading}>
              {studentsLoading ? 'Loading...' : 'Load Students'}
            </button>
          </div>
          <div style={{ maxWidth: '520px', marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontSize: '13px', fontWeight: 600 }}>Search Student</label>
            <input
              type="search"
              value={historyStudentSearch}
              onChange={e => { setHistoryStudentSearch(e.target.value); setHistoryStudentId(''); setPaymentHistory([]); }}
              placeholder={students.length ? 'Search by student name or roll number' : 'Select filters and load students first'}
              disabled={!students.length}
              autoComplete="off"
              style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          {students.length > 0 && (
            <div className="staff-table-wrapper" style={{ marginBottom: '20px', maxHeight: '320px', overflowY: 'auto' }}>
              <table className="staff-table">
                <thead><tr><th>S. No.</th><th>Roll Number</th><th>Student Name</th><th>Class</th><th>Section</th><th>Action</th></tr></thead>
                <tbody>
                  {matchingHistoryStudents.map((student, index) => (
                    <tr key={student.studentId} style={{ background: historyStudentId === String(student.studentId) ? '#eff6ff' : 'white' }}>
                      <td>{index + 1}</td>
                      <td>{student.rollNumber || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{student.studentName}</td>
                      <td>{student.className || classes.find(c => c.id === Number(selectedClass))?.name || '-'}</td>
                      <td>{student.sectionName || sections.find(s => s.id === Number(selectedSection))?.name || '-'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => { setHistoryStudentId(String(student.studentId)); loadHistory(student.studentId); }}
                          disabled={historyLoading}
                          style={{ padding: '5px 12px', fontSize: '12px' }}
                        >
                          {historyLoading && historyStudentId === String(student.studentId) ? 'Loading...' : 'View Payment History'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!matchingHistoryStudents.length && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#718096' }}>No students match your search.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {paymentHistory.length > 0 ? (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                   <tr><th>S. No.</th><th>Student</th><th>Fee Type</th><th>Amount Paid</th><th>Mode</th><th>Acknowledgement ID</th><th>Date</th><th>Receipt</th></tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p, i) => (
                    <tr key={p.paymentId}>
                      <td>{i + 1}</td>
                      <td>{p.studentName}</td>
                      <td>{p.feeType}</td>
                      <td>₹{p.amountPaid?.toLocaleString()}</td>
                      <td>{p.paymentMode}</td>
                      <td>{p.acknowledgementId || '-'}</td>
                      <td>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '-'}</td>
                      <td>
                        <button className="btn" style={{ padding: '5px 12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                          onClick={() => fetchReceipt(p.paymentId)}>
                          Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !historyLoading && (
              historyStudentId ? (
                <div style={{ textAlign: 'center', padding: '36px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', color: '#92400e' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>No Payment Recorded Yet</div>
                  <div style={{ fontSize: '14px' }}>This student has not made any fee payments yet. Payment history will appear here after the first payment is collected.</div>
                </div>
              ) : (
                <p style={{ color: '#718096', textAlign: 'center', padding: '40px' }}>Select a student from the grid to view payment history.</p>
              )
            )
          )}
        </>
      )}

      {/* ── PAY FEE MODAL ── */}
      <Modal isOpen={!!editFee} onClose={() => { if (!savingFee) setEditFee(null); }} title="Edit Assigned Fee"
        formId="edit-assigned-fee" submitLabel="Update Fee" showCancel={false} submitLoading={savingFee} loadingText="Updating fee...">
        {editFee && <form id="edit-assigned-fee" onSubmit={updateAssignedFee} style={{ padding: 24 }}>
          <p><strong>{editFee.studentName}</strong> — {editFee.feeType || feeTypes.find(ft => ft.id === editFee.feeTypeId)?.name}</p>
          <p>Already paid: ₹{editFee.paid.toLocaleString()}</p>
          <div className="form-group"><label htmlFor="assigned-fee-amount">Fee amount *</label>
            <input id="assigned-fee-amount" type="number" required min={Math.max(0.01, editFee.paid)} step="0.01"
              value={editAmount} disabled={savingFee} onChange={event => setEditAmount(event.target.value)} /></div>
          <p>Revised balance: ₹{Math.max(0, Number(editAmount || 0) - editFee.paid).toLocaleString()}</p>
        </form>}
      </Modal>
      <Modal isOpen={!!payModal} title={`Collect ${payModal?.feeType || feeTypes.find(ft => ft.id === payModal?.feeTypeId)?.name || 'Fee'}`}
        onClose={() => { if (!paying) setPayModal(null); }} showCancel={false}
        formId="collect-fee-form" submitLabel="Confirm Payment" submitLoading={paying} loadingText="Processing payment..."
        submitDisabled={(paymentMode === 'Online' || paymentMode === 'Cheque') && !acknowledgementId.trim()}>
        {payModal && <form id="collect-fee-form" style={{ padding: 24 }} onSubmit={event => { event.preventDefault(); handlePayFee(); }}>
            <div style={{ marginBottom: '12px', color: '#4a5568', fontSize: '14px' }}>
              <strong>{payModal.studentName}</strong> — {feeTypes.find(ft => ft.id === payModal.feeTypeId)?.name || `Type #${payModal.feeTypeId}`} (₹{payModal.amount?.toLocaleString()} | Balance: ₹{payModal.balance?.toLocaleString()})
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Amount Paid *</label>
              <input type="number" required min="0.01" max={payModal.balance} step="0.01" disabled={paying} value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Payment Mode *</label>
              <select disabled={paying} value={paymentMode} onChange={e => setPaymentMode(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            {(paymentMode === 'Online' || paymentMode === 'Cheque') && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>Acknowledgement ID *</label>
                <input required disabled={paying} value={acknowledgementId} onChange={e => setAcknowledgementId(e.target.value)}
                  placeholder={paymentMode === 'Cheque' ? 'Cheque number' : 'Transaction / acknowledgement ID'}
                  style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
            )}
        </form>}
      </Modal>

      {/* ── RECEIPT MODAL ── */}
      {receipt && (
        <div className="school-fee-receipt-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="school-fee-receipt" style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ marginBottom: '20px', color: '#1e2a3a' }}>🧾 Payment Receipt</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px', color: '#4a5568', marginBottom: '24px' }}>
              {Object.entries(receipt).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                  <div style={{ fontWeight: 600 }}>{String(v)}</div>
                </div>
              ))}
            </div>
            <div className="school-fee-receipt-actions" style={{ display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => window.print()}>Print Receipt</button>
              <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setReceipt(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceManagement;
