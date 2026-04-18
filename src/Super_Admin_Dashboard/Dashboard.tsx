import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateSchool from './CreateSchool';
import SchoolList from './SchoolList';
import StaffList from './StaffList';
import StudentList from './StudentList';
import StudentAttendance from './StudentAttendance';
import StaffAttendance from './StaffAttendance';
import ClassList from './ClassList';
import SubjectList from './SubjectList';
import ExamList from './ExamList';
import Sidebar from './Sidebar';
import { API_BASE_URL } from '../config';
import './Dashboard.css';

interface School {
  id: number;
  schoolName: string;
  address: string;
  email: string;
  phone: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateSchoolOpen, setIsCreateSchoolOpen] = useState(false);
  const [activePage, setActivePage] = useState('Dashboard');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState<string>('');
  const [dashboardData, setDashboardData] = useState({
    teachersPresentToday: '0/0',
    studentsPresentToday: '0/0',
    totalEmployees: 0,
    employeesOnLeave: 0,
  });
  const [attendanceType, setAttendanceType] = useState<'student' | 'staff' | null>(null);
  const [showAttendancePopup, setShowAttendancePopup] = useState(false);

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
          if (roleId === '2') checkAttendance(token);
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
    fetchSchools();
  }, []);

  const checkAttendance = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/Staff/check-attendance`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.shouldMarkAttendance) setShowAttendancePopup(true);
      }
    } catch (err) {
      console.error('Failed to check attendance status');
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      fetchDashboardData();
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
            setSelectedSchoolId(result.data[0].id);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleNavigate = (page: string, type?: 'student' | 'staff') => {
    setActivePage(page);
    if (page === 'Attendance' && type) {
      setAttendanceType(type);
    } else {
      setAttendanceType(null);
    }
  };

  return (
    <div className="dashboard-wrapper">
      <Sidebar activePage={activePage} onNavigate={handleNavigate} isCollapsed={isCollapsed} userRole={userRole} />
      <div className={`dashboard-main ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="dashboard-header">
        <div className="header-left">
          <button className="menu-toggle-btn" onClick={() => setIsCollapsed(p => !p)}>☰</button>
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
          <span className="welcome-text">Welcome, <strong>{userName}</strong> 👋</span>
          <button className="btn btn-primary" onClick={() => setIsCreateSchoolOpen(true)}>
            + Create School
          </button>
          <div className="search-box">
            <input type="text" placeholder="Search" className="search-input" />
          </div>
          <button className="icon-btn">🔔</button>
          <div className="user-avatar"></div>
        </div>
      </header>

      <div className="dashboard-content">
        {activePage === 'School List' ? (
          <SchoolList />
        ) : activePage === 'Class List' ? (
          <ClassList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Staff List' ? (
          <StaffList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Student List' ? (
          <StudentList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Subject List' ? (
          <SubjectList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Exam List' ? (
          <ExamList selectedSchoolId={selectedSchoolId} />
        ) : activePage === 'Attendance' ? (
          attendanceType === 'student' ? (
            <StudentAttendance />
          ) : attendanceType === 'staff' ? (
            <StaffAttendance />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>
              <p>Please select an attendance type from the menu</p>
            </div>
          )
        ) : (
          <>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-header">
              <span>Teachers Present Today</span>
              <span className="stat-icon">👨🏫</span>
            </div>
            <div className="stat-value">{dashboardData.teachersPresentToday}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span>Students Present Today</span>
              <span className="stat-icon">👥</span>
            </div>
            <div className="stat-value">{dashboardData.studentsPresentToday}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span>Total Employees</span>
              <span className="stat-icon">👔</span>
            </div>
            <div className="stat-value">{dashboardData.totalEmployees}</div>
          </div>
          <div className="stat-card">
            <div className="stat-header">
              <span>Employees On Leave</span>
              <span className="stat-icon">🏖️</span>
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

            <div className="pie-charts">
              <div className="pie-card">
                <h3>Income June 2024</h3>
                <div className="pie-placeholder"></div>
              </div>
              <div className="pie-card">
                <h3>Expense June 2024</h3>
                <div className="pie-placeholder"></div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="notice-board">
              <h3>Notice Board</h3>
              <div className="notice-list">
                <div className="notice-item">
                  <div className="notice-title">Result for Class IX is out Now!!!</div>
                  <div className="notice-time">Today, 11:00 am</div>
                </div>
                <div className="notice-item">
                  <div className="notice-title">Result for Class VIII is out Now!!!</div>
                  <div className="notice-time">Today, 11:00 am</div>
                </div>
                <div className="notice-item">
                  <div className="notice-title">Result for Class VII is out Now!!!</div>
                  <div className="notice-time">Today, 11:00 am</div>
                </div>
                <div className="notice-item">
                  <div className="notice-title">Result for Class VI is out Now!!!</div>
                  <div className="notice-time">Today, 11:00 am</div>
                </div>
              </div>
              <button className="add-btn">+ Add New Notice</button>
            </div>

            <div className="events-board">
              <h3>Upcoming Events</h3>
              <div className="event-list">
                <div className="event-item">
                  <div className="event-title">Webinar on Career Trends for Class-X</div>
                  <div className="event-time">📅 23, Jun ⏰ 11:00 Am</div>
                </div>
                <div className="event-item">
                  <div className="event-title">Webinar on Career Trends for Class-X</div>
                  <div className="event-time">📅 23, Jun ⏰ 11:00 Am</div>
                </div>
                <div className="event-item">
                  <div className="event-title">Webinar on Career Trends for Class-X</div>
                  <div className="event-time">📅 23, Jun ⏰ 11:00 Am</div>
                </div>
              </div>
              <button className="add-btn">+ Add New Event</button>
            </div>

            <div className="faculty-leave">
              <h3>Faculty On Leave</h3>
              <div className="faculty-list">
                <div className="faculty-item">
                  <div className="faculty-avatar"></div>
                  <div className="faculty-info">
                    <div className="faculty-name">Suchita Sachdeva</div>
                    <div className="faculty-details">📚 Mathematics 🎓 Class XI</div>
                  </div>
                </div>
                <div className="faculty-item">
                  <div className="faculty-avatar"></div>
                  <div className="faculty-info">
                    <div className="faculty-name">Suchita Sachdeva</div>
                    <div className="faculty-details">📚 Mathematics 🎓 Class XI</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>

      <button onClick={handleLogout} className="logout-btn">Logout</button>
      <CreateSchool isOpen={isCreateSchoolOpen} onClose={() => setIsCreateSchoolOpen(false)} />
      </div>

      {showAttendancePopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '36px 32px', textAlign: 'center', borderRadius: '16px' }}>
            <div style={{ fontSize: '52px', marginBottom: '16px' }}>📋</div>
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
