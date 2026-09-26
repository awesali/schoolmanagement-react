import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import StudentAssignment from './StudentAssignment';
import StudentExamPanel from './StudentExamPanel';
import StudentReportCards from './StudentReportCards';
import StudentTimetable from './StudentTimetable';
import { downloadStudyMaterial, isUploadedStudyMaterial } from './studyMaterialFiles';
import './StudentPortal.css';

type Row = Record<string, any>;
type Overview = {
  profile: Row; subjects: Row[]; timetable: Row[]; homework: Row[]; materials: Row[];
  attendance: Row[]; exams: Row[]; results: Row[]; resultSubjects?: Row[]; parent?: Row; teachers: Row[];
  documents: Row[]; fees: Row[]; payments: Row[]; transport?: Row; diary: Row[]; submissions: Row[]; announcements: Row[]; libraryBooks: Row[]; borrowedBooks: Row[]; requests: Row[]; messages: Row[]; achievements: Row[]; schoolEvents: Row[]; gradeHistory: Row[]; examResources?: Row[]; hallTickets?: Row[];
};
type Page = 'Today' | 'My Classes' | 'Timetable' | 'Class Diary' | 'Homework' | 'Study Materials' | 'Announcements' | 'Notifications' | 'Attendance' | 'Exams' | 'Results' | 'My Grades' | 'Progress' | 'Calendar' | 'Events' | 'Library' | 'Teachers' | 'Messages' | 'Requests' | 'Achievements' | 'Fees' | 'Transport' | 'Documents' | 'Planner' | 'Goals' | 'Settings' | 'My Profile';
const pages: Page[] = ['Today', 'My Classes', 'Timetable', 'Homework', 'Study Materials', 'Attendance', 'Exams', 'Results', 'Calendar', 'Teachers', 'Fees', 'Transport', 'Documents', 'Planner', 'My Profile'];
const groups: { title: string; items: Page[] }[] = [
  { title: 'Daily', items: ['Today', 'My Classes', 'Timetable', 'Class Diary', 'Homework', 'Study Materials'] },
  { title: 'Progress', items: ['Attendance', 'Exams', 'Results', 'My Grades', 'Progress', 'Calendar', 'Events'] },
  { title: 'School', items: ['Announcements', 'Notifications', 'Library', 'Teachers', 'Messages', 'Requests', 'Achievements', 'Fees', 'Transport', 'Documents'] },
  { title: 'Personal', items: ['Planner', 'Goals', 'Settings', 'My Profile'] },
];
const dateOnly = (value: string) => String(value || '').slice(0, 10);
const shortDate = (value: string) => value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '·';
const shortTime = (value?: string) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!match) return '�';
  const hours = Number(match[1]);
  if (hours > 23 || Number(match[2]) > 59) return '�';
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`;
};
const safeLink = (value: string) => { try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; } };
const readJson = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; } };
const todayKey = () => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-'); };

export default function StudentPortal() {
  const navigate = useNavigate();
  const [data, setData] = useState<Overview | null>(null);
  const [page, setPage] = useState<Page>('Today');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState('');
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [tasks, setTasks] = useState<{ id: number; title: string; done: boolean }[]>([]);
  const [newTask, setNewTask] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('student-theme') === 'dark');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Row | null>(null);
  const [requestForm, setRequestForm] = useState({ type: 'General', subject: '', details: '', fromDate: '', toDate: '' });
  const [messageForm, setMessageForm] = useState({ staffId: '', body: '' });
  const [savingAction, setSavingAction] = useState(false);
  const [goals, setGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, boolean>>({ Homework: true, Exams: true, Announcements: true });
  const [receipt, setReceipt] = useState<Row | null>(null);
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
      localStorage.setItem('student-offline:' + body.data.profile.email, JSON.stringify({ profile: body.data.profile, subjects: body.data.subjects, timetable: body.data.timetable, homework: body.data.homework, materials: body.data.materials, diary: body.data.diary, attendance: [], exams: [], results: [], teachers: [], documents: [], fees: [], payments: [], submissions: [], announcements: [], libraryBooks: [], borrowedBooks: [], requests: [], messages: [], achievements: [], schoolEvents: [], gradeHistory: [] }));
    } catch (failure) {
      const email = localStorage.getItem('studentPortalEmail');
      const snapshot = email ? readJson<Overview | null>('student-offline:' + email, null) : null;
      if (!navigator.onLine && snapshot) { setData(snapshot); setOffline(true); setError('Offline: showing saved timetable, diary, homework and materials.'); }
      else setError(failure instanceof Error ? failure.message : 'Could not load your school data.');
    } finally { setLoading(false); }
  }, [navigate]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    const key = data.profile.email;
    setBookmarks(readJson<number[]>(`student-bookmarks:${key}`, []));
    setTasks(readJson<{ id: number; title: string; done: boolean }[]>(`student-tasks:${key}`, []));
  }, [data]);
  const saveBookmarks = (next: number[]) => { if (!data) return; setBookmarks(next); localStorage.setItem(`student-bookmarks:${data.profile.email}`, JSON.stringify(next)); };
  const saveTasks = (next: typeof tasks) => { if (!data) return; setTasks(next); localStorage.setItem(`student-tasks:${data.profile.email}`, JSON.stringify(next)); };
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
  const saveGoals = (next: string[]) => { setGoals(next); localStorage.setItem('student-goals:' + data?.profile.email, JSON.stringify(next)); };
  const savePrefs = (next: Record<string, boolean>) => { setNotificationPrefs(next); localStorage.setItem('student-notifications:' + data?.profile.email, JSON.stringify(next)); };
  const logout = () => { const email = localStorage.getItem('studentPortalEmail'); if (email) localStorage.removeItem('student-offline:' + email); localStorage.removeItem('studentPortalEmail'); localStorage.removeItem('token'); localStorage.removeItem('schoolId'); navigate('/login', { replace: true }); };
  const switchPage = (next: Page) => { setPage(next); setFilter(''); setMobileMenu(false); window.scrollTo(0, 0); };
  const toggleTheme = () => { const next = !dark; setDark(next); localStorage.setItem('student-theme', next ? 'dark' : 'light'); };
  const panel = (title: string, children: React.ReactNode, action?: React.ReactNode) => <section className="sp-panel"><div className="sp-panel-title"><h2>{title}</h2>{action}</div>{children}</section>;
  const empty = (message: string) => <div className="sp-empty">{message}</div>;
  const link = (url: string, label = 'Open resource ?') => safeLink(url) ? <a href={url} target="_blank" rel="noreferrer">{label}</a> : null;
  if (loading && !data) return <PageLoader label="Loading your school day·" />;
  if (error && !data) return <div className="sp-retry"><div className="sp-retry-card"><h1>Could not open your student portal</h1><p>{error}</p><div><button className="btn btn-primary" onClick={() => void load()}>Try again</button><button className="btn" onClick={logout}>Back to login</button></div></div></div>;
  if (!data) return null;

  const now = new Date();
  const currentDate = todayKey();
  const todayClasses = data.timetable.filter(x => Number(x.dayOfWeek) === now.getDay()).sort((a, b) => Number(a.periodNumber) - Number(b.periodNumber));
  const due = data.homework.filter(x => dateOnly(x.dueDate) >= currentDate && !(data.submissions || []).some(y => y.assignmentId === x.id && y.status !== 'Resubmission Required'));
  const late = data.homework.filter(x => dateOnly(x.dueDate) < currentDate && !(data.submissions || []).some(y => y.assignmentId === x.id));
  const upcomingExams = data.exams.filter(x => dateOnly(x.examDate) >= currentDate);
  const clockTime = now.toTimeString().slice(0, 8);
  const currentClass = todayClasses.find(x => String(x.startTime) <= clockTime && String(x.endTime) > clockTime);
  const nextClass = todayClasses.find(x => String(x.startTime) > clockTime);
  const present = data.attendance.filter(x => String(x.status).toLowerCase() === 'present').length;
  const absent = data.attendance.filter(x => String(x.status).toLowerCase() === 'absent').length;
  const attendancePercent = data.attendance.length ? Math.round(100 * present / data.attendance.length) : null;
  const events = [
    ...data.homework.map(x => ({ id: `h-${x.id}`, date: x.dueDate, title: x.title, type: 'Homework', detail: x.subjectName })),
    ...data.exams.map(x => ({ id: `e-${x.id}`, date: x.examDate, title: x.examName, type: 'Exam', detail: x.subjectName })),
    ...(data.schoolEvents || []).map(x => ({ id: 's-' + x.id, date: x.eventDate, title: x.title, type: 'School event', detail: x.description || '' })),
  ].filter(x => dateOnly(x.date).startsWith(month)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
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
  const homeworkCard = (x: Row) => <article className="sp-record" key={x.id}><div className="sp-record-head"><span className="sp-tag">{x.subjectName}</span><span>{shortDate(x.dueDate)}</span></div><h3>{x.title}</h3><p>{x.description}</p><div className="sp-record-foot"><span>Due {shortDate(x.dueDate)}</span>{x.totalMarks != null && <span>{x.totalMarks} marks</span>}{link(x.resourceUrl || '')}<button onClick={() => setSelectedHomework(x)}>{(data.submissions || []).find(y => y.assignmentId === x.id)?.status || "Open assignment"} ?</button></div></article>;
  const notificationAnnouncements = notificationPrefs.Announcements === false ? [] : (data.announcements || []);
  const notificationHomework = notificationPrefs.Homework === false ? [] : due;
  const notificationExams = notificationPrefs.Exams === false ? [] : upcomingExams;
  const nav = <nav aria-label="Student navigation">{groups.map(group => <div className="sp-nav-group" key={group.title}><small>{group.title}</small>{group.items.map(item => <button type="button" className={page === item ? 'active' : ''} onClick={() => switchPage(item)} key={item}>{item}</button>)}</div>)}</nav>;
  const sectionHeading = (title: string, detail: string) => <div className="sp-section-intro"><h2>{title}</h2><p>{detail}</p></div>;

  return <div className={`sp-layout${dark ? ' sp-dark' : ''}`}>
    <aside className={`sp-side${mobileMenu ? ' sp-side-open' : ''}`}><div className="sp-brand"><div className="sp-brand-mark">S</div><div><strong>{data.profile.schoolName || 'School'}</strong><small>Student portal</small></div></div>{nav}<div className="sp-side-actions"><button type="button" onClick={toggleTheme}>{dark ? 'Light mode' : 'Dark mode'}</button><button type="button" onClick={logout}>Sign out</button></div></aside>
    <main className="sp-main"><header className="sp-header"><div><button className="sp-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open navigation">?</button><small>STUDENT SPACE</small><h1>{page === 'Today' ? `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${String(data.profile.studentName || 'Student').split(' ')[0]}` : page}</h1><p>{data.profile.className} {data.profile.sectionName} · Roll {data.profile.rollNumber || '·'}</p></div><div className="sp-header-actions"><time>{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</time><button className="btn" onClick={() => void load()} disabled={loading}>{loading ? 'Refreshing·' : 'Refresh'}</button></div></header>
    {error && <div className="sp-error" role="alert">{error}<button onClick={() => void load()}>Retry</button></div>}
    {page === 'Today' && <>
      {(currentClass || nextClass) && <div className="sp-now"><div><small>{currentClass ? 'NOW' : 'NEXT'}</small><strong>{(currentClass || nextClass)?.subjectName}</strong><span>{shortTime((currentClass || nextClass)?.startTime)}·{shortTime((currentClass || nextClass)?.endTime)}</span></div>{currentClass && nextClass && <div><small>NEXT</small><strong>{nextClass.subjectName}</strong><span>{shortTime(nextClass.startTime)}</span></div>}</div>}
      <div className="sp-stats">{[['Classes today', todayClasses.filter(x => !x.isBreak).length], ['Homework upcoming', due.length], ['Attendance', attendancePercent == null ? '·' : `${attendancePercent}%`], ['Upcoming exams', upcomingExams.length], ['New announcements', (data.announcements || []).filter(x => dateOnly(x.createdAt) === currentDate).length], ['Pending assignments', due.length + late.length]].map(([label, value]) => <div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <div className="sp-grid">
        {panel("Today's classes", todayClasses.length ? todayClasses.map(x => <div className="sp-line" key={x.periodNumber}><span className="sp-line-date">{shortTime(x.startTime)}<br/>{shortTime(x.endTime)}</span><div><strong>{x.subjectName}</strong><small>Period {x.periodNumber}</small></div></div>) : empty('No classes scheduled today.'), <button className="sp-text-button" onClick={() => switchPage('Timetable')}>Full timetable</button>)}
        {panel('Things to do', due.length ? due.slice(0, 4).map(x => <div className="sp-line" key={x.id}><span className="sp-dot"/><div><strong>{x.title}</strong><small>{x.subjectName} · Due {shortDate(x.dueDate)}</small></div></div>) : empty('No upcoming homework.'), <button className="sp-text-button" onClick={() => switchPage('Homework')}>View homework</button>)}
        {panel('Upcoming', upcomingExams.length ? upcomingExams.slice(0, 4).map(x => <div className="sp-line" key={x.id}><span className="sp-line-date">{shortDate(x.examDate)}</span><div><strong>{x.subjectName}</strong><small>{x.examName} · {shortTime(x.startTime)}</small></div></div>) : empty('No upcoming exams.'))}
        {panel('Recent results', data.results.length ? data.results.slice(0, 4).map((x, i) => <div className="sp-line" key={i}><div><strong>{x.examName}</strong><small>{x.grade || x.resultStatus}</small></div><b>{x.obtainedMarks} / {x.totalMarks}</b></div>) : empty('No published results.'))}
      </div>
      {late.length > 0 && <div className="sp-notice"><strong>{late.length} past-due assignments</strong><span>Ask your teacher about submission options.</span><button onClick={() => switchPage('Homework')}>View assignments</button></div>}
    </>}
    {page === 'Class Diary' && <>{sectionHeading('Class diary', 'What your teachers taught and assigned each day.')}{(data.diary || []).length ? (data.diary || []).map(x => panel(shortDate(x.entryDate) + ' · ' + x.subjectName, <><strong>{x.topic}</strong>{x.pages && <p>Pages: {x.pages}</p>}{x.homework && <p>Homework: {x.homework}</p>}<small>Teacher: {x.teacherName}</small></>)) : empty('No diary entries published yet.')}</>}
    {page === 'Announcements' && <>{sectionHeading('Announcements', 'Notices published by your school and teachers.')}{(data.announcements || []).length ? (data.announcements || []).map(x => panel(x.title, <><small>{shortDate(x.createdAt)}{x.isPinned ? ' · Pinned' : ''}</small><p className="sp-announcement-body">{x.body}</p></>)) : empty('No announcements yet.')}</>}
    {page === 'Notifications' && <>{sectionHeading('Notifications', 'New school notices, upcoming work and exams.')}{panel('Recent updates', <>{notificationAnnouncements.slice(0, 10).map(x => <div className="sp-line" key={'a-'+x.id}><span className="sp-tag">Notice</span><div><strong>{x.title}</strong><small>{shortDate(x.createdAt)}</small></div></div>)}{notificationHomework.slice(0, 10).map(x => <div className="sp-line" key={'h-'+x.id}><span className="sp-tag">Homework</span><div><strong>{x.title}</strong><small>Due {shortDate(x.dueDate)}</small></div></div>)}{notificationExams.slice(0, 10).map(x => <div className="sp-line" key={'e-'+x.id}><span className="sp-tag">Exam</span><div><strong>{x.examName} · {x.subjectName}</strong><small>{shortDate(x.examDate)}</small></div></div>)}{!notificationAnnouncements.length && !notificationHomework.length && !notificationExams.length && empty('Nothing new right now.')}</>)}</>}
    {page === 'My Classes' && <>{sectionHeading('My classes', 'Subjects assigned to your current section.')}{data.subjects.length ? <div className="sp-card-grid">{data.subjects.map(x => <article className="sp-record" key={x.id}><span className="sp-tag">SUBJECT</span><h3>{x.subjectName}</h3><p>Teacher: {data.teachers.find(t => t.subjectName === x.subjectName)?.name || 'Not assigned'}</p><div className="sp-record-foot"><button onClick={() => switchPage('Homework')}>Homework ?</button><button onClick={() => switchPage('Study Materials')}>Materials ?</button></div></article>)}</div> : empty('No subjects assigned yet.')}</>}
    {page === 'Timetable' && <>{sectionHeading('Weekly timetable', `${data.profile.className} ${data.profile.sectionName} � Periods set by your school.`)}<StudentTimetable slots={data.timetable} formatTime={shortTime} /></>}
    {page === 'Homework' && <>{sectionHeading('Homework & assignments', 'Work published by your teachers for this class.')}<div className="sp-filter">{['All','Upcoming','Past due','Submitted'].map(x => <button className={filter === x || (!filter && x === 'All') ? 'active' : ''} onClick={() => setFilter(x === 'All' ? '' : x)} key={x}>{x}</button>)}</div>{filteredHomework.length ? <div className="sp-card-grid">{filteredHomework.map(homeworkCard)}</div> : empty('No assignments in this view.')}</>}
    {page === 'Study Materials' && <>
      {sectionHeading('Study materials', 'Notes, worksheets and links shared by your teachers.')}
      <div className="sp-filter">
        <button className={!filter ? 'active' : ''} onClick={() => setFilter('')}>All</button>
        <button className={filter === 'Saved' ? 'active' : ''} onClick={() => setFilter('Saved')}>Saved</button>
      </div>
      {data.materials.filter(x => filter !== 'Saved' || bookmarks.includes(x.id)).length ?
        <div className="sp-card-grid sp-material-grid">
          {data.materials.filter(x => filter !== 'Saved' || bookmarks.includes(x.id)).map(x =>
            <article className="sp-record sp-material-card" key={x.id}>
              <div className="sp-record-head">
                <span className="sp-tag">{x.resourceType}</span>
                <button className="sp-material-save" onClick={() => saveBookmarks(bookmarks.includes(x.id) ? bookmarks.filter(id => id !== x.id) : [...bookmarks, x.id])}>{bookmarks.includes(x.id) ? 'Saved' : 'Save'}</button>
              </div>
              <div className="sp-material-body">
                <h3>{x.title}</h3>
                <span className="sp-material-subject">{x.subjectName}</span>
                {x.description && <p>{x.description}</p>}
              </div>
              <div className="sp-record-foot">
                {isUploadedStudyMaterial(x.resourceUrl) ?
                  <button className="sp-material-action" type="button" onClick={() => void downloadStudyMaterial(x.id, x.title).catch((failure: Error) => setError(failure.message))}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" /></svg>
                    Download file
                  </button> : safeLink(x.resourceUrl) ?
                  <a className="sp-material-action" href={x.resourceUrl} target="_blank" rel="noreferrer">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5m0-5-9 9" /><path d="M19 13v6H5V5h6" /></svg>
                    Open link
                  </a> : null}
              </div>
            </article>)}
        </div> : empty('No materials in this view.')}
    </>}
    {page === 'Attendance' && <>{sectionHeading('My attendance', 'Your own attendance history for this enrollment.')}<div className="sp-stats sp-stats-three">{[['Present', present], ['Absent', absent], ['Attendance', attendancePercent == null ? '·' : `${attendancePercent}%`]].map(([label,value]) => <div key={String(label)}><small>{label}</small><strong>{value}</strong></div>)}</div>{attendancePercent !== null && attendancePercent < 75 && <div className="sp-notice"><strong>Attendance alert</strong><span>Your attendance is {attendancePercent}%. Please contact your school about its attendance requirement.</span></div>}{panel('Attendance history', data.attendance.length ? data.attendance.map((x,i) => <div className="sp-line" key={i}><strong>{shortDate(x.date)}</strong><span className="sp-tag">{x.status}</span></div>) : empty('No attendance recorded yet.'))}</>}
    {page === 'Exams' && <>{sectionHeading('Exam schedule', 'Only published exams for your current session are shown.')}{panel('Upcoming exams', upcomingExams.length ? upcomingExams.map(x => <div className="sp-line" key={x.id}><span className="sp-line-date">{shortDate(x.examDate)}</span><div><strong>{x.subjectName}</strong><small>{x.examName} · {shortTime(x.startTime)}·{shortTime(x.endTime)}</small></div></div>) : empty('No upcoming exams.'))}</>}
    {page === 'Exams' && <StudentExamPanel data={data}/>}
    {page === 'Results' && <>{sectionHeading('Results', 'Only results released by your school are visible.')}<StudentReportCards results={data.results} gradeHistory={data.gradeHistory} resultSubjects={data.resultSubjects} profile={data.profile} parent={data.parent} /></>}
    {page === 'My Grades' && <>{sectionHeading('My grades', 'Subject marks released by your school.')}{panel('Marks history', data.gradeHistory.length ? data.gradeHistory.map((x,i) => <div className="sp-line" key={i}><div><strong>{x.subjectName}</strong><small>{x.examName} · {shortDate(x.enteredDate)}{x.remarks ? ' · ' + x.remarks : ''}</small></div><b>{x.obtainedMarks}{x.maxMarks != null ? ' / ' + x.maxMarks : ''}</b></div>) : empty('No subject marks published yet.'))}</>}
    {page === 'Progress' && <>{sectionHeading('My progress', 'A summary of published results and completed work.')}{panel('Academic snapshot', <div className="sp-stats sp-stats-three"><div><small>Published exams</small><strong>{data.results.length}</strong></div><div><small>Assignments submitted</small><strong>{data.submissions.length}</strong></div><div><small>Attendance</small><strong>{attendancePercent == null ? '·' : attendancePercent + '%'}</strong></div></div>)}{panel('Subject performance', data.gradeHistory.length ? Array.from(new Set(data.gradeHistory.map(x => x.subjectName))).map(name => { const marks = data.gradeHistory.filter(x => x.subjectName === name && Number(x.maxMarks) > 0); const percentage = marks.length ? Math.round(100 * marks.reduce((sum,x) => sum + Number(x.obtainedMarks),0) / marks.reduce((sum,x) => sum + Number(x.maxMarks),0)) : null; return <div className="sp-line" key={name}><strong>{name}</strong><b>{percentage == null ? 'Marks recorded' : percentage + '%'}</b></div>; }) : empty('No marks published yet.'))}</>}
    {page === 'Calendar' && <>{sectionHeading('Academic calendar', 'Published exam dates and homework deadlines.')}<label className="sp-month">Month <input type="month" value={month} onChange={e => setMonth(e.target.value)}/></label>{panel('Scheduled items', events.length ? events.map(x => <div className="sp-line" key={x.id}><span className="sp-line-date">{shortDate(x.date)}</span><div><strong>{x.title}</strong><small>{x.type} · {x.detail}</small></div></div>) : empty('Nothing scheduled this month.'))}</>}
    {page === 'Library' && <>{sectionHeading('Library', 'Books listed for your class and your borrowing history.')}{panel('Search books', <><input className="sp-search" type="search" placeholder="Search by title, publisher or ISBN" value={filter} onChange={e => setFilter(e.target.value)}/>{data.libraryBooks.filter(x => [x.bookName,x.publisher,x.isbn].some(value => String(value || '').toLowerCase().includes(filter.toLowerCase()))).length ? data.libraryBooks.filter(x => [x.bookName,x.publisher,x.isbn].some(value => String(value || '').toLowerCase().includes(filter.toLowerCase()))).map(x => <div className="sp-line" key={x.id}><div><strong>{x.bookName}</strong><small>{x.publisher || 'Publisher not listed'}{x.isbn ? ' · ISBN ' + x.isbn : ''}</small></div></div>) : empty('No matching books.')}</>)}{panel('Borrowed books', data.borrowedBooks.length ? data.borrowedBooks.map((x,i) => <div className="sp-line" key={i}><div><strong>{x.title}</strong><small>Borrowed {shortDate(x.borrowDateTime)} · {x.orderNumber}</small></div><span className="sp-tag">{x.returnDateTime ? 'Returned' : x.status}</span></div>) : empty('No borrowed books recorded.'))}</>}
    {page === 'Events' && <>{sectionHeading('School events', 'Events scheduled for your school or section.')}{panel('Event calendar', (data.schoolEvents || []).length ? data.schoolEvents.map(x => <div className="sp-line" key={x.id}><span className="sp-line-date">{shortDate(x.eventDate)}</span><div><strong>{x.title}</strong><small>{x.description}</small></div></div>) : empty('No school events scheduled.'))}</>}
    {page === 'Achievements' && <>{sectionHeading('Achievements', 'Awards and recognition recorded by your school.')}{(data.achievements || []).length ? <div className="sp-card-grid">{data.achievements.map(x => <article className="sp-record" key={x.id}><span className="sp-tag">{shortDate(x.awardedAt)}</span><h3>{x.title}</h3><p>{x.description}</p></article>)}</div> : empty('No achievements recorded yet.')}</>}
    {page === 'Requests' && <>{sectionHeading('My requests', 'Apply for leave, certificates, ID cards or help from school.')}{panel('New request', <form className="sp-action-form" onSubmit={async e => { e.preventDefault(); if (await postAction('requests', requestForm)) setRequestForm({ type: 'General', subject: '', details: '', fromDate: '', toDate: '' }); }}><label>Type<select value={requestForm.type} onChange={e => setRequestForm({ ...requestForm, type: e.target.value })}>{['General','Leave','Certificate','ID Card','Helpdesk','Transport','Lost & Found'].map(x => <option key={x}>{x}</option>)}</select></label><label>Subject<input required maxLength={200} value={requestForm.subject} onChange={e => setRequestForm({ ...requestForm, subject: e.target.value })}/></label>{requestForm.type === 'Leave' && <><label>From<input type="date" required value={requestForm.fromDate} onChange={e => setRequestForm({ ...requestForm, fromDate: e.target.value })}/></label><label>To<input type="date" required value={requestForm.toDate} onChange={e => setRequestForm({ ...requestForm, toDate: e.target.value })}/></label></>}<label>Details<textarea required rows={4} maxLength={2000} value={requestForm.details} onChange={e => setRequestForm({ ...requestForm, details: e.target.value })}/></label><button className="btn btn-primary" disabled={savingAction}>{savingAction ? 'Submitting·' : 'Submit request'}</button></form>)}{panel('Request history', (data.requests || []).length ? data.requests.map(x => <div className="sp-line" key={x.id}><span className="sp-tag">{x.status}</span><div><strong>{x.type} · {x.subject}</strong><small>{shortDate(x.createdAt)} · {x.details}</small>{x.response && <p>School response: {x.response}</p>}</div></div>) : empty('No requests yet.'))}</>}
    {page === 'Messages' && <>{sectionHeading('Messages', 'Ask a teacher assigned to your class.')}{panel('Send message', <form className="sp-action-form" onSubmit={async e => { e.preventDefault(); if (await postAction('messages', { staffId: Number(messageForm.staffId), body: messageForm.body })) setMessageForm({ ...messageForm, body: '' }); }}><label>Teacher<select required value={messageForm.staffId} onChange={e => setMessageForm({ ...messageForm, staffId: e.target.value })}><option value="">Choose teacher</option>{data.teachers.filter((x,i,all) => all.findIndex(t => t.id === x.id) === i).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Message<textarea required rows={4} maxLength={2000} value={messageForm.body} onChange={e => setMessageForm({ ...messageForm, body: e.target.value })}/></label><button className="btn btn-primary" disabled={savingAction}>{savingAction ? 'Sending·' : 'Send message'}</button></form>)}{panel('Conversation history', (data.messages || []).length ? data.messages.map(x => <div className="sp-line" key={x.id}><span className="sp-tag">{x.fromStudent ? 'You' : x.teacherName}</span><div><strong>{x.teacherName}</strong><p>{x.body}</p><small>{shortDate(x.sentAt)}</small></div></div>) : empty('No messages yet.'))}</>}
    {page === 'Teachers' && <>{sectionHeading('My teachers', 'Teachers assigned to subjects in your section.')}{data.teachers.length ? <div className="sp-card-grid">{data.teachers.map((x,i) => <article className="sp-record" key={i}><span className="sp-tag">{x.subjectName}</span><h3>{x.name}</h3></article>)}</div> : empty('No teachers assigned yet.')}</>}
    {page === 'Fees' && <>{sectionHeading('Fees & receipts', 'Your own fee assignments and recorded payments.')}{panel('Assigned fees', data.fees.length ? data.fees.map(x => <div className="sp-line" key={x.id}><div><strong>{x.feeType}</strong><small>{x.status}</small></div><b>₹{x.amount}</b></div>) : empty('No fees assigned.'))}{panel('Payment history', data.payments.length ? data.payments.map(x => <div className="sp-line" key={x.id}><div><strong>₹{x.amountPaid} · {shortDate(x.payment_Date)}</strong><small>Receipt {x.receipt_Number} · {x.payment_Mode}</small></div><button className="sp-text-button" onClick={() => setReceipt(x)}>View receipt</button></div>) : empty('No payments recorded.'))}</>}
    {page === 'Transport' && <>{sectionHeading('My transport', 'Your current school transport allocation.')}{panel('Route information', data.transport ? <dl className="sp-details">{[['Route',data.transport.routeName],['Vehicle',data.transport.vehicleNumber],['Pickup',data.transport.pickupStop],['Drop',data.transport.dropStop],['Seat',data.transport.seatNumber],['Pickup shift',data.transport.pickupShift],['Drop shift',data.transport.dropShift]].map(([label,value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value || '·'}</dd></React.Fragment>)}</dl> : empty('No transport allocation found.'))}</>}
    {page === 'Documents' && <>{sectionHeading('My documents', 'Documents uploaded to your student record.')}{panel('Documents', data.documents.length ? data.documents.map(x => <div className="sp-line" key={x.id}><div><strong>{x.documentName || x.fileName}</strong><small>{shortDate(x.createdDate)}</small></div>{link(x.fileUrl, 'View document')}</div>) : empty('No documents uploaded yet.'))}</>}
    {page === 'Planner' && <>{sectionHeading('My planner', 'Personal tasks saved on this device.')}{panel('Daily checklist', <><form className="sp-task-form" onSubmit={e => { e.preventDefault(); const title = newTask.trim(); if (!title) return; saveTasks([...tasks, { id: Date.now(), title, done: false }]); setNewTask(''); }}><input aria-label="New task" maxLength={120} value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a personal study task"/><button className="btn btn-primary">Add task</button></form>{tasks.length ? tasks.map(x => <div className="sp-line" key={x.id}><label className="sp-task"><input type="checkbox" checked={x.done} onChange={() => saveTasks(tasks.map(t => t.id === x.id ? { ...t, done: !t.done } : t))}/><span className={x.done ? 'done' : ''}>{x.title}</span></label><button className="sp-text-button" onClick={() => saveTasks(tasks.filter(t => t.id !== x.id))}>Remove</button></div>) : empty('Add your first study task.')}</>)}</>}
    {page === 'Goals' && <>{sectionHeading('My goals', 'Personal study goals saved on this device.')}{panel('Study goals', <><form className="sp-task-form" onSubmit={e => { e.preventDefault(); const goal = newGoal.trim(); if (!goal) return; saveGoals([...goals, goal]); setNewGoal(''); }}><input maxLength={160} value={newGoal} onChange={e => setNewGoal(e.target.value)} placeholder="Set a study goal"/><button className="btn btn-primary">Add goal</button></form>{goals.length ? goals.map((goal,i) => <div className="sp-line" key={i}><strong>{goal}</strong><button className="sp-text-button" onClick={() => saveGoals(goals.filter((_,index) => index !== i))}>Remove</button></div>) : empty('No goals added yet.')}</>)}{panel('Exam countdown', upcomingExams.length ? upcomingExams.slice(0,5).map(x => <div className="sp-line" key={x.id}><div><strong>{x.examName} · {x.subjectName}</strong><small>{shortDate(x.examDate)}</small></div><b>{Math.max(0,Math.ceil((new Date(x.examDate).getTime()-Date.now())/86400000))} days</b></div>) : empty('No upcoming exams.'))}</>}
    {page === 'Settings' && <>{sectionHeading('Settings', 'Your display and notification preferences on this device.')}{panel('Appearance', <button className="btn" onClick={toggleTheme}>Use {dark ? 'light' : 'dark'} mode</button>)}{panel('Notifications', <div className="sp-preferences">{['Homework','Exams','Announcements'].map(name => <label key={name}><span>{name}</span><input type="checkbox" checked={notificationPrefs[name] !== false} onChange={e => savePrefs({ ...notificationPrefs, [name]: e.target.checked })}/></label>)}<small>Critical school notices remain visible in Announcements.</small></div>)}</>}
    {page === 'My Profile' && <>{sectionHeading('My profile', 'Information recorded by your school.')}{panel('Student details', <dl className="sp-details">{[['Name',data.profile.studentName],['Email',data.profile.email],['School',data.profile.schoolName],['Class',`${data.profile.className} ${data.profile.sectionName}`],['Roll number',data.profile.rollNumber]].map(([label,value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value || '·'}</dd></React.Fragment>)}</dl>)}{panel('Parent or guardian', data.parent ? <dl className="sp-details">{[['Name',data.parent.name],['Relationship',data.parent.relationship],['Email',data.parent.email],['Phone',data.parent.phoneNumber]].map(([label,value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value || '·'}</dd></React.Fragment>)}</dl> : empty('No parent details available.'))}</>}
    {selectedHomework && <StudentAssignment assignment={selectedHomework} submission={(data.submissions || []).find(x => x.assignmentId === selectedHomework.id)} onComplete={load} onClose={() => setSelectedHomework(null)} />}
    {receipt && <div className="sp-modal-backdrop" onMouseDown={() => setReceipt(null)}><section className="sp-modal sp-receipt" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}><button className="sp-modal-close" onClick={() => setReceipt(null)}>·</button><h2>Fee receipt</h2><p>{data.profile.schoolName}</p><dl className="sp-details"><dt>Student</dt><dd>{data.profile.studentName}</dd><dt>Receipt number</dt><dd>{receipt.receipt_Number}</dd><dt>Fee type</dt><dd>{data.fees.find(x => x.id === receipt.studentFeeId)?.feeType || 'School fee'}</dd><dt>Date</dt><dd>{shortDate(receipt.payment_Date)}</dd><dt>Payment mode</dt><dd>{receipt.payment_Mode}</dd><dt>Amount paid</dt><dd>₹{receipt.amountPaid}</dd></dl><button className="btn btn-primary sp-print-button" onClick={() => window.print()}>Print receipt</button></section></div>}
    </main>
    <nav className="sp-bottom" aria-label="Quick navigation">{(['Today','My Classes','Homework','Calendar','My Profile'] as Page[]).map(item => <button className={page === item ? 'active' : ''} key={item} onClick={() => switchPage(item)}>{item === 'My Classes' ? 'Classes' : item === 'My Profile' ? 'Profile' : item}</button>)}</nav>
  </div>;
}
