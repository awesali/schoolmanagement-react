import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config';
import { LogoutIcon, ProfileIcon } from '../components/Icons/Icons';
import { profilePictureUrl } from './ProfilePictureInput';
import './PrincipalDashboard.css';
import SyllabusProgress from './SyllabusProgress';

type ClassRow = { id: number; name: string; total: number; recorded: number; present: number; absent: number; late: number; pending: number };
type Attendance = { total: number; present: number; absent: number; late: number; unmarked: number };
type Leave = { id: number; staffName: string; leaveType: string; fromDate: string; toDate: string; reason: string; createdDate: string };
export type PrincipalData = {
  schoolId: number; schoolName: string; date: string; academicYear: string | null; generatedAt: string;
  students: (Attendance & { recorded: number; pendingClasses: number; classes: ClassRow[] }) | null;
  staff: (Attendance & { onLeave: number; people: { id: number; name: string; status: string }[] }) | null;
  academics: { classes: number; scheduledPeriods: number; homeworkPosted: number; classActivity?: { id: number; name: string; scheduledPeriods: number; homeworkPosted: number }[] } | null;
  leaveRequests: Leave[] | null;
  finance: { today: number; month: number; outstanding: number; assessed: number; collected: number } | null;
  examinations: { id: number; name: string; startDate: string | null; endDate: string | null; resultPublished: boolean; isPublished: boolean }[] | null;
};
type Page = 'Dashboard' | 'Academic audit' | 'Student attendance' | 'Teachers & staff' | 'Leave requests' | 'Examinations' | 'Finance' | 'Daily school brief';
const dateLabel = (value: string) => new Date(value.substring(0, 10) + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const percentage = (count: number, total: number) => total > 0 ? Math.round(count / total * 1000) / 10 : null;
const rateLabel = (value: number | null) => value === null ? '—' : value + '%';
const today = () => { const d = new Date(); return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); };

