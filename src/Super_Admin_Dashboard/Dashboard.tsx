import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateSchool from './CreateSchool';
import { CreateSchoolIcon, LogoutIcon, ProfileIcon, MenuIcon, BellIcon, TeacherIcon, StudentsIcon, EmployeesIcon, LeaveIcon, ClipboardIcon } from '../components/Icons/Icons';
import '../components/Icons/CreateIconButton.css';
import SchoolList from './SchoolList';
import StaffList from './StaffList';
import StudentList from './StudentList';
import ParentList from './ParentList';
import StudentAttendance from './StudentAttendance';
import StaffAttendance from './StaffAttendance';
import ClassList from './ClassList';
import SubjectList from './SubjectList';
import ExamList from './ExamList';
import ExamManagement from './ExamManagement';
import TeacherExamView from './TeacherExamView';
import TeacherClassManagement from './TeacherClassManagement';
import TeacherUnitTest from './TeacherUnitTest';
import AcademicYear from './AcademicYear';
import FinanceManagement from './FinanceManagement';
import SalaryManagement from './SalaryManagement';
import TransportManagement from './TransportManagement';
import InventoryManagement from './InventoryManagement';
import PermissionManagement from './PermissionManagement';
import StudentPromotion from './StudentPromotion';
import Sidebar from './Sidebar';
import { API_BASE_URL } from '../config';
import { profilePictureUrl } from './ProfilePictureInput';
import ImportResults from './ImportResults';
import { BulkImportJob, getBulkImportJobs, subscribeBulkImportJobs } from './bulkImportJobs';
import './Dashboard.css';
import { PAGE_PERMISSIONS, usePermissions } from '../security/Permissions';
import { SECURITY_UI_ENABLED } from '../security/features';

interface School {
  id: number;
  schoolName: string;
  address: string;
  email: string;
  phone: string;
  logoUrl?: string | null;
}

interface DashboardExam {
  id: number;
  name: string;
  resultPublished: boolean;
  createdDate: string;
}

interface DashboardExamEvent {
  id: string;
  examName: string;
  subjectName: string;
  className: string;
  sectionName: string;
  examDate: string;
  startTime?: string;
}

const NOTICE_LIFETIME_MS = 2 * 24 * 60 * 60 * 1000;

const getLocalDateStart = (value: string) => {
  const dateOnly = value.substring(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day).getTime();
};

