import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { usePermissions } from '../security/Permissions';
import { useToast } from '../components/Toast/Toast';
import { PageLoader } from '../components/Loader/Loader';
import { BackIcon, ProfileIcon, EmailIcon, PhoneIcon, IdCardIcon, EditIcon, AssignmentIcon, PaymentIcon, VehicleIcon, SubjectsIcon, TemplateIcon, PreviewIcon, PrintIcon, ReceiptIcon } from '../components/Icons/Icons';
import EditStudent from './EditStudent';
import ProfileListAvatar from './ProfileListAvatar';
import ProfileIdCard from './ProfileIdCard';
import { profilePictureUrl } from './ProfilePictureInput';
import { genderLabel } from '../utils/gender';
import Modal from './Modal';
import './StaffProfile.css';
import './StudentProfile.css';
import '../components/Icons/CreateIconButton.css';

type Row = Record<string, any>;
const displayDate = (v?: string) => v ? v.slice(0, 10).split('-').reverse().join('/') : '-';
const money = (v: unknown) => Number(v || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const rowsOf = (v: any): Row[] => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : [];
const Table = ({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) => rows.length ? <div className="staff-profile-table"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v ?? '-'}</td>)}</tr>)}</tbody></table></div> : <p className="staff-profile-empty">{empty}</p>;
const IconButton = ({ label, onClick, children }: React.PropsWithChildren<{ label: string; onClick: () => void }>) => <button type="button" className="create-icon-button" title={label} aria-label={label} onClick={onClick}>{children}</button>;

