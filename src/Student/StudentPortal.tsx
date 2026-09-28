import StudentIcon from './StudentIcon';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { BellIcon, LogoutIcon, ProfileIcon, ResetIcon } from '../components/Icons/Icons';
import { profilePictureUrl } from '../Super_Admin_Dashboard/ProfilePictureInput';
import { PageLoader } from '../components/Loader/Loader';
import StudentAssignment from './StudentAssignment';
import StudentExamPanel from './StudentExamPanel';
import StudentReportCards from './StudentReportCards';
import StudentTimetable from './StudentTimetable';
import StudentConversations from './StudentConversations';
import StudentChangePassword from './StudentChangePassword';
import StudentPaymentReceipt from './StudentPaymentReceipt';
import { downloadStudyMaterial, isUploadedStudyMaterial } from './studyMaterialFiles';
import './StudentPortal.css';

type Row = Record<string, any>;
type Overview = {
  profile: Row; timetable: Row[]; homework: Row[]; materials: Row[];
  attendance: Row[]; exams: Row[]; results: Row[]; resultSubjects?: Row[]; parent?: Row; teachers: Row[];
  documents: Row[]; fees: Row[]; payments: Row[]; transport?: Row; transportFees?: Row[]; transportPayments?: Row[]; diary: Row[]; submissions: Row[]; announcements: Row[]; requests: Row[]; messages: Row[]; achievements: Row[]; schoolEvents: Row[]; gradeHistory: Row[]; examResources?: Row[]; hallTickets?: Row[];
};
type NotificationItem = { key: string; title: string; detail: string; at: string; page: Page; target?: string; kind: string };
const notificationFallbackTime = new Date().toISOString();
const notificationStateKey = (email: string) => 'student-notifications:' + email.toLowerCase();
const buildNotifications = (data: Overview): NotificationItem[] => {
  const items: NotificationItem[] = [];
  const add = (kind: string, id: unknown, title: string, detail: string, at: unknown, page: Page, target?: string) => {
    if (id == null || !String(at || '')) return;
    items.push({ key: kind + ':' + id, kind, title, detail, at: String(at), page, target });
  };
  const uniqueExams = new Map<string, Row>();
  for (const paper of data.exams || []) {
    const key = String(paper.examId ?? paper.examName);
    if (!uniqueExams.has(key)) uniqueExams.set(key, paper);
  }
  for (const exam of uniqueExams.values()) add('exam', exam.examId ?? exam.examName, (String(exam.examTypeName || '').toLowerCase() === 'unit test' ? 'Unit test: ' : 'Exam published: ') + exam.examName, 'Open exam timetable', exam.createdDate || exam.examDate, 'Exams', String(exam.examName));
  for (const notice of data.announcements || []) add('notice', notice.id, notice.title, 'New school announcement', notice.createdAt, 'Announcements');
  for (const assignment of data.homework || []) add('homework', assignment.id, 'New homework: ' + assignment.title, assignment.subjectName || 'Open assignment', assignment.assignedDate || assignment.dueDate, 'Homework', String(assignment.id));
  for (const request of data.requests || []) if (request.status && request.status !== 'Pending') add('request', request.id + ':' + request.status, request.type + ' request ' + String(request.status).toLowerCase(), request.response || request.subject || 'Open requests', request.respondedAt || request.createdAt, 'Requests');
  for (const message of data.messages || []) if (!message.fromStudent) add('message', message.id, 'Message from ' + (message.staffName || 'staff'), String(message.body || '').slice(0, 110), message.sentAt, 'Messages', String(message.staffId));
  for (const result of data.results || []) add('result', result.examId ?? result.examName, 'Result published: ' + result.examName, 'View report card', result.createdDate || (data.exams || []).find(exam => Number(exam.examId) === Number(result.examId))?.examDate || notificationFallbackTime, 'Results', String(result.examId ?? result.examName));
  for (const ticket of data.hallTickets || []) add('ticket', ticket.id, 'Hall ticket published: ' + ticket.examName, 'Open hall ticket', ticket.publishedAt || ticket.createdAt || (data.exams || []).find(exam => Number(exam.examId) === Number(ticket.examId))?.examDate || notificationFallbackTime, 'Exams', String(ticket.id));
  for (const event of data.schoolEvents || []) add('event', event.id, 'School event: ' + event.title, 'Open events', event.createdAt || event.eventDate, 'Events');
  for (const material of data.materials || []) add('material', material.id, 'New study material: ' + material.title, material.subjectName || 'Open study materials', material.createdDate, 'Study Materials');
  for (const diary of data.diary || []) add('diary', diary.id, 'Class diary: ' + diary.topic, diary.subjectName || 'Open class diary', diary.entryDate, 'Class Diary');
  for (const achievement of data.achievements || []) add('achievement', achievement.id, 'Achievement: ' + achievement.title, 'Open achievements', achievement.awardedAt, 'Achievements');
  for (const submission of data.submissions || []) if (submission.status === 'Reviewed' || submission.status === 'Resubmission Required') add('submission', submission.id + ':' + submission.status, 'Homework ' + submission.status.toLowerCase(), submission.teacherFeedback || 'Open homework', submission.submittedAt, 'Homework');
  for (const slot of data.timetable || []) if (slot.updatedDate) add('timetable', slot.id + ':' + slot.updatedDate, 'Class timetable changed', slot.subjectName || 'Open timetable', slot.updatedDate, 'Timetable');
  return items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 100);
};
type Page = 'Today' | 'Timetable' | 'Class Diary' | 'Homework' | 'Study Materials' | 'Announcements' | 'Attendance' | 'Exams' | 'Results' | 'Events' | 'Teachers' | 'Messages' | 'Requests' | 'Achievements' | 'Fees' | 'Transport' | 'Documents' | 'My Profile';
const pageIcons: Record<Page, React.ComponentProps<typeof StudentIcon>['name']> = {"Today":"home","Timetable":"timetable","Class Diary":"book","Homework":"assignment","Study Materials":"document","Attendance":"check","Exams":"calendar","Results":"clipboard","Events":"calendar","Announcements":"bell","Teachers":"teacher","Messages":"chat","Requests":"send","Achievements":"trophy","Fees":"payment","Transport":"vehicle","Documents":"document","My Profile":"profile"};
const groups: { title: string; items: Page[] }[] = [
  { title: 'Daily', items: ['Today', 'Timetable', 'Class Diary', 'Homework', 'Study Materials'] },
  { title: 'Academics', items: ['Attendance', 'Exams', 'Results', 'Events'] },
  { title: 'School', items: ['Announcements', 'Teachers', 'Messages', 'Requests', 'Achievements', 'Fees', 'Transport', 'Documents'] },
];
const dateOnly = (value: string) => String(value || '').slice(0, 10);
const shortDate = (value: string) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '·';
const shortTime = (value?: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!match) return '-';
  const hours = Number(match[1]);
  if (hours > 23 || Number(match[2]) > 59) return '-';
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`;
};
const safeLink = (value: string) => { try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; } };
const readJson = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; } };
const todayKey = () => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); };

export default function StudentPortal() {
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);
  const [page, setPage] = useState<Page>('Today');
  const [selectedRecentResult, setSelectedRecentResult] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState('');
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationState, setNotificationState] = useState<Record<string, 'read' | 'deleted'>>({});
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [selectedExamTab, setSelectedExamTab] = useState<'timetable' | 'tickets'>('timetable');
  const [selectedExamTarget, setSelectedExamTarget] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [selectedHomework, setSelectedHomework] = useState<Row | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({ type: 'General', subject: '', details: '', fromDate: '', toDate: '', recipientRoleId: '', recipientUserId: '' });
  const [requestRecipients, setRequestRecipients] = useState<{ roles: { id: number; roleName: string }[]; recipients: { id: number; name: string; roleId: number }[] }>({ roles: [], recipients: [] });
  const [savingAction, setSavingAction] = useState(false);
  const [receipt, setReceipt] = useState<Row | null>(null);
  const [transportReceipt, setTransportReceipt] = useState<Row | null>(null);
  const load = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login', { replace: true }); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/StudentPortal/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
        return;
      }
      const raw = await response.text();
      let body: any;
      try { body = JSON.parse(raw); }
      catch { throw new Error('Student API is unavailable. Restart the latest backend and try again.'); }
      if (!response.ok || !body.success) throw new Error(body.message || 'Could not load your school data.');
      setData(body.data); setOffline(false);
      localStorage.setItem('studentPortalEmail', body.data.profile.email);
      localStorage.setItem('student-offline:' + body.data.profile.email, JSON.stringify({ profile: body.data.profile, timetable: body.data.timetable, homework: body.data.homework, materials: body.data.materials, diary: body.data.diary, attendance: [], exams: [], results: [], teachers: [], documents: [], fees: [], payments: [], transportFees: [], transportPayments: [], submissions: [], announcements: [], requests: [], messages: [], achievements: [], schoolEvents: [], gradeHistory: [] }));
    } catch (failure) {
      const email = localStorage.getItem('studentPortalEmail');
      const snapshot = email ? readJson<Overview | null>('student-offline:' + email, null) : null;
      if (!navigator.onLine && snapshot) { setData(snapshot); setOffline(true); setError('Offline: showing saved timetable, diary, homework and materials.'); }
      else setError(failure instanceof Error ? failure.message : 'Could not load your school data.');
    } finally { setLoading(false); }
  }, [navigate]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (document.hidden || !localStorage.getItem('token')) return;
      try {
        const response = await fetch(API_BASE_URL + '/api/StudentPortal/overview', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
        const body = await response.json();
        if (response.ok && body.success) setData(body.data);
      } catch { /* keep the last available data */ }
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notificationsOpen) return;
    const close = (event: PointerEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setNotificationsOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [notificationsOpen]);
  useEffect(() => {
    if (page !== 'Requests') return;
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/StudentPortal/request-recipients`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.message || 'Could not load recipients.'); return result; })
      .then(result => setRequestRecipients(result.data || { roles: [], recipients: [] }))
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message || 'Could not load recipients.'); });
    return () => controller.abort();
  }, [page]);
  useEffect(() => {
    if (!data) return;
    const key = data.profile.email;
    setNotificationState(readJson<Record<string, 'read' | 'deleted'>>(notificationStateKey(key), {}));
    setBookmarks(readJson<number[]>(`student-bookmarks:${key}`, []));
  }, [data]);
  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileMenuOpen]);
  const saveBookmarks = (next: number[]) => { if (!data) return; setBookmarks(next); localStorage.setItem(`student-bookmarks:${data.profile.email}`, JSON.stringify(next)); };
  const postAction = async (path: string, payload: object) => {
    setSavingAction(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/StudentPortal/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload),
      });
      const raw = await response.text(); let result: any;
      try { result = JSON.parse(raw); } catch { throw new Error('The server returned an invalid response.'); }
      if (!response.ok) throw new Error(result.message || 'Could not save.');
      await load();
      return true;
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save.'); return false; }
    finally { setSavingAction(false); }
  };
  const logout = () => { const email = localStorage.getItem('studentPortalEmail'); if (email) localStorage.removeItem('student-offline:' + email); localStorage.removeItem('studentPortalEmail'); localStorage.removeItem('token'); localStorage.removeItem('schoolId'); navigate('/login', { replace: true }); };
  const switchPage = (next: Page) => { setNotificationsOpen(false); setSelectedConversation(null); setSelectedExamTarget(null); setSelectedRecentResult(null); setPage(next); setFilter(''); setMobileMenu(false); setProfileMenuOpen(false); window.scrollTo(0, 0); };
  const openRecentResult = (result: Row, index: number) => { switchPage('Results'); setSelectedRecentResult(String(result.examId ?? result.examName + '-' + index)); };
  const panel = (title: string, children: React.ReactNode, action?: React.ReactNode) => <section className="sp-panel"><div className="sp-panel-title"><h2>{title}</h2>{action}</div>{children}</section>;
  const empty = (message: string) => <div className="sp-empty">{message}</div>;
  const link = (url: string, label = 'Open resource ?') => safeLink(url) ? <a href={url} target="_blank" rel="noreferrer"><StudentIcon name="external" />{label}</a> : null;
  const documentUrl = (value: unknown) => {
    if (typeof value !== 'string') return null;
    const url = value.trim();
    if (url.startsWith('/') && !url.startsWith('//')) return new URL(url, API_BASE_URL).toString();
    return safeLink(url) ? url : null;
  };
  if (loading && !data) return <PageLoader label="Loading your school day·" />;
  if (error && !data) return <div className="sp-retry"><div className="sp-retry-card"><h1>Could not open your student portal</h1><p>{error}</p><div><button className="btn btn-primary" onClick={() => void load()}><StudentIcon name="retry" />Try again</button><button className="btn" onClick={logout}><StudentIcon name="back" />Back to login</button></div></div></div>;
  if (!data) return null;

  const now = new Date();
  const currentDate = todayKey();
  const todayClasses = data.timetable.filter(x => Number(x.dayOfWeek) === now.getDay()).sort((a, b) => Number(a.periodNumber) - Number(b.periodNumber));
  const due = data.homework.filter(x => dateOnly(x.dueDate) >= currentDate && !(data.submissions || []).some(y => y.assignmentId === x.id && y.status !== 'Resubmission Required'));
  const late = data.homework.filter(x => dateOnly(x.dueDate) < currentDate && !(data.submissions || []).some(y => y.assignmentId === x.id));
  const upcomingExams = data.exams.filter(x => dateOnly(x.examDate) >= currentDate);
  const upcomingExamCount = new Set(upcomingExams.map(x => x.examId != null ? "id:" + x.examId : "name:" + String(x.examName || x.id).trim().toLowerCase())).size;
  const clockTime = now.toTimeString().slice(0, 8);
  const currentClass = todayClasses.find(x => String(x.startTime) <= clockTime && String(x.endTime) > clockTime);
  const nextClass = todayClasses.find(x => String(x.startTime) > clockTime);
  const present = data.attendance.filter(x => String(x.status).toLowerCase() === 'present').length;
  const absent = data.attendance.filter(x => String(x.status).toLowerCase() === 'absent').length;
  const attendancePercent = data.attendance.length ? Math.round(100 * present / data.attendance.length) : null;
  const money = (value: number) => '₹' + value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const feeBalances = data.fees.map(fee => {
    const amount = Number(fee.amount) || 0;
    const paid = data.payments
      .filter(payment => Number(payment.studentFeeId) === Number(fee.id))
      .reduce((sum, payment) => sum + (Number(payment.amountPaid) || 0), 0);
    return { ...fee, amount, paid, pending: Math.max(0, amount - paid) };
  });
  const feeTotal = feeBalances.reduce((sum, fee) => sum + fee.amount, 0);
  const feePaid = feeBalances.reduce((sum, fee) => sum + fee.paid, 0);
  const feePending = feeBalances.reduce((sum, fee) => sum + fee.pending, 0);
  const transportBills = data.transportFees || [];
  const transportTransactions = data.transportPayments || [];
  const transportTotal = transportBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const transportPaid = transportBills.reduce((sum, bill) => sum + (Number(bill.paidAmount) || 0), 0);
  const transportPending = transportBills.reduce((sum, bill) => sum + Math.max(0, (Number(bill.amount) || 0) - (Number(bill.paidAmount) || 0)), 0);
  const transportPeriod = (month: number, year: number) => new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const selectedTransportBill = transportBills.find(bill => bill.id === transportReceipt?.transportFeeId);
  const submissionFor = (assignment: Row) => (data.submissions || []).find(row => Number(row.assignmentId) === Number(assignment.id));
  const isSubmitted = (assignment: Row) => {
    const submission = submissionFor(assignment);
    return Boolean(submission && submission.status !== 'Resubmission Required');
  };
  const filteredHomework = data.homework.filter(assignment => {
    if (!filter) return true;
    if (filter === 'Submitted') return isSubmitted(assignment);
    if (isSubmitted(assignment)) return false;
    if (filter === 'Upcoming') return dateOnly(assignment.dueDate) >= currentDate;
    if (filter === 'Past due') return dateOnly(assignment.dueDate) < currentDate;
    return false;
  });
  const homeworkCard = (x: Row) => <article className="sp-record" key={x.id}><div className="sp-record-head"><span className="sp-tag">{x.subjectName}</span><span>{shortDate(x.dueDate)}</span></div><h3>{x.title}</h3><p>{x.description}</p><div className="sp-record-foot"><span>Due {shortDate(x.dueDate)}</span>{x.totalMarks != null && <span>{x.totalMarks} marks</span>}{link(x.resourceUrl || '')}<button onClick={() => setSelectedHomework(x)}><StudentIcon name="assignment" />{(data.submissions || []).find(y => y.assignmentId === x.id)?.status || "Open assignment"}</button></div></article>;
  const allNotifications = buildNotifications(data);
  const notifications = allNotifications.filter(item => notificationState[item.key] !== 'deleted');
  const unreadCount = notifications.filter(item => notificationState[item.key] !== 'read').length;
  const updateNotification = (key: string, state: 'read' | 'deleted') => {
    const next = { ...notificationState, [key]: state };
    setNotificationState(next);
    localStorage.setItem(notificationStateKey(String(data.profile.email)), JSON.stringify(next));
  };
  const openNotification = (item: NotificationItem) => {
    updateNotification(item.key, 'read');
    switchPage(item.page);
    if (item.kind === 'message' && item.target) setSelectedConversation(Number(item.target));
    if (item.kind === 'result' && item.target) setSelectedRecentResult(item.target);
    if (item.kind === 'ticket') { setSelectedExamTab('tickets'); setSelectedExamTarget(item.target || null); }
    if (item.kind === 'exam') { setSelectedExamTab('timetable'); setSelectedExamTarget(item.target || null); }
    if (item.kind === 'homework' && item.target) setSelectedHomework(data.homework.find(row => String(row.id) === item.target) || null);
  };
  const nav = <nav aria-label="Student navigation">{groups.map(group => <div className="sp-nav-group" key={group.title}><small>{group.title}</small>{group.items.map(item => <button type="button" className={page === item ? 'active' : ''} onClick={() => switchPage(item)} key={item}><StudentIcon name={pageIcons[item]} />{item}</button>)}</div>)}</nav>;
  const sectionHeading = (title: string, detail: string) => <div className="sp-section-intro"><h2>{title}</h2><p>{detail}</p></div>;

  return <div className={"sp-layout" + (sidebarCollapsed ? " sp-sidebar-collapsed" : "")}>
    <aside className={`sp-side${mobileMenu ? ' sp-side-open' : ''}`}><div className="sp-brand"><div className="sp-brand-mark">S</div><div><strong>{data.profile.schoolName || 'School'}</strong><small>Student portal</small></div></div>{nav}</aside>
    <main className="sp-main">
      <header className="sp-header">
        <div className="sp-header-left">
          <button type="button" className="sp-menu-button" aria-label="Toggle navigation" aria-expanded={mobileMenu || !sidebarCollapsed} onClick={() => {
            if (window.innerWidth <= 920) setMobileMenu(open => !open);
            else setSidebarCollapsed(collapsed => !collapsed);
          }}><StudentIcon name="menu" size={20} /></button>
          <h1>{page === 'Today' ? `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${String(data.profile.studentName || 'Student').split(' ')[0]}` : page}</h1>
        </div>
        <div className="sp-header-actions">
          <span className="sp-header-welcome">Welcome, <strong>{data.profile.studentName}</strong></span>
          <div className="sp-notification-menu" ref={notificationsRef}>
            <button type="button" className="sp-notification-bell" aria-label={'Notifications, ' + unreadCount + ' unread'} aria-expanded={notificationsOpen} aria-haspopup="dialog" onClick={() => { setNotificationsOpen(open => !open); setProfileMenuOpen(false); }}>
              <BellIcon size={22}/>{unreadCount > 0 && <span className="sp-notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>
            {notificationsOpen && <div className="sp-notification-dropdown" role="dialog" aria-label="Notifications">
              <div className="sp-notification-heading"><strong>Notifications</strong><span>{unreadCount} unread</span></div>
              <div className="sp-notification-list">{notifications.length ? notifications.map(item => <div className={'sp-notification-item' + (notificationState[item.key] !== 'read' ? ' unread' : '')} key={item.key}>
                <button type="button" className="sp-notification-open" onClick={() => openNotification(item)}><span className="sp-notification-kind">{item.kind}</span><strong>{item.title}</strong><small>{item.detail}</small><time>{shortDate(item.at)}</time></button>
                <button type="button" className="sp-notification-delete" aria-label={'Delete notification: ' + item.title} title="Delete notification" onClick={() => updateNotification(item.key, 'deleted')}><StudentIcon name="remove" size={15} /></button>
              </div>) : <p className="sp-notification-empty">No notifications.</p>}</div>
            </div>}
          </div>          <button type="button" className="sp-refresh-button" aria-label={loading ? 'Refreshing' : 'Refresh'} title={loading ? 'Refreshing' : 'Refresh'} onClick={() => void load()} disabled={loading}><ResetIcon size={22} className={loading ? 'sp-refresh-spinning' : ''} /></button>
          <div className="sp-profile-menu" ref={profileMenuRef}>
            <button type="button" className="sp-profile-avatar" aria-label="Student profile menu" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(open => !open)}>
              {data.profile.profilePictureUrl && !avatarFailed ? <img src={profilePictureUrl(data.profile.profilePictureUrl)} alt="Student profile" onError={() => setAvatarFailed(true)} /> : <span>{String(data.profile.studentName || 'Student').trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase()}</span>}
            </button>
            {profileMenuOpen && <div className="sp-profile-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={() => switchPage('My Profile')}><ProfileIcon size={18} />Profile</button>
              <button type="button" role="menuitem" onClick={logout}><LogoutIcon size={18} />Logout</button>
            </div>}
          </div>
        </div>
      </header>

    {error && <div className="sp-error" role="alert">{error}<button onClick={() => void load()}><StudentIcon name="retry" />Retry</button></div>}
    {page === 'Today' && <>
      {(currentClass || nextClass) && <div className="sp-now"><div><small>{currentClass ? 'NOW' : 'NEXT'}</small><strong>{(currentClass || nextClass)?.subjectName}</strong><span>{shortTime((currentClass || nextClass)?.startTime)}·{shortTime((currentClass || nextClass)?.endTime)}</span></div>{currentClass && nextClass && <div><small>NEXT</small><strong>{nextClass.subjectName}</strong><span>{shortTime(nextClass.startTime)}</span></div>}</div>}
      <div className="sp-stats sp-stats-today">{[['Classes today', todayClasses.filter(x => !x.isBreak).length], ['Homework upcoming', due.length], ['Attendance', attendancePercent == null ? '·' : `${attendancePercent}%`], ['Upcoming exams', upcomingExamCount], ['New announcements', (data.announcements || []).filter(x => dateOnly(x.createdAt) === currentDate).length], ['Pending assignments', due.length + late.length]].map(([label, value]) => <div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <div className="sp-grid">
        {panel("Today's classes", todayClasses.length ? todayClasses.map(x => <div className="sp-line" key={x.periodNumber}><span className="sp-line-date">{shortTime(x.startTime)}<br/>{shortTime(x.endTime)}</span><div><strong>{x.subjectName}</strong><small>Period {x.periodNumber}</small></div></div>) : empty('No classes scheduled today.'), <button className="sp-text-button" onClick={() => switchPage('Timetable')}><StudentIcon name="timetable" />Full timetable</button>)}
        {panel('Things to do', due.length ? due.slice(0, 4).map(x => <div className="sp-line" key={x.id}><span className="sp-dot"/><div><strong>{x.title}</strong><small>{x.subjectName} · Due {shortDate(x.dueDate)}</small></div></div>) : empty('No upcoming homework.'), <button type="button" className="sp-view-action" aria-label="View homework" title="View homework" onClick={() => switchPage('Homework')}><StudentIcon name="preview" size={20} /></button>)}
        {panel('Upcoming', upcomingExams.length ? upcomingExams.slice(0, 4).map(x => <div className="sp-line" key={x.id}><span className="sp-line-date">{shortDate(x.examDate)}</span><div><strong>{x.subjectName}</strong><small>{x.examName} · {shortTime(x.startTime)}</small></div></div>) : empty('No upcoming exams.'))}
        {panel('Recent results', data.results.length ? data.results.slice(0, 4).map((x, i) => <div className="sp-line" key={x.examId ?? i}><div><strong>{x.examName}</strong></div><button type="button" className="sp-view-action" aria-label={'View result: ' + x.examName} title="View result" onClick={() => openRecentResult(x, i)}><StudentIcon name="preview" size={20} /></button></div>) : empty('No published results.'))}
      </div>
      {late.length > 0 && <div className="sp-notice"><strong>{late.length} past-due assignments</strong><span>Ask your teacher about submission options.</span><button type="button" className="sp-view-action" aria-label="View assignments" title="View assignments" onClick={() => switchPage('Homework')}><StudentIcon name="preview" size={20} /></button></div>}
    </>}
    {page === 'Class Diary' && <>{sectionHeading('Class diary', 'What your teachers taught and assigned each day.')}{(data.diary || []).length ? (data.diary || []).map(x => panel(shortDate(x.entryDate) + ' · ' + x.subjectName, <><strong>{x.topic}</strong>{x.pages && <p>Pages: {x.pages}</p>}{x.homework && <p>Homework: {x.homework}</p>}<small>Teacher: {x.teacherName}</small></>)) : empty('No diary entries published yet.')}</>}
    {page === 'Announcements' && <>{sectionHeading('Announcements', 'Notices published by your school and teachers.')}{(data.announcements || []).length ? (data.announcements || []).map(x => panel(x.title, <><small>{shortDate(x.createdAt)}{x.isPinned ? ' · Pinned' : ''}</small><p className="sp-announcement-body">{x.body}</p></>)) : empty('No announcements yet.')}</>}
    {page === 'Timetable' && <>{sectionHeading('Weekly timetable', `${data.profile.className} ${data.profile.sectionName} - Periods set by your school.`)}<StudentTimetable slots={data.timetable} formatTime={shortTime} /></>}
    {page === 'Homework' && <>{sectionHeading('Homework & assignments', 'Work published by your teachers for this class.')}<div className="sp-filter">{['All','Upcoming','Past due','Submitted'].map(x => <button className={filter === x || (!filter && x === 'All') ? 'active' : ''} onClick={() => setFilter(x === 'All' ? '' : x)} key={x}><StudentIcon name={x === 'Submitted' ? 'check' : x === 'Past due' ? 'calendar' : x === 'Upcoming' ? 'timetable' : 'list'} />{x}</button>)}</div>{filteredHomework.length ? <div className="sp-card-grid">{filteredHomework.map(homeworkCard)}</div> : empty('No assignments in this view.')}</>}
    {page === 'Study Materials' && <>
      {sectionHeading('Study materials', 'Notes, worksheets and links shared by your teachers.')}
      <div className="sp-filter">
        <button className={!filter ? 'active' : ''} onClick={() => setFilter('')}><StudentIcon name="list" />All</button>
        <button className={filter === 'Saved' ? 'active' : ''} onClick={() => setFilter('Saved')}><StudentIcon name="bookmark" />Saved</button>
      </div>
      {data.materials.filter(x => filter !== 'Saved' || bookmarks.includes(x.id)).length ?
        <div className="sp-card-grid sp-material-grid">
          {data.materials.filter(x => filter !== 'Saved' || bookmarks.includes(x.id)).map(x =>
            <article className="sp-record sp-material-card" key={x.id}>
              <div className="sp-record-head">
                <span className="sp-tag">{x.resourceType}</span>
                <button className="sp-material-save" onClick={() => saveBookmarks(bookmarks.includes(x.id) ? bookmarks.filter(id => id !== x.id) : [...bookmarks, x.id])}><StudentIcon name="bookmark" />{bookmarks.includes(x.id) ? 'Saved' : 'Save'}</button>
              </div>
              <div className="sp-material-body">
                <h3>{x.title}</h3>
                <span className="sp-material-subject">{x.subjectName}</span>
                {x.description && <p>{x.description}</p>}
              </div>
              <div className="sp-record-foot">
                {isUploadedStudyMaterial(x.resourceUrl) ?
                  <button className="sp-material-action" type="button" onClick={() => void downloadStudyMaterial(x.id, x.title).catch((failure: Error) => setError(failure.message))}>
                    <StudentIcon name="download" size={18} />
                    Download file
                  </button> : safeLink(x.resourceUrl) ?
                  <a className="sp-material-action" href={x.resourceUrl} target="_blank" rel="noreferrer">
                    <StudentIcon name="external" size={18} />
                    Open link
                  </a> : null}
              </div>
            </article>)}
        </div> : empty('No materials in this view.')}
    </>}
    {page === 'Attendance' && <>{sectionHeading('My attendance', 'Your own attendance history for this enrollment.')}<div className="sp-stats sp-stats-three">{[['Present', present], ['Absent', absent], ['Attendance', attendancePercent == null ? '·' : `${attendancePercent}%`]].map(([label,value]) => <div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>{attendancePercent !== null && attendancePercent < 75 && <div className="sp-notice"><strong>Attendance alert</strong><span>Your attendance is {attendancePercent}%. Please contact your school about its attendance requirement.</span></div>}{panel('Attendance history', data.attendance.length ? data.attendance.map((x,i) => <div className="sp-line" key={i}><strong>{shortDate(x.date)}</strong><span className="sp-tag">{x.status}</span></div>) : empty('No attendance recorded yet.'))}</>}
    {page === 'Exams' && <>{sectionHeading('Exam schedule', 'Published exam information for your current class and session.')}<StudentExamPanel key={selectedExamTab + ':' + selectedExamTarget} data={data} initialTab={selectedExamTab} initialTarget={selectedExamTarget}/></>}
    {page === 'Results' && <>{sectionHeading('Results', 'Only results released by your school are visible.')}<StudentReportCards key={selectedRecentResult || 'results'} results={data.results} gradeHistory={data.gradeHistory} resultSubjects={data.resultSubjects} profile={data.profile} parent={data.parent} initialExamId={selectedRecentResult} /></>}
    {page === 'Events' && <>{sectionHeading('School events', 'Events scheduled for your school or section.')}{panel('Event calendar', (data.schoolEvents || []).length ? data.schoolEvents.map(x => <div className="sp-line" key={x.id}><span className="sp-line-date">{shortDate(x.eventDate)}</span><div><strong>{x.title}</strong><small>{x.description}</small></div></div>) : empty('No school events scheduled.'))}</>}
    {page === 'Achievements' && <>{sectionHeading('Achievements', 'Awards and recognition recorded by your school.')}{(data.achievements || []).length ? <div className="sp-card-grid">{data.achievements.map(x => <article className="sp-record" key={x.id}><span className="sp-tag">{shortDate(x.awardedAt)}</span><h3>{x.title}</h3><p>{x.description}</p></article>)}</div> : empty('No achievements recorded yet.')}</>}
    {page === 'Requests' && <>
      {sectionHeading('My requests', 'Choose who receives your request. Only that selected person can review it.')}
      <div className="sp-request-actions"><button type="button" className="btn btn-primary" onClick={() => setShowRequestForm(open => !open)} aria-expanded={showRequestForm}><StudentIcon name={showRequestForm ? 'close' : 'plus'} />{showRequestForm ? 'Close form' : 'New request'}</button></div>
      {showRequestForm && panel('New request', <form className="sp-action-form" onSubmit={async e => {
        e.preventDefault();
        if (await postAction('requests', { ...requestForm, recipientRoleId: Number(requestForm.recipientRoleId), recipientUserId: Number(requestForm.recipientUserId) })) {
          setRequestForm({ type: 'General', subject: '', details: '', fromDate: '', toDate: '', recipientRoleId: '', recipientUserId: '' });
          setShowRequestForm(false);
        }
      }}>
        <label>Type<select value={requestForm.type} onChange={e => setRequestForm({ ...requestForm, type: e.target.value })}>{['General','Leave','Certificate','ID Card','Helpdesk','Transport','Lost & Found'].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Send to role<select required value={requestForm.recipientRoleId} onChange={e => setRequestForm({ ...requestForm, recipientRoleId: e.target.value, recipientUserId: '' })}><option value="">Choose role</option>{requestRecipients.roles.filter(role => role.id !== 1).map(role => <option key={role.id} value={role.id}>{role.roleName}</option>)}</select></label>
        <label>Send to person<select required disabled={!requestForm.recipientRoleId} value={requestForm.recipientUserId} onChange={e => setRequestForm({ ...requestForm, recipientUserId: e.target.value })}><option value="">Choose staff member</option>{requestRecipients.recipients.filter(person => person.roleId !== 1 && String(person.roleId) === requestForm.recipientRoleId).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        {requestForm.recipientRoleId && !requestRecipients.recipients.some(person => String(person.roleId) === requestForm.recipientRoleId) && <small>No active staff member is available for this role yet.</small>}
        <label>Subject<input required maxLength={200} value={requestForm.subject} onChange={e => setRequestForm({ ...requestForm, subject: e.target.value })}/></label>
        {requestForm.type === 'Leave' && <><label>From<input type="date" required value={requestForm.fromDate} onChange={e => setRequestForm({ ...requestForm, fromDate: e.target.value })}/></label><label>To<input type="date" required value={requestForm.toDate} onChange={e => setRequestForm({ ...requestForm, toDate: e.target.value })}/></label></>}
        <label>Details<textarea required rows={4} maxLength={2000} value={requestForm.details} onChange={e => setRequestForm({ ...requestForm, details: e.target.value })}/></label>
        <div className="sp-request-form-actions"><button className="btn btn-primary" disabled={savingAction || !requestForm.recipientUserId}><StudentIcon name="send" />{savingAction ? 'Submitting...' : 'Submit request'}</button><button type="button" className="btn" onClick={() => setShowRequestForm(false)}><StudentIcon name="close" />Cancel</button></div>
      </form>)}
      {panel('Request history', (data.requests || []).length ? data.requests.map(x => <div className="sp-line" key={x.id}><span className="sp-tag">{x.status}</span><div><strong>{x.type} · {x.subject}</strong><small>{shortDate(x.createdAt)} · {x.details}{x.recipientUserId ? ` · Sent to ${requestRecipients.recipients.find(person => person.id === x.recipientUserId)?.name || 'selected recipient'}` : ''}</small>{x.response && <p>Response: {x.response}</p>}</div></div>) : empty('No requests yet.'))}
    </>}
    {page === 'Messages' && <StudentConversations initialMessages={data.messages || []} initialStaffId={selectedConversation} />}
    {page === 'Teachers' && <>{sectionHeading('My teachers', 'Teachers assigned to subjects in your section.')}{data.teachers.length ? <div className="sp-card-grid">{data.teachers.map((x,i) => <article className="sp-record" key={i}><span className="sp-tag">{x.subjectName}</span><h3>{x.name}</h3></article>)}</div> : empty('No teachers assigned yet.')}</>}
    {page === 'Fees' && <>
      {sectionHeading('Fees & receipts', 'Your assigned fees, payments and remaining balance.')}
      <div className="sp-stats sp-stats-three">
        {[['Total fee', feeTotal], ['Paid', feePaid], ['Pending', feePending]].map(([label, value]) =>
          <div key={String(label)}><small>{label}</small><strong>{money(Number(value))}</strong></div>)}
      </div>
      {panel('Assigned fees', feeBalances.length ? feeBalances.map(fee =>
        <div className="sp-line sp-fee-line" key={fee.id}>
          <div><strong>{fee.feeType}</strong><small>{fee.status}</small></div>
          <div className="sp-fee-amounts"><span>Total {money(fee.amount)}</span><span>Paid {money(fee.paid)}</span><strong>Pending {money(fee.pending)}</strong></div>
        </div>) : empty('No fees assigned.'))}
      {panel('Payment history', data.payments.length ? data.payments.map(x =>
        <div className="sp-line" key={x.id}><div><strong>{money(Number(x.amountPaid) || 0)} · {shortDate(x.payment_Date)}</strong><small>Receipt {x.receipt_Number} · {x.payment_Mode}</small></div><button type="button" className="sp-view-action" aria-label={'View receipt: ' + (x.receipt_Number || x.id)} title="View receipt" onClick={() => setReceipt(x)}><StudentIcon name="receipt" size={20}/></button></div>) : empty('No payments recorded.'))}
    </>}    {page === 'Transport' && <>
      {sectionHeading('My transport', 'Route details, transport bills and recorded payments for your current session.')}
      {data.transport ? <section className="sp-transport-card">
        <div className="sp-transport-card-head"><div><small>YOUR SCHOOL TRANSPORT</small><h2>{data.transport.routeName || 'Assigned route'}</h2><p>{data.profile.studentName} · {data.profile.className} {data.profile.sectionName}</p></div><span className="sp-transport-vehicle">{data.transport.vehicleNumber || 'Vehicle assigned'}</span></div>
        <dl className="sp-transport-facts">
          <div><dt>Pickup</dt><dd>{data.transport.pickupStop || 'Not set'}</dd></div>
          <div><dt>Drop</dt><dd>{data.transport.dropStop || 'Not set'}</dd></div>
          <div><dt>Seat</dt><dd>{data.transport.seatNumber || 'Not set'}</dd></div>
          <div><dt>Assigned rate</dt><dd>{data.transport.monthlyFee == null ? 'Not set' : money(Number(data.transport.monthlyFee))} / {data.transport.feeType || 'Monthly'}</dd></div>
        </dl>
      </section> : empty('No current transport allocation found.')}
      <div className="sp-stats sp-stats-three">
        {[['Total billed', transportTotal], ['Paid', transportPaid], ['Pending', transportPending]].map(([label, value]) =>
          <div key={String(label)}><small>{label}</small><strong>{money(Number(value))}</strong></div>)}
      </div>
      {panel('Transport bills', transportBills.length ? transportBills.map(bill =>
        <div className="sp-line sp-fee-line" key={bill.id}>
          <div><strong>{transportPeriod(Number(bill.feeMonth), Number(bill.feeYear))}</strong><small>Due {shortDate(bill.dueDate)} · {bill.status}</small></div>
          <div className="sp-fee-amounts"><span>Total {money(Number(bill.amount) || 0)}</span><span>Paid {money(Number(bill.paidAmount) || 0)}</span><strong>Pending {money(Math.max(0, (Number(bill.amount) || 0) - (Number(bill.paidAmount) || 0)))}</strong></div>
        </div>) : empty('No transport bills have been created for this session.'))}
      {panel('Payment history', transportTransactions.length ? transportTransactions.map(payment =>
        <div className="sp-line sp-transport-payment" key={payment.id}>
          <div><strong>{money(Number(payment.amount) || 0)}</strong><small>{shortDate(payment.paymentDate)} · {payment.paymentMode || 'Payment'}</small><small>Receipt {payment.receiptNumber || '—'}{payment.referenceNumber ? ' · Ref ' + payment.referenceNumber : ''}</small></div>
          <span className="sp-tag">{transportBills.find(bill => bill.id === payment.transportFeeId) ? transportPeriod(Number(transportBills.find(bill => bill.id === payment.transportFeeId)?.feeMonth), Number(transportBills.find(bill => bill.id === payment.transportFeeId)?.feeYear)) : 'Transport'}</span><button type="button" className="sp-view-action" aria-label={'View receipt: ' + (payment.receiptNumber || payment.id)} title="View receipt" onClick={() => setTransportReceipt(payment)}><StudentIcon name="receipt" size={20}/></button>
        </div>) : empty('No transport payments recorded yet.'))}
    </>}
    {page === 'Documents' && <>
      {sectionHeading('My documents', 'Documents uploaded to your student record.')}
      {panel('Documents', data.documents.length ? data.documents.map(document =>
        <div className="sp-line sp-document-line" key={document.id}>
          <div><strong>{document.documentName || document.fileName}</strong><small>{shortDate(document.createdDate)}</small></div>
          {documentUrl(document.fileUrl)
            ? <a className="sp-document-view" aria-label={'View document: ' + (document.documentName || document.fileName)} title="View document" href={documentUrl(document.fileUrl)!} target="_blank" rel="noopener noreferrer"><StudentIcon name="preview" size={20} /></a>
            : <span className="sp-document-unavailable">File unavailable</span>}
        </div>) : empty('No documents uploaded yet.'))}
    </>}
    {page === 'My Profile' && <>{sectionHeading('My profile', 'Information recorded by your school.')}{panel('Student details', <dl className="sp-details">{[['Name',data.profile.studentName],['Email',data.profile.email],['School',data.profile.schoolName],['Class',`${data.profile.className} ${data.profile.sectionName}`],['Roll number',data.profile.rollNumber]].map(([label,value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value || '·'}</dd></React.Fragment>)}</dl>)}{panel('Parent or guardian', data.parent ? <dl className="sp-details">{[['Name',data.parent.name],['Relationship',data.parent.relationship],['Email',data.parent.email],['Phone',data.parent.phoneNumber]].map(([label,value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value || '·'}</dd></React.Fragment>)}</dl> : empty('No parent details available.'))}<StudentChangePassword /></>}
    {selectedHomework && <StudentAssignment assignment={selectedHomework} submission={(data.submissions || []).find(x => x.assignmentId === selectedHomework.id)} onComplete={load} onClose={() => setSelectedHomework(null)} />}
    {transportReceipt && <StudentPaymentReceipt
      kind="transport"
      payment={transportReceipt}
      profile={data.profile}
      description={selectedTransportBill ? `Transport fee · ${transportPeriod(Number(selectedTransportBill.feeMonth), Number(selectedTransportBill.feeYear))}` : 'Transport fee'}
      details={[
        { label: 'Route', value: data.transport?.routeName },
        { label: 'Vehicle', value: data.transport?.vehicleNumber },
      ]}
      onClose={() => setTransportReceipt(null)}
    />}
    {receipt && <StudentPaymentReceipt
      kind="fee"
      payment={receipt}
      profile={data.profile}
      description={data.fees.find(x => Number(x.id) === Number(receipt.studentFeeId))?.feeType || 'School fee'}
      onClose={() => setReceipt(null)}
    />}    </main>
    <nav className="sp-bottom" aria-label="Quick navigation">{(['Today','Timetable','Homework','Documents'] as Page[]).map(item => <button className={page === item ? 'active' : ''} key={item} onClick={() => switchPage(item)}><StudentIcon name={pageIcons[item]} size={20} />{item}</button>)}</nav>
  </div>;
}
