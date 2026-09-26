import React, { useEffect, useState } from 'react';
import AcademicHolidays from './AcademicHolidays';
import { API_BASE_URL } from '../config';
import { PageLoader } from '../components/Loader/Loader';
import { useToastMessageState } from '../components/Toast/Toast';
import Modal from './Modal';
import { AddCircleIcon } from '../components/Icons/Icons';
import './ClassList.css';

interface AcademicYearProps {
  selectedSchoolId: number | null;
}

interface AcademicSession {
  id: number;
  yearStart: string;
  yearEnd: string;
  isActive: boolean;
  createdAt: string;
}

const AcademicYear: React.FC<AcademicYearProps> = ({ selectedSchoolId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useToastMessageState('error');
  const [formSuccess, setFormSuccess] = useToastMessageState('success');
  const [formLoading, setFormLoading] = useState(false);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingSessionId, setUpdatingSessionId] = useState<number | null>(null);
  const [pendingSession, setPendingSession] = useState<AcademicSession | null>(null);
  const [error, setError] = useToastMessageState('error');
  const [formData, setFormData] = useState({
    yearStart: '',
    yearEnd: '',
    isActive: true,
  });

  useEffect(() => {
    setPendingSession(null);
    setPendingSession(null);
    if (selectedSchoolId) {
      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [selectedSchoolId]);

  const fetchSessions = async () => {
    if (!selectedSchoolId) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/Admin/academic-sessions?schoolId=${selectedSchoolId}`,
        {
          headers: {
            accept: '*/*',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setSessions(result.data || []);
      } else {
        setError(result.message || 'Failed to fetch academic sessions');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Failed to fetch academic sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setFormError('');
  };

  const validateForm = (): boolean => {
    if (!formData.yearStart || !formData.yearEnd) {
      setFormError('Both start and end dates are required');
      return false;
    }

    const startDate = new Date(formData.yearStart);
    const endDate = new Date(formData.yearEnd);

    if (endDate <= startDate) {
      setFormError('End date must be greater than start date');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setFormError('');
    setFormSuccess('');
    setFormLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/create-session`, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId: selectedSchoolId,
          yearStart: new Date(formData.yearStart).toISOString(),
          yearEnd: new Date(formData.yearEnd).toISOString(),
          isActive: formData.isActive,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFormSuccess('Academic session created successfully!');
        await fetchSessions();
        handleClear();
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess('');
        }, 1500);
      } else {
        setFormError(result.message || 'Failed to create session');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
      console.error('Failed to create session:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleClear = () => {
    setFormData({ yearStart: '', yearEnd: '', isActive: true });
    setFormError('');
  };

  const updateSessionStatus = async (session: AcademicSession) => {
    const nextStatus = !session.isActive;
    const action = nextStatus ? 'activate' : 'deactivate';
    if (updatingSessionId !== null) return;

    setUpdatingSessionId(session.id);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/Admin/academic-session-status`, {
        method: 'PUT',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          schoolId: selectedSchoolId,
          sessionId: session.id,
          isActive: nextStatus,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Failed to ${action} session`);
      setPendingSession(null);
      setFormSuccess(`Academic session ${nextStatus ? 'activated' : 'deactivated'} successfully!`);
      await fetchSessions();
    } catch (err: any) {
      setError(err.message || `Unable to ${action} academic session.`);
    } finally {
      setUpdatingSessionId(null);
    }
  };

  if (!selectedSchoolId) {
    return <div className="loading">Please select a school</div>;
  }

  return (
    <div className="class-list-container">
      <div className="class-list-header">
        <h2>Academic Sessions</h2>
        <button type="button" className="academic-session-add-icon" title="Create Session" aria-label="Create Session" onClick={() => setIsModalOpen(true)}>
          <AddCircleIcon />
        </button>
      </div>
      
      <div className="class-table-container">
        {loading ? (
          <PageLoader label="Loading academic sessions..." />
        ) : error ? (
          <div className="error">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="loading">No academic sessions available. Create a session to get started.</div>
        ) : (
          <table className="class-table">
            <thead>
              <tr>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id}>
                  <td>{formatDate(session.yearStart)}</td>
                  <td>{formatDate(session.yearEnd)}</td>
                  <td>
                    <span className={`status ${session.isActive ? 'active' : 'inactive'}`}>
                      {session.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="created-date">{formatDate(session.createdAt)}</td>
                  <td>
                    <button
                      type="button"
                      className="academic-session-status-toggle"
                      role="switch"
                      aria-checked={session.isActive}
                      aria-label={`Academic session ${formatDate(session.yearStart)} to ${formatDate(session.yearEnd)} active`}
                      title={session.isActive ? 'Deactivate session' : 'Activate session'}
                      aria-busy={updatingSessionId === session.id}
                      disabled={updatingSessionId !== null}
                      onClick={() => setPendingSession(session)}
                    >
                      <span className="academic-session-toggle-thumb" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sessions.length > 0 && <AcademicHolidays schoolId={selectedSchoolId} sessions={sessions} />}

      <Modal
        isOpen={pendingSession !== null}
        onClose={() => { if (updatingSessionId === null) setPendingSession(null); }}
        title={pendingSession?.isActive ? 'Deactivate Academic Session' : 'Activate Academic Session'}
        submitLabel={pendingSession?.isActive ? 'Deactivate' : 'Activate'}
        submitLoading={updatingSessionId !== null}
        loadingText="Updating..."
        onSubmit={() => { if (pendingSession) updateSessionStatus(pendingSession); }}
        showCancel={false}
      >
        <div style={{ padding: '32px 28px', textAlign: 'center' }}>
          <p>Are you sure you want to {pendingSession?.isActive ? 'deactivate' : 'activate'} this academic session?</p>
          {pendingSession && <p><strong>{formatDate(pendingSession.yearStart)} – {formatDate(pendingSession.yearEnd)}</strong></p>}
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Academic Session"
        submitLabel="Create Session"
        submitLoading={formLoading}
        loadingText="Creating..."
        onCancel={handleClear}
        formId="create-session-form"
      >
        {formError && (
          <div className="error-message">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div style={{
            background: '#c6f6d5',
            color: '#22543d',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            marginLeft: '28px',
            marginRight: '28px',
            fontSize: '14px',
            border: '1px solid #9ae6b4'
          }}>
            {formSuccess}
          </div>
        )}
        <form id="create-session-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>Session Start Date *</label>
              <input
                type="date"
                name="yearStart"
                value={formData.yearStart}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group full-width">
              <label>Session End Date *</label>
              <input
                type="date"
                name="yearEnd"
                value={formData.yearEnd}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="form-group full-width" style={{ marginTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  style={{ cursor: 'pointer' }}
                />
                <span>Set as Active Session</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AcademicYear;
