import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CreateSchool from './CreateSchool';
import { API_BASE_URL } from './config';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isCreateSchoolOpen, setIsCreateSchoolOpen] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    teachersPresentToday: '0/0',
    studentsPresentToday: '0/0',
    totalEmployees: 0,
    employeesOnLeave: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/DashboardCard?schoolId=1`, {
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="header-right">
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
      </div>

      <button onClick={handleLogout} className="logout-btn">Logout</button>
      <CreateSchool isOpen={isCreateSchoolOpen} onClose={() => setIsCreateSchoolOpen(false)} />
    </div>
  );
};

export default Dashboard;
