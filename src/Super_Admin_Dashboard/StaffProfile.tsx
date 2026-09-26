import StaffLeaveAllowance from './StaffLeaveAllowanceEditor';
import { staffTimetableSlots } from './staffTimetable';
import { StaffCareerActions, StaffChangeHistory } from './StaffCareer';
import { BackIcon, EmailIcon, PhoneIcon, SchoolIcon, ProfileIcon, IdCardIcon, EditIcon, AssignmentIcon, PaymentIcon, SubjectsIcon, TimeTableIcon, TemplateIcon, PreviewIcon, PrintIcon } from '../components/Icons/Icons';
import ProfileIdCard from './ProfileIdCard';
import React, { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { usePermissions } from '../security/Permissions';
import { useToast } from '../components/Toast/Toast';
import { PageLoader } from '../components/Loader/Loader';
import EditStaff from './EditStaff';
import { StaffDetailSummary } from './StaffDetailSections';
import ProfileListAvatar from './ProfileListAvatar';
import { profilePictureUrl } from './ProfilePictureInput';
import Modal from './Modal';
import { genderLabel } from '../utils/gender';
import './StaffProfile.css';
import '../components/Icons/CreateIconButton.css';

type Row = Record<string, any>;
const date = (value: string) => value ? new Date(value).toLocaleDateString() : '-';
const money = (value: number) => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
const Grid = ({ headings, rows, empty }: { headings: string[]; rows: React.ReactNode[][]; empty: string }) => rows.length ? <div className="staff-profile-table"><table><thead><tr>{headings.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div> : <p className="staff-profile-empty">{empty}</p>;

export default function StaffProfile() {
  const { schoolId, staffId } = useParams();
  const { can, loading: permissionsLoading } = usePermissions();
  const toast = useToast();
  const [staff, setStaff] = useState<Row | null>(null);
  const [tab, setTab] = useState('Overview');
  const [month, setMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [edit, setEdit] = useState(false);
  const [photo, setPhoto] = useState(false);
  const [showIdCard, setShowIdCard] = useState(false);
  const [payslip, setPayslip] = useState<Row | null>(null);
  const [data, setData] = useState<Row>({});
  const allowed = can('management.staff');
  const attendanceAllowed = can('attendance.staff');
  const salaryAllowed = can('finance.salary');
  const classesAllowed = can('academics.classes') && can('academics.subjects');
  const timetableAllowed = classesAllowed && can('academics.class-schedule');
  const tabs = ['Overview', ...(attendanceAllowed ? ['Attendance'] : []), ...(salaryAllowed ? ['Salary'] : []), ...(classesAllowed ? ['Classes & Subjects'] : []), ...(timetableAllowed ? ['Timetable'] : []), 'Documents', 'Leave Allowance', 'Change History'];
  const back = `/dashboard?schoolId=${schoolId}&page=Staff%20List`;
  const tabIcons: Record<string, React.ReactNode> = { Overview: <ProfileIcon />, Attendance: <AssignmentIcon />, Salary: <PaymentIcon />, 'Classes & Subjects': <SubjectsIcon />, Timetable: <TimeTableIcon />, Documents: <TemplateIcon /> };

  useEffect(() => {
    if (permissionsLoading || !allowed) return;
    if (!tabs.includes(tab)) { setTab('Overview'); return; }
    const controller = new AbortController();
    const request = async (path: string) => {
      const response = await fetch(`${API_BASE_URL}/api/${path}`, { signal: controller.signal, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (response.status === 404 && path.startsWith('Admin/GetStaffAttendanceHistoryByDate')) return [];
      if (!response.ok) throw new Error('Unable to load staff details. Please try again.');
      const result = await response.json();
      if (result.success === false) throw new Error(result.message || 'Unable to load staff details.');
      return result;
    };
    const all = async (path: string) => {
      let rows: Row[] = [], page = 1, pages = 1;
      do { const result = await request(`${path}&page=${page}&pageSize=100`); rows.push(...(result.data || [])); pages = result.totalPages || 1; page++; } while (page <= pages);
      return rows;
    };
    const run = async () => {
      setBusy(true); setFailed(false); setData({});
      try {
        let current = staff;
        {
          current = (await all(`Admin/Staff-by-school?schoolId=${schoolId}&staffId=${staffId}`)).find(s => Number(s.id) === Number(staffId)) || null;
          setStaff(current);
        }
        if (!current) return;
        const [year, m] = month.split('-').map(Number);
        if (tab === 'Attendance') {
          const end = new Date(year, m, 0).getDate();
          const rows = await request(`Admin/GetStaffAttendanceHistoryByDate?schoolId=${schoolId}&staffId=${staffId}&fromDate=${month}-01&toDate=${month}-${end}`);
          setData({ attendance: rows.filter((r: Row) => Number(r.staffId) === Number(staffId)) });
        } else if (tab === 'Salary') {
          const [assigned, history, pending] = await Promise.all([
            request(`Staff/assigned-salary/${staffId}`), request(`Staff/history?schoolId=${schoolId}&month=${m}&year=${year}`), request(`Staff/pending?schoolId=${schoolId}`)
          ]);
          setData({ assigned: assigned.isAssigned ? assigned.data : null, salaryRevisions: assigned.history || [], history: history.filter((r: Row) => Number(r.staffId) === Number(staffId)), pending: pending.filter((r: Row) => Number(r.staffId) === Number(staffId)) });
        } else if (tab === 'Classes & Subjects' || tab === 'Timetable') {
          const [classes, subjects] = await Promise.all([all(`Class/calss-list?schoolId=${schoolId}`), all(`Subject/subjects-by-school?schoolId=${schoolId}`)]);
          const owned = subjects.filter(s => Number(s.teacherId) === Number(staffId));
          const sections = classes.flatMap(c => (c.sections || []).map((s: Row) => ({ ...s, className: c.className, taught: (s.subjects || []).filter((sub: Row) => Number(sub.teacherId) === Number(staffId)) }))).filter(s => Number(s.staffId) === Number(staffId) || s.taught.length);
          const slots: Row[] = [];
          if (tab === 'Timetable') {
            for (const section of sections.filter(s => s.taught.length)) {
              const result = await request(`Timetable/get-timetable?sectionId=${section.id}`);
              for (const slot of staffTimetableSlots(result.data?.periods || [], result.data?.slots || [])) {
                if (!section.taught.some((sub: Row) => Number(sub.subjectId) === Number(slot.subjectId))) continue;
                slots.push({ ...slot, className: section.className, sectionName: section.sectionName, subjectName: slot.subjectName || owned.find(s => s.id === slot.subjectId)?.subjectName });
              }
            }
            slots.sort((a, b) => a.dayOfWeek - b.dayOfWeek || String(a.startTime).localeCompare(String(b.startTime)));
          }
          setData({ sections, subjects: owned, slots });
        }
      } catch (error) {
        if (!controller.signal.aborted) { setFailed(true); toast.error(error instanceof Error ? error.message : 'Unable to load staff details.'); }
      } finally { if (!controller.signal.aborted) setBusy(false); }
    };
    run();
    return () => controller.abort();
    // Reload only when the selected profile, tab, month, or explicit refresh changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, staffId, tab, month, revision, permissionsLoading, allowed]);

  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  if (permissionsLoading) return <PageLoader />;
  if (!allowed) return <main className="staff-profile"><Link to="/dashboard">Back to Dashboard</Link><p>You do not have permission to view staff profiles.</p></main>;
  return <main className="staff-profile">
    <Link className="staff-profile-back" to={back}><BackIcon />Back to Staff List</Link>
    {staff && <>
      <header className="staff-profile-header">
        <ProfileListAvatar name={staff.name} pictureUrl={staff.profilePictureUrl} onView={() => setPhoto(true)} />
        <div><h1>{staff.name}</h1><div className="staff-profile-meta"><span><ProfileIcon size={18} />{staff.roleName}</span><span><SchoolIcon size={18} />{staff.schoolName}</span></div><div className="staff-profile-meta"><span><EmailIcon size={18} />{staff.email}</span><span><PhoneIcon size={18} />{staff.phone}</span></div><span>{staff.isActive ? 'Active' : 'Inactive'}</span></div>
        <div className="staff-profile-actions"><button type="button" className="create-icon-button" title="ID Card" aria-label="ID Card" onClick={() => setShowIdCard(true)}><IdCardIcon size={26} /></button>
        {can('management.staff', 'update') && <StaffCareerActions staff={staff as any} schoolId={Number(schoolId)} onSuccess={() => { setStaff(null); setRevision(r => r + 1); }} />}
        {can('management.staff', 'update') && <button type="button" className="create-icon-button" title="Edit Profile" aria-label="Edit Profile" onClick={() => setEdit(true)}><EditIcon size={26} /></button>}</div>
      </header>
      <nav className="staff-profile-tabs" aria-label="Staff profile sections">{tabs.map(t => <button key={t} className={tab === t ? 'selected' : ''} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>{tabIcons[t]}{t}</button>)}</nav>
      <section className="staff-profile-content">
        <h2>{tab}</h2>
        {['Attendance', 'Salary'].includes(tab) && <label>Month <input type="month" value={month} onChange={e => { if (/^\d{4}-\d{2}$/.test(e.target.value)) setMonth(e.target.value); }} /></label>}
        {busy ? <PageLoader /> : failed ? <button className="btn btn-secondary" onClick={() => setRevision(r => r + 1)}>Retry loading</button> : <>
          {tab === 'Overview' && <><dl className="staff-detail-summary"><div><dt>Date of Birth</dt><dd>{date(staff.dob)}</dd></div><div><dt>Date of Joining</dt><dd>{date(staff.doj)}</dd></div><div><dt>Gender</dt><dd>{genderLabel(staff.genderCode)}</dd></div></dl><StaffDetailSummary record={staff} /></>}
          {tab === 'Attendance' && <><p>{(data.attendance || []).filter((r: Row) => r.status === 'Present').length} Present - {(data.attendance || []).filter((r: Row) => r.status === 'Absent').length} Absent - {(data.attendance || []).length} recorded days</p><Grid headings={['Date', 'Status']} rows={(data.attendance || []).map((r: Row) => [date(r.attendanceDate), r.status])} empty="No attendance recorded for this month." /></>}
          {tab === 'Salary' && <>
            <h3>Salary Structure</h3>{data.assigned ? <p>{money(data.assigned.basicSalary)} - {data.assigned.salaryType} - Generates on day {data.assigned.salaryGenerationDay || 1} every month - Effective {date(data.assigned.effectiveFrom)}</p> : <p>No salary assigned.</p>}
            <h3>Salary Revision History</h3><Grid headings={['Effective Date', 'Basic Salary', 'Salary Type', 'Generation Day', 'Status']} rows={(data.salaryRevisions || []).map((r: Row) => [date(r.effectiveFrom), money(r.basicSalary), r.salaryType, r.salaryGenerationDay || 1, r.isActive ? 'Current' : 'Previous'])} empty="No salary revision history." />
            <h3>Payment History - {month}</h3><Grid headings={['Month', 'Basic', 'Bonus', 'Deduction', 'Net Salary', 'Status', 'Payment Date', 'Method', 'Remarks', 'Payslip']} rows={(data.history || []).map((r: Row) => [`${r.salaryMonth}/${r.salaryYear}`, money(r.basicSalary), money(r.bonus), money(r.deduction), money(r.netSalary), r.status, date(r.paymentDate), r.paymentMethod, r.remarks, r.status === 'Paid' ? <button className="btn btn-secondary" onClick={() => setPayslip(r)}><PreviewIcon />View Payslip</button> : '-'])} empty="No salary records for this month." />
            <h3>Pending Salary - All Months</h3><Grid headings={['Month', 'Amount', 'Status']} rows={(data.pending || []).map((r: Row) => [`${r.salaryMonth}/${r.salaryYear}`, money(r.netSalary), r.status])} empty="No pending salary." />
          </>}
          {tab === 'Classes & Subjects' && <><h3>Assigned Classes</h3><Grid headings={['Class', 'Section', 'Class Teacher', 'Teaching Subjects']} rows={(data.sections || []).map((s: Row) => [s.className, s.sectionName, Number(s.staffId) === Number(staffId) ? 'Yes' : 'No', s.taught.map((r: Row) => r.subjectName).join(', ') || '-'])} empty="No class assigned." /><h3>Assigned Subjects</h3><Grid headings={['Subject']} rows={(data.subjects || []).map((s: Row) => [s.subjectName])} empty="No subject assigned." /></>}
          {tab === 'Timetable' && <Grid headings={['Day', 'Time', 'Class', 'Section', 'Subject']} rows={(data.slots || []).map((s: Row) => [['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][s.dayOfWeek] || s.dayOfWeek, s.timeLabel, s.className, s.sectionName, s.subjectName])} empty="No teaching periods scheduled." />}
          {tab === 'Leave Allowance' && <StaffLeaveAllowance schoolId={Number(schoolId)} staffId={Number(staffId)} canEdit={can('management.staff', 'update')} />}
          {tab === 'Change History' && <StaffChangeHistory key={staffId} staffId={Number(staffId)} schoolId={Number(schoolId)} />}
          {tab === 'Documents' && <Grid headings={['Document', 'View / Download']} rows={(staff.documents || []).map((d: Row) => [d.documentName, <a href={profilePictureUrl(d.documentURL) || undefined} target="_blank" rel="noopener noreferrer"><PreviewIcon />View document</a>])} empty="No documents uploaded." />}
        </>}
      </section>
      <Modal showSubmit={false} showCancel={false} isOpen={!!payslip} onClose={() => setPayslip(null)} title="Salary Payslip">
        {payslip && <><div className="staff-payslip"><h2>{staff.schoolName}</h2><h3>Salary Payslip - {payslip.salaryMonth}/{payslip.salaryYear}</h3><p>{staff.name} - {staff.roleName}</p><p>Employee No: {staff.employeeNumber}</p><Grid headings={['Description', 'Amount']} rows={[
          ['Basic Salary', money(payslip.basicSalary)], ['Bonus', money(payslip.bonus)], ['Deduction', money(payslip.deduction)], ['Net Salary', money(payslip.netSalary)]
        ]} empty="" /><p>Paid on: {date(payslip.paymentDate)} - {payslip.paymentMethod}</p><p>{payslip.remarks}</p></div><button className="btn btn-primary" onClick={() => window.print()}><PrintIcon />Print Payslip</button></>}
      </Modal>
      <Modal isOpen={showIdCard} onClose={() => setShowIdCard(false)} title="Employee Profile" showSubmit={false} showCancel={false}>
        <ProfileIdCard
          pictureUrl={staff.profilePictureUrl} name={staff.name} type="Employee"
          identifier={`Employee No: ${staff.employeeNumber}`} subtitle={staff.roleName}
          organization={staff.schoolName} status={staff.isActive}

          fields={[
            { label: 'Role', value: staff.roleName },
            { label: 'Employee No.', value: staff.employeeNumber },
            { label: 'Gender', value: genderLabel(staff.genderCode) },
            { label: 'Date of Birth', value: date(staff.dob) },
            { label: 'Date of Joining', value: date(staff.doj) },
            { label: 'Email', value: staff.email },
            { label: 'Phone', value: staff.phone },
            { label: 'Address', value: staff.address },
          ]}
        />
      </Modal>
      <EditStaff isOpen={edit} onClose={() => setEdit(false)} staff={staff as any} onSuccess={() => { setEdit(false); setStaff(null); setRevision(r => r + 1); }} />
      <Modal showSubmit={false} showCancel={false} isOpen={photo} onClose={() => setPhoto(false)} title={staff.name}><img className="staff-profile-photo" src={profilePictureUrl(staff.profilePictureUrl) || ''} alt={staff.name} /></Modal>
    </>}
    {!staff && (busy ? <PageLoader /> : <p>{failed ? 'Unable to load profile.' : 'Staff not found in this school.'} <button onClick={() => setRevision(r => r + 1)}>Retry</button></p>)}
  </main>;
}