export default function StudentProfile() {
  const { schoolId, studentId } = useParams();
  const { can, loading: permissionsLoading } = usePermissions();
  const toast = useToast();
  const [student, setStudent] = useState<Row | null>(null);
  const [tab, setTab] = useState('Overview');
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Row>({});
  const [edit, setEdit] = useState(false);
  const [idCard, setIdCard] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const allowed = can('management.students');
  const classesAllowed = can('academics.classes');
  const timetableAllowed = classesAllowed && can('academics.class-schedule');
  const feesAllowed = can('finance.fees');
  const transportAllowed = can('management.transport');
  const tabs: { name: string; icon: React.ReactNode }[] = [
    { name: 'Overview', icon: <ProfileIcon /> },
    ...(can('attendance.students') ? [{ name: 'Attendance', icon: <AssignmentIcon /> }] : []),
    ...(feesAllowed ? [{ name: 'Fees & Payments', icon: <PaymentIcon /> }] : []),
    ...(transportAllowed ? [{ name: 'Transport', icon: <VehicleIcon /> }] : []),
    ...(classesAllowed ? [{ name: 'Class & Timetable', icon: <SubjectsIcon /> }] : []),
    { name: 'Documents', icon: <TemplateIcon /> },
  ];
  const parentLink = student?.parentId && can('management.parents') ? <Link to={`/dashboard?schoolId=${schoolId}&page=Parent%20List&parentId=${student.parentId}`}>{student.parentName || 'View parent'}</Link> : student?.parentName || '-';

  useEffect(() => {
    if (permissionsLoading || !allowed) return;
    if (!tabs.some(t => t.name === tab)) { setTab('Overview'); return; }
    const controller = new AbortController();
    const request = async (path: string) => {
      const res = await fetch(`${API_BASE_URL}/api/${path}`, { signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('Unable to load student details. Please try again.');
      const result = await res.json();
      if (result?.success === false) throw new Error(result.message || 'Unable to load student details.');
      return result;
    };
    const allPages = async (path: string) => {
      const rows: Row[] = []; let page = 1, pages = 1;
      do { const result = await request(`${path}&page=${page}&pageSize=100`); rows.push(...rowsOf(result)); pages = result.totalPages || 1; page++; } while (page <= pages);
      return rows;
    };
    const load = async () => {
      setBusy(true); setFailed(false); setData({});
      try {
        const result = await request(`Student/student-by-id?studentId=${studentId}`);
        const record = result.data;
        if (!record || Number(record.id) !== Number(studentId) || Number(record.schoolId) !== Number(schoolId)) { setStudent(null); return; }
        if (controller.signal.aborted) return;
        setStudent(record);
        let next: Row = {};
        if (tab === 'Attendance') {
          const [y, m] = month.split('-').map(Number);
          next.attendance = rowsOf(await request(`Student/student-profile-attendance?schoolId=${schoolId}&studentId=${studentId}&from=${month}-01&to=${month}-${new Date(y, m, 0).getDate()}`)).filter(r => Number(r.studentId) === Number(studentId));
        } else if (tab === 'Fees & Payments') {
          const [fees, payments] = await Promise.all([request(`Student/GetStudentFees?studentId=${studentId}`), request(`Student/GetPaymentHistory?studentId=${studentId}`)]);
          next = { fees: rowsOf(fees), payments: rowsOf(payments) };
        } else if (tab === 'Transport') {
          const allocations = rowsOf(await request(`Transport/allocations?schoolId=${schoolId}`)).filter(a => Number(a.studentId) === Number(studentId));
          next.allocations = allocations;
          // Transport fee endpoints require the finance permission as well.
          if (feesAllowed && allocations.length) {
            const [fees, payments] = await Promise.all([request(`Transport/fees?schoolId=${schoolId}`), request(`Transport/payments?schoolId=${schoolId}`)]);
            const allocationIds = new Set(allocations.map(a => Number(a.id)));
            next.fees = rowsOf(fees).filter(f => allocationIds.has(Number(f.studentTransportAllocationId)));
            const feeIds = new Set(next.fees.map((f: Row) => Number(f.id)));
            next.payments = rowsOf(payments).filter(p => feeIds.has(Number(p.transportFeeId)));
          }
        } else if (tab === 'Class & Timetable' && record.sectionId) {
          const classes = await allPages(`Class/calss-list?schoolId=${schoolId}`);
          const schoolClass = classes.find(c => Number(c.id) === Number(record.classId));
          const section = schoolClass?.sections?.find((s: Row) => Number(s.id) === Number(record.sectionId));
          next.section = section;
          if (section?.staffId && can('management.staff')) {
            const staff = await request(`Admin/Staff-by-school?schoolId=${schoolId}&staffId=${section.staffId}&page=1&pageSize=1`);
            next.teacher = rowsOf(staff).find(s => Number(s.id) === Number(section.staffId));
          }
          if (timetableAllowed) {
            const timetable = await request(`Timetable/get-timetable?sectionId=${record.sectionId}`);
            next.slots = (timetable.data?.slots || []).map((slot: Row) => ({ ...slot, period: timetable.data.periods?.find((p: Row) => Number(p.id) === Number(slot.periodId)) })).sort((a: Row, b: Row) => a.dayOfWeek - b.dayOfWeek || String(a.period?.startTime).localeCompare(String(b.period?.startTime)));
          }
        }
        if (!controller.signal.aborted) setData(next);
      } catch (err) { if (!controller.signal.aborted) { setFailed(true); toast.error(err instanceof Error ? err.message : 'Unable to load student details.'); } }
      finally { if (!controller.signal.aborted) setBusy(false); }
    };
    load(); return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, studentId, tab, month, refresh, permissionsLoading, allowed, feesAllowed, transportAllowed, classesAllowed, timetableAllowed]);

  const openReceipt = async (id: number) => {
    if (receiptBusy) return;
    setReceiptBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/Student/GetReceipt?paymentId=${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error();
      const result = await res.json(); if (!result || result.success === false) throw new Error();
      setReceipt(result);
    } catch { toast.error('Unable to load the receipt. Please try again.'); }
    finally { setReceiptBusy(false); }
  };
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  if (permissionsLoading) return <PageLoader />;
  if (!allowed) return <main className="staff-profile"><Link to="/dashboard">Back to Dashboard</Link><p>You do not have permission to view student profiles.</p></main>;
  return <main className="staff-profile student-profile">
    <Link className="staff-profile-back" to={`/dashboard?schoolId=${schoolId}&page=Student%20List`}><BackIcon />Back to Student List</Link>
    {student && <>
      <header className="staff-profile-header">
        <ProfileListAvatar name={student.studentName} pictureUrl={student.profilePictureUrl} onView={() => setPhoto(true)} />
        <div><h1>{student.studentName}</h1><div className="staff-profile-meta"><span><SubjectsIcon size={18} />{student.className || 'Class not assigned'} / {student.sectionName || '-'}</span><span>Roll No: {student.rollNumber || '-'}</span></div><div className="staff-profile-meta"><span><EmailIcon size={18} />{student.email || '-'}</span><span><PhoneIcon size={18} />{student.phoneNumber || '-'}</span></div><span>{student.isActive ? 'Active' : 'Inactive'}</span></div>
        <div className="staff-profile-actions"><IconButton label="ID Card" onClick={() => setIdCard(true)}><IdCardIcon size={26} /></IconButton>{can('management.students', 'update') && <IconButton label="Edit Profile" onClick={() => setEdit(true)}><EditIcon size={26} /></IconButton>}</div>
      </header>
      <nav className="staff-profile-tabs" aria-label="Student profile sections">{tabs.map(t => <button key={t.name} className={tab === t.name ? 'selected' : ''} aria-current={tab === t.name ? 'page' : undefined} onClick={() => setTab(t.name)}>{t.icon}{t.name}</button>)}</nav>
      <section className="staff-profile-content"><h2>{tab}</h2>
        {tab === 'Attendance' && <label>Month <input type="month" value={month} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value); }} /></label>}
        {busy || receiptBusy ? <PageLoader /> : failed ? <button onClick={() => setRefresh(r => r + 1)}>Retry loading</button> : <>
          {tab === 'Overview' && <dl className="student-profile-details">{[['Student ID', student.id], ['Roll Number', student.rollNumber], ['Date of Birth', displayDate(student.dob)], ['Gender', genderLabel(student.genderCode)], ['Academic Session', student.academicSession?.slice(0, 4)], ['Class', student.className], ['Section', student.sectionName], ['Parent', parentLink], ['Relationship', student.parentRelationship]].map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}</dl>}
          {tab === 'Attendance' && <><p>{(data.attendance || []).filter((a: Row) => a.status === 'Present').length} Present / {(data.attendance || []).filter((a: Row) => a.status === 'Absent').length} Absent / {(data.attendance || []).length} recorded days</p><Table headers={['Date', 'Status']} rows={(data.attendance || []).map((a: Row) => [displayDate(a.attendanceDate), a.status])} empty="No attendance recorded for this month." /></>}
          {tab === 'Fees & Payments' && <>
            <h3>All Assigned Fees</h3><p>School, mess and other assigned fee types. Transport billing is shown in the Transport tab.</p>
            <div className="student-profile-totals">{[['Total Fees', 'totalAmount'], ['Paid', 'paidAmount'], ['Balance', 'balance']].map(([label, key]) => <div key={key}><span>{label}</span><strong>{money((data.fees || []).reduce((n: number, f: Row) => n + Number(f[key] || 0), 0))}</strong></div>)}</div>
            <Table headers={['Fee Type', 'Amount', 'Paid', 'Balance', 'Status']} rows={(data.fees || []).map((f: Row) => [f.feeType, money(f.totalAmount), money(f.paidAmount), money(f.balance), f.status])} empty="No fees assigned." />
            <h3>Payment History</h3><Table headers={['Date', 'Fee Type', 'Amount', 'Mode', 'Acknowledgement', 'Receipt']} rows={(data.payments || []).map((p: Row) => [displayDate(p.paymentDate), p.feeType, money(p.amountPaid), p.paymentMode, p.acknowledgementId || '-', <IconButton label="View Receipt" onClick={() => openReceipt(p.paymentId)}><ReceiptIcon size={26} /></IconButton>])} empty="No payments recorded." />
          </>}
          {tab === 'Transport' && <><Table headers={['Vehicle', 'Route', 'Driver', 'Pickup / Drop', 'Pickup / Drop Time', 'Seat', 'Rate / Period', 'Start Date', 'Status']} rows={(data.allocations || []).map((a: Row) => [<>{a.vehicleName}<br />{a.vehicleNumber}</>, a.routeName, a.driverName, `${a.pickupStop || '-'} / ${a.dropStop || '-'}`, `${a.pickupShift?.slice(0, 5) || '-'} / ${a.dropShift?.slice(0, 5) || '-'}`, a.seatNumber || '-', `${money(a.monthlyFee)} / ${a.feeType}`, displayDate(a.startDate), a.isActive ? 'Active' : 'Inactive'])} empty="No transport assigned to this student." />
            {feesAllowed && <><h3>Transport Fees</h3><Table headers={['Month', 'Amount', 'Paid', 'Balance', 'Due Date', 'Status']} rows={(data.fees || []).map((f: Row) => [`${f.feeMonth}/${f.feeYear}`, money(f.amount), money(f.paidAmount), money(Number(f.amount) - Number(f.paidAmount)), displayDate(f.dueDate), f.status])} empty="No transport fees generated." /><h3>Transport Payments</h3><Table headers={['Date', 'Receipt', 'Amount', 'Mode', 'Reference']} rows={(data.payments || []).map((p: Row) => [displayDate(p.paymentDate), p.receiptNumber, money(p.amount), p.paymentMode, p.referenceNumber])} empty="No transport payments recorded." /></>}
          </>}
          {tab === 'Class & Timetable' && <><h3>{student.className || 'Class not assigned'} / {student.sectionName || '-'}</h3><p>Session: {student.academicSession?.slice(0, 4) || '-'}</p><p>Class Teacher: {data.teacher ? <Link to={`/dashboard/schools/${schoolId}/staff/${data.teacher.id}`}>{data.teacher.name}</Link> : data.section?.staffId ? 'Assigned' : 'Not assigned'}</p><Table headers={['Subject']} rows={(data.section?.subjects || []).map((s: Row) => [s.subjectName])} empty="No subjects assigned." />{timetableAllowed && <><h3>Class Timetable</h3><Table headers={['Day', 'Time', 'Subject']} rows={(data.slots || []).map((s: Row) => [['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.dayOfWeek] || '-', `${s.period?.startTime?.slice(0, 5) || '-'} - ${s.period?.endTime?.slice(0, 5) || '-'}`, s.period?.isBreak ? 'Break' : s.subjectName || '-'])} empty="No timetable published for this section." /></>}</>}
          {tab === 'Documents' && <Table headers={['Document', 'View / Download']} rows={(student.documents || []).map((d: Row) => [d.documentName, <a className="create-icon-button" title="View Document" aria-label={`View ${d.documentName}`} href={profilePictureUrl(d.documentURL)} target="_blank" rel="noopener noreferrer"><PreviewIcon size={26} /></a>])} empty="No documents uploaded." />}
        </>}
      </section>
      <EditStudent isOpen={edit} onClose={() => setEdit(false)} student={student as any} schoolId={Number(schoolId)} onSuccess={() => { setEdit(false); setRefresh(r => r + 1); toast.success('Student updated successfully.'); }} />
      <Modal isOpen={idCard} onClose={() => setIdCard(false)} title="Student ID Card" showCancel={false} showSubmit={false}><ProfileIdCard name={student.studentName} pictureUrl={student.profilePictureUrl} type="Student" identifier={`Student ID: ${student.id}`} subtitle={`${student.className || 'Class not assigned'} / Section ${student.sectionName || '-'}`} status={student.isActive} fields={[
        { label: 'Roll Number', value: student.rollNumber }, { label: 'Gender', value: genderLabel(student.genderCode) }, { label: 'Date of Birth', value: displayDate(student.dob) }, { label: 'Academic Session', value: student.academicSession?.slice(0, 4) }, { label: 'Email', value: student.email }, { label: 'Phone', value: student.phoneNumber }, { label: 'Parent', value: parentLink }, { label: 'Relationship', value: student.parentRelationship }
      ]} /></Modal>
      <Modal isOpen={photo} onClose={() => setPhoto(false)} title="Profile Photo" showCancel={false} showSubmit={false}><img className="staff-profile-photo" src={profilePictureUrl(student.profilePictureUrl)} alt={student.studentName} /></Modal>
      <Modal isOpen={!!receipt} onClose={() => setReceipt(null)} title="Payment Receipt" showCancel={false} showSubmit={false}>{receipt && <><div className="student-profile-receipt"><h2>Payment Receipt</h2><dl className="student-profile-details">{[['Receipt Number', receipt.receiptNumber], ['Student', receipt.studentName], ['Class / Section', `${receipt.className || '-'} / ${receipt.sectionName || '-'}`], ['Date', displayDate(receipt.paymentDate)], ['Fee Type', receipt.feeType], ['Amount Paid', money(receipt.amountPaid)], ['Payment Mode', receipt.paymentMode], ['Acknowledgement', receipt.acknowledgementId]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '-'}</dd></div>)}</dl></div><IconButton label="Print Receipt" onClick={() => window.print()}><PrintIcon size={26} /></IconButton></>}</Modal>
    </>}
    {!student && (busy ? <PageLoader /> : <p>{failed ? 'Unable to load profile.' : 'Student not found in this school.'} <button onClick={() => setRefresh(r => r + 1)}>Retry</button></p>)}
  </main>;
}
