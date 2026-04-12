import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './StaffList.css';

type AttendanceStatus = 'Present' | 'Absent' | null;
type View = 'select' | 'mark' | 'history';

const StaffAttendance: React.FC = () => {
  const [view, setView] = useState<View>('select');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attendance, setAttendance] = useState<AttendanceStatus>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [history, setHistory] = useState<{ attendanceDate: string; status: string }[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (view === 'history') {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFromDate(firstOfMonth.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    }
  }, [view]);

  const handleSubmit = async () => {
    if (attendance === null) {
      alert('Please mark your attendance (Present or Absent).');
      return;
    }
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        attendanceDate: new Date().toISOString(),
        status: attendance,
      };
      const response = await fetch(`${API_BASE_URL}/api/Staff/staff/mark-attendance`, {
        method: 'POST',
        headers: { 'accept': '*/*', 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result?.success) {
        setSubmitted(true);
        showToast(result.message || `Attendance marked successfully for ${new Date().toLocaleDateString()}!`, 'success');
      } else {
        const msg = result?.message || 'Failed to mark attendance';
        if (msg.toLowerCase().includes('already')) {
          setAlreadyMarked(true);
        }
        showToast(msg, 'error');
      }
    } catch (err) {
      console.error('Failed to submit attendance');
      showToast('An error occurred while marking attendance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchHistory = async () => {
    if (!fromDate || !toDate) return;
    try {
      setHistoryLoading(true);
      setHistory(null);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Staff/staff/attendance-history?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: { 'accept': '*/*', 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        setHistory(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      console.error('Failed to fetch attendance history');
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
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
      <div className="staff-list-header"><h2>Staff Attendance</h2></div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
          What would you like to do today?
        </p>

        <div style={{ display: 'flex', gap: '24px' }}>
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
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>View by date range</div>
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '24px', fontWeight: 600 }}>
            Mark your attendance for today
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setAttendance('Present')}
              style={{
                padding: '16px 32px', borderRadius: '12px', border: '3px solid', cursor: 'pointer',
                fontWeight: 700, fontSize: '16px', transition: 'all 0.2s',
                borderColor: attendance === 'Present' ? '#22543d' : '#e2e8f0',
                background: attendance === 'Present' ? '#c6f6d5' : 'white',
                color: attendance === 'Present' ? '#22543d' : '#718096',
                boxShadow: attendance === 'Present' ? '0 4px 12px rgba(34, 84, 61, 0.2)' : 'none',
              }}
            >
              ✓ Present
            </button>
            <button
              onClick={() => setAttendance('Absent')}
              style={{
                padding: '16px 32px', borderRadius: '12px', border: '3px solid', cursor: 'pointer',
                fontWeight: 700, fontSize: '16px', transition: 'all 0.2s',
                borderColor: attendance === 'Absent' ? '#742a2a' : '#e2e8f0',
                background: attendance === 'Absent' ? '#fed7d7' : 'white',
                color: attendance === 'Absent' ? '#742a2a' : '#718096',
                boxShadow: attendance === 'Absent' ? '0 4px 12px rgba(116, 42, 42, 0.2)' : 'none',
              }}
            >
              ✗ Absent
            </button>
          </div>
        </div>
      </div>
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
          <input type="date" value={fromDate} max={toDate || new Date().toISOString().split('T')[0]} onChange={(e) => setFromDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px' }} />
          <span style={{ color: '#718096', fontWeight: 600 }}>to</span>
          <input type="date" value={toDate} min={fromDate} max={new Date().toISOString().split('T')[0]} onChange={(e) => setToDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px' }} />
          <button className="btn btn-primary" onClick={fetchHistory} disabled={!fromDate || !toDate || historyLoading}>
            {historyLoading ? 'Loading...' : 'View'}
          </button>
        </div>
      </div>

      {history !== null && (
        <div className="staff-table-wrapper" style={{ marginTop: '12px' }}>
          {history.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: '#718096' }}>No attendance records found for this date range.</p>
          ) : (
            <table className="staff-table">
              <thead>
                <tr><th>#</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.map((record, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{record.attendanceDate.split('T')[0].split('-').reverse().join('/')}</td>
                    <td><span className={`status-badge ${record.status === 'Present' ? 'active' : 'inactive'}`}>{record.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffAttendance;
