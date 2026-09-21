import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import './StaffList.css';
import './ManagementTabs.css';
import './FeeReceipt.css';
import Modal from './Modal';
import { useToast } from '../components/Toast/Toast';
import { usePermissions } from '../security/Permissions';
import { FeeTypeIcon, RemoveIcon, LoadIcon, AssignmentIcon, PreviewIcon, ReceiptIcon, PrintIcon, CloseIcon } from '../components/Icons/Icons';
import '../components/Icons/CreateIconButton.css';

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
  const [deleteFeeTypeId, setDeleteFeeTypeId] = useState<number | null>(null);
  const [deletingFeeType, setDeletingFeeType] = useState(false);

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

  // Pay fee modal
  const [payModal, setPayModal] = useState<FeeRecord | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [acknowledgementId, setAcknowledgementId] = useState('');
  const [paying, setPaying] = useState(false);

  // Pending fees
  const [pendingFees, setPendingFees] = useState<FeeRecord[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [feeDetailsStudentId, setFeeDetailsStudentId] = useState<number | null>(null);
  useEffect(() => { setFeeDetailsStudentId(null); }, [selectedSchoolId, selectedSession, selectedClass, selectedSection, view]);
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
  const feeDetailsStudent = pendingStudents.find(student => student.studentId === feeDetailsStudentId);

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
  const readResponse = async (response: Response, fallback: string) => {
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.success === false) throw new Error(result?.message || fallback);
    return result;
  };

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
      {
        const data = await readResponse(res, 'Unable to complete this fee request.');
        setFeeTypes(Array.isArray(data) ? data : (data?.data ?? []));
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load fee types.'); } finally { setFeeTypesLoading(false); }
  };

  const handleAddFeeType = async () => {
    if (!newFeeTypeName.trim()) { toast.error('Fee type name is required.'); return; }
    try {
      setSavingFeeType(true);

      const res = await fetch(`${API_BASE_URL}/api/Student/CreateFeeType`, {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ id: 0, name: newFeeTypeName.trim(), schoolId: selectedSchoolId, isActive: true, studentFees: [] }),
      });
      const result = await readResponse(res, 'Unable to complete this fee request.');
      {
        toast.success(result.message || 'Fee type created successfully.');
        setNewFeeTypeName('');
        setShowAddFeeType(false);
        fetchFeeTypes();
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to create fee type.'); }
    finally { setSavingFeeType(false); }
  };

  const handleDeleteFeeType = async (id: number) => {
    if (deletingFeeType) return;
    setDeletingFeeType(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/DeleteFeeType?id=${id}`, {
        method: 'DELETE', headers: headers(),
      });
      await readResponse(res, 'Unable to delete fee type.');
      toast.success('Fee type deleted successfully.');
      setDeleteFeeTypeId(null);
      fetchFeeTypes();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to delete fee type.'); }
    finally { setDeletingFeeType(false); }
  };

  const fetchEnrollmentInfo = async () => {
    setPendingLoads(count => count + 1);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/enrollment-info?schoolId=${selectedSchoolId}`, { headers: headers() });
      {
        const result = await readResponse(res, 'Unable to complete this fee request.');
        if (result.success && result.data) {
          setSessions(result.data.sessions || []);
          setClasses(result.data.classes || []);
          setSections(result.data.sections || []);
          const activeSession = result.data.sessions?.find((session: any) => session.isActive);
          if (activeSession) setSelectedSession(activeSession.id.toString());
          else if (result.data.sessions?.length === 1) setSelectedSession(result.data.sessions[0].id.toString());
        }
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load fee details.'); } finally {
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
      {
        const data = await readResponse(res, 'Unable to complete this fee request.');
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load students.'); } finally { setStudentsLoading(false); }
  };

  const handleAssignFees = async () => {
    if (!selectedStudentIds.length || !feeTypeId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      toast.warning('Select students, fee type and a positive amount.');
      return;
    }
    try {
      setAssigning(true);

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
      const result = await readResponse(res, 'Unable to complete this fee request.');
      toast.success(result.message || 'Fees assigned successfully.');
      { setSelectedStudentIds([]); setFeeTypeId(''); setAmount(''); }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to assign fees.'); }
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
      {
        const data = await readResponse(res, 'Unable to complete this fee request.');
        setPendingFees(Array.isArray(data) ? data : []);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load assigned fees.'); } finally { setPendingLoading(false); }
  };

  const handlePayFee = async () => {
    if (!payModal || paying) return;
    if (!Number.isFinite(Number(amountPaid)) || Number(amountPaid) <= 0 || Number(amountPaid) > payModal.balance) { toast.warning('Enter a positive payment amount within the outstanding balance.'); return; }
    if ((paymentMode === 'Online' || paymentMode === 'Cheque') && !acknowledgementId.trim()) { toast.warning('Enter the acknowledgement or cheque number.'); return; }
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
      {
        const result = await readResponse(res, 'Unable to collect payment.');
        toast.success(result?.message || 'Payment collected successfully.');
        setPayModal(null);
        setAmountPaid('');
        setAcknowledgementId('');
        loadPendingFees();
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load fee details.'); } finally { setPaying(false); }
  };

  const loadHistory = async (studentId?: number | string) => {
    const targetStudentId = String(studentId || historyStudentId);
    if (!targetStudentId) return;
    try {
      setHistoryLoading(true);
      setPaymentHistory([]);
      const res = await fetch(`${API_BASE_URL}/api/Student/GetPaymentHistory?studentId=${targetStudentId}`, { headers: headers() });
      {
        const data = await readResponse(res, 'Unable to complete this fee request.');
        setPaymentHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load payment history.'); } finally { setHistoryLoading(false); }
  };

  const fetchReceipt = async (paymentId: number) => {
    setPendingLoads(count => count + 1);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/GetReceipt?paymentId=${paymentId}`, { headers: headers() });
      setReceipt(await readResponse(res, 'Unable to complete this fee request.'));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load fee details.'); } finally {
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
      <Modal isOpen={deleteFeeTypeId !== null} title="Delete Fee Type" showCancel={false}
        onClose={() => { if (!deletingFeeType) setDeleteFeeTypeId(null); }}
        onSubmit={() => { if (deleteFeeTypeId !== null) handleDeleteFeeType(deleteFeeTypeId); }}
        submitLabel="Delete" submitLoading={deletingFeeType} loadingText="Deleting fee type...">
        <p style={{ padding: '24px', textAlign: 'center' }}>Are you sure you want to delete this fee type?</p>
      </Modal>
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
            <button type="button" className="create-icon-button" title="Add Fee Type" aria-label="Add Fee Type" onClick={() => { setShowAddFeeType(true);  }}>
              <FeeTypeIcon size={26} />
            </button>
          </div>

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
                        <button type="button" className="create-icon-button" title={`Delete ${ft.name}`} aria-label={`Delete ${ft.name}`} onClick={() => setDeleteFeeTypeId(ft.id)}>
                          <RemoveIcon size={26} />
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
            onClose={() => { if (!savingFeeType) { setShowAddFeeType(false); setNewFeeTypeName('');  } }}>
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
            <button type="button" className="create-icon-button" title="Load Students" aria-label="Load Students" onClick={loadStudents} disabled={!selectedSession || !selectedClass || !selectedSection || studentsLoading}>
              <LoadIcon size={26} />
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
                <button type="button" className="create-icon-button" title={`Assign to ${selectedStudentIds.length} Student(s)`} aria-label={`Assign to ${selectedStudentIds.length} Student(s)`} onClick={handleAssignFees} disabled={assigning || !selectedStudentIds.length}>
                  <AssignmentIcon size={26} />
                </button>
              </div>
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
            <button type="button" className="create-icon-button" title="Load Assigned Fees" aria-label="Load Assigned Fees" onClick={loadPendingFees} disabled={!selectedSession || !selectedClass || !selectedSection || pendingLoading}>
              <LoadIcon size={26} />
            </button>
          </div>

          {pendingStudents.length > 0 ? (
            <div className="staff-table-wrapper">
              <table className="staff-table">
                <thead>
                   <tr><th>S. No.</th><th>Student</th><th>Roll No.</th><th>Class</th><th>Section</th><th>Fee Types</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>View</th></tr>
                </thead>
                <tbody>
                  {pendingStudents.map((student, i) => (
                    <tr key={student.studentId}>
                      <td>{i + 1}</td>
                      <td>{student.studentName}</td>
                      <td>{student.items[0]?.rollNumber || '-'}</td>
                      <td>{student.className}</td>
                      <td>{student.sectionName}</td>
                      <td>{new Set(student.items.map(item => item.feeTypeId)).size}</td>
                      <td>₹{student.amount.toLocaleString('en-IN')}</td>
                      <td>₹{student.paid.toLocaleString('en-IN')}</td>
                      <td>₹{student.balance.toLocaleString('en-IN')}</td>
                      <td><span style={statusStyle(student.status)}>{student.status}</span></td>
                      <td><button type="button" className="create-icon-button" title="View Fee Details" aria-label={`View fee details for ${student.studentName}`} onClick={() => setFeeDetailsStudentId(student.studentId)}><PreviewIcon size={26} /></button></td>
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
            <button type="button" className="create-icon-button" title="Load Students" aria-label="Load Students" onClick={async () => { setHistoryStudentId(''); setHistoryStudentSearch(''); setPaymentHistory([]); await loadStudents(); }} disabled={!selectedSession || !selectedClass || !selectedSection || studentsLoading}>
              <LoadIcon size={26} />
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
                          className="create-icon-button"
                          title="View Payment History"
                          aria-label={`View Payment History for ${student.studentName}`}
                          onClick={() => { setHistoryStudentId(String(student.studentId)); loadHistory(student.studentId); }}
                          disabled={historyLoading}
                        >
                          <PreviewIcon size={26} />
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
                        <button type="button" className="create-icon-button" title="View Receipt" aria-label="View Receipt"
                          onClick={() => fetchReceipt(p.paymentId)}>
                          <ReceiptIcon size={26} />
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
      <Modal isOpen={!!feeDetailsStudent && !editFee && !payModal && !pendingLoading} onClose={() => setFeeDetailsStudentId(null)}
        title="Student Fee Details" size="large" showSubmit={false} showCancel={false}>
        {feeDetailsStudent && <div style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px' }}>{feeDetailsStudent.studentName}</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 20 }}>
            <span><strong>Roll No.:</strong> {feeDetailsStudent.items[0]?.rollNumber || '-'}</span>
            <span><strong>Class:</strong> {feeDetailsStudent.className}</span>
            <span><strong>Section:</strong> {feeDetailsStudent.sectionName}</span>
            <span><strong>Session:</strong> {sessions.find(s => String(s.id) === selectedSession) ? sessionLabel(sessions.find(s => String(s.id) === selectedSession)!) : '-'}</span>
          </div>
          <div className="staff-table-wrapper"><table className="staff-table">
            <thead><tr><th>Fee Type</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{feeDetailsStudent.items.map(item => <tr key={item.studentFeeId}>
              <td>{item.feeType || feeTypes.find(ft => ft.id === item.feeTypeId)?.name || `Type ${item.feeTypeId}`}</td>
              <td>₹{Number(item.amount).toLocaleString('en-IN')}</td>
              <td>₹{Number(item.paid).toLocaleString('en-IN')}</td>
              <td>₹{Number(item.balance).toLocaleString('en-IN')}</td>
              <td><span style={statusStyle(item.status)}>{item.status}</span></td>
              <td><div style={{ display: 'flex', gap: 8 }}>
                {can('finance.fees', 'update') && <button type="button" className="btn" onClick={() => { setEditFee(item); setEditAmount(String(item.amount)); }}>Edit</button>}
                {item.balance > 0 && <button type="button" className="btn" onClick={() => { setPayModal(item); setAmountPaid(String(item.balance)); }}>Collect</button>}
              </div></td>
            </tr>)}</tbody>
            <tfoot><tr><th>Total</th><th>₹{feeDetailsStudent.amount.toLocaleString('en-IN')}</th><th>₹{feeDetailsStudent.paid.toLocaleString('en-IN')}</th><th>₹{feeDetailsStudent.balance.toLocaleString('en-IN')}</th><td colSpan={2}><span style={statusStyle(feeDetailsStudent.status)}>{feeDetailsStudent.status}</span></td></tr></tfoot>
          </table></div>
        </div>}
      </Modal>
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
              <button type="button" className="create-icon-button" title="Print Receipt" aria-label="Print Receipt" onClick={() => window.print()}><PrintIcon size={26} /></button>
              <button type="button" className="create-icon-button" title="Close Receipt" aria-label="Close Receipt" onClick={() => setReceipt(null)}><CloseIcon size={26} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceManagement;