export default function PrincipalDashboard({ userName, profilePicture, schoolName, schoolLogoUrl, onLogout, onProfile }: { userName: string; profilePicture?: string | null; schoolName?: string; schoolLogoUrl?: string | null; onLogout: () => void; onProfile: () => void }) {
  const [data, setData] = useState<PrincipalData | null>(null);
  const [page, setPage] = useState<Page>('Dashboard');
  const [date, setDate] = useState(today);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pendingOnly, setPendingOnly] = useState(false);
  const [attendanceThreshold, setAttendanceThreshold] = useState('all');
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const resolvedLogo = profilePictureUrl(schoolLogoUrl);
  const schoolLabel = data?.schoolName || schoolName || 'School';
  const schoolInitials = schoolLabel.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'S';
  const [failedPicture, setFailedPicture] = useState<string | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const initials = userName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        avatarRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileMenuOpen]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null); setSelectedClass(null);
    fetch(API_BASE_URL + '/api/principal/dashboard?date=' + date, {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }, signal: controller.signal, cache: 'no-store',
    }).then(async response => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || (response.status === 403 ? 'You do not have access to the Principal dashboard.' : 'Unable to load school data. Please try again.'));
      }
      return response.json();
    }).then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refresh]);

  const navigate = (next: Page, pending = false) => { setPage(next); setPendingOnly(pending); setAttendanceThreshold('all'); setSearch(''); setSelectedClass(null); setMenuOpen(false); if (contentRef.current) contentRef.current.scrollTop = 0; };
  const student = data?.students;
  const staff = data?.staff;
  const attendanceRate = student ? percentage(student.present, student.recorded) : null;
  const completion = student ? percentage(student.recorded, student.total) : null;
  const pages: { name: Page; group: string; visible: boolean }[] = [
    { name: 'Dashboard', group: 'OVERVIEW', visible: true },
    { name: 'Daily school brief', group: 'OVERVIEW', visible: true },
    { name: 'Academic audit', group: 'ACADEMICS', visible: !!student || !!data?.academics },
    { name: 'Student attendance', group: 'ACADEMICS', visible: !!student },
    { name: 'Examinations', group: 'ACADEMICS', visible: !!data?.examinations },
    { name: 'Teachers & staff', group: 'PEOPLE', visible: !!staff },
    { name: 'Leave requests', group: 'PEOPLE', visible: !!data?.leaveRequests },
    { name: 'Finance', group: 'OPERATIONS', visible: !!data?.finance },
  ];
  const alerts = [
    ...(student?.pendingClasses ? [{ title: student.pendingClasses + ' classes have attendance pending', detail: student.unmarked + ' student records still need marking.', page: 'Student attendance' as Page, pending: true }] : []),
    ...(staff?.unmarked ? [{ title: staff.unmarked + ' staff attendance records pending', detail: 'Review today’s staff attendance coverage.', page: 'Teachers & staff' as Page, pending: false }] : []),
    ...(data?.leaveRequests?.length ? [{ title: data.leaveRequests.length + ' leave requests awaiting review', detail: 'Check dates and reasons before arranging coverage.', page: 'Leave requests' as Page, pending: false }] : []),
  ];
  function metric(label: string, value: React.ReactNode, note: string, destination: Page, pending = false) {
    return <button className="principal-metric" onClick={() => navigate(destination, pending)} key={label}><span>{label}<span aria-hidden="true">↗</span></span><strong>{value}</strong><small>{note}</small></button>;
  }
  function attendanceTable() {
    const rows = (student?.classes || []).filter(c => c.name.toLowerCase().includes(search.toLowerCase()) && (!pendingOnly || c.pending > 0) && (attendanceThreshold === 'all' || (c.recorded > 0 && c.present / c.recorded * 100 < Number(attendanceThreshold))));
    return <section className="principal-panel">
      <div className="principal-section-title"><div><h2>Attendance by class</h2><p>Compare presence, absence and late arrivals for {dateLabel(date)}. Attendance rates use recorded students only.</p></div></div>
      <div className="principal-summary"><div><span>Attendance rate</span><strong>{rateLabel(attendanceRate)}</strong></div><div><span>Present (includes late)</span><strong>{student?.present ?? 0}</strong></div><div><span>Absent</span><strong>{student?.absent ?? 0}</strong></div><div><span>Unmarked</span><strong>{student?.unmarked ?? 0}</strong></div></div><div className="principal-filters"><label>Attendance rate<select aria-label="Attendance rate filter" value={attendanceThreshold} onChange={e => setAttendanceThreshold(e.target.value)}><option value="all">All rates</option><option value="90">Below 90%</option><option value="75">Below 75%</option></select></label><input aria-label="Search classes" placeholder="Search class or section" value={search} onChange={e => setSearch(e.target.value)} /><label><input type="checkbox" checked={pendingOnly} onChange={e => setPendingOnly(e.target.checked)} /> Attendance pending only</label></div>
      <div className="principal-table-scroll"><table><thead><tr><th>Class</th><th>Recorded / expected</th><th>Present</th><th>Absent</th><th>Late</th><th>Pending</th><th>Attendance rate</th></tr></thead><tbody>
        {rows.map(c => <tr key={c.id}><td><button className="principal-link" onClick={() => setSelectedClass(c)}>{c.name}</button></td><td>{c.recorded} / {c.total}</td><td>{c.present}</td><td>{c.absent}</td><td>{c.late}</td><td><span className={c.pending ? 'principal-badge warning' : 'principal-badge'}>{c.pending}</span></td><td>{rateLabel(percentage(c.present, c.recorded))}</td></tr>)}
        {!rows.length && <tr><td colSpan={7}>No classes match this view.</td></tr>}
      </tbody></table></div>
      <p className="principal-footnote">Present includes late arrivals. Unmarked records are never counted as absent. Completion measures recording coverage, not attendance rate.</p>
      {selectedClass && <div className="principal-class-detail" role="region" aria-label="Class attendance detail"><button className="principal-link" onClick={() => setSelectedClass(null)}>Close details</button><h3>{selectedClass.name}</h3><p>Expected: <b>{selectedClass.total}</b> · Recorded: <b>{selectedClass.recorded}</b> · Still missing: <b>{selectedClass.pending}</b></p><p>Attendance among recorded students: {rateLabel(percentage(selectedClass.present, selectedClass.recorded))}.</p></div>}
    </section>;
  }
  function dailyBrief() {
    const missing = student?.classes.filter(c => c.pending > 0) || [];
    return <article className="principal-panel principal-brief">
      <header className="principal-report-heading"><span className="principal-eyebrow">DAILY SCHOOL REPORT</span><h2>{schoolLabel}</h2><p>{dateLabel(date)} · Prepared for {userName}</p></header>
      <h3>At a glance</h3>
      <p>{student ? student.recorded > 0 ? student.present + ' of ' + student.recorded + ' recorded students are present (' + rateLabel(attendanceRate) + '). ' + student.unmarked + ' attendance records remain unmarked.' : 'Student attendance has not been recorded for this date.' : 'Student attendance is not available to this account.'}</p>
      {staff && <p>{staff.present} of {staff.total} staff are present; {staff.onLeave} on leave and {staff.unmarked} unmarked.</p>}
      <dl className="principal-brief-facts">
        {student && <><div><dt>Student absences</dt><dd>{student.absent}</dd></div><div><dt>Late students (included in present)</dt><dd>{student.late}</dd></div></>}
        {data?.academics && <><div><dt>Scheduled teaching periods</dt><dd>{data.academics.scheduledPeriods}</dd></div><div><dt>Homework assignments posted</dt><dd>{data.academics.homeworkPosted}</dd></div></>}
        {data?.finance && <><div><dt>Fees collected on this date</dt><dd>{money(data.finance.today)}</dd></div><div><dt>Academic-year outstanding</dt><dd>{data.academicYear ? money(data.finance.outstanding) : 'Unavailable'}</dd></div></>}
      </dl>
      <h3>Follow-up register</h3>
      {missing.length > 0 && <div className="principal-brief-action"><b>Complete attendance recording</b><p>{missing.map(c => c.name + ': ' + c.pending + ' missing').join('; ')}.</p><button className="principal-link" onClick={() => navigate('Student attendance', true)}>Review attendance records</button></div>}
      {!!staff?.unmarked && <div className="principal-brief-action"><b>Verify staff attendance</b><p>{staff.unmarked} staff records are unmarked.</p><button className="principal-link" onClick={() => navigate('Teachers & staff')}>Review staff records</button></div>}
      {!!data?.leaveRequests?.length && <div className="principal-brief-action"><b>Review current leave requests</b><p>{data.leaveRequests.length} pending requests. This is the current queue, not a historical count for the report date.</p><button className="principal-link" onClick={() => navigate('Leave requests')}>Review leave queue</button></div>}
      {!alerts.length && <p>No outstanding items found in the connected records.</p>}
      <h3>Report coverage</h3><p className="principal-footnote">A snapshot of available records at refresh time. Scheduled periods do not confirm lesson delivery. Diary completion and parent issues are not yet recorded. Class-wise syllabus tracking is available from the dashboard and academic audit.</p>
    </article>;
  }
  function academicAudit() {
    const activity = data?.academics?.classActivity;
    const rows: { id: number; name: string; scheduledPeriods: number | null; homeworkPosted: number | null }[] = activity ?? (student?.classes || []).map(c => ({ id: c.id, name: c.name, scheduledPeriods: null, homeworkPosted: null }));
    const filtered = rows.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    const complete = student?.classes.filter(c => c.pending === 0).length;
    return <>
      <section className="principal-panel"><h2>Academic execution review</h2><p>Check whether class records are complete and review teaching activity for {dateLabel(date)}.</p>
        <div className="principal-summary">
          <div><span>Attendance fully recorded</span><strong>{student ? complete + ' / ' + student.classes.length + ' classes' : 'Unavailable'}</strong></div>
          <div><span>Scheduled periods</span><strong>{data?.academics?.scheduledPeriods ?? 'Unavailable'}</strong></div>
          <div><span>Homework posted</span><strong>{data?.academics?.homeworkPosted ?? 'Unavailable'}</strong></div>
        </div>
        <p className="principal-footnote">Attendance checks recording completion. Homework is an activity count; no expected posting target is configured. Timetable counts do not confirm teaching took place.</p>
      </section>
      <section className="principal-panel"><h2>Class execution checklist</h2><input aria-label="Search audit classes" placeholder="Search class or section" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="principal-table-scroll"><table><thead><tr><th>Class</th><th>Attendance recorded / expected</th><th>Scheduled periods</th><th>Homework posted</th><th>Review finding</th></tr></thead><tbody>
          {filtered.map(c => {
            const attendance = student?.classes.find(s => s.id === c.id);
            return <tr key={c.id}><td>{c.name}</td><td>{attendance ? attendance.recorded + ' / ' + attendance.total : student ? 'No active enrollment' : 'Unavailable'}</td><td>{c.scheduledPeriods ?? 'Unavailable'}</td><td>{c.homeworkPosted ?? 'Unavailable'}</td><td>{attendance?.pending ? <button className="principal-link" onClick={() => { navigate('Student attendance', true); setSearch(c.name); }}>{attendance.pending} attendance records missing</button> : attendance ? <span className="principal-badge">Attendance complete</span> : 'Attendance not assessed'}</td></tr>;
          })}
          {!filtered.length && <tr><td colSpan={5}>No classes match this audit.</td></tr>}
        </tbody></table></div>
      </section>
      {data?.academics && <SyllabusProgress date={date} refresh={refresh} />}
      <section className="principal-panel"><h2>Checks awaiting setup</h2><div className="principal-audit-coverage">{['Class diary: expected lessons and diary entries', 'Lesson plans: submission and review records'].map(item => <p key={item}>{item}<span className="principal-badge warning">Not configured</span></p>)}</div><p>These checks will become part of the audit once their records are available.</p></section>
    </>;
  }
  function leavePanel() {
    return <section className="principal-panel"><h2>Pending staff leave requests</h2><p>Current queue, ordered by request date. Decisions and approval history will be added with the approvals workflow.</p>
      {!data?.leaveRequests?.length ? <p className="principal-empty">No pending staff leave requests.</p> : <div className="principal-table-scroll"><table><thead><tr><th>Staff member</th><th>Leave type</th><th>Dates</th><th>Reason</th><th>Requested</th></tr></thead><tbody>{data.leaveRequests.map(l => <tr key={l.id}><td>{l.staffName}<small className="principal-block">Request #{l.id}</small></td><td>{l.leaveType}</td><td>{dateLabel(l.fromDate)} – {dateLabel(l.toDate)}</td><td>{l.reason}</td><td>{dateLabel(l.createdDate)}</td></tr>)}</tbody></table></div>}
    </section>;
  }
  function financePanel() {
    const f = data?.finance;
    return f ? <section className="principal-panel"><h2>Fee collection</h2><p>Collection through {dateLabel(date)}. Outstanding is for the selected academic year.</p><div className="principal-summary"><div><span>Today</span><strong>{money(f.today)}</strong></div><div><span>This month</span><strong>{money(f.month)}</strong></div><div><span>Outstanding</span><strong>{data?.academicYear ? money(f.outstanding) : '—'}</strong></div></div><p className="principal-footnote">Read-only financial overview. Fee aging is unavailable because fee due dates are not recorded.</p></section> : null;
  }
  function examsPanel() {
    return <section className="principal-panel"><h2>Examination overview</h2><p>Exams in the selected academic year.</p>{!data?.examinations?.length ? <p className="principal-empty">No examinations found.</p> : data.examinations.map(e => <div className="principal-list-row" key={e.id}><div><b>{e.name}</b><small className="principal-block">{e.startDate ? dateLabel(e.startDate) : 'Dates not set'}{e.endDate ? ' – ' + dateLabel(e.endDate) : ''}</small></div><span className="principal-badge">{e.resultPublished ? 'Results published' : e.isPublished ? 'Exam published' : 'Draft'}</span></div>)}<p className="principal-footnote">Marks completion and result approval are not yet connected to this overview.</p></section>;
  }
  function overview() {
    return <>
      <div className="principal-kpis">
        {student && <>
          {metric('Students', data?.academicYear ? student.total.toLocaleString('en-IN') : '—', 'Active enrollments this academic year', 'Student attendance')}
          {metric('Student attendance', rateLabel(attendanceRate), student.present + ' present · ' + student.recorded + ' recorded', 'Student attendance')}
          {metric('Students absent', student.absent, student.unmarked + ' records still unmarked', 'Student attendance')}
          {metric('Attendance pending', student.pendingClasses, 'Classes with incomplete attendance', 'Student attendance', true)}
        </>}
        {staff && <>{metric('Staff present', staff.present + ' / ' + staff.total, staff.unmarked + ' not marked', 'Teachers & staff')}{metric('Staff on leave', staff.onLeave, 'Approved leave / recorded leave today', 'Teachers & staff')}</>}
        {data?.academics && metric('Scheduled periods', data.academics.scheduledPeriods, 'Recurring timetable · not confirmed delivery', 'Academic audit')}
        {data?.leaveRequests && metric('Leave requests', data.leaveRequests.length, 'Current pending review queue', 'Leave requests')}
        {data?.finance && <>{metric('Fee collection today', money(data.finance.today), 'Recorded active payments', 'Finance')}{metric('Outstanding fees', data.academicYear ? money(data.finance.outstanding) : '—', 'Selected academic year', 'Finance')}</>}
      </div>
      <div className="principal-columns"><section className="principal-panel principal-attention"><div className="principal-section-title"><h2>Attention required</h2><span className="principal-badge warning">{alerts.length} areas</span></div>
        {alerts.map(a => <button className="principal-alert" key={a.title} onClick={() => navigate(a.page, a.pending)}><span className="principal-alert-dot" /><span><b>{a.title}</b><small>{a.detail}</small></span><span aria-hidden="true">→</span></button>)}
        {!alerts.length && <p className="principal-empty">No pending items found in the connected records.</p>}
        <p className="principal-footnote">Based on available records. Calendar closures, syllabus delays and parent issues are not included.</p>
      </section><section className="principal-panel"><h2>Today’s academic execution</h2>{student && <><div className="principal-list-row"><span>Attendance recording</span><b>{rateLabel(completion)}</b></div><progress max={100} value={completion ?? 0} aria-label="Attendance recording completion" /><p>{student.recorded} / {student.total} student records completed</p></>}
        {data?.academics && <div className="principal-list-row"><span>Homework posted</span><b>{data.academics.homeworkPosted}</b></div>}
        {['Class diary', 'Lesson plans'].map(label => <div className="principal-list-row" key={label}><span>{label}</span><span className="principal-muted">Not configured</span></div>)}
      </section></div>
      <div className="principal-columns">{student && <section className="principal-panel"><h2>Student attendance</h2><div className="principal-summary"><div><span>Present</span><strong>{student.present}</strong></div><div><span>Absent</span><strong>{student.absent}</strong></div><div><span>Late · included in present</span><strong>{student.late}</strong></div></div><button className="principal-link" onClick={() => navigate('Student attendance')}>View class breakdown →</button></section>}
      {staff && <section className="principal-panel"><h2>Staff attendance</h2><div className="principal-summary"><div><span>Present</span><strong>{staff.present}</strong></div><div><span>Absent</span><strong>{staff.absent}</strong></div><div><span>On leave</span><strong>{staff.onLeave}</strong></div></div><button className="principal-link" onClick={() => navigate('Teachers & staff')}>View staff records →</button></section>}</div>
      {data?.academics && <SyllabusProgress date={date} refresh={refresh} />}
      <div className="principal-columns">{financePanel()}{data?.examinations && examsPanel()}</div>
      <section className="principal-panel"><h2>Monitoring coverage</h2><p>Parent issues, diary monitoring, substitutions and consolidated approvals are not configured yet. Their figures will appear when those workflows are connected.</p><span className="principal-badge">School operating status: not recorded</span></section>
    </>;
  }
  return <div className="principal-shell">
    <aside className={'principal-sidebar' + (menuOpen ? ' is-open' : '')}><div className="principal-brand"><span className="principal-school-logo" title={schoolLabel} aria-label={schoolLabel + ' logo'}>{resolvedLogo && failedLogo !== resolvedLogo ? <img src={resolvedLogo} alt={schoolLabel + ' logo'} onError={() => setFailedLogo(resolvedLogo)} /> : <span>{schoolInitials}</span>}</span><div><strong>Principal’s Office</strong><small>{data?.schoolName || schoolName || 'School overview'}</small></div></div><nav aria-label="Principal navigation">{pages.filter(p => p.visible).map((p, i, items) => <React.Fragment key={p.name}>{(i === 0 || items[i - 1].group !== p.group) && <p className="principal-nav-group">{p.group}</p>}<button className={page === p.name ? 'active' : ''} aria-current={page === p.name ? 'page' : undefined} onClick={() => navigate(p.name)}>{p.name}{p.name === 'Leave requests' && !!data?.leaveRequests?.length && <span>{data.leaveRequests.length}</span>}</button></React.Fragment>)}</nav></aside>
    <main className="principal-main"><header className="principal-topbar"><button className="principal-mobile-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>☰</button><span>School leadership <span className="principal-muted">/ {page}</span></span><div className="principal-account">
        <span className="principal-account-name">Welcome, <strong>{userName}</strong></span>
        <div className="profile-menu" ref={profileMenuRef}>
          <button type="button" className="user-avatar" ref={avatarRef} title={userName} aria-label={userName + ' profile menu'} aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(open => !open)}>
            {profilePicture && failedPicture !== profilePicture ? <img src={profilePictureUrl(profilePicture)} alt={userName + ' profile'} onError={() => setFailedPicture(profilePicture)} /> : <span>{initials}</span>}
          </button>
          {profileMenuOpen && <div className="profile-dropdown" role="menu">
            <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); onProfile(); }}><ProfileIcon size={20} />Profile</button>
            <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); onLogout(); }}><LogoutIcon size={20} />Logout</button>
          </div>}
        </div>
      </div></header>
      <div className="principal-scroll-area" ref={contentRef}><div className="principal-content"><div className="principal-heading"><div><span className="principal-eyebrow">YOUR SCHOOL AT A GLANCE</span><h1>{page === 'Dashboard' ? 'Good ' + (new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening') + ', ' + userName : page}</h1><p>{new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Academic year {data?.academicYear || 'not configured'}</p></div><div className="principal-toolbar"><label>Overview date<input aria-label="Overview date" type="date" value={date} max={today()} onChange={e => { if (e.target.value && e.target.value <= today()) setDate(e.target.value); }} /></label><button onClick={() => setRefresh(n => n + 1)} disabled={loading}>Refresh</button>{page === 'Daily school brief' && <button onClick={() => window.print()}>Print report</button>}</div></div>
      {loading ? <div className="principal-panel" role="status">Loading your school overview…</div> : error ? <div className="principal-panel" role="alert"><h2>School overview unavailable</h2><p>{error}</p><button onClick={() => setRefresh(n => n + 1)}>Try again</button></div> : data && <>
        {!data.academicYear && <div className="principal-notice" role="status">No academic year covers this date. Enrollment, exam and outstanding fee summaries are unavailable.</div>}
        {page === 'Dashboard' && overview()}
        {page === 'Daily school brief' && dailyBrief()}
        {page === 'Student attendance' && student && attendanceTable()}
        {page === 'Academic audit' && academicAudit()}
        {page === 'Teachers & staff' && staff && <section className="principal-panel"><h2>Today’s staff records</h2><input aria-label="Search staff" placeholder="Search staff" value={search} onChange={e => setSearch(e.target.value)} /><div className="principal-table-scroll"><table><thead><tr><th>Staff member</th><th>Attendance status</th></tr></thead><tbody>{staff.people.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => <tr key={s.id}><td>{s.name}</td><td><span className={'principal-badge' + (s.status === 'Not marked' || s.status === 'Absent' ? ' warning' : '')}>{s.status}</span></td></tr>)}</tbody></table></div>{!staff.people.length && <p>No active staff found.</p>}</section>}
        {page === 'Leave requests' && leavePanel()}
        {page === 'Examinations' && examsPanel()}
        {page === 'Finance' && financePanel()}
        <p className="principal-updated">Updated {new Date(data.generatedAt).toLocaleString('en-IN')} · Attendance and activity reflect the selected date; leave requests show the current queue.</p>
      </>}</div></div>
    </main>
  </div>;
}
