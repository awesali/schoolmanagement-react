import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
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
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    yearStart: '',
    yearEnd: '',
    isActive: true,
  });

  useEffect(() => {
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

  if (!selectedSchoolId) {
    return <div className="loading">Please select a school</div>;
  }

  return (
    <div className="class-list-container">
      <div className="class-list-header">
        <h2>Academic Sessions</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Create Session
        </button>
      </div>
      
      <div className="class-table-container">
        {loading ? (
          <div className="loading">Loading academic sessions...</div>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Academic Session"
        submitLabel={formLoading ? "Creating..." : "Create Session"}
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