const Dashboard: React.FC = () => {
  const { can, loading: permissionsLoading, roleName } = usePermissions();
  const navigate = useNavigate();
  const [isCreateSchoolOpen, setIsCreateSchoolOpen] = useState(false);
  const [activePage, setActivePage] = useState(() => { const page = new URLSearchParams(window.location.search).get('page'); return page && ['Staff List', 'Student List', 'Parent List'].includes(page) ? page : 'Dashboard'; });
  const [parentToOpen, setParentToOpen] = useState<number | null>(() => { const id = Number(new URLSearchParams(window.location.search).get('parentId')); return id > 0 && Number.isInteger(id) ? id : null; });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [userName, setUserName] = useState('User');
  const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [importJobs, setImportJobs] = useState<BulkImportJob[]>(getBulkImportJobs);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedImportJob, setSelectedImportJob] = useState<BulkImportJob | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [dashboardData, setDashboardData] = useState({
    teachersPresentToday: '0/0',
    studentsPresentToday: '0/0',
    totalEmployees: 0,
    employeesOnLeave: 0,
  });
  const [attendanceType, setAttendanceType] = useState<'student' | 'staff' | null>(null);
  const [showAttendancePopup, setShowAttendancePopup] = useState(false);
  const [publishedResults, setPublishedResults] = useState<DashboardExam[]>([]);
  const [upcomingExamEvents, setUpcomingExamEvents] = useState<DashboardExamEvent[]>([]);
  const [dashboardClock, setDashboardClock] = useState(() => Date.now());
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const name = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'];
        const roleId = payload['RoleId'];
        if (name) setUserName(name);
        if (roleId) {
          setUserRole(roleId);
          console.log('User Role from token:', roleId);
          // Only check attendance for staff (roleId === '2')
          if (roleId === '2') {
            checkAttendance(token);
          } else {
            // Ensure popup is never shown for non-staff users
            setShowAttendancePopup(false);
          }
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    fetchSchools();
    fetchCurrentUserProfile();
  }, []);

  useEffect(() => subscribeBulkImportJobs(setImportJobs), []);

  const fetchCurrentUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) return;
      const profile = await response.json();
      if (profile?.name) setUserName(profile.name);
      setUserProfilePicture(profile?.profilePictureUrl || null);
    } catch {
      setUserProfilePicture(null);
    }
  };

  const userInitials = userName.trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeMenu = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, [profileMenuOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => setDashboardClock(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);


  const checkAttendance = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Staff/check-attendance`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.shouldMarkAttendance) {
          setShowAttendancePopup(true);
        }
      }
    } catch (err) {
      console.error('Failed to check attendance status');
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      fetchDashboardData();
      fetchDashboardExamUpdates();
    }
  }, [selectedSchoolId]);

  const fetchSchools = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/School-by-superadmin`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSchools(result.data);
          if (result.data.length > 0) {
            const requestedSchool = Number(new URLSearchParams(window.location.search).get('schoolId'));
            setSelectedSchoolId(result.data.find((school: School) => school.id === requestedSchool)?.id || result.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch schools');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!selectedSchoolId) {
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/api/Admin/DashboardCard?schoolId=${selectedSchoolId}`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          setDashboardData(result.data);
        } else if (result.teachersPresentToday !== undefined) {
          setDashboardData(result);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  };

  const fetchDashboardExamUpdates = async () => {
    if (!selectedSchoolId) return;

    try {
      const token = localStorage.getItem('token');
      const requestHeaders = { accept: 'application/json', Authorization: `Bearer ${token}` };
      const examsResponse = await fetch(`${API_BASE_URL}/api/Exam/GetExams?schoolId=${selectedSchoolId}`, {
        cache: 'no-store', headers: requestHeaders,
      });
      if (!examsResponse.ok) return;

      const examsResult = await examsResponse.json();
      const exams: DashboardExam[] = examsResult?.data ?? [];
      setPublishedResults(exams.filter(exam => exam.resultPublished));

      const schedules = await Promise.all(exams.map(async exam => {
        const response = await fetch(`${API_BASE_URL}/api/Exam/GetExamSubjects?examId=${exam.id}`, {
          cache: 'no-store', headers: requestHeaders,
        });
        if (!response.ok) return [];
        const result = await response.json();
        return (result?.data ?? []).map((item: any) => ({
          id: `${exam.id}-${item.id}-${item.examDate}`,
          examName: exam.name,
          subjectName: item.subjectName,
          className: item.className,
          sectionName: item.sectionName,
          examDate: item.examDate,
          startTime: item.startTime,
        }));
      }));

      setUpcomingExamEvents(schedules.flat()
        .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
      );
    } catch (error) {
      console.error('Failed to fetch dashboard exam updates:', error);
    }
  };

  const todayStart = new Date(dashboardClock).setHours(0, 0, 0, 0);
  const visibleNotices = publishedResults
    .filter(exam => {
      const postedAt = new Date(exam.createdDate).getTime();
      return Number.isFinite(postedAt) && dashboardClock < postedAt + NOTICE_LIFETIME_MS;
    })
    .slice(0, 5);
  const visibleEvents = upcomingExamEvents
    .filter(event => event.examDate && getLocalDateStart(event.examDate) >= todayStart)
    .slice(0, 5);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleNavigate = (page: string, type?: 'student' | 'staff') => {
    if (!SECURITY_UI_ENABLED && page === 'Role & Permissions') return;
    const permissionPage = page === 'Attendance' ? (type === 'student' ? 'attendance.students' : 'attendance.staff') : PAGE_PERMISSIONS[page];
    if (permissionPage && !can(permissionPage, 'read')) return;
    setActivePage(page);
    setParentToOpen(null);
    if (window.innerWidth <= 768) setIsCollapsed(true);
    if (page === 'Attendance' && type) {
      setAttendanceType(type);
    } else {
      setAttendanceType(null);
    }
  };

  return (
    <div className="dashboard-wrapper">
      {!isCollapsed && window.innerWidth <= 768 && (
        <div className="sidebar-overlay" onClick={() => setIsCollapsed(true)} />
      )}
      <Sidebar activePage={activePage} onNavigate={handleNavigate} isCollapsed={isCollapsed} userRole={userRole}
        schoolName={schools.find(school => school.id === selectedSchoolId)?.schoolName}
        schoolLogoUrl={schools.find(school => school.id === selectedSchoolId)?.logoUrl} />
      <div className={`dashboard-main ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <button className="menu-toggle-btn" onClick={() => setIsCollapsed(p => !p)}><MenuIcon size={24} /></button>
          <h1>{activePage}</h1>
          {schools.length > 0 && (
            <select 
              className="school-picker" 
              value={selectedSchoolId || ''} 
              onChange={(e) => setSelectedSchoolId(Number(e.target.value))}
            >
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.schoolName}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="header-right">
          <span className="welcome-text">Welcome, <strong>{userName}</strong></span>
          {userRole === '1' && (
            <button type="button" className="create-icon-button" title="Create School" aria-label="Create School" onClick={() => setIsCreateSchoolOpen(true)}>
              <CreateSchoolIcon size={26} />
            </button>
          )}
          <div className="search-box">
            <input type="text" placeholder="Search" className="search-input" />
          </div>
                    <div className="import-notifications">
            <button type="button" className="icon-btn import-notification-button" aria-label="Import notifications" onClick={() => setNotificationsOpen(open => !open)}>
              <BellIcon size={22} />
              {importJobs.some(job => job.status === 'running') && <span className="import-notification-loader" aria-label="Import in progress" />}
              {importJobs.some(job => job.status === 'completed') && <span className="import-notification-count">{importJobs.filter(job => job.status === 'completed').length}</span>}
            </button>
            {notificationsOpen && <div className="import-notification-panel">
              <strong>Import Notifications</strong>
              {importJobs.length === 0 && <p>No import notifications.</p>}
              {importJobs.map(job => <button type="button" key={job.id} disabled={job.status === 'running'} onClick={() => { setSelectedImportJob(job); setNotificationsOpen(false); }}>
                <span>{job.type} import</span>
                <small>{job.status === 'running' ? `Importing ${job.processed}/${job.total}...` : `${job.imported} passed, ${job.errors.length} failed`}</small>
              </button>)}
            </div>}
          </div>
          <div className="profile-menu" ref={profileMenuRef}>
            <button type="button" className="user-avatar" title={userName} aria-label={`${userName} profile menu`}
              aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen(open => !open)}>
              {userProfilePicture
                ? <img src={profilePictureUrl(userProfilePicture)} alt={`${userName} profile`} onError={() => setUserProfilePicture(null)} />
                : <span>{userInitials}</span>}
            </button>
            {profileMenuOpen && <div className="profile-dropdown" role="menu">
              <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); navigate('/profile'); }}><ProfileIcon size={20} />Profile</button>
              <button type="button" role="menuitem" onClick={handleLogout}><LogoutIcon size={20} />Logout</button>
            </div>}
          </div>
        </div>
      </header>
      <ImportResults type={selectedImportJob?.type || 'Student'} result={selectedImportJob ? { imported: selectedImportJob.imported, errors: selectedImportJob.errors } : null} onClose={() => setSelectedImportJob(null)} />

      <div className="dashboard-content">
        {permissionsLoading ? <div className="permission-empty">Loading access...</div> : (() => {
        const activePermission = activePage === 'Attendance' ? (attendanceType === 'student' ? 'attendance.students' : 'attendance.staff') : PAGE_PERMISSIONS[activePage];
        if (!SECURITY_UI_ENABLED && activePage === 'Role & Permissions') return null;
        const isRoleOnlyDashboard = activePage === 'Dashboard' && userRole !== '1' && userRole !== '2';
        if (!isRoleOnlyDashboard && activePermission && !can(activePermission, 'read')) return <div className="permission-empty"><h2>Access denied</h2><p>You do not have permission to view this page.</p></div>;
        return <>
        {activePage === 'School List' ? (
          <SchoolList onSchoolsChanged={fetchSchools} />
        ) : activePage === 'Academic Year' ? (
          <AcademicYear selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Class List' ? (
          <ClassList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'My Classes' ? (
          <TeacherClassManagement onNavigate={handleNavigate} />
        ) : activePage === 'Staff List' ? (
          <StaffList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Student List' || activePage === 'Student Enrollment' ? (
          <StudentList selectedSchoolId={selectedSchoolId} onViewParent={id => {
            handleNavigate('Parent List');
            setParentToOpen(id);
          }} />
        ) : activePage === 'Student Promotion' ? (
          <StudentPromotion selectedSchoolId={selectedSchoolId} initialView="promotion" />
        ) : activePage === 'Promotion History' ? (
          <StudentPromotion selectedSchoolId={selectedSchoolId} initialView="history" />
        ) : activePage === 'Parent List' ? (
          <ParentList selectedSchoolId={selectedSchoolId} initialParentId={parentToOpen} />
        ) : activePage === 'Subject List' ? (
          <SubjectList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Exam List' || activePage === 'Exam Management' ? (
          userRole === '2' ? (
            <TeacherExamView selectedSchoolId={selectedSchoolId} />
          ) : (
            <ExamManagement selectedSchoolId={selectedSchoolId} />
          )
        ) : activePage === 'Marks Entry' ? (
          <TeacherExamView selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Unit Test' ? (
          <TeacherUnitTest />
        ) : activePage === 'Fees' || activePage === 'Fee Management' ? (
          <FinanceManagement selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Salary Management' ? (
          <SalaryManagement selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Transport Management' ? (
          <TransportManagement selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Inventory Management' ? (
          <InventoryManagement selectedSchoolId={selectedSchoolId} mode="inventory" />
        ) : activePage === 'Study Materials' ? (
          <InventoryManagement selectedSchoolId={selectedSchoolId} mode="studyMaterials" />
        ) : activePage === 'Role & Permissions' ? (
          <PermissionManagement selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Attendance' ? (
          attendanceType === 'student' ? (
            <StudentAttendance />
          ) : attendanceType === 'staff' ? (
            <StaffAttendance userRole={userRole} selectedSchoolId={selectedSchoolId} />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
              <p>Please select an attendance type from the menu</p>
            </div>
          )
        ) : userRole !== '1' && userRole !== '2' ? (
          <div style={{ minHeight: '65vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '42px 60px', textAlign: 'center', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)' }}>
              <h2 style={{ margin: 0, color: '#1e2a3a' }}>Your role is {roleName || `Role ${userRole}`}</h2>
            </div>
          </div>
        ) : (
          <>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span>Teachers Present Today</span>
              <span className="stat-icon"><TeacherIcon size={28} /></span>
            </div>
            <div className="stat-value">{dashboardData.teachersPresentToday}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span>Students Present Today</span>
              <span className="stat-icon"><StudentsIcon size={28} /></span>
            </div>
            <div className="stat-value">{dashboardData.studentsPresentToday}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span>Total Employees</span>
              <span className="stat-icon"><EmployeesIcon size={28} /></span>
            </div>
            <div className="stat-value">{dashboardData.totalEmployees}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span>Employees On Leave</span>
              <span className="stat-icon"><LeaveIcon size={28} /></span>
            </div>
            <div className="stat-value">{dashboardData.employeesOnLeave}</div>
          </div>
        </div>
        <div className="main-grid">
          <div className="chart-section">
            <div className="section-header">
              <h2>Fee Collection and Expenses</h2>
              <div className="filters">
                <select className="filter-select">
                  <option>Session: 2024-25</option>
                </select>
                <select className="filter-select">
                  <option>All Months</option>
                </select>
              </div>
            </div>
            <div className="chart-placeholder">
              <div className="chart-legend">
                <span><span className="legend-dot green"></span>Fee Collection</span>
                <span><span className="legend-dot red"></span>Expenses</span>
              </div>
              <div className="bar-chart">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                  <div key={month} className="bar-group">
                    <div className="bars">
                      <div className="bar green" style={{height: `${Math.random() * 100 + 50}px`}}></div>
                      <div className="bar red" style={{height: `${Math.random() * 80 + 40}px`}}></div>
                    </div>
                    <span className="bar-label">{month}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="sidebar-section">
            <div className="notice-board">
              <h3>Notice Board</h3>
              <div className="notice-list">
                {visibleNotices.length === 0 ? (
                  <div className="notice-item"><div className="notice-title">No published results.</div></div>
                ) : visibleNotices.map(exam => (
                  <div className="notice-item" key={exam.id}>
                    <div className="notice-title">Result for {exam.name} is published.</div>
                    <div className="notice-time">Result available now</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="events-board">
              <h3>Upcoming Events</h3>
              <div className="event-list">
                {visibleEvents.length === 0 ? (
                  <div className="event-item"><div className="event-title">No upcoming scheduled exams.</div></div>
                ) : visibleEvents.map(event => (
                  <div className="event-item" key={event.id}>
                    <div className="event-title">{event.examName}: {event.subjectName}</div>
                    <div className="event-time">
                      {event.className} - {event.sectionName} &middot; {new Date(event.examDate).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}{event.startTime ? ' ' + String.fromCharCode(183) + ' ' + event.startTime.substring(0, 5) : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>


          </div>
        </div>
        </>
        )}
        </>})()}
      </div>

      <CreateSchool isOpen={isCreateSchoolOpen} onClose={() => setIsCreateSchoolOpen(false)} />
      </div>

      {showAttendancePopup && userRole === '2' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '36px 32px', textAlign: 'center', borderRadius: '16px' }}>
            <div style={{ marginBottom: '16px' }}><ClipboardIcon size={52} /></div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Mark Your Attendance</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '28px' }}>
              You haven't marked your attendance for today,{' '}
              <strong>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>.
              <br />Please head over to the Attendance section to mark yourself present or absent.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: '12px' }}
              onClick={() => { setShowAttendancePopup(false); handleNavigate('Attendance', 'staff'); }}
            >
              Mark Attendance Now
            </button>
            <button
              className="btn"
              style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              onClick={() => setShowAttendancePopup(false)}
            >
              Remind Me Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
