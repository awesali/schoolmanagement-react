import React, { useState } from 'react';
import { API_BASE_URL } from '../config';
import Modal from './Modal';
import './ClassList.css';

interface AcademicYearProps {
  selectedSchoolId: number | null;
}

const AcademicYear: React.FC<AcademicYearProps> = ({ selectedSchoolId }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    yearStart: '',
    yearEnd: '',
    isActive: true,
  });

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
        <div style={{ padding: '40px', textAlign: 'center', color: '#718096' }}>
          <p>Click the "Create Session" button to add a new academic session for your school.</p>
        </div>
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
