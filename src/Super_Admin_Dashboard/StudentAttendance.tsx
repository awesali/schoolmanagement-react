import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import Pagination from './Pagination';
import './StaffList.css';

interface Student {
  id: number;
  studentName: string;
  className: string;
  sectionName: string;
  sectionId: number;
  academicSession: string;
}

type AttendanceStatus = 'Present' | 'Absent' | null;
type View = 'select' | 'mark' | 'history';

const StudentAttendance: React.FC = () => {
  const [view, setView] = useState<View>('select');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [historyDate, setHistoryDate] = useState('');
  const [history, setHistory] = useState<{ studentId: number; studentName: string; sectionName: string; attendanceDate: string; status: string }[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyCurrentPage, setHistoryCurrentPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalRecords, setHistoryTotalRecords] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (view === 'mark') {
      setCurrentPage(1);
      fetchStudents(1, pageSize);
    }
    if (view === 'history') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const formattedDate = yesterday.toISOString().split('T')[0];
      setHistoryDate(formattedDate);
      setHistoryCurrentPage(1);
      fetchHistoryForDate(formattedDate, 1, historyPageSize);
    }
  }, [view]);

  const fetchStudents = async (page: number = 1, size: number = pageSize) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Student/GetStudentsBySection?page=${page}&pageSize=${size}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStudents(result.data);
          setCurrentPage(result.currentPage);
          setTotalPages(result.totalPages);
          setTotalRecords(result.totalRecords);
          const initial: Record<number, AttendanceStatus> = {};
          result.data.forEach((s: Student) => { initial[s.id] = null; });
          setAttendance(initial);
        }
      }
    } catch (err) {
      console.error('Failed to fetch students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMark = (studentId: number, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    const unmarked = students.filter(s => attendance[s.id] === null);
    if (unmarked.length > 0) {
      alert(`Please mark attendance for all students. ${unmarked.length} student(s) unmarked.`);
      return;
    }
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        sectionId: students[0]?.sectionId,
        attendanceDate: new Date().toISOString(),
        students: students.map(s => ({ studentId: s.id, status: attendance[s.id] })),
      };
      const response = await fetch(`${API_BASE_URL}/api/Student/StudentsAttendance`, {
        method: 'POST',
        headers: { 'accept': '*/*', 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setSubmitted(true);
        showToast(`Attendance marked successfully for ${new Date().toLocaleDateString()}!`, 'success');
      } else {
        const result = await response.json();
        if (result?.message?.toLowerCase().includes('already')) {
          setAlreadyMarked(true);
          showToast('Attendance has already been marked for today.', 'error');
        }
      }
    } catch (err) {
      console.error('Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistoryForDate = async (date: string, page: number = 1, size: number = historyPageSize) => {
    try {
      setHistoryLoading(true);
      setHistory(null);
      const token = localStorage.getItem('token');
      const formatted = date.split('-').reverse().join('-');
      const response = await fetch(`${API_BASE_URL}/api/Student/Student-attendance-history?date=${formatted}&page=${page}&pageSize=${size}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setHistory(result.data);
          setHistoryCurrentPage(result.currentPage);
          setHistoryTotalPages(result.totalPages);
          setHistoryTotalRecords(result.totalRecords);
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance history');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!historyDate) return;
    setHistoryCurrentPage(1);
    fetchHistoryForDate(historyDate, 1, historyPageSize);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchStudents(page, pageSize);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    fetchStudents(1, size);
  };

  const handleHistoryPageChange = (page: number) => {
    setHistoryCurrentPage(page);
    fetchHistoryForDate(historyDate, page, historyPageSize);
  };

  const handleHistoryPageSizeChange = (size: number) => {
    setHistoryPageSize(size);
    setHistoryCurrentPage(1);
    fetchHistoryForDate(historyDate, 1, size);
  };

  const toast_el = toast && (
    <div style={{
      position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
      padding: '14px 24px', borderRadius: '10px', fontWeight: 600, fontSize: '14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      background: toast.type === 'success' ? '#22543d' : '#742a2a',
      color: 'white', animation: 'slideUp 0.3s ease',
    }}>
      {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
    </div>
  );

  // --- Selection Screen ---
  if (view === 'select') return (
    <div className="staff-list-container">
      {toast_el}
      <div className="staff-list-header"><h2>Student Attendance</h2></div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
          What would you like to do today?
        </p>

        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Mark Attendance Card */}
          <div
            onClick={() => setView('mark')}
            style={{ cursor: 'pointer', width: '260px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(74,144,226,0.15)', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(74,144,226,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(74,144,226,0.15)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #357abd 100%)', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '8px' }}>📋</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>Mark Attendance</div>
            </div>
            <div style={{ padding: '16px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Today</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* History Card */}
          <div
            onClick={() => setView('history')}
            style={{ cursor: 'pointer', width: '260px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(80,200,120,0.15)', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(80,200,120,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(80,200,120,0.15)'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, var(--secondary-color) 0%, #3aaa6a 100%)', padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '52px', marginBottom: '8px' }}>📅</div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '18px' }}>Previous Attendance</div>
            </div>
            <div style={{ padding: '16px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>View by date</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Check History</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Mark Attendance ---
  if (view === 'mark') return (
    <div className="staff-list-container">
      {toast_el}
      <div className="staff-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setView('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>←</button>
          <h2>Mark Attendance</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: '#4a5568', fontWeight: 600 }}>
            📅 {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || submitted}>
            {submitted ? '✓ Submitted' : submitting ? 'Submitting...' : 'Submit Attendance'}
          </button>
        </div>
      </div>

      {alreadyMarked && (
        <div style={{ background: '#fef3c7', color: '#78350f', padding: '12px 20px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
          ⚠️ Attendance has already been marked for today ({new Date().toLocaleDateString()}).
        </div>
      )}

      {loading ? <div className="staff-list-loading">Loading...</div> : (
        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Class</th>
                <th>Section</th>
                <th>Session</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.studentName}</td>
                  <td><span className="role-badge teacher">{student.className}</span></td>
                  <td><span className="role-badge principal">{student.sectionName}</span></td>
                  <td>{student.academicSession.split('-')[0]}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleMark(student.id, 'Present')} style={{ padding: '6px 16px', borderRadius: '8px', border: '2px solid', cursor: 'pointer', fontWeight: 600, fontSize: '13px', borderColor: attendance[student.id] === 'Present' ? '#22543d' : '#e2e8f0', background: attendance[student.id] === 'Present' ? '#c6f6d5' : 'white', color: attendance[student.id] === 'Present' ? '#22543d' : '#718096' }}>Present</button>
                      <button onClick={() => handleMark(student.id, 'Absent')} style={{ padding: '6px 16px', borderRadius: '8px', border: '2px solid', cursor: 'pointer', fontWeight: 600, fontSize: '13px', borderColor: attendance[student.id] === 'Absent' ? '#742a2a' : '#e2e8f0', background: attendance[student.id] === 'Absent' ? '#fed7d7' : 'white', color: attendance[student.id] === 'Absent' ? '#742a2a' : '#718096' }}>Absent</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={[5, 10, 20, 50]}
      />
    </div>
  );

  // --- History ---
  return (
    <div className="staff-list-container">
      {toast_el}
      <div className="staff-list-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setView('select')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}>←</button>
          <h2>Attendance History</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="date" value={historyDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setHistoryDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px' }} />
          <button className="btn btn-primary" onClick={fetchHistory} disabled={!historyDate || historyLoading}>
            {historyLoading ? 'Loading...' : 'View'}
          </button>
        </div>
      </div>

      {history !== null && (
        <div className="staff-table-wrapper" style={{ marginTop: '12px' }}>
          {history.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No attendance records found for this date.</p>
          ) : (
            <table className="staff-table">
              <thead>
                <tr><th>#</th><th>Student Name</th><th>Section</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.map((record, index) => (
                  <tr key={record.studentId}>
                    <td>{index + 1}</td>
                    <td>{record.studentName}</td>
                    <td><span className="role-badge principal">{record.sectionName}</span></td>
                    <td>{record.attendanceDate.split('T')[0].split('-').reverse().join('/')}</td>
                    <td><span className={`status-badge ${record.status === 'Present' ? 'active' : 'inactive'}`}>{record.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      
      {history !== null && history.length > 0 && (
        <Pagination
          currentPage={historyCurrentPage}
          totalPages={historyTotalPages}
          totalRecords={historyTotalRecords}
          pageSize={historyPageSize}
          onPageChange={handleHistoryPageChange}
          onPageSizeChange={handleHistoryPageSizeChange}
          pageSizeOptions={[5, 10, 20, 50]}
        />
      )}
    </div>
  );
};

export default StudentAttendance;
